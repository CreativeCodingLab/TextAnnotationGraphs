
function mdown(myrect, word){
  //console.log("in mdown!");
  //console.log(word);
  //console.log(myrect.bbox());
  word.isSelected = true;
}

function mup(myrect, word){
  //console.log("in mup!");
  //console.log(word);
  //console.log(myrect.bbox());
  word.isSelected = false;
}

function mmove(myrect, word){
  //console.log("in mmove!");
  //console.log(word);
  //console.log(myrect.bbox());

  if (word.isSelected == true) {
    //console.log("you are moving this guy!");
  }
}

function mclick(myrect, word){
  //console.log("in mclick!");
  //console.log(word);
  //console.log(myrect.bbox());
}


function updateLinksOfWord(word) {

    var arr = [];
    getAttachedLinks(word, arr); 
      
    for (let item of arr) {
      item.needsUpdate = true;
    }
}


function updateAllLinks() {
  for (let item of linkObjs) {
    item.needsUpdate = true;
  }
}


function updateLinks(link) {

    var arr = [link];
    getAttachedLinks(link, arr); 
      
    for (let item of arr) {
     //console.log(item.toString());
     item.needsUpdate = true;
    }

 
}

function updateLinkRow(row) {  
  for (let item of linkObjs) {
    let minRow = item.rootMinWord.row.idx;
    let maxRow = item.rootMaxWord.row.idx;
    if( row >= minRow || maxRow >= row )
    {
      item.needsUpdate = true;
    }   
  }
}


/** Update words that have been dragged or pushed by a dragged word, and collect the links that need to be updated **/
function updateWords() {

  var arr = [];

  for (var i = 0; i < wordObjs.length; i++) {
    var w = wordObjs[i];

    if (w.needsUpdate == true) {
      w.update();
      w.needsUpdate = false; 
  
      getAttachedLinks(w, arr); 
      
      for (let item of arr) {
        item.needsUpdate = true;
      }
    }
  }
}


function getAttachedLinks(e, arr) {

  for (var i = 0; i < e.parentsL.length; i++) {
    //console.log(e.parentsL[i]);

    arr.push(e.parentsL[i]);
    getAttachedLinks(e.parentsL[i], arr);
  }

   for (var i = 0; i < e.parentsC.length; i++) {

    arr.push(e.parentsC[i]);
    getAttachedLinks(e.parentsC[i], arr);
  }

  for (var i = 0; i < e.parentsR.length; i++) {

    arr.push(e.parentsR[i]);
    getAttachedLinks(e.parentsR[i], arr);
  }
}

function addDragStartingAndEndingListeners(elem) {


  
  elem.on('dragstart', function() {
    isDragging = true;
    //isCanceling = false;
    //console.log("isDragging = " + isDragging);
    //console.log("elem = " + elem + " rect x = " + elem.bbox().x);
    prevX = elem.bbox().x;

  })

  /*
  elem.on('mousemove.drag', function() {
    updateWords();   
  })
  */


  /*
  elem.on('mousemove.drag', _.debounce(function() {
    //console.log("here!");
    updateWords();   
  }, 1));
  */


  elem.on('dragend', function(e) {
    isDragging = false;
    //isCanceling = false;
    if (rowOffsetWord && rowOffsetWord.isHovered == false) {
      mout(rowOffsetWord);
    }

    rowOffsetX = 0;
    rowOffsetWord = null;

    prevX = -1;
    console.log("dragEnd B - isDragging = " + isDragging);


  })

}



function dragArrow (lo, arrowIdx, arrowSVG ) {

  addDragStartingAndEndingListeners(arrowSVG);

  arrowSVG.draggable(function(x, y) {
    return manageDrag(arrowSVG, x, y, lo, lo.arrows[arrowIdx], arrowIdx);
  });
}


