class Word {
  constructor(val, idx) {
    this.val = val;
    this.idx = idx;
    this.id = `(${this.val}, ${this.idx})`;

    this.tag = null;
    this.h = 0; //num slots

    this.ww = 0;
    this.wh = 0;
    this.wx = 0;
    this.wy = 0;

    this.slotsL = []; //all the slots that links attached the left side of this word occupy
    this.slotsR = [];  //all the slots that links attached the left side of this word occupy

    this.parentsL = [];  //who connects to me and is attached to my left side
    this.parentsR = [];  //who connects to me and is attached to my right side
    this.parentsC = []; //who connects to me and is attached to the center (ie, for multilinks)

    this.tw = 0; //width of text part of word, used also to determine minimum size of word rect
    this.th = 0;

    this.percPos = 0.0; //this is used to indicate where along the row the word is positioned, used when resizing the browser's width, or when popping open a right panel.

    this.isSelected = false;
    this.isDragging = false;

    //variables created in first render...

    this.row = null; //this is a row object, for row num do: this.row.idx

    this.svg = null; // group element within which rect, text, and handles are nested
                    // TODO: transform this.svg instead of individual children

    this.bbox = null; //the bbox of the clickable rect
    this.underneathRect = null; //solid rect on which other word parts are placed (text, handles, clickable rect)
    this.text = null; //the svg text
    this.tagtext = null; //the svg text for a tag

    this.maxtextw = null; //either the word text width, or the tag text with, whichever is wider

    this.leftHandle = null; //the left draggable handle to resize word
    this.rightHandle = null; //the right draggable handle to resize word
         
    this.tempX = 0.0;
    this.tempW = 0.0;
    this.tempY = 0.0;
  }

  
  //take temp values and update actual svg values
  update() {
         
    this.underneathRect.x(this.tempX);
    this.underneathRect.width(this.tempW);

    this.bbox = this.underneathRect.bbox();

    this.text.x(this.tempX + (this.tempW/2) - (this.text.length() / 2) ); 
    this.rightX = this.tempX + this.tempW;

    if (this.tag != null) {
      this.tagtext.x(this.tempX + (this.tempW/2) - (this.tagtext.length() / 2) ); 

      this.leftHandle.x(this.tempX);
      this.rightHandle.x(this.rightX - Config.handleW);
    }

    this.leftX = this.tempX; 

    this.percPos = (this.leftX-Config.edgePadding) / (Config.svgWidth-Config.edgePadding*2);
  }
  
  draw() {
    drawWord(this);
  }

  get minWidth() { //min width is the maximum of: the word text, the tag text, or the size of the two handles + a little bit
    return Math.max(Config.minWordWidth, this.maxtextw);
  }

  //maxWidth() must return a value less than row width - Config.edgePaddings, else will try to reposition long words forever!!!
  get maxWidth() {
    return (this.row.rect.width() - (Config.edgePadding*2)) / 3.1; 
  }

  get parents() {
    return [].concat(this.parentsL, this.parentsC, this.parentsR);
  }

  toggleHighlight(select) {
    if (select === undefined) {
      this.isSelected = !this.isSelected;
    }
    else {
      this.isSelected = select;
    }

    if (this.isSelected) {
      this.svg.addClass('selected');
    }
    else {
      this.svg.removeClass('selected');
    }
  }

  hover() {
    this.svg.addClass('hovered');
  }
  unhover() {
    this.svg.removeClass('hovered');
  }

  toString() {
    return this.id;
  }

  static testMe(val) {
    return '' + val + ''  + val;
  }
}
