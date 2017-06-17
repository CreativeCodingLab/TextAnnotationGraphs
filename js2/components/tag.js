class WordTag {
  constructor(val, word) {
    this.val = val;
    this.entity = word;

    if (!word.svg) {
      console.log("error: word must have an svg element");
      return;
    }

    this.svg = word.svg.group()
      .y(this.tagOffset);
    this.svgText = this.svg.text(this.val)
      .addClass('word-tag');

    // add click and right-click listeners
    let svg = word.mainSVG;
    this.svgText.node.oncontextmenu = (e) => {
      e.preventDefault();
      svg.fire('tag-right-click', { object: this, event: e });
    };
    this.svgText.click((e) => svg.fire('tag-edit', { object: this }));

    this.line = this.svg.path();
    this.updateWordWidth();
  }
  remove() {
    this.entity.tag = null;
    this.entity.setBoxWidth();
    return this.svg.remove();
  }
  updateWordWidth() {
    let ww = this.entity.ww;
    if (this.entity.val.length < 9) {
      this.line.plot('M0,25,l0,8');
    }
    else {
      let diff = ww / 2;
      this.line.plot('M0,25,c0,8,'
        + [diff,0,diff,8]
        + ',M0,25,c0,8,'
        + [-diff,0,-diff,8]
      );
    }
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
          .x(-5);
      }
    }
  }
  changeEntity(word) {
    if (this.entity) {
      this.entity.tag = null;
    }

    this.entity = word;
    this.entity.tag = this;
    this.entity.svg.add(this.svg);
  }
  listenForEdit() {
    this.isEditing = true;
    let bbox = this.svgText.bbox();

    this.svg.addClass('editing');
    this.editingRect = this.svg.rect(bbox.width + 8, bbox.height + 4)
      .x(bbox.x - 4)
      .y(bbox.y - 2)
      .rx(2)
      .ry(2)
      .back();
  }
  stopEditing() {
    this.isEditing = false;
    this.svg.removeClass('editing');
    this.editingRect.remove();
    this.editingRect = null;
    this.val = this.val.trim();
    if (!this.val) {
      this.remove();
    }
    else {
      this.entity.setBoxWidth();
    }
  }
  // word width
  get ww() {
    return this.svgText.length();
  }
  get tagOffset() {
    return -28;
  }
}
