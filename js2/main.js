const Main = (function() {
  // classes
  let parser;
  let panel;

  // main svg element
  let svg;

  // node-link objects
  let words = [];
  let links = [];
  let clusters = [];

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
    changeDataset(2);

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
      clear();
      [words, links, clusters] = buildWordsAndLinks();
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
    links.forEach(link => link.svg && link.svg.remove());
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
    links.forEach(link => {
      link.init(svg);
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

    const entities = words.concat(clusters);

    function searchForEntity(argument) {
      let anchor;
      switch (argument.id.charAt(0)) {
        case 'E':
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
    parser.data.events.forEach(evt => {
      // create a link between the trigger and each of its arguments
      const trigger = entities.find(word => word.eventIds.indexOf(evt.trigger) > -1);
      const arguments = evt.arguments.map(searchForEntity);

      // create link
      const link = new Link(evt.id, trigger, arguments);

      // push link to link array
      links.push(link);
    });

    parser.data.relations.forEach(rel => {
      const arguments = rel.arguments.map(searchForEntity);

      // create link
      const link = new Link(rel.id, null, arguments, rel.type);

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
