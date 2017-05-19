


function drawWords(words) {

  var row = 0;
  var x = 0;

  //debugSlots();

  setUpRowsAndWords(words);

  for (var i = 0; i < rows.length; i++) {
    rows[i].draw();

    for (var ii = 0; ii < rows[i].words.length; ii++) {
      rows[i].words[ii].draw();
    }
  }
}

// update the text and tag text of an existing word on the graph
function redrawWords(words) {
  words.forEach(function(word) {

    if (word.text) {
      word.text.text(word.val);
    }

    if (word.tagtext != null) {
      word.tagtext.text(word.tag || '');
    }

    // TODO: redefine maxtextw
    // word.maxtextw = Math.max(textw, tagtextw);

    // rearrange
    word.aboveRect.front();
    word.leftHandle.front();
    word.rightHandle.front();
    realignWords();
  });
}


//gets max slot number to be assigned to this word
function getHeightForWord(word) {
    
  var maxH = 0;

  ////console.log("in getHeightForWord " + word.toString());
  for (var ii = 0; ii < word.slotsL.length; ii++) {
    maxH = Math.max(maxH, word.slotsL[ii]);
  }

  for (var ii = 0; ii < word.slotsR.length; ii++) {
    maxH = Math.max(maxH, word.slotsR[ii]);
  }

  ////console.log("returning largest slot for this word = " + maxH );
  return maxH;
}


function checkIfEverythingFits(row) {

  for (var ii = 0; ii < row.words.length; ii++) {

    var word = row.words[ii];

    if (ii > 0) {
      var pw = row.words[ii-1];
      if (word.leftX < pw.rightX) {
        return false;
      }

      if (ii == row.words.length - 1) {
        if (word.rightX > (Config.svgWidth - Config.edgePadding) ) {
          return false;
        }
      }
    }
  }
  
  return true;
}

function checkIfNeedToResizeWords(row) {

  var totalW = 0;
  for (var ii = 0; ii < row.words.length; ii++) {
    var word = row.words[ii];
    totalW += word.aboveRect.width();
  }

  if (totalW > Config.svgWidth - (Config.edgePadding*2)) {
    return totalW - (Config.svgWidth - (Config.edgePadding*2));
  }

  return 0;
}

/* this method is called whenever the window width changes */
function recalculateRows(percChange) {

  
  ////console.log("\n\nin recalculateRows()");
  for (var i = 0; i < rows.length; i++) {
    
    var row = rows[i];
    ////console.log("\t) row #" + row.idx);

    row.rect.width(draw.width());

    row.lineTop.plot(0, row.ry, draw.width(), row.ry);
    row.lineBottom.plot(0, row.ry+row.rh, draw.width(), row.ry+row.rh);

    row.dragRect.x(draw.width() - (Config.dragRectSide+Config.dragRectMargin));

    //first pass at resizing   

    for (var ii = 0; ii < row.words.length; ii++) {
      
      
      var word = row.words[ii];

      //first try to expand or shrink size of words - but no smaller than the word's min width
      var nw = Math.max( Math.min(word.getMaxWidth(), word.aboveRect.width() * percChange), word.getMinWidth() );

      //var nw = Math.max(word.getMinWidth(), word.aboveRect.width() * percChange);
      //nw = Math.max(nw, word.getMaxWidth());

      var nx = Config.edgePadding + (word.percPos * (Config.svgWidth-Config.edgePadding*2));

      setWordToXW(word, nx, nw);
      word.update();
      
    }

    var everythingFits = checkIfEverythingFits(row);

    
    if (!everythingFits) { 

      //console.log("row " + row + ": nope, not everything fits!");

      var resizeByHowMuch = checkIfNeedToResizeWords(row);

      if (resizeByHowMuch == 0) {
         //console.log("great, we just need to push words around");
      } else {
         //console.log("hmm... need to shrink the words if we can, by " + resizeByHowMuch);
         //console.log("is this possible?");

        var wordsFitInRow = true;

        if (row.getMinWidth() > (Config.svgWidth - Config.edgePadding*2)) {
          //console.log("words will not fit in row! have to adjust...");
          wordsFitInRow = false;
        } 

        if (!wordsFitInRow) {
           //console.log("not possible... need to hop rows or make new row");

          //we'll make all minimum width for now
          for (var ii = row.words.length-1; ii >= 0 ; ii--) {
            var word = row.words[ii];
            setWordToXW(word, word.leftX, word.getMinWidth());
            word.update();
          }

        } else {
          //console.log("yep! it's possbile");
          //which words can shrink? and by how much?

          //copy words in row to a temp array, which we'll sort by room left
          var newArray = [];
          for (var ii = 0; ii < row.words.length; ii++) {
            newArray[ii] = row.words[ii];
          }

          newArray.sort(function(a, b) {
            var d1 = a.aboveRect.width() - a.getMinWidth();
            var d2 = b.aboveRect.width() - b.getMinWidth();
            return d1 - d2; 
          });

          var numWords = row.words.length;
          var pixelsPerWord = resizeByHowMuch / numWords; 

          for (var ii = 0; ii < newArray.length; ii++) {
            var word = newArray[ii];

            var minW = word.getMinWidth();

            if (word.aboveRect.width() - pixelsPerWord < minW) {

              var minus = word.aboveRect.width() - minW;
              setWordToXW(word, word.aboveRect.x(), minW);
              word.update();

                //console.log("ii = " + ii + ": can't shrink by " +  pixelsPerWord + ", so shrinking by much as possible = " + minus);

              numWords--;
              resizeByHowMuch -= minus;
              pixelsPerWord = resizeByHowMuch / numWords; 
            } else {
              setWordToXW(word, word.aboveRect.x(), word.aboveRect.width() - pixelsPerWord);
              word.update();
              numWords--;
              resizeByHowMuch -= pixelsPerWord;
              //console.log("ii = " + ii + ": shrinking by pixelsPerWord = " +  pixelsPerWord);
            }
          }
        }
      }

      //realignWords();
      
    } else { 
      //console.log("everything fits!");
    }

    

  } //end loop rows

  realignWords();

}


function realignWords() {
  //ok loop again, through every word, first to see if can go left, then to see if can go right
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];


    //may not use the move left, might be odd when it jumps up instead of down...
    for (var ii = row.words.length-1; ii >= 0 ; ii--) {
      var word = row.words[ii];
      checkIfCanMoveLeft(word.aboveRect.x(), word.aboveRect.width(), word.aboveRect.y(), word, true);
      word.update();
    }
    


    for (var ii = 0; ii < row.words.length; ii++) {
      var word = row.words[ii];
      checkIfCanMoveRight(word.aboveRect.x(), word.aboveRect.width(), word.aboveRect.y(), word, false);
      word.update();
    }
  }

  updateWords();

  redrawLinks(true);

}

