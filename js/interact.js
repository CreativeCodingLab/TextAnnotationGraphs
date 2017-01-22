
function mdown(myrect, word){
  console.log("in mdown!");
  console.log(word);
  console.log(myrect.bbox());
  word.isSelected = true;
}

function mup(myrect, word){
  console.log("in mup!");
  console.log(word);
  console.log(myrect.bbox());
  word.isSelected = false;
}

function mmove(myrect, word){
  console.log("in mmove!");
  console.log(word);
  console.log(myrect.bbox());

  if (word.isSelected == true) {
    console.log("you are moving this guy!");
  }
}

function mclick(myrect, word){
  console.log("in mclick!");
  console.log(word);
  console.log(myrect.bbox());
}


function setupMouseOverInteractions(word) {
  word.rectSVG.mouseover( function() { mover(word) }  );
  word.rectSVG.mouseout( function() { mout(word) }  );
  word.leftHandle.mouseover( function() { mover(word) }  );
  word.leftHandle.mouseout( function() { mout(word) }  );

  word.rightHandle.mouseover( function() { mover(word) }  );
  word.rightHandle.mouseout( function() { mout(word) }  );

   word.rectSVG.mousemove( function() {  console.log("touchleave!");  }  );
  
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

document.addEventListener("dragend", 
    function(e) {
      //console.log("DRAG END!  " + e.detail); // Prints "Example of an event"
    },false);

function addDragStartingAndEndingListeners(elem) {

  elem.on('dragstart', function() {
    isDragging = true;
    //isCanceling = false;
    //console.log("isDragging = " + isDragging);
    //console.log("elem = " + elem + " rect x = " + elem.bbox().x);
    prevX = elem.bbox().x;

  })

  elem.on('dragend', function(e) {
    isDragging = false;
    //isCanceling = false;
    if (rowOffsetWord && rowOffsetWord.isHovered == false) {
      mout(rowOffsetWord);
    }

    rowOffsetX = 0;
    rowOffsetWord = null;

    prevX = -1;
    //console.log("isDragging = " + isDragging);

    if (dragElem instanceof Word) { //also check if x,y has changed, since even a click in place will trigger a dragEnd, which we don't want 
   
      //dragElem.leftHandle.style(styles.handleFill.style);
      //dragElem.rightHandle.style(styles.handleFill.style);
      dragElem = null;
    }

  })

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
    } else { // side = RIGHT

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
    redrawLinks(); //actually - only redraw links that moving this word would affect + this row
    prevX = x;
    return returnVal;
  });
}

function dragLeftHandle(x, y, word) {

  dragElem = word;

  //rowOffsetWord = word;
   
  var dragDir = checkDragDirection(x);

  if (dragDir == directions.BACKWARD) {
    return checkIfCanDragLeftHandleLeft(x + rowOffsetX, y, word);
  } else if (dragDir == directions.FORWARD) {
    console.log("dragging... x=" + x + ", y = " + y);
    return checkIfCanDragLeftHandleRight(x + rowOffsetX, y, word);
  } else {
    //console.log("in dragLeftHandle, direction = " + dragDir);

    return {x:word.leftHandle.bbox().x, y:word.leftHandle.bbox().y};
  }
}

function dragRightHandle(x, y, word) {

  dragElem = word;


  var dragDir = checkDragDirection(x);

  if (dragDir == directions.BACKWARD) {
    return checkIfCanDragRightHandleLeft(x + rowOffsetX, y, word);
  } else if (dragDir == directions.FORWARD) {
    return checkIfCanDragRightHandleRight(x + rowOffsetX, y, word);
  } else {
    //console.log("in dragRightHandle, direction = " + dragDir);
    return {x:word.rightHandle.bbox().x, y:word.rightHandle.bbox().y};
  }
}

