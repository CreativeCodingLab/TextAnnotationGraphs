import WordTag from "./tag.js";
import Word from "./word.js";
import * as SVG from "svg.js";
import * as draggable from "svg.draggable.js";

const $ = require("jquery");

class Link {
  /**
   * Creates a new Link between other entities
   *
   * @param {String} eventId - Unique ID
   * @param {Word} trigger - Text-bound entity that indicates the presence of
   *     this event
   * @param {Object[]} args - The arguments to this Link. An Array of
   *     Objects specifying `anchor` and `type`
   * @param {String} reltype - For (binary) relational Links, a String
   *     identifying the relationship type
   * @param {Boolean} top - Whether or not this Link should be drawn above
   *     the text row (if false, it will be drawn below)
   */
  constructor(eventId, trigger, args, reltype, top = true) {
    this.eventId = eventId;

    // Links can be either Event or Relation annotations, to borrow the BRAT
    // terminology.  Event annotations have a `trigger` entity from the text
    // that specifies the event, whereas Relation annotations have a `type`
    // that may not be bound to any particular part of the raw text.
    // Both types of Links have arguments, which may themselves be nested links.
    this.trigger = trigger;
    this.reltype = reltype;

    this.arguments = args.sort((a, b) => a.anchor.idx - b.anchor.idx);

    // Contains references to higher-level Links that have this Link as an
    // argument
    this.links = [];

    this.top = top;
    this.visible = true;

    // Slots are the y-intervals at which links may be drawn.
    this.resetSlotRecalculation();

    // Fill in references in this Link's trigger/arguments
    if (this.trigger) {
      this.trigger.links.push(this);
    }
    this.arguments.forEach(arg => {
      arg.anchor.links.push(this);
    });

    // The leftmost and rightmost anchors for this Link
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

    // Closure for identifying dragged handles
    let draggedHandle = null;
    let x = 0;

    this.line.draggable()
      .on("dragstart", (e) => {
        // We use the x and y values (with a little tolerance) to make sure
        // that the user is dragging near one of the Link's handles, and not
        // just in the middle of the Link's line.
        const dragX = e.detail.p.x;

        // `dragY` is adjusted for the document's scroll position, but we
        // want to compare it against our internal container coordinates
        const dragY = e.detail.p.y - $(window).scrollTop();

        for (let handle of this.handles) {
          // Is this handle close enough?
          // `distX` should be less than 5, and `closeY` should be true
          let distX = Math.abs(handle.x - dragX);
          let closeY = dragY >= this.getLineY(handle) - 5 &&
            dragY < handle.y + 5;

          // If it is, is it closer than any previous candidate?
          if (distX < 5 && closeY) {
            if (!draggedHandle || distX < Math.abs(draggedHandle.x - dragX)) {
              draggedHandle = handle;
              x = e.detail.p.x;
            }
          }
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
          console.log("Redrawing", draggedHandle.anchor);
          this.draw(draggedHandle.anchor);
        }
      })
      .on("dragend", () => {
        draggedHandle = null;
      });


    this.line.dblclick((e) => svg.fire("build-tree", {object: this, event: e}));
    this.line.node.oncontextmenu = (e) => {
      e.preventDefault();
      svg.fire("link-right-click", {object: this, type: "link", event: e});
    };
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

  /**
   * (Re-)draw some Link onto the main visualisation
   *
   * @param {Word|Link} changedAnchor - Passed for more efficient
   *     calculations when we know that (only) a specific anchor has
   *     changed position since the last redraw
   */
  draw(changedAnchor) {
    if (!changedAnchor) {
      // initialize offsets
      // (x-offsets along the draggable width of the handle, from 0 to the
      // width of whatever element the handle rests on)
      this.handles.forEach(h => {
        if (h.offset === null) {
          let l = h.anchor.links
            .sort((a, b) => a.slot - b.slot)
            .filter(link => link.top == this.top);

          let w = 10; // magic number => TODO: resize this to tag width?

          if (l.length > 1) {
            // The handle's anchor has multiple links associated with it;
            // stagger them horizontally by setting this handle's offset
            // based on its index in the anchor's list of links.
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
            // The handle's anchor only has one link, this one.
            // It can have offset 0.
            h.offset = 0;
          }
        }
      });
    }
    else {
      // redraw handles if word or link was moved

      window.debugLink = this;
      window.debugAnchor = changedAnchor;

      // Find the handle corresponding to the anchor whose position changed
      let thisHandle = this.handles.find(handle => (handle.anchor === changedAnchor));
      if (thisHandle) {
        thisHandle.x = changedAnchor.cx + thisHandle.offset;
        thisHandle.y = this.top ? changedAnchor.absoluteY : changedAnchor.absoluteDescent;

        // Two possibilities: The anchor is a Word (/WordCluster?), or it is a
        // Link.
        // If the anchor is itself a Link, we have to make sure we don't let
        // this Link overshoot its bounds.
        if (changedAnchor instanceof Link) {
          // Check to make sure we don't overshoot the right-side bound
          let maxX = 0;
          for (let handle of changedAnchor.handles) {
            maxX = Math.max(maxX, handle.anchor.cx);
          }
          const rightOvershoot = thisHandle.x - maxX;
          if (rightOvershoot > 0) {
            // We overshot it; rein in the x-position and offset respectively.
            thisHandle.x -= rightOvershoot;
            thisHandle.offset -= rightOvershoot;
          }
        }
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
        let y = this.getLineY(this.handles[1]);
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
              y = this.getLineY(handle1);
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
            y = this.getLineY(this.handles[0]);
            d += "M" + [this.handles[0].x, this.handles[0].y]
              + "C" + [this.handles[0].x, y, this.handles[0].x, y, this.handles[0].x - dx, y];

            // check if crossing over a row
            if (this.handles[0].anchor.row.idx < this.handles[1].anchor.row.idx) {
              d += "L" + [width, y] + "M0,";
              y = this.getLineY(this.handles[1]);
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
            let tempY = this.getLineY(handle1);
            y = this.getLineY(this.handles[0]);

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
        let y = this.getLineY(this.handles[0]);
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

          let tempY = this.getLineY(endHandle);
          d += "M0," + tempY
            + "L" + [endHandle.x - 5, tempY]
            + "C" + [endHandle.x, tempY, endHandle.x, tempY, endHandle.x, endHandle.y]
            + this.arrowhead(this.handles[0])
            + this.arrowhead(endHandle);
        }
        this.svgTexts[0].x(avg)
          .y(y - 10);

      }
      this.line.plot(d);
    }

    this.links.forEach(l => l.draw(this));
  }

  /**
   * Returns the y-coordinate of the Link line as drawn above the given handle.
   * (As opposed to the y-coordinate of the handle itself, which is at the
   * bottom of the relevant arrowhead)
   *
   * @param handle
   * @return {number}
   */
  getLineY(handle) {
    let r = handle.anchor.row;
    return this.top
      ? r.rh + r.ry - 45 - 15 * this.slot
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