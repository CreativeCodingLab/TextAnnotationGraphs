
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


function setupMouseOverInteractions(word) {
  word.rectSVG.mouseover( function() { mover(word) }  );
  word.rectSVG.mouseout( function() { mout(word) }  );
  word.leftHandle.mouseover( function() { mover(word) }  );
  word.leftHandle.mouseout( function() { mout(word) }  );

  word.rightHandle.mouseover( function() { mover(word) }  );
  word.rightHandle.mouseout( function() { mout(word) }  );

   word.rectSVG.mousemove( function() {  
   //  console.log("touchleave!");  
   }  );
  
}


function mover(word){
  // console.log("in mover for " + word.val);

  
  word.isHovered = true;

  if (word.isSelected) {
    word.underneathRect.style(styles.wordFill.hoverAndSelect);
  } else {
   word.underneathRect.style(styles.wordFill.hover);
  }

    if (isDragging) {return;} 

  
  word.leftHandle.style(styles.handleFill.hover);
  word.rightHandle.style(styles.handleFill.hover);



}


function mout(word){
  // console.log("in mout for " + word.val);

  word.isHovered = false;
  if (isDragging) {return;} 

  if (word.isSelected) {
   word.underneathRect.style(styles.wordFill.select);
  } else {
    word.underneathRect.style(styles.wordFill.style);
  }

  word.leftHandle.style(styles.handleFill.style);
  word.rightHandle.style(styles.handleFill.style);

  // for (var i = 0; i < word.parentsL.length; i++) {
  //   var p = word.parentsL[i];

  //   for (var l = 0; l < p.lines.length; l++) {
  //     p.lines[l].stroke( {color: "#ff0000"} );
  //   }
  // }

  // console.log("length of parentsR??? = " + word.parentsR.length);
  // for (var i = 0; i < word.parentsR.length; i++) {
  //   var p = word.parentsR[i];

  //   for (var l = 0; l < p.lines.length; l++) {
  //     p.lines[l].stroke( {color: "#ff0000"} );
  //   }
  // }
}

function link_mover(link) {

  for (var i = 0; i < link.lines.length; i++) {

    link.lines[i].style(link.style.hover);
  }
}


function link_mout(link) {

 for (var i = 0; i < link.lines.length; i++) {
    link.lines[i].style(link.style.style);
  }
}

function setupLineInteractions(link) {
  function addInteraction(l) {
    l.mouseover( function() { link_mover(link) } );
    l.mouseout( function() { link_mout(link) }  );
  }
  
  
  if (link.labelRect) { 
    link.labelRect.forEach(addInteraction);
  }
  link.lines.forEach(addInteraction);
  
  //link.r1.mouseover( function() { link_mover(link) }  );
  //link.r2.mouseover( function() { link_mover(link) }  );

}

//function dragend
//SVG.on(window, "dragend", function(e) {
//  console.log("DRAG END!  " + e.detail); // Prints "Example of an event"
//});
//window.addEventListener('dragend', function(e) {
//  console.log("DRAG END!  " + e.detail); // Prints "Example of an event"
//});



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

    if (dragElem instanceof Word) { //also check if x,y has changed, since even a click in place will trigger a dragEnd, which we don't want 
   
      //dragElem.leftHandle.style(styles.handleFill.style);
      //dragElem.rightHandle.style(styles.handleFill.style);

      //updateWords();   
    
      realignWords(); //overkill?

  
      dragElem = null;

    
    }

  })

}

function updateWords() {

  for (var i = 0; i < wordObjs.length; i++) {
    var w = wordObjs[i];

    if (w.needsUpdate == true) {
      //console.log(w.val + " needs updating");
      w.update();
      w.needsUpdate = false; 
    }
  }
}

