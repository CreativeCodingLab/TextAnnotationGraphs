const Main = (function() {
  // classes
  let parser;

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
    document.getElementById('taxonomy-toggle').onclick = function() {
      document.getElementById('taxonomy').classList.add('open');
    }
    document.getElementById('taxonomy').onclick = function(e) {
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

        // turn taxonomy into a proper tree
        let tree = (function() {

          let flat = [];

          function createLinks(val, i, n, parent) {
            let index = { i, n };
            let obj = {
              val,
              parent,
              index: parent ? parent.index.concat(index) : [index],
              depth: parent ? parent.depth + 1 : 0,
              ancestor: parent ? parent.ancestor : null,
              children: null
            };
            if (!obj.ancestor) {
              obj.ancestor = obj;
              obj.descendantCount = 0;
            }
            ++obj.ancestor.descendantCount;

            flat.push(obj);

            if (!(typeof val === 'string' || val instanceof String)) {
              let key = Object.keys(val)[0];
              obj.val = key;
              obj.children = val[key].map((v, i) => createLinks(v, i, val[key].length, obj));
            }
            return obj;
          }

          let hierarchy = taxonomy.map((val, i) => createLinks(val, i, taxonomy.length, null));

          return {
            hierarchy,
            flat
          }
        })();

        let tagTypes = {};
        words.forEach(word => {
          if (word.tag) {
            if (tagTypes[word.tag]) {
              tagTypes[word.tag].push(word);
            }
            else {
              tagTypes[word.tag] = [word];
            }
          }
          if (word.clusters.length > 0) {
            word.clusters.forEach(cluster => {
              if (tagTypes[cluster.val]) {
                tagTypes[cluster.val].push(cluster);
              }
              else {
                tagTypes[cluster.val] = [cluster];
              }
            });
          }
        });

        draw();

        populateTaxonomy(tree, tagTypes);
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
  function buildWordsAndLinks() {
    // construct word objects and tags from tokens, entities, and triggers
    const words = parser.tokens.map((token, i) => {
      let w = new Word(token.text, i);
      w.setSyntaxTag(token.type);
      w.setSyntaxId(token.id);
      return w;
    });
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

  function populateTaxonomy(tree, tagTypes) {
    colors = [
      '#3fa1d1',
      '#ed852a',
      '#2ca02c',
      '#c34a1d',
      '#a048b3',
      '#e377c2',
      '#bcbd22',
      '#17becf',
      '#e7298a',
      '#e6ab02',
      '#7570b3',
      '#a6761d',
      '#7f7f7f'
    ];


    function updateColor(word, color) {
      if (word instanceof Word) {
        word.tag.svgText.node.style.fill = color;
      }
      else {
        word.svgText.node.style.fill = color;
      }
    };

    // populate taxonomy
    let div = document.querySelector('#taxonomy > div');
    div.innerHTML = '';
    let ul = document.createElement('ul');
    div.appendChild(ul);

    function createLi(el, ul) {
      let li = document.createElement('li');
      el.el = li;

      // create checkbox
      let cbox = document.createElement('input');
      cbox.setAttribute('type', 'checkbox');
      li.appendChild(cbox);

      // text span
      li.appendChild(document.createTextNode(el.val));

      // create color picker input
      let picker = document.createElement('input');
      picker.className = 'jscolor';

      // set initial value
      let i = Object.keys(tagTypes).indexOf(el.val);
      if (i > -1) {
        cbox.checked = true;
        picker.value = colors[i] || '#000000';

        // propagate color to colorless ancestors
        let parent = el.parent;
        while (parent && parent.el && !parent.el.querySelector('input.jscolor').value) {
          parent.el.querySelector('input.jscolor').value = picker.value;
          parent = parent.parent;
        }
      }
      picker.setAttribute('disabled', !cbox.checked);
      li.appendChild(picker);

      // recursively update picker colors
      function updateChildColors() {
        let color = this.value;
        console.log('color', color);
        function recurse(el) {
          if (tagTypes[el.val]) {
            tagTypes[el.val].forEach(word => updateColor(word, color));
          }
          if (el.children) {
            el.children.forEach(recurse);
          }
        }
        recurse(el);
      }

      // attach listeners
      cbox.onclick = function() {
        // TODO: update children colors on click
        if (this.checked) {
          // enable current picker and disable children inputs
          picker.removeAttribute('disabled');
          li.querySelectorAll('input').forEach(input => {
            if (input.parentNode !== li) {
              input.setAttribute('disabled', true);
            }
          });
          updateChildColors.bind(picker);
        }
        else {
          // enable children inputs
          picker.setAttribute('disabled', true);
          let checkboxes = li.querySelectorAll('input[type="checkbox"]');
          let pickers = li.querySelectorAll('input.jscolor');
          checkboxes.forEach((cbox, i) => {
            cbox.removeAttribute('disabled');
            pickers[i].setAttribute('disabled', !cbox.checked);
          });
          updateChildColors();
        }
      }
      picker.onchange = updateChildColors;

      if (el.children) {
        let childUl = document.createElement('ul');
        li.appendChild(childUl);
        el.children.forEach(child => createLi(child, childUl));
      }
      ul.appendChild(li);
    }
    tree.hierarchy.forEach(el => createLi(el, ul));
    jscolor.installByClassName('jscolor');

    Object.keys(tagTypes).forEach((tag, i) => {
      tagTypes[tag].forEach(word => updateColor(word, colors[i]));
    });
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
