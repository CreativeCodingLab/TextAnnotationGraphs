import ColorPicker from '../colorpicker.js';
import Word from '../components/word.js';

module.exports = (function() {
  let colors = [
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
  let div = {};
  let tagTypes = {};

  function updateColor(word, color) {
    if (word instanceof Word) {
      word.tag.svgText.node.style.fill = color;
    }
    else {
      word.svgText.node.style.fill = color;
    }
  };

  function updateTagColor(tag, color) {
    tagTypes[tag].forEach(word => updateColor(word, color));
  };

  class Taxonomy {
    constructor(id) {
      this.tree = {};
      div = document.getElementById('taxonomy');
    }

    draw(taxonomy, words) {
      if (taxonomy) {
        this.buildTree(taxonomy);

        if (words) {
          this.buildTagTypes(words);
        }

        this.populateTaxonomy();
        this.attachHandlers();
      }
    }

    buildTagTypes(words) {
      tagTypes = {};
      words.forEach(word => {
        if (word.tag) {
          if (tagTypes[word.tag.val]) {
            tagTypes[word.tag.val].push(word);
          }
          else {
            tagTypes[word.tag.val] = [word];
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
    }

    buildTree(taxonomy) {
      // turn taxonomy into a proper tree
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

      this.tree = {
        hierarchy,
        flat
      };
    }

    // populate modal window with list of taxonomic classes
    populateTaxonomy() {
      div.innerHTML = '<span id="toggle-taxonomy">Filter unused labels</span>';

      // build list of inputs in DOM
      let ul = document.createElement('ul');
      div.appendChild(ul);

      let nli = 1;  // number of list items
      function createLi(node, parent) {
        let li = document.createElement('li');

        // create checkbox
        let cbox = document.createElement('input');
        cbox.setAttribute('type', 'checkbox');
        cbox.id = 'cb-' + nli;

        // create label for checkbox
        let label = document.createElement('label');
        label.setAttribute('for', cbox.id);
        label.textContent = node.val;
        node.cbox = cbox;

        // create color picker input
        let picker = document.createElement('input');
        picker.className = 'colorpicker';
        picker.value = '#000000';
        picker.setAttribute('disabled', true);
        picker.node = node;
        node.picker = picker;

        li.appendChild(cbox);
        li.appendChild(label);
        li.appendChild(picker);
        parent.appendChild(li);
        ++nli;

        if (node.children) {
          let childUl = document.createElement('ul');
          li.appendChild(childUl);

          node.children.forEach(child => {
            createLi(child, childUl);
          })
        }
      }

      this.tree.hierarchy.forEach(node => {
        createLi(node, ul);
      });
    }

    // bind events to data
    attachHandlers() {
      // initialize colorpicker
      this.colorpicker = new ColorPicker('colorpicker', {
        initialColor: '#000000',
        changeCallback: (input) => {
          this.setColor(input.node);
        }
      });

      const keys = Object.keys(tagTypes);
      this.tree.flat.forEach(node => {
        // disable/enable color picking on a node
        node.cbox.onclick = () => this.onCheckboxClick(node);

        // check if tag type exists in document
        if (tagTypes[node.val]) {
          this.setColor(node, colors[keys.indexOf(node.val)]);
          node.cbox.click();
        }
      });

      // update colors of existing data
      Object.keys(tagTypes).forEach((tag, i) => updateTagColor(tag, colors[i]));
    }

    /* handle event when checkbox state changes */
    onCheckboxClick(node) {
      if (node.cbox.checked) {
        // activate node
        // propagate color to all descendants
        node.picker.removeAttribute('disabled');
        this.setColor(node);
      } else {
        // deactivate node
        // undo color propagation to all descendants
        node.picker.setAttribute('disabled', true);
        if (node.parent) {
          this.setColor(node, node.parent.picker.value);
        } else {
          this.setColor(node, '#000000');
        }
      }
    }

    /* change the color of a node */
    setColor(node, color) {
      let picker = node.picker;

      // manually set color
      if (color) {
        this.colorpicker.setColor(picker, color);
      }

      if (tagTypes[node.val]) {
        updateTagColor(node.val, picker.value);
      }

      // set color of input and descendant inputs
      function inheritColor(child) {
        if (!child.cbox.checked) {
          // set color and style
          child.picker.value = picker.value;
          child.picker.style.cssText = picker.style.cssText || child.picker.style.cssText;
          if (tagTypes[child.val]) {
            updateTagColor(child.val, picker.value);
          }

          // recursively propagate value to all children
          if (child.children) {
            child.children.forEach(inheritColor);
          }
        }
      }

      if (node.children) {
        node.children.forEach(inheritColor);
      }
    }

    remove(object) {
      // FIXME
      return;
      let tag = object.val;
      let entity = object.entity;
      if (tagTypes[tag]) {
        let i = tagTypes[tag].indexOf(entity);
        if (i > -1) {
          tagTypes[tag].splice(i, 1);
          if (tagTypes[tag].length < 1) {
            delete tagTypes[tag];
          }
        }
      }
    }

    getColor(label, object) {
      //FIXME
      return;
      let keys = Object.keys(tagTypes);
      if (tagTypes[label]) {
        return colors[keys.indexOf(label)];
      }
      else {
        tagTypes[label] = object;
        return colors[keys.length] || 'black';
      }
    }
  }
  return Taxonomy;
})();
