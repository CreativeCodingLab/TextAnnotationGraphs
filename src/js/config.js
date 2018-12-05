/**
 * Configuration options for the library
 *
 * Each TAG instance will instantiate its own instance of the Config object, so
 * that various options can be changed on the fly
 */

class Config {
  constructor() {
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // Drawing options for Rows

    // Padding on the left/right edges of each Row
    this.rowEdgePadding = 10;

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // Drawing options for Words

    // Left-padding for Words
    this.wordPadding = 10;

    // Left-padding for punctuation Words
    this.wordPunctPadding = 2;

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // Drawing options for Links in the visualisation

    // Vertical padding between Link arrowheads and their anchors
    this.linkHandlePadding = 2;

    // Corner curve width for Links
    this.linkCurveWidth = 5;

    // Width of arrowheads for handles
    this.linkArrowWidth = 5;
  }
}

module.exports = Config;