function removeLastRow() {
  rows[rows.length-1].rect.remove();
  rows[rows.length-1].lineTop.remove();
  rows[rows.length-1].lineBottom.remove();
  rows[rows.length-1].dragRect.remove();
  rows.pop();

  changeSizeOfSVGPanel(window.innerWidth - 16, (rows[rows.length - 1].lineBottom.y() ) + 1);
}

function changeSizeOfSVGPanel(w, h) {

  Config.svgWidth = w;
  Config.svgHeight = h;
  draw.size(w, h);
}


function appendRow() {

  row = new Row(rows.length);
  rows.push(row);

  row.maxSlots = 0;

  row.ry = Config.rowPadding/2 + rows[row.idx - 1].rect.bbox().y + rows[row.idx - 1].rect.bbox().h;
  row.rh = rows[row.idx - 1].rect.bbox().h; 

  if (row.idx % 2 == 0) {
    row.color = Config.evenRowsColor;
  } else {
    row.color = Config.oddRowsColor;
  }

  drawRow(row);

  changeSizeOfSVGPanel(window.innerWidth - 16, row.lineBottom.y() + 1);

}

function drawRow(row) {

  row.rect = rowGroup.rect(Config.svgWidth,row.rh).x(0).y(row.ry);

  if (row.idx % 2 == 0) {
    row.rect.style(styles.rowRectEvenFill.style);
  } else {
    row.rect.style(styles.rowRectOddFill.style); 
  }

  row.lineTop = rowGroup.line(0, row.ry, Config.svgWidth, row.ry).style(styles.rowLineStroke.style);
  row.lineBottom = rowGroup.line(0, row.ry+row.rh, Config.svgWidth, row.ry+row.rh).style(styles.rowLineStroke.style);

  row.dragRect = rowGroup.rect(Config.dragRectSide,Config.dragRectSide).x(Config.svgWidth - (Config.dragRectSide+Config.dragRectMargin)).y(row.ry + row.rh - (Config.dragRectSide+Config.dragRectMargin)).style(styles.rowDragRectFill.style);


  row.baseHeight = row.lineBottom.y() - (Config.textPaddingY*2) - texts.wordText.maxHeight;

  setUpRowDraggable(row);
}

function calculateMaxSlotForRow(row) {

  row.maxSlots = 0;

  //for each link
  //check minword's and maxword's row. If minw.row >= row && row <= maxw.row, check slot#  

  for (var i = 0; i < linkObjs.length; i++) { 
    var link = linkObjs[i];
    if (link.rootMinWord.row.idx <= row.idx && row.idx <= link.rootMaxWord.row.idx) {
      row.maxSlots = Math.max(row.maxSlots, link.h);
    }
  }
}


function setUpRowsAndWords(words) {

  var rowNum = 0;
  var row;
  var x = 0;

  //loop through each Word and figure out its Row, x position, and width
  for (var i = 0; i < words.length; i++) {

    var word = words[i];
 
    var wh = getTextWidthAndHeight(word.val, texts.wordText.style);

    //calculate the width of the Word
    word.tw = wh.w;
    word.maxtextw = wh.w;
    
      if (word.tag != null) {
      var twh = getTextWidthAndHeight(word.tag, texts.tagText.style);
      
      if (twh.w > word.tw) {
        word.tw = twh.w; //think tw is ONLY used for checking minWidth, so this should be ok
        word.maxtextw = twh.w;
      }
    }
   
    //what row will this Word belong to?
    
    if (i == 0) { //if first word, then obviously in first row

      rowNum = 0;
      row = new Row(rowNum);
      rows.push(row);
      row.maxSlots = 0;

      x = Config.edgePadding;

    } else if (x + word.tw + (Config.textPaddingX*2) + Config.edgePadding > Config.svgWidth) { //if would be wider than the screen width, then start a new row

      rowNum++;
      row = new Row(rowNum);
      rows.push(row);
      row.maxSlots = 0;

      x = Config.edgePadding;
    }

    row.words.push(word);
    row.maxSlots = Math.max(row.maxSlots, getHeightForWord(word));
    word.row = row;
    word.th = texts.wordText.maxHeight; //guaranteed to be the same for all words

    //calculate x position and width of the Word
    word.wx = x;
    word.ww = word.tw + (Config.textPaddingX * 2);


    if (word.tag != null) {
      word.tww = word.ww; //maxtextw + (Config.textPaddingX * 2);
      word.twx = word.wx;
    }

    x += word.ww + Config.wordPadding;
  }


  // now that we've assign each word to a row, figure out the height of the row (which is based on the maximum slots that the links attached to Words in the row occupy (or links that pass over those words). 
  for (var i = 0; i < rows.length; i++) {

    var row = rows[i];

    if (i == 0) {
      row.ry = Config.rowPadding / 2;
    } else {
      row.ry = Config.rowPadding / 2 + rows[row.idx - 1].ry + rows[row.idx - 1].rh;
    }

    row.rh = Config.rowPadding + ((Config.textPaddingY * 2) + texts.wordText.maxHeight) + (Config.levelPadding * row.maxSlots);

    if (row.idx % 2 == 0) {
      row.color = Config.evenRowsColor;
    } else {
      row.color = Config.oddRowsColor;
    }

    for (var ii = 0; ii < row.words.length; ii++) {
      var word = row.words[ii];

      word.h = 0; //the number of link levels is 0 for the word itself
      word.wh = texts.wordText.maxHeight + Config.textPaddingY*2; 
      word.wy = row.ry + row.rh - word.wh;

      if (word.tag != null) {
        var tag_textwh = getTextWidthAndHeight(word.tag, texts.tagText.style);
        word.twh = texts.tagText.maxHeight + Config.textPaddingY*2; 
        word.twy = word.wy - word.twh;
      }

      row.baseHeight = word.wy; //that is, where the top of the word is in the row.
    }
  }
}


