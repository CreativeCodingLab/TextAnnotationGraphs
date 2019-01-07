/**
 * Configuration options for the library
 *
 * Each TAG instance will instantiate its own instance of the Config object, so
 * that various options can be changed on the fly.
 *
 * These options can be changed at init-time by the user, or on the fly via
 * API methods.
 */

class Config {
  constructor() {
    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // User options

    // Category of top/bottom Links to show
    this.topLinkCategory = "default";
    this.bottomLinkCategory = "none";

    // Category of top/bottom tags to show
    this.topTagCategory = "default";
    this.bottomTagCategory = "POS";

    // Lock Rows to minimum height?
    this.compactRows = false;

    // Continue to display top/bottom Links when moving Words?
    this.showTopLinksOnMove = true;
    this.showBottomLinksOnMove = false;

    // Show main/argument labels on Links?
    this.showTopMainLabel = true;
    this.showTopArgLabels = false;
    this.showBottomMainLabel = true;
    this.showBottomArgLabels = false;

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // Drawing options for Rows

    // Padding on the left/right edges of each Row
    this.rowEdgePadding = 10;

    // Padding on the top/bottom of each Row
    this.rowVerticalPadding = 20;

    // Extra padding on Row top for Link labels
    // (Labels for top Links are drawn above their line, and it is not
    // trivial to get a good value for how high they are, so we use a
    // pre-configured value here)
    this.rowExtraTopPadding = 10;

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // Drawing options for Words

    // Left-padding for Words
    this.wordPadding = 10;

    // Left-padding for punctuation Words
    this.wordPunctPadding = 2;

    // Vertical padding between Words and WordTags drawn above them
    this.wordTopTagPadding = 10;

    // Vertical padding between Words and WordTags drawn below them
    this.wordBottomTagPadding = 0;

    // For WordTags drawn above Words, the height of the connecting
    // line/brace between the Word and the WordTag
    this.wordTagLineLength = 9;

    // Words that are wider than this width will have curly braces drawn
    // between them and their tags.  Words that are shorter will have single
    // vertical lines drawn between them and their tags.
    this.wordBraceThreshold = 100;

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // Drawing options for Links in the visualisation

    // Vertical distance between each Link slot (for crossing/overlapping Links)
    this.linkSlotInterval = 40;

    // Vertical padding between Link arrowheads and their anchors
    this.linkHandlePadding = 2;

    // Corner curve width for Links
    this.linkCurveWidth = 5;

    // Width of arrowheads for handles
    this.linkArrowWidth = 5;

    // =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
    // Drawing options for Tags

    // An array containing the first n default colours to use for tags (as a
    // queue). When this array is exhausted, we will switch to using
    // randomColor.
    this.tagDefaultColours = [
      "#3fa1d1",
      "#ed852a",
      "#2ca02c",
      "#c34a1d",
      "#a048b3",
      "#e377c2",
      "#bcbd22",
      "#17becf",
      "#e7298a",
      "#e6ab02",
      "#7570b3",
      "#a6761d",
      "#7f7f7f"
    ];
  }
}

module.exports = Config;
