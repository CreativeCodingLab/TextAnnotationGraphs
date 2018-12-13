import Row from "../components/row.js";

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
    this.resizeRow(0);
  }

  /**
   * Attempts to adjust the height of the Row with index `i` by the specified
   * `dy`.  If successful, also adjusts the positions of all the Rows that
   * follow it accordingly.
   *
   * If called without a `dy`, simply ensures that the Row's height is at
   * least as large as its minimum height.
   * (Row descents are fixed and vary according to their bottom Links)
   */
  resizeRow(i, dy = 0) {
    const row = this._rows[i];
    if (row === undefined) return;

    // Adjust height for the main Row
    // (Row descent is fixed, and depends on the number of bottom Links in
    // the Row)
    const newHeight = Math.max(row.rh + dy, row.minHeight);
    if (row.rh !== newHeight) {
      row.height(newHeight);
      // console.log("--------");
      const drawStart = performance.now();
      row.redrawLinks();
      // console.log(`Redrew links in ${performance.now() - drawStart}ms.`);
    }

    // Adjust the positions of all following Rows
    for (i = i + 1; i < this._rows.length; i++) {
      const prevRow = this._rows[i - 1];
      const thisRow = this._rows[i];
      if (thisRow.ry !== prevRow.ry2) {
        thisRow.move(prevRow.ry2);
        thisRow.redrawLinks();
      }
    }

    this._svg.height(this.lastRow.ry2 + 20);
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
          this.moveLastWordDown(row.idx);
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
   * Adds a new Row to the bottom of the svg and sets the height of the main
   * document to match
   */
  appendRow() {
    const lr = this.lastRow;
    const row = !lr
      ? new Row(this._svg, this.config)
      : new Row(this._svg, this.config, lr.idx + 1, lr.ry2);
    this._rows.push(row);
    this._svg.height(row.ry2 + 20);
    return row;
  }

  /**
   * remove last row at the bottom of the svg and resize to match
   */
  removeLastRow() {
    this._rows.pop().remove();
    if (this.lastRow) {
      this._svg.height(this.lastRow.ry2 + 20);
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

    // // See if this Word has Links which occupy higher/lower slots than the
    // // existing Words on the Row.
    // let minSlot = 0;
    // let maxSlot = 0;
    // for (const link of word.links) {
    //   minSlot = Math.min(minSlot, link.slot);
    //   maxSlot = Math.max(maxSlot, link.slot);
    // }
    // if (minSlot < row.minSlot || maxSlot > row.maxSlot) {
    //   this.resizeRow(row.idx);
    // }

    let overflow = row.addWord(word, i, forceX);
    while (overflow < row.words.length) {
      this.moveLastWordDown(row.idx);
    }

    // Now that the Words are settled, make sure that the Row is high enough
    // (in case it started too short) and has enough descent space, if there
    // are Rows following.
    this.resizeRow(row.idx);
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
    } else if (dx < 0) {
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
      this.moveLastWordDown(row.idx);
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
        this.moveFirstWordUp(row.idx);
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
        this.moveFirstWordUp(row.idx);
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
  moveFirstWordUp(index) {
    const row = this._rows[index];
    const prevRow = this._rows[index - 1];
    if (!row || !prevRow) {
      return;
    }

    const word = row.words[0];
    const newX = prevRow.rw - this.config.rowEdgePadding - word.boxWidth;

    row.removeWord(word);
    this.addWordToRow(word, prevRow, undefined, newX);

    word.redrawClusters();
    word.redrawLinks();

    if (row === this.lastRow && row.words.length === 0) {
      this.removeLastRow();
    }
  }

  /**
   * Move the last Word on the Row with the given index down to the start of
   * the next Row
   * @param index
   */
  moveLastWordDown(index) {
    let nextRow = this._rows[index + 1] || this.appendRow();
    this.addWordToRow(this._rows[index].removeLastWord(), nextRow, 0);
  }

  //
  // getSlotRange(acc, anchor) {
  //   if (anchor instanceof Link && !anchor.visible) {
  //     return [acc[0], acc[1]];
  //   }
  //   if (anchor.links.length === 0) {
  //     return [Math.min(acc[0], 0), Math.max(acc[1], 0)];
  //     // return [Math.min(acc[0], anchor.slot), Math.max(acc[1],
  // anchor.slot)]; } let a = anchor.links.reduce((acc, val) =>
  // this.getSlotRange(acc, val), [0, 0]); return [Math.min(acc[0], a[0]),
  // Math.max(acc[1], a[1])]; }  recalculateRowSlots(row) { [row.minSlot,
  // row.maxSlot] = row.words .reduce((acc, val) => this.getSlotRange(acc,
  // val), [0, 0]); }

  /**
   * Returns the last Row managed by the RowManager
   * @return {*}
   */
  get lastRow() {
    return this._rows[this._rows.length - 1];
  }

  /**
   * Returns the RowManager's internal Row array
   * @return {Array}
   */
  get rows() {
    return this._rows;
  }
}

module.exports = RowManager;