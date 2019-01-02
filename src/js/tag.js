/**
 * Instantiation and static functions
 */

import Main from "./main";

/**
 * Initialises a TAG visualisation on the given element
 * @param {String|Element|jQuery} params.container - Either a string
 *     containing the ID of the container element, or the element itself (as a
 *     native/jQuery object)
 * @param {Object} [params.data] - Initial data to load, if any
 * @param {String} [params.format] - One of the supported format identifiers for
 *     the data
 * @param {Object} [params.options] - Overrides for various default
 *     library options
 */
function tag(params) {
  // Core params
  if (!params.container) {
    throw "No TAG container element specified.";
  }

  if (!params.options) {
    params.options = {};
  }

  const instance = new Main(params.container, params.options);

  // Initial data load
  if (params.data && params.format) {
    instance.loadData(params.data, params.format);
  }
  return instance;
}

module.exports = {
  tag
};