import Word from '../components/word.js';
import WordCluster from '../components/wordcluster.js';
import Link from '../components/link.js';

class ReachParser {
  constructor() {
    this.data = {};
  }

  /*
    @param data : JSON input
   */
  parse(data) {
    /* first get string tokens from the syntaxData */
    const text = data.syntaxData.text;
    const tokens = data.syntaxData.entities
      .sort((a, b) => a[2][0][0] - b[2][0][0])
      .map(x => {
        return {
          text: text.substring(x[2][0][0], x[2][0][1]),
          id: x[0],
          type: x[1],
          startIndex: x[2][0][0],
          endIndex: x[2][0][1]
        }
      });

    function findTokenByIndex([i1, i2]) {
      const startToken = tokens.findIndex(token => token.startIndex === i1);
      const endToken = tokens.findIndex(token => token.endIndex === i2);
      return [startToken, endToken];
    }

    const syntax = data.syntaxData.relations.map(arr => {
      return {
        id: arr[0],
        trigger: arr[2][0][1],
        arguments: [
          {
            id: arr[2][1][1],
            type: arr[1]
          }
        ]
      };
    });

    /* parse the event data: entities, triggers, events, and relations */
    const e = data.eventData;
    const entities = e.entities.map(arr => {
        return {
            id: arr[0],
            type: arr[1],
            tokenIndex: findTokenByIndex(arr[2][0]),
            string: e.text.substring(arr[2][0][0], arr[2][0][1])
        };
      });

    const triggers = e.triggers.map(arr => {
          return {
              id: arr[0],
              type: arr[1],
              tokenIndex: findTokenByIndex(arr[2][0]),
              string: e.text.substring(arr[2][0][0], arr[2][0][1])
          };
      });

    const events = e.events.map(arr => {
          return {
              id: arr[0],
              trigger: arr[1],
              arguments: arr[2].map(argument => {
                  return {
                      id: argument[1],
                      type: argument[0]
                  };
              })
          };
      });

    const relations = e.relations.map(arr => {
          return {
              id: arr[0],
              type: arr[1],
              arguments: arr[2].map(argument => {
                  return {
                      id: argument[1],
                      type: argument[0]
                  };
              })
          };
      });

    this.buildWordsAndLinks(tokens, entities, triggers, events, relations, syntax);
  }

  buildWordsAndLinks(tokens, entities, triggers, events, relations, syntax) {
    // construct word objects and tags from tokens, entities, and triggers
    const words = tokens.map((token, i) => {
      let w = new Word(token.text, i);
      w.setSyntaxTag(token.type);
      w.setSyntaxId(token.id);
      return w;
    });

    const clusters = [];

    [].concat(entities, triggers).forEach(el => {
      if (el.tokenIndex[0] === el.tokenIndex[1]) {
        words[el.tokenIndex[0]].setTag(el.type);  // TODO: enable setting multiple tags
        words[el.tokenIndex[0]].addEventId(el.id);
      }
      else {
        let cluster = [];
        for (let i = el.tokenIndex[0]; i <= el.tokenIndex[1]; ++i) {
          cluster.push(words[i]);
        }
        const wordCluster = new WordCluster(cluster, el.type);
        wordCluster.addEventId(el.id);
        clusters.push(wordCluster);
      }
    });

    entities = words.concat(clusters);

    function searchForEntity(argument) {
      let anchor;
      switch (argument.id.charAt(0)) {
        case 'E':
        case 'R':
          anchor = links.find(link => link.eventId === argument.id);
          break;
        case 'T':
          anchor = entities.find(word => word.eventIds.indexOf(argument.id) > -1);
          break;
        default:
          console.log('unhandled argument type', argument);
          break;
      }
      return { anchor, type: argument.type };
    }

    // construct links from events and relations
    const links = [];
    events.forEach(evt => {
      // create a link between the trigger and each of its arguments
      const trigger = entities.find(word => word.eventIds.indexOf(evt.trigger) > -1);
      const args = evt.arguments.map(searchForEntity);

      // create link
      const link = new Link(evt.id, trigger, args);

      // push link to link array
      links.push(link);
    });

    relations.forEach(rel => {
      const args = rel.arguments.map(searchForEntity);
      // create link
      const link = new Link(rel.id, null, args, rel.type);

      // push link to link array
      links.push(link);
    });

    // syntax data
    syntax.forEach(syn => {
      // create a link between the trigger and each of its arguments
      const trigger = entities.find(word => word.syntaxId === syn.trigger);
      const args = syn.arguments.map(arg => {
        let anchor = words.find(w => w.syntaxId === arg.id);
        return { anchor, type: arg.type };
      });

      // create link
      const link = new Link(syn.id, trigger, args, null, false);

      // push link to link array
      links.push(link);
    });

    this.data = {
      words, links, clusters
    };
  }
}

module.exports = ReachParser;
