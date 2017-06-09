class Row {
  constructor(idx) {
    this.idx = idx;
    this.words = [];
    this.rh = 0;
    this.ry = 0;
    this.isSelected = false;
    this.baseHeight = 0;
    this.maxSlots = 0;
    this.id = `(${this.idx})`;

    //svg elements
    this.rect = null;
    this.lineBottom = null
    this.dragRect = null;
  }


  draw() {
    this.svg = rowGroup.group();
    this.rect = this.svg.rect(Config.svgWidth,this.rh)
      .x(0)
      .y(this.ry)
      .addClass('row--' + this.idx % 2);

    const y = this.ry + this.rh;

    this.lineBottom = this.svg
      .line(0, y, Config.svgWidth, y)
      .style(styles.rowLineStroke.style);

    this.dragRect = this.svg
      .rect(Config.dragRectSide,Config.dragRectSide)
      .x(Config.svgWidth - (Config.dragRectSide+Config.dragRectMargin))
      .y(y - (Config.dragRectSide+Config.dragRectMargin))
      .style(styles.rowDragRectFill.style);

    this.baseHeight = y - (Config.textPaddingY*2) - texts.wordText.maxHeight;

    addDragStartingAndEndingListeners(this.dragRect);

    this.dragRect.draggable((x, y) => {
      var returnVal = this.drag(x, y);
      redrawLinks(false); //actually - only redraw links that moving this word would affect + this row?

      return returnVal;
    });
  }

  drag(x, y) {

    var prevY = this.rect.bbox().y;
    //var prevY = row.bbox.y;
    var inc = y - prevY;

    var nextRowTooSmall = false;
    var nextY = 0;

    if (this.idx < rows.length - 1) {

      nextY = (rows[this.idx + 1].lineBottom.bbox().y - Config.wordHeight ) - (Config.dragRectSide + Config.dragRectMargin) - Config.rowPadding/2 ;

      if (y > nextY) {
        nextRowTooSmall = true;
      }
    }

    //check that this row height is not smaller than the max word height in the row

    if (inc + Config.dragRectSide + Config.dragRectMargin < Config.wordHeight) {
      this.rect.height(Config.wordHeight);
      y = this.rect.bbox().y + this.rect.bbox().h - (Config.dragRectSide + Config.dragRectMargin);
      this.lineBottom.y(y + Config.dragRectSide + Config.dragRectMargin);
    } else if (this.idx < rows.length - 1 && nextRowTooSmall == true) { //check that this row is not expanding so large that it is bigger than the next row's smallest size
      y = nextY; 
      this.lineBottom.y(y + Config.dragRectSide + Config.dragRectMargin );
      this.rect.height((y - prevY) + Config.dragRectSide + Config.dragRectMargin);
    } else { //this y val is fine
      this.rect.height(inc + Config.dragRectSide + Config.dragRectMargin);
      this.lineBottom.y(y + Config.dragRectSide + Config.dragRectMargin);
    }

    this.ry = this.rect.y();
    this.rh = this.rect.height();
    
    for (var i = 0; i < this.words.length; i++) {
      setWordToY(this.words[i], this.lineBottom.bbox().y - this.words[i].underneathRect.height() );
    }

    this.baseHeight = this.lineBottom.y() - (Config.textPaddingY*2) - texts.wordText.maxHeight;


    if (this.idx < rows.length - 1) {

      var nextrow = rows[this.idx + 1];
      nextrow.rect.y(this.rect.bbox().y + this.rect.bbox().h + Config.rowPadding/2);
      nextrow.rect.height( nextrow.dragRect.bbox().y - y - (Config.rowPadding/2));

      nextrow.ry = nextrow.rect.y();
      nextrow.rh = nextrow.rect.height();
            
      for (var i = 0; i < nextrow.words.length; i++) {
        //updateLinksOfWord(nextrow.words[i]);
      }
    }

    //hmm... what about links that pass through the row, but aren't attached to any word on this row?
    updateAllLinks(); //this works for now


    //update size of svg window if necessary
    if (this.idx == rows.length - 1) {
     changeSizeOfSVGPanel(window.innerWidth - 16, this.lineBottom.y() + 1)
    }

    var returnVal = {x:this.dragRect.bbox().x, y:y}; 

    return returnVal;
  }

  get wordY() {
    return this.ry + this.rh - (texts.wordText.maxHeight + Config.textPaddingY*2);
  }
  get minWidth() {
    return this.words.reduce((acc, val) => acc + val.minWidth, 0);
  }

  toString() {
    return this.id; 
  }
}