/**
 * This sample script demonstrates how to import the main TAG library and show
 * a simple visualisation embedded in a web page.
 *
 * To run a live version of the demo, execute `npm run demo` from the main
 * folder.
 *
 * If you have made any changes to this file, execute `npm run demo-build`
 * from the main folder to see your changes reflected.
 */

// For your own projects, use `require("text-annotation-graphs")` instead
const TAG = require("../../src/js/tag.js");

const $ = require("jquery");

// Main function
$(function () {
  // -------------
  // Basic example
  // -------------
  const $basicContainer = $("#basicContainer");
  const basicTag = TAG.tag({
    // The `container` parameter can take either the ID of the main element or
    // the main element itself (as either a jQuery or native object)
    container: $basicContainer,

    // The initial data to load.
    // Different formats might expect different types for `data`:
    // E.g., the "json" format expects the annotations as an
    // (already-parsed) Object, while the "brat" format expects them as a raw
    // String.
    // See the full documentation for details.
    data: require("../data/data8.json"),
    format: "json"
  });

  // -------------------
  // Advanced/UI example
  // -------------------
  // A new set of data can be loaded into the visualisation using the
  // `.loadData()` function

  // const sampleData = require("../data/data8.json");
  // basicTag.loadData(sampleData, "json");

  // Debug
  window._ = require("lodash");
  window.basicTag = basicTag;
});