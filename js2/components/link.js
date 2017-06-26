class Link {
    constructor(eventId, trigger, args, reltype) {
      this.eventId = eventId;
      this.trigger = trigger;
      this.arguments = args.sort((a,b) => a.anchor.idx - b.anchor.idx);
      this.links = [];
      this.reltype = reltype;

      if (this.trigger) { this.trigger.links.push(this); }
      this.arguments.forEach(arg => arg.anchor.links.push(this));

      this.mainSVG = null;
      this.svg = null;
      this.handles = [];
      this.line = null;
      this.svgTexts = [];
    }

    init(svg) {
      this.mainSVG = svg;
      this.svg = svg.group().addClass('link');

      // init handles
      const s = 4;
      if (this.trigger) {
        // draw a diamond at the location of the trigger
        let x = this.trigger.cx;
        let y = this.trigger.absoluteY;
        let handle = this.svg.path(`M${s},0L0,${s}L${-s},0L0,${-s}Z`)
          .x(x - s)
          .y(y);
        this.handles.push({ anchor: this.trigger, handle, x, y });
      }
      this.arguments.forEach(arg => {
        // draw a triangle at the location of the argument
        let x = arg.anchor.cx;
        let y = arg.anchor.absoluteY;

        let handle = this.svg.path(`M${[s, -s/2]}L${[-s, -s/2]}L0,${s}`)
          .x(x - s)
          .y(y);
        this.handles.push({ anchor: arg.anchor, handle, x, y });

        if (this.trigger) {
          let text = this.svg.text(arg.type)
            .y(-7)
            .addClass('link-text');
          this.svgTexts.push(text);
        }
      });
      if (this.reltype) {
        let text = this.svg.text(this.reltype)
          .y(-7)
          .addClass('link-text');
        this.svgTexts.push(text);
      }

      this.line = this.svg.path()
        .addClass('polyline');
      this.draw();

      //TODO: sort links and offset according to # of links the anchor has
    }

    draw(anchor) {
      const s = 4;
      this.handles.forEach(h => {
        if (anchor === h.anchor) {
          h.x = anchor.cx;
          h.y = anchor.absoluteY;
          h.handle
            .x(h.x - s)
            .y(h.y);
        }
      })
      if (this.line) {
        let d = '';
        if (this.trigger) {
          // draw a polyline between the trigger and each of its arguments
          for (let i = 0, il = this.arguments.length; i < il; ++i) {
            let leftOfTrigger = this.arguments[i].anchor.idx < this.trigger.idx;
            let dx = leftOfTrigger ? 5 : -5;
            let textlen = leftOfTrigger ? this.svgTexts[i].length() : -this.svgTexts[i].length();

            // draw a line from the prev arrow segment
            if (i > 0) {
              if (leftOfTrigger) {
                d += 'L' + [this.handles[i + 1].x + dx, this.handles[i + 1].y - 10]
              }
              else {
                d += 'L' + [this.handles[i + 1].x + dx + textlen, this.handles[i + 1].y - 10]                
              }
            }
            else if (!leftOfTrigger) {
              // start drawing from the trigger
              d += 'M' + [this.handles[0].x, this.handles[0].y]
                + 'c' + [0, -10, 0, -10, -dx, -10]
                + 'L' + [this.handles[1].x + dx + textlen, this.handles[1].y - 10];
            }

            // draw an arrow segment coming from each argument
            d += 'M' + [this.handles[i + 1].x, this.handles[i + 1].y]
              + 'c' + [0, -10, 0, -10, dx, -10];
            if (leftOfTrigger) {
              d += 'm' + [textlen, 0];
            }

            if (leftOfTrigger && (i + 2 > il || this.arguments[i + 1].anchor.idx >= this.trigger.idx)) {
              // draw trigger to the right of the arrow segment
              d += 'L' + [this.handles[0].x - dx, this.handles[0].y - 10]
                + 'c' + [dx, 0, dx, 0, dx, 10];
              if (i + 1 < il) {
                d += 'c' + [0, -10, 0, -10, dx, -10];
              }
            }

            // draw the text svg
            this.svgTexts[i]
              .x(this.handles[i + 1].x + dx + textlen / 2)
              .y(this.handles[i + 1].y - 10 - 7);
          }
        }
        else if (this.reltype) {
          let avg = this.arguments.reduce((acc, a) => acc + a.anchor.cx, 0) / this.arguments.length;
          this.svgTexts[0].x(avg)
            .y(this.arguments[0].anchor.absoluteY - 10 - 7);
          // d = 'M' + [this.arguments[0].anchor.cx, this.arguments[0].anchor.absoluteY]
          //   + 'L' + [this.arguments[1].anchor.cx, this.arguments[1].anchor.absoluteY];
        }
        this.line.plot(d);
      }

      this.links.forEach(l => l.draw(this));
    }

    remove() {
      this.svg.remove();

      let self = this;
      // remove reference to a link
      function detachLink(anchor) {
        let i = anchor.links.indexOf(self);
        if (i > -1) {
          anchor.links.splice(i, 1);
        }
      };

      // remove references to link from all anchors
      if (this.trigger) { detachLink(this.trigger); }
      this.arguments.forEach(arg => detachLink(arg.anchor));
    }

    hasAnchor(a) {
      if (this.trigger && a === this.trigger) { return true; }
      return this.arguments.find(arg => arg.anchor === a);
    }

    get idx() {
      if (this.trigger) {
        return this.trigger.idx;
      }
      return this.arguments.reduce((acc, arg) => acc + arg.anchor.idx, 0) / this.arguments.length;
    }

    get cx() {
      if (this.trigger) {
        // if (this.trigger.links.length > 1) {
        //   let offset = this.trigger.links.indexOf(this) / (this.trigger.links.length - 1) - 0.5;
        //   return this.trigger.cx + offset * 200;
        // }
        return this.trigger.cx;
      }
      if (this.arguments.length > 0) {
        return this.arguments.reduce((acc, arg) => acc + arg.anchor.cx, 0) / this.arguments.length;
      }
      return 0;
    }
    get absoluteY() {
      if (this.trigger) { return this.trigger.absoluteY - 15; }
      if (this.arguments[0]) { return this.arguments[0].absoluteY - 15; }
      return 0;
    }

    get val() {
      return this.trigger && this.trigger.val;
    }
}
