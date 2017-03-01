
class Link {
    constructor(s, e, direction, style, textStr, textStyle) {
        this.s = s;
        this.e = e;
        this.id = `(${this.s.id}, ${this.e.id})`;
        
        this.direction = direction; //see enums.directions
        this.style = style;

        this.textStr = textStr;
        this.textStyle = textStyle;
        this.textWH = getTextWidthAndHeight(this.textStr, this.textStyle.style)

        this.parentsL = [];
        this.parentsR = [];
        this.h = 0; //which slot is it in
        this.lines = [];

        this.rootMinWord = null;
        this.rootMaxWord = null;


        if (this.s instanceof Word) {
          this.ts = types.WORD;
        } else if (this.s instanceof Link) {
          this.ts = types.LINK;
        }

        if (this.e instanceof Word) {
          this.te = types.WORD;
        } else if (this.e instanceof Link) {
          this.te = types.LINK;
        }       

        this.arrow1Style; 
        this.arrow2Style;

        this.arrow1 = null;
        this.arrow2 = null;
        
        if (this.direction == directions.FORWARD) {
          this.arrow1Style = new ArrowStyle(0, -3, circleArrowPath, new FillStyle('#000000', 1.0));
          this.arrow2Style = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#000000', 1.0));
;
        } else if (this.direction == directions.BACKWARD) {
          this.arrow1Style = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#000000', 1.0)); 
          this.arrow2Style = new ArrowStyle(0, -3, circleArrowPath, new FillStyle('#000000', 1.0));
        } else if (this.direction == directions.BOTH) {
          this.arrow1Style = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#000000', 1.0)); 
          this.arrow2Style = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#000000', 1.0)); 
        } else { //NONE
          this.arrow1Style = new ArrowStyle(0, -3, circleArrowPath, new FillStyle('#000000', 1.0));
          this.arrow2Style = new ArrowStyle(0, -3, circleArrowPath, new FillStyle('#000000', 1.0));
        }

        
        this.x1percent = 0.0;
        this.x2percent = 0.0;


        this.needsUpdate = true;

        this.numLineSegments = 0;
        this.polylines = [];
        this.polylineSVGs = []; //null;
        this.labels = [];
        this.labelRectSVGs = [];
        this.labelTextSVGs = [];
       
        this.label = null;
        this.labelRectSVG = null;
        this.labelTextSVG = null;

      
    }

    

    toString() {
        return this.id; 
    }
}

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
        this.lineTop = null;
        this.lineBottom = null
        this.dragRect = null;
   }

    draw() {
      //console.log(" in Row " + this.idx + " about to call drawRow");
      drawRow(this);
    }

    getMinWidth() {
      
      var w = 0;
      for (var i = 0; i < this.words.length; i++) {
        w += this.words[i].getMinWidth();
      }

      return w;
    }

    toString() {
        return this.id; 
    }
}

class Word {
    constructor(val, idx) {
        this.val = val;
        this.idx = idx;
        this.tag = null;
        this.h = 0; //num slots
        this.ww = 0;
        this.wh = 0;
        this.wx = 0;
        this.wy = 0;
        this.slotsL = [];
        this.slotsR = [];
        this.parentsL = [];
        this.parentsR = [];
        this.lines = []; 
        this.tw = 0; //width of text part of word, used also to determine minimum size of word rect
        this.th = 0;
        this.id = `(${this.val}, ${this.idx})`;
        this.percPos = 0.0; //this is used to indicate where along the row the word is positioned, used when resizing the browser's width, or when popping open a right panel.

        this.isSelected = false;
        this.isHovered = false;
        this.isDragging = false;
        
        //variables created in first render...
        //this.row; //this is a row object, for row num do: this.row.idx
        this.aboveRect = null; //the actual svg element 
        this.bbox = null; //the bbox of the svg element
        this.underneathRect = null; //not clickable, but solid rect on which other word parts are placed (text, handles, clickable rect)
        this.text = null; //the svg text
        this.tagtext = null; //the svg text for a tag

        this.maxtextw = null; //either the word text width, or the tag text with, whichever is wider

        this.leftHandle = null; //the left draggable handle to resize word
        this.rightHandle = null; //the right draggable handle to resize word
         
        
        //used for calculating positions during drag
        //this.needsUpdate = true;
     
        this.tempX = 0.0;
        this.tempW = 0.0;
        this.tempY = 0.0;
    }

    
    //take temp values and update actual svg values
    update() {
      
    ////  console.log("\n***\nin update X = " + this.tempX + ", Y = " + this.tempY + ", W = " + this.tempW );
      this.aboveRect.x(this.tempX);
      this.aboveRect.width(this.tempW);
     
      this.underneathRect.x(this.tempX);
      this.underneathRect.width(this.tempW);

      this.bbox = this.aboveRect.bbox();
      
      this.text.x(this.tempX + (this.tempW/2) - (this.text.bbox().w / 2) ); 
      
      if (this.tag != null) {
        this.tagtext.x(this.tempX + (this.tempW/2) - (this.tagtext.bbox().w / 2) ); 
      }

      this.leftX = this.tempX; 
      this.rightX = this.tempX + this.tempW;

      this.percPos = (this.leftX-edgepadding) / (svgWidth-edgepadding*2);

      this.leftHandle.x(this.tempX);
      this.rightHandle.x(this.rightX - handleW);
    }
    