/*
function dragArrow1 (lo, arrowSVG, arrowInfo ) {

  addDragStartingAndEndingListeners(arrowSVG);

  arrowSVG.draggable(function(x, y) {
    return manageDrag(arrowSVG, x, y, lo, lo.arrows[0]);
  });
}

function dragArrow2 (lo, arrowSVG, arrowInfo ) {

  addDragStartingAndEndingListeners(arrowSVG);

  arrowSVG.draggable(function(x, y) {
    return manageDrag(arrowSVG, x, y, lo, lo.arrows[lo.words.length - 1]);
  });
}
*/


function manageDrag(arrowSVG, x, y, lo, arrowInfo, arrowIdx) {

  var leftX = arrowInfo.leftX;
  var rightX = arrowInfo.rightX;
  var linkWidth = ( rightX - leftX );
  var side = arrowInfo.side;
  var word = arrowInfo.word;

//  if (side == sides.LEFT) {
    var xPos = (x - leftX) + Config.arrowW; 
    var percentage = xPos / (linkWidth/1);
    var ux = x;

    if (percentage < 0.0) {
      console.log("AAA");
      percentage = 0.0;
      ux = leftX - Config.arrowW;
    } else if (percentage > 1.0) {
      console.log("BBB");
      percentage = 1.0;
      ux = rightX - Config.arrowW;
    }
/* 
} else if (side == sides.RIGHT) { 

    var xPos = linkWidth - ((x - leftX) + Config.arrowW); 

    var percentage = xPos / (linkWidth/1);
    var ux = x;

    if (percentage < 0.0) {
      console.log("CCC");
      percentage = 0.0;
      ux = rightX - Config.arrowW;
    } else if (percentage > 1.0) {
      console.log("DDD");
      percentage = 1.0;
      ux = leftX - Config.arrowW;
    }
  }

  if (word == lo.leftWord) {
    lo.arrowXPercents[0] = percentage;
  } else {
    lo.arrowXPercents[lo.words.length - 1] = percentage;
  }
*/

console.log("percentage for arrowIdx ("+arrowIdx+") = " + percentage);
    lo.arrowXPercents[arrowIdx] = percentage;
 
  updateLinks(lo);

  redrawLinks(false);
  //redrawLinks(true);

  return { x:ux, y: arrowSVG.bbox().y }
}


/*
   function dragArrow (arrow, link, word, side, leftX, rightX) {

   addDragStartingAndEndingListeners(arrow);


   arrow.draggable(function(x, y) {

   var linkWidth = ( (rightX) - (leftX) );

   console.log(linkWidth);


   if (side == sides.LEFT) {
   var xPos = (x - leftX) + Config.arrowW; 
//console.log("x = " + x + ", xPos = " + xPos);

var percentage = xPos / (linkWidth/2);
var ux = x;

if (percentage < 0.0) {
percentage = 0.0;
ux = leftX - Config.arrowW;
} else if (percentage > 2.0) {
percentage = 2.0;
ux = leftX - Config.arrowW + (linkWidth/2);
}
} else if (side == sides.RIGHT) { 

var xPos = linkWidth - ((x - leftX) + Config.arrowW); 

var percentage = xPos / (linkWidth/2);
var ux = x;

if (percentage < 0.0) {
percentage = 0.0;
ux = leftX - Config.arrowW;
} else if (percentage > 2.0) {
percentage = 2.0;
ux = leftX - Config.arrowW + (linkWidth);
}
}

    if (word == link.leftWord) {
      link.x1percent = percentage;
    } else {
      link.x2percent = percentage;
    }

    updateLinks(link);

    redrawLinks();
    
    return { x:ux, y: arrow.bbox().y }
    
    //return { x:x, y: arrow.bbox().y }
  });
}
*/

function checkDragDirection(x) {

   if (prevX == x) { 
      dragDir = directions.NONE;
   } else if (x > prevX) {
      dragDir = directions.FORWARD;
    } else {
      dragDir = directions.BACKWARD;
    }

   return dragDir;
}

