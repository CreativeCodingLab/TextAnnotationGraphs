/**
 * Tags for cases where multiple words make up a single entity
 * E.g.: The two words "DNA damage" as a single "BioProcess"
 *
 *   Word -> WordTag / [WordCluster] -> Row
 */

class WordCluster {
  constructor(words = [], val) {
    this.eventIds = [];
    this.val = val;
    this.words = words;
    this.slot = words.reduce((acc, w) => Math.max(acc, w.slot), 0);
    this.metaValue = words.map(w => {
      w.clusters.push(this);
      return w.val;
    }).join(' ');
    this.setEndpoints();
    this.links = [];

    // svgs:
    //   2 groups for left & right brace, containing:
    //   a path appended to each of the two groups
    //   a text label appended to the left group
    this.svgs = [];
    this.lines = [];
    this.svgText = null;
    this.x = 0;       // x position of text
  }
  addEventId(id) {
    if (this.eventIds.indexOf(id) < 0) {
      this.eventIds.push(id);
    }
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
          .addClass("tag-element")
          .addClass('word-cluster');

        // TODO: recalculate offset when tag is added/removed
        if (this.words.find(word => word.tag)) {
          svg.y(this.tagOffset * 1.9);
        }
        else {
          svg.y(this.tagOffset);
        }

        this.lines[i] = svg.path()
          .addClass("tag-element");
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

  /**
   * recalculate position of lines
   */
  draw() {
    if (!this.lines[1]) { return; }
    let left = this.endpoints[0].x;
    let right = this.endpoints[1].x + this.endpoints[1].boxWidth;

    let lOffset = -this.endpoints[0].boxWidth / 2;
    let rOffset = this.endpoints[1].boxWidth / 2;

    if (this.endpoints[0].row === this.endpoints[1].row) {
      // draw left side of the brace and align text
      let center = (-left + right) / 2;
      this.x = center + lOffset;
      this.svgText.x(center + lOffset);
      this.lines[0].plot('M' + lOffset + ',33c0,-10,' + [center,0,center,-8]);
      this.lines[1].plot('M' + rOffset + ',33c0,-10,' + [-center,0,-center,-8]);
    }
    else {
      // draw right side of brace extending to end of row and align text
      let center = (-left + this.endpoints[0].row.rw) / 2 + 10;
      this.x = center + lOffset;
      this.svgText.x(center + lOffset);

      this.lines[0].plot('M' + lOffset
        + ',33c0,-10,' + [center,0,center,-8]
        + 'c0,10,' + [center,0,center,8]
      );
      this.lines[1].plot('M' + rOffset
        + ',33c0,-10,' + [-right + 8, 0, -right + 8, -8]
        + 'c0,10,' + [-right + 8, 0, -right + 8, 8]
      );
    }

    // propagate draw command to parent links
    this.links.forEach(l => l.draw(this));
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
      .addClass('editing');
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

  get row() {
    return this.endpoints[0].row;
  }
  get absoluteY() {
    return this.endpoints[0].absoluteY;
  }
  get idx() {
    return this.endpoints[0].idx;
  }
  get cx() {
    return this.endpoints[0].cx;
  }
  get ww() {
    return this.svgText.length();
  }
  get tagOffset() {
    return -28;
  }
}
module.exports = WordCluster;