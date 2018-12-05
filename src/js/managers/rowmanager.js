import Row from "../components/row.js";
import Link from "../components/link.js";

const ROW_PADDING = 10;

class RowManager {
  /**
   * Instantiate a RowManager for some TAG instance
   * @param svg - The svg.js API object for the current TAG instance
   * @param config - The Config object for the instance
   */
  constructor(svg, config) {
    this.config = config;
    this._svg = svg;
    this._rows = [];
  }

  /**
   * Resizes all the Rows in the visualisation
   */
  resizeAll() {
    this.width(this._svg.width());

    this._rows.forEach(row => {
      this.recalculateRowSlots(row);
    });
    this.resizeRow(0);
  }

  /**
   * Resizes *all* rows starting from the one with index `i`
   */
  resizeRow(i, dy = 0) {
    const row = this._rows[i];
    if (row === undefined) return;
    if (i > 0) {
      let adjust = this._rows[i - 1].ry2 + ROW_PADDING - row.ry;
      row.move(row.ry + adjust);
      row.height(row.rh - adjust);
    }
    dy = Math.max(-row.rh + row.minHeight, dy);
    row.height(row.rh + dy);
    row.words.forEach(word => word.redrawLinks());

    for (let j = i + 1; j < this._rows.length; ++j) {
      if (this._rows[j - 1].ry2 + ROW_PADDING > this._rows[j].ry + dy) {
        this._rows[j].move(this._rows[j - 1].ry2 + ROW_PADDING);
      }
      else {
        this._rows[j].dy(dy);
      }
      this._rows[j].words.forEach(word => word.redrawLinks());
    }
    this._svg.height(this.lastRow.ry2 + ROW_PADDING + 20);
  }


  /**
   * Sets the width of all the Rows in the visualisation
   * @param {Number} rw - The new Row width
   */
  width(rw) {
    this._rows.forEach(row => {
      row.width(rw);

      // Find any Words that no longer fit on the Row
      let i = row.words
        .findIndex(w => w.x + w.boxWidth > rw - this.config.rowEdgePadding);
      if (i > 0) {
        while (i < row.words.length) {
          this.moveWordDownARow(row.idx);
        }
      } else {
        // Redraw Words/Links that might have changed
        row.words.forEach(word => {
          word.links.forEach(function (l) {
            if (l.endpoints[1].row !== l.endpoints[0].row) {
              l.draw(word);
            }
          });
          word.redrawClusters();
        });
      }
    });
  }

  /**
   * add a new row to the bottom of the svg and resize to match
   */
  appendRow() {
    const lr = this.lastRow;
    const row = !lr
      ? new Row(this._svg, this.config)
      : new Row(this._svg, this.config, lr.idx + 1, lr.ry2 + ROW_PADDING);
    this._rows.push(row);
    this._svg.height(row.ry2 + ROW_PADDING + 20);
    return row;
  }

  /**
   * remove last row at the bottom of the svg and resize to match
   */
  removeRow() {
    this._rows.pop().remove();
    if (this.lastRow) {
      this._svg.height(this.lastRow.ry2 + ROW_PADDING + 20);
    }
  }

  /**
   * Adds the given Word to the given Row at the given index.
   * Optionally attempts to force an x-position for the Word, which will also
   * adjust the x-positions of any Words with higher indices on this Row.
   * @param word
   * @param row
   * @param i
   * @param forceX
   */
  addWordToRow(word, row, i, forceX) {
    if (isNaN(i)) {
      i = row.words.length;
    }

    // get word slots
    let slots = this.getSlotRange([0, 0], word);
    if (word.row && word.row !== row && (slots[0] === word.row.minSlot || word.row.maxSlot === slots[1])) {
      this.recalculateRowSlots(word.row);
    }
    if (row.minSlot > slots[0] || row.maxSlot < slots[1]) {
      if (row.minSlot > slots[0]) {
        row.minSlot = slots[0];
      }
      if (row.maxSlot < slots[1]) {
        row.maxSlot = slots[1];
      }
      this.resizeRow(row.idx);
    }

    let overflow = row.addWord(word, i, forceX);
    while (overflow < row.words.length) {
      this.moveWordDownARow(row.idx);
    }
  }