function setUpLeftHandleDraggable(word) {

  addDragStartingAndEndingListeners(word.leftHandle);

  word.leftHandle.draggable(function(x, y) {
    rowOffsetWord = word;

    var returnVal = dragLeftHandle(x, word.leftHandle.bbox().y, word);
    
    updateWords();
    
    redrawLinks(false);//actually - only redraw links that moving this word would affect + this row
    prevX = x;
    return returnVal;
  });
}

function setUpRightHandleDraggable(word) {

  addDragStartingAndEndingListeners(word.rightHandle);

  word.rightHandle.draggable(function(x, y) {
    rowOffsetWord = word;

    var returnVal = dragRightHandle(x, word.rightHandle.bbox().y, word);

       updateWords();
  
    redrawLinks(false); //actually - only redraw links that moving this word would affect + this row
    prevX = x;
    return returnVal;
  });
}

function dragLeftHandle(x, y, word) {

  var dragDir = checkDragDirection(x);

  if (dragDir == directions.BACKWARD) {
    return checkIfCanDragLeftHandleLeft(x + rowOffsetX, y, word);
  } else if (dragDir == directions.FORWARD) {
    return checkIfCanDragLeftHandleRight(x + rowOffsetX, y, word);
  } else {
    return {x:word.leftHandle.bbox().x, y:word.leftHandle.bbox().y};
  }
}



function checkIfCanDragLeftHandleLeft(x, y, word) {
    var rw = Math.max( Math.min(word.getMaxWidth(), (word.rightX - x)), word.getMinWidth() );

    setWordToXW(word, x, rw);

    var rv = checkIfCanMoveLeft(x, rw, y, word, true);
    rv.y = word.y;
    return rv;
  }

function checkIfCanDragLeftHandleRight(x, y, word) {

    var rw = Math.max( Math.min(word.getMaxWidth(), (word.rightX - x) ), word.getMinWidth() );

    setWordToXW(word, x, rw);

    var rv = checkIfCanMoveRight(x, rw, y, word, true);
    rv.y = word.y;
   
    return rv;
}



function dragRightHandle(x, y, word) {

  var dragDir = checkDragDirection(x);

  if (dragDir == directions.BACKWARD) {
    return checkIfCanDragRightHandleLeft(x + rowOffsetX, y, word);
  } else if (dragDir == directions.FORWARD) {
    return checkIfCanDragRightHandleRight(x + rowOffsetX, y, word);
  } else {
    return {x:word.rightHandle.bbox().x, y:word.rightHandle.bbox().y};
  }
}

function checkIfCanDragRightHandleLeft(x, y, word) {
    var rw = Math.max( Math.min(word.getMaxWidth(), (x - word.leftX + Config.handleW)), word.getMinWidth() );

    setWordToXW(word, word.leftX, rw);

    var rv = checkIfCanMoveLeft(x - (rw - Config.handleW), rw, y, word, false);
    //rv.x = word.leftX + rw - Config.handleW;
    rv.x = word.tempX + word.tempW - Config.handleW;
    rv.y = word.y;

    return rv;
    //return {x, y:word.rightHandle.bbox().y};
  }


function checkIfCanDragRightHandleRight(x, y, word) {

    var rw = Math.max( Math.min(word.getMaxWidth(), (x - word.leftX + Config.handleW) ), word.getMinWidth() );

    setWordToXW(word, word.leftX, rw);

    var rv = checkIfCanMoveRight(x - (rw - Config.handleW), rw, y, word, false);
    //rv.x = word.leftX + rw - Config.handleW;
   // rv.x = word.rightX - Config.handleW;
      rv.x = word.tempX + word.tempW - Config.handleW;
      rv.y = word.y;
    // return {x, y:word.rightHandle.bbox().y};

    return rv;
}


