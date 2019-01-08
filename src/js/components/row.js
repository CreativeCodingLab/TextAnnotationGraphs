class Row {
  /**
   * Creates a new Row for holding Words.
   *
   * @param svg - This Row's SVG group
   * @param {Config~Config} config - The Config object for the parent TAG
   *   instance
   * @param {Number} idx - The Row's index
   * @param {Number} ry - The y-position of the Row's top edge
   * @param {Number} rh - The Row's height
   */
  constructor(svg, config, idx = 0, ry = 0, rh = 100) {
    this.config = config;

    this.idx = idx;
    this.ry = ry;     // row position from top
    this.rh = rh;     // row height
    this.rw = 0;
    this.words = [];

    // svg elements
    this.svg = null;    // group
    this.draggable = null;  // row resizer
    this.wordGroup = null;  // child group element

    // The last Word we removed, if any.
    // In case we have a Row with no Words left but which still has Links
    // passing through.
    this.lastRemovedWord = null;

    if (svg) {
      this.svgInit(svg);
    }
  }

  /**
   * Initialises the SVG elements related to this Row, and performs an
   * initial draw of the baseline/resize line
   * @param mainSvg - The main SVG document
   */
  svgInit(mainSvg) {
    // All positions will be relative to the baseline for this Row
    this.svg = mainSvg.group()
      .transform({y: this.baseline})
      .addClass("tag-element")
      .addClass("row");

    // Group element to contain word elements
    this.wordGroup = this.svg.group();

    // Row width
    this.rw = mainSvg.width();

    // Add draggable resize line
    this.draggable = this.svg.line(0, 0, this.rw, 0)
      .addClass("tag-element")
      .addClass("row-drag")
      .draggable();

    let y = 0;
    this.draggable
      .on("dragstart", function (e) {
        y = e.detail.p.y;
      })
      .on("dragmove", (e) => {
        e.preventDefault();
        let dy = e.detail.p.y - y;
        y = e.detail.p.y;
        mainSvg.fire("row-resize", {object: this, y: dy});
      });
  }

  /**
   * Removes all elements related to this Row from the main SVG document
   * @return {*}
   */
  remove() {
    return this.svg.remove();
  }

  /**
   * Changes the y-position of this Row's upper bound by the given amount
   * @param y
   */
  dy(y) {
    this.ry += y;
    this.svg.transform({y: this.baseline});
  }

  /**
   * Moves this Row's upper bound vertically to the given y-position
   * @param y
   */
  move(y) {
    this.ry = y;
    this.svg.transform({y: this.baseline});
  }

  /**
   * Sets the height of this Row
   * @param rh
   */
  height(rh) {
    this.rh = rh;
    this.svg.transform({y: this.baseline});
  }

  /**
   * Sets the width of this Row
   * @param rw
   */
  width(rw) {
    this.rw = rw;
    this.draggable.attr("x2", this.rw);
  }

  /**
   * Adds the given Word to this Row at the given index, adjusting the
   * x-positions of any Words with higher indices.
   * Optionally, attempts to force an x-position for the Word.
   * If adding the Word to the Row causes any existing Words to overflow its
   * bounds, will return the index of the first Word that no longer fits.
   * @param word
   * @param index
   * @param forceX
   * @return {number} - The index of the first Word that no longer fits, if
   *     the additional Word causes overflow
   */
  addWord(word, index, forceX) {
    if (isNaN(index)) {
      index = this.words.length;
    }

    word.row = this;
    this.words.splice(index, 0, word);
    this.wordGroup.add(word.svg);

    // Determine the new x-position this Word should have.
    word.x = -1;
    let newX;
    if (index === 0) {
      newX = this.config.rowEdgePadding;
    } else {
      const prevWord = this.words[index - 1];
      newX = prevWord.x + prevWord.minWidth;
      if (word.isPunct) {
        newX += this.config.wordPunctPadding;
      } else {
        newX += this.config.wordPadding;
      }
    }

    if (forceX) {
      newX = forceX;
    }

    return this.positionWord(word, newX);

  }

  /**
   * Assumes that the given Word is already on this Row.
   * Tries to move the Word to the given x-position, adjusting the
   * x-positions of all the following Words on the Row as well.
   * If this ends up pushing some Words off the Row, returns the index of
   * the first Word that no longer fits.
   * @param word
   * @param newX
   * @return {number} - The index of the first Word that no longer fits, if
   *     the additional Word causes overflow
   */
  positionWord(word, newX) {
    const wordIndex = this.words.indexOf(word);
    const prevWord = this.words[wordIndex - 1];
    const nextWord = this.words[wordIndex + 1];

    // By default, assume that no Words have overflowed the Row
    let overflowIndex = this.words.length;

    // Make sure we aren't stomping over a previous Word
    if (prevWord) {
      const wordPadding = word.isPunct
        ? this.config.wordPunctPadding
        : this.config.wordPadding;

      if (newX < prevWord.x + prevWord.minWidth + wordPadding) {
        throw `Trying to position new Word over existing one!
        (Row: ${this.idx}, wordIndex: ${wordIndex})`;
      }
    }

    // Change the position of the next Word if we have to;
    if (nextWord) {
      const nextWordPadding = nextWord.isPunct
        ? this.config.wordPunctPadding
        : this.config.wordPadding;

      if (nextWord.x - nextWordPadding < newX + word.minWidth) {
        overflowIndex = this.positionWord(
          nextWord,
          newX + word.minWidth + nextWordPadding
        );
      }
    }

    // We have moved the next Word on the Row, or marked it as part of the
    // overflow; at this point, we either have space to move this Word, or
    // this Word itself is about to overflow the Row.
    if (newX + word.minWidth > this.rw - this.config.rowEdgePadding) {
      // Alas.  The overflowIndex is ours.
      return wordIndex;
    } else {
      // We can move.  If any of the Words that follow us overflowed, return
      // their index.
      word.move(newX);
      return overflowIndex;
    }
  }

  /**
   * Removes the specified Word from this Row, returning it for potential
   * further operations.
   * @param word
   * @return {Word}
   */
  removeWord(word) {
    if (this.lastRemovedWord !== word) {
      this.lastRemovedWord = word;
    }
    this.words.splice(this.words.indexOf(word), 1);
    this.wordGroup.removeElement(word.svg);
    return word;
  }

  /**
   * Removes the last Word from this Row, returning it for potential
   * further operations.
   * @return {Word}
   */
  removeLastWord() {
    return this.removeWord(this.words[this.words.length - 1]);
  }

  /**
   * Redraws all the unique Links and WordClusters associated with all the
   * Words in the row
   */
  redrawLinksAndClusters() {
    const elements = [];
    for (const word of this.words) {
      for (const link of word.passingLinks) {
        if (elements.indexOf(link) < 0) {
          elements.push(link);
        }
      }
      for (const cluster of word.clusters) {
        if (elements.indexOf(cluster) < 0) {
          elements.push(cluster);
        }
      }
    }
    elements.forEach(element => element.draw());
  }

  /**
   * Gets the y-position of the Row's baseline (where the draggable resize
   * line is, and the baseline for all the Row's words)
   */
  get baseline() {
    return this.ry + this.rh;
  }

  /**
   * Returns the lower bound of the Row on the y-axis
   * @return {number}
   */
  get ry2() {
    return this.ry + this.rh + this.minDescent;
  }

  /**
   * Returns the maximum slot occupied by Links related to Words on this Row.
   * Considers positive slots, so only accounts for top Links.
   */
  get maxSlot() {
    let checkWords = this.words;
    if (checkWords.length === 0 && this.lastRemovedWord !== null) {
      // We let all our Words go; what was the last one that mattered?
      checkWords = [this.lastRemovedWord];
    }

    let maxSlot = 0;
    for (const word of checkWords) {
      for (const link of word.passingLinks) {
        maxSlot = Math.max(maxSlot, link.slot);
      }
    }
    return maxSlot;
  }

  /**
   * Returns the minimum slot occupied by Links related to Words on this Row.
   * Considers negative slots, so only accounts for bottom Links.
   */
  get minSlot() {
    let checkWords = this.words;
    if (checkWords.length === 0 && this.lastRemovedWord !== null) {
      // We let all our Words go; what was the last one that mattered?
      checkWords = [this.lastRemovedWord];
    }

    let minSlot = 0;
    for (const word of checkWords) {
      for (const link of word.passingLinks) {
        minSlot = Math.min(minSlot, link.slot);
      }
    }
    return minSlot;
  }

  /**
   * Returns the maximum height above the baseline of the Word
   * elements on the Row (accounting for their top WordTags and attached
   * WordClusters, if present)
   */
  get wordHeight() {
    let wordHeight = 0;
    for (const word of this.words) {
      wordHeight = Math.max(wordHeight, word.boxHeight);

      if (word.clusters.length > 0) {
        for (const cluster of word.clusters) {
          wordHeight = Math.max(wordHeight, cluster.fullHeight);
        }
      }
    }
    if (wordHeight === 0 && this.lastRemovedWord) {
      // If we have no Words left on this Row, base our calculations on the
      // last Word that was on this Row, for positioning any Links that are
      // still passing through
      wordHeight = this.lastRemovedWord.boxHeight;
      if (this.lastRemovedWord.clusters.length > 0) {
        for (const cluster of this.lastRemovedWord.clusters) {
          wordHeight = Math.max(wordHeight, cluster.fullHeight);
        }
      }
    }
    return wordHeight;
  }

  /**
   * Returns the maximum descent below the baseline of the Word
   * elements on the Row (accounting for their bottom WordTags, if present)
   */
  get wordDescent() {
    let wordDescent = 0;
    for (const word of this.words) {
      wordDescent = Math.max(wordDescent, word.descendHeight);
    }
    return wordDescent;
  }

  /**
   * Returns the minimum amount of height above the baseline needed to fit
   * all this Row's Words, top WordTags and currently-visible top Links.
   * Includes vertical Row padding.
   * @return {number}
   */
  get minHeight() {
    // Minimum height needed for Words + padding only
    let height = this.wordHeight + this.config.rowVerticalPadding;

    // Highest visible top Link
    let maxVisibleSlot = 0;

    let checkWords = this.words;
    if (checkWords.length === 0 && this.lastRemovedWord !== null) {
      // We let all our Words go; what was the last one that mattered?
      checkWords = [this.lastRemovedWord];
    }

    for (const word of checkWords) {
      for (const link of word.links.concat(word.passingLinks)) {
        if (link.top && link.visible) {
          maxVisibleSlot = Math.max(
            maxVisibleSlot,
            link.slot
          );
        }
      }
    }

    // Because top Link labels are above the Link lines, we need to add
    // their height if any of the Words on this Row is an endpoint for a Link
    if (maxVisibleSlot > 0) {
      return height +
        maxVisibleSlot * this.config.linkSlotInterval +
        this.config.rowExtraTopPadding;
    }

    // Still here?  No visible top Links on this row.
    return height;
  }

  /**
   * Returns the minimum amount of descent below the baseline needed to fit
   * all this Row's bottom WordTags and currently-visible bottom Links.
   * Includes vertical Row padding.
   * @return {number}
   */
  get minDescent() {
    // Minimum height needed for WordTags + padding only
    let descent = this.wordDescent + this.config.rowVerticalPadding;

    // Lowest visible bottom Link
    let minVisibleSlot = 0;

    let checkWords = this.words;
    if (checkWords.length === 0 && this.lastRemovedWord !== null) {
      // We let all our Words go; what was the last one that mattered?
      checkWords = [this.lastRemovedWord];
    }

    for (const word of checkWords) {
      for (const link of word.links.concat(word.passingLinks)) {
        if (!link.top && link.visible) {
          minVisibleSlot = Math.min(
            minVisibleSlot,
            link.slot
          );
        }
      }
    }

    // Unlike in the `minHeight()` function, bottom Link labels do not
    // extend below the Link lines, so we don't need to add extra padding
    // for them.
    if (minVisibleSlot < 0) {
      return descent + Math.abs(minVisibleSlot) * this.config.linkSlotInterval;
    }

    // Still here?  No visible bottom Links on this row.
    return descent;
  }

  /**
   * Returns the amount of space available at the end of this Row for adding
   * new Words
   */
  get availableSpace() {
    if (this.words.length === 0) {
      return this.rw - this.config.rowEdgePadding * 2;
    }

    const lastWord = this.words[this.words.length - 1];
    return this.rw - this.config.rowEdgePadding - lastWord.x - lastWord.minWidth;
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
}

export default Row;