function drawWord(word) {

  word.underneathRect = draw.rect( word.ww, word.wh ).x( word.wx ).y( word.wy ).style(styles.wordFill.style);

  var textwh = getTextWidthAndHeight(word.val, texts.wordText.style);

  word.text = draw.text(function(add) {

    add.text(word.val)
    .y(word.wy + Config.textPaddingY*2) // - texts.wordText.descent)
    .x(word.wx + (word.ww/2) - (textwh.w / 2))
    .font(texts.wordText.style);
  });


  if (word.tag != null) {
    var textwh = getTextWidthAndHeight(word.tag, texts.tagText.style);
    var tagXPos = word.twx + (word.ww/2) - (textwh.w / 2);

    //add in tag text, if the word has an associated tag
    word.tagtext = draw.text(function(add) {

      add.text(word.tag)
      .y(word.wy + Config.textPaddingY/2) // - texts.tagText.descent)
      .x(tagXPos)
      .font(texts.tagText.style);
    });
  }

  //this rect is invisible, but used for detecting mouseevents, as its drawn on top of the text+underneathRect (which provided the color+fill+stroke)
  word.aboveRect = draw.rect(word.ww, word.wh).x( word.wx ).y( word.wy ).fill( {color:'#fff',opacity: 0.0} );

  word.leftHandle = draw.rect(Config.handleW, Config.handleH).x(word.wx).y( word.wy + (word.wh / 2 ) - (Config.handleH / 2) ).style(styles.handleFill.style);


  word.rightHandle = draw.rect(Config.handleW,Config.handleH).x(word.wx + word.ww - (Config.handleW)).y( word.wy + (word.wh / 2 ) - (Config.handleH / 2) ).style(styles.handleFill.style);


  word.bbox = word.aboveRect.bbox();
  word.leftX = word.aboveRect.bbox().x;
  word.rightX = word.aboveRect.bbox().x + word.aboveRect.bbox().w;
  word.percPos = (word.leftX-Config.edgePadding) / (Config.svgWidth-Config.edgePadding*2);


  //set up mouse interactions
  setUpLeftHandleDraggable(word);
  setUpRightHandleDraggable(word); 
  setUpWordDraggable(word); 
  setupMouseOverInteractions(word);

  word.aboveRect.dblclick(function() {
    word.isSelected = !word.isSelected;

    if (word.isSelected) {
      style = word.isHovered ? "hoverAndSelect" : "select";
    }
    else {
      style = word.isHovered ? "hover" : "style";
    }
  word.underneathRect.style(styles.wordFill[style]);
  });

}


var _linkLabels = [];
var _links = [];
var _arrows = [];

function drawLinks(ls) {
  Config.redraw = 0;
  arrangeOffsetValsForAttachmentPoints(linkObjs); 
  arrangeOffsetValsForAttachmentPoints(wordObjs); 

  groupAllElements = draw.group();
  groupAllElements.group().addClass('links');
  groupAllElements.group().addClass('text');
  groupAllElements.group().addClass('arrows');

  linkG = groupAllElements.select('g.links').members[0];
  textG = groupAllElements.select('g.text').members[0];
  arrowG = groupAllElements.select('g.arrows').members[0];

  Object.keys(ls).forEach(function(key) {
    drawLink(ls[key]);
  });
  
  drawAllLinks();
  drawAllLinkLabels();
  drawAllArrows();
}



function drawAllArrows() {
  var glyph = arrowG.group();

  for (var i = 0; i < linkObjs.length; i++) {
    var lo = linkObjs[i];


    for (var ii = 0; ii < lo.words.length; ii++) {

      if (lo.arrowStyles[ii].path == null) { //hasn't been drawn before
        lo.arrowStyles[ii].draw(glyph, lo.arrows[ii].x, lo.arrows[ii].y);
        //dragArrow (lo, lo.arrows[ii], lo.arrowStyles[ii].path) ;
        dragArrow (lo, ii, lo.arrowStyles[ii].path) ;
      } else { //update existing polylineSVG
        lo.arrowStyles[ii].update(lo.arrows[ii].x, lo.arrows[ii].y);

        if (lo.arrows[ii].visibility == false) {
          lo.arrowStyles[ii].path.style("visibility:hidden;");
        } else {
          lo.arrowStyles[ii].path.style("visibility:visible;");
        } 

      }


    }

    /*
       if (lo.arrowStyles[0].path == null) { //hasn't been draw before
       lo.arrowStyles[0].draw(glyph, lo.arrows[0].x, lo.arrows[0].y);
       dragArrow (lo, lo.arrows[0], lo.arrowStyles[0].path) ;
       } else { //update existing polylineSVG
       lo.arrowStyles[0].update(lo.arrows[0].x, lo.arrows[0].y);

       if (lo.arrows[0].visibility == false) {
       lo.arrowStyles[0].path.style("visibility:hidden;");
       } else {
       lo.arrowStyles[0].path.style("visibility:visible;");
       } 

       }

       var eidx = lo.words.length - 1;
       if (lo.arrowStyles[eidx].path == null) { //hasn't been draw before
       lo.arrowStyles[eidx].draw(glyph, lo.arrows[eidx].x, lo.arrows[eidx].y);
       dragArrow(lo, lo.arrows[eidx], lo.arrowStyles[eidx].path) ;
       } else { //update existing polylineSVG
       lo.arrowStyles[eidx].update(lo.arrows[eidx].x, lo.arrows[eidx].y);

       if (lo.arrows[eidx].visibility == false) {
       lo.arrowStyles[eidx].path.style("visibility:hidden;");
       } else {
       lo.arrowStyles[eidx].path.style("visibility:visible;");
       } 


       }
       */

    /*

       if (lo.arrow1Style.path == null) { //hasn't been draw before
       lo.arrow1Style.draw(glyph, lo.arrow1.x, lo.arrow1.y);
       dragArrow1 (lo, lo.arrow1Style.path) ;
       } else { //update existing polylineSVG
       lo.arrow1Style.update(lo.arrow1.x, lo.arrow1.y);

       if (lo.arrow1.visibility == false) {
       lo.arrow1Style.path.style("visibility:hidden;");
       } else {
       lo.arrow1Style.path.style("visibility:visible;");
       } 

       }

       if (lo.arrow2Style.path == null) { //hasn't been draw before
       lo.arrow2Style.draw(glyph, lo.arrow2.x, lo.arrow2.y);
       dragArrow2 (lo, lo.arrow2Style.path) ;
       } else { //update existing polylineSVG
       lo.arrow2Style.update(lo.arrow2.x, lo.arrow2.y);

       if (lo.arrow2.visibility == false) {
       lo.arrow2Style.path.style("visibility:hidden;");
       } else {
       lo.arrow2Style.path.style("visibility:visible;");
       } 


       }

*/
  }
}


