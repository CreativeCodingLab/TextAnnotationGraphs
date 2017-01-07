
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
}


function mover(word){
  if (isDragging) {return;} 

  word.rectSVG.stroke( { color: '#00ff00', opacity: 0.6, width: 1 } );
  word.rectSVG.fill( {color: "#ff0000"} );

  word.leftHandle.opacity(handleOpacity);
  word.rightHandle.opacity(handleOpacity);

  for (var i = 0; i < word.parentsL.length; i++) {
    var p = word.parentsL[i];

    for (var l = 0; l < p.lines.length; l++) {
      p.lines[l].stroke( {color: "#00ff00"} );
    }
  }

  for (var i = 0; i < word.parentsR.length; i++) {
    var p = word.parentsR[i];
    for (var l = 0; l < p.lines.length; l++) {
      p.lines[l].stroke( {color: "#00ff00"} );
    }
  }
}


function mout(word){
  if (isDragging) {return;} 

  word.rectSVG.stroke( { color: '#ff0000', opacity: 0.6, width: 1 } );
  word.rectSVG.fill( {color: "#0000ff"} );

  word.leftHandle.opacity(0.0);
  word.rightHandle.opacity(0.0);

  for (var i = 0; i < word.parentsL.length; i++) {
    var p = word.parentsL[i];

    for (var l = 0; l < p.lines.length; l++) {
      p.lines[l].stroke( {color: "#ff0000"} );
    }
  }

  console.log("length of parentsR??? = " + word.parentsR.length);
  for (var i = 0; i < word.parentsR.length; i++) {
    var p = word.parentsR[i];

    for (var l = 0; l < p.lines.length; l++) {
      p.lines[l].stroke( {color: "#ff0000"} );
    }
  }
}

function link_mover(link) {

  if (link.leftWord.lines) {
    for (var i = 0; i < link.leftWord.lines.length; i++) {
      link.leftWord.lines[i].stroke( { width: linkStrokeThickness,color:linkStrokeColor_selected,opacity:linkStrokeOpacity_selected  } );
    }
  }

  if (link.rightWord.lines) {
    for (var i = 0; i < link.rightWord.lines.length; i++) {
      link.rightWord.lines[i].stroke( { width: linkStrokeThickness,color:linkStrokeColor_selected,opacity:linkStrokeOpacity_selected  } );
    }
  }


  for (var i = 0; i < link.lines.length; i++) {
    link.lines[i].stroke( { width: linkStrokeThickness,color:linkStrokeColor_selected,opacity:linkStrokeOpacity_selected  } );
  }

  if (link.parentsL) {
    for (var i = 0; i < link.parentsL.length; i++) {
      var p = link.parentsL[i];

      for (var l = 0; l < p.lines.length; l++) {
        p.lines[l].stroke( { width: linkStrokeThickness,color:linkStrokeColor_selected,opacity:linkStrokeOpacity_selected  } );
      }

    }
  }

  if (link.parentsR) {

    for (var i = 0; i < link.parentsR.length; i++) {
      var p = link.parentsR[i];

      for (var l = 0; l < p.lines.length; l++) {
        p.lines[l].stroke( { width: linkStrokeThickness,color:linkStrokeColor_selected,opacity:linkStrokeOpacity_selected  } );
      }
    }

  }
}


function link_mout(link) {

  if (link.leftWord.lines) {
    for (var i = 0; i < link.leftWord.lines.length; i++) {
      link.leftWord.lines[i].stroke( { width: linkStrokeThickness,color:linkStrokeColor,opacity:linkStrokeOpacity  } );
    }
  }

  if (link.rightWord.lines) {
    for (var i = 0; i < link.rightWord.lines.length; i++) {
      link.rightWord.lines[i].stroke( { width: linkStrokeThickness,color:linkStrokeColor,opacity:linkStrokeOpacity  } );
    }
  }


  for (var i = 0; i < link.lines.length; i++) {
    link.lines[i].stroke( { width: linkStrokeThickness,linkStrokeThickness,color:linkStrokeColor,opacity:linkStrokeOpacity  } );
  }


  if (link.parentsL) {

    for (var i = 0; i < link.parentsL.length; i++) {
      var p = link.parentsL[i];

      for (var l = 0; l < p.lines.length; l++) {
        p.lines[l].stroke( { width: linkStrokeThickness,linkStrokeThickness,color:linkStrokeColor,opacity:linkStrokeOpacity  } );

      }

    }
  }
  if (link.parentsR) {

    for (var i = 0; i < link.parentsR.length; i++) {
      var p = link.parentsR[i];

      for (var l = 0; l < p.lines.length; l++) {
        p.lines[l].stroke( { width: linkStrokeThickness,linkStrokeThickness,color:linkStrokeColor,opacity:linkStrokeOpacity  } );
      }
    }
  }
}

