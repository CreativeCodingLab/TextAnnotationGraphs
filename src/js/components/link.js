import WordTag from "./word-tag.js";
import Word from "./word.js";

const $ = require("jquery");

class Link {
  /**
   * Creates a new Link between other entities.  Links can have Words or
   * other Links as argument anchors.
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
        const row = rowManager.whichRow(this.x, this.y);
        if (!row) {
          console.log("Couldn't find row for handle:", this);
        }
        return row;
      }

      /**
       * Returns true if this handle precedes the given handle
       * (i.e., this handle has an earlier row, or is to its left within the
       * same row)
       * @param {Handle} handle
       */
      precedes(handle) {
        // FIXME: Sometimes the Row boundaries aren't set properly
        if (!this.row || !handle.row) {
          return false;
        }

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
   *   specific anchor has changed position since the last redraw. If not,
   *   the positions of all handles will be recalculated.
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

    // Recalculate handle positions
    let calcHandles = this.handles;
    if (modAnchor) {
      // Only one needs to be calculated
      calcHandles = [this.handles.find(h => h.anchor === modAnchor)];
    }
    const changedHandles = [];

    for (let handle of calcHandles) {
      const anchor = handle.anchor;
      // Two possibilities: The anchor is a Word (/WordCluster?), or it is a
      // Link.
      if (!(anchor instanceof Link)) {
        // No need to account for multiple rows (the handle will be resting
        // on the label for a Word/WordCluster)
        const newX = anchor.cx + handle.offset;
        const newY = this.top
          ? anchor.absoluteY
          : anchor.absoluteDescent;

        if (handle.x !== newX || handle.y !== newY) {
          handle.x = newX;
          handle.y = newY;
          changedHandles.push(handle);
        }
      } else {
        // The anchor is a Link; the handle rests on another Link's line,
        // and the offset might extend to the next row and beyond.
        const baseLeft = anchor.leftHandle;

        // First, make sure the offset doesn't overshoot the base row
        handle.offset = Math.min(handle.offset, anchor.width);
        handle.offset = Math.max(handle.offset, 0);

        // Handle intervening rows without modifying `handle.offset` or
        // the anchor Link directly
        let calcOffset = handle.offset;
        let calcRow = baseLeft.row;
        let calcX = baseLeft.x;

        while (calcOffset > calcRow.rw - calcX) {
          calcOffset -= calcRow.rw - calcX;
          calcX = 0;
          calcRow = this.main.rowManager.rows[calcRow.idx + 1];
        }

        // Last row - Deal with remaining offset
        const newX = calcX + calcOffset;
        const newY = anchor.getLineYRow(calcRow);

        if (handle.x !== newX || handle.y !== newY) {
          handle.x = newX;
          handle.y = newY;
          changedHandles.push(handle);
        }
      }
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
        // Debug
        const _ = require("lodash");
        console.log(this.eventId, this.width, growth, this.lastDrawnWidth);
        console.log(_.cloneDeep(this));
        console.log(_.cloneDeep(this.handles));
      }

      // To get the parent Link's handle position to remain as constant as
      // possible, we should adjust its offset only if our left handle changed
      if (changedHandles.length === 1 &&
        changedHandles[0] === this.leftHandle) {
        for (let parentLink of this.links) {
          const parentHandle = parentLink.handles.find(h => h.anchor === this);
          parentHandle.offset += growth;
          parentHandle.offset = Math.max(parentHandle.offset, 0);
        }
      }
    }

    // Redraw Link line
    let width = this.mainSVG.width();
    let d = "";
    const leftHandle = this.leftHandle;
    const rightHandle = this.rightHandle;

