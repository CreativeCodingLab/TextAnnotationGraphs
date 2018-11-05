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
// const TAG = require("../../src/js/tag.js");
import TAG from "../../src/js/tag";

const $ = require("jquery");

// Main function
$(function () {
  const $container = $("#demoContainer");
  const graph = TAG.tag({
    // The `container` parameter can take either the ID of the main element or
    // the main element itself (as either a jQuery or native object)
    container: $container,

    // The initial data to load
    data: require("../data/data6.json"),
    format: "json"
  });

  // A new set of data can be loaded into the visualisation using the
  // `.loadData()` function
  const sampleData = require("../data/data7.json");
  graph.loadData(sampleData, "json");
});