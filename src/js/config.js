/**
 * *Configuration options for the library*
 *
 * Each TAG instance will instantiate its own instance of the Config object, so
 * that various options can be changed on the fly.
 *
 * These options can be changed at init-time by the user via the `options`
 * parameter, or on the fly via other API methods.
 */

/**
 * Available configuration options:
 * @typedef {Object} Config~Config
 *
 * @property {String|"none"} topLinkCategory="default"
 *   The category of {@link Link} to show above the text.
 * @property {String|"none"} bottomLinkCategory="none"
 *   The category of {@link Link} to show below the text.
 *
 * @property {String|"none"} topTagCategory="default"
 *   The category of {@link WordTag} to show above the text.
 * @property {String|"none"} bottomTagCategory="POS"
 *   The category of {@link WordTag} to show below the text.
 *
 * @property {Boolean} compactRows=false
 *   Whether or not to lock every {@link Row} to its minimum height.
 *
 * @property {Boolean} showTopLinksOnMove=true
 *   Continue to display top {@link Link}s when the user drags {@link
  *   Word Words} around.
 * @property {Boolean} showBottomLinksOnMove=true
 *   Continue to display bottom {@link Link}s when the user drags {@link
  *   Word Words} around.
 *
 * @property {Boolean} showTopMainLabel=true
 *   Display the main type label for top {@link Link Links}.
 * @property {Boolean} showTopArgLabels=false
 *   Display the type labels for each argument for top {@link Link Links}.
 * @property {Boolean} showBottomMainLabel=true
 *   Display the main type label for bottom {@link Link Links}.
 * @property {Boolean} showBottomArgLabels=false
 *   Display the type labels for each argument for bottom {@link Link Links}.
 *
 * @property {Number} rowEdgePadding=10
 *   Padding on the left/right edges of each {@link Row}.
 * @property {Number} rowVerticalPadding=20
 *   Padding on the top/bottom of each {@link Row}.
 * @property {Number} rowExtraTopPadding=10
 *   Extra padding on {@link Row} top for {@link Link} labels.<br>
 *   (Labels for top Links are drawn above their line, and it is not trivial
 *   to get a good value for how high they are, so swe use a pre-configured
 *   value here.)
 *
 * @property {Number} wordPadding=10
 *   Padding on the left of {@link Word Words}.
 * @property {Number} wordPunctPadding=2
 *   Padding on the left of {@link Word Words} that contain a single
 *   punctuation character.
 * @property {Number} wordTopTagPadding=10
 *   Padding between {@link Word Words} and the {@link WordTag WordTags}
 *   drawn above them.
 * @property {Number} wordBottomTagPadding=0
 *   Padding between {@link Word Words} and the {@link WordTag WordTags}
 *   drawn below them.
 * @property {Number} wordTagLineLength=9
 *   For {@link WordTag WordTags} drawn above {@link Word Words}, the height
 *   of the connecting line/brace between the {@link Word} and the
 *   {@link WordTag}.
 * @property {Number} wordBraceThreshold=100
 *   {@link Word Words} that are wider than this will have curly braces
 *   drawn between them and their {@link WordTag WordTags} (rather than a
 *   single vertical line).
 *
 * @property {Number} linkSlotInterval=40
 *   Vertical distance between each overlapping {@link Link} slot.
 * @property {Number} linkHandlePadding=2
 *   Vertical padding between {@link Link} handles and their anchors.
 * @property {Number} linkCurveWidth=5
 *   Corner curve width for {@link Link} lines.
 * @property {Number} linkArrowWidth=5
 *   Width of arrowheads for {@link Link} handles.
 *
 * @property {String[]} tagDefaultColours=...
 *   The first *n* default colours to use for {@link WordTag WordTags} (as a
 *   queue).  After this array is exhausted, {@link WordTag WordTags} will
 *   be assigned random colours by default.<br>
 *   See the source for the pre-configured default values.
 */

class Config {
  /**
   * Instantiates a new configuration object.
   * @returns {Config~Config}
   */
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

export default Config;