/**
 * Objects representing raw entity/token strings.
 *
 * The SVG elements for the Word and any attendant WordTags are positioned
 * within an SVG group such that the bounding box of the Word always has an
 * x-value of 0.  In addition, a y-value of 0 within the bounding box
 * corresponds to the bottom of the Word's text element (between the Word
 * and a bottom WordTag, if one is present).
 *
 * Actual positioning of this Word's SVG elements is then achieved by
 * applying an x-transformation to the SVG group as a whole.
 *
 *   WordTag / WordCluster -> [Word] -> Row
 */

import WordTag from "./word-tag.js";
import * as SVG from "svg.js";
import * as draggable from "svg.draggable.js";

class Word {
  /**
   * Creates a new Word instance
   * @param {String} text - The raw text for this Word
   * @param {Number} idx - The index of this Word within the
   *     currently-parsed document
   */
  constructor(text, idx) {
    this.text = text;
    this.idx = idx;

    // Optional properties that may be set later
    // -----------------------------------------
    this.eventIds = [];
    this.syntaxId = "";
    this.tagText = "";
    this.syntaxTagText = "";

    // Backreferences that will be set when this Word is used in
    // other structures
    // ---------------------------------------------------------
    // WordTag
    this.tag = null;
    this.syntaxTag = null;

    // WordCluster
    this.clusters = [];

    // Link
    this.links = [];

    // Row
    this.row = null;

    // SVG-related properties
    // ----------------------
    this.initialised = null;

    // Main SVG object (for firing events, etc.)
    this.mainSvg = null;

    // Main Config object for the parent instance
    this.config = null;

    // SVG group containing this Word and its attendant WordTags
    this.svg = null;

    // The x-position of the left bound of the Word's box
    this.x = 0;

    this.boxWidth = 0;
    this.boxHeight = 0;
    this.descendHeight = 0;
  }

  /**
   * Any event IDs (essentially arbitrary labels) that this Word is
   * associated with
   * @param id
   */
  addEventId(id) {
    if (this.eventIds.indexOf(id) < 0) {
      this.eventIds.push(id);
    }
  }

  /**
   * The syntax ID (essentially an arbitrary label) that this Word is
   * associated with
   * @param id
   */
  setSyntaxId(id) {
    this.syntaxId = id;
  }

  /**
   * Sets the main tag text for this Word, redrawing it if it is initialised
   * @param {String} tag
   * @return {null}
   */
  setTag(tag) {
    this.tagText = tag;
    if (this.initialised) {
      if (this.tag instanceof WordTag) {
        this.tag.remove();
      }
      this.tag = new WordTag(tag, this, this.config);
      this.tag.draw();
    }
  }

  /**
   * Sets the syntax tag text for this Word, redrawing it if it is initialised
   * @param {String} tag
   * @return {null}
   */
  setSyntaxTag(tag) {
    this.syntaxTagText = tag;
    if (this.initialised) {
      if (this.syntaxTag instanceof WordTag) {
        this.syntaxTag.remove();
      }
      this.syntaxTag = new WordTag(tag, this, this.config, false);
      this.syntaxTag.draw();
    }
  }

  /**
   * Initialises the SVG elements related to this Word, and performs an
   * initial draw of it and its WordTags.
   * The Word will be drawn in the top left corner of the canvas, but will
   * be properly positioned when added to a Row.
   * @param mainSvg - The main SVG document for the current TAG instance
   * @param config - The Config object for the instance
   */
  init(mainSvg, config) {
    this.mainSvg = mainSvg;
    this.config = config;

    this.svg = mainSvg.group()
      .addClass("tag-element")
      .addClass("word");

    // Draw main word text.  We remove the default additional leading
    // (basically vertical line-height padding) so that we can position it
    // more precisely.
    this.svgText = this.svg.text(this.text)
      .addClass("tag-element")
      .addClass("word-text")
      .leading(1);

    // The positioning anchor for the text element is its centre, so we need
    // to translate the entire Word rightward by half its width
    this.svgText.x(this.svgText.bbox().width / 2);

    // In addition, the x/y-position points at the upper-left corner of the
    // Word's bounding box, but since we are working relative to the Row's
    // main line, we need to move the Word upwards so that the lower-left
    // corner meets the Row.
    this.svgText.y(-this.svgText.bbox().height);

    // Draw in this Word's tags
    if (this.tagText && !(this.tag instanceof WordTag)) {
      this.tag = new WordTag(this.tagText, this, this.config);
    }
    if (this.syntaxTagText && !(this.syntaxTag instanceof WordTag)) {
      this.syntaxTag = new WordTag(this.syntaxTagText, this, this.config, false);
    }

    // Draw cluster info
    this.clusters.forEach((cluster) => {
      cluster.init(this);
    });


    // Make sure that all the SVG elements for this Word and any WordTags are
    // well-positioned within the Word's bounding box
    this.alignBox();

    // attach drag listeners
    let x = 0;
    let mousemove = false;
    this.svgText.draggable()
      .on("dragstart", function (e) {
        mousemove = false;
        x = e.detail.p.x;
        mainSvg.fire("word-move-start");
      })
      .on("dragmove", (e) => {
        e.preventDefault();
        let dx = e.detail.p.x - x;
        x = e.detail.p.x;
        mainSvg.fire("word-move", {object: this, x: dx});
        if (dx !== 0) {
          mousemove = true;
        }
      })
      .on("dragend", (e) => {
        mainSvg.fire("word-move-end", {
          object: this,
          clicked: mousemove === false
        });
      });
    // attach right click listener
    this.svgText.dblclick((e) => mainSvg.fire("build-tree", {
      object: this,
      event: e
    }));
    this.svgText.node.oncontextmenu = (e) => {
      e.preventDefault();
      mainSvg.fire("word-right-click", {object: this, event: e});
    };
  }

