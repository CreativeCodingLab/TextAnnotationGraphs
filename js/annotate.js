
class Link {
    constructor(wordArr, directionArr, style, textStr, textStyle) {
      
        this.words = wordArr; //words (or links) that this link links to
        this.arrowDirections = directionArr;

        //this.direction = direction; //see enums.directions
        this.style = style;

        this.textStr = textStr;
        this.textStyle = textStyle;
        this.textWH = getTextWidthAndHeight(this.textStr, this.textStyle.style)

        this.parentsL = []; //who connects to me and is attached to my left side
        this.parentsR = []; //who connects to me and is attached to my right side
        this.parentsC = []; //who connects to me and is attached to the center (ie, for multilinks)

        this.h = 0; //which slot does this link occupy

        //this.lines = []; //don't think this is being used... double check then remove

        this.rootMinWord = null;
        this.rootMaxWord = null;
        this.nearestConnectedMinWord = null;
        this.nearestConnectedMaxWord = null;

        this.arrows = [];
        this.arrowStyles = [];
        this.arrowXPercents = [];

        for (var i = 0; i < this.arrowDirections.length; i++) {
          if (this.arrowDirections[i] == directions.FORWARD) {

            this.arrowStyles[i] = new ArrowStyle(0, -3, circleArrowPath, new FillStyle('#0000ff', 0.5));
          } else if (this.arrowDirections[i] == directions.BACKWARD) {
          
            this.arrowStyles[i] = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#00ff00', 0.5));
     
          } else {
            this.arrowStyles[i] = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#ff0000', 0.5));
          }
 
        }

        /*
        if (this.direction == directions.FORWARD) {
          this.arrowStyles[0] = new ArrowStyle(0, -3, circleArrowPath, new FillStyle('#000000', 1.0));
          this.arrowStyles[this.words.length - 1] = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#000000', 1.0));
        } else if (this.direction == directions.BACKWARD) {
          this.arrowStyles[0] = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#000000', 1.0)); 
          this.arrowStyles[this.words.length - 1]  = new ArrowStyle(0, -3, circleArrowPath, new FillStyle('#000000', 1.0));
        } else if (this.direction == directions.BOTH) {
          this.arrowStyles[0] = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#000000', 1.0)); 
          this.arrowStyles[this.words.length - 1]  = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#000000', 1.0)); 
        } else { //NONE
          this.arrowStyles[0] = new ArrowStyle(0, -3, circleArrowPath, new FillStyle('#000000', 1.0));
          this.arrowStyles[this.words.length - 1]  = new ArrowStyle(0, -3, circleArrowPath, new FillStyle('#000000', 1.0));
        }
        */


        /*
        this.arrow1Style; 
        this.arrow2Style;

        this.arrow1 = null;
        this.arrow2 = null;
        
        if (this.direction == directions.FORWARD) {
          this.arrow1Style = new ArrowStyle(0, -3, circleArrowPath, new FillStyle('#000000', 1.0));
          this.arrow2Style = new ArrowStyle(0, -1, downArrowPath, new FillStyle('#000000', 1.0));
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
        */

        this.needsUpdate = true;

        this.numLineSegments = 0;
        this.polylines = [];
        this.polylineSVGs = [];
        this.labels = [];
        this.labelRectSVGs = [];
        this.labelTextSVGs = [];
       
        this.label = null;
        this.labelRectSVG = null;
        this.labelTextSVG = null;
    }

    //KLEE's function..
    removeSVGs() {
     this.polylineSVGs.forEach(svg => svg.remove());
     this.labelRectSVGs.forEach(svg => svg.remove());
     this.labelTextSVGs.forEach(svg => svg.remove());
     this.arrow1Style.path.remove();
     this.arrow2Style.path.remove();
    }
    //end KLEE

    get parents() {
      return [].concat(this.parentsL, this.parentsC, this.parentsR);
    }

    toString() {
        return this.id; 
    }
    

