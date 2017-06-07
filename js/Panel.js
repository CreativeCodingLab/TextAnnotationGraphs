const Panel = (function() {

  class Panel {
    constructor(el, el2) {

      const container = this.el = document.getElementById(el) || document.body;
      const above = document.getElementById(el2);

      let height = parseInt(window.getComputedStyle(container).height);
      container.style.height = height;

      let y;
      let isResizingPanel = false;

      // add listeners
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', dragend);
      document.addEventListener('mouseleave', dragend);
      container.addEventListener('mousedown', function(e) {
        if (e.offsetY < 3) {
          isResizingPanel = true;
          y = e.y;
        }
      });

      let self = this;
      function drag(e) {
        if (isResizingPanel) {
          const dy = e.y - y;
          y = e.y;

          // clamp
          let max = window.innerHeight - 30;
          let min = 30;

          height = Math.min(Math.max(min, height - dy), max);
          container.style.height = height;

          if (above) {
            above.style.marginBottom = height + 10;
          }

          self.onresize();
        }
      }

      function dragend(e) {
        isResizingPanel = false;
      }

    }

    onresize() {}
  }

  return Panel;

})();