function checkIfCanDragRightHandleLeft(x, y, word) {
  var minWidth = Math.max(minWordWidth,word.tw);

  var rx, rw;
  var posInRow = word.row.words.indexOf(word);

  if (posInRow == word.row.words.length - 1 && x + handleW > svgWidth - edgepadding) {
    rx = svgWidth - edgepadding - handleW;
    rw = rx - word.leftX + handleW;
    setWordToXW(word, word.leftX, rw);
  } else if (posInRow < word.row.words.length - 1 && x + handleW > rows[word.row.idx].words[posInRow + 1].leftX) {
    rx = rows[word.row.idx].words[posInRow + 1].leftX - handleW;
    rw = rx - word.leftX + handleW;
    setWordToXW(word, word.leftX, rw);
  } else if (x + handleW - word.leftX < minWidth) {
    rx = word.leftX + minWidth - handleW;
    rw = minWidth;
    setWordToXW(word, word.leftX, rw);
         var rv = checkIfCanMoveLeft(x - (minWidth-handleW), y, word);
         rv.x += minWidth - handleW;
    return rv;

  } else {
    rx = x;
    rw = x - word.leftX + handleW;
    setWordToXW(word, word.leftX, rw);
  }

  return {x:rx, y:y};
}


function checkIfCanDragRightHandleRight(x, y, word) {
  var minWidth = Math.max(minWordWidth,word.tw);

  var rx, rw;
  var posInRow = word.row.words.indexOf(word);

  if (x < word.leftX + minWidth - handleW) {
    rx = word.leftX + minWidth - handleW;
    rw = minWidth;
    setWordToXW(word, word.leftX, rw);

  } else if (posInRow == word.row.words.length - 1 && x > (svgWidth - edgepadding - handleW) ) {
    rx = svgWidth - edgepadding - handleW;  
    setWordToXW(word, word.leftX, (svgWidth - edgepadding) - word.leftX);

  } else if (posInRow < word.row.words.length - 1 && x + handleW > word.row.words[posInRow + 1].leftX) {
    var nextWord = word.row.words[posInRow + 1];
    var inc = x + handleW - nextWord.leftX;
    var uvals = checkIfCanMoveRight(nextWord.leftX + inc, y, nextWord);

    //check if the word we've hit has jumped a row
    if (nextWord.row.idx == word.row.idx) {
      rx = uvals.x - handleW;
      setWordToXW(word, word.leftX, uvals.x - word.leftX);  
    } //else it jumped a row, so keep rx the same
  } else {
    rx = x; 
    rw = rx - word.leftX + handleW;
    setWordToXW(word, word.leftX, rw);
  } 

  return {x:rx, y:y};
}

function checkIfCanDragLeftHandleRight(x, y, word) {
  var minWidth = word.getMinWidth();
    var rx, rw;

  var posInRow = word.row.words.indexOf(word);

  if (posInRow == 0 && x < edgepadding) {

    rx = edgepadding;
    rw = word.rightX - edgepadding;


setWordToXW(word, rx, rw);

  } else if (posInRow > 0 && x < rows[word.row.idx].words[posInRow - 1].rightX) {
    rx = rows[word.row.idx].words[posInRow - 1].rightX;
    rw = word.rightX - rx;
setWordToXW(word, rx, rw);

  } else if (x > word.rightX - minWidth) {

    rx = word.rightX - minWidth;
    rw = minWidth;
    setWordToXW(word, rx, rw);
 
     var rv = checkIfCanMoveRight(x, y, word);
    return rv;
  } else {
    rx = x;
    rw = word.rightX - rx;
  setWordToXW(word, rx, rw);


  }

    return {x:rx, y:y};
}

