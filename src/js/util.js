/**
 * Utility functions
 * @module Util
 */

import _ from "lodash";

// For some reason, the `draggable` import has to be in a different file
// from `main.js`.  This has something to do with the way ES6 imports work,
// and the fact that `svg.draggable.js` expects the `SVG` variable to be
// globally available.
import * as SVG from "svg.js";
import * as draggable from "svg.draggable.js";

/**
 * Get all the CSS rules that match the given elements
 * Adapted from:
 * https://stackoverflow.com/questions/2952667/find-all-css-rules-that-apply-to-an-element
 *
 * @param {Array} elements - Array of elements to get rules for
 * @return {Array}
 * @memberof module:Util
 */
function getCssRules(elements) {
  const sheets = document.styleSheets;
  const ret = [];
  let importRules = [];

  for (const sheet of sheets) {
    try {
      const rules = sheet.rules || sheets.cssRules;
      for (const rule of rules) {
        // Include @import rules by default, since we can't be sure if they
        // apply, and since they are generally used for fonts
        if (rule.type === CSSRule.IMPORT_RULE) {
          importRules.push(rule.cssText);
          continue;
        }

        // For other types of rules, check against the listed elements
        for (const el of elements) {
          el.matches = el.matches || el.webkitMatchesSelector ||
            el.mozMatchesSelector || el.msMatchesSelector ||
            el.oMatchesSelector;
          if (el.matches(rule.selectorText)) {
            ret.push(rule.cssText);
            break;
          }
        }
      }
    } catch (err) {
      // Sometimes we get CORS errors with Chrome and external stylesheets,
      // but we should be all right to keep going
      console.log("Warning:", err);
    }
  }

  // Import rules have to be at the top of the styles list
  return _.uniq(importRules.concat(ret));
}

/**
 * Sort some given array of Links in preparation for determining their slots
 * (vertical intervals for overlapping/crossing Links).  Needed because the
 * order that the Parser puts Links in might not be the order we actually want:
 *
 * 1) Primary sort by index of left endpoint, ascending
 * 2) Secondary sort by number of Words covered, descending
 *
 * @param links
 * @memberof module:Util
 */
function sortForSlotting(links) {
  const sortingArray = links.map((link, idx) => {
    const endpoints = link.endpoints;
    return {
      idx,
      leftAnchor: endpoints[0].idx,
      width: endpoints[1].idx - endpoints[0].idx + 1
    };
  });
  // Sort by number of words covered, descending
  sortingArray.sort((a, b) => b.width - a.width);
  // Sort by index of left endpoint, ascending
  sortingArray.sort((a, b) => a.leftAnchor - b.leftAnchor);
  return sortingArray.map(link => links[link.idx]);
}

export default {
  getCssRules,
  sortForSlotting
};