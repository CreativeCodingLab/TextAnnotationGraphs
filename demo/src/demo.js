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
require("bootstrap/js/dist/collapse");
require("bootstrap/js/dist/dropdown");
require("bootstrap/js/dist/modal");
require("bootstrap/js/dist/popover");

// Prism for syntax highlighting
require("prismjs");

// CodeFlask for editing the taxonomy on the fly
const CodeFlask = require("codeflask");

// Handlebars recursive template for the taxonomy colour picker demo
const tplTaxonomy = require("./taxonomy.hbs");
const Handlebars = require("hbsfy/runtime");
Handlebars.registerPartial("taxonomySubtree", tplTaxonomy);

// The colour picker script itself is included in the main HTML, because it
// doesn't play nice with Browserify.  Here we expose the jquery globals it
// needs.
window.$ = $;
window.jQuery = $;

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
    // E.g., the "odin" format expects the annotations as an
    // (already-parsed) Object, while the "brat" format expects them as a raw
    // String.
    // See the full documentation for details.
    data: require("../data/test-odin.json"),
    format: "odin"
  });

  // -------------------
  // Advanced/UI example
  // -------------------
  const $uiContainer = $("#uiContainer");
  const uiTag = TAG.tag({
    container: $uiContainer
  });

  // Data can be loaded after initialisation using the `.loadData()` function,
  // or from a remote URL via the asynchronous `.loadUrlAsync()` function.
  await uiTag.loadUrlAsync("data/sentence-1-odin.json", "odin");

  // --------------------------------------------------------------------------

  // Data from an external URL can also be loaded into the visualisation
  // using the `.loadUrlAsync()` function.  The data will be read and displayed
  // asynchronously.
  $("#tag-change-dataset").on("click", ".tag-dataset", async (event) => {
    event.preventDefault();
    const $link = $(event.target);
    await uiTag.loadUrlAsync($link.data("path"), $link.data("format"));
    refreshLinkCategories();
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
      refreshLinkCategories();

      const $modal = $("#tag-upload");

      $modal.wrap("<form>").closest("form").get(0).reset();
      $modal.unwrap();
      $("#tag-upload-label").text("Choose file(s)");

      $modal.modal("hide");
    }
  });

  // --------------------------------------------------------------------------

  // The `.getOption()` and `.setOption()` function can be used to change
  // various advanced options.
  // There are also some direct functions available that directly modify the
  // visualisation, like `.setTopLinkCategory()` and `.setBottomLinkCategory()`


  /**
   * The categories available for the top and bottom Links depends on the
   * currently loaded data, so we call for a refresh any time the data changes
   */
  function refreshLinkCategories() {
    // [Categories for top Links]
    // We will populate the select menu and add a change handler
    const $optionTopLinks = $("#tag-option-top-links")
      .empty()
      .append($("<option value='none'>None</option>"));

    const currentTop = uiTag.getOption("topLinksCategory");
    for (const category of uiTag.getTopLinkCategories()) {
      const $option = $("<option></option>")
        .attr("value", category)
        .text(_.upperFirst(category));

      if (category === currentTop) {
        $option.prop("selected", true);
      }

      $optionTopLinks.append($option);
    }
    $optionTopLinks.on("change", () => {
      uiTag.setTopLinkCategory($optionTopLinks.val());
    });

    // [Categories for bottom Links]
    // We will populate the select menu and add a change handler
    const $optionBottomLinks = $("#tag-option-bottom-links")
      .empty()
      .append($("<option value='none'>None</option>"));

    const currentBottom = uiTag.getOption("bottomLinksCategory");
    for (const category of uiTag.getBottomLinkCategories()) {
      const $option = $("<option></option>")
        .attr("value", category)
        .text(_.upperFirst(category));

      if (category === currentBottom) {
        $option.prop("selected", true);
      }

      $optionBottomLinks.append($option);
    }
    $optionBottomLinks.on("change", () => {
      uiTag.setBottomLinkCategory($optionBottomLinks.val());
    });
  }

  refreshLinkCategories();

  const $optionTopLinksOnMove = $("#tag-option-top-links-on-move");
  $optionTopLinksOnMove
    .prop("checked", uiTag.getOption("showTopLinksOnMove"))
    .on("change", () => {
      uiTag.setOption(
        "showTopLinksOnMove",
        $optionTopLinksOnMove[0].checked
      );
    });

  const $optionBottomLinksOnMove = $("#tag-option-bottom-links-on-move");
  $optionBottomLinksOnMove
    .prop("checked", uiTag.getOption("showBottomLinksOnMove"))
    .on("change", () => {
      uiTag.setOption(
        "showBottomLinksOnMove",
        $optionBottomLinksOnMove[0].checked
      );
    });

  const $optionTopMainLabel = $("#tag-option-top-main-label");
  $optionTopMainLabel
    .prop("checked", uiTag.getOption("showTopMainLabel"))
    .on("change", () => {
      uiTag.setTopMainLabelVisibility($optionTopMainLabel[0].checked);
    });
  const $optionTopArgLabels = $("#tag-option-top-arg-labels");
  $optionTopArgLabels
    .prop("checked", uiTag.getOption("showTopArgLabels"))
    .on("change", () => {
      uiTag.setTopArgLabelVisibility($optionTopArgLabels[0].checked);
    });
  const $optionBottomMainLabel = $("#tag-option-bottom-main-label");
  $optionBottomMainLabel
    .prop("checked", uiTag.getOption("showBottomMainLabel"))
    .on("change", () => {
      uiTag.setBottomMainLabelVisibility($optionBottomMainLabel[0].checked);
    });
  const $optionBottomArgLabels = $("#tag-option-bottom-arg-labels");
  $optionBottomArgLabels
    .prop("checked", uiTag.getOption("showBottomArgLabels"))
    .on("change", () => {
      uiTag.setBottomArgLabelVisibility($optionBottomArgLabels[0].checked);
    });

  // --------------------------------------------------------------------------

  // The `.exportSvg()` function can be used to save the current
  // visualisation as an SVG file
  $("#tag-download").on("click", () => {
    uiTag.exportSvg();
  });

  // --------------------------------------------------------------------------

  // The taxonomy-related functions manage a representation of the taxonomic
  // relations between various entities in the visualisation, and are also
  // used to control the colouring of the corresponding tags/labels.

  // Here, we load up the sample taxonomy served with the demo files.
  const sampleTaxonomy = await $.ajax("/taxonomy.yml");
  uiTag.loadTaxonomyYaml(sampleTaxonomy);

  // We can then render the taxonomy tree as an accordion list with colour
  // pickers for each label.

  /**
   * In order to render the taxonomy tree more easily using a Handlebars
   * template, we convert the full tree object into a slightly flatter Array
   * of plain Object blocks:
   *   - Consecutive leaf nodes are grouped together within a single Object
   *   - Branches of the tree are given one Object each, with a `children`
   *     property that can recursively contain more leaf/branch blocks
   *   - The assigned colour from the taxonomy manager for the given label is
   *     also recorded
   *
   * The flattened array is then passed to the Handlebars recursive template
   * for rendering.
   */
  function refreshTaxonomyTree() {
    const rawTaxonomy = uiTag.getTaxonomyTree();

    // We also pre-calculate the left-padding for nested branches here
    const paddingIncrement = 20;

    // Recursive render block generator
    const flattenTaxonomy = (taxonomy, depth) => {
      depth = depth || 0;

      const flatTaxonomy = [];
      let currentLeafBlock = [];
      for (let node of taxonomy) {
        if (!_.isObject(node)) {
          // This is a leaf node - Add the raw and normalised label to the open
          // leaf block and continue
          currentLeafBlock.push({
            label: node,
            id: _.kebabCase(node),
            colour: uiTag.getColour(node)
          });
          continue;
        }

        // This is a branch node - See if we need to close the open leaf
        // block
        if (currentLeafBlock.length > 0) {
          flatTaxonomy.push({
            leaves: currentLeafBlock,
            padding: paddingIncrement * depth
          });
          currentLeafBlock = [];
        }

        // Get the label and recurse.
        // There should only be a single key for this object, and it should be
        // used as the label.  The key should point to an Array of children to
        // recurse with.
        // We also need a normalised label to use as the id of the rendered
        // HTML element.
        const label = _.keys(node)[0];
        flatTaxonomy.push({
          label,
          id: _.kebabCase(label),
          colour: uiTag.getColour(label),
          children: flattenTaxonomy(node[label], depth + 1),
          padding: paddingIncrement * depth
        });
      }

      // Done flattening all the children under this sub-tree.  Close out the
      // open leaf block if we have to, then return
      if (currentLeafBlock.length > 0) {
        flatTaxonomy.push({
          leaves: currentLeafBlock,
          padding: paddingIncrement * depth
        });
      }
      return flatTaxonomy;
    };

    // Render HTML, refresh pickers
    const renderTaxonomy = flattenTaxonomy(rawTaxonomy);

    $("#tag-taxonomy-tree").html(
      tplTaxonomy({
        children: renderTaxonomy
      })
    );
    $(".tag-cp")
      .colorpicker({
        format: "hex",
        autoInputFallback: false
      })
      .on("change", (event) => {
        /**
         * When a new colour is selected, update the taxonomy manager
         */
        const $this = $(event.target);
        uiTag.setColour($this.data("label"), $this.val());
      });
  }

  refreshTaxonomyTree();

  // --------------------------------------------------------------------------

  // The taxonomy can also be read/set directly as a YAML document, allowing
  // us to tweak the taxonomy on the fly

  // A simple editor allowing the user to edit the taxonomy directly
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
      refreshTaxonomyTree();
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

  // --------------------------------------------------------------------------

  // Debug
  window._ = require("lodash");
  window.basicTag = basicTag;
  window.uiTag = uiTag;
  window.editor = editor;
  window.yaml = require("js-yaml");
});