class Row {
  constructor(svg, idx = 0, ry = 0, rh = 100) {
    this.idx = idx;
    this.ry = ry;     // row position from top
    this.rh = rh;     // row height
    this.rw = 0;
    this.words = [];
    this.maxSlot = 0;

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
      .addClass('row');

    // group element to contain word elements
    this.wordGroup = this.svg.group()
      .y(this.rh);

    // set width
    this.rw = svg.width();

    // add draggable rectangle
    this.draggable = this.svg.line(0, 0, this.rw, 0)
      .y(this.rh)
      .addClass('row-drag')
      .draggable();

    let row = this;
    let y = 0;
    this.draggable
      .on('dragstart', function(e) { y = e.detail.p.y; })
      .on('dragmove', (e) => {
        e.preventDefault();
        let dy = e.detail.p.y - y;
        y = e.detail.p.y;
        svg.fire('row-resize', { object: this, y: dy });
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
    this.draggable.attr('x2', this.rw);
  }

  addWord(word, i, ignorePosition) {
    if (isNaN(i)) { i = this.words.length; }

    word.row = this;
    this.words.splice(i,0,word);
    this.wordGroup.add(word.svg);

    if (!ignorePosition) {
      return this.moveWordRight(word);
    }
  }

  moveWordRight(word, x) {
    const EDGE_PADDING = 10;
    const WORD_PADDING = 5;

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
        return;
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
  calculateMaxSlot() {
    // get max slot
    function fn(acc, anchor) {
      if (anchor.links.length === 0) {
        return Math.max(acc, anchor.slot);
      }
      return anchor.links.reduce(fn, 0);
    }
    this.maxSlot = this.words.reduce(fn, 0);
  }
  calculateMinSlot() {
    function fn(acc, anchor) {
      if (anchor.links.length === 0) {
        return Math.min(acc, anchor.slot);
      }
      return anchor.links.reduce(fn, 0);
    }
    this.minSlot = this.words.reduce(fn, 0);
  }

  get ry2() { return this.ry + this.rh; }
  get minHeight() {
    return this.wordGroup.bbox().height + this.maxSlot * 15 + 15;
  }
}
