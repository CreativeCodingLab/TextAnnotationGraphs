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

class Main {
  /**
   * Initialises a TAG instance with the given parameters
   * @param {String|Element|jQuery} container - Either a string containing the
   *     ID of the container element, or the element itself (as a
   *     native/jQuery object)
   */
  constructor(container) {
    // SVG.Doc expects either a string with the element's ID, or the element
    // itself (not a jQuery object).
    if (_.hasIn(container, "jquery")) {
      container = container[0];
    }

    this.svg = new SVG.Doc(container);

    // That said, we need to set the SVG Doc's size using absolute units
    // (since they are used for calculating the widths of rows and other
    // elements).  We use jQuery to get the parent's size.
    const $container = $(this.svg.node).parent();
    this.svg.size($container.innerWidth(), $container.innerHeight());

    // Managers/Components
    this.parser = new Parser();
    this.rowManager = new RowManager(this.svg);
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
    this._setupSVGListeners();
  }

  /**
   * Loads the given annotation data onto the TAG canvas
   * @param {Object} data - The data to load
   * @param {String} format - One of the supported format identifiers for
   *     the data
   */
  loadData(data, format) {
    this.parser.loadData(data, format);
    this.redraw();
  }

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
      word.init(this.svg);
      this.rowManager.addWordToRow(word, this.rowManager.lastRow);
    });

    this.links.forEach(link => {
      link.init(this.svg);
    });
    this.links.forEach(link => {
      link.recalculateSlots(this.words);
      link.draw();
    });
    this.rowManager.resizeAll();

    // Change token colours based on the current taxonomy, if loaded
    // (The first argument to the `.draw()` function is a taxonomy file)
    this.taxonomyManager.draw([], this.words);

    // Hide the syntax links if necessary
    this.setSyntaxVisibility(this.options.showSyntax);
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
   * Changes the visibility of the links from the syntax parse in the
   * current visualisation
   * (To be exact, changes the visibility of any links that are drawn below,
   * rather than above, the row)
   * @param newState
   */
  setSyntaxVisibility(newState) {
    this.links.forEach(link => {
      if (!newState && !link.top) {
        link.hide();
      } else {
        link.show();
      }
    });
    if (this.rowManager.rows.length > 0) {
      this.rowManager.resizeAll();
    }
  }


  /**
   * Sets up listeners for custom SVG.js events
   * N.B.: Event listeners will change the execution context by default, so
   * either provide a closure to the main library instance or use arrow
   * functions to preserve the original context
   * cf. http://es6-features.org/#Lexicalthis
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
        this.setSyntaxVisibility(false);
      }
    });

    this.svg.on("word-move", (event) => {
      // tooltip.clear();
      this.labelManager.stopEditing();
      this.rowManager.moveWordOnRow(event.detail.object, event.detail.x);
    });

    this.svg.on("word-move-end", () => {
      if (!this.options.showLinksOnMove && this.options.showSyntax) {
        this.setSyntaxVisibility(true);
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
}

module.exports = Main;