    draw() {
      ////console.log(" in Word " + this.val + " about to call drawWord");
      drawWord(this);
    }

   
    getMinWidth() {
      return Math.max(minWordWidth, this.maxtextw);
    }

    /* must return a value less than row width - edgepaddings, else will try to reposition long words forever! */
    getMaxWidth() {
      return (this.row.rect.width() - (edgepadding*2)) / 3.1; 
    }

    toString() {
      return this.id;
    }

    static testMe(val) {
      //console.log(" in Word, static testMe, val = " + val);
      return '' + val + ''  + val;

    }
}




function checkSlotAvailabity(num, slotArr) {

  if (debug) {
    if (slotArr.indexOf(num) < 0) {
      ////console.log("slot " + num + " not found..." );
    } else {
      ////console.log("slot " + num + " found! index = " + slotArr.indexOf(num));
    }
  }

  if (slotArr.indexOf(num) >= 0) { return true; } else { return false; }

}


//type: 1 = word; 2 = link
function checkAndUpdateWordToWordSlots(link, startSlot) { //, minWord, minSide, maxWord, maxSide) {
  var wo1, wo2, side1, side2; 

  wo1 = link.rootMinWord;
  wo2 = link.rootMaxWord;
  side1 = link.rootMinSide;
  side2 = link.rootMaxSide;

  var useSlot = -1;

  for (var x = startSlot; x < 100; x++) { //hopefully not this many slots!

    var slotIsAvailable = true;


    for (var i = wo1.idx; i <= wo2.idx; i++) {

      if (i == wo1.idx) { //check right side...

        //side1 == 0
        if (side1 == sides.LEFT) { //then have to check left side too...

          if (checkSlotAvailabity(x, wordObjs[i].slotsL)) {

            slotIsAvailable = false;
            break;
          }
        }
        ////console.log("looking for slot " + x + " in right side of " + wordObjs[i].val);

        if (checkSlotAvailabity(x, wordObjs[i].slotsR)) {
          slotIsAvailable = false;
          break;
        }

      } else if (i > wo1.idx && i < wo2.idx) { //check both sides

        if (checkSlotAvailabity(x, wordObjs[i].slotsL)) {
          slotIsAvailable = false;
          break;
        }

        if (checkSlotAvailabity(x, wordObjs[i].slotsR)) {
          slotIsAvailable = false;
          break;
        }
      } else { //check left side...

        if (checkSlotAvailabity(x, wordObjs[i].slotsL)) {
          slotIsAvailable = false;
          break;
        }

        //side2 == 1
        if (side2 == sides.RIGHT) { //then have to check right side too...

          if (checkSlotAvailabity(x, wordObjs[i].slotsR)) {
            slotIsAvailable = false;
            break;
          }
        }
      } 
    }

    if (slotIsAvailable) {
      useSlot = x;
      break;
    } 
  }

  if (slotIsAvailable) {     
    //now go through and update because now the slot is being used!

    for (var i = wo1.idx; i <= wo2.idx; i++) {

      if (i == wo1.idx) { //update right side...

        //side1 == 0 
        if (side1 == sides.LEFT) {
          wordObjs[i].slotsL.push(useSlot);
        }

        wordObjs[i].slotsR.push(useSlot);

      } else if (i > wo1.idx && i < wo2.idx) { //update both sides

        wordObjs[i].slotsL.push(useSlot);
        wordObjs[i].slotsR.push(useSlot);

      } else { //update left side...

        wordObjs[i].slotsL.push(useSlot);

        //side2 == 1
        if (side2 == sides.RIGHT) {
          wordObjs[i].slotsR.push(useSlot);
        }
      } 
    }

  } else {
    ////console.log("error: couldn't find any slot available out of 100 slots!");
  }

  debugSlots();

  return useSlot;
}