    setStartAndEnd() {

        this.leftWord = this.words[0];
        this.rightWord = this.words[this.words.length - 1];
        this.id = `(${this.leftWord.id}, ${this.rightWord.id})`;

        console.log("\n\n *** \n\n in setStartAndEnd");
        console.log("leftWord: " + this.leftWord);
        console.log("rightWord: " + this.rightWord);

        if (this.leftWord instanceof Word) {
          this.leftType = types.WORD;
        } else if (this.leftWord instanceof Link) {
          this.leftType = types.LINK;
        }

        if (this.rightWord instanceof Word) {
          this.rightType = types.WORD;
        } else if (this.rightWord instanceof Link) {
          this.rightType = types.LINK;
        }       

        //these get set based on the layout strategy (closet or farthest), in calcAttachPoints()
        this.leftAttach = null;
        this.rightAttach = null;

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



    //this.lines = [];  //don't this is used, double check then remove!

    this.tw = 0; //width of text part of word, used also to determine minimum size of word rect
    this.th = 0;

    this.percPos = 0.0; //this is used to indicate where along the row the word is positioned, used when resizing the browser's width, or when popping open a right panel.

    this.isSelected = false;
    this.isHovered = false;
    this.isDragging = false;

    //variables created in first render...
    this.row = null; //this is a row object, for row num do: this.row.idx
    this.aboveRect = null; //the top level, clickable rect 
    this.bbox = null; //the bbox of the clickable rect
    this.underneathRect = null; //solid rect on which other word parts are placed (text, handles, clickable rect)
    this.text = null; //the svg text
    this.tagtext = null; //the svg text for a tag

    this.maxtextw = null; //either the word text width, or the tag text with, whichever is wider

    this.leftHandle = null; //the left draggable handle to resize word
    this.rightHandle = null; //the right draggable handle to resize word
         
        //used for calculating positions during drag
        //this.needsUpdate = true;
    
       //these values are set during mouse interactions, and then used to update any words+links all at once (helps with speed of SVG calculation/rendering 
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

      this.percPos = (this.leftX-Config.edgePadding) / (Config.svgWidth-Config.edgePadding*2);

      this.leftHandle.x(this.tempX);
      this.rightHandle.x(this.rightX - Config.handleW);
    }
    
    draw() {
      ////console.log(" in Word " + this.val + " about to call drawWord");
      drawWord(this);
    }

    getMinWidth() { //min width is the maximum of: the word text, the tag text, or the size of the two handles + a little bit
      return Math.max(Config.minWordWidth, this.maxtextw);
    }

