/**
 * Tags for cases where multiple words make up a single entity
 * E.g.: The two words "DNA damage" as a single "BioProcess"
 *
 * Act as the anchor for any incoming Links (in lieu of the Words it covers)
 *
 *   WordTag -> Word -> Row
 *   [WordCluster]
 *   Link
 */

class WordCluster {
  /**
   * Creates a new WordCluster instance
   * @param {Word[]} words - An array of the Words that this cluster will cover
   * @param {String} val - The raw text for this cluster's label
   */
  constructor(words = [], val) {
    this.eventIds = [];
    this.val = val;
    this.words = words;
    this.links = [];

    // SVG elements:
    //   2 groups for left & right brace, containing:
    //   a path appended to each of the two groups
    //   a text label appended to the left group
    // The SVG groups are children of the main SVG document rather than the
    // Word's SVG group, since WordClusters technically exceed the bounds of
    // their individual Words.
    this.svgs = [];
    this.lines = [];
    this.svgText = null;

    // The main API instance for the visualisation
    this.main = null;

    // Main Config object for the parent instance; set by `.init()`
    this.config = null;

    words.forEach(word => word.clusters.push(this));
  }

  /**
   * Any event IDs (essentially arbitrary labels) that this WordCluster is
   * associated with
   * @param id
   */
  addEventId(id) {
    if (this.eventIds.indexOf(id) < 0) {
      this.eventIds.push(id);
    }
  }

  /**
   * Sets the text of this WordCluster, or returns this WordCluster's SVG text
   * element
   * @param val
   * @return {*}
   */
  text(val) {
    if (val === undefined) {
      return this.svgText;
    }

    this.val = val;
    this.svgText.text(this.val);

    if (this.editingRect) {
      let bbox = this.svgText.bbox();
      if (bbox.width > 0) {
        this.editingRect
          .width(bbox.width + 8)
          .height(bbox.height + 4)
          .x(bbox.x - 4)
          .y(bbox.y - 2);
      } else {
        this.editingRect.width(10)
          .x(this.svgText.x() - 5);
      }
    }
  }

  /**
   * Initialise this WordCluster against the main API instance.
   * Will be called once each by every Word within this cluster's coverage,
   * but we are really only interested in the first Word and the last Word
   * @param {Word} word - A Word within this cluster's coverage.
   * @param main
   */
  init(word, main) {
    const idx = this.endpoints.indexOf(word);
    if (idx < 0) {
      // Not a critical word
      return;
    }

    this.main = main;
    this.config = main.config;

    // A critical Word.  Prepare the corresponding SVG group.
    const mainSvg = main.svg;

    if (!this.svgs[idx]) {
      let svg = this.svgs[idx] = mainSvg.group()
        .addClass("tag-element")
        .addClass("word-cluster");

      this.lines[idx] = svg.path()
        .addClass("tag-element");
      if (idx === 0) {
        this.svgText = svg.text(this.val).leading(1);
        this.svgText.node.oncontextmenu = (e) => {
          e.preventDefault();
          mainSvg.fire("tag-right-click", {object: this, event: e});
        };
        this.svgText.click(() => mainSvg.fire("tag-edit", {object: this}));
      }
    }

    // Perform initial draw if both arms are ready
    if (this.lines[1] && this.endpoints[1].row) {
      this.draw();
    }
  }

