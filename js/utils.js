function createTestWords(numWords, minLength, maxLength) {

  var ws = [];
  for (var i = 0; i < numWords; i++) {

    //var w = new Word(getRandomString(minLength, maxLength), i);
    var w = new Word(getLetterString(i, minLength, maxLength), i);

    if (Math.random() < 0.5) {
      w.setTag(getRandomString(3,10));
    }


    ws.push(w);


    //ws.push(new Word(getLetterString(i, minLength, maxLength), i));
  }

  return ws;
}


function getLetterString(i, minLength, maxLength) {
 var str = "";
    var numChars = getRandomInt(minLength, maxLength);
    for (var ii = 0; ii < numChars; ii++) {

      var ch = String.fromCharCode(97+i);
      str += ch;
    }

    return str;
}


function getRandomString(minLength, maxLength) {
 var str = "";
    var numChars = getRandomInt(minLength, maxLength);
    for (var ii = 0; ii < numChars; ii++) {

      var ch = String.fromCharCode(getRandomInt(97,97+25));
      str += ch;
    }

    return str;

}


//testing this for now...
function createTestMultiLinks(numWord2WordLinks) {

   var ls = [];

    var rand1 = 0; //getRandomInt(0, wordObjs.length-1);
    var rand2 = 1; //getRandomInt(0, wordObjs.length-1);
    var rand3 = 2;
    var rand4 = 3;

    var direction = getRandomInt(-1,1);
    var style = getRandomStyle();

    //var ws = [wordObjs[rand1], wordObjs[rand2], wordObjs[rand3], wordObjs[rand4]];
    var ws = [wordObjs[3], wordObjs[2]]; //, wordObjs[3], wordObjs[1] ];
   // ls[0] = new Link([wordObjs[0], wordObjs[1]], [0,0], getRandomStyle(), getRandomString(3,5), texts.linkText);

    //  ls[0] = new Link([wordObjs[2], wordObjs[4]], [0,0], getRandomStyle(), getRandomString(3,5), texts.linkText);
    //ls[1] = new Link([wordObjs[2], wordObjs[4]], [0,0], getRandomStyle(), getRandomString(3,5), texts.linkText);


    ls[0] = new Link([wordObjs[2], wordObjs[3]], [0,0,-1,1], getRandomStyle(), getRandomString(3,5), texts.linkText);
    ls[1] = new Link([wordObjs[0],ls[0]], [0,0,-1,1], getRandomStyle(), getRandomString(3,5), texts.linkText);
    ls[2] = new Link( [ ls[0], wordObjs[0], ls[1], wordObjs[3] ], [0,0,-1,1], getRandomStyle(), getRandomString(3,5), texts.linkText);
    ls[3] = new Link( [ wordObjs[1],  wordObjs[3] ], [0,0,-1,1], getRandomStyle(), getRandomString(3,5), texts.linkText);

  //  ls[2] = new Link([wordObjs[1], wordObjs[2]], [0,0,-1], getRandomStyle(), getRandomString(3,5), texts.linkText);
  //  ls[3] = new Link([wordObjs[0], wordObjs[1]], [0,0,-1], getRandomStyle(), getRandomString(3,5), texts.linkText);

   /*
   ls[1] = new Link([wordObjs[0], wordObjs[2]], [0,0], getRandomStyle(), getRandomString(3,5), texts.linkText);


    ls[2] = new Link([wordObjs[0], wordObjs[2]], [0,0], getRandomStyle(), getRandomString(3,5), texts.linkText);


    ls[3] = new Link([wordObjs[2], wordObjs[4]], [0,0], getRandomStyle(), getRandomString(3,5), texts.linkText);
    ls[4] = new Link([wordObjs[2], wordObjs[4]], [0,0], getRandomStyle(), getRandomString(3,5), texts.linkText);
    ls[5] = new Link([wordObjs[2], wordObjs[4]], [0,0], getRandomStyle(), getRandomString(3,5), texts.linkText);


    ls[6] = new Link( [wordObjs[1], wordObjs[2] ], [1,1], getRandomStyle(), getRandomString(3,5), texts.linkText);
    */



    //ls[1] = new Link([ wordObjs[0], wordObjs[1] ], direction, getRandomStyle(), getRandomString(3,5), texts.linkText);

    //ls[2] = new Link([ wordObjs[1], wordObjs[4] ], direction, getRandomStyle(), getRandomString(3,5), texts.linkText);

    //ls[2] = new Link([wordObjs[1], ls[1], wordObjs[2], wordObjs[4]   ], direction, getRandomStyle(), getRandomString(3,5), texts.linkText);




/*
  ls.sort(function(a, b) {

    var d1 = Math.abs(a.s.idx - a.e.idx);
    var d2 = Math.abs(b.s.idx - b.e.idx);

    return d1 - d2;
  });
*/
Object.keys(ls).forEach(function(key) {

    //console.log(ls[key].toString());
    createLink(ls[key]);
    });

  return ls;


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
    var style = getRandomStyle();

    if (rand1 != rand2) {
      ls[cidx++] = new Link([wordObjs[rand1], wordObjs[rand2]], direction, style, getRandomString(3,5), texts.linkText);
    }
  }

  /*
  ls.sort(function(a, b) {

    var d1 = Math.abs(a.s.idx - a.e.idx);
    var d2 = Math.abs(b.s.idx - b.e.idx);

    return d1 - d2;
  });
  */

  var mx, cx;
  mx = cidx + numWord2LinkLinks;
  cx = cidx;

  while (cidx < mx) {

    var rand1 = getRandomInt(0,wordObjs.length - 1);
    var rand2 = getRandomInt(0,ls.length - 1);

    var direction = getRandomInt(-1,2);
    var style = getRandomStyle();


    if (rand1 != rand2) {
      ls[cidx++] = new Link([wordObjs[rand1], ls[rand2]], direction, style, getRandomString(3,5), texts.linkText);
    }
  }


  mx = cidx + numLink2LinkLinks;
  cx = cidx;

  while (cidx < mx) {

    var rand1 = getRandomInt(0,ls.length - 1);
    var rand2 = getRandomInt(0,ls.length - 1);

    var direction = getRandomInt(-1,2);
    var style = getRandomStyle();

    if (rand1 != rand2) {
      ls[cidx++] = new Link([ls[rand1], ls[rand2]], direction, style, getRandomString(3,5), texts.linkText);
    }
  }


  Object.keys(ls).forEach(function(key) {

    ////console.log(ls[key].toString());
    createLink(ls[key]);
    });

  return ls;
}