  moveWordOnRow(word, dx) {
    let row = word.row;
    if (!row) {
      return;
    }
    if (dx >= 0) {
      this.moveWordRight({
        row,
        wordIndex: row.words.indexOf(word),
        dx
      });
    }
    else if (dx < 0) {
      // this.moveWordLeft(row, -dx, row.words.indexOf(word));
      dx = -dx;
      this.moveWordLeft({
        row,
        wordIndex: row.words.indexOf(word),
        dx
      });
    }
  }

  /**
   * Recursively attempts to move the Word at the given index on the given
   * Row rightwards. If it runs out of space, moves all other Words right or
   * to the next Row as needed.
   * @param {Row} params.row
   * @param {Number} params.wordIndex
   * @param {Number} params.dx - A positive number specifying how far to the
   *     right we should move the Word
   */
  moveWordRight(params) {
    const row = params.row;
    const wordIndex = params.wordIndex;
    const dx = params.dx;

    const word = row.words[wordIndex];
    const nextWord = row.words[wordIndex + 1];

    // First, check if we have space available directly next to this word.
    let rightEdge;
    if (nextWord) {
      rightEdge = nextWord.x;
      rightEdge -= nextWord.isPunct
        ? this.config.wordPunctPadding
        : this.config.wordPadding;
    } else {
      rightEdge = row.rw - this.config.rowEdgePadding;
    }
    const space = rightEdge - (word.x + word.boxWidth);

    if (dx <= space) {
      word.dx(dx);
      return;
    }

    // No space directly available; recursively move the following Words.
    if (!nextWord) {
      // Last word on this row
      this.moveWordDownARow(row.idx);
    } else {
      this.moveWordRight({
        row,
        wordIndex: wordIndex + 1,
        dx
      });
      word.dx(dx);
    }
  }

  /**
   * Recursively attempts to move the Word at the given index on the given
   * Row leftwards. If it runs out of space, tries to move preceding Words
   * leftwards or to the previous Row as needed.
   * @param {Row} params.row
   * @param {Number} params.wordIndex
   * @param {Number} params.dx - A positive number specifying how far to the
   *     left we should try to move the Word
   * @return {Boolean} True if the Word was successfully moved
   */
  moveWordLeft(params) {
    const row = params.row;
    const wordIndex = params.wordIndex;
    const dx = params.dx;

    const word = row.words[wordIndex];
    const prevWord = row.words[wordIndex - 1];

    const leftPadding = word.isPunct
      ? this.config.wordPunctPadding
      : this.config.wordPadding;

    // First, check if we have space available directly next to this word.
    let space = word.x;
    if (prevWord) {
      space -= prevWord.x + prevWord.boxWidth + leftPadding;
    } else {
      space -= this.config.rowEdgePadding;
    }
    if (dx <= space) {
      word.dx(-dx);
      return true;
    }

    // No space directly available; try to recursively move the preceding Words.

    // If this is the first Word on this Row, try fitting it on the
    // previous Row, or getting the Words on the previous Row to shift.
    if (wordIndex === 0) {
      const prevRow = this._rows[row.idx - 1];
      if (!prevRow) {
        return false;
      }

      // Fits on the previous Row?
      if (prevRow.availableSpace >= word.boxWidth + leftPadding) {
        this.moveWordUpARow(row.idx);
        return true;
      }

      // Can we shift the Words on the previous Row?
      const prevRowShift =
        word.boxWidth + leftPadding - prevRow.availableSpace;
      const canMove = this.moveWordLeft({
        row: prevRow,
        wordIndex: prevRow.words.length - 1,
        dx: prevRowShift
      });

      if (canMove) {
        // Pop this word up to the previous row
        this.moveWordUpARow(row.idx);
        return true;
      } else {
        // No can do
        return false;
      }
    }

    // Not the first Word; try getting the preceding Words on this Row to shift.
    const canMove = this.moveWordLeft({
      row,
      wordIndex: wordIndex - 1,
      dx
    });
    if (canMove) {
      word.dx(-dx);
      return true;
    } else {
      // Ah well
      return false;
    }
  }

