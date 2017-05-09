function readJson(path) {

  var json = path || './data/angus-ex.json';

  function loadJSON(path, callback) {
      var httpRequest = new XMLHttpRequest();
      httpRequest.onreadystatechange = function() {
          if (httpRequest.readyState === 4) {
              if (httpRequest.status === 200) {
                  var data = JSON.parse(httpRequest.responseText);
                  if (callback) callback(data);
              }
          }
      };
      httpRequest.open('GET', path);
      httpRequest.send(); 
  }

  /* parse json file*/
  loadJSON(json, parseData);
}


/** init words and links from json data
 *  - first hierarchy:  documents--sentences--words (+associated syntax tags)
 *  -                   edges connect parts of speech
 *  - second hierarchy: events--paths | arguments--themes
 */
function parseData(data) {
  let wordDataArray = [];
  let wordDataMap = {};
  let syntaxDataArray = [];
  let mentionDataArray = [];

  for (var i in data.documents) {
    let doc = data.documents[i];

    doc.sentences.forEach(function(sentence, j) {
      // parse word data
      let sentenceData = sentence.words.map(function(word, k) {

        let wordDataObject = {
          text: word,
          documentId: i,
          sentenceId: j,
          locationInSentence: k,
          charLocationInSentence: sentence.startOffsets[k],
          syntaxData: {
            tag: sentence.tags[k]
          },
          bioData: {
            tag: ''
          }
        };

        wordDataMap[[i,j,k].join('-')] = wordDataArray.length;
        wordDataArray.push(wordDataObject);
        return wordDataObject
      });

      // create POS links
      sentence.graphs["stanford-collapsed"].edges.forEach(function(edge) {
        syntaxDataArray.push({
          destination: sentenceData[edge.destination],
          label: edge.relation,
          type: edge.relation,
          source: sentenceData[edge.source]
        })
      });

    })
  }

  // flatten data.mentions array
  let printMention = function(mention, i) {
    if (mention.arguments) {
      for (var j in mention.arguments) {
        mention.arguments[j] = mention.arguments[j].map(printMention)
      }
    }

    switch (mention.type) {
      case "CorefTextBoundMention":
        // has text(s) only
        let start = wordDataMap[[mention.document, mention.sentence, mention.tokenInterval.start].join('-')];
        let end = wordDataMap[[mention.document, mention.sentence, mention.tokenInterval.end].join('-')];

        var link = {
          sourceId: null,
          destinationId: null,
          words: wordDataArray.slice(start, end),
          label: mention.displayLabel,
          id: mention.id,
          charOffset: mention.characterStartOffset,
          type: mention.type
        };
        mentionDataArray.push(link);
        return link;
      case "CorefRelationMention":
        // has argument(s)
        // hard-coded the property --- need better data to parse this correctly

        let keys = Object.keys(mention.arguments);
        if (keys.length != 2 || !mention.arguments.controlled || !mention.arguments.controller) {
          console.log("bad data parse: check CorefRelationMention", mention.arguments);
        }
        var link = {
          sourceId: mention.arguments.controller.map(arg => arg.id),
          destinationId: [{
            name: mention.displayLabel,
            id: mention.arguments.controlled.map(arg => arg.id)
          }],
          label: mention.displayLabel,
          id: mention.id,
          charOffset: mention.characterStartOffset,
          type: mention.type
        };

        mentionDataArray.push(link);
        return link;
      case "CorefEventMention":
        // has a trigger & argument(s)

        if (mention.trigger.type == "TextBoundMention") {
          let start = wordDataMap[[mention.trigger.document, mention.trigger.sentence, mention.trigger.tokenInterval.start].join('-')];
          let end = wordDataMap[[mention.trigger.document, mention.trigger.sentence, mention.trigger.tokenInterval.end].join('-')];

          var link = {
            sourceId: null,
            destinationId: null,
            words: wordDataArray.slice(start, end),
            label: mention.displayLabel,
            id: mention.trigger.id,
            charOffset: mention.trigger.characterStartOffset,
            type: mention.trigger.type
          };
          mentionDataArray.push(link);
        }
        var link = {
          sourceId: [mention.trigger.id],
          destinationId: Object.keys(mention.arguments).map(key => {

            return {
              name: key,
              charOffset: mention.characterStartOffset,
              id: mention.arguments[key].map(arg => arg.id)
            }

          }),
          label: mention.displayLabel,
          id: mention.id,
          type: mention.type
        };
        mentionDataArray.push(link);
        return link;
      default:
        console.log("invalid type", mention.type);
        break;
    }
  }
  data.mentions.forEach(printMention);

  // done parsing into semi-flat datasets...

  console.log('words',wordDataArray);
  console.log('pos',syntaxDataArray);
  console.log('events',mentionDataArray);
}

document.querySelector('input[type=file]').onchange = function() {
  var fr = new FileReader();
  fr.onload = function(e) {
    var object = {};
    try {
      object = JSON.parse(e.target.result);
    }
    catch(e) {
      console.log("error",e);
    }
    parseData(object);
  }
  fr.readAsText(this.files[0]);
}