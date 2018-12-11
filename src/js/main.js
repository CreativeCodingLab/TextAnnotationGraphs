/**
 * Main library class
 */

import _ from "lodash";
import $ from "jquery";
import * as SVG from "svg.js";

import Parser from "./parse/parse.js";
import RowManager from "./managers/rowmanager.js";
import LabelManager from "./managers/labelmanager.js";
import Taxonomy from "./managers/taxonomy.js";

import Config from "./config.js";

import * as Util from "./util.js";

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
   */
  constructor(container) {
    this.config = new Config();

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
    this.parser = new Parser();
    this.rowManager = new RowManager(this.svg, this.config);
    this.labelManager = new LabelManager(this.svg);
    this.taxonomyManager = new Taxonomy();

    // Tokens and links that are currently drawn on the visualisation
    this.words = [];
    this.links = [];

    // Options
    this.options = {
      showSyntax: false,
      showLinksOnMove: false,
      showTreeInModal: false
    };

    // Initialisation
    this.resize();
    this._setupSVGListeners();
    this._setupUIListeners();
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Loading data into the parser

  /**
   * Loads the given annotation data onto the TAG visualisation
   * @param {Object} data - The data to load
   * @param {String} format - One of the supported format identifiers for
   *     the data
   */
  loadData(data, format) {
    this.parser.loadData(data, format);
    this.redraw();
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
    this.parser.loadData(data, format);
    this.redraw();
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
      return new Promise((resolve, reject) => {
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
    this.parser.loadFiles(files, format);
    this.redraw();
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Controlling the SVG element

  /**
   * Draws elements (rows, words, links, etc.) onto the visualisation
   */
  draw() {
    // Save a reference to the currently loaded tokens and links
    const data = this.parser.getParsedData();
    this.words = data.words;
    this.links = data.links;

    if (this.words.length > 0 && !this.rowManager.lastRow) {
      this.rowManager.appendRow();
    }

    this.words.forEach(word => {
      word.init(this.svg, this.config);
      this.rowManager.addWordToRow(word, this.rowManager.lastRow);
    });

    this.links.forEach(link => {
      link.init(this);
    });
    this.links.forEach(link => {
      link.recalculateSlots(this.words);
      link.draw();
    });

    // Change token colours based on the current taxonomy, if loaded
    this.taxonomyManager.colour(this.words);

    // Hide the syntax links if necessary
    this.options.showSyntax ? this.showSyntax() : this.hideSyntax();

    this.rowManager.resizeAll();
  }

  /**
   * Removes all elements from the visualisation
   */
  clear() {
    while (this.rowManager.rows.length > 0) {
      this.rowManager.removeRow();
    }
    this.links.forEach(link => link.svg && link.svg.remove());
  }

  /**
   * Redraws the visualisation using the data currently stored by the Parser
   * (if any)
   */
  redraw() {
    this.clear();
    this.draw();
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
  exportFile() {
    // Get the raw SVG definition
    let exportedSVG = this.svg.svg();

    // We also need to inline a copy of the relevant SVG styles, which might
    // have been modified/overwritten by the user
    const svgRules = Util.getCssRules(
      this.$container.find(".tag-element").toArray()
    );

    const i = exportedSVG.indexOf("</defs>");
    exportedSVG = exportedSVG.slice(0, i)
      + "<style>" + svgRules.join("\n") + "</style>"
      + exportedSVG.slice(i);

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
    this.options[option] = value;
  }

  /**
   * Gets the current value for the given option setting
   * @param {String} option
   */
  getOption(option) {
    return this.options[option];
  }

  /**
   * Shows links from the syntactic parse in the visualisation
   * (To be exact, changes the visibility of any links that are drawn below,
   * rather than above, the row)
   * Note: Does not change the persistent "Show syntax tree" setting
   */
  showSyntax() {
    this.links.forEach(link => {
      if (!link.top) {
        link.show();
      }
    });
    this.rowManager.resizeAll();
  }

  /**
   * Hides links from the syntactic parse in the visualisation
   * (To be exact, changes the visibility of any links that are drawn below,
   * rather than above, the row)
   * Note: Does not change the persistent "Show syntax tree" setting
   */
  hideSyntax() {
    this.links.forEach(link => {
      if (!link.top) {
        link.hide();
      }
    });
    this.rowManager.resizeAll();
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
      if (!this.options.showLinksOnMove && this.options.showSyntax) {
        this.hideSyntax();
      }
    });

    this.svg.on("word-move", (event) => {
      // tooltip.clear();
      this.labelManager.stopEditing();
      this.rowManager.moveWordOnRow(event.detail.object, event.detail.x);
    });

    this.svg.on("word-move-end", () => {
      if (!this.options.showLinksOnMove && this.options.showSyntax) {
        this.showSyntax();
      }
    });

    // this.svg.on("tag-remove", (event) => {
    //   event.detail.object.remove();
    //   this.taxonomyManager.remove(event.detail.object);
    // });

    this.svg.on("row-recalculate-slots", () => {
      this.links.forEach(link => {
        link.resetSlotRecalculation();
      });
      this.links.forEach(link => {
        link.recalculateSlots(this.words);
        link.draw();
      });
    });

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
    $(window).on("resize", _.throttle(() => {
      this.resize();
    }, 50));
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Debug functions
  xLine(x) {
    this.svg.line(x, 0, x, 1000).stroke({width: 1});
  }

  yLine(y) {
    this.svg.line(0, y, 1000, y).stroke({width: 1});
  }
}

module.exports = Main;