function checkIfCanDragLeftHandleLeft(x, y, word) {
  var minWidth = Math.max(minWordWidth,word.tw);

  var rx, rw;
  var posInRow = word.row.words.indexOf(word);

  if (x > word.rightX - minWidth) {
    rx = word.rightX - minWidth;
    rw = minWidth; 
    //prob want to return here...
  } else {
    rx = x;
    rw = word.rect.w;
  }

  var ry = y;

  //am i the first word in this row?
  if (posInRow == 0) {

    //did i hit the left side of the row?
    if (x < edgepadding) {
      rx = edgepadding;
    }
  } else if (posInRow > 0) {

    //i am not the first word in this row, am i hitting someone in behind me?

    var prevWord = word.row.words[posInRow - 1];
    var prevWordX = prevWord.rect.x;
    var prevWordW = prevWord.rect.w;

    if (x < prevWordX + prevWordW) {
      //yes I am, can that word move out of the way?
      var inc = (prevWordX + prevWordW) - x;
      var uvals = checkIfCanMoveLeft(prevWordX - inc, y, prevWord);

      //check if the word we've hit has jumped a row
      if (prevWord.row.idx == word.row.idx) {
        rx = uvals.x + prevWordW;
      } //else it jumped a row, so keep rx the same
    } 
  }

  rw = word.rightX - rx;

  setWordToXW(word, rx, rw);
  return {x:rx, y:ry};
}

function setWordToXW(word, xval, wval) {

  //console.log("in setWordToXW, xval = " + xval);
  word.rectSVG.x(xval);
  word.rectSVG.width(wval);
  word.rect = word.rectSVG.bbox();

  word.text.x(xval + (wval/2) - (word.text.bbox().w / 2)  ); //padding);
  word.leftX = xval; 
  word.rightX = xval + wval;

  word.percPos = (word.leftX-edgepadding) / (svgWidth-edgepadding*2);
  
  word.leftHandle.x(xval);
  //console.log("leftHandle.bbox.x() = " + word.leftHandle.bbox().x);
  word.rightHandle.x(word.rightX - handleW);

  word.underneathRect.x(xval);
  word.underneathRect.width(wval);
}

function checkIfCanMoveLeft(x, y, word) {

  var posInRow = word.row.words.indexOf(word);

   //console.log("\nin checkIfCanMoveLeft, " + word.val + " is at posInRow " + posInRow);
 

  var rx = x;
  var ry = y;

  //am i the first word in this row?
  if (posInRow == 0) {

    //did i hit the left side of the row?
    if (x < edgepadding) {

      //console.log("" + word.val + " is < " + edgepadding);

      //can I jump up to the previous row?
      if (word.row.idx > 0 && checkIfSpaceToMoveUpARow(word.rect.w, rows[word.row.idx - 1]) == true) {

        //yes, move to previous row
        moveWordUpARow(word);
        rx = svgWidth - edgepadding - word.rect.w;

        //handle drag offset if i am dragging this word
        if (word == rowOffsetWord) {
          rowOffsetX += (svgWidth - (word.rect.w) - (2*edgepadding));
        }

        ry = word.rect.y;

        //refire this checkIfCanMoveLeft, since it will push words on the next row out of the way, if needed -- may break up this method into little pieces so can fire something more granular
        checkIfCanMoveLeft(rx, y, word);
      } else {
        
        rx = edgepadding;
        //console.log("so " + word.val + " rx = " + rx);

      }
    }
  } else if (posInRow > 0) {

    //i am not the first word in this row, am i hitting someone in behind me?
    
    var prevWord = word.row.words[posInRow - 1];
    var prevWordX = prevWord.rect.x;
    var prevWordW = prevWord.rect.w;

    if (x < prevWordX + prevWordW) {
      //yes I am, can that word move out of the way?
      var inc = (prevWordX + prevWordW) - x;
      var uvals = checkIfCanMoveLeft(prevWordX - inc, y, prevWord);
      
      //check if the word we've hit has jumped a row
      if (prevWord.row.idx == word.row.idx) {
        rx = uvals.x + prevWordW;
      } //else it jumped a row, so keep rx the same
    } 
  }

  //recheck posInRow, it might have changed if a word jumped a row
  posInRow = word.row.words.indexOf(word);
 
  if (posInRow < word.row.words.length - 1) {
    if (rx + word.rect.w > word.row.words[posInRow + 1].rect.x) {
      //rx = word.row.words[posInRow + 1].rect.x - word.rect.w;
      rx = Math.max(edgepadding, word.row.words[posInRow + 1].rect.x - word.rect.w);
    }
  } else { //last one in row
    if (rx + word.rect.w > svgWidth - edgepadding) {
      rx = svgWidth - edgepadding - word.rect.w;
    }
  }

  setWordToX(word, rx);
  return {x:rx, y:ry};
}