function getRandomStyle() {
   var num = getRandomInt(0,4);

   //return styles.simpleLine;

   switch (num) {
     case 0:
       return styles.gradientLine1;
     case 1:
       return styles.gradientLine2;
     case 2:
       return styles.bothLine;
     case 3:
       return styles.noneLine;
     case 4:
       return styles.simpleLine;
     default:
       return styles.simpleLine;
   }

}

function getTextWidth(word, fs) {
  let t = draw.text(word).font(fs)
  let l = t.length();
  t.remove();
  return l;
}
function getTextWidthAndHeight(word, fs) {
  var text2 = draw.text(word).font(fs);
  textbbox = text2.bbox();
  text2.remove();

  ////console.log("w / h = " + textbbox.w + ", " + textbbox.h);
  return {w:textbbox.w, h:textbbox.h};
}


function getMaxTextHeightForFont(str, fs) {
  var t = draw.text(str).y(0).font(fs);
  textbbox = t.bbox();
  t.remove();

  ////console.log("in getMaxTextHeightForFont, y = " + textbbox.y + ", y2 = " + textbbox.y2);
  return textbbox.h;
}


function getDescentForFont(str, fs) {
  var t = draw.text(str).y(0).font(fs);
  textbbox = t.bbox();
  t.remove();

  console.log("in getMaxTextHeightForFont, y = " + textbbox.y + ", y2 = " + textbbox.y2);
  return textbbox.y;
}


function printLink(link) {

  if (Config.debug) {
    //console.log("----- \nprinting link ["+ link.id + "]: ");
    //console.log(link);
    //console.log("-----");
  }
}

function debugSlots() {
  // var debug = false;
  if (Config.debug) {
    for (var i = 0; i < wordObjs.length; i++) {
      //console.log("slots taken for word " + wordObjs[i].val + " :");

      //console.log("   L");
      for (var ii = 0; ii < wordObjs[i].slotsL.length; ii++) {
        //console.log(wordObjs[i].slotsL[ii]);
      }

      //console.log("   R");
      for (var ii = 0; ii < wordObjs[i].slotsR.length; ii++) {
        //console.log(wordObjs[i].slotsR[ii]);
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

  ////console.log("    in swap, a = " + vals.a.id + ", b = " + vals.b.id);



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
