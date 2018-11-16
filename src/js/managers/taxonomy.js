/**
 * Manages the user-provided taxonomy tree, and the colouring of the
 * associated elements in the visualisation
 */

const randomColor = require("randomcolor");

import ColorPicker from "../colorpicker.js";
import Word from "../components/word.js";

class TaxonomyManager {
  constructor() {
    // The currently loaded taxonomy
    this.taxonomy = [];

    // Tag->Colour assignments for the currently loaded taxonomy
    this.tagColours = {};

    // An array containing the first n default colours to use (as a queue).
    // When this array is exhausted, we will switch to using randomColor.
    this.defaultColours = [
      "#3fa1d1",
      "#ed852a",
      "#2ca02c",
      "#c34a1d",
      "#a048b3",
      "#e377c2",
      "#bcbd22",
      "#17becf",
      "#e7298a",
      "#e6ab02",
      "#7570b3",
      "#a6761d",
      "#7f7f7f"
    ];
  }

  /**
   * Loads a new taxonomy specification into the module
   * @param taxonomy
   */
  loadTaxonomy(taxonomy) {
    this.taxonomy = taxonomy;
  }

  /**
   * Given some array of Words, recolours them according to the currently
   * loaded taxonomy.
   * If the word has a WordTag that we are not currently tracking, it will
   * be assigned a colour from the default colours list.
   * @param {Array} words
   */
  colour(words) {
    words.forEach(word => {
      // Words with WordTags
      if (word.tag) {
        if (!this.tagColours[word.tag.val]) {
          // We have yet to assign this tag a colour
          this.tagColours[word.tag.val] = this.getNewColour();
        }
        TaxonomyManager.setColour(word, this.tagColours[word.tag.val]);
      }

      // Words with WordClusters
      if (word.clusters.length > 0) {
        word.clusters.forEach(cluster => {
          if (!this.tagColours[cluster.val]) {
            this.tagColours[cluster.val] = this.getNewColour();
          }
          TaxonomyManager.setColour(cluster, this.tagColours[cluster.val]);
        });
      }
    });
  }

  /**
   * Synonym for `.colour()`
   * @param words
   * @return {*}
   */
  color(words) {
    return this.colour(words);
  }


  /**
   * Given some element in the visualisation, change its colour
   * @param element
   * @param colour
   */
  static setColour(element, colour) {
    if (element instanceof Word) {
      // Set the colour of the tag
      element.tag.svgText.node.style.fill = colour;
    } else {
      // Set the colour of the element itself
      element.svgText.node.style.fill = colour;
    }
  }

  /**
   * Returns a colour for a new tag.  Will pop from `.defaultColours` first,
   * then fall back to `randomColor()`
   */
  getNewColour() {
    if (this.defaultColours.length > 0) {
      return this.defaultColours.shift();
    } else {
      return randomColor();
    }
  }
}

module.exports = TaxonomyManager;
