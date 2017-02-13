


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


//gets max slot number to be assigned to this word
function getHeightForWord(word) {
    
  var maxH = 0;

  //console.log("in getHeightForWord " + word.toString());
  for (var ii = 0; ii < word.slotsL.length; ii++) {
    maxH = Math.max(maxH, word.slotsL[ii]);
  }

  for (var ii = 0; ii < word.slotsR.length; ii++) {
    maxH = Math.max(maxH, word.slotsR[ii]);
  }

  //console.log("returning largest slot for this word = " + maxH );
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
        if (word.rightX > (svgWidth - edgepadding) ) {
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
    totalW += word.rectSVG.width();
  }

  if (totalW > svgWidth - (edgepadding*2)) {
    return totalW - (svgWidth - (edgepadding*2));
  }

  return 0;
}

/* this method is called whenever the window width changes */
function recalculateRows(percChange) {

  
  //console.log("\n\nin recalculateRows()");
  for (var i = 0; i < rows.length; i++) {
    
    var row = rows[i];
    //console.log("\t) row #" + row.idx);

    row.rect.width(draw.width());

    row.lineTop.plot(0, row.ry, draw.width(), row.ry);
    row.lineBottom.plot(0, row.ry+row.rh, draw.width(), row.ry+row.rh);

    row.dragRect.x(draw.width() - (dragRectSide+dragRectMargin));

    //first pass at resizing   

    for (var ii = 0; ii < row.words.length; ii++) {
      
      
      var word = row.words[ii];

      //first try to expand or shrink size of words - but no smaller than the word's min width
      var nw = Math.max( Math.min(word.getMaxWidth(), word.rectSVG.width() * percChange), word.getMinWidth() );

      //var nw = Math.max(word.getMinWidth(), word.rectSVG.width() * percChange);
      //nw = Math.max(nw, word.getMaxWidth());

      var nx = edgepadding + (word.percPos * (svgWidth-edgepadding*2));

      setWordToXW(word, nx, nw);
      word.update();
      
    }

    var everythingFits = checkIfEverythingFits(row);

    
    if (!everythingFits) { 

      console.log("row " + row + ": nope, not everything fits!");

      var resizeByHowMuch = checkIfNeedToResizeWords(row);

      if (resizeByHowMuch == 0) {
         console.log("great, we just need to push words around");
      } else {
         console.log("hmm... need to shrink the words if we can, by " + resizeByHowMuch);
         console.log("is this possible?");

        var wordsFitInRow = true;

        if (row.getMinWidth() > (svgWidth - edgepadding*2)) {
          console.log("words will not fit in row! have to adjust...");
          wordsFitInRow = false;
        } 

        if (!wordsFitInRow) {
           console.log("not possible... need to hop rows or make new row");

          //we'll make all minimum width for now
          for (var ii = row.words.length-1; ii >= 0 ; ii--) {
            var word = row.words[ii];
            setWordToXW(word, word.leftX, word.getMinWidth());
            word.update();
          }

        } else {
          console.log("yep! it's possbile");
          //which words can shrink? and by how much?

          //copy words in row to a temp array, which we'll sort by room left
          var newArray = [];
          for (var ii = 0; ii < row.words.length; ii++) {
            newArray[ii] = row.words[ii];
          }

          newArray.sort(function(a, b) {
            var d1 = a.rectSVG.width() - a.getMinWidth();
            var d2 = b.rectSVG.width() - b.getMinWidth();
            return d1 - d2; 
          });

          var numWords = row.words.length;
          var pixelsPerWord = resizeByHowMuch / numWords; 

          for (var ii = 0; ii < newArray.length; ii++) {
            var word = newArray[ii];

            var minW = word.getMinWidth();

            if (word.rectSVG.width() - pixelsPerWord < minW) {

              var minus = word.rectSVG.width() - minW;
              setWordToXW(word, word.rectSVG.x(), minW);
              word.update();

                console.log("ii = " + ii + ": can't shrink by " +  pixelsPerWord + ", so shrinking by much as possible = " + minus);

              numWords--;
              resizeByHowMuch -= minus;
              pixelsPerWord = resizeByHowMuch / numWords; 
            } else {
              setWordToXW(word, word.rectSVG.x(), word.rectSVG.width() - pixelsPerWord);
              word.update();
              numWords--;
              resizeByHowMuch -= pixelsPerWord;
              console.log("ii = " + ii + ": shrinking by pixelsPerWord = " +  pixelsPerWord);
            }
          }
        }
      }

      //realignWords();
      
    } else { 
      console.log("everything fits!");
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
      checkIfCanMoveLeft(word.rectSVG.x(), word.rectSVG.width(), word.rectSVG.y(), word, true);
      word.update();
    }
    


    for (var ii = 0; ii < row.words.length; ii++) {
      var word = row.words[ii];
      checkIfCanMoveRight(word.rectSVG.x(), word.rectSVG.width(), word.rectSVG.y(), word, false);
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

  svgWidth = w;
  svgHeight = h;
  draw.size(w, h);
}


function appendRow() {

  row = new Row(rows.length);
  rows.push(row);

  row.maxSlots = 0;

  row.ry = 5 + rows[row.idx - 1].rect.bbox().y + rows[row.idx - 1].rect.bbox().h;
  row.rh = rows[row.idx - 1].rect.bbox().h; 

  if (row.idx % 2 == 0) {
    row.color = evenRowsColor;
  } else {
    row.color = oddRowsColor;
  }

  drawRow(row);

  changeSizeOfSVGPanel(window.innerWidth - 16, row.lineBottom.y() + 1);

}

function drawRow(row) {

  row.rect = rowGroup.rect(svgWidth,row.rh).x(0).y(row.ry);

  if (row.idx % 2 == 0) {
    row.rect.style(styles.rowRectEvenFill.style);
  } else {
    row.rect.style(styles.rowRectOddFill.style); 
  }

  row.lineTop = rowGroup.line(0, row.ry, svgWidth, row.ry).style(styles.rowLineStroke.style);
  row.lineBottom = rowGroup.line(0, row.ry+row.rh, svgWidth, row.ry+row.rh).style(styles.rowLineStroke.style);

  row.dragRect = rowGroup.rect(dragRectSide,dragRectSide).x(svgWidth - (dragRectSide+dragRectMargin)).y(row.ry + row.rh - (dragRectSide+dragRectMargin)).style(styles.rowDragRectFill.style);


  row.baseHeight = row.lineBottom.y() - (textpaddingY*2) - texts.wordText.maxHeight;

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

  for (var i = 0; i < words.length; i++) {

    var wh = getTextWidthAndHeight(wordObjs[i].val, texts.wordText.style);

    if (i == 0) {

      rowNum = 0;
      row = new Row(rowNum);
      rows.push(row);
      row.maxSlots = 0;

      x = edgepadding;

    } else if (x + wh.w + (textpaddingX*2) + edgepadding > svgWidth) {

      rowNum++;
      row = new Row(rowNum);
      rows.push(row);
      row.maxSlots = 0;

      x = edgepadding;
    }

    var word = words[i];
    row.words.push(word);
    row.maxSlots = Math.max(row.maxSlots, getHeightForWord(word));
    word.row = row;
    word.tw = wh.w;
    word.th = texts.wordText.maxHeight; //guaranteed to be the same for all words

    x += wh.w + (textpaddingX*2) + wordpadding;
  }

  for (var i = 0; i < rows.length; i++) {

    var row = rows[i];

    if (i == 0) {
      row.ry = 5;
    } else {
      row.ry = 5 + rows[row.idx - 1].ry + rows[row.idx - 1].rh;
    }

    row.rh = 10 + ((textpaddingY * 2) + texts.wordText.maxHeight) + (levelpadding * row.maxSlots);

    if (row.idx % 2 == 0) {
      row.color = evenRowsColor;
    } else {
      row.color = oddRowsColor;
    }

    var x = edgepadding;
    for (var ii = 0; ii < row.words.length; ii++) {

      var word = row.words[ii];

      word.h = 0; //the number of link levels is 0 for the word

      var textwh = getTextWidthAndHeight(word.val, texts.wordText.style);
      word.ww = textwh.w + (textpaddingX * 2);
      word.wx = x;

      word.wh = texts.wordText.maxHeight + textpaddingY*2; 
      word.wy = row.ry + row.rh - word.wh;

      x += textwh.w + (textpaddingX*2) + wordpadding;

      row.baseHeight = word.wy; //that is, where the top of the word is in the row.

    }
  }
}

function drawWord(word) {

  var underneathRect = draw.rect( word.ww, word.wh ).x( word.wx ).y( word.wy ).style(styles.wordFill.style);

  var textwh = getTextWidthAndHeight(word.val, texts.wordText.style);

  var text = draw.text(function(add) {

    add.text(word.val)
    .y(word.wy + textpaddingY - texts.wordText.descent)
    .x(word.wx + (word.ww/2) - (textwh.w / 2))
    .font(texts.wordText.style);
  });

  //this rect is invisible, but used for detecting mouseevents, as its drawn on top of the text+underneathRect (which provided the color+fill+stroke)
  var rect = draw.rect(word.ww, word.wh).x( word.wx ).y( word.wy ).fill( {color:'#fff',opacity: 0.0} );

  var leftHandle = draw.rect(handleW, handleH).x(word.wx).y( word.wy + (word.wh / 2 ) - (handleH / 2) ).style(styles.handleFill.style);


  var rightHandle = draw.rect(handleW,handleH).x(word.wx + word.ww - (handleW)).y( word.wy + (word.wh / 2 ) - (handleH / 2) ).style(styles.handleFill.style);



  word.text = text;
  word.rectSVG = rect;
  word.underneathRect = underneathRect;
  word.rect = rect.bbox();
  word.leftX = rect.bbox().x;
  word.rightX = rect.bbox().x + rect.bbox().w;
  word.leftHandle = leftHandle;
  word.rightHandle = rightHandle;
  word.percPos = (word.leftX-edgepadding) / (svgWidth-edgepadding*2);

  setUpLeftHandleDraggable(leftHandle, rect, text, word, word.idx );
  setUpRightHandleDraggable(rightHandle, rect, text, word, word.idx );

  setUpWordDraggable(word); 
  setupMouseOverInteractions(word);

  rect.dblclick(function() {
    word.isSelected = !word.isSelected;

    if (word.isSelected) {
      style = word.isHovered ? "hoverAndSelect" : "select";
    }
    else {
      style = word.isHovered ? "hover" : "style";
    }
  underneathRect.style(styles.wordFill[style]);
  });
}



var _linkLabels = [];
var _links = [];
var _arrows = [];

function drawLinks(ls) {
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
  }
}


function drawAllLinks() {

  var link = linkG.group();

  for (var i = 0; i < linkObjs.length; i++) {

    var lo = linkObjs[i];

    //console.log("lo.numLineSegments = " + lo.numLineSegments + " and lo.polylineSVGs.length = " + lo.polylineSVGs.length);
    //console.log(lo.polylineSVGs);

    if (lo.numLineSegments != lo.polylineSVGs.length) {
      if (lo.numLineSegments < lo.polylineSVGs.length) {
        //need to remove the old SVGs
        //console.log("REMOVING SVG");
        for (var ii = lo.numLineSegments; ii < lo.polylineSVGs.length; ii++) {
          lo.polylineSVGs[ii].remove();
          lo.polylineSVGs.splice(ii,1);
        }
      } else if (lo.numLineSegments > lo.polylineSVGs.length) {
        //need to add new SVGs
        //console.log("ADDING SVG");
        for (var ii = lo.polylineSVGs.length; ii < lo.numLineSegments; ii++) {
          lo.polylineSVGs[ii] = null;
        }
      }
      //return;
    }

    for (var ii = 0; ii < lo.numLineSegments; ii++) {

      if (lo.polylineSVGs[ii] == null) { //hasn't been drawn before
        lo.polylineSVGs[ii] = link.polyline( lo.polylines[ii].polyline ).style( lo.polylines[ii].style) ;
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

  //interactions are for an array of polylines, eg when links are multi-rows. TODO

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

/*
   var linkLabel = _linkLabels[i];
   var rect = linkLabel.rect;
   var text = linkLabel.text;


   label.rect( rect.w, rect.h ).x( rect.x ).y( rect.y ).style( rect.style ); 
   label.text( text.text ).x( text.x ).y( text.y ).font( text.style );
   */
//AGF - not sure what this code is needed for... maybe to add interactions later?
/*
   if (link.labelRect) {
   link.labelRect.push(label);
   }
   else {
   link.labelRect = [label];
   }
   */



/** redraws all links that have been marked as needsUpdate = true, OR by passing in a boolean of true to indicate that the window has resized **/
function redrawLinks(forceRedrawingAll) { //force redraw of all when resizing window

  Object.keys(linkObjs).forEach(function(key) {
    if (linkObjs[key].needsUpdate || forceRedrawingAll == true) {
      //console.log(" link #" + key + " needsUpdate");
      drawLink(linkObjs[key]);
      linkObjs[key].needsUpdate = false;
    }
  });

  drawAllLinks();
  drawAllLinkLabels();
  drawAllArrows();
}

function getXPosForAttachmentByPercentageOffset(link) {

  var leftX_1 = getLeftXForLeftWord(link);
  var rightX_1 = getRightXForLeftWord(link);
  var leftX_2 = getLeftXForRightWord(link); 
  var rightX_2 = getRightXForRightWord(link);

  var lengthOfHalfOfLeftWord = ((rightX_1 - leftX_1) / 2);
  var lengthOfHalfOfRightWord = ((rightX_2 - leftX_2) / 2)

    if (link.leftAttach == sides.LEFT) { //attaches to the left side of the left word
      xL = leftX_1 + (lengthOfHalfOfLeftWord * link.x1percent) ;
    } else if (link.leftAttach == sides.RIGHT) { //attaches to the right side of the left word
      xL = (rightX_1) - ( lengthOfHalfOfLeftWord * link.x1percent); 
    }

  if (link.rightAttach == sides.LEFT) { //attaches to the left side of the right word
    xR =  leftX_2 + (lengthOfHalfOfRightWord * link.x2percent); 
  } else if (link.rightAttach == sides.RIGHT) {  //attaches to the right side of the right word

    xR = (rightX_2 ) - (lengthOfHalfOfRightWord * link.x2percent);
  }

  return {left:xL, right:xR};
}




function getLinkStyles(link, xpts) {

  //TODO - need to reverse direction of gradient when link reverses! currently always assumes increases in x direction, but manually moving links around can put the end x point before the start x point (ie, when moving link2link links). In that case, need to reverse the x's
  // gradient.from(0, 0).to(1, 0) is the default, would need to be gradient.from(1, 0).to(0, 0)

  var linkStyles = [];

  var c1, c2;
  var styleStr;

  var left = xpts.left;
  var right = xpts.right;

  //total length = middle rows * (screen width-margin*2) + (screenwidth-margin - left) + (right - margin)

  var middleLength = 0;
  if (link.numLineSegments > 2) {
    middleLength = (svgWidth-edgepadding*2) * (link.numLineSegments - 2);
  }
  var firstLength = (svgWidth-edgepadding) - left;
  var lastLength = right - edgepadding;
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
        ep = (sx + (svgWidth-edgepadding*2)) / totalLength;

        sx += (svgWidth-edgepadding*2);
      } else {
        sp = sx / totalLength;
        ep = 1.0;
        //sx = totalLength;
        //sx += lastLength;
        //console.log("does sx = totalLength? : " + sx + " = " + totalLength); //yep!
      }

      //console.log("in getLinkStyles : i = " + i + ", sp/ep = " + sp + ", " + ep);
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



function calculateOnlyRow(rowNum, link, percentagePadding, xL, xR, linkStyles) {

  var x1 = xL;
  var x2 = xL;
  var x3 = xR;
  var x4 = xR;

  link.numLineSegments = 1;

  var availableHeight = rows[rowNum].baseHeight - rows[rowNum].rect.bbox().y;
  var percentagePadding = availableHeight / (rows[rowNum].maxSlots + 1);

  y1 = rows[rowNum].baseHeight - link.leftWord.h * percentagePadding;
  y2 = rows[rowNum].baseHeight - link.h * percentagePadding;
  y3 = rows[rowNum].baseHeight - link.h * percentagePadding;
  y4 = rows[rowNum].baseHeight - link.rightWord.h * percentagePadding;

  var p1x = x1; 
  var p1y = y1;

  var p2x = x2; 
  var p2y = y2;

  var p3x = x3; 
  var p3y = y3;

  var p4x = x4; 
  var p4y = y4;

  link.linesLeftX.push(p1x);
  link.linesRightX.push(p4x);

  var polyline = [ [p1x,p1y],[p2x,p2y],[p3x,p3y],[p4x,p4y] ];
  var lineStyle;

  lineStyle = link.style.style;

  link.polylines[0] = {polyline: polyline, style: lineStyle};

  storeLeftArrow(p1x, p1y, link, link.leftWord, link.leftAttach, getLeftXForLeftWord(link), getRightXForLeftWord(link));
  storeRightArrow(p4x, p4y, link, link.rightWord, link.rightAttach, getLeftXForRightWord(link), getRightXForRightWord(link));



  if (percentagePadding < hideLinkLinesPercentage) { //only bother drawing links if there's room in the row
    link.polylines[0].visibility = false;
    link.arrow1.visibility = false;
    link.arrow2.visibility = false;

  } else {
    link.polylines[0].visibility = true;
    link.arrow1.visibility = true;
    link.arrow2.visibility = true;


    link.polylines[0].style = lineStyle;

    //setupLineInteractions(link); //only can interact with them if they are visible
  }

  calculateLinkLabels(0, rowNum, (p2x+p3x) / 2, p2y, link, (percentagePadding < hideLinkTextPercentage));

}


function calculateMiddleRow (i, rowNum, link, percentagePadding, linkStyles  ) {

  var y2 = rows[rowNum].baseHeight - link.h * percentagePadding;
  var y3 = rows[rowNum].baseHeight - link.h * percentagePadding;

  var p2x = 0; 
  var p2y = y2;
  var p3x = svgWidth; 
  var p3y = y3;


  //adding the first coordinate since the linearGradients don't seem to calculate on polylines with only 2 points!!! Seems to be an SVG bug!!! (the first coordinate is offscreen and so doesn't cause any problems... but I can imagine this could come back to haunt us...

  var polyline = [ [p2x-10,p2y-10],[p2x,p2y],[p3x,p3y] ];

  link.linesLeftX.push(p2x);
  link.linesRightX.push(p3x);


  link.polylines[i] = {polyline: polyline, style: linkStyles[i]};

  if (percentagePadding < hideLinkLinesPercentage) { 
    link.polylines[i].visibility = false;
  } else {
    link.polylines[i].visibility = true;
    //setupLineInteractions(link); //only can interact with them if they are visible
  }

  calculateLinkLabels(i, rowNum, (p2x+p3x) / 2, p2y, link, (percentagePadding < hideLinkTextPercentage));


}


function calculateEndRow(i, rowNum, link, percentagePadding, xR, linkStyles ) {

  var y2 = rows[rowNum].baseHeight - link.h * percentagePadding;
  var y3 = rows[rowNum].baseHeight - link.h * percentagePadding;
  var y4 = rows[rowNum].baseHeight - link.rightWord.h * percentagePadding;

  var p2x = 0; 
  var p2y = y2;

  var p3x = xR; 
  var p3y = y3;

  var p4x = xR; 
  var p4y = y4;

  var polyline = [ [p2x,p2y],[p3x,p3y],[p4x,p4y] ]; 
  link.linesLeftX.push(p2x);
  link.linesRightX.push(p4x);

  link.polylines[i] = {polyline: polyline, style: linkStyles[i]};

  storeRightArrow(p4x, p4y, link, link.rightWord, link.rightAttach, getLeftXForRightWord(link), getRightXForRightWord(link));

  if (percentagePadding < hideLinkLinesPercentage) { //only bother drawing links if there's room in the row
    link.polylines[i].visibility = false;
    link.arrow2.visibility = false;

  } else {

    link.polylines[i].visibility = true;
    link.arrow2.visibility = true;
    //setupLineInteractions(link); //only can interact with them if they are visible
  }

  calculateLinkLabels(i, rowNum, (p2x+p3x) / 2, p2y, link, (percentagePadding < hideLinkTextPercentage));
}


function calculateStartRow(i, rowNum, link, percentagePadding, xL, linkStyles ) {

  var x1 = xL;
  var x2 = xL;

  y1 = rows[rowNum].baseHeight - link.leftWord.h * percentagePadding;
  y2 = rows[rowNum].baseHeight - link.h * percentagePadding;
  y3 = rows[rowNum].baseHeight - link.h * percentagePadding;

  var p1x = x1; 
  var p1y = y1;

  var p2x = x2; 
  var p2y = y2;

  var p3x = svgWidth; 
  var p3y = y3;

  var polyline = [ [p1x,p1y],[p2x,p2y],[p3x,p3y] ];

  link.linesLeftX.push(p1x);
  link.linesRightX.push(p3x);

  link.polylines[i] = {polyline: polyline, style: linkStyles[i]};

  storeLeftArrow(p1x, p1y, link, link.leftWord, link.leftAttach, getLeftXForLeftWord(link), getRightXForLeftWord(link));

  if (percentagePadding < hideLinkLinesPercentage) { 
    link.polylines[i].visibility = false;
    link.arrow1.visibility = false;

  } else {
    link.polylines[i].visibility = true;
    link.arrow1.visibility = true;
    //setupLineInteractions(link); //only can interact with them if they are visible
  }

  calculateLinkLabels(i, rowNum, (p2x+p3x)/2, p2y, link, (percentagePadding < hideLinkTextPercentage));
}


function calculateLinkLabels(idx, rowNum, x, y, link, isHidden) {

  var style;

  if (rowNum % 2 == 0) {
    style = styles.labelEvenFill.style;
  } else {
    style = styles.labelOddFill.style;
  }

  var twh = link.textWH;

  var rect = {x: (x - 2 - twh.w/2), y: (y - link.textStyle.maxHeight/2), w: (twh.w + 4), h: link.textStyle.maxHeight, style:style};
  var text = {text: link.textStr, x: (x - twh.w/2), y: (y - link.textStyle.maxHeight/2 - link.textStyle.descent), style: (link.textStyle.style), visibility:true};

  link.labels[idx] = {rect:rect, text:text};

  if (isHidden) {
    link.labels[idx].text.visibility = false;

  } 
}


function drawLink(link) {


  var attachmentXPositions = getXPosForAttachmentByPercentageOffset(link);

  var xL = attachmentXPositions.left;
  var xR = attachmentXPositions.right;

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
      calculateOnlyRow(minRow, link, percentagePadding, xL, xR, linkStyles); 
    } else if (i == minRow) { //FIRST ROW
      calculateStartRow(rowNum, i, link, percentagePadding, xL, linkStyles);
    } else if (i == maxRow) { //LAST ROW
      calculateEndRow(rowNum, i, link, percentagePadding, xR, linkStyles); 
    } else { //middle row...
      calculateMiddleRow(rowNum, i, link, percentagePadding, linkStyles); 
    }
  }
}



function storeLeftArrow(x, y, link, word, side, leftX, rightX) {
  link.arrow1 = {x:x, y:y, link:link, word:word, side:side, leftX:leftX, rightX: rightX, visibility:true};
}

function storeRightArrow(x, y, link, word, side, leftX, rightX) {
  link.arrow2 = {x:x, y:y, link:link, word:word, side:side, leftX:leftX, rightX: rightX, visibility:true};
}


function getLeftXForLeftWord(link) {
  if (link.ts == types.WORD) {
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
  if (link.ts == types.WORD) {
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
  if (link.te == types.WORD) {
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
  if (link.te == types.WORD) {
    return link.rightWord.rightX;
  } else { //link
    if (link.rightAttach == sides.LEFT) {
      return link.rightWord.linesRightX[0];
    } else if (link.rightAttach == sides.RIGHT) {
      return link.rightWord.linesRightX[link.rightWord.numLineSegments-1];
    }
  }
}