function checkIfCanMoveRight(x, w, y, word, adjustWidth) {

  //console.log("....checking " + word.val); 
  var posInRow = word.row.words.indexOf(word);
  var rx = x;
  var ry = y;
  var didJump = false;


  /* Make sure the x value is in a legal position, if not, shift it right to a legal position */

  //am i *not* the first word (or only word) in this row?
  if (posInRow > 0) {
    //then make sure that I am greater than previous word x + w
    var prevWord = word.row.words[posInRow - 1];
    var prevWordX;
    var prevWordW;

    if (prevWord.needsUpdate) {
      prevWordX = prevWord.tempX;
      prevWordW = prevWord.tempW;
    } else {
      prevWordX = prevWord.bbox.x;
      prevWordW = prevWord.bbox.w;
    }

    //make sure our X val isn't *before* the rightX of the previous word

    if (x < prevWordX + prevWordW) {
      var origXW = word.rightX;
      rx = prevWordX + prevWordW;
      w = origXW - rx;
    } 
  } else {
    //make sure our X val isn't *before* the leftmost Config.edgePadding
    if (x < Config.edgePadding) {
      var origXW = word.rightX;
      rx = Config.edgePadding;
      w = origXW - rx;
    } 
  }


  w = Math.max( Math.min(w, word.getMaxWidth()), word.getMinWidth()) ;
 

  /* Check to see if the word needs to jump to the next row */

  //am i the last word (or only word) in this row?
  if (posInRow == word.row.words.length - 1) {

    //did i hit the right side of the row?
    if (x+w > Config.svgWidth - (Config.edgePadding)) {

      if (word.row.idx == rows.length - 1 ) { //then we're on the last row
        appendRow();
      }

      var vals = moveWordDownARow(word);

      //handle drag offset if i am dragging this word
      if (word == rowOffsetWord) {
        rowOffsetX -= (Config.svgWidth - (2*Config.edgePadding) - (w) );
      }

      rx = vals.x;
      ry = vals.y;

      didJump = true; //will check the *new* last word on this row to see if it needs to jump as well, after I've repositioned the other words 
    }
  }

  /* Set new position of this word */
  setWordToXW(word, rx, w);

  /* Does it push into the next word? */
  posInRow = word.row.words.indexOf(word);

  if (posInRow < word.row.words.length - 1) {
    var nextWord = word.row.words[posInRow + 1];
    var nextWordX;
    var nextWordW;

    if (nextWord.needsUpdate) {
      nextWordX = nextWord.tempX;
      nextWordW = nextWord.tempW;
    } else {
      nextWordX = nextWord.bbox.x;
      nextWordW = nextWord.bbox.w;
    }

    if (rx + w > nextWordX) { //then need to push the next word
      checkIfCanMoveRight(rx + w, nextWordW, nextWord.underneathRect.y(), nextWord, false);
    }
  }

  /* If this word jumped to new row, check to see if the *new* last word of the original row also needs to jump - This can happen if a really big word jumps onto the row */
  if (didJump && rows[word.row.idx - 1].words.length > 0) {

    prevRow = rows[word.row.idx - 1];

      var prevWord = prevRow.words[prevRow.words.length - 1];
      var prevWordX;
      var prevWordW;

      if (prevWord.needsUpdate) {
        prevWordX = prevWord.tempX;
        prevWordW = prevWord.tempW;
      } else {
        prevWordX = prevWord.bbox.x;
        prevWordW = prevWord.bbox.w;
      }

      checkIfCanMoveRight(prevWordX, prevWordW, y, prevWord, false);
  }

  return {x:rx, y:ry};
}