function drawAllLinks() {

  var link = linkG.group();

  for (var i = 0; i < linkObjs.length; i++) {

    var lo = linkObjs[i];

    ////console.log("lo.numLineSegments = " + lo.numLineSegments + " and lo.polylineSVGs.length = " + lo.polylineSVGs.length);
    ////console.log(lo.polylineSVGs);

    if (lo.numLineSegments != lo.polylineSVGs.length) {
      if (lo.numLineSegments < lo.polylineSVGs.length) {
        //need to remove the old SVGs
        ////console.log("REMOVING SVG");
        for (var ii = lo.numLineSegments; ii < lo.polylineSVGs.length; ii++) {
          lo.polylineSVGs[ii].remove();
          lo.polylineSVGs.splice(ii,1);
        }
      } else if (lo.numLineSegments > lo.polylineSVGs.length) {
        //need to add new SVGs
        ////console.log("ADDING SVG");
        for (var ii = lo.polylineSVGs.length; ii < lo.numLineSegments; ii++) {
          //console.log(ii);
          lo.polylineSVGs[ii] = null;
        }
      }
      //return;
    }

    for (var ii = 0; ii < lo.numLineSegments; ii++) {

      if (lo.polylineSVGs[ii] == null) { //hasn't been drawn before
        //console.log("here" + lo.polylines[ii].polyline);
        //lo.polylineSVGs[ii] = link.polyline( lo.polylines[ii].polyline ).style( lo.polylines[ii].style) ;
        lo.polylineSVGs[ii] = link.path( lo.polylines[ii].polyline ).style( lo.polylines[ii].style) ;
      } else { //update existing polylineSVG


        lo.polylineSVGs[ii].plot(lo.polylines[ii].polyline).style(lo.polylines[ii].style);

        if (lo.polylines[ii].visibility == false) {
          lo.polylineSVGs[ii].style("visibility:hidden;");

        } else {
          lo.polylineSVGs[ii].style("visibility:visible;");
        }
      }

      //setupLineInteractions(poly); 
    }
  }

  //interactions are for an array of polylines, eg when links are multi-rows. TODO add back in the link interactions - also link labels?

}


function drawAllLinkLabels() {

  var label = textG.group();

  for (var i = 0; i < linkObjs.length; i++) {
    var lo = linkObjs[i];

    if (lo.numLineSegments < lo.labelTextSVGs.length) {
      //need to remove the old SVGs
      for (var ii = lo.numLineSegments; ii < lo.labelTextSVGs.length; ii++) {
        if (lo.labelTextSVGs[ii] != null) {
          lo.labelTextSVGs[ii].remove();
          lo.labelTextSVGs.splice(ii,1);
        } 
        if (lo.labelRectSVGs[ii] != null) {
          lo.labelRectSVGs[ii].remove();
          lo.labelRectSVGs.splice(ii,1);
        }
      }
    } else if (lo.numLineSegments > lo.labelTextSVGs.length) {
      //need to add new SVGs
      for (var ii = lo.labelTextSVGs.length; ii < lo.numLineSegments; ii++) {
        lo.labelTextSVGs[ii] = null;
        lo.labelRectSVGs[ii] = null;
      }
    } 

    
    for (var ii = 0; ii < lo.numLineSegments; ii++) {

      //console.log("in drawAllLinkLabels, line seg # " + ii);

      
      if (lo.labelTextSVGs[ii] == null) {

        lo.labelRectSVGs[ii] = label.rect( lo.labels[ii].rect.w, lo.labels[ii].rect.h );
        lo.labelRectSVGs[ii].x( lo.labels[ii].rect.x );
        lo.labelRectSVGs[ii].y( lo.labels[ii].rect.y );
        lo.labelRectSVGs[ii].style( lo.labels[ii].rect.style ); 

        lo.labelTextSVGs[ii] = label.text( lo.labels[ii].text.text );
        lo.labelTextSVGs[ii].x( lo.labels[ii].text.x );
        lo.labelTextSVGs[ii].y( lo.labels[ii].text.y );
        lo.labelTextSVGs[ii].font( lo.labels[ii].text.style );

      } else {

        lo.labelRectSVGs[ii].width( lo.labels[ii].rect.w );
        lo.labelRectSVGs[ii].height( lo.labels[ii].rect.h );
        lo.labelRectSVGs[ii].x( lo.labels[ii].rect.x );
        lo.labelRectSVGs[ii].y( lo.labels[ii].rect.y );
        lo.labelRectSVGs[ii].y( lo.labels[ii].rect.y );
        lo.labelRectSVGs[ii].style( lo.labels[ii].rect.style );

        lo.labelTextSVGs[ii].text( lo.labels[ii].text.text );
        lo.labelTextSVGs[ii].x( lo.labels[ii].text.x );
        lo.labelTextSVGs[ii].y( lo.labels[ii].text.y );
        lo.labelTextSVGs[ii].style( lo.labels[ii].text.style );

        if (lo.labels[ii].text.visibility == false) {
          lo.labelRectSVGs[ii].style("visibility:hidden;");
          lo.labelTextSVGs[ii].style("visibility:hidden;"); 
        } else {
          lo.labelTextSVGs[ii].style("visibility:visible;");
          lo.labelRectSVGs[ii].style("visibility:visible;");

        } 

      }
      
    }
  }



}


/** redraws all links that have been marked as needsUpdate = true, OR by passing in a boolean of true to indicate that the window has resized **/
function redrawLinks(forceRedrawingAll) { //force redraw of all when resizing window

  Object.keys(linkObjs).forEach(function(key) {
    if (linkObjs[key].needsUpdate || forceRedrawingAll == true) {
      ////console.log(" link #" + key + " needsUpdate");
      Config.redraw = 1;
      drawLink(linkObjs[key]);
      linkObjs[key].needsUpdate = false;
    }
  });

  drawAllLinks();
  drawAllLinkLabels();
  drawAllArrows();
}




function getLeftXForWord(word, link) {
  if (word instanceof Word) { //is a word
    return word.leftX;
  } else { //is a link
    if (link.leftAttach == sides.LEFT) {
      return word.linesLeftX[0];
    } else if (link.leftAttach == sides.RIGHT){
      return word.linesLeftX[0];
   
   //   return word.linesLeftX[word.numLineSegments-1];
    } 
  }
}

