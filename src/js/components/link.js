import $ from "jquery";

import WordTag from "./word-tag.js";
import WordCluster from "./word-cluster.js";

import Util from "../util.js";

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
   * @param {String} relType - For (binary) relational Links, a String
   *     identifying the relationship type
   * @param {Boolean} top - Whether or not this Link should be drawn above
   *     the text row (if false, it will be drawn below)
   * @param {String} category - Links can be shown/hidden by category
   */
  constructor(
    eventId,
    trigger,
    args,
    relType,
    top = true,
    category = "default"
  ) {
    // ---------------
    // Core properties
    this.eventId = eventId;

    // Links can be either Event or Relation annotations, to borrow the BRAT
    // terminology.  Event annotations have a `trigger` entity from the text
    // that specifies the event, whereas Relation annotations have a `type`
    // that may not be bound to any particular part of the raw text.
    // Both types of Links have arguments, which may themselves be nested links.
    this.trigger = trigger;
    this.relType = relType;
    this.arguments = args;

    // Contains references to higher-level Links that have this Link as an
    // argument
    this.links = [];

    this.top = top;
    this.category = category;

    // Is this Link currently visible in the visualisation?
    this.visible = false;

    // Should this Link be drawn onto the visualisation?
    this.enabled = false;

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
    this.arguments.forEach((arg) => {
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
    this.svg = main.svg
      .group()
      .addClass("tag-element")
      .addClass(this.top ? "link" : "link syntax-link");

    // Links are hidden by default; the main function should call `.show()`
    // for any Links to be shown
    this.svg.hide();

    // The main Link line
    this.path = this.svg.path().addClass("tag-element");

    // Init handles and SVG texts.
    // If there is a trigger, it will be the first handle
    if (this.trigger) {
      this.handles.push(new Handle(this.trigger, this));
    }

    // Arguments
    this.arguments.forEach((arg) => {
      this.handles.push(new Handle(arg.anchor, this));

      const text = new Label(
        this.mainSvg,
        this.svg,
        arg.type,
        "link-arg-label"
      );
      this.argLabels.push(text);
    });

    // Main Link label
    this.linkLabel = new Label(
      this.mainSvg,
      this.svg,
      this.relType,
      "link-main-label"
    );

    // Closure for identifying dragged handles
    let draggedHandle = null;
    let dragStartX = 0;

    // Drag/Click events
    this.path
      .draggable()
      .on("dragstart", (e) => {
        // We use the x and y values (with a little tolerance) to make sure
        // that the user is dragging near one of the Link's handles, and not
        // just in the middle of the Link's line.
        const dragX = e.detail.p.x;

        // `dragY` is adjusted for the document's scroll position, but we
        // want to compare it against our internal container coordinates
        // (ZW: As of svg.draggable.js 2.2.2, `dragY` correctly reflects the
        // internal coordinates of the drag)
        // const dragY = e.detail.p.y - $(window).scrollTop();
        const dragY = e.detail.p.y;

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
          if (this.top && anchor.topTag instanceof WordTag) {
            halfWidth = anchor.topTag.textWidth / 2;
          } else if (!this.top && anchor.bottomTag instanceof WordTag) {
            halfWidth = anchor.bottomTag.textWidth / 2;
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

    this.path.dblclick((e) =>
      this.mainSvg.fire("build-tree", {
        object: this,
        event: e
      })
    );
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
    if (this.enabled) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Enables this Link and draws it onto the visualisation
   */
  show() {
    this.enabled = true;

    if (this.svg && !this.svg.visible()) {
      this.svg.show();
    }
    this.draw();
    this.visible = true;
  }

  /**
   * Disables this Link and removes it from the visualisation
   */
  hide() {
    this.enabled = false;

    if (this.svg && this.svg.visible()) {
      this.svg.hide();
    }
    this.visible = false;
  }

  /**
   * Shows the main label for this Link
   */
  showMainLabel() {
    this.linkLabel.show();
    // Redraw the Link to make sure that the label ends up in the correct spot
    this.draw();
  }

  /**
   * Hides the main label for this Link
   */
  hideMainLabel() {
    this.linkLabel.hide();
  }

  /**
   * Shows the argument labels for this Link
   */
  showArgLabels() {
    this.argLabels.forEach((label) => label.show());
    // Redraw the Link to make sure that the label ends up in the correct spot
    this.draw();
  }

  /**
   * Hides the argument labels for this Link
   */
  hideArgLabels() {
    this.argLabels.forEach((label) => label.hide());
  }

  /**
   * (Re-)draw some Link onto the main visualisation
   *
   * @param {Word|WordCluster|Link} [modAnchor] - Passed when we know that
   *     (only) a specific anchor has changed position since the last
   *     redraw. If not, the positions of all handles will be recalculated.
   */
  draw(modAnchor) {
    if (!this.initialised || !this.enabled) {
      return;
    }

    // Recalculate handle positions
    let calcHandles = this.handles;
    if (modAnchor) {
      // Only one needs to be calculated
      calcHandles = [this.handles.find((h) => h.anchor === modAnchor)];
    }
    const changedHandles = [];

    // One or more of our anchors might be nested Links.  We need to make
    // sure that all of them are already drawn in, so that our offset
    // calculations and the like are accurate.
    for (let handle of calcHandles) {
      const anchor = handle.anchor;
      if (anchor instanceof Link && !anchor.visible) {
        anchor.show();
      }
    }

    // Offset calculations
    for (let handle of calcHandles) {
      const anchor = handle.anchor;
      // Two possibilities: The anchor is a Word/WordCluster, or it is a
      // Link.
      if (!(anchor instanceof Link)) {
        // No need to account for multiple rows (the handle will be resting
        // on the label for a Word/WordCluster)
        // The 0-offset location is the centre of the anchor.
        const newX = anchor.cx + handle.offset;
        const newY = this.top ? anchor.absoluteY : anchor.absoluteDescent;

        if (handle.x !== newX || handle.y !== newY) {
          handle.x = newX;
          handle.y = newY;
          handle.row = anchor.row;
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
      if (
        changedHandles.length === 1 &&
        changedHandles[0] === this.leftHandle
      ) {
        for (let parentLink of this.links) {
          const parentHandle = parentLink.handles.find(
            (h) => h.anchor === this
          );
          parentHandle.offset += growth;
          parentHandle.offset = Math.max(parentHandle.offset, 0);
          parentLink.draw(this);
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
    this.arguments.forEach((arg) => detachLink(arg.anchor));
  }

  /**
   * Returns the y-position that this Link's main line will have if it were
   * drawn in the given row (based on the Row's position, and this Link's slot)
   *
   * @param {Row} row
   */
  getLineY(row) {
    return this.top
      ? row.ry +
          row.rh -
          row.wordHeight -
          this.config.linkSlotInterval * this.slot
      : // Bottom Links have negative slot numbers
        row.ry +
          row.rh +
          row.wordDescent -
          this.config.linkSlotInterval * this.slot;
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
   * Sorting of the full Links array is handled by
   * {@link module:Util.sortForSlotting Util.sortForSlotting}.
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
        if (
          link !== this &&
          link.top === this.top &&
          intervening.indexOf(link) < 0
        ) {
          intervening.push(link);
        }
      }

      // WordCluster Links
      for (const cluster of word.clusters) {
        for (const link of cluster.links) {
          if (
            link !== this &&
            link.top === this.top &&
            intervening.indexOf(link) < 0
          ) {
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
      .map((link) => link.calculateSlot(words))
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
    e.detail.text.addClass("tag-element").addClass("editing-text");
    this.editingText = e.detail.text;
    this.editingRect = this.svg
      .rect(bbox.width + 8, bbox.height + 4)
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
   * @return {Word[]}
   */
  get endpoints() {
    let minWord = null;
    let maxWord = null;

    if (this.trigger) {
      minWord = maxWord = this.trigger;
    }

    this.arguments.forEach((arg) => {
      if (arg.anchor instanceof Link) {
        let endpts = arg.anchor.endpoints;
        if (!minWord || minWord.idx > endpts[0].idx) {
          minWord = endpts[0];
        }
        if (!maxWord || maxWord.idx < endpts[1].idx) {
          maxWord = endpts[1];
        }
      } else {
        // word or wordcluster
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
    for (
      let i = this.leftHandle.row.idx + 1;
      i < this.rightHandle.row.idx;
      i++
    ) {
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

    return this.handles.find((handle) => handle.anchor === this.trigger);
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
    lHandles.sort((a, b) => (a.precedes(b) ? 1 : -1));
    rHandles.sort((a, b) => (a.precedes(b) ? -1 : 1));

    // Start drawing lines between the Handles/text.

    // To prevent drawing lines over the same coordinates repeatedly, we
    // simply tack on additional lines as we move to the arguments further
    // from the trigger.
    // pReference will be the point on the last drawn argument line from
    // which the line to the next argument should begin.
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

      // Line
      // ----
      // Draw from argument handle to main Link line
      d += "M" + [pHandle.x, pHandle.y];

      const handleY = this.getLineY(handle.row);
      const curveLeftX = pHandle.x + this.config.linkCurveWidth;
      const curveLeftY = this.top
        ? handleY + this.config.linkCurveWidth
        : handleY - this.config.linkCurveWidth;

      d +=
        "L" +
        [pHandle.x, curveLeftY] +
        "Q" +
        [pHandle.x, handleY, curveLeftX, handleY];

      // Horizontal line to pReference (if set)
      if (pReference) {
        if (handle.row.idx !== pReference.row.idx) {
          // Draw in Link line across the end of the first row and all
          // intervening rows
          d += "L" + [handle.row.rw, handleY];

          for (let i = handle.row.idx + 1; i < pReference.row.idx; i++) {
            const thisRow = this.main.rowManager.rows[i];
            const lineY = this.getLineY(thisRow);
            d += "M" + [0, lineY] + "L" + [thisRow.rw, lineY];
          }

          d += "M" + [0, this.getLineY(pReference.row)];
        }

        d += "L" + [pReference.x, pReference.y];
      }

      if (pReference === null) {
        // This is the first left handle; draw in the line to the trigger also.

        // Label to Trigger handle
        // If this handle and the trigger handle are not on the same row,
        // draw in the intervening rows first.
        let finalY = handleY;

        if (handle.row.idx !== triggerHandle.row.idx) {
          d += "L" + [handle.row.rw, handleY];

          for (let i = handle.row.idx + 1; i < triggerHandle.row.idx; i++) {
            const thisRow = this.main.rowManager.rows[i];
            const lineY = this.getLineY(thisRow);
            d += "M" + [0, lineY] + "L" + [thisRow.rw, lineY];
          }

          finalY = this.getLineY(triggerHandle.row);
          d += "M" + [0, finalY];
        }

        // Draw down to trigger on last row
        const curveRightX = pTrigger.x - this.config.linkCurveWidth;
        const curveRightY = this.top
          ? finalY + this.config.linkCurveWidth
          : finalY - this.config.linkCurveWidth;

        d +=
          "L" +
          [curveRightX, finalY] +
          "Q" +
          [pTrigger.x, finalY, pTrigger.x, curveRightY] +
          "L" +
          [pTrigger.x, pTrigger.y];
      }

      // pReference for the next handle will be just past the curved part of
      // the left-side vertical line
      const refLeft = Math.min(
        pHandle.x + this.config.linkCurveWidth,
        handle.row.rw
      );

      pReference = {
        x: refLeft,
        y: handleY,
        row: handle.row
      };

      // Arrowhead
      d += this._arrowhead(pHandle);

      // Label
      // -----
      // The trigger always takes up index 0, so the index for the label is
      // one less than the index for this handle in `this.handles`
      const label = this.argLabels[this.handles.indexOf(handle) - 1];

      let labelCentre = pHandle.x;
      if (labelCentre + label.length() / 2 > handle.row.rw) {
        labelCentre = handle.row.rw - label.length() / 2;
      }
      if (labelCentre - label.length() / 2 < 0) {
        labelCentre = label.length() / 2;
      }
      label.move(labelCentre, (pHandle.y + handleY) / 2);
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

      // pReference for the next handle will be just past the curved part of
      // the right-side vertical line.  We calculate it here since we use it
      // when drawing the line itself.
      const refRight = Math.max(pHandle.x - this.config.linkCurveWidth, 0);

      // Line
      // ----
      // Draw from main Link line to argument handle
      const handleY = this.getLineY(handle.row);

      d += "M" + [refRight, handleY];

      const curveRightX = pHandle.x - this.config.linkCurveWidth;
      const curveRightY = this.top
        ? handleY + this.config.linkCurveWidth
        : handleY - this.config.linkCurveWidth;

      d +=
        "L" +
        [curveRightX, handleY] +
        "Q" +
        [pHandle.x, handleY, pHandle.x, curveRightY] +
        "L" +
        [pHandle.x, pHandle.y];

      // Horizontal line from pReference (if set)
      if (pReference) {
        d += "M" + [pReference.x, pReference.y];

        if (pReference.row.idx !== handle.row.idx) {
          // Draw in Link line across end of the first row and all
          // intervening rows
          d += "L" + [pReference.row.rw, pReference.y];

          for (let i = pReference.row.idx + 1; i < handle.row.idx; i++) {
            const thisRow = this.main.rowManager.rows[i];
            const lineY = this.getLineY(thisRow);
            d += "M" + [0, lineY] + "L" + [thisRow.rw, lineY];
          }

          d += "M" + [0, handleY];
        }

        d += "L" + [refRight, handleY];
      }

      if (pReference === null) {
        // This is the first right handle; draw in the line from the trigger
        // also.
        d += "M" + [pTrigger.x, pTrigger.y];

        // Draw up from trigger handle to main line, then draw across
        // intervening rows if trigger handle and this handle are not on the
        // same row
        const triggerY = this.getLineY(triggerHandle.row);
        const curveLeftX = pTrigger.x + this.config.linkCurveWidth;
        const curveLeftY = this.top
          ? triggerY + this.config.linkCurveWidth
          : triggerY - this.config.linkCurveWidth;

        d +=
          "L" +
          [pTrigger.x, curveLeftY] +
          "Q" +
          [pTrigger.x, triggerY, curveLeftX, triggerY];

        if (triggerHandle.row.idx !== handle.row.idx) {
          d += "L" + [triggerHandle.row.rw, triggerY];

          for (let i = triggerHandle.row.idx + 1; i < handle.row.idx; i++) {
            const thisRow = this.main.rowManager.rows[i];
            const lineY = this.getLineY(thisRow);
            d += "M" + [0, lineY] + "L" + [thisRow.rw, lineY];
          }

          d += "M" + [0, handleY];
        }

        d += "L" + [refRight, handleY];
      }

      // pReference for the next handle is just inside the curved part of
      // the right-side vertical line
      pReference = {
        x: refRight,
        y: handleY,
        row: handle.row
      };

      // Arrowhead
      d += this._arrowhead(pHandle);

      // Label
      // -----
      // The trigger always takes up index 0, so the index for the label is
      // one less than the index for this handle in `this.handles`
      const label = this.argLabels[this.handles.indexOf(handle) - 1];

      let labelCentre = pHandle.x;
      if (labelCentre + label.length() / 2 > handle.row.rw) {
        labelCentre = handle.row.rw - label.length() / 2;
      }
      if (labelCentre - label.length() / 2 < 0) {
        labelCentre = label.length() / 2;
      }
      label.move(labelCentre, (pHandle.y + handleY) / 2);
    }

    // Add flat arrowhead to trigger handle if there are both leftward and
    // rightward handles
    if (lHandles.length > 0 && rHandles.length > 0) {
      d +=
        "M" +
        [pTrigger.x, pTrigger.y] +
        "m" +
        [this.config.linkArrowWidth, 0] +
        "l" +
        [-2 * this.config.linkArrowWidth, 0];
    }

    // Figure out where to put the main link label
    const linkLabelY = this.getLineY(triggerHandle.row);
    if (lHandles.length > 0 && rHandles.length > 0) {
      // Put it in the middle, right on top of the trigger Word
      this.linkLabel.move(triggerHandle.x, linkLabelY);
    } else if (lHandles.length === 0) {
      // Put it in between the trigger and the first right handle
      const rHandle = rHandles[0];

      const linkLabelX =
        rHandle.row.idx === triggerHandle.row.idx
          ? (triggerHandle.x + rHandle.x) / 2
          : (triggerHandle.x + triggerHandle.row.rw) / 2;

      this.linkLabel.move(linkLabelX, linkLabelY);
    } else if (rHandles.length === 0) {
      // Put it in between the trigger and the first left handle
      const lHandle = lHandles[0];

      const linkLabelX =
        lHandle.row.idx === triggerHandle.row.idx
          ? (triggerHandle.x + lHandle.x) / 2
          : triggerHandle.x / 2;

      this.linkLabel.move(linkLabelX, linkLabelY);
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
    const textLength = this.linkLabel.length();
    const textY = this.getLineY(leftHandle.row);

    // Centre on the segment of the Link line on the first row, making sure
    // it doesn't overshoot the right row boundary
    let textCentre = sameRow
      ? (pStart.x + pEnd.x) / 2
      : (pStart.x + leftHandle.row.rw) / 2;
    if (textCentre + textLength / 2 > leftHandle.row.rw) {
      textCentre = leftHandle.row.rw - textLength / 2;
    }

    // Start preparing path string
    d += "M" + [pStart.x, pStart.y];

    // Left handle/label
    // Draw up to the level of the Link line, then position the left arg label
    const firstY = this.getLineY(leftHandle.row);
    let curveLeftX = pStart.x + this.config.linkCurveWidth;
    curveLeftX = Math.min(curveLeftX, leftHandle.row.rw);
    const curveLeftY = this.top
      ? firstY + this.config.linkCurveWidth
      : firstY - this.config.linkCurveWidth;

    d +=
      "L" +
      [pStart.x, curveLeftY] +
      "Q" +
      [pStart.x, firstY, curveLeftX, firstY];

    const leftLabel = this.argLabels[this.handles.indexOf(leftHandle)];
    let leftLabelCentre = pStart.x;
    if (leftLabelCentre + leftLabel.length() / 2 > leftHandle.row.rw) {
      leftLabelCentre = leftHandle.row.rw - leftLabel.length() / 2;
    }
    if (leftLabelCentre - leftLabel.length() / 2 < 0) {
      leftLabelCentre = leftLabel.length() / 2;
    }
    leftLabel.move(leftLabelCentre, (pStart.y + firstY) / 2);

    // Right handle/label
    // Handling depends on whether or not the right handle is on the same
    // row as the left handle
    let finalY = firstY;
    if (!sameRow) {
      // Draw in Link line across the end of the first row, and all
      // intervening rows
      d += "L" + [leftHandle.row.rw, firstY];

      for (let i = leftHandle.row.idx + 1; i < rightHandle.row.idx; i++) {
        const thisRow = this.main.rowManager.rows[i];
        const lineY = this.getLineY(thisRow);
        d += "M" + [0, lineY] + "L" + [thisRow.rw, lineY];
      }

      finalY = this.getLineY(rightHandle.row);
      d += "M" + [0, finalY];
    }

    // Draw down from the main Link line on last row
    const curveRightX = pEnd.x - this.config.linkCurveWidth;
    const curveRightY = this.top
      ? finalY + this.config.linkCurveWidth
      : finalY - this.config.linkCurveWidth;

    d +=
      "L" +
      [curveRightX, finalY] +
      "Q" +
      [pEnd.x, finalY, pEnd.x, curveRightY] +
      "L" +
      [pEnd.x, pEnd.y];

    const rightLabel = this.argLabels[this.handles.indexOf(rightHandle)];
    let rightLabelCentre = pEnd.x;
    if (rightLabelCentre + rightLabel.length() / 2 > rightHandle.row.rw) {
      rightLabelCentre = rightHandle.row.rw - rightLabel.length() / 2;
    }
    if (rightLabelCentre - rightLabel.length() / 2 < 0) {
      rightLabelCentre = rightLabel.length() / 2;
    }
    rightLabel.move(rightLabelCentre, (pEnd.y + finalY) / 2);

    // Arrowheads
    d += this._arrowhead(pStart) + this._arrowhead(pEnd);

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
    const s = this.config.linkArrowWidth,
      s2 = 5;
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
    this.svg
      .polyline([
        [bbox.x, bbox.y],
        [bbox.x2, bbox.y],
        [bbox.x2, bbox.y2],
        [bbox.x, bbox.y2],
        [bbox.x, bbox.y]
      ])
      .fill("none")
      .stroke({ width: 1 });
  }

  /**
   * Draws the outline of the text element's bounding box
   */
  drawTextBbox() {
    const bbox = this.svgTexts[0].bbox();
    this.svg
      .polyline([
        [bbox.x, bbox.y],
        [bbox.x2, bbox.y],
        [bbox.x2, bbox.y2],
        [bbox.x, bbox.y2],
        [bbox.x, bbox.y]
      ])
      .fill("none")
      .stroke({ width: 1 });
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
      .filter((link) => link.top === parent.top)
      .sort((a, b) => Math.abs(b.slot) - Math.abs(a.slot));

    // Magic number for width to distribute handles across on the same anchor
    // TODO: Base on anchor width?
    let w = 15;

    // Distribute the handles based on their sort position
    if (l.length > 1) {
      if (anchor instanceof Link) {
        this.offset = (l.indexOf(parent) * w) / (l.length - 1);
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
        this.offset = (l.indexOf(parent) * w) / (l.length - 1) - w / 2;
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

    return (
      this.row.idx < handle.row.idx ||
      (this.row.idx === handle.row.idx && this.x < handle.x)
    );
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
    this.svgText = this.svg
      .plain(text)
      .addClass("tag-element")
      .addClass("link-text")
      .addClass(addClass);

    // Calculate the y-interval between the Text element's top edge and
    // baseline, so that we can transform the background / move the Label
    // around accordingly.
    // Svg.js has actually already done this for us -- the value of `.y()`
    // is the top edge, and `.attr("y")` is the baseline
    this.svgTextBbox = this.svgText.bbox();
    this.ascent = this.svgText.attr("y") - this.svgText.y();
    this.baselineYOffset = this.ascent - this.svgTextBbox.h / 2;

    // Background (rectangle)
    this.svgBackground = this.svg
      .rect(this.svgTextBbox.width + 2, this.svgTextBbox.height)
      .addClass("tag-element")
      .addClass("link-text-bg")
      .addClass(addClass)
      .radius(2.5)
      .back();
    // Transform the rectangle to sit nicely behind the label
    this.svgBackground.transform({
      x: -this.svgTextBbox.width / 2 - 1,
      y: -this.ascent
    });

    // // Background (text)
    // this.svgBackground = this.svg.text(text)
    //   .addClass("tag-element")
    //   .addClass("link-text-bg")
    //   .addClass(addClass)
    //   .back();

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
    this.svgText.click((e) =>
      this.mainSvg.fire("link-label-edit", {
        object: this.svgText,
        text,
        event: e
      })
    );
    this.svgText.dblclick((e) =>
      this.mainSvg.fire("build-tree", {
        object: this.svgText,
        event: e
      })
    );

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
   * Moves the centre of the baseline of the Label text elements to the given
   * coordinates
   * (N.B.: SVG Text elements are positioned horizontally by their centres,
   * by default.  Also, setting the y-attribute directly allows us to move
   * the Text element directly by its baseline, rather than its top edge)
   * @param x - New horizontal centre of the Label
   * @param y - New baseline of the Label
   */
  move(x, y) {
    this.svgBackground.move(x, y);
    this.svgText.attr({ x, y });
  }

  /**
   * Centres the Label elements horizontally and vertically on the given point
   * @param x - New horizontal centre of the Label
   * @param y - New vertical centre of the Label
   */
  centre(x, y) {
    return this.move(x, y + this.baselineYOffset);
  }

  /**
   * Returns the length (i.e., width) of the main label
   * https://svgjs.com/docs/2.7/elements/#text-length
   */
  length() {
    return this.svgText.length();
  }

  // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
  // Debug functions
  /**
   * Draws the outline of the text element's bounding box
   */
  drawTextBbox() {
    const bbox = this.svgText.bbox();
    this.svg
      .polyline([
        [bbox.x, bbox.y],
        [bbox.x2, bbox.y],
        [bbox.x2, bbox.y2],
        [bbox.x, bbox.y2],
        [bbox.x, bbox.y]
      ])
      .fill("none")
      .stroke({ width: 1 });
  }
}

export default Link;