function checkIfCanMoveLeft(x, w, y, word, adjustWidth) {
  var posInRow = word.row.words.indexOf(word);
  var rx = x;
  var ry = y;

  /* If this is the first word, check if can jump up a row */
  if (posInRow == 0) {

    //did i hit the left side of the row?
    if (x < Config.edgePadding) {

      if (word.row.idx > 0 && checkIfSpaceToMoveUpARow(w, rows[word.row.idx - 1]) == true) {
        moveWordUpARow(word);

        //handle drag offset if i am dragging this word
        if (word == rowOffsetWord) {
          rowOffsetX += (Config.svgWidth - (2*Config.edgePadding) - (w) );
        }

        rx = Config.svgWidth - Config.edgePadding - w;
        ry = word.bbox.y;

        //refire this checkIfCanMoveLeft, since it will push words on the previous row out of the way, if needed -- may break up this method into little pieces so can fire something more granular
        checkIfCanMoveLeft(rx, w, y, word, false);

      } else {
        rx = Config.edgePadding; //on top row, so can't move left of left margin
      }
    }
  }

  /* Does the word need to push the previous word out of the way? */
  posInRow = word.row.words.indexOf(word);

  if (posInRow > 0) {
    var prevWord = word.row.words[posInRow - 1];
    var prevWordX;
    var prevWordW;

    if (prevWord.needsUpdate) {
      prevWordX = prevWord.tempX;
      prevWordW = prevWord.tempW;
    } else {
      prevWordX = prevWord.bbox.x;
      prevWordW = prevWord.bbox.w;
    }

    if (rx < prevWordX + prevWordW) {
      //yes it does, can the previous word move out of the way?
      var inc = (prevWordX + prevWordW) - rx;
      //try to move prevWord (inc) units to the left
      var uvals = checkIfCanMoveLeft(prevWordX - inc, prevWordW, y, prevWord, false);

      //if the prevWord hasn't jumped up a row, then make sure we aren't overlapping (ie, if prevword *can't* move) 
      if (prevWord.row.idx == word.row.idx) {
        rx = uvals.x + prevWordW;
      } 
    } 
  }


  if (adjustWidth == true) { //if moving left handle, need to get correct width 
    rw = word.rightX - rx;

    //if rw > maxWidth, then set to maxWidth
    rw = Math.max( Math.min(rw, word.getMaxWidth()), word.getMinWidth()) ;
    //in rare cases, if window width is small, maxWidth can be < minWidth!

  } else {
    rw = w;
  }

  //rw = Math.max( Math.min(rw, word.getMaxWidth()), word.getMinWidth()) ;
 
  setWordToXW(word, rx, rw);


  return {x:rx, y:ry};


}

function moveWordToNewPosition(w, nx, ny) {

  w.tempX = nx;
  w.tempW = w.bbox.w;
  
  w.underneathRect.x(nx);
  w.underneathRect.y(ny);

  w.bbox = w.underneathRect.bbox();
  w.leftX = nx; 
  w.rightX = nx + w.bbox.w;

  w.percPos = (w.leftX-Config.edgePadding) / (Config.svgWidth-Config.edgePadding*2);


  w.text.x(nx + (w.bbox.w/2) - (w.text.bbox().w/2)  ); 
  w.text.y(ny + Config.textPaddingY*2); // - texts.wordText.descent);



  //TODO - make these match original position - the Y pos for text is off for tags and words - why isn't the text descent needed here?? ny and w.wy should be (and is!) the same - but the text y pos is a few pixels off! 
  //Looks like the entire row size jumps one pixel when adding a new row... think this may cause the 1 px differentce
  
  if (w.tag != null) {
    w.tagtext.x(nx + (w.bbox.w/2) - (w.tagtext.bbox().w/2)  ); 
    w.tagtext.y(ny + Config.textPaddingY/2);// - texts.tagText.descent);
  }

  console.log("ny = " + ny);
  console.log("w.wy = " + w.wy);
  console.log("w.text.y = " + w.text.y());





  var handley = ny + ( w.wh / 2 ) - ( Config.handleH / 2 ); 
  w.leftHandle.x(nx);
  w.leftHandle.y(handley);

  w.rightHandle.x( w.rightX - Config.handleW );
  w.rightHandle.y(handley);

  w.needsUpdate = true;

}