//current link, the word we're tracing, and the side that it's on
function traceBackToWordObj(link, type, word, attach) { 

  var retVal = {w: -1, s: -1};

  if (type == types.WORD) { 
    //// console.log("in traceback, node is a word, wordObj.val = " + word.val + ", attachSide = " + attach);

    retVal.w = word;
    retVal.s = attach;
    return retVal;

  } else {
   //// console.log("in traceback, node is a link, wordObj.val, attachSide = " + attach);

    var nextLink = word;
    var nextType, nextWord, nextAttach;  

    if (attach == sides.LEFT) { //left

      nextType = nextLink.ts;
      nextWord = nextLink.leftWord;
      nextAttach = nextLink.leftAttach;
    
    } else { // right
     
      nextType = nextLink.te;
      nextWord = nextLink.rightWord;
      nextAttach = nextLink.rightAttach;
    
    }

   //// console.log("now going to traceback... link: " + nextLink + ", nextType: " + nextType + " nextWord " + nextWord.val + ", nextAttach: " + nextAttach);
    
    return traceBackToWordObj(nextLink, nextType, nextWord, nextAttach);
  }
}


//TODO - should there be a global strategy for each class of link types? for the different styles of links? for each parent word/link? or for every single individual link??? E.g., could a work support links with different strategies, or would that become cluttered??
function calcAttachPoints(link, strategy)  {

  var rootS, rootE;

  if (link.ts == types.WORD) {
    rootS = link.leftWord.idx;
    //console.log("rootS = " + link.leftWord.id);

  } else {
    rootS = link.leftWord.rootMinWord.idx;
    //console.log("rootS = " + link.leftWord.rootMinWord.id);

  }

  if (link.te == types.WORD) {
    rootE = link.rightWord.idx;
    //console.log("rootE = " + link.rightWord.id);

  } else {
    rootE = link.rightWord.rootMaxWord.idx;
    //console.log("rootE = " + link.rightWord.rootMaxWord.id);
  }

  if (strategy == strategies.CLOSEST) {

    //console.log("" + link.id + " strategy = CLOSEST");

    if (rootS < rootE) {
      //console.log("rootS < rootE (" +rootS +" < " + rootE +")");
      link.leftWord.nr += 1;
      link.rightWord.nl += 1;
      link.leftAttach = sides.RIGHT;
      link.rightAttach  = sides.LEFT; 
    } else {
      //console.log("rootS >= rootE (" +rootS +" >= " + rootE +")");

      link.leftWord.nl += 1;
      link.rightWord.nr += 1;
      link.leftAttach  = sides.LEFT;
      link.rightAttach = sides.RIGHT;

      //     link.leftAttach = sides.RIGHT;
      //  link.rightAttach  = sides.LEFT; 

    }
  } else if (strategy == strategies.FARTHEST) {
    //console.log("" + link.id + " strategy = FARTHEST");


    if (rootS < rootE) {
      link.leftWord.nl += 1;
      link.rightWord.nr += 1;
      link.leftAttach  = sides.LEFT;
      link.rightAttach = sides.RIGHT;
    } else {
      link.leftWord.nr += 1;
      link.rightWord.nl += 1;
      link.leftAttach  = sides.RIGHT;
      link.rightAttach = sides.LEFT; 
    }
  }

}

function swap(obj) { var tmp = obj.a; obj.a = obj.b; obj.b = tmp; }


function flip(link) {
  var tmp;

  tmp = link.rootMinWord;
  link.rootMinWord = link.rootMaxWord;
  link.rootMaxWord = tmp;

  tmp = link.rootMinSide;
  link.rootMinSide = link.rootMaxSide;
  link.rootMaxSide = tmp;

  tmp = link.ts;
  link.ts = link.te;
  link.te = tmp;

  tmp = link.leftWord;
  link.leftWord = link.rightWord;
  link.rightWord = tmp;


  tmp = link.s;
  link.s = link.e;
  link.e = tmp;


    tmp = link.leftAttach;
    link.leftAttach = link.rightAttach;
    link.rightAttach = tmp;
    /*
   tmp = link.x1percent;
   link.x1percent = link.x2percent;
   link.x2percent = tmp;

   tmp = link.leftX;
   link.leftX = link.rightX;
   link.rightX = tmp;
*/
}

function flipIfNecessary(link) {

  if (link.rootMinWord.idx > link.rootMaxWord.idx ||
      ( link.rootMinWord.idx == link.rootMaxWord.idx && link.rootMinSide > link.rootMaxSide ) ||
      ( link.rootMinWord.idx == link.rootMaxWord.idx && link.rootMinSide == link.rootMaxSide && link.rightAttach > link.leftAttach )
     )
  {
    
    //console.log("YES, " + link.id + " needs to flip!");

    flip(link);

    
  } 
}