function checkIfCanMoveRight(x, y, word) {

  console.log("in checkIfCanMoveRight("+x+", " + word.id + ")");

  var posInRow = word.row.words.indexOf(word);
  var rx = x;
  var ry = y;

  //am i the last word in this row?
  if (posInRow == word.row.words.length - 1) {

    //did i hit the right side of the row?
    if (x + word.rect.w > svgWidth - edgepadding) {

      //can I jump down to the next row?
      if (word.row.idx < rows.length - 1 && checkIfSpaceToMoveDownARow(word.rect.w, rows[word.row.idx + 1]) == true) {

        //yes, move to next row
        moveWordDownARow(word);
        rx = edgepadding;

        //handle drag offset if i am dragging this word
        if (word == rowOffsetWord) {
          rowOffsetX -= (svgWidth -  (2*edgepadding) - (word.rectSVG.width() ) );
          //rowOffsetX = -(svgWidth - (word.rect.w) - (2*edgepadding));
          console.log("A rowOffsetX = " + rowOffsetX);
        }

        ry = word.rect.y;

        //refire this checkIfCanMoveRight, since it will push words on the next row out of the way, if needed -- may break up this method into little pieces so can fire something more granular
        checkIfCanMoveRight(rx, y, word);

      } else {
        //rx = svgWidth - edgepadding - word.rect.w ;
        
        //Trying out MAKE NEW ROW

        appendRow();

         //yes, move to next row
        moveWordDownARow(word);
        rx = edgepadding;

        //handle drag offset if i am dragging this word
        if (word == rowOffsetWord) {
          // rowOffsetX -= (svgWidth - (2*edgepadding) - word.rectSVG.width() + 20 );
    
          rowOffsetX -= (svgWidth - (word.rect.w) - (2*edgepadding));
          console.log("B rowOffsetX = " + rowOffsetX);

        }

        ry = word.rect.y;

        //refire this checkIfCanMoveRight, since it will push words on the next row out of the way, if needed -- may break up this method into little pieces so can fire something more granular
        checkIfCanMoveRight(rx, y, word);

      }
    }
  } else if (posInRow < word.row.words.length - 1) {
        //rx = svgWidth - edgepadding - word.rect.w ;

    //i am not the last word in this row, am i hitting someone in front of me?
    var nextWord = word.row.words[posInRow + 1];
    var nextWordX = nextWord.rect.x;

    if (x + word.rect.w > nextWordX) {
      //yes I am, can that word move out of the way?

      var inc = (x + word.rect.w) - nextWordX;
      //console.log("inc = " + inc);
      var uvals = checkIfCanMoveRight(nextWordX + inc, y, nextWord);

      //check if the word we've hit has jumped a row
      if (nextWord.row.idx == word.row.idx) {
        rx = uvals.x - word.rect.w;
      } //else it jumped a row, so keep rx the same
    } 
  } else {
  }

  //recheck posInRow, it might have changed if a word jumped a row
  posInRow = word.row.words.indexOf(word);

 if (posInRow > 0) {
    if (rx < word.row.words[posInRow - 1].rect.x + word.row.words[posInRow - 1].rect.w ) {
      rx = word.row.words[posInRow - 1].rect.x + word.row.words[posInRow - 1].rect.w;
    }
  } else { //first one in row
    if (rx < edgepadding) {
      rx = edgepadding;
    }
  }

  setWordToX(word, rx);

  return {x:rx, y:ry};
}