function dragArrow (arrow, link, word, side, leftX, rightX) {

  addDragStartingAndEndingListeners(arrow);

  arrow.draggable(function(x, y) {

    var linkWidth = ( (rightX) - (leftX) );

    if (side == sides.LEFT) {
      var xPos = (x - leftX) + arrowW; 
      //console.log("x = " + x + ", xPos = " + xPos);

      var percentage = xPos / (linkWidth/2);
      var ux = x;

      if (percentage < 0.0) {
        percentage = 0.0;
        ux = leftX - arrowW;
      } else if (percentage > 2.0) {
        percentage = 2.0;
        ux = leftX - arrowW + (linkWidth/2);
      }
    } else if (side == sides.RIGHT) { 

      var xPos = linkWidth - ((x - leftX) + arrowW); 

      var percentage = xPos / (linkWidth/2);
      var ux = x;

      if (percentage < 0.0) {
        percentage = 0.0;
        ux = leftX - arrowW;
      } else if (percentage > 2.0) {
        percentage = 2.0;
        ux = leftX - arrowW + (linkWidth);
      }
    }

    if (word == link.leftWord) {
      link.x1percent = percentage;
    } else {
      link.x2percent = percentage;
    }

    redrawLinks();

    return { x:ux, y: arrow.bbox().y }
  });
}

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

function setUpLeftHandleDraggable(leftHandle, rect, text, word, i) {

  addDragStartingAndEndingListeners(leftHandle);

  leftHandle.draggable(function(x, y) {
    rowOffsetWord = word;

    var returnVal = dragLeftHandle(x, leftHandle.bbox().y, word);
    
    //console.log("in leftHandle.draggable");
  
    updateWords();
  
    redrawLinks();//actually - only redraw links that moving this word would affect + this row
    prevX = x;
    return returnVal;
  });
}

function setUpRightHandleDraggable(rightHandle, rect, text, word, i) {

  addDragStartingAndEndingListeners(rightHandle);

  rightHandle.draggable(function(x, y) {
    rowOffsetWord = word;

    var returnVal = dragRightHandle(x, rightHandle.bbox().y, word);
    //console.log("in rightHandle.draggable");

       updateWords();
  
    redrawLinks(); //actually - only redraw links that moving this word would affect + this row
    prevX = x;
    return returnVal;
  });
}

function dragLeftHandle(x, y, word) {

  dragElem = word; //is this being used? TODO remove if not

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
    return rv;
  }

function checkIfCanDragLeftHandleRight(x, y, word) {

    var rw = Math.max( Math.min(word.getMaxWidth(), (word.rightX - x) ), word.getMinWidth() );

    setWordToXW(word, x, rw);

    var rv = checkIfCanMoveRight(x, rw, y, word, true);
    return rv;
}



function dragRightHandle(x, y, word) {

  dragElem = word;


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
    var rw = Math.max( Math.min(word.getMaxWidth(), (x - word.leftX + handleW)), word.getMinWidth() );

    setWordToXW(word, word.leftX, rw);

    var rv = checkIfCanMoveLeft(x - (rw - handleW), rw, y, word, false);
    rv.x = word.leftX + rw - handleW;
    return rv;
  }


function checkIfCanDragRightHandleRight(x, y, word) {

    var rw = Math.max( Math.min(word.getMaxWidth(), (x - word.leftX + handleW) ), word.getMinWidth() );

    setWordToXW(word, word.leftX, rw);

    var rv = checkIfCanMoveRight(x - (rw - handleW), rw, y, word, false);
    rv.x = word.leftX + rw - handleW;
    return rv;
}


