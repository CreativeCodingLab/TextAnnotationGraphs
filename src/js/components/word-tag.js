/**
 * Tags for single entities/tokens
 *
 *   [WordTag] / WordCluster -> Word -> Row
 */

class WordTag {
  /**
   * Creates a new WordTag instance
   * @param {String} val - The raw text for this WordTag
   * @param {Word} word - The parent Word for this WordTag
   * @param {Config} config - The Config object for the parent TAG instance
   * @param {Boolean} top - True if this WordTag should be drawn above the
   *     parent Word, false if it should be drawn below
   */
  constructor(val, word, config, top = true) {
    this.val = val;
    this.word = word;
    this.config = config;
    this.top = top;

    if (!word.svg) {
      throw "Error: Trying to initialise WordTag on Word without SVG" +
      " element";
    }

    this.draw();
  }

  /**
   * (Re-)draws this WordTag's SVG elements onto the visualisation
   */
  draw() {
    if (this.svg){
      // Delete remnants of any previous draw
      this.remove();
    }

    // Prepare our SVG elements as a group within the Word's SVG element
    this.svg = this.word.svg.group();

    // Draw in the SVG text element.
    // Note that applying classes to the text element may change its font
    // size, and if its font size changes, the anchor point for the resizing
    // is the text's baseline (not any of the bounding box sides).
    // N.B.: Typographical baselines ignore descenders
    this.svgText = this.svg.text(this.val)
      .addClass("tag-element")
      .addClass(this.top ? "word-tag" : "word-tag syntax-tag")
      .leading(1);

    // Centre the WordTag horizontally
    // (SVG text elements are positioned by their centres)
    this.svgText.x(this.word.svgText.x());

    // Position this WordTag above/below the main Word
    // (It starts with its upper-left corner on the Row's main line)
    let newY;
    if (this.top) {
      newY = -this.word.svgText.bbox().height - this.svgText.bbox().height
        - this.config.wordTopTagPadding;
    } else {
      newY = this.config.wordBottomTagPadding;
    }
    this.svgText.y(newY);

    this.ww = this.svgText.length();

    // add click and right-click listeners
    let mainSvg = this.word.mainSvg;
    this.svgText.node.oncontextmenu = (e) => {
      e.preventDefault();
      mainSvg.fire("tag-right-click", {object: this, event: e});
    };
    this.svgText.click((e) => mainSvg.fire("tag-edit", {object: this}));

    // Draws a line / curly bracket between the Word and this WordTag, if
    // it's a top tag
    this.line = this.svg.path();
    this.drawTagLine();
  }

  /**
   * Removes this WordTag's SVG elements from the visualisation
   * If this instance is not deleted, it can be redrawn with the `.draw()`
   * method
   * @return {*}
   */
  remove() {
    this.svg.remove();
    this.svg = null;
  }

  /**
   * Draws a connecting line between this WordTag and its parent Word, if
   * this is a top WordTag.
   */
  drawTagLine() {
    if (!this.top) {
      return;
    }

    const wordWidth = this.word.textWidth;

    if (wordWidth < this.config.wordBraceThreshold) {
      // Draw a single vertical line
      this.line.plot("M 0,0, 0," + this.config.wordTagLineLength);
    } else {
      // Draw a curly brace
      const height = this.config.wordTagLineLength;
      const arm = wordWidth / 2;
      this.line.plot(
        "M0,0" +
        "c" + [0, height, arm, 0, arm, height] +
        "M0,0" +
        "c" + [0, height, -arm, 0, -arm, height]
      );
    }

    // Centre the line between the Word and WordTag
    this.line.cx(this.svgText.cx());
    this.line.cy((this.svgText.bbox().y2 + this.word.svgText.bbox().y) / 2);
  }


  /**
   * Sets the text of this WordTag, or returns this WordTag's SVG text element
   * @param val
   * @return {*}
   */
  text(val) {
    if (val === undefined) {
      return this.svgText;
    }
    this.val = val;
    this.svgText.text(this.val);
    this.ww = this.svgText.length();
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
          .x(-5);
      }
    }
  }

  /**
   * Returns the width of the bounding box for this WordTag
   */
  boxWidth() {
    return this.svg.bbox().width;
  }

  /**
   * Returns the width of the bounding box of the WordTag's SVG text element
   * @return {Number}
   */
  get textWidth() {
    return this.svgText.bbox().width;
  }

  changeEntity(word) {
    if (this.word) {
      this.word.tag = null;
    }

    this.word = word;
    this.word.tag = this;
    this.word.svg.add(this.svg);
  }

  listenForEdit() {
    this.isEditing = true;
    let bbox = this.svgText.bbox();

    this.svg
      .addClass("tag-element")
      .addClass("editing");
    this.editingRect = this.svg.rect(bbox.width + 8, bbox.height + 4)
      .x(bbox.x - 4)
      .y(bbox.y - 2)
      .rx(2)
      .ry(2)
      .back();
  }

  stopEditing() {
    this.isEditing = false;
    this.svg.removeClass("editing");
    this.editingRect.remove();
    this.editingRect = null;
    this.val = this.val.trim();
    if (!this.val) {
      this.remove();
    } else {
      this.word.alignBox();
    }
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

module.exports = WordTag;