function getRightXForWord(word, link) {
  if (word instanceof Word) { //is a word
    return word.rightX;
  } else { //is a link
    if (link.leftAttach == sides.LEFT) {
      return word.linesRightX[0];
    } else if (link.leftAttach == sides.RIGHT) {
      return word.linesRightX[0];
   //    return word.linesRightX[word.numLineSegments-1];
    }
  }
}


function getXPosForAttachmentByPercentageOffset(link) {

  console.log("in getXPosForAttachmentByPercentageOffset for " + link.toString());

  attachXPositions = [];

  for (var i = 0; i < link.words.length; i++) {
    
    var xleft, xright;
    /*
    if (i == 0) {
      xleft = getLeftXForLeftWord(link);
      xright = getRightXForLeftWord(link);
    } else if (i == link.words.length - 1) {
      xleft = getLeftXForRightWord(link);
      xright = getRightXForRightWord(link);
    } else {
    */
      xleft = getLeftXForWord(link.words[i], link);
      xright = getRightXForWord(link.words[i], link);
    //}
    console.log(" xleft / xright = " + xleft + ", " + xright);
    var len = xright - xleft;
    attachXPositions[i] = xleft + (len * link.arrowXPercents[i]); 

    console.log("link.arrowXPercents["+i+"] = " + link.arrowXPercents[i]);
 
    console.log("attachXPositions["+i+"] = " + attachXPositions[i]);
  }
  

  return attachXPositions;
}


function getXPosForAttachmentByPercentageOffset_old(link) {

  var leftX_1 = getLeftXForLeftWord(link);
  var rightX_1 = getRightXForLeftWord(link);
  var leftX_2 = getLeftXForRightWord(link); 
  var rightX_2 = getRightXForRightWord(link);

  console.log("leftX_1 = " + leftX_1);
  console.log("rightX_1 = " + rightX_1);
  console.log("leftX_2 = " + leftX_1);
  console.log("rightX_2 = " + rightX_2);

  var lengthOfHalfOfLeftWord = ((rightX_1 - leftX_1) / 1);
  var lengthOfHalfOfRightWord = ((rightX_2 - leftX_2) / 1);

  xL = leftX_1 + (lengthOfHalfOfLeftWord * link.arrowXPercents[0]) ;
  xR = leftX_2 + (lengthOfHalfOfRightWord * link.arrowXPercents[link.words.length - 1]); 
  
console.log("link.arrowXPercents[0] = " + link.arrowXPercents[0]);

/*
  if (link.leftAttach == sides.LEFT) { //attaches to the left side of the left word
    //xL = leftX_1 + (lengthOfHalfOfLeftWord * link.x1percent) ;
    xL = leftX_1 + (lengthOfHalfOfLeftWord * link.arrowXPercents[0]) ;
  } else if (link.leftAttach == sides.RIGHT) { //attaches to the right side of the left word
    //xL = (rightX_1) - ( lengthOfHalfOfLeftWord * link.x1percent); 
    xL = (rightX_1) - ( lengthOfHalfOfLeftWord * link.arrowXPercents[0]); 
  }

  if (link.rightAttach == sides.LEFT) { //attaches to the left side of the right word
    //xR =  leftX_2 + (lengthOfHalfOfRightWord * link.x2percent); 
    xR =  leftX_2 + (lengthOfHalfOfRightWord * link.arrowXPercents[link.words.length - 1]); 
  } else if (link.rightAttach == sides.RIGHT) {  //attaches to the right side of the right word

    //xR = (rightX_2 ) - (lengthOfHalfOfRightWord * link.x2percent);
    xR = (rightX_2 ) - (lengthOfHalfOfRightWord * link.arrowXPercents[link.words.length - 1]);
  }
*/

  return {left:xL, right:xR};
}




function getLinkStyles(link, xpts) {

  //TODO - need to reverse direction of gradient when link reverses! currently always assumes increases in x direction, but manually moving links around can put the end x point before the start x point (ie, when moving link2link links). In that case, need to reverse the x's
  // gradient.from(0, 0).to(1, 0) is the default, would need to be gradient.from(1, 0).to(0, 0)

  var linkStyles = [];

  var c1, c2;
  var styleStr;

  var left = xpts[0];
  var right = xpts[xpts.length - 1];

  console.log("left = " + left + ", right = " + right);
  //total length = middle rows * (screen width-margin*2) + (screenwidth-margin - left) + (right - margin)

  var middleLength = 0;
  if (link.numLineSegments > 2) {
    middleLength = (Config.svgWidth-Config.edgePadding*2) * (link.numLineSegments - 2);
  }
  var firstLength = (Config.svgWidth-Config.edgePadding) - left;
  var lastLength = right - Config.edgePadding;
  var totalLength = firstLength + middleLength + lastLength;

  var sx = 0.0;

  for (var i = 0; i < link.numLineSegments; i++) {

    if (link.style.stroke instanceof LinearGradient) {
      c1 = link.style.stroke.c1;
      c2 = link.style.stroke.c2;

      var sp,ep;
      if (i == 0) {
        sp = sx / totalLength;
        ep = firstLength / totalLength;
        sx += firstLength;
      } else if (i > 0 && i < link.numLineSegments - 1) {
        sp = sx / totalLength;
        ep = (sx + (Config.svgWidth-Config.edgePadding*2)) / totalLength;

        sx += (Config.svgWidth-Config.edgePadding*2);
      } else {
        sp = sx / totalLength;
        ep = 1.0;
        //sx = totalLength;
        //sx += lastLength;
        ////console.log("does sx = totalLength? : " + sx + " = " + totalLength); //yep!
      }

      ////console.log("in getLinkStyles : i = " + i + ", sp/ep = " + sp + ", " + ep);
      /*
      //Older way - simpler, but doesn't take into account total lenghth of link, so for instance, for a link with three rows, the middle row would always look the same, regardless of where the start and end were, but I think it looks nice when the gradient gives you a hint about how long the link is, especially to help differentiate other long links
      var sp = ((i) / link.numLineSegments) - 0.1;
      var ep = ((i + 1) / link.numLineSegments) + 0.1; 
      //seems to help user to recognize same line on different rows when we overlap the gardient transitions? .. testing w +0.1 and -0.1 on percents..., but may want to play around with it or remove it...
      */

      var uc1 = chroma.mix(c1, c2, sp).hex();
      var uc2 = chroma.mix(c1, c2, ep).hex();


      //var g = gradientDefGroup.gradient('linear', 
      var g = groupAllElements.gradient('linear', 
          function(stop) { 
            stop.at(0.0, uc1); 
            stop.at(1.0, uc2);
          });

      styleStr = "fill:none;stroke:url(#" + g.node.id + ");stroke-width:"+link.style.width+";stroke-opacity:"+link.style.opacity+";stroke-dasharray:"+ link.style.dasharray + ";opacity:1.0;";

    } else {
      styleStr = link.style.style;
    }

    linkStyles.push(styleStr);
  }

  return linkStyles;

}



