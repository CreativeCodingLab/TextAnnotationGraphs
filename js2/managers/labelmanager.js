const LabelManager = (function() {
  let activeObject = null;
  let string = null;
  let originalString = null;
  let MAX_WIDTH = 22;

  // special keys
  const Key = {
    delete: 8,
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
      svg.on('tag-edit', listenForEdit);
      this.stopEditing = stopEditing;
    }
  }

  function listenForEdit(e) {
    activeObject = e.detail.object;
    activeObject.listenForEdit();
    originalString = e.detail.object.val;
    string = null;
  };

  function stopEditing() {
    if (activeObject && activeObject.isEditing) {
      if (!string) { updateString(originalString); }
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
    if (activeObject && activeObject.isEditing) {
      if (string === null) { string = ''; }
      updateString(string + String.fromCharCode(e.which));
    }
  });

  document.addEventListener('mousedown', function(e) {
    stopEditing();
  });

  return LabelManager;
})();