function setWordToXW(word, xval, wval) {

  word.tempX = xval;
  word.tempW = wval;
  word.needsUpdate = true;

}

function dragWord(x, y, word) {

  var dragDir = checkDragDirection(x);

  if (dragDir == directions.BACKWARD) {
    return checkIfCanMoveLeft(x + rowOffsetX, word.underneathRect.bbox().width, y, word, false);
  } else if (dragDir == directions.FORWARD) {
    return checkIfCanMoveRight(x + rowOffsetX, word.underneathRect.bbox().width, y, word, false);
  } else {
    return {x:word.underneathRect.bbox().x, y:word.underneathRect.bbox().y};
  }
}

function checkIfSpaceToMoveUpARow(width, prevRow) {
  var cw = width;
  var rowWidth = Config.svgWidth - (Config.edgePadding*2);

  for (var i = prevRow.words.length - 1; i >= 0; i--) {
    prevWord = prevRow.words[i];
    cw += prevWord.bbox.w;

    if (cw > rowWidth) {

      if (prevRow.idx == 0) { //on first row, so doesn't fit!
        return false;
      }

      var pw = 0;
      for (var ii = i; ii >= 0; ii--) {
        pw += prevWord.bbox.w;
      }

      return checkIfSpaceToMoveUpARow(pw, rows[prevRow.idx - 1]);

    } 
  }

  return true;
}


function checkIfSpaceToMoveDownARow(width, nextRow) {

  var cw = width;
  var rowWidth = Config.svgWidth - (Config.edgePadding*2);

  //how many words on the next row would have to move forward for this word to fit on the next row?
  for (var i = 0; i < nextRow.words.length; i++) {
    nextWord = nextRow.words[i];
    cw += nextWord.bbox.w;

    if (cw > rowWidth) {
      //console.log("no, width doesn't fit on this row #... " + nextRow.idx);

      if (nextRow.idx == rows.length - 1) { //on last row, so doesn't fit!
        return false;
      }

      var nw = 0;
      for (var ii = i; ii < nextRow.words.length; ii++) {
        nw += nextWord.bbox.w;
      }

      return checkIfSpaceToMoveDownARow(nw, rows[nextRow.idx + 1]);

    } else {
      //console.log("yes, word does fit on this row #... " + nextRow.idx);
    }
  }

  return true;
}

function moveWordDownARow(w) {

  // console.log("in moveWordDownARow:, word row was... = " + w.row.idx);
  
  var currentRowIdx = w.row.idx;
  var nextRowIdx = w.row.idx + 1;

  var w = rows[currentRowIdx].words.pop();
  rows[nextRowIdx].words.unshift(w);
  w.row = rows[nextRowIdx];
  var nx = Config.edgePadding;
  var ny = w.row.ry + w.row.rh - w.wh;


  moveWordToNewPosition(w, nx, ny);

  for (var i = 0; i < rows.length; i++) {
    calculateMaxSlotForRow(rows[i]);
  }

  updateLinkRow(nextRowIdx);
  return {x:nx, y:ny};
}

function moveWordUpARow(w) {

  var currentRowIdx = w.row.idx;
  var nextRowIdx = w.row.idx - 1;

  var w = rows[currentRowIdx].words.shift();
  rows[nextRowIdx].words.push(w);
  w.row = rows[nextRowIdx];

  var nx;
  var ny = w.row.ry + w.row.rh - w.wh;

  if (w.needsUpdate) {
    nx = Config.svgWidth - Config.edgePadding - w.tempW;
  } else {
    nx = Config.svgWidth - Config.edgePadding - (w.rightX - w.leftX); //w.aboveRect.width();
  }

  moveWordToNewPosition(w, nx, ny);

  //completely remove last row if it is empty
  if (rows[rows.length-1].words.length == 0) {
    removeLastRow();
  }

  for (var i = 0; i < rows.length; i++) {
    calculateMaxSlotForRow(rows[i]);
  }

  updateLinkRow(nextRowIdx);
  return {x:nx, y:ny};

}


