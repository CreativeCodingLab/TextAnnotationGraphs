class WordCluster {
  constructor(words = [], val) {
    this.val = val;
    this.words = words;
    this.metaValue = words.map(w => {
      w.clusters.push(this);
      return w.val;
    }).join(' ');
    this.setEndpoints();

    // svgs:
    //   2 groups for left & right brace, containing:
    //   a path appended to each of the two groups
    //   a text label appended to the left group
    this.svgs = [];
    this.lines = [];
    this.svgText = null;
  }
  setTag(tag) {
    this.val = tag;
  }
  text(val) {
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
      }
      else {
        this.editingRect.width(10)
          .x(this.svgText.x() - 5);
      }
    }
  }
  setEndpoints() {
    this.endpoints = [
      this.words[0],
      this.words[this.words.length - 1]
    ];
  }

  /**
   * function init : draw path and attach it to svg of the parent word element
   * @param word
   */
  init(word) {
    let i = this.endpoints.indexOf(word);
    if (i === 0 || i === 1) {
      if (this.svgs[i]) {
        console.log('already exists u dumb fuck');  // TODO: handle this
      }
      else {
        let svg = this.svgs[i] = word.svg.group()
          .addClass('word-cluster');

        if (this.words.find(word => word.tag)) {
          svg.y(this.tagOffset * 1.9);
        }
        else {
          svg.y(this.tagOffset);
        }

        this.lines[i] = svg.path();
        if (i === 0) {
          this.svgText = svg.text(this.val);
          this.svgText.node.oncontextmenu = (e) => {
            e.preventDefault();
            word.mainSVG.fire('tag-right-click', { object: this, event: e });
          };
          this.svgText.click((e) => word.mainSVG.fire('tag-edit', { object: this }));
        }
      }
      this.draw();
    }
  }
  draw() {
    if (!this.lines[1]) { return; }
    let left = this.endpoints[0].x;
    let right = this.endpoints[1].x + this.endpoints[1].boxWidth;

    let lOffset = -this.endpoints[0].boxWidth / 2;
    let rOffset = this.endpoints[1].boxWidth / 2;

    let dblheight = this.svgs[0].y() !== this.tagOffset;

    if (this.endpoints[0].row === this.endpoints[1].row) {
      // draw left side of the brace and align text
      let center = (-left + right) / 2;
      this.svgText.x(center + lOffset);
      if (dblheight && !this.endpoints[0].tag) {
        this.lines[0].plot('M' + lOffset + ',59l0,-5c0,-34,' + [center,-21,center,-29]);
      }
      else {
        this.lines[0].plot('M' + lOffset + ',33c0,-10,' + [center,0,center,-8]);
      }

      // draw right side of the brace
      if (dblheight && !this.endpoints[1].tag) {
        this.lines[1].plot('M' + rOffset + ',59l0,-5c0,-34,' + [-center,-21,-center,-29]);
      }
      else {
        this.lines[1].plot('M' + rOffset + ',33c0,-10,' + [-center,0,-center,-8]);
      }
    }
    else {
      // draw right side of brace extending to end of row and align text
      let center = (-left + this.endpoints[0].row.rw) / 2 + 10;
      this.svgText.x(center + lOffset);

      if (dblheight && !this.endpoints[0].tag) {
        this.lines[0].plot('M' + lOffset + ',59l0,-5c0,-34,' + [center,-21,center,-29]);
        this.lines[0].plot('M' + lOffset
          + ',59l0,-5c0,-34,' + [center,-21,center,-29]
          + 'c0,10,' + [center,0,center,8]
        );
      }
      else {
        this.lines[0].plot('M' + lOffset
          + ',33c0,-10,' + [center,0,center,-8]
          + 'c0,10,' + [center,0,center,8]
        );
      }

      // draw right side of the brace on the next row

      if (dblheight && !this.endpoints[1].tag) {
        this.lines[1].plot('M' + rOffset
          + ',59l0,-5c0,-34,' + [-right + 8, -21, -right + 8, -29]
          + 'c0,10,' + [-right + 8, 0, -right + 8, 8]
        );
      }
      else {
        this.lines[1].plot('M' + rOffset
          + ',33c0,-10,' + [-right + 8, 0, -right + 8, -8]
          + 'c0,10,' + [-right + 8, 0, -right + 8, 8]
        );
      }
    }
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

    this.svgs[0].addClass('editing');
    this.editingRect = this.svgs[0].rect(bbox.width + 8, bbox.height + 4)
      .x(bbox.x - 4)
      .y(bbox.y - 2)
      .rx(2)
      .ry(2)
      .back();
  }
  stopEditing() {
    this.isEditing = false;
    this.svgs[0].removeClass('editing');
    this.editingRect.remove();
    this.editingRect = null;
    this.val = this.val.trim();
    if (!this.val) {
      this.remove();
    }
  }
  get ww() {
    return this.svgText.length();
  }
  get tagOffset() {
    return -28;
  }
}
