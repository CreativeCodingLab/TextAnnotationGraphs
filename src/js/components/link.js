import WordTag from "./tag.js";
import Word from "./word.js";

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
    // ---------------
    // Core properties
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

    // ---------------
    // Visualisation-related properties
    this.initialised = false;

    // The main API/config instance this Link is attached to
    this.main = null;
    this.config = null;

    // SVG-related properties
    this.mainSVG = null;
    this.svg = null;
    this.handles = [];
    this.line = null;
    this.svgTexts = [];
    this.lastDrawnWidth = null;
  }

  /**
   * Initialises this Link against the main API instance
   * @param main
   */
  init(main) {
    this.initialised = true;

    this.main = main;
    this.config = main.config;

    this.arguments.sort((a, b) => a.anchor.idx - b.anchor.idx);

    this.mainSVG = main.svg;
    this.svg = main.svg.group()
      .addClass("tag-element")
      .addClass(this.top ? "link" : "link syntax-link");
    if (!this.visible) {
      this.svg.hide();
    }

    // Sub-class for Link handles
    const rowManager = this.main.rowManager;

    class Handle {
      constructor(anchor, x, y) {
        this.anchor = anchor;
        this.x = x;
        this.y = y;

        // For anchor Links, offsets start at 0 on the left bound of the Link
        // For anchor Words/WordTags, offsets start at 0 in the centre of the
        // Word/WordTag
        // Calculated when the Handle is first drawn
        this.offset = null;
      }

      /**
       * The Row in which this handle is contained
       * @return {Row}
       */
      get row() {
        return rowManager.whichRow(this.x, this.y);
      }

      /**
       * Returns true if this handle precedes the given handle
       * (i.e., this handle has an earlier row, or is to its left within the
       * same row)
       * @param {Handle} handle
       */
      precedes(handle) {
        return this.row.idx < handle.row.idx ||
          (this.row.idx === handle.row.idx && this.x < handle.x);
      }
    }

    // Init handles
    if (this.trigger) {
      this.handles.push(new Handle(
        this.trigger,
        this.trigger.cx,
        this.top ? this.trigger.absoluteY : this.trigger.absoluteDescent
      ));
    }

    this.arguments.forEach(arg => {
      this.handles.push(new Handle(
        arg.anchor,
        arg.anchor.cx,
        this.top ? arg.anchor.absoluteY : arg.anchor.absoluteDescent
      ));

      // Also prepare svgTexts for each trigger-argument relation
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
        this.mainSVG.fire("link-label-right-click", {
          object: this,
          type: "text",
          event: e
        });
      };
      text.click((e) => this.mainSVG.fire("link-label-edit", {
        object: this,
        text,
        event: e
      }));
      text.dblclick((e) => this.mainSVG.fire("build-tree", {
        object: this,
        event: e
      }));
    });

    this.line = this.svg.path()
      .addClass("tag-element")
      .addClass("polyline");

    // Closure for identifying dragged handles
    let draggedHandle = null;
    let dragStartX = 0;

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
          // Is this handle in the correct vicinity on the y-axis?
          if (this.top) {
            // The Link line will be above the handle
            if (dragY < this.getLineY(handle) - 5 || dragY > handle.y + 5) {
              continue;
            }
          } else {
            // The Link line will be below the handle
            if (dragY < handle.y - 5 || dragY > this.getLineY(handle) + 5) {
              continue;
            }
          }

          // Is this handle close enough on the x-axis?
          // In particular, the handle arrowheads might get fairly long
          let distX = Math.abs(handle.x - dragX);
          if (distX > this.config.linkArrowWidth) {
            continue;
          }

          // Is it closer than any previous candidate?
          if (!draggedHandle || distX < Math.abs(draggedHandle.x - dragX)) {
            // Sold!
            draggedHandle = handle;
            dragStartX = e.detail.p.x;
          }
        }

      })
      .on("dragmove", (e) => {
        e.preventDefault();

        if (!draggedHandle) {
          return;
        }

        // Handle the change in raw x-position for this `dragmove` iteration
        let dx = e.detail.p.x - dragStartX;
        dragStartX = e.detail.p.x;
        draggedHandle.offset += dx;

        window.debugHandle = draggedHandle;

        // Constrain the handle's offset so that it doesn't end up
        // overshooting the sides of its anchor
        let anchor = draggedHandle.anchor;
        if (anchor instanceof Link) {
          // The handle is resting on another Link; offset 0 is the left
          // edge of the lower Link
          draggedHandle.offset = Math.min(draggedHandle.offset, anchor.width);
          draggedHandle.offset = Math.max(draggedHandle.offset, 0);
        } else {
          // The handle is resting on a Word/WordTag; offset 0 is the centre
          // of the Word/WordTag
          let halfWidth = anchor.boxWidth / 2;
          if (this.top && anchor.tag instanceof WordTag) {
            halfWidth = anchor.tag.ww / 2;
          } else if (!this.top && anchor.syntaxTag instanceof WordTag) {
            halfWidth = anchor.syntaxTag.ww / 2;
          }

          // Constrain the handle to be within 3px of the bounds of its base
          draggedHandle.offset = Math.min(draggedHandle.offset, halfWidth - 3);
          draggedHandle.offset = Math.max(draggedHandle.offset, -halfWidth + 3);
        }

        this.draw(anchor);
      })
      .on("dragend", () => {
        draggedHandle = null;
      });


    this.line.dblclick((e) => this.mainSVG.fire("build-tree", {
      object: this,
      event: e
    }));
    this.line.node.oncontextmenu = (e) => {
      e.preventDefault();
      this.mainSVG.fire("link-right-click", {
        object: this,
        type: "link",
        event: e
      });
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
   * @param {Word|Link} [modAnchor] - Passed when we know that (only) a
   *   specific anchor has changed position since the last redraw
   */
  draw(modAnchor) {
    if (!this.initialised || !this.visible) {
      return;
    }

    // Ensure that every handle has a valid offset
    for (let h of this.handles) {
      if (h.offset === null) {
        let l = h.anchor.links
          .sort((a, b) => a.slot - b.slot)
          .filter(link => link.top === this.top);

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
    }

    if (modAnchor) {
      // If an anchor was moved, recalculate the x-/y-position of the
      // corresponding handle
      window.debugLink = this;
      window.debugAnchor = modAnchor;

      // Find the handle corresponding to the anchor whose position changed
      let modHandle = this.handles.find(h => (h.anchor === modAnchor));
      // Two possibilities: The anchor is a Word (/WordCluster?), or it is a
      // Link.
      if (!(modAnchor instanceof Link)) {
        // No need to account for multiple rows
        modHandle.x = modAnchor.cx + modHandle.offset;
        modHandle.y = this.top
          ? modAnchor.absoluteY
          : modAnchor.absoluteDescent;
      } else {
        // The anchor is a Link; the offset might extend to the next row
        // and beyond.
        const baseLeft = modAnchor.leftHandle;

        // First, make sure the offset doesn't overshoot the base row
        modHandle.offset = Math.min(modHandle.offset, modAnchor.width);
        modHandle.offset = Math.max(modHandle.offset, 0);

        // Handle intervening rows without modifying `handle.offset` or
        // the anchor Link directly
        let calcOffset = modHandle.offset;
        let calcRow = baseLeft.row;
        let calcX = baseLeft.x;

        while (calcOffset > calcRow.rw - calcX) {
          calcOffset -= calcRow.rw - calcX;
          calcX = 0;
          calcRow = this.main.rowManager.rows[calcRow.idx + 1];
        }

        // Last row - Deal with remaining offset
        modHandle.x = calcX + calcOffset;
        modHandle.y = modAnchor.getLineYRow(calcRow);
      }

      // If our width has changed, we should update the offset of any of our
      // parent Links.
      // The parent Link will be redrawn after we're done redrawing this
      // one, and any adjustments will be made automatically during the redraw.
      if (this.lastDrawnWidth === null) {
        this.lastDrawnWidth = this.width;
      } else {
        const growth = this.width - this.lastDrawnWidth;
        this.lastDrawnWidth = this.width;
        if (growth > 500) {
          const _ = require("lodash");
          console.log(this.eventId, this.width, growth, this.lastDrawnWidth);
          console.log(_.cloneDeep(this));
          console.log(_.cloneDeep(this.handles));
        }

        // To get the parent Link's handle position to remain as constant as
        // possible, we should adjust its offset only if modHandle precedes it
        for (let parentLink of this.links) {
          const parentHandle = parentLink.handles.find(h => h.anchor === this);
          if (modHandle.precedes(parentHandle)) {
            parentHandle.offset += growth;
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
        // Start drawing from the trigger
        const pTrigger = {
          x: this.triggerHandle.x,
          y: this.top
            ? this.triggerHandle.y - this.config.linkHandlePadding
            : this.triggerHandle.y + this.config.linkHandlePadding
        };

        // Draw the flat trigger arrow
        d += "M" + [pTrigger.x, pTrigger.y]
          + "m" + [this.config.linkArrowWidth, 0]
          + "l" + [-2 * this.config.linkArrowWidth, 0];

        // Draw the lines to each argument's handle
        for (let handle of this.handles) {
          if (handle === this.triggerHandle) {
            continue;
          }

          if (handle.row.idx === this.triggerHandle.row.idx) {
            // Same row
            let handleOnLeft = handle.x < pTrigger.x;
          }
        }

      } else if (this.trigger === "debug") {


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
      } else if (this.reltype) {
        // This is a non-trigger (binary) relation

        // Width/position of the Link's label (depends on whether or not the
        // start and end handles are on the same row; handled below)
        let textLength = this.svgTexts[0].length();
        let textCentre;
        let textY;

        // Start/end points
        const pStart = {
          x: this.leftHandle.x,
          y: this.top
            ? this.leftHandle.y - this.config.linkHandlePadding
            : this.leftHandle.y + this.config.linkHandlePadding
        };
        const pEnd = {
          x: this.rightHandle.x,
          y: this.top
            ? this.rightHandle.y - this.config.linkHandlePadding
            : this.rightHandle.y + this.config.linkHandlePadding
        };

        d = "M" + [pStart.x, pStart.y];

        // Start and end handles on the same row
        if (this.leftHandle.row.idx === this.rightHandle.row.idx) {
          const lineY = this.getLineYRow(this.leftHandle.row);

          textCentre = pStart.x + (this.width / 2);
          textY = lineY - 10;
          const textLeft = textCentre - textLength / 2;

          if (textLeft < pStart.x) {
            // Just draw the vertical lines up to the label
            d += "L" + [pStart.x, lineY]
              + "M" + [pEnd.x, lineY]
              + "L" + [pEnd.x, pEnd.y];
          } else {
            // Draw curves to/from the main Link line
            let curveLeftX = pStart.x + this.config.linkCurveWidth;
            curveLeftX = Math.min(curveLeftX, textLeft);
            let curveRightX = pEnd.x - this.config.linkCurveWidth;
            curveRightX = Math.max(curveRightX, textLeft + textLength);

            d += "C" + [pStart.x, lineY, pStart.x, lineY, curveLeftX, lineY]
              + "L" + [textLeft, lineY]
              + "m" + [textLength, 0]
              + "L" + [curveRightX, lineY]
              + "C" + [pEnd.x, lineY, pEnd.x, lineY, pEnd.x, pEnd.y];
          }

          d += this.arrowhead(pStart)
            + this.arrowhead(pEnd);
        } else {
          // Link spans multiple rows.

          // Centre the text on the portion of the Link line visible on the
          // first row
          const firstY = this.getLineYRow(this.leftHandle.row);
          textCentre = (this.leftHandle.row.rw + this.leftHandle.x) / 2;
          textY = firstY - 10;
          const textLeft = textCentre - textLength / 2;

          // Draw in the first row, including the Link label
          if (textLeft < pStart.x) {
            d += "L" + [pStart.x, firstY]
              + "M" + [textLeft + textLength, firstY]
              + "L" + [this.leftHandle.row.rw, firstY];
          } else {
            const curveLeftX = pStart.x + this.config.linkCurveWidth;
            d = "M" + [pStart.x, pStart.y]
              + "C" + [pStart.x, firstY, pStart.x, firstY, curveLeftX, firstY]
              + "L" + [textLeft, firstY]
              + "m" + [textLength, 0]
              + "L" + [this.leftHandle.row.rw, firstY];
          }

          // Draw the Link line across the intervening rows
          for (let i = this.leftHandle.row.idx + 1; i < this.rightHandle.row.idx; i++) {
            const thisRow = this.main.rowManager.rows[i];
            const lineY = this.getLineYRow(thisRow);
            d += "M" + [0, lineY]
              + "L" + [thisRow.rw, lineY];
          }

          // Draw in the last row
          const curveRightX = pEnd.x - this.config.linkCurveWidth;
          let finalY = this.getLineYRow(this.rightHandle.row);
          d += "M" + [0, finalY]
            + "L" + [curveRightX, finalY]
            + "C" + [pEnd.x, finalY, pEnd.x, finalY, pEnd.x, pEnd.y]
            + this.arrowhead(pStart)
            + this.arrowhead(pEnd);
        }

        // Move label
        this.svgTexts[0].x(textCentre)
          .y(textY);

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

  /**
   * Returns the y-position that this Link's main line will have if it were
   * drawn in the given row (based on the Row's position, and this Link's slot)
   * @param {Row} row
   */
  getLineYRow(row) {
    let calcSlot = this.slot;
    calcSlot = Math.min(calcSlot, row.maxSlot);
    calcSlot = Math.max(calcSlot, row.minSlot);

    return this.top
      ? row.rh + row.ry - 45 - 15 * calcSlot
      : row.rh + row.ry + 25 - 15 * calcSlot;
  }

  // helper function to return a path string for an arrowhead pointing to
  // the given point
  arrowhead(point) {
    const s = this.config.linkArrowWidth, s2 = 5;
    return this.top
      ? "M" + [point.x - s, point.y - s2] + "l" + [s, s2] + "l" + [s, -s2]
      : "M" + [point.x - s, point.y + s2] + "l" + [s, -s2] + "l" + [s, s2];
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
    }

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

  /**
   * Returns the total horizontal width of the Link, from the leftmost handle
   * to the rightmost handle
   */
  get width() {
    // Handles on the same row?
    if (this.leftHandle.row === this.rightHandle.row) {
      return this.rightHandle.x - this.leftHandle.x;
    }

    // If not, calculate the width (including intervening rows)
    let width = 0;
    width += this.leftHandle.row.rw - this.leftHandle.x;
    for (let i = this.leftHandle.row.idx + 1; i < this.rightHandle.row.idx; i++) {
      width += this.main.rowManager.rows[i].rw;
    }
    width += this.rightHandle.x;

    return width;
  }

  /**
   * Returns the leftmost handle (smallest Row index, smallest x-position)
   * in this Link
   */
  get leftHandle() {
    return this.handles.reduce((prev, next) => {
      if (prev.precedes(next)) {
        return prev;
      } else {
        return next;
      }
    }, this.handles[0]);
  }

  /**
   * Returns the rightmost handle (largest Row index, largest x-position)
   * in this Link
   */
  get rightHandle() {
    return this.handles.reduce((prev, next) => {
      if (prev.precedes(next)) {
        return next;
      } else {
        return prev;
      }
    }, this.handles[0]);
  }

  /**
   * Returns the handle corresponding to the trigger for this Link, if one
   * is defined
   */
  get triggerHandle() {
    if (!this.trigger) {
      return null;
    }

    return this.handles.find(handle => handle.anchor === this.trigger);
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