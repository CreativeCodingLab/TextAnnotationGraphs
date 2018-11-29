import WordTag from "./tag.js";
import Word from "./word.js";
import * as SVG from "svg.js";
import * as draggable from "svg.draggable.js";

class Link {
  constructor(eventId, trigger, args, reltype, top = true) {
    this.eventId = eventId;
    this.trigger = trigger;
    this.arguments = args.sort((a, b) => a.anchor.idx - b.anchor.idx);
    this.links = [];
    this.reltype = reltype;
    this.top = top;
    this.visible = true;

    this.resetSlotRecalculation();

    if (this.top) {
      // top links
      if (this.trigger) {
        this.trigger.links.push(this);
      }
      this.arguments.forEach(arg => {
        arg.anchor.links.push(this);
      });
    }
    else {
      // bottom links
      this.trigger.links.push(this);
      this.arguments.forEach(arg => arg.anchor.links.push(this));
    }

    this.endpoints = this.getEndpoints();

    this.mainSVG = null;
    this.svg = null;
    this.handles = [];
    this.line = null;
    this.svgTexts = [];
  }

  init(svg) {
    this.arguments.sort((a, b) => a.anchor.idx - b.anchor.idx);

    this.mainSVG = svg;
    this.svg = svg.group()
      .addClass("tag-element")
      .addClass(this.top ? "link" : "link syntax-link");
    if (!this.visible) {
      this.svg.hide();
    }

    // init handles
    // get location of trigger
    if (this.trigger) {
      let x = this.trigger.cx;
      let y = this.top ? this.trigger.absoluteY : this.trigger.absoluteDescent;
      this.handles.push({anchor: this.trigger, x, y, offset: null});
    }

    // draw arguments
    this.arguments.forEach(arg => {
      // get location of the argument
      let x = arg.anchor.cx;
      let y = this.top ? arg.anchor.absoluteY : arg.anchor.absoluteDescent;
      this.handles.push({anchor: arg.anchor, x, y, offset: null});

      // draw svgText for each trigger-argument relation
      if (this.trigger) {
        let text = this.svg.text(arg.type)
          .y(-7)
          .addClass("tag-element")
          .addClass("link-text");
        this.svgTexts.push(text);
      }
    });

    // draw svgText for a non-trigger relation
    if (this.reltype) {
      let text = this.svg.text(this.reltype)
        .y(-7)
        .addClass("tag-element")
        .addClass("link-text");
      this.svgTexts.push(text);
    }

    // apply click events to text
    this.svgTexts.forEach(text => {
      text.node.oncontextmenu = (e) => {
        this.selectedLabel = text;
        e.preventDefault();
        svg.fire("link-label-right-click", {
          object: this,
          type: "text",
          event: e
        });
      };
      text.click((e) => svg.fire("link-label-edit", {
        object: this,
        text,
        event: e
      }));
      text.dblclick((e) => svg.fire("build-tree", {object: this, event: e}));
    });

    this.line = this.svg.path()
      .addClass("tag-element")
      .addClass("polyline");

    // apply drag events to line
    let draggedHandle = null;
    let x = 0;

    this.line.dblclick((e) => svg.fire("build-tree", {object: this, event: e}));
    this.line.node.oncontextmenu = (e) => {
      e.preventDefault();
      svg.fire("link-right-click", {object: this, type: "link", event: e});
    };

    this.line.draggable()
      .on("dragstart", (e) => {
        let closestHandle = this.handles.reduce((acc, val) =>
            Math.abs(val.x - e.detail.p.x) < Math.abs(acc.x - e.detail.p.x)
              ? val
              : acc,
          this.handles[0]);

        // 8 is a "magic number" for tolerance of closeness to the endpoint of
        // the handle
        if (Math.abs(closestHandle.x - e.detail.p.x) < 5) {
          draggedHandle = closestHandle;
          x = e.detail.p.x;
        }
      })
      .on("dragmove", (e) => {
        e.preventDefault();
        if (draggedHandle) {
          let dx = e.detail.p.x - x;
          x = e.detail.p.x;
          draggedHandle.offset += dx;
          let anchor = draggedHandle.anchor;
          if (anchor instanceof Link) {
            let handles = anchor.handles
              .filter(h => h.anchor.row.idx === anchor.handles[0].anchor.row.idx)
              .sort((a, b) => a.x - b.x);

            let min = handles[0].x;
            let max = handles[handles.length - 1].x;
            if (handles.length < anchor.handles.length) {
              max = this.mainSVG.width();
            }
            let cx = draggedHandle.anchor.cx;
            draggedHandle.offset = Math.min(max - cx, Math.max(min - cx, draggedHandle.offset));
          }
          else {
            let halfWidth = anchor.boxWidth / 2;
            if (this.top && anchor.tag instanceof WordTag) {
              halfWidth = anchor.tag.ww / 2;
            }
            else if (!this.top && anchor.syntaxTag instanceof WordTag) {
              halfWidth = anchor.syntaxTag.ww / 2;
            }
            halfWidth = Math.max(halfWidth, 13);
            draggedHandle.offset = draggedHandle.offset < 0
              ? Math.max(-halfWidth + 3, draggedHandle.offset)
              : Math.min(halfWidth - 3, draggedHandle.offset);
          }

          // also constrain links above this link
          let handles = this.handles
            .filter(h => h.anchor.row.idx === this.handles[0].anchor.row.idx)
            .sort((a, b) => a.x - b.x);

          let min = handles[0].x;
          let max = handles[handles.length - 1].x;
          if (handles.length < this.handles.length) {
            max = this.mainSVG.width();
          }
          let cx = this.cx;
          this.links.forEach(link => {
            link.handles.forEach(h => {
              if (h.anchor === this) {
                h.offset = Math.min(max - cx, Math.max(min - cx, h.offset));
              }
            });
          });
          this.draw(draggedHandle.anchor);
        }
      })
      .on("dragend", () => {
        draggedHandle = null;
      });
  }

