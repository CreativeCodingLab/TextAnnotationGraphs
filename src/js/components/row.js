import * as SVG from "svg.js";
import * as draggable from "svg.draggable.js";

class Row {
  constructor(svg, config, idx = 0, ry = 0, rh = 120) {
    this.config = config;

    this.idx = idx;
    this.ry = ry;     // row position from top
    this.rh = rh;     // row height
    this.rw = 0;
    this.words = [];
    this.maxSlot = 0;
    this.minSlot = 0;

    // svg elements
    this.svg = null;    // group
    this.draggable = null;  // row resizer
    this.wordGroup = null;  // child group element

    if (svg) {
      this.init(svg);
    }
  }

  init(svg) {
    this.svg = svg.group()
      .transform({y: this.ry})
      .addClass("tag-element")
      .addClass("row");

    // group element to contain word elements
    this.wordGroup = this.svg.group()
      .y(this.rh);

    // set width
    this.rw = svg.width();

    // add draggable rectangle
    this.draggable = this.svg.line(0, 0, this.rw, 0)
      .y(this.rh)
      .addClass("tag-element")
      .addClass("row-drag")
      .draggable();

    let row = this;
    let y = 0;
    this.draggable
      .on("dragstart", function (e) {
        y = e.detail.p.y;
      })
      .on("dragmove", (e) => {
        e.preventDefault();
        let dy = e.detail.p.y - y;
        y = e.detail.p.y;
        svg.fire("row-resize", {object: this, y: dy});
      });
  }

  remove() {
    return this.svg.remove();
  }

  dy(y) {
    this.ry += y;
    this.svg.transform({y: this.ry});
  }

  move(y) {
    this.ry = y;
    this.svg.transform({y: this.ry});
  }

  height(rh) {
    this.rh = rh;
    this.wordGroup.y(this.rh);
    this.draggable.y(this.rh);
  }

  width(rw) {
    this.rw = rw;
    this.draggable.attr("x2", this.rw);
  }

  /**
   * Adds the given Word to this Row at the given index, adjusting the
   * x-positions of any Words with higher indices.
   * Optionally, attempts to force an x-position for the Word.
   * If adding the Word to the Row causes any existing Words to overflow its
   * bounds, will return the index of the first Word that no longer fits.
   * @param word
   * @param index
   * @param forceX
   * @return {number} - The index of the first Word that no longer fits, if
   *     the additional Word causes overflow
   */
  addWord(word, index, forceX) {
    if (isNaN(index)) {
      index = this.words.length;
    }

    word.row = this;
    this.words.splice(index, 0, word);
    this.wordGroup.add(word.svg);

    // Determine the new x-position this Word should have.
    word.x = -1;
    let newX;
    if (index === 0) {
      newX = this.config.rowEdgePadding;
    } else {
      const prevWord = this.words[index - 1];
      newX = prevWord.x + prevWord.boxWidth;
      if (word.isPunct) {
        newX += this.config.wordPunctPadding;
      } else {
        newX += this.config.wordPadding;
      }
    }

    if (forceX) {
      newX = forceX;
    }

    return this.positionWord(word, newX);

  }

