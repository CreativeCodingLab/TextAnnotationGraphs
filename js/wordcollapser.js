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
          console.log('left', word);
        }
        // selected words in the wrong order
        else if (leftWord.idx >= word.idx) {
          cancel();
          console.log('out of order... canceling');
        }
        // select second word
        else {
          console.log('right', leftWord, word);

          let text = "";
          for (let i = leftWord.idx; i <= word.idx; ++i) {
            if (i > leftWord.idx) {
              text += ' ';
            }
            text += wordObjs[i].val;
          }

          let phrase = new Word(text, leftWord.idx);

          let row = leftWord.row;

          wordObjs.splice(wordObjs.indexOf(leftWord), 1, phrase);
          row.words.splice(row.words.indexOf(leftWord), 1, phrase);

          phrase.leftX = leftWord.leftX;
          phrase.row = row;
          phrase.draw();
          leftWord.svg.hide();
          cancel();
        }
      }
    }
  }

  return WordCollapser;
})();