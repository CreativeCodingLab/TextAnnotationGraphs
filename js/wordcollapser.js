const WordCollapser = (function() {

  let div = {};
  let selecting;
  let unjoin;
  let leftWord;

  function listenForLeftWord() {
    selecting = true;
    if (leftWord) { leftWord.unhover(); }
    leftWord = null;
    div.className = 'bracket-left';
  }

  function listenForRightWord() {
    if (leftWord) { leftWord.hover(); }
    div.className = 'bracket-right';
  }

  function listenForUnjoin() {
    cancel();
    selecting = true;
    unjoin = true;
  }

  function cancel() {
    if (leftWord) { leftWord.unhover(); }
    selecting = false;
    unjoin = false;
    leftWord = null;
    div.className = null;
  }

  document.addEventListener('keydown', function(e) {
    let c = e.keyCode;
    if (c === 65) { // A
      listenForLeftWord();
    }
    else if (c === 83) { // S
      listenForUnjoin();
    }
    else {
      cancel();
    }
  });

  function joinWords(word) {
    let lIndex = wordObjs.indexOf(leftWord);
    let rIndex = wordObjs.indexOf(word);
    let text = leftWord.val;
    for (let i = lIndex + 1; i <= rIndex; ++i) {
      text += ' ' + wordObjs[i].val;
    }

    // condense text if too long
    if (text.length > 25) {
      text = text.slice(0, 12) + "…" + text.slice(-12);
    }

    let phrase = new Word(text, leftWord.idx, ' ');

    let row = leftWord.row;

    let numberToSplice = 1 + rIndex - lIndex;

    // remove word refs from wordObjs
    let removedWords = wordObjs.splice(lIndex, numberToSplice, phrase);

    // remove word refs from rows
    numberToSplice -= row.words.splice(row.words.indexOf(leftWord), numberToSplice, phrase).length;
    let i = row.idx + 1;

    while (numberToSplice > 0 && rows[i]) {
      numberToSplice -= rows[i].words.splice(0, numberToSplice).length;
      ++i;
    }

    // reassign link-word references and hide svgs
    removedWords.forEach(word => {

      // replace backreferences of word in link with phrase
      function replaceLinkWordObject(link) {
        if (!link._words) {
          link._words = link.words.slice();
        }

        ['leftWord', 'rightWord', 'nearestConnectedMaxWord', 'nearestConnectedMinWord', 'rootMaxWord', 'rootMinWord'].forEach(prop => {
          if (link[prop] === word) {
            link[prop] = phrase;
            if (!link['_' + prop]) {
              link['_'+prop] = word;
            }
          }
          let idx = link.words.indexOf(word);
          if (idx > -1) {
            link.words[idx] = phrase;
          }
        });

        link.parents.forEach(replaceLinkWordObject);
      }

      // relink word links to phrase
      ['parentsL', 'parentsC', 'parentsR'].forEach(prop => {
        phrase[prop] = phrase[prop].concat(word[prop]);
      });
      ['slotsL', 'slotsR'].forEach(prop => {
        word[prop].forEach(slot => {
          if (phrase[prop].indexOf(slot) < 0) {
            phrase[prop].push(slot);
          }
        });
      })

      // recurse through word's ancestor links
      word.parents.forEach(replaceLinkWordObject);

      // make svg invisible
      word.svg.hide();

    });

    phrase.removedWords = Array.prototype.concat.apply([], removedWords.map(word => {
        if (word.removedWords) {
          word.svg.remove();
          return word.removedWords;
        }
        return word;
      }));

    phrase.leftX = leftWord.leftX;
    phrase.row = row;
    phrase.draw();
    redrawLinks(true);
    cancel();
  }

  function unjoinWord(word) {
    let i = word.row.words.indexOf(word);
    let row = word.row;

    [].splice.apply(wordObjs, [wordObjs.indexOf(word), 1].concat(word.removedWords));
    [].splice.apply(row.words, [i, 1].concat(word.removedWords));

    // set position of uncollapsed words
    const rowWidth = Config.svgWidth - Config.edgePadding * 2;
    let x = word.leftX;
    let y = word.underneathRect.y();
    word.removedWords.forEach(rw => {
      rw.row = row;
      rw.leftX = -1;
      rw.svg.show();
    });

    // rearrange remaining words on row
    while (row.words[i]) {
      if (x <= row.words[i].leftX) {
        break;
      }
      moveWordToNewPosition(row.words[i], x, y);
      x += row.words[i].underneathRect.width() + Config.wordPadding;
      if (x > rowWidth) {
        // move down a row
        if (row.idx + 1 === rows.length) { appendRow(); }
        let w = row.words[i];
        for (let j = row.words.length - 1; j >=i; --j) {
          moveWordDownARow(row.words[j]);
        }
        row = w.row;
        x = w.leftX + w.underneathRect.width() + Config.wordPadding;
        y = w.underneathRect.y();
        i = 1;
      }
      else {
        ++i;
      }
    }

    // revert assigned references to word in link
    function revertLinkWordObject(link) {
      ['leftWord', 'rightWord', 'nearestConnectedMaxWord', 'nearestConnectedMinWord', 'rootMaxWord', 'rootMinWord'].forEach(prop => {
        let _prop = '_' + prop;
        if (link[_prop]) {
          link[prop] = link[_prop];
          delete link['_'];
        }
      });

      if (link._words) {
        link.words = link._words;
        delete link._words;
      }
      link.parents.forEach(revertLinkWordObject);
    };

    word.parents.forEach(revertLinkWordObject);

    word.svg.remove();

    redrawLinks(true);
  }

  class WordCollapser {

    constructor() {
      div = document.getElementById('drawing');
      let buttons = document.querySelectorAll('#collapse button');
      buttons[0].onclick = listenForLeftWord;
      buttons[1].onclick = listenForUnjoin;
    }

    setClick(word) {
      if (selecting) {
        // unjoin collapsed word
        if (unjoin) {
          if (word.removedWords) {
            unjoinWord(word);
          }
          cancel();
        }
        // selecting left word
        else if (leftWord === null) {
          leftWord = word;
          listenForRightWord();
        }
        // selected words in the wrong order
        else if (leftWord.idx >= word.idx) {
          cancel();
          console.log('out of order... canceling');
        }
        // select second word
        else {
          joinWords(word);
        }
      }
    }
  }

  return WordCollapser;
})();