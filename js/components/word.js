class Word {
    constructor(val, idx, tag, svg, row) {
      this.eventIds = [];
      this.val = val;
      this.idx = idx;
      this.x = 0;
      this.slot = 0;
      this.boxWidth = 0;
      this.boxHeight = 0;
      this.descendHeight = 0;
      this.isPunct = (val.length === 1 && val.charCodeAt(0) < 65); // FIXME: doesn't handle fancier unicode punct | should exclude left-punctuation e.g. left-paren or left-quote
      this.clusters = [];
      this.links = [];

      if (tag) {
        this.setTag(tag);
      }
      if (svg) {
        this.init(svg, row);
      }
    }
    addEventId(id) {
      if (this.eventIds.indexOf(id) < 0) {
        this.eventIds.push(id);
      }
    }
    setSyntaxId(id) {
      this.syntaxId = id;
    }

    setTag(tag) {
      if (this.svg) {
        if (tag instanceof WordTag) {
          this.tag = tag;
        }
        else if (this.tag instanceof WordTag) {
          this.tag.text(tag);
        }
        else {
          this.tag = new WordTag(tag, this);
        }
        this.calculateBox();
      }
      else {
        this.tag = tag;
      }
      return this.tag;
    }
    setSyntaxTag(tag) {
      if (this.svg) {
        if (tag instanceof WordTag) {
          this.syntaxTag = tag;
        }
        else if (this.syntaxTag instanceof WordTag) {
          this.syntaxTag.text(tag);
        }
        else {
          this.tag = new WordTag(tag, this, false);
        }
        this.calculateBox();
      }
      else {
        this.syntaxTag = tag;
      }
      return this.syntaxTag;
    }

    init(svg) {
      this.mainSVG = svg;
      this.svg = svg.group()
        .addClass('word');

      // draw text
      this.svgText = this.svg.text(this.val).addClass('word-text');

      // draw tag
      if (this.tag && !(this.tag instanceof WordTag)) {
        this.tag = new WordTag(this.tag, this);
      }
      if (this.syntaxTag && !(this.syntaxTag instanceof WordTag)) {
        this.syntaxTag = new WordTag(this.syntaxTag, this, false);
      }

      // draw cluster info
      this.clusters.forEach((cluster) => {
        cluster.init(this);
      });

      // translate over by half (since the text is centered)
      this.calculateBox();
      this.svg.y(-this.svgText.bbox().y2);

      // attach drag listeners
      let x = 0;
      let mousemove = false;
      this.svgText.draggable()
        .on('dragstart', function(e) {
          mousemove = false;
          x = e.detail.p.x;
          svg.fire('word-move-start');
        })
        .on('dragmove', (e) => {
          e.preventDefault();
          let dx = e.detail.p.x - x;
          x = e.detail.p.x;
          svg.fire('word-move', { object: this, x: dx });
          if (dx !== 0) { mousemove = true; }
        })
        .on('dragend', (e) => {
          svg.fire('word-move-end', { object: this, clicked: mousemove === false });
        });

      // attach right click listener
      this.svgText.node.oncontextmenu = (e) => {
        e.preventDefault();
        svg.fire('word-right-click', { object: this, event: e });
      }
    }

    redrawLinks() {
      this.links.forEach(l => l.draw(this));
      this.redrawClusters();
    }

    redrawClusters() {
      this.clusters.forEach(cluster => {
        if (cluster.endpoints.indexOf(this) > -1) {
          cluster.draw();
        }
      });
    }

    move(x) {
      this.x = x;
      this.svg.transform({x: this.boxWidth / 2 + this.x});
      this.redrawLinks();
    }

    dx(x) {
      this.move(this.x + x);
    }

    calculateBox() {
      let minWidth = (this.tag instanceof WordTag) ? Math.max(this.tag.ww, this.ww) : this.ww;
      // if (this.syntaxTag instanceof WordTag && this.syntaxTag.ww > minWidth) { minWidth = this.syntaxTag.ww; }
      let diff = this.boxWidth - minWidth;
      this.boxWidth -= diff;
      this.descendHeight = this.syntaxTag instanceof WordTag ? this.syntaxTag.svgText.bbox().height : 0;
      this.boxHeight = this.svg.bbox().height - this.descendHeight;

      this.dx(diff / 2);
      this.mainSVG.fire('word-move', {object: this, x: 0});
    }

    moveToRow(row, i, ignorePosition = true) {
      this.row.removeWord(this);
      row.addWord(this, i, ignorePosition);
    }

    get absoluteDescent() {
      return this.row ? this.row.ry + this.row.rh + this.descendHeight + 8 : 0;
    }
    get absoluteY() {
      // console.log(this.svgText.bbox().height);
      return this.row ? this.row.ry + this.row.rh - this.boxHeight : 0;
    }
    get cx() {
      return this.x + this.boxWidth / 2;
    }
    get ww() {
      return this.svgText.length();
    }
}