function setupLineInteractions(link) {

  for (var i = 0; i < link.lines.length; i++) {
    var l = link.lines[i];

    l.mouseover( function() { link_mover(link) }  );
    l.mouseout( function() { link_mout(link) }  );
  }
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
      console.log("DRAG END!  " + e.detail); // Prints "Example of an event"
    },false);



function addDragStartingAndEndingListeners(elem) {

  elem.on('dragstart', function() {
    isDragging = true;
    //isCanceling = false;
    console.log("isDragging = " + isDragging);
    //console.log("elem = " + elem + " rect x = " + elem.bbox().x);
    prevX = elem.bbox().x;

  })


  elem.on('dragend', function() {
    isDragging = false;
    //isCanceling = false;
    rowOffsetX = 0;
    rowOffsetWord = null;

    prevX = -1;
    console.log("isDragging = " + isDragging);
  })

}

function dragArrow (arrow, link, word, side, leftX, rightX) {

  addDragStartingAndEndingListeners(arrow);

  arrow.draggable(function(x, y) {

    var linkWidth = ( (rightX) - (leftX) );

    if (side == sides.LEFT) {
      var xPos = (x - leftX) + arrowW; 
      console.log("x = " + x + ", xPos = " + xPos);

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

    var returnVal = dragLeftHandle(x, leftHandle.bbox().y, word);
    redrawLinks();//actually - only redraw links that moving this word would affect + this row
    prevX = x;
    return returnVal;
  });
}

function setUpRightHandleDraggable(rightHandle, rect, text, word, i) {

  addDragStartingAndEndingListeners(rightHandle);

  rightHandle.draggable(function(x, y) {

    var returnVal = dragRightHandle(x, rightHandle.bbox().y, word);
    redrawLinks(); //actually - only redraw links that moving this word would affect + this row
    prevX = x;
    return returnVal;
  });
}

function dragLeftHandle(x, y, word) {

  var dragDir = checkDragDirection(x);

  if (dragDir == directions.BACKWARD) {
    return checkIfCanDragLeftHandleLeft(x, y, word);
  } else if (dragDir == directions.FORWARD) {
    return checkIfCanDragLeftHandleRight(x, y, word);
  } else {
    console.log("in dragLeftHandle, direction = " + dragDir);

    return {x:word.leftHandle.bbox().x, y:word.leftHandle.bbox().y};
  }
}

function dragRightHandle(x, y, word) {

  var dragDir = checkDragDirection(x);

  if (dragDir == directions.BACKWARD) {
    return checkIfCanDragRightHandleLeft(x, y, word);
  } else if (dragDir == directions.FORWARD) {
    return checkIfCanDragRightHandleRight(x, y, word);
  } else {
    console.log("in dragRightHandle, direction = " + dragDir);
    return {x:word.rightHandle.bbox().x, y:word.rightHandle.bbox().y};
  }
}

function checkIfCanDragRightHandleLeft(x, y, word) {

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
  } else if (x + handleW - word.leftX < minWordWidth) {
    rx = word.leftX + minWordWidth - handleW;
    rw = minWordWidth;
    setWordToXW(word, word.leftX, rw);
  } else {
    rx = x;
    rw = x - word.leftX + handleW;
    setWordToXW(word, word.leftX, rw);
  }

  return {x:rx, y:y};
}