//hmm, xPositions and link.words aren't aligned in multirow... messes up middle + end rows... figure out what to pass in...

function storeOnlyArrows(rowNum, y1, link, xPositions) {
  
  arrowPos = [];

  for (var i = 0; i < xPositions.length; i++) {  
  
    var wordIdx = xPositions[i].wordIdx;
    var xpos = xPositions[i].xpos;
    var ypos;

    var w = link.words[wordIdx];
    
    
    if (w instanceof Word ) { // && w.row.idx == rowNum) {
      ypos = w.bbox.y;

    } else if ( w instanceof Link ) { //&& w.rootMinWord.row.idx == rowNum ) {

      var availableHeight = rows[rowNum].baseHeight - rows[rowNum].rect.bbox().y;
      var percentagePadding = availableHeight / (rows[rowNum].maxSlots + 1);

      ypos = rows[rowNum].baseHeight - w.h * percentagePadding;
    }

    arrowPos.push( {x:xpos, y:ypos} );
    
   //link.leftAttach == sides.RIGHT; 
   //link.rightAttach == sides.RIGHT; 
    storeArrow(wordIdx, xpos, ypos, link, w, link.leftAttach, getLeftXForWord(w, link), getRightXForWord(w, link) ); 
  }

  return arrowPos;
}


function calculateOnlyRow(rowNum, link, percentagePadding, xPositions, linkStyles) {

  console.log("in calculateOnlyRow - " + link.toString());
  var yPos = rows[rowNum].baseHeight - link.h * percentagePadding;
  var arrowPos = storeOnlyArrows(rowNum, yPos, link, xPositions);
  
  arrowPos.sort(function(a, b) {
    return a.x - b.x; 
  });
  
  var xL =  arrowPos[0].x ; //xPositions[0];
  var xR = arrowPos[arrowPos.length-1].x; //xPositions[link.words.length - 1];


  var pathline = 'M '+ xL + ' ' + arrowPos[0].y + 
    ' L ' + xL + ' ' +  yPos + 
    ' L ' + xR + ' ' +  yPos + 
    ' L ' + xR + ' ' +  arrowPos[arrowPos.length - 1].y;

  for (var p = 1; p < arrowPos.length - 1; p++) {
     pathline += 
        ' M ' + arrowPos[p].x + ' ' +  yPos +
        ' L ' + arrowPos[p].x + ' ' +  arrowPos[p].y;
  }


  var lineStyle = link.style.style;

  link.polylines[0] = {polyline: pathline, style: lineStyle};

  if (percentagePadding < Config.hideLinkLinesPercentage) { //only bother drawing links if there's room in the row
    link.polylines[0].visibility = false;
    
    for (var i = 0; i < xPositions.length; i++) {
      var wordIdx = xPositions[i].wordIdx;
      link.arrows[wordIdx].visibility = false;
    }

  } else {
    link.polylines[0].visibility = true;
    
    for (var i = 0; i < xPositions.length; i++) {
      var wordIdx = xPositions[i].wordIdx;
   
      link.arrows[wordIdx].visibility = true;
    }

    link.polylines[0].style = lineStyle;

    //setupLineInteractions(link); //only can interact with them if they are visible
  }

   calculateLinkLabels(0, rowNum, (xL + xR) / 2, yPos, link, (percentagePadding < Config.hideLinkTextPercentage));

 
  link.linesLeftX.push(xL); 
  link.linesRightX.push(xR);

  link.numLineSegments = 1;

}



function calculateStartRow(idx, rowNum, link, percentagePadding, xPositions, linkStyles ) {
  console.log("in calculateStartRow - " + link.toString());

  var yPos = rows[rowNum].baseHeight - link.h * percentagePadding;

  var arrowPos = storeOnlyArrows(rowNum, yPos, link, xPositions);
  
  arrowPos.sort(function(a, b) {
    return a.x - b.x; 
  });
  
  var xL = arrowPos[0].x ; 
  var xR = Config.svgWidth; 


  //can there be a start row with NO arrows??
  var pathline = 'M '+ xL + ' ' + arrowPos[0].y + 
    ' L ' + xL + ' ' +  yPos + 
    ' L ' + xR + ' ' +  yPos;

  for (var p = 1; p < arrowPos.length; p++) {
     pathline += 
        ' M ' + arrowPos[p].x + ' ' +  yPos +
        ' L ' + arrowPos[p].x + ' ' +  arrowPos[p].y;
  }

  link.linesLeftX.push(xL);
  link.linesRightX.push(xR);


  link.polylines[idx] = {polyline: pathline, style: linkStyles[idx]};

  console.log("START link.polylines[i] style = " + linkStyles[idx] );

   //storeArrow(0, p1x, p1y, link, link.leftWord, link.leftAttach, getLeftXForLeftWord(link), getRightXForLeftWord(link));
 
  //storeLeftArrow(p1x, p1y, link, link.leftWord, link.leftAttach, getLeftXForLeftWord(link), getRightXForLeftWord(link));

  if (percentagePadding < Config.hideLinkLinesPercentage) { 
    link.polylines[idx].visibility = false;
    for (var i = 0; i < xPositions.length; i++) {
      var wordIdx = xPositions[i].wordIdx;
      link.arrows[wordIdx].visibility = false;
    }
    //link.arrows[0].visibility = false;

  } else {
    link.polylines[idx].visibility = true;
 
   for (var i = 0; i < xPositions.length; i++) {
      var wordIdx = xPositions[i].wordIdx;
      link.arrows[wordIdx].visibility = true;
    }
  
    //  link.arrows[link.words.length - 1].visibility = true;
    //setupLineInteractions(link); //only can interact with them if they are visible
  }

  calculateLinkLabels(idx, rowNum, (xL + xR)/2, yPos, link, (percentagePadding < Config.hideLinkTextPercentage));
}



