class WordCluster {
  constructor(words = [], tag) {
    this.val = tag;
    this.words = words;
    this.metaValue = words.map(w => {
      w.clusters.push(this);
      return w.val;
    }).join(' ');
    this.svgs = [];
    this.setEndpoints();
  }
  setTag(tag) {
    this.tag = tag;
  }
  setEndpoints() {
    this.firstWord = this.words[0];
    this.lastWord = this.words[this.words.length - 1];
  }
  init() {

    // FIXME: this is a mess
    // TODO: update cluster on word move (in word.move() ?)
    this.setEndpoints();
    this.svgs[0] = this.firstWord.svg.group()
      .y(this.words.find(w => w.tag) ? this.tagOffset * 2 : this.tagOffset);
    // check if cluster spans more than 1 row -- currently only creates 2 groups max
    if (this.lastWord.row && this.lastWord.row !== this.firstWord.row) {
      this.svgs[1] = this.lastWord.svg.group();
    }
    this.svgs[0].text(this.val)
      .addClass('word-cluster');

    let ww = this.words.reduce((acc, w) => acc + w.boxWidth, 0);
    let diff = ww / 2;
    let line = this.svgs[0].path();
    line.plot('M0,25,c0,8,'
      + [diff,0,diff,8]
      + ',M0,25,c0,8,'
      + [-diff,0,-diff,8]
    );
    this.svgs[0].x(diff);
  }
  draw(svg) {
    // init svg if does not exist
    if (this.svgs.length === 0 && this.firstWord.svg && this.lastWord.svg) {
      this.init();
    }
    else {
      // redraw svg if it does exist

    }
  }
  get tagOffset() {
    return -28;
  }
}