function createLink(link) {

  link.leftWord = link.s;
  link.rightWord = link.e;

  //calculate attachment points to child links


  if (link.ts == types.WORD && link.te == types.WORD) {
    calcAttachPoints(link, word2word_strategy);
  } else if (link.ts == types.LINK && link.te == types.LINK) {
    calcAttachPoints(link, link2link_strategy);
  } else { 
    calcAttachPoints(link, word2link_strategy);
  }
  

  //calculate attachment points to root
  var checkSlotAt = 1;
  var minWord, minSide, maxWord, maxSide;

  var rootWordAndSide = traceBackToWordObj(link, link.ts, link.leftWord, link.leftAttach);
  link.rootMinWord = rootWordAndSide.w;
  link.rootMinSide = rootWordAndSide.s;

  checkSlotAt = Math.max(checkSlotAt, link.leftWord.h + 1);

  var rootWordAndSide = traceBackToWordObj(link, link.te, link.rightWord, link.rightAttach);
  link.rootMaxWord = rootWordAndSide.w;
  link.rootMaxSide = rootWordAndSide.s;

  checkSlotAt = Math.max(checkSlotAt, link.rightWord.h + 1); //minimum height to start checking
  //set checkSlotAt to 1 if you want to be able to connect from underneath

  flipIfNecessary( link );

  ////console.log("printing link... " + link.id);
  ////console.log(link);

  //what slot is open? (ie figure out y position)
  link.h = checkAndUpdateWordToWordSlots(link, checkSlotAt); 


  //testing attaching the PARENT link to each child..

  ////console.log("attaching the PARENT link to each child"); 
  ////console.log("leftWord = " + link.leftWord.id);
  ////console.log("rightWord = " + link.rightWord.id);

  //explicitly link parents of link (i.e., links that attach to this link)
  //if (link.leftAttach == 0) {
  if (link.leftAttach == sides.LEFT) {
    ////console.log(link.leftWord);
    ////console.log(link.leftWord.parentsL);
    link.leftWord.parentsL.push(link);
  } else if (link.leftAttach == sides.RIGHT) {
    ////console.log(link.leftWord);
    ////console.log(link.leftWord.parentsR);
    link.leftWord.parentsR.push(link);
  }

  //if (link.rightAttach == 0) {
  if (link.rightAttach == sides.LEFT) {
    ////console.log(link.rightWord);
    ////console.log(link.rightWord.parentsL);
    link.rightWord.parentsL.push(link);
  } else if (link.rightAttach == sides.RIGHT) {
    ////console.log(link.rightWord);
    ////console.log(link.rightWord.parentsR);
    link.rightWord.parentsR.push(link);
  }
}

function determineParentLinkOffsets(word, side, parentLinks) {

  var linkStartingHere = [];
  var linksEndingHere = [];

  for (var i = 0; i < parentLinks.length; i++) {

    if (parentLinks[i].leftWord == word) { //then this is the start of the link 
      linkStartingHere.push(parentLinks[i]);
    } else { //then this is the end of the link
      linksEndingHere.push(parentLinks[i]);
    }
  }

  var pinc = (1.0 - (attachmentMargin)) / (parentLinks.length);
  var poff = attachmentMargin;

  //var xoff = 0; 

  if (side == sides.LEFT) {
   
    linksEndingHere.sort(function(a, b) {
     return (a.h - b.h); 
    } );

    for (var ii = 0; ii < linksEndingHere.length; ii++) {
      //linksEndingHere[ii].x2offset = xoff++;
      linksEndingHere[ii].x2percent = poff;
      poff += pinc;
    }

    linkStartingHere.sort(function(a, b) {
      return (b.h - a.h); 
    });

    for (var ii = 0; ii < linkStartingHere.length; ii++) {
      //linkStartingHere[ii].x1offset = xoff++;
      linkStartingHere[ii].x1percent = poff;
      poff += pinc;
    }

  } else {

    linkStartingHere.sort(function(a, b) {
      return (a.h - b.h); 
    });

    for (var ii = 0; ii < linkStartingHere.length; ii++) {
      //linkStartingHere[ii].x1offset = xoff++;
      linkStartingHere[ii].x1percent = poff;
      poff += pinc;
    
    }

    linksEndingHere.sort(function(a, b) {
      return (b.h - a.h); 
    } );

    for (var ii = 0; ii < linksEndingHere.length; ii++) {
      //linksEndingHere[ii].x2offset = xoff++;
      linksEndingHere[ii].x2percent = poff;
      poff += pinc;
    }
  }
}

function arrangeOffsetValsForAttachmentPoints(words) {

  //actually strategy isn't important here, it's the *direction* the attached link is heading...
  // if heading left-to-right, then higher attached links should be to the left
  // if heading right-to-left, then higher attached links should be to the right
  //so... first partition each side of the word by link direction, *then* sort each of those partitions by height in an order depending on direction. 
  // For instance, if left side of word, then links that END on the left side will be first (or could be), with sorting from min to max height, *then* links that START on the left side will be next, with sorting from max to min height.

  for (var w = 0; w < words.length; w++) {
    
    determineParentLinkOffsets(words[w], sides.LEFT, words[w].parentsL);
    determineParentLinkOffsets(words[w], sides.RIGHT, words[w].parentsR);
  }

}