    //getMaxWidth() must return a value less than row width - Config.edgePaddings, else will try to reposition long words forever!!!
    getMaxWidth() {
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

      let style;
      if (this.isSelected) {
        style = this.isHovered ? "hoverAndSelect" : "select";
      }
      else {
        style = this.isHovered ? "hover" : "style";
      }
      this.underneathRect.style(styles.wordFill[style]);
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

  if (Config.debug) {
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
  console.log("in checkandupdatewordtowordslots");
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
function traceBackToNearestWordObj(link, type, word, attach) { 

  var retVal = {w: -1, s: -1};

  if (type == types.WORD) { 
    console.log("in traceback, node is a word, wordObj.val = " + word.val + ", attachSide = " + attach);

    retVal.w = word;
    retVal.s = attach;

    return retVal;

  } else {
   //// console.log("in traceback, node is a link, wordObj.val, attachSide = " + attach);

    var nextLink = word;
    var nextType, nextWord, nextAttach;  

    if (attach == sides.LEFT) { //left

      //nextType = nextLink.ts;
      nextType = nextLink.leftType;
      nextWord = nextLink.leftWord;
      nextAttach = nextLink.leftAttach;
    
    } else { // right
    
      //nextType = nextLink.te;
      nextType = nextLink.rightType;
      nextWord = nextLink.rightWord;
      nextAttach = nextLink.rightAttach;
    
    }

    console.log("now going to traceback... link: " + nextLink + ", nextType: " + nextType + " nextWord " + nextWord.val + ", nextAttach: " + nextAttach);
    
    return traceBackToWordObj(nextLink, nextType, nextWord, nextAttach);
  }
}
//current link, the word we're tracing, and the side that it's on
function traceBackToWordObj(link, type, word, attach) { 

  var retVal = {w: -1, s: -1};

  if (type == types.WORD) { 
    console.log("in traceback, node is a word, wordObj.val = " + word.val + ", attachSide = " + attach);

    retVal.w = word;
    retVal.s = attach;

    return retVal;

  } else {
   //// console.log("in traceback, node is a link, wordObj.val, attachSide = " + attach);

    var nextLink = word;
    var nextType, nextWord, nextAttach;  

    console.log("nextLinkleft: " + nextLink.leftWord);
    console.log("nextLinkleft: " + nextLink.rightWord);
    if (determineSide(link) == swapside.YES) {
      if (attach == sides.RIGHT) { //left

        //nextType = nextLink.ts;
        nextType = nextLink.leftType;
        nextWord = nextLink.leftWord;
        nextAttach = nextLink.leftAttach;
      
      } else { // right
      
        //nextType = nextLink.te;
        nextType = nextLink.rightType;
        nextWord = nextLink.rightWord;
        nextAttach = nextLink.rightAttach;
      
      }
    }
    else {
      if (attach == sides.LEFT) { //left

        //nextType = nextLink.ts;
        nextType = nextLink.leftType;
        nextWord = nextLink.leftWord;
        nextAttach = nextLink.leftAttach;
      
      } else { // right
      
        //nextType = nextLink.te;
        nextType = nextLink.rightType;
        nextWord = nextLink.rightWord;
        nextAttach = nextLink.rightAttach;
      
      }
    }

    console.log("now going to traceback... link: " + nextLink + ", nextType: " + nextType + " nextWord " + nextWord.val + ", nextAttach: " + nextAttach);
    
    return traceBackToWordObj(nextLink, nextType, nextWord, nextAttach);
  }
}

function determineSide(link) {
  var rootS, rootE;

    if (link.leftType == types.WORD) {
      rootS = link.leftWord.idx;
      //console.log("rootS = " + link.leftWord.id);

    } else {
      rootS = link.leftWord.rootMinWord.idx;
      //console.log("rootS = " + link.leftWord.rootMinWord.id);

    }

    if (link.rightType == types.WORD) {
      rootE = link.rightWord.idx;
      //console.log("rootE = " + link.rightWord.id);

    } else {
      rootE = link.rightWord.rootMaxWord.idx;
      //console.log("rootE = " + link.rightWord.rootMaxWord.id);
    }
    
    if(rootS < rootE) {
      return swapside.YES;
    }
    else {
      return swapside.NO;
    }
}

//TODO - should there be a global strategy for each class of link types? for the different styles of links? for each parent word/link? or for every single individual link??? E.g., could a word support links with different strategies, or would that become cluttered??
function calcAttachPoints(link, strategy)  {

  //link.leftWord.nr += 1;
  //link.rightWord.nl += 1;

/* KLEE <<<<<<< HEAD
  if (strategy == strategies.CLOSEST) {
    console.log("" + link.id + " strategy = CLOSEST");
    console.log("rootS < rootE (" +rootS +" < " + rootE +")");
    link.leftAttach = sides.RIGHT;
    link.rightAttach  = sides.LEFT; 
  
  } else if (strategy == strategies.FARTHEST) {
    console.log("" + link.id + " strategy = FARTHEST");
    link.leftAttach  = sides.LEFT;
    link.rightAttach = sides.RIGHT;
  }
//end KLEE */

    //console.log("" + link.id + " strategy = CLOSEST");

    if (determineSide(link) == swapside.YES) {
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
  // } else if (strategy == strategies.FARTHEST) {
    //console.log("" + link.id + " strategy = FARTHEST");

  /*
  //now handle middle attachment points...
  for (var i = 1; i < link.words.length - 1; i++) {
    link.words[i].nm += 1;
  }
  */

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

  tmp = link.leftType;
  link.leftType = link.rightType;
  link.rightType = tmp;

  tmp = link.leftWord;
  link.leftWord = link.rightWord;
  link.rightWord = tmp;



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


function sortLinkWords(link) {

  console.log("\n\n***\nUNSORTED!", link, link.words);

  for (var i = 0; i < link.words.length; i++) {
    var w = link.words[i];

    if (w instanceof Word) {
      w.rootIdx = w.idx;
    } else {
      w.rootIdx = Math.floor((w.rootMinWord.idx + w.rootMaxWord.idx) / 2)
    }

    console.log(i + ": " + w + ", rootIdx = " + w.rootIdx);


  }

  link.words.sort(function(a, b) {

    var d1 = Math.abs(a.rootIdx);
    var d2 = Math.abs(b.rootIdx);

    return d1 - d2; 
  });

   console.log("\n\n***\nSORTED!");
  for (var i = 0; i < link.words.length; i++) {

       var w = link.words[i];
 

    console.log(i + ": " + w + ", rootIdx = " + w.rootIdx);



  }

}

function createLink(link) {


  sortLinkWords(link);
  link.setStartAndEnd();

 // link.leftWord = link.s; //the leftWord could be a Word or a Link
 // link.rightWord = link.e; //the rightWord could be a Word or a Link

  //calculate attachment points to child links

  if (link.leftType == types.WORD && link.rightType == types.WORD) {
    calcAttachPoints(link, Config.word2word_strategy);
  } else if (link.leftType == types.LINK && link.rightType == types.LINK) {
    calcAttachPoints(link, Config.link2link_strategy);
  } else { 
    calcAttachPoints(link, Config.word2link_strategy);
  }


  //calculate attachment points to root
  var checkSlotAt = 1;
  var minWord, minSide, maxWord, maxSide;
  //console.log("\n\n*** \n\n in createLink" + link.words);
  //console.log("left link type: " + link.leftType);
  //console.log("left link word: " + link.leftWord);
  var rootWordAndSide = traceBackToWordObj(link, link.leftType, link.leftWord, link.leftAttach);
  var rootnearestWordAndSide = traceBackToNearestWordObj(link, link.leftType, link.leftWord, link.leftAttach);
  link.rootMinWord = rootWordAndSide.w;
  link.rootMinSide = rootWordAndSide.s;
  //console.log("rootWordAndSideMin: " + rootWordAndSide.w);
  link.nearestConnectedMinWord = rootnearestWordAndSide.w;

  checkSlotAt = Math.max(checkSlotAt, link.leftWord.h + 1);
  //console.log("right link type: " + link.rightType);
  //console.log("right link word: " + link.rightWord);
  rootWordAndSide = traceBackToWordObj(link, link.rightType, link.rightWord, link.rightAttach);
  rootWordAndSide = traceBackToNearestWordObj(link, link.rightType, link.rightWord, link.rightAttach);
  link.rootMaxWord = rootWordAndSide.w;
  link.rootMaxSide = rootWordAndSide.s;
  //console.log("rootWordAndSideMax: " + rootWordAndSide.w);
  link.nearestConnectedMaxWord = rootnearestWordAndSide.w;
  checkSlotAt = Math.max(checkSlotAt, link.rightWord.h + 1); //minimum height to start checking
  //set checkSlotAt to 1 if you want to be able to connect from underneath

  /* not sure if we need this, now that we're sorting ahead of time! */
  //flipIfNecessary( link );

  ////console.log("printing link... " + link.id);
  ////console.log(link);

  //what slot is open? (ie figure out y position)
  link.h = checkAndUpdateWordToWordSlots(link, checkSlotAt); 


  //testing attaching the PARENT link to each child..

  ////console.log("attaching the PARENT link to each child"); 
  ////console.log("leftWord = " + link.leftWord.id);
  ////console.log("rightWord = " + link.rightWord.id);

  //explicitly link parents of link (i.e., links that attach to this link)
  if (link.leftAttach == sides.LEFT) {
    ////console.log(link.leftWord);
    ////console.log(link.leftWord.parentsL);
    link.leftWord.parentsL.push(link);
  } else if (link.leftAttach == sides.RIGHT) {
    ////console.log(link.leftWord);
    ////console.log(link.leftWord.parentsR);
    link.leftWord.parentsR.push(link);
  }

  if (link.rightAttach == sides.LEFT) {
    ////console.log(link.rightWord);
    ////console.log(link.rightWord.parentsL);
    link.rightWord.parentsL.push(link);
  } else if (link.rightAttach == sides.RIGHT) {
    ////console.log(link.rightWord);
    ////console.log(link.rightWord.parentsR);
    link.rightWord.parentsR.push(link);
  }

  //determine middle words links...
  for (var i = 1; i < link.words.length - 1; i++) {
    var middleWord = link.words[i];
    middleWord.parentsC.push(link)
  }

}

function determineParentLinkOffsets(word, side, parentLinks, totalAttachmentPoints, offsetIdx) {

  console.log("in determineParentLinkOffsets, word = " + word.toString() +", checking side " + side);

  var linkStartingHere = [];
  var linksEndingHere = [];

  for (var i = 0; i < parentLinks.length; i++) {

    for (var ii = 0; ii < parentLinks[i].words.length; ii++) {

      if (parentLinks[i].words[ii] == word) {
        linkStartingHere.push( {link:parentLinks[i], word:word, idx:ii} );
      }

    }
    /*
       if (parentLinks[i].leftWord == word) { //then this is the start of the link 
       linkStartingHere.push(parentLinks[i]);
       } else if (parentLinks[i].rightWord == word ) { //then this is the end of the link
       linksEndingHere.push(parentLinks[i]);
       } else { //is a middle link, so must be a link ending here
       linksEndingHere.push(parentLinks[i]);
       }
       */
  }

  //console.log("offsetIdx = " + offsetIdx);

  var pinc, poff;
  if (totalAttachmentPoints <= 1) {
    console.log("here totalAttachmentPoints = " + totalAttachmentPoints);
    pinc = 0.5;
    poff = 0.5; //Config.attachmentMargin + (pinc * offsetIdx);

  } else {
    pinc = ((1.0 - (Config.attachmentMargin*2))*1.0)  / (totalAttachmentPoints - 1);
    poff = Config.attachmentMargin + (pinc * offsetIdx);

  }
  console.log("poff = " + poff);


  for (var i = 0; i < linkStartingHere.length; i++) {
    var lshL = linkStartingHere[i].link;
    var lshW = linkStartingHere[i].word;
    var lshI = linkStartingHere[i].idx;

    console.log("linkStartingHere = " + linkStartingHere[i].toString());
    console.log(linkStartingHere[i]);
    console.log("lshL = " + lshL.toString());
    console.log("lshW = " + lshW.toString());
    console.log("lshI = " + lshI);

    console.log(lshL.arrowXPercents);

    lshL.arrowXPercents[lshI] = poff;
    poff += pinc;
  }


  /*
     if (side == sides.LEFT) {

     console.log("in sides.LEFT");

     linksEndingHere.sort(function(a, b) {
     return (a.h - b.h); //need to think about how these are sorted...
     } );

     for (var ii = 0; ii < linksEndingHere.length; ii++) {
     console.log("linksEndingHere = " + linksEndingHere[ii].toString());
     linksEndingHere[ii].arrowXPercents[linksEndingHere[ii].words.length - 1] = poff;

     poff += pinc;
     }

     linkStartingHere.sort(function(a, b) {
     return (a.h - b.h); 
     });

     for (var ii = 0; ii < linkStartingHere.length; ii++) {
     console.log("linkStartingHere = " + linkStartingHere[ii].toString());
     linkStartingHere[ii].arrowXPercents[0] = poff;
     poff += pinc;
     }


     } else if (side == sides.RIGHT) {

     console.log("in sides.RIGHT");


     linkStartingHere.sort(function(a, b) {
     return (a.h - b.h); 
     });

     for (var ii = 0; ii < linkStartingHere.length; ii++) {
     console.log("linkStartingHere = " + linkStartingHere[ii].toString());

     linkStartingHere[ii].arrowXPercents[0]  = poff;
     poff += pinc;
     }

     linksEndingHere.sort(function(a, b) {
     return (b.h - a.h); 
     } );

    for (var ii = 0; ii < linksEndingHere.length; ii++) {
          console.log("linksEndingHere = " + linksEndingHere[ii].toString());
   
      linksEndingHere[ii].arrowXPercents[linksEndingHere[ii].words.length - 1] = poff;
      poff += pinc;
    }
  } else if (side == sides.CENTER) {

    console.log("in sides.CENTER");

    //there are no linksStartingHere if its in the center, only linksEndingHere

     linksEndingHere.sort(function(a, b) {
      return (b.h - a.h); 
    } );

    for (var ii = 0; ii < linksEndingHere.length; ii++) {

      console.log("sides.CENTER: linksEndingHere["+ii+"] = " + linksEndingHere[ii].toString());
      
      linksEndingHere[ii].arrowXPercents[linksEndingHere[ii].words.length - 1] = poff;
      poff += pinc;
    }


  }
  */
}

function arrangeOffsetValsForAttachmentPoints(words) {


  //actually strategy isn't important here, it's the *direction* the attached link is heading...
  // if heading left-to-right, then higher attached links should be to the left
  // if heading right-to-left, then higher attached links should be to the right
  //so... first partition each side of the word by link direction, *then* sort each of those partitions by height in an order depending on direction. 
  // For instance, if left side of word, then links that END on the left side will be first (or could be), with sorting from min to max height, *then* links that START on the left side will be next, with sorting from max to min height.

  for (var w = 0; w < words.length; w++) {

    console.log("w = " + w + ", word: " + words[w].toString());

    var totalAttachmentPoints = words[w].parentsL.length + words[w].parentsR.length + words[w].parentsC.length;
   
    if ( words[w].parentsL.length > 0 ) {
      determineParentLinkOffsets(words[w], sides.LEFT, words[w].parentsL, totalAttachmentPoints, 0 );
    }
    //console.log("center links' offsetIdx = " + words[w].parentsL.length);

    if ( words[w].parentsC.length > 0 ) {
     determineParentLinkOffsets(words[w], sides.CENTER, words[w].parentsC, totalAttachmentPoints, words[w].parentsL.length );
    }

    if ( words[w].parentsR.length > 0 ) {
      determineParentLinkOffsets(words[w], sides.RIGHT, words[w].parentsR, totalAttachmentPoints, words[w].parentsL.length + words[w].parentsC.length);
    }
  }

}


