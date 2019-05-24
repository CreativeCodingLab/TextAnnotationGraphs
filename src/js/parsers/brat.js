import Word from "../components/word.js";
import Link from "../components/link.js";

class BratParser {
  constructor() {
    this.data = {};
    this.re = /:+(?=[TER]\d+$)/; // regular expression for reading in a
    // mention
    this.text = "";
    this.mentions = {};
  }

  /*
    @param textInput : Source text     or  text + input in standoff format
    @param entInput  : entity annotation or input in standoff format
    @param evtInput  : event annotations or {undefined}
   */
  parse(textInput, entInput, evtInput) {
    this.mentions = {};
    let lines;

    // separate source text and annotation
    if (!entInput) {
      let splitLines = textInput.split("\n");
      this.text = splitLines[0];
      lines = splitLines.slice(1);
    } else {
      this.text = textInput;
      lines = entInput.split("\n");
      if (evtInput) {
        lines = lines.concat(evtInput.split("\n"));
      }
    }

    // filter out non-annotation lines
    lines.forEach((line) => {
      let tokens = line.trim().split(/\s+/);
      if (tokens[0] && tokens[0].match(/[TER]\d+/)) {
        this.mentions[tokens[0]] = {
          annotation: tokens,
          object: null
        };
      }
    });

    // recursively build graph
    let graph = {
      words: [],
      links: [],
      clusters: []
    };

    this.textArray = [
      {
        charStart: 0,
        charEnd: this.text.length,
        entity: null
      }
    ];

    for (let id in this.mentions) {
      if (this.mentions[id] && this.mentions[id].object === null) {
        this.parseAnnotation(id, graph);
      }
    }

    let n = graph.words.length;
    let idx = 0;
    this.textArray.forEach((t, i) => {
      if (t.entity === null) {
        let text = this.text.slice(t.charStart, t.charEnd).trim();

        if (text === "") {
          // The un-annotated span contained only whitespace; ignore it
          return;
        }

        text.split(/\s+/).forEach((token) => {
          let word = new Word(token, idx);
          graph.words.push(word);
          idx++;
        });
      } else {
        t.entity.idx = idx;
        idx++;
      }
    });
    graph.words.sort((a, b) => a.idx - b.idx);

    this.data = graph;
  }

  parseAnnotation(id, graph) {
    // check if mention exists & has been parsed already
    let m = this.mentions[id];
    if (m === undefined) {
      return null;
    }
    if (m.object !== null) {
      return m.object;
    }

    // parse annotation
    let tokens = m.annotation;
    switch (tokens[0].charAt(0)) {
      case "T":
        /**
         * Entity annotations have:
         * - Unique ID
         * - Type
         * - Character span
         * - Raw text
         */
        let tbm = this.parseTextMention(tokens);
        if (tbm === null) {
          // invalid line
          delete this.mentions[id];
          return null;
        } else {
          // valid line; add Word
          graph.words.push(tbm);
          m.object = tbm;
          return tbm;
        }
      case "E":
        /**
         * Event annotations have:
         * - Unique ID
         * - Type:ID string representing the trigger entity
         * - Role:ID strings representing the argument entities
         */
        let em = this.parseEventMention(tokens, graph);
        if (em === null) {
          // invalid event
          delete this.mentions[id];
          return null;
        } else {
          // valid event; add Link
          graph.links.push(em);
          m.object = em;
          return em;
        }
      case "R":
        /**
         * Binary relations have:
         * - Unique ID
         * - Type
         * - Role:ID strings representing the argument entities (x2)
         */
        let rm = this.parseRelationMention(tokens, graph);
        if (rm === null) {
          // invalid event
          delete this.mentions[id];
          return null;
        } else {
          // valid event; add Link
          graph.links.push(rm);
          m.object = rm;
          return rm;
        }
      case "A":
        break;
    }
    return null;
  }

  parseTextMention(tokens) {
    const id = tokens[0].slice(1);
    const label = tokens[1];
    const charStart = Number(tokens[2]);
    const charEnd = Number(tokens[3]);

    if (charStart >= 0 && charStart < charEnd && charEnd <= this.text.length) {
      // create Word
      let word = new Word(this.text.slice(charStart, charEnd), Number(id));
      word.registerTag("default", label);
      word.addEventId(id);

      // cut textArray
      let textWord = {
        charStart,
        charEnd,
        entity: word
      };

      let i = this.textArray.findIndex((token) => token.charEnd > charStart);
      if (i === -1) {
        console.log("// mistake in tokenizing string");
      } else if (this.textArray[i].charStart < charStart) {
        // textArray[i] starts to the left of the word
        let tempEnd = this.textArray[i].charEnd;
        this.textArray[i].charEnd = charStart;

        // insert word into array
        if (tempEnd > charEnd) {
          this.textArray.splice(i + 1, 0, textWord, {
            charStart: charEnd,
            charEnd: tempEnd,
            entity: null
          });
        } else {
          this.textArray.splice(i + 1, 0, textWord);
        }
      } else {
        // textArray[i] starts at the same place or to the right of the word
        if (this.textArray[i].charEnd === charEnd) {
          this.textArray[i].entity = word;
        } else {
          this.textArray.splice(i, 0, textWord);
          this.textArray[i + 1].charStart = charEnd;
          this.textArray[i + 1].entity = null;
        }
      }
      return word;
    } else {
      return null;
    }
  }

  searchBackwards(arr, fn) {
    for (let i = arr.length - 1; i >= 0; --i) {
      if (fn(arr[i])) {
        return arr[i];
      }
    }
    return null;
  }

  parseEventMention(tokens, graph) {
    let successfulParse = true;
    const id = tokens[0];
    const args = tokens
      .slice(1)
      .map((token, i) => {
        let [label, id] = token.split(this.re);
        let object = this.parseAnnotation(id, graph);
        if (object !== null) {
          return {
            type: label,
            anchor: object
          };
        } else {
          if (i === 0) {
            successfulParse = false;
          }
          return null;
        }
      })
      .filter((arg) => arg);
    if (successfulParse && args.length > 1) {
      // create link
      return new Link(id, args[0].anchor, args.slice(1));
    } else {
      return null;
    }
  }

  parseRelationMention(tokens, graph) {
    if (tokens.length < 4) {
      return null;
    }
    let successfulParse = true;
    const id = tokens[0];
    const reltype = tokens[1];
    const args = tokens.slice(2, 4).map((token) => {
      let [label, id] = token.split(this.re);
      let object = this.parseAnnotation(id, graph);
      if (object !== null) {
        return {
          type: label,
          anchor: object
        };
      } else {
        successfulParse = false;
      }
    });

    if (successfulParse === true) {
      return new Link(id, null, args, reltype);
    } else {
      return null;
    }
  }
}

export default BratParser;
