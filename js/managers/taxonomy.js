const Taxonomy = (function() {
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

  function updateColor(word, color) {
    if (word instanceof Word) {
      word.tag.svgText.node.style.fill = color;
    }
    else {
      word.svgText.node.style.fill = color;
    }
  };

  let div = {};

  class Taxonomy {
    constructor(id) {
      this.tree = {};
      this.tagTypes = {};
      div = document.getElementById('taxonomy');
    }

    buildTagTypes(words) {
      this.tagTypes = {};
      words.forEach(word => {
        if (word.tag) {
          if (this.tagTypes[word.tag.val]) {
            this.tagTypes[word.tag.val].push(word);
          }
          else {
            this.tagTypes[word.tag.val] = [word];
          }
        }
        if (word.clusters.length > 0) {
          word.clusters.forEach(cluster => {
            if (this.tagTypes[cluster.val]) {
              this.tagTypes[cluster.val].push(cluster);
            }
            else {
              this.tagTypes[cluster.val] = [cluster];
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

    populateTaxonomy() {
      let tagTypes = this.tagTypes;
      let keys = Object.keys(tagTypes);

      // populate taxonomy
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
        let i = keys.indexOf(el.val);
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
      this.tree.hierarchy.forEach(el => createLi(el, ul));
      jscolor.installByClassName('jscolor');

      keys.forEach((tag, i) => {
        tagTypes[tag].forEach(word => updateColor(word, colors[i]));
      });
    }
  }
  return Taxonomy;
})();
