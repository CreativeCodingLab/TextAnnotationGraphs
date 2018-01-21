const LabelManager = (function() {
  let _svg;
  let activeObject = null;
  let string = null;
  let originalString = null;
  let MAX_WIDTH = 22;

  // special keys
  const Key = {
    delete: 8,
    tab: 9,
    enter: 13,
    escape: 27,
    left: 37,
    up: 38,
    right: 39,
    down: 40
  };
  let KeyValues = Object.values(Key);

  class LabelManager {
    constructor(svg) {
      // listeners for label handling
      _svg = svg;
      svg.on('tag-edit', listenForEdit);
      svg.on('link-label-edit', listenForEdit);
      this.stopEditing = stopEditing;
    }
  }

  function listenForEdit(e) {
    activeObject = e.detail.object;
    activeObject.listenForEdit(e);
    originalString = e.detail.object.val;
    string = null;
  };

  function stopEditing() {
    if (activeObject && activeObject.isEditing) {
      let text = activeObject.text();
      if (text && !(activeObject instanceof Link)) {
        _svg.fire('label-updated', { object: text, label: text.text() });
      }
      activeObject.stopEditing();
      activeObject = null;
      originalString = string = null;
    }
  }

  function updateString(s) {
    string = s.slice(0, MAX_WIDTH);
    activeObject.text(string);
  }

  document.addEventListener('keydown', function(e) {
    if (activeObject && activeObject.isEditing) {
        if (KeyValues.indexOf(e.keyCode) > -1) {
          switch (e.keyCode) {
            case Key.delete:
                if (string === null) { string = originalString; }
                updateString(string.slice(0, -1));
              break;
            case Key.tab:
              break;
            case Key.enter:
                stopEditing();
              break;
            case Key.escape:
                updateString(originalString);
                stopEditing();
              break;
            case Key.right:
              if (string === null) {
                updateString(originalString);
              }
              break;
            default:
              break;
          }
        };
    }
  })
  document.addEventListener('keypress', function(e) {
    // console.log(String.fromCharCode(e.which), e.which, e.metaKey);
    if (activeObject && activeObject.isEditing) {
      if (e.which === 32) {
        e.preventDefault();
      }
      if (e.which > 31 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (string === null) { string = ''; }
        updateString(string + String.fromCharCode(e.which));
      }
    }
  });

  document.addEventListener('mousedown', stopEditing);

  return LabelManager;
})();