    // draw a polyline between the trigger and each of its arguments
    // https://www.w3.org/TR/SVG/paths.html#PathData
    if (this.trigger) {
      // Start drawing from the trigger
      const triggerHandle = this.triggerHandle;

      const pTrigger = {
        x: triggerHandle.x,
        y: this.top
          ? triggerHandle.y - this.config.linkHandlePadding
          : triggerHandle.y + this.config.linkHandlePadding
      };

      // Draw the lines to each argument's handle
      for (let i = 0; i < this.arguments.length; i++) {
        // The trigger is always the handle with index 0
        const handle = this.handles[i + 1];
        const label = this.svgTexts[i];

        const pHandle = {
          x: handle.x,
          y: this.top
            ? handle.y - this.config.linkHandlePadding
            : handle.y + this.config.linkHandlePadding
        };

        const sameRow = handle.row.idx === triggerHandle.row.idx;

        // Width/position of the Link's label
        const textLength = label.length();
        const textY = this.getLineYRow(handle.row) - 10;
        let textLeft;
        if (handle.precedes(triggerHandle)) {
          textLeft = pHandle.x + this.config.linkCurveWidth;
          if (textLeft + textLength > handle.row.rw) {
            textLeft = handle.row.rw - textLength;
          }
        } else {
          textLeft = pHandle.x - this.config.linkCurveWidth - textLength;
          textLeft = Math.max(textLeft, 0);
        }
        const textCentre = textLeft + textLength / 2;

        // Draw line between this handle and the trigger
        if (handle.precedes(triggerHandle)) {
          // This handle is on the left of the trigger handle.
          // Start drawing from this handle.
          d += "M" + [pHandle.x, pHandle.y];

          const handleY = this.getLineYRow(handle.row);

          // Argument handle
          if (textLeft < pHandle.x) {
            // Just draw a vertical line up to the label
            d += "L" + [pHandle.x, handleY];
          } else {
            // Draw curve up to the main Link line, then, go up to the label
            let curveLeftX = pHandle.x + this.config.linkCurveWidth;
            curveLeftX = Math.min(curveLeftX, textLeft);
            d += "C" + [pHandle.x, handleY, pHandle.x, handleY, curveLeftX, handleY]
              + "L" + [textLeft, handleY];
          }

          // Trigger handle
          if (sameRow) {
            if (textLeft + textLength > pTrigger.x) {
              // Just draw a vertical line down to the handle
              d += "M" + [pTrigger.x, handleY]
                + "L" + [pTrigger.x, pTrigger.y];
            } else {
              // Draw curve down from the main Link line
              let curveRightX = pTrigger.x - this.config.linkCurveWidth;
              curveRightX = Math.max(curveRightX, textLeft + textLength);
              d += "M" + [textLeft + textLength, handleY]
                + "L" + [curveRightX, handleY]
                + "C" + [pTrigger.x, handleY, pTrigger.x, handleY, pTrigger.x, pTrigger.y];
            }
          } else {
            // Draw in Link line across the end of the first row, and all
            // intervening rows
            d += "M" + [textLeft + textLength, handleY]
              + "L" + [handle.row.rw, handleY];

            for (let i = handle.row.idx + 1; i < triggerHandle.row.idx; i++) {
              const thisRow = this.main.rowManager.rows[i];
              const lineY = this.getLineYRow(thisRow);
              d += "M" + [0, lineY]
                + "L" + [thisRow.rw, lineY];
            }

            // Draw in the last row
            let curveRightX = pTrigger.x - this.config.linkCurveWidth;
            curveRightX = Math.max(curveRightX, 0);
            let finalY = this.getLineYRow(triggerHandle.row);
            d += "M" + [0, finalY]
              + "L" + [curveRightX, finalY]
              + "C" + [pTrigger.x, finalY, pTrigger.x, finalY, pTrigger.x, pTrigger.y];
          }
        } else {
          // This handle is on the right of the trigger handle.
          // Start drawing from the trigger handle.
          d += "M" + [pTrigger.x, pTrigger.y];

          const triggerY = this.getLineYRow(triggerHandle.row);

          // Trigger handle
          if (textLeft < pTrigger.x) {
            // Just draw a vertical line up to the label
            d += "M" + [pTrigger.x, pTrigger.y]
              + "L" + [pTrigger.x, triggerY];
          } else {
            // Draw curve up to the main Link line, then, go up to the label
            let curveLeftX = pTrigger.x + this.config.linkCurveWidth;
            curveLeftX = Math.min(curveLeftX, textLeft);
            d += "C" + [pTrigger.x, triggerY, pTrigger.x, triggerY, curveLeftX, triggerY]
              + "L" + [textLeft, triggerY];
          }

          // Argument handle
          if (sameRow) {
            if (textLeft + textLength > pHandle.x) {
              // Just draw a vertical line down to the handle
              d += "M" + [pHandle.x, triggerY]
                + "L" + [pHandle.x, pHandle.y];
            } else {
              // Draw curve down from the main Link line
              let curveRightX = pHandle.x - this.config.linkCurveWidth;
              curveRightX = Math.max(curveRightX, textLeft + textLength);
              d += "M" + [textLeft + textLength, triggerY]
                + "L" + [curveRightX, triggerY]
                + "C" + [pHandle.x, triggerY, pHandle.x, triggerY, pHandle.x, pHandle.y];
            }
          } else {
            // Draw in Link line across the end of the first row, and all
            // intervening rows
            d += "M" + [textLeft + textLength, triggerY]
              + "L" + [triggerHandle.row.rw, triggerY];

            for (let i = triggerHandle.row.idx + 1; i < handle.row.idx; i++) {
              const thisRow = this.main.rowManager.rows[i];
              const lineY = this.getLineYRow(thisRow);
              d += "M" + [0, lineY]
                + "L" + [thisRow.rw, lineY];
            }

            // Draw in the last row
            let curveRightX = pHandle.x - this.config.linkCurveWidth;
            curveRightX = Math.max(curveRightX, 0);
            let finalY = this.getLineYRow(handle.row);
            d += "M" + [0, finalY]
              + "L" + [curveRightX, finalY]
              + "C" + [pHandle.x, finalY, pHandle.x, finalY, pHandle.x, pHandle.y];
          }
        }

        // Arrowheads
        // Draw the flat trigger arrow
        d += "M" + [pTrigger.x, pTrigger.y]
          + "m" + [this.config.linkArrowWidth, 0]
          + "l" + [-2 * this.config.linkArrowWidth, 0];
        d += this.arrowhead(pHandle);

        // Move label
        label.x(textCentre).y(textY);
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

      // Start/end points
      const pStart = {
        x: leftHandle.x,
        y: this.top
          ? leftHandle.y - this.config.linkHandlePadding
          : leftHandle.y + this.config.linkHandlePadding
      };
      const pEnd = {
        x: rightHandle.x,
        y: this.top
          ? rightHandle.y - this.config.linkHandlePadding
          : rightHandle.y + this.config.linkHandlePadding
      };

      const sameRow = leftHandle.row.idx === rightHandle.row.idx;

      // Width/position of the Link's label
      // (Always on the first row for multi-line Links)
      const textLength = this.svgTexts[0].length();
      const textY = this.getLineYRow(leftHandle.row) - 10;

      // Centre on the segment of the Link line on the first row
      let textCentre = sameRow
        ? (pStart.x + pEnd.x) / 2
        : (pStart.x + leftHandle.row.rw) / 2;
      let textLeft = textCentre - textLength / 2;

      // Make sure it doesn't overshoot the right row boundary
      if (textLeft + textLength > leftHandle.row.rw) {
        textLeft = leftHandle.row.rw - textLength;
        textCentre = textLeft + textLength / 2;
      }

      // Start preparing path string
      d = "M" + [pStart.x, pStart.y];

      // Left handle
      const firstY = this.getLineYRow(leftHandle.row);
      if (textLeft < pStart.x) {
        // Just draw a vertical line up to the label
        d += "L" + [pStart.x, firstY];
      } else {
        // Draw curve up to the main Link line, then, go up to the label
        let curveLeftX = pStart.x + this.config.linkCurveWidth;
        curveLeftX = Math.min(curveLeftX, textLeft);
        d += "C" + [pStart.x, firstY, pStart.x, firstY, curveLeftX, firstY]
          + "L" + [textLeft, firstY];
      }

      // Right handle
      if (sameRow) {
        if (textLeft + textLength > pEnd.x) {
          // Just draw a vertical line down to the handle
          d += "M" + [pEnd.x, firstY]
            + "L" + [pEnd.x, pEnd.y];
        } else {
          // Draw curve down from the main Link line
          let curveRightX = pEnd.x - this.config.linkCurveWidth;
          curveRightX = Math.max(curveRightX, textLeft + textLength);
          d += "M" + [textLeft + textLength, firstY]
            + "L" + [curveRightX, firstY]
            + "C" + [pEnd.x, firstY, pEnd.x, firstY, pEnd.x, pEnd.y];
        }
      } else {
        // Draw in Link line across the end of the first row, and all
        // intervening rows
        d += "M" + [textLeft + textLength, firstY]
          + "L" + [leftHandle.row.rw, firstY];

        for (let i = leftHandle.row.idx + 1; i < rightHandle.row.idx; i++) {
          const thisRow = this.main.rowManager.rows[i];
          const lineY = this.getLineYRow(thisRow);
          d += "M" + [0, lineY]
            + "L" + [thisRow.rw, lineY];
        }

        // Draw in the last row
        let curveRightX = pEnd.x - this.config.linkCurveWidth;
        curveRightX = Math.max(curveRightX, 0);
        let finalY = this.getLineYRow(rightHandle.row);
        d += "M" + [0, finalY]
          + "L" + [curveRightX, finalY]
          + "C" + [pEnd.x, finalY, pEnd.x, finalY, pEnd.x, pEnd.y];
      }

      // Arrowheads
      d += this.arrowhead(pStart)
        + this.arrowhead(pEnd);

      // Move label
      this.svgTexts[0].x(textCentre).y(textY);
    }

    this.line.plot(d);


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
    return this.top
      ? row.rh + row.ry - 45 - 15 * this.slot
      : row.rh + row.ry + 25 - 15 * this.slot;
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