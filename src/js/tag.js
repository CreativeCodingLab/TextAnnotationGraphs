/**
 * Instantiation and static functions
 */

import Main from "./main";
import _ from "lodash";

import OdinParser from "../../Parsers/odin";
import BratParser from "../../Parsers/brat";

// Parsers for the various annotation formats will be registered with the
// main library, and will be inherited by individual TAG instances.
const parsers = {
  odin: new OdinParser(),
  brat: new BratParser()
};

/**
 * Initialises a TAG visualisation on the given element.
 * @param {Object} params - Initialisation parameters.
 * @param {String|Element|jQuery} params.container - Either a string
 *     containing the ID of the container element, or the element itself (as a
 *     native/jQuery object).
 * @param {Object} [params.data] - Initial data to load, if any.
 * @param {String} [params.format] - One of the supported format identifiers for
 *     the data.
 * @param {Object} [params.options] - Overrides for various default
 *     library options.
 */
function tag(params) {
  // Core params
  if (!params.container) {
    throw "No TAG container element specified.";
  }

  if (!params.options) {
    params.options = {};
  }

  const instance = new Main(params.container, params.options, parsers);

  // Initial data load
  if (params.data && params.format) {
    instance.loadData([params.data], params.format);
  }
  return instance;
}

/**
 * Registers the parser for a new annotation format.
 * @param {Object} parser - Parser object.
 * @param {String} format - Identifier for the annotation format
 *     associated with this parser.
 */
function registerParser(parser, format) {
  if (_.has(parsers, format)) {
    throw "There is already a Parser registered for the given format.";
  }

  parsers[format] = parser;
}

// ES6 and CommonJS compatibility
export default {
  tag,
  registerParser
};
module.exports = {
  tag,
  registerParser
};