function checkIfCanDragRightHandleRight(x, y, word) {

  var rx, rw;
  var posInRow = word.row.words.indexOf(word);

  if (x < word.leftX + minWordWidth - handleW) {
    rx = word.leftX + minWordWidth - handleW;
    rw = minWordWidth;
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

  var rx, rw;

  var posInRow = word.row.words.indexOf(word);

  if (posInRow == 0 && x < edgepadding) {
    rx = edgepadding;
    rw = word.rightX - edgepadding;
  } else if (posInRow > 0 && x < rows[word.row.idx].words[posInRow - 1].rightX) {
    rx = rows[word.row.idx].words[posInRow - 1].rightX;
    rw = word.rightX - rx;
  } else if (x > word.rightX - minWordWidth) {
    rx = word.rightX - minWordWidth;
    rw = minWordWidth;
  } else {
    rx = x;
    rw = word.rightX - rx;
  }

  setWordToXW(word, rx, rw);

  return {x:rx, y:y};
}

function checkIfCanDragLeftHandleLeft(x, y, word) {

  var rx, rw;
  var posInRow = word.row.words.indexOf(word);

  if (x > word.rightX - minWordWidth) {
    rx = word.rightX - minWordWidth;
    rw = minWordWidth; 
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

  console.log("in setWordToXW, xval = " + xval);
  word.rectSVG.x(xval);
  word.rectSVG.width(wval);
  word.rect = word.rectSVG.bbox();

  word.text.x(xval + (wval/2) - (word.text.bbox().w / 2)  ); //padding);
  word.leftX = xval; 
  word.rightX = xval + wval;

  word.leftHandle.x(xval);
  console.log("leftHandle.bbox.x() = " + word.leftHandle.bbox().x);
  word.rightHandle.x(word.rightX - handleW);

  word.underneathRect.x(xval);
  word.underneathRect.width(wval);
}

function checkIfCanMoveLeft(x, y, word) {

  var posInRow = word.row.words.indexOf(word);

  var rx = x;
  var ry = y;

  //am i the first word in this row?
  if (posInRow == 0) {

    //did i hit the left side of the row?
    if (x < edgepadding) {

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

        //refire this checkIfCanMoveRight, since it will push words on the next row out of the way, if needed -- may break up this method into little pieces so can fire something more granular
        checkIfCanMoveLeft(rx, y, word);
      } else {
        rx = edgepadding;
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
      rx = word.row.words[posInRow + 1].rect.x - word.rect.w;
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
          rowOffsetX -= (svgWidth - (word.rect.w) - (2*edgepadding));
        }

        ry = word.rect.y;

        //refire this checkIfCanMoveRight, since it will push words on the next row out of the way, if needed -- may break up this method into little pieces so can fire something more granular
        checkIfCanMoveRight(rx, y, word);

      } else {
        rx = svgWidth - edgepadding - word.rect.w ;
      }
    }
  } else if (posInRow < word.row.words.length - 1) {

    //i am not the last word in this row, am i hitting someone in front of me?
    var nextWord = word.row.words[posInRow + 1];
    var nextWordX = nextWord.rect.x;

    if (x + word.rect.w > nextWordX) {
      //yes I am, can that word move out of the way?

      var inc = (x + word.rect.w) - nextWordX;
      console.log("inc = " + inc);
      var uvals = checkIfCanMoveRight(nextWordX + inc, y, nextWord);

      //check if the word we've hit has jumped a row
      if (nextWord.row.idx == word.row.idx) {
        rx = uvals.x - word.rect.w;
      } //else it jumped a row, so keep rx the same
    } 
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

  word.rectSVG.x(xval);
  word.rect = word.rectSVG.bbox();
  word.text.x(xval + (word.rect.w/2) - (word.text.bbox().w / 2)); 
  word.leftX = xval; 
  word.rightX = xval + word.rect.w;
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
    calcuateMaxSlotForRow(rows[i]);
  }

  //calcuateMaxSlotForRow(rows[currentRowIdx]) ;
  //calcuateMaxSlotForRow(rows[nextRowIdx]);
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
  
  for (var i = 0; i < rows.length; i++) {
    calcuateMaxSlotForRow(rows[i]);
  }


  //calcuateMaxSlotForRow(rows[currentRowIdx]); 
  //calcuateMaxSlotForRow(rows[nextRowIdx]);

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

  console.log("in dragRow("+x+", "+y+", "+row+"), wordHeight = " + wordHeight );

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

  console.log("row.dragRect = " + row.dragRect);

  var rowDragRect = row.dragRect;

  addDragStartingAndEndingListeners(rowDragRect);

  rowDragRect.draggable(function(x, y) {

    var returnVal = dragRow(x, y, row);

    redrawLinks();//actually - only redraw links that moving this word would affect + this row?

    return returnVal;
  });




}