  toggle() {
    this.visible = !this.visible;
    if (this.visible) {
      this.show();
    }
    else {
      this.hide();
    }
  }

  show() {
    this.visible = true;
    if (this.svg) {
      this.svg.show();
      this.draw();
    }
  }

  hide() {
    this.visible = false;
    if (this.svg) {
      this.svg.hide();
    }
  }

  draw(anchor) {
    if (this.eventId === "R2") {
      window.debugLink = this;
      window.debugAnchor = anchor;
    }

    if (!anchor) {
      // initialize offsets
      this.handles.forEach(h => {
        if (h.offset === null) {
          let l = h.anchor.links
            .sort((a, b) => a.slot - b.slot)
            .filter(link => link.top == this.top);

          let w = 10; // magic number => TODO: resize this to tag width?

          if (l.length > 1) {
            if (h.anchor instanceof Link && h.anchor.trigger.idx === h.anchor.endpoints[0].idx) {
              h.offset = l.indexOf(this) / l.length * 2 * w;
            }
            else if (h.anchor instanceof Link && h.anchor.trigger.idx === h.anchor.endpoints[1].idx) {
              h.offset = l.indexOf(this) / l.length * 2 * -w;
            }
            else {
              l = l.filter(link => h.anchor.idx > link.endpoints[0].idx == h.anchor.idx > this.endpoints[0].idx);
              h.offset = (l.indexOf(this) + 0.5) / l.length * (h.anchor.idx > this.endpoints[0].idx ? -w : w);
            }
          }
          else {
            h.offset = 0;
          }
        }
      });
    }
    else {
      // redraw handles if word or link was moved

      /**
       * Small recursive function to find the given anchor within the link's
       * handles, even if it is nested
       */
      const findAnchor = (thisHandle) => {
        if (thisHandle.anchor === anchor) {
          // Found an un-nested anchor
          return thisHandle;
        } else if (thisHandle.anchor instanceof Link) {
          if (thisHandle.anchor.handles.find(findAnchor)) {
            return thisHandle;
          }
        }
      };

      let h = this.handles.find(findAnchor);
      console.log(this.eventId, h);
      if (h) {
        h.x = anchor.cx + h.offset;
        h.y = this.top ? anchor.absoluteY : anchor.absoluteDescent;
      }
    }

    if (!this.visible) {
      return;
    }

    // redraw line if it exists
    if (this.line) {
      let width = this.mainSVG.width();
      let d = "";

      // draw a polyline between the trigger and each of its arguments
      // https://www.w3.org/TR/SVG/paths.html#PathData
      if (this.trigger) {
        let y = this.getY(this.handles[1]);
        let rowCrossed = false;

        for (let i = 0, il = this.arguments.length; i < il; ++i) {
          let leftOfTrigger = this.arguments[i].anchor.idx < this.trigger.idx;
          let dx = leftOfTrigger ? 5 : -5;
          let textlen = leftOfTrigger ? this.svgTexts[i].length() : -this.svgTexts[i].length();

          let handle1 = this.handles[i + 1];

          // draw a line from the prev arrow segment
          if (i > 0) {
            // check if crossing over a row
            if (rowCrossed) {
              rowCrossed = false;
              d += "L" + [width, y] + "M0,";
              y = this.getY(handle1);
              d += y;
            }
            if (leftOfTrigger) {
              d += "L" + [handle1.x + dx, y];
            }
            else {
              d += "L" + [handle1.x + dx + textlen, y];
            }
          }
          else if (!leftOfTrigger) {
            // start drawing from the trigger
            y = this.getY(this.handles[0]);
            d += "M" + [this.handles[0].x, this.handles[0].y]
              + "C" + [this.handles[0].x, y, this.handles[0].x, y, this.handles[0].x - dx, y];

            // check if crossing over a row
            if (this.handles[0].anchor.row.idx < this.handles[1].anchor.row.idx) {
              d += "L" + [width, y] + "M0,";
              y = this.getY(this.handles[1]);
              d += y;
            }
            d += "L" + [this.handles[1].x + dx + textlen, y];
          }

          // draw the text svg
          this.svgTexts[i]
            .x(handle1.x + dx + textlen / 2)
            .y(y - 10);

          // draw an arrow at the handle
          const s = 4;
          d += this.arrowhead(handle1);

          let handlePrecedesTrigger = leftOfTrigger && (i + 2 > il || this.arguments[i + 1].anchor.idx >= this.trigger.idx);

          // check if crossing over a row
          rowCrossed = (handlePrecedesTrigger && this.handles[0].anchor.row.idx != handle1.anchor.row.idx) || (!handlePrecedesTrigger && i + 1 < il && this.handles[i + 2].anchor.row.idx != handle1.anchor.row.idx);

          // draw an arrow segment coming from each argument
          if (handlePrecedesTrigger && rowCrossed) {
            // if row is crossed
            let tempY = this.getY(handle1);
            y = this.getY(this.handles[0]);

            d += "M" + [handle1.x, handle1.y]
              + "C" + [handle1.x, tempY, handle1.x, tempY, handle1.x + dx, tempY]
              + "m" + [textlen, 0]
              + "L" + [width, tempY]
              + "M" + [0, y];
            rowCrossed = false;

            this.svgTexts[i].y(tempY - 10);
          }
          else {
            d += "M" + [handle1.x, handle1.y]
              + "C" + [handle1.x, y, handle1.x, y, handle1.x + dx, y];
            if (leftOfTrigger) {
              d += "m" + [textlen, 0];
            }
          }

          if (handlePrecedesTrigger) {
            // draw trigger to the right of the arrow segment
            if (i + 1 < il) {
              d += "L" + [this.handles[0].x - dx, y]
                + "c" + [dx, 0, dx, 0, dx, this.handles[0].y - y]
                + "m" + [dx, 0]
                + "l" + [-2 * dx, 0]
                + "m" + [dx, 0]
                + "C" + [this.handles[0].x, y, this.handles[0].x, y, this.handles[0].x + dx, y];
              rowCrossed = this.handles[i + 2].anchor.row.idx != this.handles[0].anchor.row.idx;
            }
            else {
              d += "L" + [this.handles[0].x - dx, y]
                + "c" + [dx, 0, dx, 0, dx, this.handles[0].y - y];
            }
          }
        }
      }
      else if (this.reltype) {

        // draw lines between a non-trigger relationship
        let y = this.getY(this.handles[0]);
        let endHandle = this.handles[this.handles.length - 1];
        // Width of the link's label
        let textlen = this.svgTexts[0].length();
        let avg;

        // Start and end handles on the same row
        if (this.handles[0].anchor.row.idx === endHandle.anchor.row.idx) {
          // Note: As written, `avg` only takes into account the left edge
          // of any Link handles (as opposed to Word handles, which are
          // treated as single points?)
          avg = this.handles.reduce((acc, h) => acc + h.x, 0) / this.arguments.length;
          let textLeft = avg - textlen / 2;

          d = "M" + [this.handles[0].x, this.handles[0].y] +
            (textLeft < this.handles[0].x
                ? ("L" + [this.handles[0].x, y]
                  + "M" + [endHandle.x, y]
                  + "L" + [endHandle.x, endHandle.y])
                : ("C" + [this.handles[0].x, y, this.handles[0].x, y, Math.min(textLeft, this.handles[0].x + 5), y]
                  + "L" + [textLeft, y]
                  + "m" + [textlen, 0]
                  + "L" + [Math.max(textLeft + textlen, endHandle.x - 5), y]
                  + "C" + [endHandle.x, y, endHandle.x, y, endHandle.x, endHandle.y])
            )
            + this.arrowhead(this.handles[0])
            + this.arrowhead(endHandle);
        }
        else {
          avg = (this.handles[0].x + width) / 2;
          d = "M" + [this.handles[0].x, this.handles[0].y]
            + "C" + [this.handles[0].x, y, this.handles[0].x, y, this.handles[0].x + 5, y]
            + "L" + [avg - textlen / 2, y]
            + "m" + [textlen, 0]
            + "L" + [width, y];

          let tempY = this.getY(endHandle);
          d += "M0," + tempY
            + "L" + [endHandle.x - 5, tempY]
            + "C" + [endHandle.x, tempY, endHandle.x, tempY, endHandle.x, endHandle.y]
            + this.arrowhead(this.handles[0])
            + this.arrowhead(endHandle);
        }
        this.svgTexts[0].x(avg)
          .y(y - 10);

      }
      window.debugPath = d;
      this.line.plot(d);
    }

    this.links.forEach(l => l.draw(this));
  }

