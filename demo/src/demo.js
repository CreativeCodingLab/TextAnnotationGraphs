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
const _ = require("lodash");

// Bootstrap includes for the full UI demo
require("popper.js");
require("bootstrap");

// Prism for syntax highlighting
require("prismjs");

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
    data: require("../data/data7.json"),
    format: "json"
  });

  // -------------------
  // Advanced/UI example
  // -------------------
  const $uiContainer = $("#uiContainer");
  const uiTag = TAG.tag({
    container: $uiContainer
  });

  // Data can be loaded after initialisation using the `.loadData()` function
  const sampleData = require("../data/data8.json");
  uiTag.loadData(sampleData, "json");

  // Data from an external URL can also be loaded into the visualisation
  // using the `.loadUrlAsync()` function.  The data will be read and displayed
  // asynchronously.
  $("#tag-change-dataset").on("click", ".tag-dataset", (event) => {
    event.preventDefault();
    const $link = $(event.target);
    return uiTag.loadUrlAsync($link.data("path"), $link.data("format"));
  });

  // Custom annotation files can also be uploaded by the user and loaded
  // using the `.loadFilesAsync()` function.  The file(s) will be read and
  // displayed asynchronously.
  $("#tag-upload-input").on("change", (event) => {
    // Show the names of the selected files
    const names =
      _.map(event.target.files, file => file.name)
        .join(", ");
    $("#tag-upload-label").text(names);
  });
  // Upload them when the user confirms the selection
  $("#tag-upload-confirm").on("click", async () => {
    const files = $("#tag-upload-input")[0].files;
    const format = $("#tag-upload-format").val();

    if (files.length > 0) {
      // Upload the file(s), reset the form elements, hide the modal
      // (In that order: We need to load the files before resetting the
      // form, or the reference to the FileList gets lost)
      await uiTag.loadFilesAsync(files, format);

      const $modal = $("#tag-upload");

      $modal.wrap("<form>").closest("form").get(0).reset();
      $modal.unwrap();
      $("#tag-upload-label").text("Choose file(s)");

      $modal.modal("hide");
    }
  });

  // The `.setOption()` function can be used to change various advanced
  // options.  The visualisation will need to be redrawn to show any changes.
  const $optionSyntax = $("#tag-option-syntax");
  $optionSyntax
    .prop("checked", uiTag.getOption("showSyntax"))
    .on("change", () => {
      uiTag.setOption("showSyntax", $optionSyntax[0].checked);
      uiTag.redraw();
    });


  // The `.exportFile()` function can be used to save the current
  // visualisation as an SVG file
  $("#tag-download").on("click", () => {
    uiTag.exportFile();
  });


  // Debug
  window._ = require("lodash");
  window.$ = require("jquery");
  window.basicTag = basicTag;
  window.uiTag = uiTag;
});