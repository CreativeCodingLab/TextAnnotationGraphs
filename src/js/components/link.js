import WordTag from "./word-tag.js";
import WordCluster from "./word-cluster.js";

const $ = require("jquery");

const Util = require("../util.js");

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
   * @param {String} category - Links can be shown/hidden by category
   */
  constructor(eventId, trigger, args, reltype, top = true, category = "default") {
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
    this.arguments = args;

    // Contains references to higher-level Links that have this Link as an
    // argument
    this.links = [];

    this.top = top;
    this.category = category;

    // Is this Link currently visible in the visualisation?
    this.visible = false;

    // Slots are the y-intervals at which links may be drawn.
    // The main instance will need to provide the `.calculateSlot()` method
    // with the full set of Words in the data so that we can check for
    // crossing/intervening Links.
    this.slot = null;
    this.calculatingSlot = false;

    // Fill in references in this Link's trigger/argument Words
    if (this.trigger) {
      this.trigger.links.push(this);
    }
    this.arguments.forEach(arg => {
      arg.anchor.links.push(this);
    });

    // ---------------
    // Visualisation-related properties
    this.initialised = false;

    // The main API/config instance this Link is attached to
    this.main = null;
    this.config = null;

    // SVG-related properties

    // SVG parents
    this.mainSvg = null;
    this.svg = null;

    // Handle objects
    this.handles = [];

    // SVG Path and last-drawn path string
    this.path = null;
    this.lastPathString = "";

    // (Horizontal-only) width of the last drawn line for this Link; used
    // for calculating Handle positions for parent Links
    this.lastDrawnWidth = null;

    // Objects for main Link label / argument labels
    this.argLabels = [];
    this.linkLabel = null;
  }

  /**
   * Initialises this Link against the main API instance
   * @param main
   */
  init(main) {
    this.main = main;
    this.config = main.config;

    this.mainSvg = main.svg;
    this.svg = main.svg.group()
      .addClass("tag-element")
      .addClass(this.top ? "link" : "link syntax-link");

    // Links are hidden by default; the main function should call `.show()`
    // for any Links to be shown
    this.svg.hide();

    // The main Link line
    this.path = this.svg.path()
      .addClass("tag-element");

    // Init handles and SVG texts.
    // If there is a trigger, it will be the first handle
    if (this.trigger) {
      this.handles.push(new Handle(
        this.trigger,
        this
      ));
    }

    // Arguments
    this.arguments.forEach(arg => {
      this.handles.push(new Handle(
        arg.anchor,
        this
      ));

      const text = new Label(this.mainSvg, this.svg, arg.type, "link-arg-label");
      this.argLabels.push(text);
    });

    // Main Link label
    this.linkLabel = new Label(this.mainSvg, this.svg, this.reltype, "link-main-label");

    // Closure for identifying dragged handles
    let draggedHandle = null;
    let dragStartX = 0;

    // Drag/Click events
    this.path.draggable()
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
            if (dragY < this.getLineY(handle.row) - 5 || dragY > handle.y + 5) {
              continue;
            }
          } else {
            // The Link line will be below the handle
            if (dragY < handle.y - 5 || dragY > this.getLineY(handle.row) + 5) {
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

        // Constrain the handle's offset so that it doesn't end up
        // overshooting the sides of its anchor
        let anchor = draggedHandle.anchor;
        if (anchor instanceof Link) {
          // The handle is resting on another Link; offset 0 is the left
          // edge of the lower Link
          draggedHandle.offset = Math.min(draggedHandle.offset, anchor.width);
          draggedHandle.offset = Math.max(draggedHandle.offset, 0);
        } else {
          // The handle is resting on a WordTag/WordCluster; offset 0 is the
          // centre of the tag
          let halfWidth;
          if (this.top && anchor.tag instanceof WordTag) {
            halfWidth = anchor.tag.textWidth / 2;
          } else if (!this.top && anchor.syntaxTag instanceof WordTag) {
            halfWidth = anchor.syntaxTag.textWidth / 2;
          } else if (this.top && anchor instanceof WordCluster) {
            halfWidth = anchor.textWidth / 2;
          } else {
            // Shouldn't happen, but maybe this is pointed directly at a Word?
            halfWidth = anchor.boxWidth / 2;
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

    this.path.dblclick((e) => this.mainSvg.fire("build-tree", {
      object: this,
      event: e
    }));
    this.path.node.oncontextmenu = (e) => {
      e.preventDefault();
      this.mainSvg.fire("link-right-click", {
        object: this,
        type: "link",
        event: e
      });
    };

    this.initialised = true;
  }

  /**
   * Toggles the visibility of this Link
   */
  toggle() {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }

    this.visible = !this.visible;
  }

  /**
   * Shows this Link
   */
  show() {
    if (this.svg) {
      this.svg.show();
      this.draw();
    }
    this.visible = true;
  }

  /**
   * Hides this Link
   */
  hide() {
    if (this.svg) {
      this.svg.hide();
    }
    this.visible = false;
  }

  /**
   * Shows the argument labels for this Link
   */
  showArgLabels() {
    this.argLabels.forEach(label => label.show());
    this.draw();
  }

  /**
   * Hides the argument labels for this Link
   */
  hideArgLabels() {
    this.argLabels.forEach(label => label.hide());
  }

  /**
   * (Re-)draw some Link onto the main visualisation
   *
   * @param {Word|WordCluster|Link} [modAnchor] - Passed when we know that
   *     (only) a specific anchor has changed position since the last
   *     redraw. If not, the positions of all handles will be recalculated.
   */
  draw(modAnchor) {
    if (!this.initialised) {
      return;
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
      // Two possibilities: The anchor is a Word/WordCluster, or it is a
      // Link.
      if (!(anchor instanceof Link)) {
        // No need to account for multiple rows (the handle will be resting
        // on the label for a Word/WordCluster)
        // The 0-offset location is the centre of the anchor.
        const newX = anchor.cx + handle.offset;
        const newY = this.top
          ? anchor.absoluteY
          : anchor.absoluteDescent;

        if (handle.x !== newX || handle.y !== newY) {
          handle.x = newX;
          handle.y = newY;
          handle.row = anchor.row;
          changedHandles.push(handle);
        }
      } else {
        // The anchor is a Link; the handle rests on another Link's line,
        // and the offset might extend to the next row and beyond.
        if (!anchor.visible) {
          // We need to draw in our anchor before proceeding with our own draw
          anchor.draw();
        }
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
        const newY = anchor.getLineY(calcRow);

        if (handle.x !== newX || handle.y !== newY) {
          handle.x = newX;
          handle.y = newY;
          handle.row = calcRow;
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

    // draw a polyline between the trigger and each of its arguments
    // https://www.w3.org/TR/SVG/paths.html#PathData
    if (this.trigger) {
      // This Link has a trigger (Event)
      this._drawAsEvent();
    } else {
      // This Link has no trigger (Relation)
      this._drawAsRelation();
    }

    this.visible = true;

    this.links.forEach(l => l.draw(this));
  }

  /**
   * Removes this Link's SVG elements from the visualisation, and removes
   * all references to it from the data stores
   */
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

  /**
   * Returns the y-position that this Link's main line will have if it were
   * drawn in the given row (based on the Row's position, and this Link's slot)
   *
   * @param {Row} row
   */
  getLineY(row) {
    return this.top
      ? row.ry + row.rh - row.wordHeight - this.config.linkSlotInterval * this.slot
      // Bottom Links have negative slot numbers
      : row.ry + row.rh + row.wordDescent - this.config.linkSlotInterval * this.slot;
  }


  /**
   * Given the full array of Words in the document, calculates this Link's
   * slot based on other crossing/intervening/nested Links, recursively if
   * necessary.
   *
   * Principles:
   * 1) Links with no other Links intervening have priority for lowest slot
   * 2) Links with fully slotted intervening Links (i.e., no crossings) have
   *    second priority
   * 3) Crossed Links have lowest priority, and are handled in order from
   *    left to right and descending order of length (in terms of number of
   *    Words covered)
   *
   * Sorting of the full Links array is handled by `Util.sortForSlotting()`
   *
   * @param {Word[]} words
   */
  calculateSlot(words) {
    // We may already have calculated this Link's slot in a previous
    // iteration, or *be* calculating this Link's slot in a previous
    // iteration (i.e., in the case of crossing Links).
    if (this.slot) {
      // Already calculated
      return this.slot;
    } else if (this.calculatingSlot) {
      // Currently trying to calculate this slot in a previous recursive
      // iteration
      return 0;
    }

    this.calculatingSlot = true;

    // Pick up all the intervening Links
    // We don't include the first and last Word since Links ending on the
    // same Word can share the same slot if they don't otherwise overlap
    let intervening = [];
    const coveredWords = words.slice(
      this.endpoints[0].idx + 1,
      this.endpoints[1].idx
    );
    // The above comments notwithstanding, the first and last Word should
    // know that we are watching them
    words[this.endpoints[0].idx].passingLinks.push(this);
    words[this.endpoints[1].idx].passingLinks.push(this);

    for (const word of coveredWords) {
      // Let this Word know we're watching it
      word.passingLinks.push(this);

      // Word Links
      for (const link of word.links) {
        // Only consider Links on the same side of the Row as this one
        if (link !== this &&
          link.top === this.top && intervening.indexOf(link) < 0) {
          intervening.push(link);
        }
      }

      // WordCluster Links
      for (const cluster of word.clusters) {
        for (const link of cluster.links) {
          if (link !== this &&
            link.top === this.top && intervening.indexOf(link) < 0) {
            intervening.push(link);
          }
        }
      }
    }

    // All of our own nested Links are also intervening Links
    for (const arg of this.arguments) {
      if (arg.anchor instanceof Link && intervening.indexOf(arg.anchor) < 0) {
        intervening.push(arg.anchor);
      }
    }

    intervening = Util.sortForSlotting(intervening);

    // Map to slots, reduce to the highest number seen so far (or 0 if there
    // are none)
    const maxSlot = intervening
      .map(link => link.calculateSlot(words))
      .reduce((prev, next) => {
        // Absolute numbers -- Slots for bottom Links are negative
        next = Math.abs(next);
        if (next > prev) {
          return next;
        } else {
          return prev;
        }
      }, 0);

    this.slot = maxSlot + 1;
    if (!this.top) {
      this.slot = this.slot * -1;
    }
    this.calculatingSlot = false;
    return this.slot;
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

  /**
   * Gets the left-most and right-most Word anchors that come under this Link.
   * (Nested Links are treated as extensions of this Link, so the relevant
   * endpoint of the nested Link is recursively found and used)
   * @return {*[]}
   */
  get endpoints() {
    let minWord = null;
    let maxWord = null;

    if (this.trigger) {
      minWord = maxWord = this.trigger;
    }

    this.arguments.forEach(arg => {
      if (arg.anchor instanceof Link) {
        let endpts = arg.anchor.endpoints;
        if (!minWord || minWord.idx > endpts[0].idx) {
          minWord = endpts[0];
        }
        if (!maxWord || maxWord.idx < endpts[1].idx) {
          maxWord = endpts[1];
        }
      } else { // word or wordcluster
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

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Private helper/setup functions

  /**
   * Draws this Link as an Event annotation (has a trigger)
   * @private
   */
  _drawAsEvent() {
    let d = "";
    const triggerHandle = this.triggerHandle;
    const pTrigger = {
      x: triggerHandle.x,
      y: this.top
        ? triggerHandle.y - this.config.linkHandlePadding
        : triggerHandle.y + this.config.linkHandlePadding
    };

    // How we draw the lines to each argument's Handle depends on which side
    // of the trigger they're on.
    // Collect the left and right Handles, sorted by distance from the
    // trigger Handle, ascending
    const lHandles = [];
    const rHandles = [];
    for (const handle of this.handles) {
      if (handle === triggerHandle) {
        continue;
      }

      if (handle.precedes(triggerHandle)) {
        lHandles.push(handle);
      } else {
        rHandles.push(handle);
      }
    }
    lHandles.sort((a, b) => a.precedes(b) ? 1 : -1);
    rHandles.sort((a, b) => a.precedes(b) ? -1 : 1);

    // Start drawing lines between the Handles/text.  We can't simply draw
    // full lines from the trigger to each argument, because we don't want
    // to draw over any intervening argument labels.

    // pReference will be the point next to the last drawn argument label
    // from which the line to the next argument should begin.
    let pReference;

    // Left handles
    // ============
    pReference = null;
    for (const handle of lHandles) {
      // Handle
      // ------
      const pHandle = {
        x: handle.x,
        y: this.top
          ? handle.y - this.config.linkHandlePadding
          : handle.y + this.config.linkHandlePadding
      };

      // Label
      // -----
      // The trigger always takes up index 0, so the index for the label is
      // one less than the index for this handle in `this.handles`
      const label = this.argLabels[this.handles.indexOf(handle) - 1];
      label.show();

      const textLength = label.length();
      const textY = this.getLineY(handle.row);
      let textLeft = pHandle.x + this.config.linkCurveWidth;
      if (textLeft + textLength > handle.row.rw) {
        textLeft = handle.row.rw - textLength;
      }
      const textCentre = textLeft + textLength / 2;

      // Line
      // ----
      const handleY = this.getLineY(handle.row);

      // Argument handle to label
      d += "M" + [pHandle.x, pHandle.y];
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

      // Label to pReference (if set)
      if (pReference) {
        if (handle.row.idx === pReference.row.idx) {
          // Same row
          d += "M" + [textLeft + textLength, handleY]
            + "L" + [pReference.x, pReference.y];
        } else {
          // Draw in Link line across the end of the first row, and all
          // intervening rows
          d += "M" + [textLeft + textLength, handleY]
            + "L" + [handle.row.rw, handleY];

          for (let i = handle.row.idx + 1; i < pReference.row.idx; i++) {
            const thisRow = this.main.rowManager.rows[i];
            const lineY = this.getLineY(thisRow);
            d += "M" + [0, lineY]
              + "L" + [thisRow.rw, lineY];
          }

          // Draw in the last row
          let finalY = this.getLineY(pReference.row);
          d += "M" + [0, finalY]
            + "L" + [pReference.x, pReference.y];
        }
      }

      if (pReference === null) {
        // This is the first left handle; draw in the line to the trigger also.

        // Label to Trigger handle
        if (handle.row.idx === triggerHandle.row.idx) {
          // Same row
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
            const lineY = this.getLineY(thisRow);
            d += "M" + [0, lineY]
              + "L" + [thisRow.rw, lineY];
          }

          // Draw in the last row
          let curveRightX = pTrigger.x - this.config.linkCurveWidth;
          curveRightX = Math.max(curveRightX, 0);
          let finalY = this.getLineY(triggerHandle.row);
          d += "M" + [0, finalY]
            + "L" + [curveRightX, finalY]
            + "C" + [pTrigger.x, finalY, pTrigger.x, finalY, pTrigger.x, pTrigger.y];
        }
      }

      // pReference for the next handle will be the lower-left corner of
      // the label
      pReference = {
        x: textLeft,
        y: handleY,
        row: handle.row
      };

      // Arrowhead
      d += this._arrowhead(pHandle);

      // Move label
      label.move(textCentre, textY);
    }

    // Right handles
    // ============
    pReference = null;
    for (const handle of rHandles) {
      // Handle
      // ------
      const pHandle = {
        x: handle.x,
        y: this.top
          ? handle.y - this.config.linkHandlePadding
          : handle.y + this.config.linkHandlePadding
      };

      // Label
      // -----
      // The trigger always takes up index 0, so the index for the label is
      // one less than the index for this handle in `this.handles`
      const label = this.argLabels[this.handles.indexOf(handle) - 1];
      label.show();

      const textLength = label.length();
      const textY = this.getLineY(handle.row);
      let textLeft = pHandle.x - this.config.linkCurveWidth - textLength;
      textLeft = Math.max(textLeft, 0);
      const textCentre = textLeft + textLength / 2;

      // Line
      // ----
      const handleY = this.getLineY(handle.row);

      // Label to argument handle
      if (textLeft + textLength > pHandle.x) {
        // Just draw a vertical line down to the label
        d += "M" + [pHandle.x, textY];
        d += "L" + [pHandle.x, pHandle.y];
      } else {
        // Draw curve down from the main Link line
        let curveRightX = pHandle.x - this.config.linkCurveWidth;
        curveRightX = Math.max(curveRightX, textLeft + textLength);
        d += "M" + [textLeft + textLength, textY]
          + "L" + [curveRightX, textY]
          + "C" + [pHandle.x, textY, pHandle.x, textY, pHandle.x, pHandle.y];
      }

      // pReference (if set) to label
      if (pReference) {
        if (pReference.row.idx === handle.row.idx) {
          // Same row
          d += "M" + [pReference.x, pReference.y]
            + "L" + [textLeft, handleY];
        } else {
          // Draw in Link line across the end of the first row, and all
          // intervening rows
          d += "M" + [pReference.x, pReference.y]
            + "L" + [pReference.row.rw, pReference.y];

          for (let i = pReference.row.idx + 1; i < handle.row.idx; i++) {
            const thisRow = this.main.rowManager.rows[i];
            const lineY = this.getLineY(thisRow);
            d += "M" + [0, lineY]
              + "L" + [thisRow.rw, lineY];
          }

          // Draw in the last row
          let finalY = this.getLineY(handle.row);
          d += "M" + [0, finalY]
            + "L" + [textLeft, finalY];
        }
      }

      if (pReference === null) {
        // This is the first right handle; draw in the line from the trigger
        // also.

        const triggerY = this.getLineY(triggerHandle.row);

        // Trigger handle to label
        if (triggerHandle.row.idx === handle.row.idx) {
          // Same row
          if (textLeft < pTrigger.x) {
            // Just draw a vertical line up to the label
            d += "M" + [pTrigger.x, pTrigger.y]
              + "L" + [pTrigger.x, triggerY];
          } else {
            // Draw curve up to the main Link line, then, go up to the label
            let curveLeftX = pTrigger.x + this.config.linkCurveWidth;
            curveLeftX = Math.min(curveLeftX, textLeft);
            d += "M" + [pTrigger.x, pTrigger.y]
              + "C" + [pTrigger.x, triggerY, pTrigger.x, triggerY, curveLeftX, triggerY]
              + "L" + [textLeft, triggerY];
          }
        } else {
          // Draw in Link line across the end of the trigger row, and all
          // intervening rows
          let curveLeftX = pTrigger.x + this.config.linkCurveWidth;
          curveLeftX = Math.min(curveLeftX, triggerHandle.row.rw);
          d += "M" + [pTrigger.x, pTrigger.y]
            + "C" + [pTrigger.x, triggerY, pTrigger.x, triggerY, curveLeftX, triggerY]
            + "L" + [handle.row.rw, triggerY];

          for (let i = triggerHandle.row.idx + 1; i < handle.row.idx; i++) {
            const thisRow = this.main.rowManager.rows[i];
            const lineY = this.getLineY(thisRow);
            d += "M" + [0, lineY]
              + "L" + [thisRow.rw, lineY];
          }

          // Draw in the last row
          let finalY = this.getLineY(handle.row);
          d += "M" + [0, finalY]
            + "L" + [textLeft, finalY];
        }
      }

      // pReference for the next handle will be the lower-right corner of
      // the label
      pReference = {
        x: textLeft + textLength,
        y: handleY,
        row: handle.row
      };

      // Arrowhead
      d += this._arrowhead(pHandle);

      // Move label
      label.move(textCentre, textY);
    }

    // Add flat arrowhead to trigger handle if there are both leftward and
    // rightward handles
    if (lHandles.length > 0 && rHandles.length > 0) {
      d += "M" + [pTrigger.x, pTrigger.y]
        + "m" + [this.config.linkArrowWidth, 0]
        + "l" + [-2 * this.config.linkArrowWidth, 0];
    }

    // Perform draw
    if (this.lastPathString !== d) {
      this.path.plot(d);
      this.lastPathString = d;
    }
  }

  /**
   * Draws this Link as a Relation annotation (no trigger/directionality
   * implied)
   * @private
   */
  _drawAsRelation() {
    let d = "";
    const leftHandle = this.leftHandle;
    const rightHandle = this.rightHandle;

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
    this.linkLabel.show();
    const textLength = this.linkLabel.length();
    const textY = this.getLineY(leftHandle.row);

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
    d += "M" + [pStart.x, pStart.y];

    // Left handle
    const firstY = this.getLineY(leftHandle.row);
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
    // Left handle label
    const leftLabel = this.argLabels[this.handles.indexOf(leftHandle)];
    leftLabel.move(pStart.x, (pStart.y + firstY) / 2);

    // Right handle/label
    const rightLabel = this.argLabels[this.handles.indexOf(rightHandle)];
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

      rightLabel.move(pEnd.x, (pEnd.y + firstY) / 2);
    } else {
      // Draw in Link line across the end of the first row, and all
      // intervening rows
      d += "M" + [textLeft + textLength, firstY]
        + "L" + [leftHandle.row.rw, firstY];

      for (let i = leftHandle.row.idx + 1; i < rightHandle.row.idx; i++) {
        const thisRow = this.main.rowManager.rows[i];
        const lineY = this.getLineY(thisRow);
        d += "M" + [0, lineY]
          + "L" + [thisRow.rw, lineY];
      }

      // Draw in the last row
      let curveRightX = pEnd.x - this.config.linkCurveWidth;
      curveRightX = Math.max(curveRightX, 0);
      let finalY = this.getLineY(rightHandle.row);
      d += "M" + [0, finalY]
        + "L" + [curveRightX, finalY]
        + "C" + [pEnd.x, finalY, pEnd.x, finalY, pEnd.x, pEnd.y];

      rightLabel.move(pEnd.x, (pEnd.y + finalY) / 2);
    }

    // Arrowheads
    d += this._arrowhead(pStart)
      + this._arrowhead(pEnd);

    // Main label
    this.linkLabel.move(textCentre, textY);

    // Perform draw
    if (this.lastPathString !== d) {
      this.path.plot(d);
      this.lastPathString = d;
    }
  }

  /**
   * Returns an SVG path string for an arrowhead pointing towards the given
   * point. The arrow points down for top Links, and up for bottom Links.
   * @param point
   * @return {string}
   * @private
   */
  _arrowhead(point) {
    const s = this.config.linkArrowWidth, s2 = 5;
    return this.top
      ? "M" + [point.x - s, point.y - s2] + "l" + [s, s2] + "l" + [s, -s2]
      : "M" + [point.x - s, point.y + s2] + "l" + [s, -s2] + "l" + [s, s2];
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Debug functions
  /**
   * Draws the outline of this component's bounding box
   */
  drawBbox() {
    const bbox = this.svg.bbox();
    this.svg.polyline([
      [bbox.x, bbox.y], [bbox.x2, bbox.y], [bbox.x2, bbox.y2], [bbox.x, bbox.y2],
      [bbox.x, bbox.y]])
      .fill("none")
      .stroke({width: 1});
  }

  /**
   * Draws the outline of the text element's bounding box
   */
  drawTextBbox() {
    const bbox = this.svgTexts[0].bbox();
    this.svg.polyline([
      [bbox.x, bbox.y], [bbox.x2, bbox.y], [bbox.x2, bbox.y2], [bbox.x, bbox.y2],
      [bbox.x, bbox.y]])
      .fill("none")
      .stroke({width: 1});
  }
}

/**
 * Helper class for Link handles (the start/end-points for the Link's line;
 * for each Link, there is one handle for each associated Word/nested Link)
 * @param {Word|Link} anchor - The Word or Link anchor for this Handle
 * @param {Link} parent - The parent Link that this Handle belongs to
 */
class Handle {
  constructor(anchor, parent) {
    this.anchor = anchor;
    this.parent = parent;

    this.x = 0;
    this.y = 0;

    // Offsets
    // -------
    // For anchor Links, offsets start at 0 on the left bound of the Link
    // For anchor Words/WordTags, offsets start at 0 in the centre of the
    // Word/WordTag
    this.offset = 0;

    // If the handle's anchor has multiple Links associated with it,
    // stagger them horizontally by setting this handle's offset
    // based on its index in the anchor's list of links.
    // We want to sort the Links by slot descending (the ones with higher slots
    // should be on the left)
    let l = anchor.links
      .filter(link => link.top === parent.top)
      .sort((a, b) => Math.abs(b.slot) - Math.abs(a.slot));

    // Magic number for width to distribute handles across on the same anchor
    // TODO: Base on anchor width?
    let w = 10;

    // Distribute the handles based on their sort position
    if (l.length > 1) {
      if (anchor instanceof Link) {
        this.offset = l.indexOf(parent) * w / (l.length - 1);
      } else {
        // Word/WordCluster offsets are a bit more complex -- We have to
        // sort again based on whether the Link extends to the
        // left or right of this anchor, then adjust the offset horizontally to
        // account for the fact that offset 0 is the centre of the anchor
        const leftLinks = [];
        const rightLinks = [];
        for (const link of l) {
          if (anchor.idx > link.endpoints[0].idx) {
            leftLinks.push(link);
          } else {
            rightLinks.push(link);
          }
        }

        // To minimise crossings, we sort the left Links ascending this time,
        // so that the ones with smaller slots are on the left.
        leftLinks.sort((a, b) => Math.abs(a.slot) - Math.abs(b.slot));
        l = leftLinks.concat(rightLinks);
        this.offset = (l.indexOf(parent) * w / (l.length - 1)) - w / 2;
      }
    }

    // Row
    // ---
    // There are two possibilities; the argument might be a Word, or it
    // might be a Link.  For Words, the Handle is on the same Row.  For
    // Links, the Handle is in the same Row as the Link's left endpoint.
    if (anchor instanceof Link) {
      this.row = anchor.endpoints[0].row;
    } else {
      this.row = anchor.row;
    }
  }

  /**
   * Returns true if this handle precedes the given handle
   * (i.e., this handle has an earlier Row, or is to its left within the
   * same row)
   * @param {Handle} handle
   */
  precedes(handle) {
    if (!this.row || !handle.row) {
      return false;
    }

    return this.row.idx < handle.row.idx ||
      (this.row.idx === handle.row.idx && this.x < handle.x);
  }
}

/**
 * Helper class for various types of labels to be drawn on/around the Link.
 * Consists of two main SVG elements:
 * - An SVG Text element with the label text, drawn in some given colour
 * - Another SVG Text element with the same text, but with a larger stroke
 *   width and drawn in white, to serve as the background for the main element
 *
 * @param mainSvg - The main SVG document (for firing events, etc.)
 * @param {svgjs.Doc} svg - The SVG document/group to draw the Text elements in
 * @param {String} text - The text of the Label
 * @param {String} addClass - Any additional CSS classes to add to the SVG
 *     elements
 */
class Label {
  constructor(mainSvg, svg, text, addClass) {
    this.mainSvg = mainSvg;
    this.svg = svg.group();

    // Main label
    /** @type svgjs.Text */
    this.svgText = this.svg.text(text)
      .leading(1)
      .addClass("tag-element")
      .addClass("link-text")
      .addClass(addClass);
    // Transform the text based on its font-size so that we can position it
    // relative to its baseline
    this.fontSize = parseInt($(this.svgText.node).css("font-size"));
    this.svgText.transform({
      y: -this.fontSize + 1
    });

    this.svgTextBbox = this.svgText.bbox();

    // Background rectangle
    this.svgBackground = this.svg.rect(
      this.svgTextBbox.width,
      this.svgTextBbox.height
    )
      .addClass("tag-element")
      .addClass("link-text-bg")
      .addClass(addClass)
      .back();
    // Transform the rectangle to sit nicely behind the label
    this.svgBackground.transform({
      x: -this.svgTextBbox.width / 2,
      y: -this.fontSize + 1
    });


    // Click events
    this.svgText.node.oncontextmenu = (e) => {
      this.selectedLabel = text;
      e.preventDefault();
      this.mainSvg.fire("link-label-right-click", {
        object: this.svgText,
        type: "text",
        event: e
      });
    };
    this.svgText.click((e) => this.mainSvg.fire("link-label-edit", {
      object: this.svgText,
      text,
      event: e
    }));
    this.svgText.dblclick((e) => this.mainSvg.fire("build-tree", {
      object: this.svgText,
      event: e
    }));

    // Start hidden
    this.hide();
  }

  /**
   * Shows the Label text elements
   */
  show() {
    this.svgBackground.show();
    this.svgText.show();
  }

  /**
   * Hides the Label text elements
   */
  hide() {
    this.svgBackground.hide();
    this.svgText.hide();
  }

  /**
   * Moves the Label text elements to the given coordinates
   * (N.B.: SVG Text elements are positioned horizontally by their centres,
   * by default)
   * @param x
   * @param y
   */
  move(x, y) {
    this.svgBackground.move(x, y);
    this.svgText.move(x, y);
  }

  /**
   * Returns the length (i.e., width) of the main label
   * https://svgjs.com/docs/2.7/elements/#text-length
   */
  length() {
    return this.svgText.length();
  }
}

module.exports = Link;