  /**
   * Draws in the SVG elements for this WordCluster
   * https://codepen.io/explosion/pen/YGApwd
   */
  draw() {
    if (!this.lines[1] || !this.endpoints[1].row) {
      // The Word/WordClusters are not ready for drawing
      return;
    }

    /** @type {Word} */
    const leftAnchor = this.endpoints[0];
    /** @type {Word} */
    const rightAnchor = this.endpoints[1];

    const leftX = leftAnchor.x;
    const rightX = rightAnchor.x + rightAnchor.boxWidth;

    if (leftAnchor.row === rightAnchor.row) {
      // Draw in full curly brace between anchors
      const baseY = this.getBaseY(leftAnchor.row);
      const textY = baseY
        - this.config.wordTopTagPadding
        - this.svgText.bbox().height;

      const centre = (leftX + rightX) / 2;
      this.svgText.x(centre).y(textY);

      // Each arm consists of two curves with relatively tight control
      // points (to preserve the "hook-iness" of the curve).
      // The following x-/y- values are all relative.
      const armWidth = (rightX - leftX) / 2;
      const curveWidth = armWidth / 2;

      const curveControl = Math.min(curveWidth, this.config.linkCurveWidth);
      const curveY = -this.config.wordTopTagPadding / 2;

      // Left arm
      this.lines[0].plot(
        "M" + [leftX, baseY]
        + "c" + [0, curveY, curveControl, curveY, curveWidth, curveY]
        + "c" + [curveWidth - curveControl, 0, curveWidth, 0, curveWidth, curveY]
      );

      // Right arm
      this.lines[1].plot(
        "M" + [rightX, baseY]
        + "c" + [0, curveY, -curveControl, curveY, -curveWidth, curveY]
        + "c" + [-curveWidth + curveControl, 0, -curveWidth, 0, -curveWidth, curveY]
      );
    } else {
      // Extend curly brace to end of first Row, draw intervening rows,
      // finish on last Row
      const textY = leftAnchor.row.baseline
        - leftAnchor.boxHeight
        - this.svgText.bbox().height
        - this.config.wordTopTagPadding;
      let centre = (leftX + leftAnchor.row.rw) / 2;
      this.svgText.x(centre).y(textY);

      // Left arm
      const leftY = this.getBaseY(leftAnchor.row);
      const armWidth = (leftAnchor.row.rw - leftX) / 2;
      const curveWidth = armWidth / 2;

      const curveControl = Math.min(curveWidth, this.config.linkCurveWidth);
      const curveY = -this.config.wordTopTagPadding / 2;

      this.lines[0].plot(
        "M" + [leftX, leftY]
        + "c" + [0, curveY, curveControl, curveY, curveWidth, curveY]
        + "c" + [curveWidth - curveControl, 0, curveWidth, 0, curveWidth, curveY]
      );

      // Right arm, first Row
      let d = "";
      d += "M" + [leftAnchor.row.rw, leftY + curveY]
        + "c" + [-armWidth + curveControl, 0, -armWidth, 0, -armWidth, curveY];

      // Intervening rows
      for (let i = leftAnchor.row.idx + 1; i < rightAnchor.row.idx; i++) {
        const thisRow = this.main.rowManager.rows[i];
        const lineY = this.getBaseY(thisRow);
        d += "M" + [0, lineY + curveY]
          + "L" + [thisRow.rw, lineY + curveY];
      }

      // Last Row
      const rightY = this.getBaseY(rightAnchor.row);
      d += "M" + [rightX, rightY]
        + "c" + [0, curveY, -curveControl, curveY, -rightX, curveY];

      this.lines[1].plot(d);

      // // draw right side of brace extending to end of row and align text
      // let center = (-left + this.endpoints[0].row.rw) / 2 + 10;
      // this.x = center + lOffset;
      // this.svgText.x(center + lOffset);
      //
      // this.lines[0].plot("M" + lOffset
      //   + ",33c0,-10," + [center, 0, center, -8]
      //   + "c0,10," + [center, 0, center, 8]
      // );
      // this.lines[1].plot("M" + rOffset
      //   + ",33c0,-10," + [-right + 8, 0, -right + 8, -8]
      //   + "c0,10," + [-right + 8, 0, -right + 8, 8]
      // );
    }

    // propagate draw command to parent links
    this.links.forEach(l => l.draw(this));
  }

  /**
   * Calculates what the absolute y-value for the base of this cluster's curly
   * brace should be if it were drawn on the given Row
   * @param row
   */
  getBaseY(row) {
    // Use the taller of the endpoint's boxes as the base
    const wordHeight = Math.max(
      this.endpoints[0].boxHeight,
      this.endpoints[1].boxHeight
    );

    return row.baseline - wordHeight;
  }

  remove() {
    this.svgs.forEach(svg => svg.remove());
    this.words.forEach(word => {
      let i = word.clusters.indexOf(this);
      if (i > -1) {
        word.clusters.splice(i, 1);
      }
    });
  }

  listenForEdit() {
    this.isEditing = true;
    let bbox = this.svgText.bbox();

    this.svgs[0]
      .addClass("tag-element")
      .addClass("editing");
    this.editingRect = this.svgs[0].rect(bbox.width + 8, bbox.height + 4)
      .x(bbox.x - 4)
      .y(bbox.y - 2)
      .rx(2)
      .ry(2)
      .back();
  }

  stopEditing() {
    this.isEditing = false;
    this.svgs[0].removeClass("editing");
    this.editingRect.remove();
    this.editingRect = null;
    this.val = this.val.trim();
    if (!this.val) {
      this.remove();
    }
  }

  get endpoints() {
    return [
      this.words[0],
      this.words[this.words.length - 1]
    ];
  }

  get row() {
    return this.endpoints[0].row;
  }

  /**
   * Returns the absolute y-position of the top of the WordCluster's label
   * (for positioning Links that point at it)
   * @return {Number}
   */
  get absoluteY() {
    // The text label lives with the left arm of the curly brace
    const thisHeight = this.svgs[0].bbox().height;
    return this.endpoints[0].absoluteY - thisHeight;
  }

  get idx() {
    return this.endpoints[0].idx;
  }

  /**
   * Returns the x-position of the centre of this WordCluster's label
   * @return {*}
   */
  get cx() {
    return this.svgText.cx();
  }

  /**
   * Returns the width of the bounding box of the WordTag's SVG text element
   * @return {Number}
   */
  get textWidth() {
    return this.svgText.bbox().width;
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Debug functions
  /**
   * Draws the outline of this component's bounding box
   */
  drawBbox() {
    const bbox = this.svgs[0].bbox();
    this.svgs[0].polyline([
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
    this.svgs[0].polyline([
      [bbox.x, bbox.y], [bbox.x2, bbox.y], [bbox.x2, bbox.y2], [bbox.x, bbox.y2],
      [bbox.x, bbox.y]])
      .fill("none")
      .stroke({width: 1});
  }
}

module.exports = WordCluster;