function dragWord(x, y, word) {

  dragElem = word; 
  //word.isDragging = true;
  
  var dragDir = checkDragDirection(x);
  
  if (dragDir == directions.BACKWARD) {
    return checkIfCanMoveLeft(x + rowOffsetX, y, word);
  } else if (dragDir == directions.FORWARD) {
    return checkIfCanMoveRight(x + rowOffsetX, y, word);
  } else {
    return {x:word.rectSVG.bbox().x, y:word.rectSVG.bbox().y};
  }
}

function setWordToX(word, xval) {

  //console.log("in setWordToX(" + word.val + ", " + xval + ")");

  word.rectSVG.x(xval);
  word.rect = word.rectSVG.bbox();
  word.text.x(xval + (word.rect.w/2) - (word.text.bbox().w / 2)); 
  word.leftX = xval; 
  word.rightX = xval + word.rect.w;

  word.percPos = (word.leftX-edgepadding) / (svgWidth-edgepadding*2);

  word.leftHandle.x(xval);
  word.rightHandle.x(word.rightX - handleW );
  word.underneathRect.x(xval);
}

function checkIfSpaceToMoveUpARow(width, prevRow) {
  var cw = width;
  var rowWidth = svgWidth - (edgepadding*2);

  for (var i = prevRow.words.length - 1; i >= 0; i--) {
    prevWord = prevRow.words[i];
    cw += prevWord.rect.w;

    if (cw > rowWidth) {
      console.log("no, width doesn't fit on this row #... " + prevRow.idx);

      if (prevRow.idx == 0) { //on first row, so doesn't fit!
        return false;
      }

      var pw = 0;
      for (var ii = i; ii >= 0; ii--) {
        pw += prevWord.rect.w;
      }

      return checkIfSpaceToMoveUpARow(pw, rows[prevRow.idx - 1]);

    } else {
      console.log("yes, word does fit on this row #... " + prevRow.idx);
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
      console.log("no, width doesn't fit on this row #... " + nextRow.idx);

      if (nextRow.idx == rows.length - 1) { //on last row, so doesn't fit!
        return false;
      }

      var nw = 0;
      for (var ii = i; ii < nextRow.words.length; ii++) {
        nw += nextWord.rect.w;
      }

      return checkIfSpaceToMoveDownARow(nw, rows[nextRow.idx + 1]);

    } else {
      console.log("yes, word does fit on this row #... " + nextRow.idx);
    }
  }

  return true;
}

function moveWordToNewPosition(w, nx, ny) {
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
  //var ny = w.row.ry + w.row.rh - w.wh;
  var ny = w.row.rect.bbox().y + w.row.rect.bbox().h - w.wh;

  moveWordToNewPosition(w, nx, ny);

  for (var i = 0; i < rows.length; i++) {
    calculateMaxSlotForRow(rows[i]);
  }

  //calculateMaxSlotForRow(rows[currentRowIdx]) ;
  //calculateMaxSlotForRow(rows[nextRowIdx]);
}

function moveWordUpARow(w) {

  var currentRowIdx = w.row.idx;
  var nextRowIdx = w.row.idx - 1;

  var w = rows[currentRowIdx].words.shift();
  rows[nextRowIdx].words.push(w);
  w.row = rows[nextRowIdx];
  var nx = svgWidth - edgepadding - w.rectSVG.width();
  //var ny = w.row.ry + w.row.rh - w.wh;
  var ny = w.row.rect.bbox().y + w.row.rect.bbox().h - w.wh;

  moveWordToNewPosition(w, nx, ny);

  //completely remove last row if it is empty
  if (rows[rows.length-1].words.length == 0) {
    removeLastRow();
  }

  for (var i = 0; i < rows.length; i++) {
    calculateMaxSlotForRow(rows[i]);
  }


  //calculateMaxSlotForRow(rows[currentRowIdx]); 
  //calculateMaxSlotForRow(rows[nextRowIdx]);

}

