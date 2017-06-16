const Tooltip = (function() {
  let div = {};
  let activeObject = null;
  let yOffset = 0;

  class Tooltip {
    constructor(id, svg) {
      div = document.getElementById(id);
      yOffset = svg.node.getBoundingClientRect().top;
      this.clear = clear;

      // listeners to open tooltip
      svg.on('tag-right-click', openTooltip);
      svg.on('word-right-click', openTooltip);
    }
  }

  // function to show tooltip and populate div
  function openTooltip(e) {
    let width = document.body.getBoundingClientRect().width - 175 - 5;
    activeObject = e.detail.object;
    let html = '';
    if (activeObject instanceof Word) {
      if (activeObject.tag) {
        html += '<p id="menu--edit-tag">Edit tag</p><hr>';
      }
      else {
        html += '<p id="menu--add-tag">Add tag</p><hr>';
      }
      html += '<p id="menu--graph">Tree visualization</p>';
    }
    else if (activeObject instanceof WordTag || activeObject instanceof WordCluster) {
      html += '<p id="menu--remove-tag">Remove</p>';
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
          activeObject.remove();
          break;
        case 'menu--add-tag':
          break;
        case 'menu--edit-tag':
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
