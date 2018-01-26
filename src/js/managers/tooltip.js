module.exports = (function() {
  let div = {};
  let _svg = {};
  let activeObject = null;
  let yOffset = 0;

  class Tooltip {
    constructor(id, svg) {
      div = document.getElementById(id);
      yOffset = svg.node.getBoundingClientRect().top;
      this.clear = clear;

      _svg = svg;

      // listeners to open tooltip
      svg.on('tag-right-click', openTooltip);
      svg.on('word-right-click', openTooltip);
      svg.on('link-label-right-click', openTooltip);
      svg.on('link-right-click', openTooltip);
    }
  }

  // function to show tooltip and populate div
  function openTooltip(e) {
    let width = document.body.getBoundingClientRect().width - 175 - 5;
    activeObject = e.detail.object;
    let html = '';
    if (activeObject instanceof Word) {
      if (activeObject.tag) {
        html += '<p id="menu--edit-tag">Edit tag</p><p id="menu--remove-tag">Remove tag</p>';
      }
      else {
        html += '<p id="menu--add-tag">Add tag</p>';
      }
      html += '<p id="menu--add-link">Add link</p><hr><p id="menu--tree">Tree visualization</p>';
    }
    else if (activeObject instanceof WordTag || activeObject instanceof WordCluster) {
      html += '<p id="menu--remove-tag">Remove</p>';
    }
    else if (activeObject instanceof Link) {
      if (e.detail.type === 'text') {
        html += '<p id="menu--edit-link-label">Edit label</p><p id="menu--remove-link">Remove link</p>';
      }
      else {
        html += '<p id="menu--remove-link">Remove link</p>';
      }
      html += '<hr><p id="menu--tree">Tree visualization</p>';
    }
    if (html) {
      div.innerHTML = html;
      div.style.left = Math.min(e.detail.event.x, width) + 'px';
      div.style.top = e.detail.event.y + document.body.scrollTop - yOffset + 'px';
      div.className = 'active';
    }
    else {
      activeObject = null;
    }
  };

  // function to hide div
  function clear() {
    div.className = null;
    activeObject = null;
  }

  // window listeners
  // function to listen for a click outside the tooltip
  document.addEventListener('mousedown', function(e) {
    if (e.target !== div && e.target.parentNode !== div) {
      clear();
    }
  });

  // listen for a click inside the tooltip;
  document.addEventListener('click', function(e) {
    if (e.target.parentNode === div && activeObject) {
      switch (e.target.id) {
        // tag management events
        case 'menu--remove-tag':
          let tag1 = (activeObject instanceof Word && activeObject.tag) ? activeObject.tag : activeObject;
          _svg.fire('tag-remove', { object: tag1 });
          break;
        case 'menu--add-tag':
          let tag2 = activeObject.setTag('?');
          _svg.fire('tag-edit', { object: tag2 });
          break;
        case 'menu--edit-tag':
          _svg.fire('tag-edit', { object: activeObject.tag });
          break;
        case 'menu--edit-link-label':
          _svg.fire('link-label-edit', { object: activeObject, text: activeObject.selectedLabel });
          activeObject.selectedLabel = null;
          break;
        case 'menu--remove-link':
          activeObject.remove();
          _svg.fire('row-recalculate-slots', { object: activeObject });
          break;
        case 'menu--tree':
          _svg.fire('build-tree', { object: activeObject });
          break;
        default: ;
      }
      console.log(e.target.id, activeObject && activeObject.val);
      clear();
    }
  });

  document.addEventListener('contextmenu', function(e) {
    if (tooltip.className === 'active') {
      e.preventDefault();
    }
  });

  return Tooltip;

})();