  /**
   * Assumes that the given Word is already on this Row.
   * Tries to move the Word to the given x-position, adjusting the
   * x-positions of all the following Words on the Row as well.
   * If this ends up pushing some Words off the Row, returns the index of
   * the first Word that no longer fits.
   * @param word
   * @param newX
   * @return {number} - The index of the first Word that no longer fits, if
   *     the additional Word causes overflow
   */
  positionWord(word, newX) {
    const wordIndex = this.words.indexOf(word);
    const prevWord = this.words[wordIndex - 1];
    const nextWord = this.words[wordIndex + 1];

    // By default, assume that no Words have overflowed the Row
    let overflowIndex = this.words.length;

    // Make sure we aren't stomping over a previous Word
    if (prevWord) {
      const wordPadding = word.isPunct
        ? this.config.wordPunctPadding
        : this.config.wordPadding;

      if (newX < prevWord.x + prevWord.boxWidth + wordPadding) {
        throw `Trying to position new Word over existing one!
        (Row: ${this.idx}, wordIndex: ${wordIndex})`;
      }
    }

    // Change the position of the next Word if we have to;
    if (nextWord) {
      const nextWordPadding = nextWord.isPunct
        ? this.config.wordPunctPadding
        : this.config.wordPadding;

      if (nextWord.x - nextWordPadding < newX + word.boxWidth) {
        overflowIndex = this.positionWord(
          nextWord,
          newX + word.boxWidth + nextWordPadding
        );
      }
    }

    // We have moved the next Word on the Row, or marked it as part of the
    // overflow; at this point, we either have space to move this Word, or
    // this Word itself is about to overflow the Row.
    if (newX + word.boxWidth > this.rw - this.config.rowEdgePadding) {
      // Alas.  The overflowIndex is ours.
      return wordIndex;
    } else {
      // We can move.  If any of the Words that follow us overflowed, return
      // their index.
      word.move(newX);
      return overflowIndex;
    }
  }

  /**
   * Assumes that the given Word is already on this Row.
   * Tries to move the Word to the given x-position, adjusting the
   * x-positions of all the following Words on the Row as well.
   * If this ends up pushing some Words off the Row, returns the index of
   * the first word that needs to be kicked down to the next Row.
   * @param word
   * @param x
   * @return {number} [idx]
   */
  deprecateMoveWordRight(word, x) {
    const EDGE_PADDING = this.config.rowEdgePadding;
    const WORD_PADDING = this.config.wordPadding;

    let i = this.words.indexOf(word);
    let prevWord = this.words[i - 1];
    if (x) {
      x = Math.min(this.rw, x);
      if (x + word.boxWidth > this.rw - EDGE_PADDING) {
        return i;
      }
      word.move(x);
      ++i;
      prevWord = word;
    }
    else if (!prevWord) {
      word.move(EDGE_PADDING);
      ++i;
      prevWord = word;
    }
    while (i < this.words.length) {
      let word = this.words[i];
      let dx = prevWord.x + prevWord.boxWidth + (word.isPunct ? 0 : WORD_PADDING);
      if (word.x > dx) {
        // prevWord fits in space before next word; return
        return this.words.length;
      }
      // move next word over
      if (dx + word.boxWidth > this.rw - EDGE_PADDING) {
        return i;
      }
      word.move(dx);
      prevWord = this.words[i];
      ++i;
    }
  }

  removeWord(word) {
    this.words.splice(this.words.indexOf(word), 1);
    this.wordGroup.removeElement(word.svg);
    return word;
  }

  removeLastWord() {
    const word = this.words.pop();
    this.wordGroup.removeElement(word.svg);
    return word;
  }

  removeFirstWord() {
    const word = this.words.shift();
    this.wordGroup.removeElement(word.svg);
    return word;
  }

  /**
   * Returns true if the given point is within the bounds of this row
   * @param x
   * @param y
   */
  contains(x, y) {
    return x <= this.rw && y >= this.ry && y <= this.ry2;
  }

  /**
   * Returns the lower bound of the Row on the y-axis, excluding padding
   * @return {number}
   */
  get ry2() {
    return this.ry + this.rh + 20 - this.minSlot * 15;
  }

  get minHeight() {
    return 60 + this.maxSlot * 15;
  }

  /**
   * Returns the amount of space available at the end of this Row for adding
   * new Words
   */
  get availableSpace() {
    if (this.words.length === 0) {
      return this.rw - this.config.rowEdgePadding * 2;
    }

    const lastWord = this.words[this.words.length - 1];
    return this.rw - this.config.rowEdgePadding - lastWord.x - lastWord.boxWidth;
  }
}

module.exports = Row;