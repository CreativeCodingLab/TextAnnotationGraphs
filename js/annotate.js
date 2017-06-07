function checkSlotAvailabity(num, slotArr) {
  return slotArr.indexOf(num) > -1;
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
function traceBackToNearestWordObj(link, type, word, attach) { 

  var retVal = {w: -1, s: -1};

  if (type == types.WORD) {

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
    
    return traceBackToWordObj(nextLink, nextType, nextWord, nextAttach);
  }
}
//current link, the word we're tracing, and the side that it's on
function traceBackToWordObj(link, type, word, attach) { 

  var retVal = {w: -1, s: -1};

  if (type == types.WORD) { 

    retVal.w = word;
    retVal.s = attach;

    return retVal;

  } else {

    var nextLink = word;
    var nextType, nextWord, nextAttach;  

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
    
    return traceBackToWordObj(nextLink, nextType, nextWord, nextAttach);
  }
}

function determineSide(link) {
  var rootS, rootE;

    if (link.leftType == types.WORD) {
      rootS = link.leftWord.idx;
    } else {
      rootS = link.leftWord.rootMinWord.idx;
    }

    if (link.rightType == types.WORD) {
      rootE = link.rightWord.idx;
    } else {
      rootE = link.rightWord.rootMaxWord.idx;
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
    flip(link);
  } 
}


function sortLinkWords(link) {

  // console.log("\n\n***\nUNSORTED!", link, link.words);

  for (var i = 0; i < link.words.length; i++) {
    var w = link.words[i];

    if (w instanceof Word) {
      w.rootIdx = w.idx;
    } else {
      w.rootIdx = Math.floor((w.rootMinWord.idx + w.rootMaxWord.idx) / 2)
    }

    // console.log(i + ": " + w + ", rootIdx = " + w.rootIdx);


  }

  link.words.sort(function(a, b) {

    var d1 = Math.abs(a.rootIdx);
    var d2 = Math.abs(b.rootIdx);

    return d1 - d2; 
  });

   // console.log("\n\n***\nSORTED!");
  for (var i = 0; i < link.words.length; i++) {

       var w = link.words[i];
 
    // console.log(i + ": " + w + ", rootIdx = " + w.rootIdx);

  }

}

function createLink(link) {


  sortLinkWords(link);
  link.setStartAndEnd();

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
  var rootWordAndSide = traceBackToWordObj(link, link.leftType, link.leftWord, link.leftAttach);
  var rootnearestWordAndSide = traceBackToNearestWordObj(link, link.leftType, link.leftWord, link.leftAttach);
  link.rootMinWord = rootWordAndSide.w;
  link.rootMinSide = rootWordAndSide.s;
  link.nearestConnectedMinWord = rootnearestWordAndSide.w;

  checkSlotAt = Math.max(checkSlotAt, link.leftWord.h + 1);
  rootWordAndSide = traceBackToWordObj(link, link.rightType, link.rightWord, link.rightAttach);
  rootWordAndSide = traceBackToNearestWordObj(link, link.rightType, link.rightWord, link.rightAttach);
  link.rootMaxWord = rootWordAndSide.w;
  link.rootMaxSide = rootWordAndSide.s;
  link.nearestConnectedMaxWord = rootnearestWordAndSide.w;
  checkSlotAt = Math.max(checkSlotAt, link.rightWord.h + 1); //minimum height to start checking
  //set checkSlotAt to 1 if you want to be able to connect from underneath

  //what slot is open? (ie figure out y position)
  link.h = checkAndUpdateWordToWordSlots(link, checkSlotAt); 


  //testing attaching the PARENT link to each child..

  //explicitly link parents of link (i.e., links that attach to this link)
  if (link.leftAttach == sides.LEFT) {
    link.leftWord.parentsL.push(link);
  } else if (link.leftAttach == sides.RIGHT) {
    link.leftWord.parentsR.push(link);
  }

  if (link.rightAttach == sides.LEFT) {
    link.rightWord.parentsL.push(link);
  } else if (link.rightAttach == sides.RIGHT) {
    link.rightWord.parentsR.push(link);
  }

  //determine middle words links...
  for (var i = 1; i < link.words.length - 1; i++) {
    var middleWord = link.words[i];
    middleWord.parentsC.push(link)
  }

}

function determineParentLinkOffsets(word, side, parentLinks, totalAttachmentPoints, offsetIdx) {

  // console.log("in determineParentLinkOffsets, word = " + word.toString() +", checking side " + side);

  var linkStartingHere = [];
  var linksEndingHere = [];

  for (var i = 0; i < parentLinks.length; i++) {

    for (var ii = 0; ii < parentLinks[i].words.length; ii++) {

      if (parentLinks[i].words[ii] == word) {
        linkStartingHere.push( {link:parentLinks[i], word:word, idx:ii} );
      }

    }
  }


  var pinc, poff;
  if (totalAttachmentPoints <= 1) {
    pinc = 0.5;
    poff = 0.5; //Config.attachmentMargin + (pinc * offsetIdx);

  } else {
    pinc = ((1.0 - (Config.attachmentMargin*2))*1.0)  / (totalAttachmentPoints - 1);
    poff = Config.attachmentMargin + (pinc * offsetIdx);

  }


  for (var i = 0; i < linkStartingHere.length; i++) {
    var lshL = linkStartingHere[i].link;
    var lshW = linkStartingHere[i].word;
    var lshI = linkStartingHere[i].idx;

/*    console.log("linkStartingHere = " + linkStartingHere[i].toString());
    console.log(linkStartingHere[i]);
    console.log("lshL = " + lshL.toString());
    console.log("lshW = " + lshW.toString());
    console.log("lshI = " + lshI);

    console.log(lshL.arrowXPercents);
*/
    lshL.arrowXPercents[lshI] = poff;
    poff += pinc;
  }

}

function arrangeOffsetValsForAttachmentPoints(words) {


  //actually strategy isn't important here, it's the *direction* the attached link is heading...
  // if heading left-to-right, then higher attached links should be to the left
  // if heading right-to-left, then higher attached links should be to the right
  //so... first partition each side of the word by link direction, *then* sort each of those partitions by height in an order depending on direction. 
  // For instance, if left side of word, then links that END on the left side will be first (or could be), with sorting from min to max height, *then* links that START on the left side will be next, with sorting from max to min height.

  for (var w = 0; w < words.length; w++) {

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
