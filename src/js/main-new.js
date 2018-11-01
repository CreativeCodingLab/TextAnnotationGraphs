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

    // Node-link objects
    this.words = [];
    this.links = [];

    // Options
    this.options = {
      showSyntax: false,
      showLinksOnMove: false,
      showTreeInModal: false
    };

    // Initialisation
    this.setupSVGListeners();
  }

  /**
   * Sets up listeners for SVG-related events
   * N.B.: Event listeners will change the execution context by default, so
   * either provide a closure to the main library instance or use arrow
   * functions to preserve the original context
   */
  setupSVGListeners() {
    // svg event listeners
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

    // svg.on('tag-remove', function(e) {
    //   e.detail.object.remove();
    //   tm.remove(e.detail.object);
    // });

    // this.svg.on("row-recalculate-slots", function (e) {
    //   links.forEach(link => {
    //     link.resetSlotRecalculation();
    //   });
    //   links.forEach(link => {
    //     link.recalculateSlots(words);
    //     link.draw();
    //   });
    // });
    //
    // svg.on("build-tree", function (e) {
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
   * Loads the given annotation data onto the TAG canvas
   * @param {Object} data - The data to load
   * @param {String} format - One of the supported format identifiers for
   *     the data
   */
  loadData(data, format) {
    this.parser.loadData(data, format);
    this.redraw();

    // const $ = require("jquery");
    // $("#demoContainer").html(`
    // Will load:<br>
    // ${format}<br>
    // <pre>${JSON.stringify(data, null, 2)}</pre>
    // `);
    // console.log(this.parser.parsedData);
  }

  /**
   * Draws elements (rows, words, links, etc.) onto the visualisation
   */
  draw() {
    // Add tokens and links
    const data = this.parser.parsedData;
    if (data.words.length > 0 && !this.rowManager.lastRow) {
      this.rowManager.appendRow();
    }
    data.words.forEach(word => {
      word.init(this.svg);
      this.rowManager.addWordToRow(word, this.rowManager.lastRow);
    });

    data.links.forEach(link => {
      link.init(this.svg);
    });
    data.links.forEach(link => {
      link.recalculateSlots(data.words);
      link.draw();
    });
    this.rowManager.resizeAll();

    // Change token colours based on the current taxonomy, if loaded
    this.taxonomyManager.draw([], data.words);
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

  setSyntaxVisibility(newState) {
    console.log("setSyntaxVisibility", newState);
  }
}

module.exports = Main;