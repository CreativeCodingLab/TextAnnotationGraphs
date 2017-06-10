const WordCollapser = (function() {

  let div;
  let selecting;
  let leftWord;

  function listenForLeftWord() {
    selecting = true;
    leftWord = null;
    div.className = 'bracket-left';
  }

  function listenForRightWord() {
    div.className = 'bracket-right';
  }

  function cancel() {
    selecting = false;
    leftWord = null;
    div.className = null;
  }

  class WordCollapser {

    constructor() {
      div = document.getElementById('drawing');

      document.addEventListener('keydown', function(e) {
        let c = e.keyCode;
        if (c === 65) { // A
          listenForLeftWord();
        }
        else {
          cancel();
        }
      });
    }

    setClick(word) {
      if (selecting) {
        // selecting left word
        if (leftWord === null) {
          leftWord = word;
          listenForRightWord();
          console.log('left', word);
        }
        // selected words in the wrong order
        else if (leftWord.idx >= word.idx) {
          cancel();
          console.log('out of order... canceling');
        }
        // select second word
        else {
          console.log('right', word);

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

          let phrase = new Word(text, leftWord.idx);

          let row = leftWord.row;

          let numberToSplice = 1 + rIndex - lIndex;

          // todo: correct number over multi rows
          let removedWords = wordObjs.splice(lIndex, numberToSplice, phrase);
          row.words.splice(row.words.indexOf(leftWord), numberToSplice, phrase);

          phrase.leftX = leftWord.leftX;
          phrase.row = row;
          phrase.draw();
          removedWords.forEach(word => word.svg.hide());
          cancel();
        }
      }
    }
  }

  return WordCollapser;
})();