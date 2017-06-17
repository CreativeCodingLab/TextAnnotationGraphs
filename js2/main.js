const Main = (function() {
  // classes
  let parser;
  let panel;

  // main svg element
  let svg;

  // node-link objects
  let words;
  let links;
  let clusters;

  // other html elements
  let tooltip = {};

  //--------------------------------
  // public functions
  //--------------------------------
  /**
   * init:  set up singleton classes and create initial drawing
   */
  function init() {
    // setup
    body = document.body.getBoundingClientRect();
    svg = SVG('main')
      .size(body.width, window.innerHeight - body.top - 10);
    tooltip = new Tooltip('tooltip', svg);
    parser  = new Parser();
    panel   = new Panel('graph');
    rm      = new RowManager(svg);
    lm      = new LabelManager(svg);

    // load and render initial dataset by default
    changeDataset(4);

    // svg event listeners
    svg.on('row-resize', function(e) {
      lm.stopEditing();
      rm.resizeRow(e.detail.object.idx, e.detail.y);
    });

    svg.on('word-move', function(e) {
      tooltip.clear()
      lm.stopEditing();
      rm.moveWordOnRow(e.detail.object, e.detail.x);
    });

    // window event listeners
    // resize function
    window.onresize = function() {
      body = document.body.getBoundingClientRect();
      svg.width(body.width);
      rm.width(body.width);
    }
    document.getElementById('dataset').onchange = function(e) {
      if (this.selectedIndex > 0) {
        changeDataset(this.selectedIndex);
      }
    }
  }

  /**
   * changeDataset:  read and parse data from a json file in the /data folder
   *   and generate visualization from it
   */
  function changeDataset(index = 1) {
    parser.readJson(`./data/data${index}.json`, function() {
      [words, links, clusters] = buildWordsAndLinks();
      clear();
      draw();
    });
  };

  /**
   * clear:  delete all elements from the visualization
   */
  function clear() {
    while (rm.rows.length > 0) {
      rm.removeRow();
    }
  }

  /**
   * draw:  draw words, links, rows, etc. onto the visualization
   */
  function draw() {
    if (words.length > 0 && !rm.lastRow) {
      rm.appendRow();
    }
    words.forEach(word => {
      word.init(svg);
      rm.addWordToRow(word, rm.lastRow);
    });
  }

  //--------------------------------
  // private functions
  //--------------------------------
  function buildWordsAndLinks() {
    // construct word objects and tags from tokens, entities, and triggers
    const words = parser.tokens.map((token, i) => new Word(token, i));
    const clusters = [];

    [].concat(parser.data.entities, parser.data.triggers).forEach(el => {
      if (el.tokenIndex[0] === el.tokenIndex[1]) {
        words[el.tokenIndex[0]].setTag(el.type);
        words[el.tokenIndex[0]].eventId = el.id;
      }
      else {
        let cluster = [];
        for (let i = el.tokenIndex[0]; i <= el.tokenIndex[1]; ++i) {
          cluster.push(words[i]);
        }
        const wordCluster = new WordCluster(cluster, el.type);
        wordCluster.eventId = el.id;
        clusters.push(wordCluster);
      }
    });

    const entities = words.concat(clusters);

    function searchForEntity(argument) {
      let anchor;
      switch (argument.id.charAt(0)) {
        case 'E':
          anchor = links.find(link => link.eventId === argument.id);
          break;
        case 'T':
          anchor = entities.find(word => word.eventId === argument.id);
          break;
        default:
          console.log('unhandled argument type', argument);
          break;
      }
      return anchor;
    }

    // construct links from events and relations
    const links = [];
    parser.data.events.forEach(evt => {

      // create a link between the trigger and each of its arguments
      const trigger = entities.find(word => word.eventId === evt.trigger);
      const arguments = evt.arguments.map(searchForEntity);

      // create link
      const link = new Link(evt.id, trigger, arguments);

      // push link to link array
      links.push(link);
    });

    parser.data.relations.forEach(rel => {
      const arguments = rel.arguments.map(searchForEntity);

      // create link
      const link = new Link(rel.id, null, arguments);

      // push link to link array
      links.push(link);
    });

    return [ words, links, clusters ];
  }

  // export public functions
  return {
    init,
    draw,
    changeDataset
  };

})();