function checkIfCanMoveRight(x, w, y, word, adjustWidth) {

  var posInRow = word.row.words.indexOf(word);
  var rx = x;
  var ry = y;

  //am i the last word (or only word) in this row?
  if (posInRow == word.row.words.length - 1) {

    //did i hit the right side of the row?
    //if (x + word.rect.w > svgWidth - edgepadding) {
    if (x + w > svgWidth - edgepadding) {

      //can I jump down to the next row?
      //if (word.row.idx < rows.length - 1 && checkIfSpaceToMoveDownARow(word.rect.w, rows[word.row.idx + 1]) == true) {
      if (word.row.idx < rows.length - 1 && checkIfSpaceToMoveDownARow(w, rows[word.row.idx + 1]) == true) {

        //yes, move to next row
        moveWordDownARow(word);
        rx = edgepadding;

        //handle drag offset if i am dragging this word
        if (word == rowOffsetWord) {
          //rowOffsetX -= (svgWidth -  (2*edgepadding) - (word.rectSVG.width() ) );
          rowOffsetX -= (svgWidth - (2*edgepadding) - (w) );
        }

        ry = word.rect.y;

        //refire this checkIfCanMoveRight, since it will push words on the next row out of the way, if needed -- may break up this method into little pieces so can fire something more granular
        checkIfCanMoveRight(rx, w, y, word, false);

      } else {
        //rx = svgWidth - edgepadding - word.rect.w; //do this instead if you don't want to make new rows just by dragging
        
        appendRow();

        moveWordDownARow(word);
        rx = edgepadding;

        //handle drag offset if i am dragging this word
        if (word == rowOffsetWord) {
          //rowOffsetX -= (svgWidth - (word.rect.w) - (2*edgepadding));
          rowOffsetX -= (svgWidth - (w) - (2*edgepadding));
        }

        ry = word.rect.y;

        //refire this checkIfCanMoveRight, since it will push words on the next row out of the way, if needed -- may break up this method into little pieces so can fire something more granular
        checkIfCanMoveRight(rx, w, y, word, false);

      }
    }
  } else if (posInRow < word.row.words.length - 1) {

   
    //i am not the last word in this row, am i hitting someone in front of me?
    var nextWord = word.row.words[posInRow + 1];
    var nextWordX;
    var nextWordW;

    if (nextWord.needsUpdate) {
      nextWordX = nextWord.tempX;
      nextWordW = nextWord.tempW;
    } else {
      nextWordX = nextWord.rect.x;
      nextWordW = nextWord.rect.w;
    }
  
   // w = word.rightX - x; 
  //  console.log("tempX = " + word.tempX + ", x = " + x);
  //  console.log(" x = " + x + ", w = " + w + "\n(x+w) " + (x+w) + " > nextWordX = " + nextWordX);
    //if (x + word.rect.w > nextWordX) {
    if (x + w > nextWordX) {
      //yes I am, can that word move out of the way?

      //var inc = (x + word.rect.w) - nextWordX;
      var inc = (x + w) - nextWordX;
      var uvals = checkIfCanMoveRight(nextWordX + inc, nextWordW, y, nextWord, false);

      //check if the word we've hit has jumped a row
      if (nextWord.row.idx == word.row.idx) {
        //rx = uvals.x - word.rect.w;
        rx = uvals.x - w;
      } //else it jumped a row, so keep rx the same
    } 
  } 
 
    
  //recheck posInRow, it might have changed if a word jumped a row
  posInRow = word.row.words.indexOf(word);

  if (posInRow > 0) {

    var prevWord = word.row.words[posInRow - 1];
    var prevWordX;
    var prevWordW;
    
    if (prevWord.needsUpdate) {
      prevWordX = prevWord.tempX;
      prevWordW = prevWord.tempW;
    } else {
      prevWordX = prevWord.rect.x;
      prevWordW = prevWord.rect.w;
    }
   
    if (rx < prevWordX + prevWordW ) {
      rx = prevWordX + prevWordW;
    }
  } else { //first one in row
    if (rx < edgepadding) {
      rx = edgepadding;
    }
  }
  


  var rw;
  if (adjustWidth == true) {
    rw = word.rightX - rx;
  } else {
    //rw = word.rectSVG.width();
    rw = w;
  }

  //if rw > maxWidth, then set to maxWidth
  rw = Math.min(rw, word.getMaxWidth());

  //in rare cases, if window width is small, maxWidth > minWidth!
  rw = Math.max(rw, word.getMinWidth());

  //console.log("in checkIfCanMoveRight: about to call setWordToXW");
  setWordToXW(word, rx, rw);

  return {x:rx, y:ry};
}