function calculateMiddleRow (idx, rowNum, link, percentagePadding, xPositions, linkStyles  ) {

  var yPos = rows[rowNum].baseHeight - link.h * percentagePadding;
  var arrowPos = storeOnlyArrows(rowNum, yPos, link, xPositions);
  
  arrowPos.sort(function(a, b) {
    return a.x - b.x; 
  });
  
  var xL = 0; //xPositions[0];
  var xR = Config.svgWidth; //xPositions[link.words.length - 1];

   var pathline = 'M '+ (xL-10) + ' ' + (yPos-10) + 
    ' L ' + xL + ' ' +  yPos + 
    ' L ' + xR + ' ' +  yPos;

  for (var p = 0; p < arrowPos.length; p++) {
     pathline += 
        ' M ' + arrowPos[p].x + ' ' +  yPos +
        ' L ' + arrowPos[p].x + ' ' +  arrowPos[p].y;
  }

  //adding the first coordinate since the linearGradients don't seem to calculate on polylines with only 2 points!!! Seems to be an SVG bug!!! (the first coordinate is offscreen and so doesn't cause any problems... but I can imagine this could come back to haunt us... (or is it because the bbox is h=0?)

  //var polyline = [ [p2x-10,p2y-10],[p2x,p2y],[p3x,p3y] ];

  //var pathline = 'M '+ (p2x-10) + ' ' + (p2y-10) + 
  //  ' L ' + p2x + ' ' +  p2y + 
  //  ' L ' + p3x + ' ' +  p3y;

  //pathline += appendMiddleLinksToPathline(rowNum, p3y, link);

  link.linesLeftX.push(xL);
  link.linesRightX.push(xR);


  link.polylines[idx] = {polyline: pathline, style: linkStyles[idx]};

  if (percentagePadding < Config.hideLinkLinesPercentage) { 
    link.polylines[idx].visibility = false;
     for (var i = 0; i < xPositions.length; i++) {
      var wordIdx = xPositions[i].wordIdx;
      link.arrows[wordIdx].visibility = false;
    }

  } else {
    link.polylines[idx].visibility = true;
     for (var i = 0; i < xPositions.length; i++) {
      var wordIdx = xPositions[i].wordIdx;
      link.arrows[wordIdx].visibility = true;
    }

    //setupLineInteractions(link); //only can interact with them if they are visible
  }

  calculateLinkLabels(idx, rowNum, (xL+xR) / 2, yPos, link, (percentagePadding < Config.hideLinkTextPercentage));

}


function calculateEndRow(idx, rowNum, link, percentagePadding, xPositions, linkStyles ) {
  
  console.log("in calculateEndRow - " + link.toString());


  var yPos = rows[rowNum].baseHeight - link.h * percentagePadding;

  var arrowPos = storeOnlyArrows(rowNum, yPos, link, xPositions);

  arrowPos.sort(function(a, b) {
    return a.x - b.x; 
  });

  
  var xL = 0; //xPositions[0];
  var xR = arrowPos[arrowPos.length-1].x; //xPositions[link.words.length - 1];

  console.log("in calculateEndRow, xL =  " + xL + ", xR = " + xR);
  


  var pathline = 'M ' + xL + ' ' + yPos + 
    ' L ' + xR + ' ' +  yPos +
    ' L ' + xR + ' ' +  arrowPos[arrowPos.length-1].y;

  console.log("PATHLINE = " + pathline);
  
     for (var p = 0; p < arrowPos.length - 1; p++) {
       console.log("p = " + p);

     pathline += 
     ' M ' + arrowPos[p].x + ' ' +  yPos +
     ' L ' + arrowPos[p].x + ' ' +  arrowPos[p].y;
     }
     

  link.linesLeftX.push(xL);
  link.linesRightX.push(xR);


  /*
  var y2 = rows[rowNum].baseHeight - link.h * percentagePadding;
  var y3 = rows[rowNum].baseHeight - link.h * percentagePadding;
  var y4 = rows[rowNum].baseHeight - link.rightWord.h * percentagePadding;

  var p2x = 0; 
  var p2y = y2;

  var p3x = xR; 
  var p3y = y3;

  var p4x = xR; 
  var p4y = y4;


  var pathline = 'M '+ p2x + ' ' + p2y + 
    ' L ' + p3x + ' ' +  p3y +
    ' L ' + p4x + ' ' +  p4y;
  //' M ' + ((p2x+p3x)/2) + ' ' +  p3y +
    //' L ' + ((p2x+p3x)/2) + ' ' +  p4y;

 
//  pathline += appendMiddleLinksToPathline(rowNum, p3y, link);
 


//  var polyline = [ [p2x,p2y],[p3x,p3y],[p4x,p4y] ]; 
  link.linesLeftX.push(p2x);
  link.linesRightX.push(p4x);
*/

  link.polylines[idx] = {polyline: pathline, style: linkStyles[idx]};

  console.log("END link.polylines[idx] style = " + linkStyles[idx] );


 //  storeArrow(0, p1x, p1y, link, link.leftWord, link.leftAttach, getLeftXForLeftWord(link), getRightXForLeftWord(link));
  //storeArrow(link.words.length - 1, p4x, p4y, link, link.rightWord, link.rightAttach, getLeftXForRightWord(link), getRightXForRightWord(link));
 
  //storeRightArrow(p4x, p4y, link, link.rightWord, link.rightAttach, getLeftXForRightWord(link), getRightXForRightWord(link));

  if (percentagePadding < Config.hideLinkLinesPercentage) { //only bother drawing links if there's room in the row
    link.polylines[idx].visibility = false;

     for (var i = 0; i < xPositions.length; i++) {
      var wordIdx = xPositions[i].wordIdx;
      link.arrows[wordIdx].visibility = false;
    }
    
    //for (var i = 0; i < link.words.length; i++) {
    //  link.arrows[i].visibility = false;
   // }


  } else {

    link.polylines[idx].visibility = true;

     for (var i = 0; i < xPositions.length; i++) {
      var wordIdx = xPositions[i].wordIdx;
      link.arrows[wordIdx].visibility = true;
    }
    
    //for (var i = 0; i < link.words.length; i++) {
    //  link.arrows[i].visibility = true;
    //}


    //setupLineInteractions(link); //only can interact with them if they are visible
  }

  calculateLinkLabels(idx, rowNum, (xL+xR) / 2, yPos, link, (percentagePadding < Config.hideLinkTextPercentage));
}