  /**
   * Move the first Word on the Row with the given index up to the end
   * of the previous Row
   * @param index
   */
  moveWordUpARow(index) {
    const prevRow = this._rows[index - 1];
    if (!prevRow) {
      return;
    }

    let removedWord = this._rows[index].removeFirstWord();
    const newX = prevRow.rw - this.config.rowEdgePadding - removedWord.boxWidth;

    this.addWordToRow(removedWord, prevRow, undefined, newX);
    removedWord.redrawClusters();
    removedWord.redrawLinks();
  }

  /**
   * Move the last Word on the Row with the given index down to the start of
   * the next Row
   * @param index
   */
  moveWordDownARow(index) {
    let nextRow = this._rows[index + 1] || this.appendRow();
    this.addWordToRow(this._rows[index].removeLastWord(), nextRow, 0);
  }

  getSlotRange(acc, anchor) {
    if (anchor instanceof Link && !anchor.visible) {
      return [acc[0], acc[1]];
    }
    if (anchor.links.length === 0) {
      return [Math.min(acc[0], anchor.slot), Math.max(acc[1], anchor.slot)];
    }
    let a = anchor.links.reduce((acc, val) => this.getSlotRange(acc, val), [0, 0]);
    return [Math.min(acc[0], a[0]), Math.max(acc[1], a[1])];
  }

  recalculateRowSlots(row) {
    [row.minSlot, row.maxSlot] = row.words
      .reduce((acc, val) => this.getSlotRange(acc, val), [0, 0]);
  }

  /**
   * Return the Row that the given point would be contained in, if any
   * @param x
   * @param y
   */
  whichRow(x, y) {
    return this._rows.find(row => row.contains(x, y));
  }

  get lastRow() {
    return this._rows[this._rows.length - 1];
  }

  get rows() {
    return this._rows;
  }
}

module.exports = RowManager;

// --------------
// Deprecated

/**
 * recursive function that checks for room to move word left and, if
 * there is space, performs the transformation in the tail
 */
function moveWordLeft(row, dx, i, overflow) {
  if (!row) {
    return false;
  }
  const EDGE_PADDING = 10;
  const WORD_PADDING = 5;
  let fitsOnRow = true;       // recursive flag

  // position to place words[i]
  let x;  // remaining space to move words into
  let j = i;  // index at which words overflow to next row
  let finalRow; // flag if recursion ends inside this call
  let words = overflow ? row.words.concat(overflow) : row.words;
  if (overflow || !words[i]) {
    x = row.rw - EDGE_PADDING;
    j = i = words.length - 1;
    let lastWord = row.words[row.words.length - 1];
    dx = (lastWord ? lastWord.x + lastWord.boxWidth : 0) - x;
  }
  else {
    x = words[i].x + words[i].boxWidth - dx;
  }

  while (j >= 0) {
    let wordToCheck = words[j];
    x -= words[j].boxWidth;
    if (j < row.words.length && x >= words[j].x) {  // short-circuit: success
      finalRow = true;
      break;
    }
    if (x < EDGE_PADDING) {
      // doesn't fit on row
      fitsOnRow = this.moveWordLeft(this._rows[row.idx - 1], null, null, words.slice(0, j + 1));
      break;
    }
    if (words[j].isPunct === false) {
      x -= WORD_PADDING;
    }
    --j;
  }

  // end head recursion
  if (!fitsOnRow) {
    return false;
  }

  // if recursion turned out ok, apply transformation
  if (overflow) {
    x = row.rw - EDGE_PADDING;
    while (i > j) {
      x -= words[i].boxWidth;
      words[i].move(x);
      if (!words[i].isPunct) {
        x -= WORD_PADDING;
      }
      --i;
    }
  } else {
    while (i > j) {
      words[i] && words[i].dx(-dx);
      --i;
    }
  }

  if (!finalRow) {
    while (j >= 0) {
      this.moveWordUpARow(row.idx);
      --j;
    }
    if (row.words.length === 0 && row.idx === this._rows.length - 1) {
      this.removeRow();
    }
  }

  return true;
}