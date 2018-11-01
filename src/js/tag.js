/**
 * Initialisation and static functions
 */

import Main from "./main-new";

/**
 * Initialises a TAG visualisation on the given element
 * @param {String|Element|jQuery} container - Either a string containing the
 *     ID of the container element, or the element itself (as a
 *     native/jQuery object)
 */
function tag(container) {
  return new Main(container);
}

module.exports = {
  tag
};