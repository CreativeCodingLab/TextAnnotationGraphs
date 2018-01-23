module.exports = (function() {

  let _text;
  let _tokens;
  let _data;

  /**
   * parse a json file
   */
  function parseData(data) {
    /* first get string tokens from the syntaxData */
    _text = data.syntaxData.text;
    _tokens = data.syntaxData.entities
      .sort((a, b) => a[2][0][0] - b[2][0][0])
      .map(x => {
        return {
          text: _text.substring(x[2][0][0], x[2][0][1]),
          id: x[0],
          type: x[1],
          startIndex: x[2][0][0],
          endIndex: x[2][0][1]
        }
      });

    function findTokenByIndex([i1, i2]) {
      const startToken = _tokens.findIndex(token => token.startIndex === i1);
      const endToken = _tokens.findIndex(token => token.endIndex === i2);
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

    _data = {
      entities,
      triggers,
      events,
      relations,
      syntax
    };
  }

  class Parser {
    constructor() {
    }

    /* load a json from a path */
    readJson(path, callback) {

      var json = path || './data/data1.json';

      function loadJSON(path) {
          var httpRequest = new XMLHttpRequest();
          httpRequest.onreadystatechange = function() {
              if (httpRequest.readyState === 4) {
                  if (httpRequest.status === 200) {
                      var data = JSON.parse(httpRequest.responseText);

                      parseData(data);
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
      loadJSON(json);
    }

    get tokens() { return _tokens; }
    get text() { return _text; }
    get data() { return _data; }
  }
  return Parser;
})();