  // helper function to calculate line-height in draw()
  getY(handle) {
    let r = handle.anchor.row;
    return this.top ?
      r.rh + r.ry - 45 - 15 * this.slot
      : r.rh + r.ry + 25 - 15 * this.slot;
  }

  // helper function to return a path string for an arrowhead
  arrowhead(handle) {
    const s = 4, s2 = 6;
    return this.top ?
      "M" + [handle.x - s, handle.y - s] + "l" + [s, s2] + "l" + [s, -s2] :
      "M" + [handle.x - s, handle.y + s] + "l" + [s, -s2] + "l" + [s, s2];
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
    if (this.trigger) {
      detachLink(this.trigger);
    }
    this.arguments.forEach(arg => detachLink(arg.anchor));
  }

  resetSlotRecalculation() {
    this.isRecalculated = false;
    this.slot = 0;

    if (this.top) {
      // top links
      if (this.trigger) {
        this.slot = this.trigger.slot;
      }
      this.arguments.forEach(arg => {
        if (arg.anchor.slot > this.slot) {
          this.slot = arg.anchor.slot;
        }
      });

      this.slot += 1;
    }
    else {
      // bottom links
      this.slot = -1;
    }
  }

  recalculateSlots(words) {
    // reorganize slots
    let ep = this.endpoints;
    if (this.isRecalculated) {
      return [{slot: this.slot, endpoints: ep}];
    }

    this.isRecalculated = true;
    let wordArray = words.slice(ep[0].idx, ep[1].idx + 1);
    let self = this;

    let slots = [];

    // get all interfering slots
    wordArray.forEach(word => {
      word.links.forEach(l => {
        if (l !== self &&
          l.top === self.top &&
          !(l.endpoints[0].idx >= ep[1].idx ||
            l.endpoints[1].idx <= ep[0].idx)) {
          [].push.apply(slots, l.recalculateSlots(words));
        }
      });
    });

    // find a slot to place this link
    function incrementSlot(l) {
      while (slots.find(s => s.slot === l.slot &&
        !(s.endpoints[0].idx >= l.endpoints[1].idx ||
          s.endpoints[1].idx <= l.endpoints[0].idx))) {
        l.slot += l.top ? 1 : -1;
      }
      slots.push({slot: l.slot, endpoints: l.endpoints});
      l.links.forEach(link => {
        if (link.top === l.top) {
          incrementSlot(link);
        }
      });
    }

    incrementSlot(this);

    return slots;
  }