function checkIfCanMoveLeft(x, w, y, word, adjustWidth) {

  //console.log("word = " + word.val);
  var posInRow = word.row.words.indexOf(word);

  var rx = x;
  var ry = y;

  //am i the first word in this row?
  if (posInRow == 0) {

    //did i hit the left side of the row?
    if (x < edgepadding) {

      //can I jump up to the previous row?
      //if (word.row.idx > 0 && checkIfSpaceToMoveUpARow(word.rect.w, rows[word.row.idx - 1]) == true) {
      if (word.row.idx > 0 && checkIfSpaceToMoveUpARow(w, rows[word.row.idx - 1]) == true) {

        //yes, move to previous row
        moveWordUpARow(word);
        //rx = svgWidth - edgepadding - word.rect.w;
        rx = svgWidth - edgepadding - w;

        //handle drag offset if i am dragging this word
        if (word == rowOffsetWord) {
          //rowOffsetX += (svgWidth - (word.rect.w) - (2*edgepadding));
          rowOffsetX += (svgWidth - (w) - (2*edgepadding));
        }

        ry = word.rect.y;

         //refire this checkIfCanMoveLeft, since it will push words on the previous row out of the way, if needed -- may break up this method into little pieces so can fire something more granular
        checkIfCanMoveLeft(rx, w, y, word, false);

      } else {
        rx = edgepadding; //on top row, so can't move left of left margin
      }
    }
  } else if (posInRow > 0) {

    //i am not the first word in this row, am i hitting someone in behind me?

    var prevWord = word.row.words[posInRow - 1];
    var prevWordX;
    var prevWordW;

    if (prevWord.needsUpdate) {
      prevWordX = prevWord.tempX;
      prevWordW = prevWord.tempW;
    } else {
      prevWordX = prevWord.rect.x;
      prevWordW = prevWord.rect.w;
    }

    if (x < prevWordX + prevWordW) {
      //yes I am, can that word move out of the way?
      var inc = (prevWordX + prevWordW) - x;
      //try to move prevWord (inc) units to the left
      var uvals = checkIfCanMoveLeft(prevWordX - inc, prevWordW, y, prevWord, false);

      //check if the word we've hit has jumped a row
      if (prevWord.row.idx == word.row.idx) {
        rx = uvals.x + prevWordW;
      } //else it jumped a row, so keep rx the same
    } 
  }

    
  //recheck posInRow, it might have changed if a word jumped a row
  posInRow = word.row.words.indexOf(word);

  if (posInRow < word.row.words.length - 1) {

    var nextWord = word.row.words[posInRow + 1];
    var nextWordX;
    var nextWordW;

    if (nextWord.needsUpdate) {
      nextWordX = nextWord.tempX;
      nextWordW = nextWord.tempW;
    } else {
      nextWordX = nextWord.rect.x;
      nextWordW = nextWord.rect.w;
    }

    //if (rx + word.rect.w > word.row.words[posInRow + 1].rect.x) {
    if (rx + w > nextWordX) {
      //rx = Math.max(edgepadding, word.row.words[posInRow + 1].rect.x - word.rect.w);
      rx = Math.max(edgepadding, nextWordX - w);
    }
  } else { //last one in row
    
    //if (rx + word.rect.w > svgWidth - edgepadding) {
    if (rx + w > svgWidth - edgepadding) {
      //rx = svgWidth - edgepadding - word.rect.w;
      rx = svgWidth - edgepadding - w;
    }
  }
    

  var rw;

  if (adjustWidth == true) {
    //rw = w;
    rw = word.rightX - rx;
  } else {
    //rw = word.rectSVG.width();
    rw = w;
  }

  //if rw > maxWidth, then set to maxWidth
  rw = Math.min(rw, word.getMaxWidth());

  //in rare cases, if window width is small, maxWidth can be < minWidth!
  rw = Math.max(rw, word.getMinWidth());

  setWordToXW(word, rx, rw);

  return {x:rx, y:ry};
}


function setWordToXW(word, xval, wval) {

  word.tempX = xval;
  word.tempW = wval;
  word.needsUpdate = true;
  //console.log("\n***\nin setWordToXW");
 
 /* 
  word.rectSVG.x(xval);
  word.rectSVG.width(wval);
  word.rect = word.rectSVG.bbox();

  word.text.x(xval + (wval/2) - (word.text.bbox().w / 2) ); 
  word.leftX = xval; 
  word.rightX = xval + wval;

  word.percPos = (word.leftX-edgepadding) / (svgWidth-edgepadding*2);
  word.leftHandle.x(xval);
  word.rightHandle.x(word.rightX - handleW);

  word.underneathRect.x(xval);
  word.underneathRect.width(wval);
  //console.log("out setWordToXW\n***\n");
 */
  
}