function calculateLinkLabels(idx, rowNum, x, y, link, isHidden) {

  var style;
  var text;

  if (rowNum % 2 == 0) {
    style = styles.labelEvenFill.style;
  } else {
    style = styles.labelOddFill.style;
  }

  var twh = link.textWH;

  var rect = {x: (x - 2 - twh.w/2), y: (y - link.textStyle.maxHeight/2), w: (twh.w + 4), h: link.textStyle.maxHeight, style:style};


  if (Config.redraw) { 
    text = {text: link.textStr, x: (x - twh.w/2), y: (y - link.textStyle.maxHeight/2), style: (link.textStyle.style), visibility:true};
  }
  else {
    text = {text: link.textStr, x: (x - twh.w/2), y: (y - link.textStyle.maxHeight/2 - link.textStyle.descent), style: (link.textStyle.style), visibility:true};
  }

  console.log(" in calculateLinkLabels, idx = " + idx + ", rowNum = " + rowNum + ", rect = ");
  console.log(rect);
  console.log(" in calculateLinkLabels, text = ");
  console.log(text);
  console.log(link.textStyle.descent)

  link.labels[idx] = {rect:rect, text:text};

  if (isHidden) {
    link.labels[idx].text.visibility = false;
  } 
}


function drawLink(link) {

  console.log("\n\n\n***\n\nin drawLink ::: " + link.toString());
  var attachmentXPositions = getXPosForAttachmentByPercentageOffset(link); 

  console.log("attachment positions = ");
  console.log(attachmentXPositions);

  var xL = attachmentXPositions[0];
  var xR = attachmentXPositions[link.words.length - 1];

  console.log("... xL, xR = " + xL + ", " + xR);

  link.linesLeftX = [];
  link.linesRightX = [];

  var minRow = link.rootMinWord.row.idx;
  var maxRow = link.rootMaxWord.row.idx;

  link.numLineSegments = (maxRow - minRow)+1;

  var linkStyles;
  if (link.numLineSegments == 1) {
    linkStyles = [link.style.style];
  } else {
    linkStyles = getLinkStyles(link, attachmentXPositions);

    /* thought that it would be faster to not create new gradients on the fly, but doesn't seem to be the case! */ 
    /*
       var linkStyles = [];
       for (var i = 0; i < link.numLineSegments; i++) {
       linkStyles[i] = link.style.style;
       }
       */
  }

  for (var i = minRow; i <= maxRow; i++) {

    var rowNum = i - minRow;
    var availableHeight = rows[i].baseHeight - rows[i].rect.bbox().y;
    var percentagePadding = availableHeight / (rows[i].maxSlots + 1);

    if (i == minRow && minRow == maxRow) { //ONLY ROW
      var rowAttachXPos = filterXPositionsForOnlyThisRow(attachmentXPositions, i, link);

      calculateOnlyRow(minRow, link, percentagePadding, rowAttachXPos, linkStyles); 
    } else if (i == minRow) { //FIRST ROW

      var rowAttachXPos = filterXPositionsForOnlyThisRow(attachmentXPositions, minRow, link, -1);

      calculateStartRow(rowNum, i, link, percentagePadding, rowAttachXPos, linkStyles);
    } else if (i == maxRow) { //LAST ROW

      var rowAttachXPos = filterXPositionsForOnlyThisRow(attachmentXPositions, maxRow, link, 1);
      calculateEndRow(rowNum, i, link, percentagePadding, rowAttachXPos, linkStyles); 
    } else { //MIDDLE ROW
      var rowAttachXPos = filterXPositionsForOnlyThisRow(attachmentXPositions, i, link);

      calculateMiddleRow(rowNum, i, link, percentagePadding, rowAttachXPos, linkStyles); 
    }
  }
}



function filterXPositionsForOnlyThisRow(attachmentXPositions, row, link, which) {

  var rowAttachXPos = [];

  for (var aaa = 0; aaa < attachmentXPositions.length; aaa++) {
    if (link.words[aaa] instanceof Link) {

      console.log("rootMinWord = " + link.words[aaa].rootMinWord.toString());
      console.log("rootMaxWord = " + link.words[aaa].rootMaxWord.toString());

      if (link.words[aaa].rootMinWord.row.idx == row) {
        rowAttachXPos.push( {wordIdx:aaa, xpos:attachmentXPositions[aaa]} );
      } 

    } else if (link.words[aaa] instanceof Word) {

      if (link.words[aaa].row.idx == row) {
        rowAttachXPos.push( {wordIdx:aaa, xpos:attachmentXPositions[aaa]} );
      }
    }
  }

  return rowAttachXPos; 
}


function storeArrow(idx, x, y, link, word, side, leftX, rightX) {
  link.arrows[idx] = {x:x, y:y, link:link, word:word, side:side, leftX:leftX, rightX: rightX, visibility:true};
}


/*
   function storeLeftArrow(x, y, link, word, side, leftX, rightX) {
   link.arrows[0] = {x:x, y:y, link:link, word:word, side:side, leftX:leftX, rightX: rightX, visibility:true};
   }

   function storeRightArrow(x, y, link, word, side, leftX, rightX) {
   link.arrows[link.words.length - 1] = {x:x, y:y, link:link, word:word, side:side, leftX:leftX, rightX: rightX, visibility:true};
   }
   */



function getLeftXForLeftWord(link) {
  if (link.leftType == types.WORD) {
    return link.leftWord.leftX;
  } else { //link
    if (link.leftAttach == sides.LEFT) {
      return link.leftWord.linesLeftX[0];
    } else if (link.leftAttach == sides.RIGHT){
      return link.leftWord.linesLeftX[link.leftWord.numLineSegments-1];
    }
  }
}

function getRightXForLeftWord(link) {
  if (link.leftType == types.WORD) {
    return link.leftWord.rightX;
  } else { //link
    if (link.leftAttach == sides.LEFT) {
      return link.leftWord.linesRightX[0];
    } else if (link.leftAttach == sides.RIGHT) {
      return link.leftWord.linesRightX[link.leftWord.numLineSegments-1];
    }
  }
}

function getLeftXForRightWord(link) {
  if (link.rightType == types.WORD) {
    return link.rightWord.leftX;
  } else { //link
    if (link.rightAttach == sides.LEFT) {
      return link.rightWord.linesLeftX[0];
    } else if (link.rightAttach == sides.RIGHT) {
      return link.rightWord.linesLeftX[link.rightWord.numLineSegments-1];
    }
  }
}

function getRightXForRightWord(link) {
  if (link.rightType == types.WORD) {
    return link.rightWord.rightX;
  } else { //link
    if (link.rightAttach == sides.LEFT) {
      return link.rightWord.linesRightX[0];
    } else if (link.rightAttach == sides.RIGHT) {
      return link.rightWord.linesRightX[link.rightWord.numLineSegments-1];
    }
  }
}





