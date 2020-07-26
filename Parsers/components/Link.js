/**
 * Annotated events and other relationships between Tokens.
 */

class Link {
  /**
   * Instantiates a Link.
   * Links can have Words or other Links as argument anchors.
   *
   * @param {String} eventId - Unique ID
   * @param {Word} trigger - Text-bound entity that indicates the presence of
   *     this event
   * @param {Object[]} args - The arguments to this Link. An Array of
   *     Objects specifying `anchor` and `type`
   * @param {String} relType - For (binary) relational Links, a String
   *     identifying the relationship type
   * @param {String} category - Links can be shown/hidden by category
   */
  constructor(eventId, trigger, args, relType, category = "default") {
    this.type = "Link";

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

    this.category = category;

    // Fill in references in this Link's trigger/argument Tokens
    if (this.trigger) {
      this.trigger.links.push(this);
    }
    this.arguments.forEach((arg) => {
      arg.anchor.links.push(this);
    });
  }
}

export default Link;
