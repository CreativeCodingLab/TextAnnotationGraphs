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

// The `.tag()` function can take either the ID of the main element or the
// main element itself (as either a jQuery or native object)
const $container = $("#demoContainer");
const graph = TAG.tag($container);

// The data to load into the visualisation can be loaded using the
// `.loadData()` function
const sampleData = require("../data/data7.json");
graph.loadData(sampleData, "json");