function setUpWordDraggable(word) {

  addDragStartingAndEndingListeners(word.underneathRect);

  var dragEvent = word.underneathRect.draggable(function(x,y) { 
    //return aaa(x,y);

    rowOffsetWord = word;

    var returnXY = dragWord(x, word.bbox.y, word);

    //console.log("in word.draggable");

    updateWords();

    redrawLinks(false); //actually - only redraw links that moving this word would affect + this row
    prevX = x;

    return returnXY;

  });

}

function dragRow(x, y, row) {

  var prevY = row.rect.bbox().y;
  //var prevY = row.bbox.y;
  var inc = y - prevY;

  var nextRowTooSmall = false;
  var nextY = 0;

  if (row.idx < rows.length - 1) {

    nextY = (rows[row.idx + 1].lineBottom.bbox().y - Config.wordHeight ) - (Config.dragRectSide + Config.dragRectMargin) - Config.rowPadding/2 ;

    if (y > nextY) {
      nextRowTooSmall = true;
    }
  }

  //check that this row height is not smaller than the max word height in the row

  if (inc + Config.dragRectSide + Config.dragRectMargin < Config.wordHeight) {
    row.rect.height(Config.wordHeight);
    y = row.rect.bbox().y + row.rect.bbox().h - (Config.dragRectSide + Config.dragRectMargin);
    row.lineBottom.y(y + Config.dragRectSide + Config.dragRectMargin);
  } else if (row.idx < rows.length - 1 && nextRowTooSmall == true) { //check that this row is not expanding so large that it is bigger than the next row's smallest size
    y = nextY; 
    row.lineBottom.y(y + Config.dragRectSide + Config.dragRectMargin );
    row.rect.height((y - prevY) + Config.dragRectSide + Config.dragRectMargin);
  } else { //this y val is fine
    row.rect.height(inc + Config.dragRectSide + Config.dragRectMargin);
    row.lineBottom.y(y + Config.dragRectSide + Config.dragRectMargin);
  }

  row.ry = row.rect.y();
  row.rh = row.rect.height();
    

  for (var i = 0; i < row.words.length; i++) {
    setWordToY(row.words[i], row.lineBottom.bbox().y - row.words[i].underneathRect.height() );
    //updateLinksOfWord(row.words[i]);
  }

  row.baseHeight = row.lineBottom.y() - (Config.textPaddingY*2) - texts.wordText.maxHeight;


  if (row.idx < rows.length - 1) {

    var nextrow = rows[row.idx + 1];
    nextrow.rect.y(row.rect.bbox().y + row.rect.bbox().h + Config.rowPadding/2);
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
  if (row.idx == rows.length - 1) {
   changeSizeOfSVGPanel(window.innerWidth - 16, row.lineBottom.y() + 1)
  }

  var returnVal = {x:row.dragRect.bbox().x, y:y}; 

  return returnVal;
}


function setWordToY(word, wy) {
  word.underneathRect.y(wy);
  word.bbox = word.underneathRect.bbox();
  word.underneathRect.y(wy);  
  word.leftHandle.y(wy);  
  word.rightHandle.y(wy);  
  word.text.y(word.bbox.y + Config.textPaddingY*2);
  
 if (word.tag != null) { 
  word.tagtext.y(word.bbox.y + Config.textPaddingY/2); 
 }
}

function setUpRowDraggable(row) {

  addDragStartingAndEndingListeners(row.dragRect);

  row.dragRect.draggable(function(x, y) {
    var returnVal = dragRow(x, y, row);
    redrawLinks(false); //actually - only redraw links that moving this word would affect + this row?

    return returnVal;
  });




}


