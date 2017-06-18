class Word {
    constructor(val, idx, tag, svg, row) {
      this.eventIds = [];
      this.val = val;
      this.idx = idx;
      this.x = 0;
      this.boxWidth = 0;
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
        this.setBoxWidth();
      }
      else {
        this.tag = tag;
      }
      return this.tag;
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

      // draw cluster info
      this.clusters.forEach((cluster) => {
        cluster.init(this);
      });

      // translate over by half (since the text is centered)
      this.setBoxWidth();
      this.svg.y(-this.svgText.bbox().y2);

      // attach drag listeners
      let x = 0;
      let mousemove = false;
      this.svgText.draggable()
        .on('dragstart', function(e) {
          mousemove = false;
          x = e.detail.p.x;
        })
        .on('dragmove', (e) => {
          e.preventDefault();
          let dx = e.detail.p.x - x;
          x = e.detail.p.x;
          svg.fire('word-move', { object: this, x: dx });
          if (dx !== 0) { mousemove = true; }
        })
        .on('dragend', (e) => {
          if (mousemove === false) {
            svg.fire('word-clicked', { object: this });
          }
        });

      // attach right click listener
      this.svgText.node.oncontextmenu = (e) => {
        e.preventDefault();
        svg.fire('word-right-click', { object: this, event: e });
      }
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
      this.redrawClusters();
    }

    dx(x) {
      this.move(this.x + x);
    }

    setBoxWidth() {
      let diff = this.boxWidth - this.minWidth;
      this.boxWidth -= diff;
      this.dx(diff / 2);
      this.mainSVG.fire('word-move', {object: this, x: 0});
    }

    moveToRow(row, i, ignorePosition = true) {
      this.row.removeWord(this);
      row.addWord(this, i, ignorePosition);
    }

    /**
     * remove reference to a link
     * @return array containing the link, or undefined
     */
    detachLink(link) {
      let i = this.links.indexOf(link);
      if (i > -1) {
        return this.links.splice(i, 1);
      }
    }

    get ww() {
      return this.svgText.length();
    }
    get minWidth() {
      return this.tag instanceof WordTag ? Math.max(this.tag.ww, this.ww) : this.ww;
    }
}