  redrawLinks() {
    this.links.forEach(l => l.draw(this));
    this.redrawClusters();
  }

  redrawClusters() {
    this.clusters.forEach(cluster => {
      if (cluster.endpoints.indexOf(this) > -1) {
        cluster.draw();
      }
    });
  }

  /**
   * Sets the base x-position of this Word and its attendant SVG elements
   * (including its WordTags)
   * @param x
   */
  move(x) {
    this.x = x;
    this.svg.transform({x: this.x});
    this.redrawLinks();
  }

  /**
   * Moves the base x-position of this Word and its attendant SVG elements
   * by the given amount
   * @param x
   */
  dx(x) {
    this.move(this.x + x);
  }

  /**
   * Aligns the elements of this Word and any attendant WordTags such that
   * the entire Word's bounding box has an x-value of 0, and an x2-value
   * equal to its width
   */
  alignBox() {
    // Generally, we will only need to move things around if the WordTags
    // are wider than the Word, which gives the Word's bounding box a
    // negative x-value.
    const diff = -this.svg.bbox().x;

    // We can't apply the `.x()` translation directly to this Word's SVG
    // group, or it will simply set a transformation on the group (leaving
    // the bounding box unchanged).  We need to move all its children instead.
    for (const child of this.svg.children()) {
      child.dx(diff);
    }
  }

  /**
   * Returns the width of the bounding box for this Word and its WordTags
   * @return {Number}
   */
  get boxWidth() {
    return this.svg.bbox().width;
  }

  /**
   * Returns the extent of the bounding box for this Word above the Row's line
   * @return {Number}
   */
  get boxHeight() {
    // Since the Word's box is relative to the Row's line to begin with,
    // this is simply the negative of the y-value of the box
    return -this.svg.bbox().y;
  }

  /**
   * Returns the extent of the bounding box for this Word below the Row's line
   * @return {Number}
   */
  get descendHeight() {
    // Since the Word's box is relative to the Row's line to begin with,
    // this is simply the y2-value of the box
    return this.svg.bbox().y2;
  }

  /**
   * Returns the absolute y-position of the top of this Word's bounding box
   * @return {Number}
   */
  get absoluteY() {
    return this.row
      ? this.row.ry + this.row.rh - this.boxHeight
      : this.boxHeight;
  }

  /**
   * Returns the absolute y-position of the bottom of this Word's bounding box
   * @return {Number}
   */
  get absoluteDescent() {
    return this.row
      ? this.row.ry + this.row.rh + this.descendHeight
      : this.descendHeight;
  }

  /**
   * Returns the x-position of the centre of this Word's box
   * @return {Number}
   */
  get cx() {
    return this.x + this.boxWidth / 2;
  }

  /**
   * Returns the width of the bounding box of the Word's SVG text element
   * @return {Number}
   */
  get textWidth() {
    return this.svgText.bbox().width;
  }

  /**
   * Returns true if this Word contains a single punctuation character
   *
   * FIXME: doesn't handle fancier unicode punct | should exclude
   * left-punctuation e.g. left-paren or left-quote
   * @return {Boolean}
   */
  get isPunct() {
    return (this.text.length === 1 && this.text.charCodeAt(0) < 65);
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Debug functions
  /**
   * Draws the outline of this component's bounding box
   */
  drawBbox() {
    const bbox = this.svg.bbox();
    this.svg.polyline([
      [bbox.x, bbox.y], [bbox.x2, bbox.y], [bbox.x2, bbox.y2], [bbox.x, bbox.y2],
      [bbox.x, bbox.y]])
      .fill("none")
      .stroke({width: 1});
  }

  /**
   * Draws the outline of the text element's bounding box
   */
  drawTextBbox() {
    const bbox = this.svgText.bbox();
    this.svg.polyline([
      [bbox.x, bbox.y], [bbox.x2, bbox.y], [bbox.x2, bbox.y2], [bbox.x, bbox.y2],
      [bbox.x, bbox.y]])
      .fill("none")
      .stroke({width: 1});
  }
}

module.exports = Word;