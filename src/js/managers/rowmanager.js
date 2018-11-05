import Row from '../components/row.js';
import Link from '../components/link.js';

module.exports = (function() {
  const ROW_PADDING = 10;
  const _rows = [];
  let _svg;
  class RowManager {
    constructor(svg) {
      _svg = svg;
    }

    resizeAll() {
      this.width(_svg.width());

      _rows.forEach(row => {
        this.recalculateRowSlots(row);
      });
      this.resizeRow(0);
    }

    resizeRow(i, dy = 0) {
      const row = _rows[i];
      if (row === undefined) return;
      if (i > 0) {
        let adjust = _rows[i - 1].ry2 + ROW_PADDING - row.ry;
        row.move(row.ry + adjust);
        row.height(row.rh - adjust);
      }
      dy = Math.max(-row.rh + row.minHeight, dy);
      row.height(row.rh + dy);
      row.words.forEach(word => word.redrawLinks());
      for (let j = i + 1; j < _rows.length; ++j) {
        if (_rows[j - 1].ry2 + ROW_PADDING > _rows[j].ry + dy) {
          _rows[j].move(_rows[j - 1].ry2 + ROW_PADDING);
        }
        else {
          _rows[j].dy(dy);
        }
        _rows[j].words.forEach(word => word.redrawLinks());
      }
      _svg.height(this.lastRow.ry2 + ROW_PADDING + 20);
    }

    width(rw) {
      _rows.forEach(row => {
        row.width(rw);

        let i = row.words.findIndex(w => w.x > rw);
        if (i > 0) {
          this.moveWordOnRow(row.words[i - 1], 0);
        }
        else {
          row.words.forEach(word => {
            word.links.forEach(function(l) {
              if (l.endpoints[1].row !== l.endpoints[0].row) {
                l.draw(this);
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
      const row = !lr ? new Row(_svg) : new Row(_svg, lr.idx + 1, lr.ry2 + ROW_PADDING);
      _rows.push(row);
      _svg.height(row.ry2 + ROW_PADDING + 20);
      return row;
    }

    /**
     * remove last row at the bottom of the svg and resize to match
     */
    removeRow() {
      _rows.pop().remove();
      if (this.lastRow) {
        _svg.height(this.lastRow.ry2 + ROW_PADDING + 20);
      }
    }

    addWordToRow(word, row, i, ignorePosition) {
      if (isNaN(i)) { i = row.words.length; }

      // get word slots
      let slots = this.getSlotRange([0,0], word);
      if (word.row && word.row !== row && (slots[0] === word.row.minSlot || word.row.maxSlot === slots[1])) {
        this.recalculateRowSlots(word.row);
      }
      if (row.minSlot > slots[0] || row.maxSlot < slots[1]) {
        if (row.minSlot > slots[0]) { row.minSlot = slots[0]; }
        if (row.maxSlot < slots[1]) { row.maxSlot = slots[1]; }
        this.resizeRow(row.idx);
      }

      let overflow = row.addWord(word, i, ignorePosition);
      while (overflow < row.words.length) {
        this.moveWordDownARow(row.idx);
      }
    }

    moveWordOnRow(word, dx) {
      let row = word.row;
      if (!row) { return; }
      if (dx >= 0) {
        this.moveWordRight(row, dx, word);
      }
      else if (dx < 0) {
        this.moveWordLeft(row, -dx, row.words.indexOf(word));
      }
    }

    /**
     * recursive function that moves word right and, if it runs out
     * of space, moves all other words right or to the next row as needed
     */
   moveWordRight(row, dx, word) {
     let overflow = row.moveWordRight(word, dx + word.x);
     while (overflow < row.words.length) {
       this.moveWordDownARow(row.idx);
     }
   }

    /**
     * recursive function that checks for room to move word left and, if
     * there is space, performs the transformation in the tail
     */
    moveWordLeft(row, dx, i, overflow) {
      if (!row) { return false; }
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
          fitsOnRow = this.moveWordLeft(_rows[row.idx - 1], null, null, words.slice(0, j + 1));
          break;
        }
        if (words[j].isPunct === false) {
          x -= WORD_PADDING;
        }
        --j;
      }

      // end head recursion
      if (!fitsOnRow) { return false; }

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
      }
      else {
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
        if (row.words.length === 0 && row.idx === _rows.length - 1) {
          this.removeRow();
        }
      }

      return true;
    }

    moveWordUpARow(index) {
      if (!_rows[index - 1]) { return; }
      let removedWord = _rows[index].removeFirstWord();
      this.addWordToRow(removedWord, _rows[index - 1], undefined, true);
      removedWord.redrawClusters();
      removedWord.redrawLinks();
    }

    moveWordDownARow(index) {
      let nextRow = _rows[index + 1] || this.appendRow();
      this.addWordToRow(_rows[index].removeLastWord(), nextRow, 0);
    }

    getSlotRange(acc, anchor) {
      if (anchor instanceof Link && !anchor.visible) { return [acc[0], acc[1]]; }
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

    get lastRow() { return _rows[_rows.length - 1]; }
    get rows() { return _rows; }
  }
  return RowManager;
})();
