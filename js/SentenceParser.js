/*
 * A parser that creates links for not only words
 * but also sentences and paragraphs.
 */

class SentenceParser {
  constructor() {
    this.text = "";
    this.tokens = [];
    this.data = {};
  }

  /* load a json from a path */
  readJson(path, callback) {

    var json = path || './data/data1.json';

    function loadJSON(path, callback2) {
        var httpRequest = new XMLHttpRequest();
        httpRequest.onreadystatechange = function() {
            if (httpRequest.readyState === 4) {
                if (httpRequest.status === 200) {
                    var data = JSON.parse(httpRequest.responseText);
                    if (callback2) {
                      callback2(data);
                    }
                    if (callback) {
                      callback();
                    }
                }
            }
        };
        httpRequest.open('GET', path);
        httpRequest.send(); 
    }

    /* parse json file*/
    loadJSON(json, this.parseData.bind(this));
  }

  /**
   * parse a json file
   */
  parseData(data) {
    /* first get string tokens from the syntaxData */
    this.text = data.syntaxData.text;

    const offsets = {};
    this.tokens = data.syntaxData.entities
      .map(x => x[2][0])
      .sort((a, b) => a[0] - b[0])
      .map((interval, i) => {
        offsets[interval[0]] = i;
        return this.text.substring(interval[0], interval[1]);
      });

    /* parse the event data: entities, triggers, events, and relations */
    const e = data.eventData;
    const entities = e.entities.map(arr => {
          return {
              id: arr[0],
              type: arr[1],
              tokenIndex: offsets[arr[2][0][0]],
              string: e.text.substring(arr[2][0][0], arr[2][0][1])
          };
      });

    const triggers = e.triggers.map(arr => {
          return {
              id: arr[0],
              type: arr[1],
              tokenIndex: offsets[arr[2][0][0]],
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


    // Generate data for sentences so semantic zoom can be
    // implemented for the staircase
    var sentence = this.text.split(".");
    console.log("Sentences: \n" + sentence);

    // Go through the entities array and add links to the sentence
    // that the entity belongs to
    var sentenceCounter = 0;
    var currentSentence = "";
    for (var i = 0; i < entities.length; i++) {
      var entityId = parseInt(entities[i].id.substring(1));
      if (entityId < sentence[sentenceCounter].split(" ").length) {  // entityId smaller than number of words in the sentence
        currentSentence += entities[i].string + " ";
      } else {
        console.log(currentSentence);
        sentenceCounter++;
        currentSentence = "";
      }
    }


    this.data = {
      entities,
      triggers,
      events,
      relations
    };
  }
}
