function createTestWords(numWords, minLength, maxLength) {

  var ws = [];
  for (var i = 0; i < numWords; i++) {

    var str = "";
    var numChars = getRandomInt(minLength, maxLength);
    for (var ii = 0; ii < numChars; ii++) {

      var ch = String.fromCharCode(getRandomInt(97,97+25));
      str += ch;
    }

    ws.push(new Word("" + str, i));
  }

  return ws;
}


/* 
 * numWord2WordLinks must be greater than one if you have any word2LinkLinks or link2LinkLinks.
 */
function createTestLinks(numWord2WordLinks, numWord2LinkLinks, numLink2LinkLinks) {

  var ls = []; 


  var cidx = 0;
  while (cidx < numWord2WordLinks) {

    var rand1 = getRandomInt(0, wordObjs.length-1);
    var rand2 = getRandomInt(0, wordObjs.length-1);

    var direction = getRandomInt(-1,2);

    if (rand1 != rand2) {
      ls[cidx++] = new Link(wordObjs[rand1], wordObjs[rand2], direction);
    }
  }


  ls.sort(function(a, b) {

    var d1 = Math.abs(a.s.idx - a.e.idx);
    var d2 = Math.abs(b.s.idx - b.e.idx);

    return d1 - d2; 
  });

  var mx, cx;
  mx = cidx + numWord2LinkLinks;
  cx = cidx;

  while (cidx < mx) {

    var rand1 = getRandomInt(0,wordObjs.length - 1);
    var rand2 = getRandomInt(0,ls.length - 1);

    var direction = getRandomInt(0,2);

    if (rand1 != rand2) {
      ls[cidx++] = new Link(wordObjs[rand1], ls[rand2], direction);
    }
  }


  mx = cidx + numLink2LinkLinks;
  cx = cidx;

  while (cidx < mx) {

    var rand1 = getRandomInt(0,ls.length - 1);
    var rand2 = getRandomInt(0,ls.length - 1);

    var direction = getRandomInt(0,2);

    if (rand1 != rand2) {
      ls[cidx++] = new Link(ls[rand1], ls[rand2], direction);
    }
  }


  Object.keys(ls).forEach(function(key) {

    console.log(ls[key].toString());
    createLink(ls[key]);
    });




  return ls; 

}



function getTextWidthAndHeight(word, fs) {
  var text2 = draw.text(word).font(fs);
    textbbox = text2.bbox();
    text2.remove();

    console.log("w / h = " + textbbox.w + ", " + textbbox.h);
    return {w:textbbox.w, h:textbbox.h};
}


function getMaxTextHeightForFont(str, fs) {
    var t = draw.text(str).y(0).font(fs);
    textbbox = t.bbox();
    t.remove();

    //console.log("in getMaxTextHeightForFont, y = " + textbbox.y + ", y2 = " + textbbox.y2);
    return textbbox.h;
}


function getDescentForFont(str, fs) {
    var t = draw.text(str).y(0).font(fs);
    textbbox = t.bbox();
    t.remove();

    //console.log("in getMaxTextHeightForFont, y = " + textbbox.y + ", y2 = " + textbbox.y2);
    return textbbox.y;
}


function printLink(link) {

  if (debug) {
    console.log("----- \nprinting link ["+ link.id + "]: ");
    console.log(link);
    console.log("-----");
  }
}

function debugSlots() {
  // var debug = false;
  if (debug) {
    for (var i = 0; i < wordObjs.length; i++) {
      console.log("slots taken for word " + wordObjs[i].val + " :");

      console.log("   L");
      for (var ii = 0; ii < wordObjs[i].slotsL.length; ii++) {
        console.log(wordObjs[i].slotsL[ii]);
      }

      console.log("   R");
      for (var ii = 0; ii < wordObjs[i].slotsR.length; ii++) {
        console.log(wordObjs[i].slotsR[ii]);
      }   
    }
  }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function swapVals(vals){

  var tmpA = vals.a;
  var tmpB = vals.b;
  //vals.a = tmpB;
  //vals.b = tmpA;

  vals = {a:tmpB, b:tmpA}

  console.log("    in swap, a = " + vals.a.id + ", b = " + vals.b.id);



  //   swap(link.rootMinWord, link.rootMaxWord);
  //   swap(link.rootMinSide, link.rootMaxSide);

  /*
     uMinWord = link.rootMaxWord;
     uMaxWord = link.rootMinWord;

     link.rootMinWord = uMinWord;
     link.rootMaxWord = uMaxWord;

     uMinSide = link.rootMaxSide;
     uMaxSide = link.rootMinSide;

    link.rootMinWord = uMinWord;
    link.rootMinSide = uMinSide;
    link.rootMaxWord = uMaxWord;
    link.rootMaxSide = uMaxSide;
*/
}

