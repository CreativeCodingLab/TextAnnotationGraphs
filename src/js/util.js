/**
 * Utility functions
 */

import _ from "lodash";

/**
 * Get all the CSS rules that match the given elements
 * Adapted from:
 * https://stackoverflow.com/questions/2952667/find-all-css-rules-that-apply-to-an-element
 * @param {Array} elements - Array of elements to get rules for
 * @return {Array}
 */
function getCssRules(elements) {
  var sheets = document.styleSheets, ret = [];
  let importRules = [];

  for (var i in sheets) {
    var rules = sheets[i].rules || sheets[i].cssRules;
    for (var r in rules) {
      // Include @import rules by default, since we can't be sure if they
      // apply, and since they are generally used for fonts
      if (rules[r].type == CSSRule.IMPORT_RULE) {
        importRules.push(rules[r].cssText);
        continue;
      }

      // For other types of rules, check against the listed elements
      for (const el of elements) {
        el.matches = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector
          || el.msMatchesSelector || el.oMatchesSelector;
        if (el.matches(rules[r].selectorText)) {
          ret.push(rules[r].cssText);
          break;
        }
      }
    }
  }

  // Import rules have to be at the top of the styles list
  ret = importRules.concat(ret);

  return _.uniq(ret);
}

// Debug
window.getCssRules = getCssRules;

module.exports = {
  getCssRules
};