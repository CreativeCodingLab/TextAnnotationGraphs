import Word from '../components/word.js';
import Link from '../components/link.js';

class BratParser {
  constructor() {
    this.data = {};
    this.re = /:+(?=[TER]\d+$)/;    // regular expression for reading in a mention
  }

/*
  @param textInput : Source text     or  input in standoff format
  @param annInput  : BRAT annotation or  {undefined}
  @param evtInput  : event annotations or {undefined}
 */
  parse(textInput, annInput, evtInput) {
    var output = {
      texts: [],
      events: [],
      relations: [],
      attributes: [],
      unparsedLines: [],
      text: null,
      tokens: [],
      mentions: {}
    }

    let text, lines;

    // separate source text and annotation
    if (!annInput) {
      let splitLines = textInput.split('\n');
      text = splitLines[0];
      lines = splitLines.slice(1);
    } else {
      text = textInput;
      lines = annInput.split('\n');
      if (evtInput) {
        lines = lines.concat(
          evtInput.split('\n'));
      }
    }

    if (!text) {
      output.unparsedLines = lines;
      return output;
    }

    let textLength = text.length;
    let unparsedLines = [];
    let mentions = {};

    for (let i = 0; i < lines.length; ++i) {
      const line = lines[i].trim();
      if (!line) { continue; }

      let tokens = line.split(/\s+/);

      let parseIsSuccessful = false;

      /** The following IDs are currently supported:

      T: text-bound annotation
      E: event
      R: relation
      A: attribute

      Normalizations, notes, and equivalence relations are not currently supported
      */

      switch (tokens[0].charAt(0)) {
        case 'T':
          let tbm = this.parseTextBoundMention(tokens, textLength);
          if (tbm) {
            output.texts.push(tbm);
            mentions[tbm.id] = tbm;
            parseIsSuccessful = true;
          }
          break;
        case 'E':
          let em = this.parseEventMention(tokens, mentions);
          if (em) {
            output.events.push(em);
            mentions[em.id] = em;
            parseIsSuccessful = true;
          }
          break;
        case 'R':
          let rm = this.parseRelationMention(tokens, mentions);
          if (rm) {
            output.relations.push(rm);
            mentions[rm.id] = rm;
            parseIsSuccessful = true;
          }
          break;
        case 'A':
          let a = this.parseAttribute(tokens, mentions);
          if (a) {
            output.attributes.push(a);
            mentions[a.id] = a;
            parseIsSuccessful = true;
          }
          break;
      }

      if (!parseIsSuccessful) {
        unparsedLines.push(line);
      }
    }

    // split text into tokens
    output.texts.sort((a,b) => {
      if (a.charEnd - b.charEnd != 0) {
        return a.charEnd - b.charEnd;
      }
      else {
        return a.charStart - b.charStart;
      }
    });

    let tokens = [];
    let tbm_i = 0;
    let token_start = 0;
    for (let ch = 0; ch < textLength; ++ch) {
      let tbm = output.texts[tbm_i];
      while (text[token_start] === ' ') {
        ++token_start;
      }
      if (tbm && tbm.charStart <= ch) {
        tokens.push({
          word: text.slice(tbm.charStart, tbm.charEnd),
          start: tbm.charStart,
          end: tbm.charEnd
        });
        token_start = tbm.charEnd;

        while(output.texts[tbm_i] && output.texts[tbm_i].charStart <= ch){
          output.texts[tbm_i].tokenId = tokens.length - 1;
          ++tbm_i;
        }
      }
      else if (/\s/.test(text[ch])) {
        if (token_start < ch) {
          tokens.push({
            word: text.slice(token_start, ch),
            start: token_start,
            end: ch
          });
          token_start = ch + 1;
        }
      }
    }
    if (token_start < textLength) {
      tokens.push({
        word: text.slice(token_start, textLength),
        start: token_start,
        end: textLength
      });
    }

    output.tokens = tokens;
    output.text = text;
    output.mentions = mentions;
    output.unparsedLines = unparsedLines;

    this.buildWordsAndLinks(output);
  }

  buildWordsAndLinks(data) {
    let mentions = {};
    let links = [];
    let clusters = [];

    // build words
    let words = data.tokens.map((token, i) => new Word(token.word, i));
    data.texts.forEach(tbm => {
    words[tbm.tokenId].setTag(tbm.label);
    words[tbm.tokenId].addEventId(tbm.id);
    mentions[tbm.id] = words[tbm.tokenId];
    });

    // build links
    for (let m in data.mentions) {
      let mention = data.mentions[m];
      if (m[0] === 'E') {
        if (data.mentions[mention.trigger] &&
        mention.arguments.every(arg => data.mentions[arg.id])) {

        let trigger = mentions[mention.trigger];
        let args = mention.arguments.map(arg => {
          return {
            anchor: mentions[arg.id],
            type: arg.type
          };
        });

        let newLink = new Link(mention.id, trigger, args);
        mentions[mention.id] = newLink;
        links.push(newLink);
        }
      } else if (m[0] === 'R') {
        if (mention.arguments.every(arg => data.mentions[arg.id])) {
        let args = mention.arguments.map(arg => {
          return {
          anchor: mentions[arg.id],
          type: arg.type
          };
        });

        let newLink = new Link(mention.id, null, args, mention.label);
        mentions[mention.id] = newLink;
        links.push(newLink);
        }
      }
    }

    this.data = {
      words,
      links,
      clusters
    };
  }


  /* ------- parse specific kinds of mentions ------ */
  parseTextBoundMention(tokens, textLength) {
    const id = +tokens[0].slice(1),
      label = tokens[1],
      charStart = +tokens[2],
      charEnd = +tokens[3];

    if (id > 0 && charStart >= 0 && charStart < charEnd && charEnd <= textLength) {
      return {
        id: 'T' + id,
        label,
        charStart,
        charEnd
      };
    }
  }

  parseEventMention(tokens, mentions) {
    const id = +tokens[0].slice(1),
      trigger = tokens[1],
      args = tokens.slice(2);

    if (id > 0 && trigger && args.length > 0) {
      let split = trigger.split(this.re);
      if (split[0].length > 0 && mentions[split[1]]) {

        const em = {
          id: 'E' + id,
          label: split[0],
          trigger: split[1],
          arguments: []
        };

        args.forEach(argument => {
          let splitArgument = argument.split(this.re);
          if (splitArgument[0].length > 0 && mentions[splitArgument[1]]) {
            em.arguments.push({
              type: splitArgument[0],
              id: splitArgument[1]
            });
          }
        });

        return em;
      }
    }
  }

  parseRelationMention(tokens, mentions) {
    const id = +tokens[0].slice(1),
      label = tokens[1],
      arg1 = tokens[2],
      arg2 = tokens[3];

    if (id > 0 && arg2) {
      const split1 = arg1.split(this.re),
        split2 = arg2.split(this.re);

      if (mentions[split1[1]] && mentions[split2[1]]) {
        return {
          id: 'R' + id,
          label,
          arguments: [{
            type: split1[0],
            id: split1[1]
          }, {
            type: split2[0],
            id: split2[1]
          }]
        };
      }
    }
  }

  parseAttribute(tokens, mentions) {
    const id = +tokens[0].slice(1),
      attribute = tokens[1],
      target = tokens[2];

    if (id > 0 && mentions[target]) {
      return {
        id,
        target,
        attribute,
        value: tokens.slice(3).join(' ')
      };
    }
  }
}

module.exports = BratParser;