function setUpWordDraggable(word) {

  addDragStartingAndEndingListeners(word.rectSVG);

  var dragEvent = word.rectSVG.draggable(function(x, y) {

    rowOffsetWord = word;
    
    var returnXY = dragWord(x, word.rect.y, word);
    redrawLinks();//actually - only redraw links that moving this word would affect + this row
    prevX = x;

    return returnXY;
  });
}

function checkMinMaxY(row, y, h) {

  var rowArr = row.words;

  var miny, maxy;
  var dir = directions.NONE;

  if (row.idx == 0) {
    miny = 0; //edgepadding;
  } else {
    miny = rows[row.idx-1].rect.bbox().y; //+h?
  }

  //console.log("x + w = " + (x + word.rect.w));
  if (row.idx == (rows.length - 1) ) {

    //console.log("svgWidth = " + svgWidth);
    //maxx = draw.bbox().w - edgepadding;
    //maxx = svgWidth - edgepadding;
  } else {  
    maxy = rows[row.idx+1].rect.bbox().y + rows[row.idx+1].rect.bbox().h; //i think
  } 

  if (y < miny) {
    dir = directions.BACKWARD;
  } else if (y + h >= maxy) {
    //x = maxx - w;
    dir = directions.FORWARD;
  }

  //need to calculate size of other words on this row...
  var rowMinY = edgepadding;
  for (var i = 0; i < wordInRow; i++) {
    rowMinX += rowArr[i].rect.w; //wordInRow
  }

  var rowMaxX = svgWidth - edgepadding;

  for (var i = wordInRow; i < rowArr.length; i++) {
    rowMaxX -= rowArr[i].rect.w; 
  }

  if (x < rowMinX) {
    x = rowMinX;
  } else if (x > rowMaxX) {
    x = rowMaxX;
  }

  return {x:x, dir:dir};
}

//var testRect1 = null;

function dragRow(x, y, row) {

  //console.log("in dragRow("+x+", "+y+", "+row+"), wordHeight = " + wordHeight );

  var rowDragRect = row.dragRect;
  var prevY = row.rect.bbox().y;

  var inc = y - prevY;

  var nextRowTooSmall = false;
  var nextY = 0;

  if (row.idx < rows.length - 1) {
    /*
       nextY = top of next row + height of next row ... so the bottom of the next row (prob can just use the lineBottom for that...), minus the height of the word's rectangle, then need to subtract the dragRectangle, + the margin between rows.
       */

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
    var word = row.words[i];
    var wordY = row.lineBottom.bbox().y - word.rectSVG.height();
    word.rectSVG.y(wordY);
    word.rect = word.rectSVG.bbox();
    word.underneathRect.y(wordY);  
    word.leftHandle.y(wordY);  
    word.rightHandle.y(wordY);  

    word.text.y(word.rect.y + textpaddingY); //  - maxTextY); 
  }

  row.baseHeight = row.lineBottom.y() - (textpaddingY*2) - texts.wordText.maxHeight;


  if (row.idx < rows.length - 1) {

    var nextrow = rows[row.idx + 1];
    nextrow.rect.y(row.rect.bbox().y + row.rect.bbox().h + 5);
    nextrow.rect.height( nextrow.dragRect.bbox().y - y - (5));

    nextrow.lineTop.y(row.rect.bbox().y + row.rect.bbox().h + 5);
  }

  var returnVal = {x:rowDragRect.bbox().x, y:y}; //dragWord(x, y, word, i);

  return returnVal;
}

function setUpRowDraggable(row) {

  //console.log("row.dragRect = " + row.dragRect);

  var rowDragRect = row.dragRect;

  addDragStartingAndEndingListeners(rowDragRect);

  rowDragRect.draggable(function(x, y) {

    var returnVal = dragRow(x, y, row);

    redrawLinks();//actually - only redraw links that moving this word would affect + this row?

    return returnVal;
  });




}


