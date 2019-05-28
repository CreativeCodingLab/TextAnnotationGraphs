/**
 * Main library class
 */

import _ from "lodash";
import $ from "jquery";
import * as SVG from "svg.js";

import RowManager from "./managers/rowmanager";
import LabelManager from "./managers/labelmanager";
import Taxonomy from "./managers/taxonomy";

import Config from "./config";

import Util from "./util";

import Word from "./components/word";
import WordCluster from "./components/word-cluster";
import Link from "./components/link";

/**
 * Take a small performance hit from `autobind` to ensure that the scope of
 * `this` is always correct for all our API methods
 */
import autobind from "autobind-decorator";

@autobind
class Main {
  /**
   * Initialises a TAG instance with the given parameters
   * @param {String|Element|jQuery} container - Either a string containing the
   *     ID of the container element, or the element itself (as a
   *     native/jQuery object)
   * @param {Object} options - Overrides for default library options
   * @param {Object} parsers - Registered parsers for various annotation formats
   */
  constructor(container, options = {}, parsers = {}) {
    // Config options
    this.config = _.defaults(options, new Config());

    // SVG.Doc expects either a string with the element's ID, or the element
    // itself (not a jQuery object).
    if (_.hasIn(container, "jquery")) {
      container = container[0];
    }

    this.svg = new SVG.Doc(container);

    // That said, we need to set the SVG Doc's size using absolute units
    // (since they are used for calculating the widths of rows and other
    // elements).  We use jQuery to get the parent's size.
    this.$container = $(this.svg.node).parent();

    // Managers/Components
    this.rowManager = new RowManager(this.svg, this.config);
    this.labelManager = new LabelManager(this.svg);
    this.taxonomyManager = new Taxonomy(this.config);

    // Registered Parsers
    this.parsers = parsers;

    // Tokens and links that are currently drawn on the visualisation
    this.words = [];
    this.links = [];

    // Initialisation
    this.resize();
    this._setupSVGListeners();
    this._setupUIListeners();
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Loading data into the parser

  /**
   * Loads the given annotation data onto the TAG visualisation
   * @param {Array} dataObjects - The raw annotation data object(s) to load
   * @param {String} format - One of the supported format identifiers for
   *     the data
   */
  loadData(dataObjects, format) {
    // 1) Remove any currently-loaded data
    // 2) Parse the new data
    // 3) Hand-off the parsed data to the SVG initialisation procedure

    if (!_.has(this.parsers, format)) {
      throw `No parser registered for annotation format: ${format}`;
    }

    this.clear();
    const parsedData = this.parsers[format].parse(dataObjects);
    this.init(parsedData);
    this.draw();
  }

  /**
   * Reads the given data file asynchronously and loads it onto the TAG
   * visualisation
   * @param {Object} path - The path pointing to the data
   * @param {String} format - One of the supported format identifiers for
   *     the data
   */
  async loadUrlAsync(path, format) {
    const data = await $.ajax(path);
    this.loadData([data], format);
  }

  /**
   * Reads the given annotation files and loads them onto the TAG
   * visualisation
   * @param {FileList} fileList - We generally expect only one file here, but
   *     some formats (e.g., Brat) involve multiple files per dataset
   * @param {String} format
   */
  async loadFilesAsync(fileList, format) {
    // Instantiate FileReaders for all the given files, and wait until they
    // are read
    const readPromises = _.map(fileList, (file) => {
      const reader = new FileReader();
      reader.readAsText(file);
      return new Promise((resolve) => {
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type,
            content: reader.result
          });
        };
      });
    });

    const files = await Promise.all(readPromises);
    this.loadData(files, format);
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Controlling the SVG element

  /**
   * Prepares all the Rows/Words/Links.
   * Adds all Words/WordClusters to Rows in the visualisation, but does not draw
   * Links or colour the various Words/WordTags
   * @param {Object} parsedData
   */
  init(parsedData) {
    // Convert the parsed data into visualisation objects (by adding
    // SVG/visualisation-related data and methods)
    // TODO: Refactor the Word/WordTag/WordCluster/Link system instead of
    //  patching it here.

    // Tokens -> Words
    // Labels -> WordTags
    // Records LongLabels to convert later.
    this.words = [];
    const longLabels = [];
    parsedData.tokens.forEach((token) => {
      // Basic
      const word = new Word(token.text, token.idx);
      this.words.push(word);

      _.forOwn(token.registeredLabels, (label, category) => {
        if (_.has(label, "token")) {
          // Label
          word.registerTag(category, label.val);
        } else if (_.has(label, "tokens")) {
          // LongLabel
          if (longLabels.indexOf(label) < 0) {
            longLabels.push(label);
          }
        }
      });
    });

    // LongLabels -> WordClusters
    // (via back-references)
    // N.B.: Assumes that the `.idx` property of each Word is equal to its
    // index in `this.words`.
    longLabels.forEach((longLabel) => {
      const labelWords = [];
      for (let x = 0; x < longLabel.tokens.length; x++) {
        const wordIdx = longLabel.tokens[x].idx;
        labelWords.push(this.words[wordIdx]);
      }
      new WordCluster(labelWords, longLabel.val);
    });

    // Links
    // Arguments might be Tokens or (Parser) Links; convert them to Words
    // and Links.
    // N.B.: Assumes that nested Links are parsed earlier in the array.
    this.links = [];
    const linksById = {};
    parsedData.links.forEach((link) => {
      let newTrigger = null;
      const newArgs = [];

      if (link.trigger) {
        // Assume the trigger is a Token
        newTrigger = this.words[link.trigger.idx];
      }

      // noinspection JSAnnotator
      link.arguments.forEach((arg) => {
        if (arg.anchor.type === "Token") {
          newArgs.push({
            anchor: this.words[arg.anchor.idx],
            type: arg.type
          });
        } else if (arg.anchor.type === "Link") {
          newArgs.push({
            anchor: linksById[arg.anchor.eventId],
            type: arg.type
          });
        }
      });

      const newLink = new Link(
        link.eventId,
        newTrigger,
        newArgs,
        link.relType,
        link.category === "default",
        link.category
      );

      this.links.push(newLink);
      linksById[newLink.eventId] = newLink;
    });

    // Calculate the Link slots (vertical intervals to separate
    // crossing/intervening Links).
    // Because the order of the Links array affects the slot calculations,
    // we sort it here first in case they aren't sorted in the original
    // annotation data.
    this.links = Util.sortForSlotting(this.links);
    this.links.forEach((link) => link.calculateSlot(this.words));

    // Initialise the first Row; new ones will be added automatically as
    // Words are drawn onto the visualisation
    if (this.words.length > 0 && !this.rowManager.lastRow) {
      this.rowManager.appendRow();
    }

    // Draw the Words onto the visualisation
    this.words.forEach((word) => {
      // If the tag categories to show for the Word are already set (via the
      // default config or user options), set them here so that the Word can
      // draw them directly on init
      word.setTopTagCategory(this.config.topTagCategory);
      word.setBottomTagCategory(this.config.bottomTagCategory);
      word.init(this);
      this.rowManager.addWordToRow(word, this.rowManager.lastRow);
    });

    // We have to initialise all the Links before we draw any of them, to
    // account for nested Links etc.
    this.links.forEach((link) => {
      link.init(this);
    });
  }

  /**
   * Resizes Rows and (re-)draws Links and WordClusters, without changing
   * the positions of Words/Link handles
   */
  draw() {
    // Draw in the currently toggled Links
    this.links.forEach((link) => {
      if (
        (link.top && link.category === this.config.topLinkCategory) ||
        (!link.top && link.category === this.config.bottomLinkCategory)
      ) {
        link.show();
      }

      if (
        (link.top && this.config.showTopMainLabel) ||
        (!link.top && this.config.showBottomMainLabel)
      ) {
        link.showMainLabel();
      } else {
        link.hideMainLabel();
      }

      if (
        (link.top && this.config.showTopArgLabels) ||
        (!link.top && this.config.showBottomArgLabels)
      ) {
        link.showArgLabels();
      } else {
        link.hideArgLabels();
      }
    });

    // Now that Links are visible, make sure that all Rows have enough space
    this.rowManager.resizeAll();

    // And change the Row resize cursor if compact mode is on
    this.rowManager.rows.forEach((row) => {
      this.config.compactRows
        ? row.draggable.addClass("row-drag-compact")
        : row.draggable.removeClass("row-drag-compact");
    });

    // Change token colours based on the current taxonomy, if loaded
    this.taxonomyManager.colour(this.words);
  }

  /**
   * Removes all elements from the visualisation
   */
  clear() {
    // Removing Rows takes care of Words and WordTags
    while (this.rowManager.rows.length > 0) {
      this.rowManager.removeLastRow();
    }
    // Links and Clusters are drawn directly on the main SVG document
    this.links.forEach((link) => link.svg && link.svg.remove());
    this.words.forEach((word) => {
      word.clusters.forEach((cluster) => cluster.remove());
    });
    // Reset colours
    this.taxonomyManager.resetDefaultColours();
  }

  /**
   * Fits the SVG element and its children to the size of its container
   */
  resize() {
    this.svg.size(this.$container.innerWidth(), this.$container.innerHeight());
    this.rowManager.resizeAll();
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Controlling taxonomic information and associated colours

  /**
   * Loads a new taxonomy specification (in YAML form) into the module
   * @param {String} taxonomy - A YAML string representing the taxonomy object
   */
  loadTaxonomyYaml(taxonomy) {
    return this.taxonomyManager.loadTaxonomyYaml(taxonomy);
  }

  /**
   * Returns a YAML representation of the currently loaded taxonomy
   */
  getTaxonomyYaml() {
    return this.taxonomyManager.getTaxonomyYaml();
  }

  /**
   * Returns the currently loaded taxonomy as an Array.
   * Simple labels are stored as Strings in Arrays, and category labels are
   * stored as single-key objects.
   *
   * E.g., a YAML document like the following:
   *
   *  - Label A
   *  - Category 1:
   *    - Label B
   *    - Label C
   *  - Label D
   *
   * Parses to the following taxonomy object:
   *
   *  [
   *    "Label A",
   *    {
   *      "Category 1": [
   *        "Label B",
   *        "Label C"
   *      ]
   *    },
   *    "Label D"
   *  ]
   *
   * @return {Array}
   */
  getTaxonomyTree() {
    return this.taxonomyManager.getTaxonomyTree();
  }

  /**
   * Given some label (either for a WordTag or WordCluster), return the
   * colour that the taxonomy manager has assigned to it
   * @param label
   */
  getColour(label) {
    return this.taxonomyManager.getColour(label);
  }

  /**
   * Sets the colour for some label (either for a WordTag or WordCluster)
   * and redraws the visualisation
   * @param label
   * @param colour
   */
  setColour(label, colour) {
    this.taxonomyManager.assignColour(label, colour);
    this.taxonomyManager.colour(this.words);
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Higher-level API functions

  /**
   * Exports the current visualisation as an SVG file
   */
  exportSvg() {
    // Get the raw SVG definition
    let exportedSVG = this.svg.svg();

    // We also need to inline a copy of the relevant SVG styles, which might
    // have been modified/overwritten by the user
    const svgRules = Util.getCssRules(
      this.$container.find(".tag-element").toArray()
    );

    const i = exportedSVG.indexOf("</defs>");
    exportedSVG =
      exportedSVG.slice(0, i) +
      "<style>" +
      svgRules.join("\n") +
      "</style>" +
      exportedSVG.slice(i);

    // Create a virtual download link and simulate a click on it (using the
    // native `.click()` method, since jQuery cannot `.trigger()` it
    $(`<a 
      href="data:image/svg+xml;charset=utf-8,${encodeURIComponent(exportedSVG)}"
      download="tag.svg"></a>`)
      .appendTo($("body"))[0]
      .click();
  }

  /**
   * Changes the value of the given option setting
   * (Redraw to see changes)
   * @param {String} option
   * @param value
   */
  setOption(option, value) {
    this.config[option] = value;
  }

  /**
   * Gets the current value for the given option setting
   * @param {String} option
   */
  getOption(option) {
    return this.config[option];
  }

  /**
   * Returns an Array of all the categories available for the top Links
   * (Generally, event/relation annotations)
   */
  getTopLinkCategories() {
    const categories = this.links
      .filter((link) => link.top)
      .map((link) => link.category);

    return _.uniq(categories);
  }

  /**
   * Shows the specified category of top Links, hiding the others
   * @param category
   */
  setTopLinkCategory(category) {
    this.setOption("topLinkCategory", category);
    this.links
      .filter((link) => link.top)
      .forEach((link) => {
        if (link.category === category) {
          link.show();
        } else {
          link.hide();
        }
      });

    // Always resize when the set of visible Links may have changed
    this.rowManager.resizeAll();
  }

  /**
   * Returns an Array of all the categories available for the bottom Links
   * (Generally, syntactic/dependency parses)
   */
  getBottomLinkCategories() {
    const categories = this.links
      .filter((link) => !link.top)
      .map((link) => link.category);

    return _.uniq(categories);
  }

  /**
   * Shows the specified category of bottom Links, hiding the others
   * @param category
   */
  setBottomLinkCategory(category) {
    this.setOption("bottomLinkCategory", category);
    this.links
      .filter((link) => !link.top)
      .forEach((link) => {
        if (link.category === category) {
          link.show();
        } else {
          link.hide();
        }
      });

    // Always resize when the set of visible Links may have changed
    this.rowManager.resizeAll();
  }

  /**
   * Returns an Array of all the categories available for top Word tags
   * (Generally, text-bound mentions)
   */
  getTagCategories() {
    const categories = this.words.flatMap((word) => word.getTagCategories());
    return _.uniq(categories);
  }

  /**
   * Shows the specified category of top Word tags
   * @param category
   */
  setTopTagCategory(category) {
    this.setOption("topTagCategory", category);
    this.words.forEach((word) => {
      word.setTopTagCategory(category);
      word.passingLinks.forEach((link) => link.draw());
    });

    // (Re-)colour the labels
    this.taxonomyManager.colour(this.words);

    // Always resize when the set of visible Links may have changed
    this.rowManager.resizeAll();
  }

  /**
   * Shows the specified category of bottom Word tags
   * @param category
   */
  setBottomTagCategory(category) {
    this.setOption("bottomTagCategory", category);
    this.words.forEach((word) => {
      word.setBottomTagCategory(category);
      word.passingLinks.forEach((link) => link.draw());
    });

    // Always resize when the set of visible Links may have changed
    this.rowManager.resizeAll();
  }

  /**
   * Shows/hides the main label on top Links
   * @param {Boolean} visible - Show if true, hide if false
   */
  setTopMainLabelVisibility(visible) {
    this.setOption("showTopMainLabel", visible);
    if (visible) {
      this.links
        .filter((link) => link.top)
        .forEach((link) => link.showMainLabel());
    } else {
      this.links
        .filter((link) => link.top)
        .forEach((link) => link.hideMainLabel());
    }
  }

  /**
   * Shows/hides the argument labels on top Links
   * @param {Boolean} visible - Show if true, hide if false
   */
  setTopArgLabelVisibility(visible) {
    this.setOption("showTopArgLabels", visible);
    if (visible) {
      this.links
        .filter((link) => link.top)
        .forEach((link) => link.showArgLabels());
    } else {
      this.links
        .filter((link) => link.top)
        .forEach((link) => link.hideArgLabels());
    }
  }

  /**
   * Shows/hides the main label on bottom Links
   * @param {Boolean} visible - Show if true, hide if false
   */
  setBottomMainLabelVisibility(visible) {
    this.setOption("showBottomMainLabel", visible);
    if (visible) {
      this.links
        .filter((link) => !link.top)
        .forEach((link) => link.showMainLabel());
    } else {
      this.links
        .filter((link) => !link.top)
        .forEach((link) => link.hideMainLabel());
    }
  }

  /**
   * Shows/hides the argument labels on bottom Links
   * @param {Boolean} visible - Show if true, hide if false
   */
  setBottomArgLabelVisibility(visible) {
    this.setOption("showBottomArgLabels", visible);
    if (visible) {
      this.links
        .filter((link) => !link.top)
        .forEach((link) => link.showArgLabels());
    } else {
      this.links
        .filter((link) => !link.top)
        .forEach((link) => link.hideArgLabels());
    }
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Private helper/setup functions

  /**
   * Sets up listeners for custom SVG.js events
   * N.B.: Event listeners will change the execution context by default, so
   * either provide a closure to the main library instance or use arrow
   * functions to preserve the original context
   * cf. http://es6-features.org/#Lexicalthis
   * @private
   */
  _setupSVGListeners() {
    this.svg.on("row-resize", (event) => {
      this.labelManager.stopEditing();
      this.rowManager.resizeRow(event.detail.object.idx, event.detail.y);
    });

    // svg.on('label-updated', function(e) {
    //   // TODO: so so incomplete
    //   let color = tm.getColor(e.detail.label, e.detail.object);
    //   e.detail.object.node.style.fill = color;
    // });

    this.svg.on("word-move-start", () => {
      this.links.forEach((link) => {
        if (
          (link.top && !this.config.showTopLinksOnMove) ||
          (!link.top && !this.config.showBottomLinksOnMove)
        ) {
          link.hide();
        }
      });
    });

    this.svg.on("word-move", (event) => {
      // tooltip.clear();
      this.labelManager.stopEditing();
      this.rowManager.moveWordOnRow(event.detail.object, event.detail.x);
    });

    this.svg.on("word-move-end", () => {
      this.links.forEach((link) => {
        if (
          (link.top && link.category === this.config.topLinkCategory) ||
          (!link.top && link.category === this.config.bottomLinkCategory)
        ) {
          link.show();
        }
      });
    });

    // this.svg.on("tag-remove", (event) => {
    //   event.detail.object.remove();
    //   this.taxonomyManager.remove(event.detail.object);
    // });

    // this.svg.on("row-recalculate-slots", () => {
    //   this.links.forEach(link => {
    //     link.slot = null;
    //   });
    //   this.links = Util.sortForSlotting(this.links);
    //   this.links.forEach(link => link.calculateSlot(this.words));
    //   this.links.forEach(link => link.draw());
    // });

    // ZW: Hardcoded dependencies on full UI
    // this.svg.on("build-tree", (event) => {
    //   document.body.classList.remove("tree-closed");
    //   if (tree.isInModal) {
    //     setActiveTab("tree");
    //   }
    //   else {
    //     setActiveTab(null);
    //   }
    //   if (e.detail) {
    //     tree.graph(e.detail.object);
    //   }
    //   else {
    //     tree.resize();
    //   }
    // });
  }

  /**
   * Sets up listeners for general browser events
   * @private
   */
  _setupUIListeners() {
    // Browser window resize
    $(window).on(
      "resize",
      _.throttle(() => {
        this.resize();
      }, 50)
    );
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Debug functions
  xLine(x) {
    this.svg.line(x, 0, x, 1000).stroke({ width: 1 });
  }

  yLine(y) {
    this.svg.line(0, y, 1000, y).stroke({ width: 1 });
  }
}

export default Main;