function dragWord(x, y, word) {

  dragElem = word; 

  var dragDir = checkDragDirection(x);

  if (dragDir == directions.BACKWARD) {
    return checkIfCanMoveLeft(x + rowOffsetX, word.rectSVG.width(), y, word, false);
  } else if (dragDir == directions.FORWARD) {
    return checkIfCanMoveRight(x + rowOffsetX, word.rectSVG.width(), y, word, false);
  } else {
    return {x:word.rectSVG.bbox().x, y:word.rectSVG.bbox().y};
  }
}

function checkIfSpaceToMoveUpARow(width, prevRow) {
  var cw = width;
  var rowWidth = svgWidth - (edgepadding*2);

  for (var i = prevRow.words.length - 1; i >= 0; i--) {
    prevWord = prevRow.words[i];
    cw += prevWord.rect.w;

    if (cw > rowWidth) {
      //console.log("no, width doesn't fit on this row #... " + prevRow.idx);

      if (prevRow.idx == 0) { //on first row, so doesn't fit!
        return false;
      }

      var pw = 0;
      for (var ii = i; ii >= 0; ii--) {
        pw += prevWord.rect.w;
      }

      return checkIfSpaceToMoveUpARow(pw, rows[prevRow.idx - 1]);

    } else {
      //console.log("yes, word does fit on this row #... " + prevRow.idx);
    }
  }

  return true;
}


function checkIfSpaceToMoveDownARow(width, nextRow) {

  var cw = width;
  var rowWidth = svgWidth - (edgepadding*2);

  //how many words on the next row would have to move forward for this word to fit on the next row?
  for (var i = 0; i < nextRow.words.length; i++) {
    nextWord = nextRow.words[i];
    cw += nextWord.rect.w;

    if (cw > rowWidth) {
      //console.log("no, width doesn't fit on this row #... " + nextRow.idx);

      if (nextRow.idx == rows.length - 1) { //on last row, so doesn't fit!
        return false;
      }

      var nw = 0;
      for (var ii = i; ii < nextRow.words.length; ii++) {
        nw += nextWord.rect.w;
      }

      return checkIfSpaceToMoveDownARow(nw, rows[nextRow.idx + 1]);

    } else {
      //console.log("yes, word does fit on this row #... " + nextRow.idx);
    }
  }

  return true;
}

function moveWordToNewPosition(w, nx, ny) {

  updateWords();

  w.rectSVG.x(nx);
  w.rectSVG.y(ny);

  w.rect = w.rectSVG.bbox();
  w.leftX = nx; 
  w.rightX = nx + w.rect.w;

  w.percPos = (w.leftX-edgepadding) / (svgWidth-edgepadding*2);

  w.underneathRect.x(nx);
  w.underneathRect.y(ny);

  w.text.x(nx + (w.rect.w/2) - (w.text.bbox().w/2)  ); 
  w.text.y(ny + textpaddingY);

  var handley = ny + ( w.wh / 2 ) - ( handleH / 2 ); 
  w.leftHandle.x(nx);
  w.leftHandle.y(handley);

  w.rightHandle.x( w.rightX - handleW );
  w.rightHandle.y(handley);

  //need to handle updating percentages for links, eg, if we've moved a word with links that have higher slots than any other word previously associated with this row.
}

function moveWordDownARow(w) {

  var currentRowIdx = w.row.idx;
  var nextRowIdx = w.row.idx + 1;
  var w = rows[currentRowIdx].words.pop();
  rows[nextRowIdx].words.unshift(w);
  w.row = rows[nextRowIdx];
  var nx = edgepadding;
  var ny = w.row.rect.bbox().y + w.row.rect.bbox().h - w.wh;

  moveWordToNewPosition(w, nx, ny);

  for (var i = 0; i < rows.length; i++) {
    calculateMaxSlotForRow(rows[i]);
  }

}

