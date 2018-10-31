/**
 * Main library class
 */

import _ from "lodash";

import * as SVG from "svg.js";

import Parser from "./parse/parse.js";

class Main {
  constructor() {
    // Main SVG element
    this.svg = false;

    // Components
    this.parser = new Parser();
  }

  /**
   * Initialises an SVG canvas on the given element
   * @param {String|Element|jQuery} container - Either a string containing the
   *     ID of the container element, or the element itself (as a
   *     native/jQuery object)
   */
  initSVG(container) {
    // SVG.Doc expects either a string with the element's ID, or the element
    // itself (not a jQuery object)
    if (_.hasIn(container, "jquery")) {
      container = container[0];
    }

    this.svg = new SVG.Doc(container);
  }

  /**
   * Loads the given annotation data onto the TAG canvas
   * @param {Object} data - The data to load
   * @param {String} format - One of the supported format identifiers for
   *     the data
   */
  loadData(data, format) {
    this.parser.loadData(data, format);
    const $ = require("jquery");
    $("#demoContainer").html(`
    Will load:<br>
    ${format}<br>
    <pre>${JSON.stringify(data, null, 2)}</pre>
    `);
    console.log(this.parser.parsedData);
  }
}

module.exports = Main;