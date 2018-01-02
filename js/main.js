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

    load('data/example2.ann').then(text => {
      console.log(text);
      console.log(parseAnn(text));
    });
    return;
    // load and render initial dataset by default
    // changeDataset(6);

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
    document.getElementById('modal').onclick = function(e) {
      e.target.classList.remove('open');
    }
  }

  /**
   * changeDataset:  read and parse data from a json file in the /data folder
   *   and generate visualization from it
   */
  function changeDataset(index = 1) {
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

  // function populateOptions() {
  //   document.querySelector('.reach').onclick = toggleEdgeVisibility;
  //   document.querySelector('.pos').onclick = toggleEdgeVisibility;
  //
  //   let reachTypes = {};
  //   let posTypes = {};
  //
  //   function toggleEdgeVisibility(e) {
  //     if (e.target.nodeName === 'INPUT') {
  //       let id = e.target.id.split('--');
  //       let checked = e.target.checked;
  //
  //       function linkMatchesId(l) {
  //         if (l.top && id[0] === 'reach') {
  //           return l.reltype === id[1] || (l.trigger instanceof Word && l.trigger.tag.val === id[1]);
  //         }
  //         else if (!l.top && id[0] === 'pos') {
  //           return l.arguments.some(arg => arg.type === id[1]);
  //         }
  //       }
  //
  //       if (checked) {
  //         if (id[1] === 'all') {
  //           document.querySelectorAll(`.${id[0]} > ul input`).forEach(i => {
  //             i.disabled = false;
  //             toggleEdgeVisibility({target: i});
  //           });
  //         }
  //         else {
  //           links.forEach(l => linkMatchesId(l) && l.show());
  //         }
  //       }
  //       else {
  //         if (id[1] === 'all') {
  //           document.querySelectorAll(`.${id[0]} > ul input`).forEach(i => {
  //             links.forEach(l => {
  //               if (l.top == (id[0] === 'reach')) {
  //                 l.hide();
  //               }
  //             });
  //             i.disabled = true;
  //           });
  //         }
  //         else {
  //           links.forEach(l => linkMatchesId(l) && l.hide());
  //         }
  //       }
  //     }
  //   }
  //
  //   // find link types
  //   links.forEach(link => {
  //     if (link.top) {
  //       let type = link.trigger instanceof Word ? link.trigger.tag : link.reltype;
  //       if (reachTypes[type]) {
  //         reachTypes[type].push(link);
  //       }
  //       else {
  //         reachTypes[type] = [link];
  //       }
  //     }
  //     else {
  //       link.arguments.forEach(arg => {
  //         if (posTypes[arg.type]) {
  //           posTypes[arg.type].push(link);
  //         }
  //         else {
  //           posTypes[arg.type] = [link];
  //         }
  //       });
  //     }
  //   });
  //
  //   // add to options
  //   function createUl(types, name) {
  //     if (Object.keys(types).length > 0) {
  //       let li = Object.keys(types).sort().map(type =>
  //         `<li><input id="${name}--${type}" type="checkbox" checked><label for="${name}--${type}">${type}</label></li>`
  //       );
  //       let ul = document.querySelector(`.${name} > ul`) || document.createElement('ul');
  //       ul.innerHTML = li.join('');
  //       document.querySelector(`.${name}`).appendChild(ul);
  //     }
  //     else {
  //       let ul = document.querySelector(`.${name} > ul`);
  //       if (ul) { ul.parentNode.removeChild(ul); }
  //     }
  //   }
  //   createUl(reachTypes, 'reach');
  //   createUl(posTypes, 'pos');
  //   document.getElementById('reach--all').checked = true;
  //   document.getElementById('pos--all').checked = true;
  // }

  // export public functions
  return {
    init,
    draw,
    changeDataset
  };

})();
