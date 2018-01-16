const Main = (function() {
  // classes
  let parser, lm, rm, tm;

  // main svg element
  let svg;

  // node-link objects
  let words = [];
  let links = [];
  let clusters = [];

  // other html elements
  let tooltip = {};
  let tree = {};
  let options = {
    showSyntax: false,
    showLinksOnMove: false,
    showTreeInModal: false
  };

  //--------------------------------
  // public functions
  //--------------------------------
  /**
   * init:  set up singleton classes and create initial drawing
   */
  let _initialized = false;
  function init() {
    // setup
    if (_initialized) { return; }
    _initialized = true;
    body = document.body.getBoundingClientRect();
    svg = SVG('main')
      .size(body.width, window.innerHeight - body.top - 10);

    tooltip = new Tooltip('tooltip', svg);
    parser  = new Parser();
    rm      = new RowManager(svg);
    lm      = new LabelManager(svg);
    tm      = new Taxonomy('taxonomy');
    tree    = new TreeLayout('#tree', svg);

    // load and render initial dataset by default
    changeDataset();

    // svg event listeners
    svg.on('row-resize', function(e) {
      lm.stopEditing();
      rm.resizeRow(e.detail.object.idx, e.detail.y);
    });

    svg.on('label-updated', function(e) {
      // TODO: so so incomplete
      let color = tm.getColor(e.detail.label, e.detail.object);
      e.detail.object.node.style.fill = color;
    });

    svg.on('word-move-start', function() {
      if (!options.showLinksOnMove && options.showSyntax) {
        setSyntaxVisibility(false);
      }
    });

    svg.on('word-move', function(e) {
      tooltip.clear()
      lm.stopEditing();
      rm.moveWordOnRow(e.detail.object, e.detail.x);
    });

    svg.on('word-move-end', function(e) {
      if (!options.showLinksOnMove && options.showSyntax) {
        setSyntaxVisibility(true);
      }
    });

    svg.on('tag-remove', function(e) {
      e.detail.object.remove();
      tm.remove(e.detail.object);
    });

    svg.on('row-recalculate-slots', function(e) {
      links.forEach(link => {
        link.resetSlotRecalculation();
      });
      links.forEach(link => {
        link.recalculateSlots(words);
        link.draw();
      });
    });

    svg.on('build-tree', function(e) {
      document.body.classList.remove('tree-closed');
      if (tree.isInModal) {
        setActiveTab('tree');
      }
      else {
        setActiveTab(null);
      }
      if (e.detail) {
        tree.graph(e.detail.object);
      }
      else {
        tree.resize();
      }
    });

    // window event listeners
    // resize function
    function resizeWindow() {
      body = document.body.getBoundingClientRect();
      links.forEach(l => l.hide());
      svg.width(body.width);
      rm.width(body.width);
      setSyntaxVisibility();
    }
    window.onresize = debounce(resizeWindow, 200);

    document.getElementById('dataset').onchange = function(e) {
      if (this.selectedIndex > 0) {
        changeDataset(this.selectedIndex);
      }
    }

    document.querySelectorAll('#options input').forEach(input => {
      input.onclick = function() {
        let option = this.getAttribute('data-option');
        switch(option) {
          case 'syntax':
            options.showSyntax = this.checked;
            setSyntaxVisibility();
            break;
          case 'links':
            options.showLinksOnMove = this.checked;
            break;
          case 'tree':
            options.showTreeInModal = this.checked;
            // document.querySelector('.tab[data-id="tree"]').style.display = this.checked ? 'inline-block' : 'none';
            break;
          default: ;
        }
      };
    });

    function setActiveTab(pageId, modalId="modal") {
      let m = document.getElementById(modalId);
      if (pageId == null) {
        m.classList.remove('open');
      }
      else {
        m.classList.add('open');

        m.querySelector('.tab.active').classList.remove('active');
        m.querySelector('.page.active').classList.remove('active');
        m.querySelector('header span[data-id="' + pageId + '"]').classList.add('active');
        document.getElementById(pageId).classList.add('active');
      }
    }

    let modalHeader = document.querySelector('#modal header');
    let modalDrag = null;
    let modalWindow = document.querySelector('#modal > div');
    modalHeader.onmousedown = function(e) {
      modalDrag = e;
    }
    document.addEventListener('mousemove', function(e) {
      if (modalDrag) {
        let dx = e.x - modalDrag.x;
        let dy = e.y - modalDrag.y;
        modalDrag = e;
        let transform = modalWindow.style.transform.match(/-?\d+/g) || [0,0];
        transform[0] = +transform[0] + dx || dx;
        transform[1] = +transform[1] + dy || dy;
        modalWindow.style.transform = `translate(${transform[0]}px, ${transform[1]}px)`;
      }
    });
    document.addEventListener('mouseup', function() {
      modalDrag = null;
      let transform = modalWindow.style.transform.match(/-?\d+/g);
      if (!transform) { return; }

      let rect = modalWindow.getBoundingClientRect();
      if (rect.left > window.innerWidth - 50) {
        transform[0] -= (50 + rect.left - window.innerWidth);
      }
      else if (rect.right < 50) {
        transform[0] -= (rect.right - 50);
      }
      if (rect.top < 0) {
        transform[1] -= rect.top;
      }
      else if (rect.top > window.innerHeight - 50) {
        transform[1] -= (50 + rect.top - window.innerHeight);
      }
      modalWindow.style.transform = `translate(${transform[0]}px, ${transform[1]}px)`;
    });

    document.querySelectorAll('.modal header .tab').forEach(tab => {
      tab.onclick = function() {
        setActiveTab(this.getAttribute('data-id'));
      }
    });

    document.getElementById('custom-annotation').onclick = function() {
      document.getElementById('brat-input').classList.add('open');
    }
    document.getElementById('options-toggle').onclick = function() {
        setActiveTab('options');
    }
    document.getElementById('taxonomy-toggle').onclick = function() {
        setActiveTab('taxonomy');
    }
    document.querySelectorAll('.modal').forEach(modal => {
      modal.onclick = function(e) {
        e.target.classList.remove('open');
      }
    });
  }

  /**
   * changeDataset:  read and parse data from a json file in the /data folder
   *   and generate visualization from it
   */
  function changeDataset(index = 6) {
    if (index >= 6) {
      load(`./data/example${index - 5}.ann`).then(text => {
        clear();
        [words, links, clusters] = buildWordsLinksAnn(text);
        draw();
      });
    } else {
      parser.readJson(`./data/data${index}.json`, function() {
        clear();
        ymlToJson.convert('taxonomy.yml.txt', function(taxonomy) {
          [words, links, clusters] = buildWordsAndLinks();
          setSyntaxVisibility();
          draw();

          tm.buildTree(taxonomy);
          tm.buildTagTypes(words);
          tm.populateTaxonomy();
        });
      });
    }
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
    links.forEach(link => {
      link.recalculateSlots(words);
      link.draw();
    })
    rm.resizeAll();
  }

  //--------------------------------
  // private functions
  //--------------------------------

  // from https://davidwalsh.name/javascript-debounce-function,
  // as taken from underscore

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  function debounce(func, wait, immediate) {
  	var timeout;
  	return function() {
  		var context = this, args = arguments;
  		var later = function() {
  			timeout = null;
  			if (!immediate) func.apply(context, args);
  		};
  		var callNow = immediate && !timeout;
  		clearTimeout(timeout);
  		timeout = setTimeout(later, wait);
  		if (callNow) func.apply(context, args);
  	};
  };


  /** options to set visibility of syntax tree
   */
  function setSyntaxVisibility(bool) {
    bool = (bool === undefined) ? options.showSyntax : bool;
    links.forEach(l => {
      if (!l.top) {
        bool ? l.show() : l.hide();
      }
      else {
        l.show();
      }
    });
    if (rm.rows.length > 0) {
      rm.resizeAll();
    }
  }

  function buildWordsAndLinks() {
    // construct word objects and tags from tokens, entities, and triggers
    const words = parser.tokens.map((token, i) => {
      let w = new Word(token.text, i);
      w.setSyntaxTag(token.type);
      w.setSyntaxId(token.id);
      return w;
    });
    console.log('words',words);
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

    // syntax data
    parser.data.syntax.forEach(syn => {
      // create a link between the trigger and each of its arguments
      const trigger = entities.find(word => word.syntaxId === syn.trigger);
      const arguments = syn.arguments.map(arg => {
        let anchor = words.find(w => w.syntaxId === arg.id);
        return { anchor, type: arg.type };
      });

      // create link
      const link = new Link(syn.id, trigger, arguments, null, false);

      // push link to link array
      links.push(link);
    });

    return [ words, links, clusters ];
  }

  function buildWordsLinksAnn(text) {
    let data = parseAnn(text);
    let mentions = {};

    // build words
    let words = data.tokens.map((token, i) => {
      return new Word(token.word, i)
    });
    data.texts.forEach(tbm => {
      words[tbm.tokenId].setTag(tbm.label);
      words[tbm.tokenId].addEventId(tbm.id);
      mentions[tbm.id] = words[tbm.tokenId];
    });

    // build links
    let links = [];
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

    return [words, links, []];
  }

  // export public functions
  return {
    init,
    draw,
    changeDataset
  };

})();
