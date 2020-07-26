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

    this.registeredTags = {};
    this.topTagCategory = "";
    this.bottomTagCategory = "";

    // Back-references that will be set when this Word is used in
    // other structures
    // ---------------------------------------------------------
    // WordTag
    this.topTag = null;
    this.bottomTag = null;

    // WordCluster
    this.clusters = [];

    // Link
    this.links = [];

    // Row
    this.row = null;

    // Links that pass over this Word (even if this Word is not an endpoint
    // for the Link) -- Used for Link/Row slot calculations
    this.passingLinks = [];

    // SVG-related properties
    // ----------------------
    this.initialised = false;

    // Main API instance
    this.main = null;

    // Main Config object for the parent instance
    this.config = null;

    // SVG group containing this Word and its attendant WordTags
    this.svg = null;

    // The x-position of the left bound of the Word's box
    this.x = 0;

    // Calculate the SVG BBox only once per transformation (it's expensive)
    this._bbox = null;
    this._textBbox = null;
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
   * Register a tag for this word under the given category.
   * At run-time, one category of tags can be shown above this Word and
   * another can be shown below it.
   * @param {String} category
   * @param {String} tag
   */
  registerTag(category = "default", tag) {
    this.registeredTags[category] = tag;
  }

  /**
   * Returns all the unique tag categories currently registered for this Word
   */
  getTagCategories() {
    return Object.keys(this.registeredTags);
  }

  /**
   * Sets the top tag category for this Word, redrawing it if it is initialised
   * @param {String} category
   */
  setTopTagCategory(category) {
    if (this.topTag) {
      this.topTag.remove();
      this.topTag = null;
    }

    // Not all categories of tags will be available for all Words
    if (!this.registeredTags[category]) {
      return;
    }

    this.topTagCategory = category;
    if (this.initialised) {
      this.topTag = new WordTag(
        this.registeredTags[category],
        this,
        this.config
      );

      // Since one of the Word's tags has changed, recalculate/realign its
      // bounding box
      this.alignBox();
    }
  }

  /**
   * Sets the bottom tag category for this Word, redrawing it if it is
   * initialised
   * @param {String} category
   */
  setBottomTagCategory(category) {
    if (this.bottomTag) {
      this.bottomTag.remove();
      this.bottomTag = null;
    }

    // Not all categories of tags will be available for all Words
    if (!this.registeredTags[category]) {
      return;
    }

    this.bottomTagCategory = category;
    if (this.initialised) {
      this.bottomTag = new WordTag(
        this.registeredTags[category],
        this,
        this.config,
        false
      );

      // Since one of the Word's tags has changed, recalculate/realign its
      // bounding box
      this.alignBox();
    }
  }

  /**
   * Initialises the SVG elements related to this Word, and performs an
   * initial draw of it and its WordTags.
   * The Word will be drawn in the top left corner of the canvas, but will
   * be properly positioned when added to a Row.
   * @param main - The main API instance
   */
  init(main) {
    this.main = main;
    this.config = main.config;

    const mainSvg = main.svg;

    this.svg = mainSvg
      .group()
      .addClass("tag-element")
      .addClass("word");

    // Draw main word text.  We remove the default additional leading
    // (basically vertical line-height padding) so that we can position it
    // more precisely.
    this.svgText = this.svg
      .text(this.text)
      .addClass("tag-element")
      .addClass("word-text")
      .leading(1);

    // The positioning anchor for the text element is its centre, so we need
    // to translate the entire Word rightward by half its width.
    // In addition, the x/y-position points at the upper-left corner of the
    // Word's bounding box, but since we are working relative to the Row's
    // main line, we need to move the Word upwards so that the lower-left
    // corner meets the Row.
    // The desired final outcome is for the Text element's bbox to have an
    // x-value of 0 and a y2-value of 0.
    const currentBox = this.svgText.bbox();
    this.svgText.move(-currentBox.x, -currentBox.height);
    this._textBbox = this.svgText.bbox();

    // ------------------------
    // Draw in this Word's tags
    if (this.topTagCategory) {
      this.topTag = new WordTag(
        this.registeredTags[this.topTagCategory],
        this,
        this.config
      );
    }
    if (this.bottomTagCategory) {
      this.bottomTag = new WordTag(
        this.registeredTags[this.bottomTagCategory],
        this,
        this.config,
        false
      );
    }

    // Draw cluster info
    this.clusters.forEach((cluster) => {
      cluster.init(this, main);
    });

    // Ensure that all the SVG elements for this Word and any WordTags are
    // well-positioned within the Word's bounding box, and set the cached
    // values this._textBbox and this._bbox
    this.alignBox();

    // ---------------------
    // Attach drag listeners
    let x = 0;
    let mousemove = false;
    this.svgText
      .draggable()
      .on("dragstart", function(e) {
        mousemove = false;
        x = e.detail.p.x;
        mainSvg.fire("word-move-start");
      })
      .on("dragmove", (e) => {
        e.preventDefault();
        let dx = e.detail.p.x - x;
        x = e.detail.p.x;
        mainSvg.fire("word-move", { object: this, x: dx });
        if (dx !== 0) {
          mousemove = true;
        }
      })
      .on("dragend", () => {
        mainSvg.fire("word-move-end", {
          object: this,
          clicked: mousemove === false
        });
      });
    // attach right click listener
    this.svgText.dblclick((e) =>
      mainSvg.fire("build-tree", {
        object: this,
        event: e
      })
    );
    this.svgText.node.oncontextmenu = (e) => {
      e.preventDefault();
      mainSvg.fire("word-right-click", { object: this, event: e });
    };

    this.initialised = true;
  }

  /**
   * Redraw Links
   */
  redrawLinks() {
    this.links.forEach((l) => l.draw(this));
    this.redrawClusters();
  }

  /**
   * Redraw all clusters (they should always be visible)
   */
  redrawClusters() {
    this.clusters.forEach((cluster) => {
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
    this.svg.transform({ x: this.x });
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
    // We begin by resetting the position of the Text elements of this Word
    // and any WordTags, so that consecutive calls to `.alignBox()` don't
    // push them further and further away from their starting point
    this.svgText.attr({ x: 0, y: 0 });
    const currentBox = this.svgText.bbox();
    this.svgText.move(-currentBox.x, -currentBox.height);
    this._textBbox = this.svgText.bbox();

    if (this.topTag) {
      this.topTag.centre();
    }
    if (this.bottomTag) {
      this.bottomTag.centre();
    }

    // Generally, we will only need to move things around if the WordTags
    // are wider than the Word, which gives the Word's bounding box a
    // negative x-value.
    this._bbox = this.svg.bbox();
    const diff = -this._bbox.x;
    if (diff <= 0) {
      return;
    }

    // We can't apply the `.x()` translation directly to this Word's SVG
    // group, or it will simply set a transformation on the group (leaving
    // the bounding box unchanged).  We need to move all its children
    // (recursively) instead.
    function childrenDx(parent, diff) {
      for (const child of parent.children()) {
        if (child.children && child.children()) {
          childrenDx(child, diff);
        } else {
          child.dx(diff);
        }
      }
    }

    childrenDx(this.svg, diff);

    // And update the cached values
    this._bbox = this.svg.bbox();
  }

  /**
   * Returns the width of the bounding box for this Word and its WordTags.
   * @return {Number}
   */
  get boxWidth() {
    return this._bbox.width;
  }

  /**
   * Returns the minimum width needed to hold this Word and its WordTags.
   * Differs from boxWidth in that it will also reserve space for the Word's
   * WordClusters if necessary (even though the WordClusters are not
   * technically part of the Word's box)
   */
  get minWidth() {
    // The Word's Bbox covers the Word and its WordTags
    let minWidth = this.boxWidth;

    for (const cluster of this.clusters) {
      const [clusterLeft, clusterRight] = cluster.endpoints;
      if (clusterLeft.row !== clusterRight.row) {
        // Let's presume that if the Rows are different, the Cluster has
        // enough space (this probably isn't true, but can be revisited later)
        continue;
      }

      const wordWidth =
        cluster.endpoints[1].x +
        cluster.endpoints[1].boxWidth -
        cluster.endpoints[0].x;

      const labelWidth = cluster.svgText.bbox().width;

      if (labelWidth > wordWidth) {
        // The WordCluster's label is wider than the Words it comprises; add
        // a bit of extra width to this Word
        minWidth = Math.max(minWidth, labelWidth / cluster.words.length);
      }
    }
    return minWidth;
  }

  /**
   * Returns the extent of the bounding box for this Word above the Row's line
   * @return {Number}
   */
  get boxHeight() {
    // Since the Word's box is relative to the Row's line to begin with,
    // this is simply the negative of the y-value of the box
    return -this._bbox.y;
  }

  /**
   * Returns the extent of the bounding box for this Word below the Row's line
   * @return {Number}
   */
  get descendHeight() {
    // Since the Word's box is relative to the Row's line to begin with,
    // this is simply the y2-value of the box
    return this._bbox.y2;
  }

  /**
   * Returns the absolute y-position of the top of this Word's bounding box
   * @return {Number}
   */
  get absoluteY() {
    return this.row ? this.row.baseline - this.boxHeight : this.boxHeight;
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
   * Returns the absolute x-position of the centre of this Word's box
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
    return this._textBbox.width;
  }

  /**
   * Returns the height of the bounding box of the Word's SVG text element
   * @return {Number}
   */
  get textHeight() {
    return this._textBbox.height;
  }

  /**
   * Returns the *relative* x-position of the centre of the bounding
   * box of the Word's SVG text element
   */
  get textRcx() {
    return this._textBbox.cx;
  }

  /**
   * Returns true if this Word contains a single punctuation character
   *
   * FIXME: doesn't handle fancier unicode punctuation | should exclude
   * left-punctuation e.g. left-paren or left-quote
   * @return {Boolean}
   */
  get isPunct() {
    return this.text.length === 1 && this.text.charCodeAt(0) < 65;
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Debug functions
  /**
   * Draws the outline of this component's bounding box
   */
  drawBbox() {
    const bbox = this.svg.bbox();
    this.svg
      .polyline([
        [bbox.x, bbox.y],
        [bbox.x2, bbox.y],
        [bbox.x2, bbox.y2],
        [bbox.x, bbox.y2],
        [bbox.x, bbox.y]
      ])
      .fill("none")
      .stroke({ width: 1 });
  }

  /**
   * Draws the outline of the text element's bounding box
   */
  drawTextBbox() {
    const bbox = this.svgText.bbox();
    this.svg
      .polyline([
        [bbox.x, bbox.y],
        [bbox.x2, bbox.y],
        [bbox.x2, bbox.y2],
        [bbox.x, bbox.y2],
        [bbox.x, bbox.y]
      ])
      .fill("none")
      .stroke({ width: 1 });
  }
}

export default Word;