  listenForEdit(e) {
    this.isEditing = true;

    let bbox = e.detail.text.bbox();
    e.detail.text
      .addClass("tag-element")
      .addClass("editing-text");
    this.editingText = e.detail.text;
    this.editingRect = this.svg.rect(bbox.width + 8, bbox.height + 4)
      .x(bbox.x - 4)
      .y(bbox.y - 2)
      .rx(2)
      .ry(2)
      .addClass("tag-element")
      .addClass("editing-rect")
      .back();
  }

  text(str) {
    if (this.editingText) {
      if (str === undefined) {
        return this.editingText;
      }
      this.editingText.text(str);
    }
  }

  stopEditing() {
    this.isEditing = false;
    this.editingText.removeClass("editing-text");
    this.editingRect.remove();
    this.editingRect = this.editingText = null;
    this.draw();
  }

  getEndpoints() {
    let minWord = null;
    let maxWord = null;

    if (this.trigger) {
      minWord = maxWord = this.trigger;
    }

    this.arguments.forEach(arg => {
      if (arg.anchor instanceof Link) {
        let endpts = arg.anchor.getEndpoints();
        if (!minWord || minWord.idx > endpts[0].idx) {
          minWord = endpts[0];
        }
        if (!maxWord || maxWord.idx < endpts[1].idx) {
          maxWord = endpts[1];
        }
      }
      else { // word or wordcluster
        if (!minWord || minWord.idx > arg.anchor.idx) {
          minWord = arg.anchor;
        }
        if (!maxWord || maxWord.idx < arg.anchor.idx) {
          maxWord = arg.anchor;
        }
      }
    });
    return [minWord, maxWord];
  }

  get rootWord() {
    if (this.trigger) {
      return this.trigger;
    }
    if (this.arguments[0].anchor instanceof Word) {
      return this.arguments[0].anchor;
    }
    return this.arguments[0].anchor.rootWord;
  }

  get idx() {
    return this.rootWord.idx;
  }

  get row() {
    return this.rootWord.row;
  }

  get cx() {
    if (this.line) {
      if (this.trigger) {
        return this.trigger.cx + this.handles[0].offset;
      }
      else {
        // FIXME: does not occur currently
      }
    }
    return this.rootWord.cx;
  }

  get absoluteY() {
    return this.rootWord.row.rh + this.rootWord.row.ry - 45 - 15 * this.slot;
  }

  get val() {
    return this.reltype || this.trigger.reltype || (this.trigger.tag && this.trigger.tag.val) || this.trigger.val;
  }
}

module.exports = Link;