function moveWordUpARow(w) {

  var currentRowIdx = w.row.idx;
  var nextRowIdx = w.row.idx - 1;

  var w = rows[currentRowIdx].words.shift();
  rows[nextRowIdx].words.push(w);
  w.row = rows[nextRowIdx];
  var nx = svgWidth - edgepadding - w.rectSVG.width();
  var ny = w.row.rect.bbox().y + w.row.rect.bbox().h - w.wh;

  moveWordToNewPosition(w, nx, ny);

  //completely remove last row if it is empty
  if (rows[rows.length-1].words.length == 0) {
    removeLastRow();
  }

  for (var i = 0; i < rows.length; i++) {
    calculateMaxSlotForRow(rows[i]);
  }
}


function setUpWordDraggable(word) {

  addDragStartingAndEndingListeners(word.rectSVG);

  /*
     var aaa = function(x,y) {
     rowOffsetWord = word;

     var returnXY = dragWord(x, word.rect.y, word);

     redrawLinks(); //actually - only redraw links that moving this word would affect + this row
     prevX = x;

     return returnXY;
     }
     */

  var dragEvent = word.rectSVG.draggable(function(x,y) { 
    //return aaa(x,y);

    rowOffsetWord = word;

    var returnXY = dragWord(x, word.rect.y, word);

    //console.log("in word.draggable");
  
    updateWords();

      redrawLinks(); //actually - only redraw links that moving this word would affect + this row
    prevX = x;

    return returnXY;

  });

  //var dragEvent = word.rectSVG.draggable(bbb, 1000);
  //var dragEvent = bbb;

}

function dragRow(x, y, row) {

  var prevY = row.rect.bbox().y;
  var inc = y - prevY;

  var nextRowTooSmall = false;
  var nextY = 0;

  if (row.idx < rows.length - 1) {

    nextY = (rows[row.idx + 1].lineBottom.bbox().y - wordHeight ) - (dragRectSide + dragRectMargin) - 5 ;

    if (y > nextY) {
      nextRowTooSmall = true;
    }
  }

  //check that this row is not smaller than the word size in the row

  if (inc + dragRectSide + dragRectMargin < wordHeight) {
    row.rect.height(wordHeight);
    y = row.rect.bbox().y + row.rect.bbox().h - (dragRectSide + dragRectMargin);
    row.lineBottom.y(y + dragRectSide + dragRectMargin);
  } else if (row.idx < rows.length - 1 && nextRowTooSmall == true) { //check that this row is not expanding so large that it is bigger than the next row's smallest size
    y = nextY; 
    row.lineBottom.y(y + dragRectSide + dragRectMargin );
    row.rect.height((y - prevY) + dragRectSide + dragRectMargin);
  } else { //this y val is fine
    row.rect.height(inc + dragRectSide + dragRectMargin);
    row.lineBottom.y(y + dragRectSide + dragRectMargin);
  }

  for (var i = 0; i < row.words.length; i++) {
    setWordToY(row.words[i], row.lineBottom.bbox().y - row.words[i].rectSVG.height() );
  }

  row.baseHeight = row.lineBottom.y() - (textpaddingY*2) - texts.wordText.maxHeight;


  if (row.idx < rows.length - 1) {

    var nextrow = rows[row.idx + 1];
    nextrow.rect.y(row.rect.bbox().y + row.rect.bbox().h + 5);
    nextrow.rect.height( nextrow.dragRect.bbox().y - y - (5));

    nextrow.lineTop.y(row.rect.bbox().y + row.rect.bbox().h + 5);
  }

  var returnVal = {x:row.dragRect.bbox().x, y:y}; 

  return returnVal;
}


function setWordToY(word, wy) {
  word.rectSVG.y(wy);
  word.rect = word.rectSVG.bbox();
  word.underneathRect.y(wy);  
  word.leftHandle.y(wy);  
  word.rightHandle.y(wy);  
  word.text.y(word.rect.y + textpaddingY); 
}

function setUpRowDraggable(row) {

  addDragStartingAndEndingListeners(row.dragRect);

  row.dragRect.draggable(function(x, y) {
    var returnVal = dragRow(x, y, row);
   redrawLinks(); //actually - only redraw links that moving this word would affect + this row?

    return returnVal;
  });




}


