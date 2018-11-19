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
require("bootstrap/js/dist/dropdown");
require("bootstrap/js/dist/modal");

// Prism for syntax highlighting
require("prismjs");

// CodeFlask for editing the taxonomy on the fly
const CodeFlask = require("codeflask");

// Main function
$(async () => {
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

  // --------------------------------------------------------------------------

  // Data from an external URL can also be loaded into the visualisation
  // using the `.loadUrlAsync()` function.  The data will be read and displayed
  // asynchronously.
  $("#tag-change-dataset").on("click", ".tag-dataset", (event) => {
    event.preventDefault();
    const $link = $(event.target);
    return uiTag.loadUrlAsync($link.data("path"), $link.data("format"));
  });

  // --------------------------------------------------------------------------

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

  // --------------------------------------------------------------------------

  // The `.setOption()` function can be used to change various advanced
  // options.  The visualisation will need to be redrawn to show any
  // changes, if applicable.
  const $optionSyntax = $("#tag-option-syntax");
  $optionSyntax
    .prop("checked", uiTag.getOption("showSyntax"))
    .on("change", () => {
      uiTag.setOption("showSyntax", $optionSyntax[0].checked);
      uiTag.redraw();
    });

  const $optionLinksOnMove = $("#tag-option-links-on-move");
  $optionLinksOnMove
    .prop("checked", uiTag.getOption("showLinksOnMove"))
    .on("change", () => {
      uiTag.setOption("showLinksOnMove", $optionLinksOnMove[0].checked);
    });

  // --------------------------------------------------------------------------

  // The `.exportFile()` function can be used to save the current
  // visualisation as an SVG file
  $("#tag-download").on("click", () => {
    uiTag.exportFile();
  });

  // --------------------------------------------------------------------------

  // The taxonomy-related functions manage a representation of the taxonomic
  // relations between various entities in the visualisation, and are also
  // used to control the colouring of the corresponding tags/labels.

  // The taxonomy can be read/set as a YAML document.  Here, we load the
  // sample taxonomy served with the demo files.
  const sampleTaxonomy = await $.ajax("/taxonomy.yml");
  uiTag.loadTaxonomyYaml(sampleTaxonomy);

  // A simple editor allowing the user to tweak the taxonomy on the fly
  const editor = new CodeFlask("#tag-taxonomy-editor", {language: "yaml"});

  // Copying the Prism YAML syntax definition here for syntax highlighting,
  // since CodeFlask can't load it automatically
  editor.addLanguage("yaml", {
    "scalar": {
      pattern: /([\-:]\s*(?:![^\s]+)?[ \t]*[|>])[ \t]*(?:((?:\r?\n|\r)[ \t]+)[^\r\n]+(?:\2[^\r\n]+)*)/,
      lookbehind: true,
      alias: "string"
    },
    "comment": /#.*/,
    "key": {
      pattern: /(\s*(?:^|[:\-,[{\r\n?])[ \t]*(?:![^\s]+)?[ \t]*)[^\r\n{[\]},#\s]+?(?=\s*:\s)/,
      lookbehind: true,
      alias: "atrule"
    },
    "directive": {
      pattern: /(^[ \t]*)%.+/m,
      lookbehind: true,
      alias: "important"
    },
    "datetime": {
      pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)(?:\d{4}-\d\d?-\d\d?(?:[tT]|[ \t]+)\d\d?:\d{2}:\d{2}(?:\.\d*)?[ \t]*(?:Z|[-+]\d\d?(?::\d{2})?)?|\d{4}-\d{2}-\d{2}|\d\d?:\d{2}(?::\d{2}(?:\.\d*)?)?)(?=[ \t]*(?:$|,|]|}))/m,
      lookbehind: true,
      alias: "number"
    },
    "boolean": {
      pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)(?:true|false)[ \t]*(?=$|,|]|})/im,
      lookbehind: true,
      alias: "important"
    },
    "null": {
      pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)(?:null|~)[ \t]*(?=$|,|]|})/im,
      lookbehind: true,
      alias: "important"
    },
    "string": {
      pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)("|')(?:(?!\2)[^\\\r\n]|\\.)*\2(?=[ \t]*(?:$|,|]|}))/m,
      lookbehind: true,
      greedy: true
    },
    "number": {
      pattern: /([:\-,[{]\s*(?:![^\s]+)?[ \t]*)[+-]?(?:0x[\da-f]+|0o[0-7]+|(?:\d+\.?\d*|\.?\d+)(?:e[+-]?\d+)?|\.inf|\.nan)[ \t]*(?=$|,|]|})/im,
      lookbehind: true
    },
    "tag": /![^\s]+/,
    "important": /[&*][\w]+/,
    "punctuation": /---|[:[\]{}\-,|>?]|\.\.\./
  });

  $("#tag-taxonomy-stop-edit").on("click", () => {
    // Try to save the new taxonomy YAML, letting the user know if anything
    // broke
    const $errors = $("#tag-taxonomy-editor-errors");
    try {
      $errors.hide();
      const newYaml = editor.getCode();
      uiTag.loadTaxonomyYaml(newYaml);
    } catch (err) {
      $errors.text(err);
      return $errors.show();
    }

    $("#tag-taxonomy-view").show();
    $("#tag-taxonomy-edit").hide();
  });

  // Start with the editor hidden
  $("#tag-taxonomy-edit").hide();
  $("#tag-taxonomy-start-edit").on("click", () => {
    editor.updateCode(uiTag.getTaxonomyYaml());
    $("#tag-taxonomy-view").hide();
    $("#tag-taxonomy-edit").show();
  });

  // Debug
  window._ = require("lodash");
  window.$ = require("jquery");
  window.basicTag = basicTag;
  window.uiTag = uiTag;
  window.editor = editor;
  window.yaml = require("js-yaml");
});