/**
 * Objects representing raw entity/token strings within the document being
 * parsed.  Represents only the document's annotations, in structured form;
 * does not include drawing data or other metadata that might be added for
 * the visualisation.
 *
 * Tokens may be associated with one or more Label annotations.
 * Labels that span multiple Tokens are instantiated as LongLabels instead.
 */

import Label from "./Label";

class Token {
  /**
   * Creates a new Token.
   * @param {String} text - The raw text for this Token
   * @param {Number} idx - The index of this Token within the
   *     currently-parsed document
   */
  constructor(text, idx) {
    this.type = "Token";

    this.text = text;
    this.idx = idx;

    // Optional properties that may be set later
    // -----------------------------------------
    // Arbitrary values that this Token is associated with -- For
    // convenience when parsing.
    this.associations = [];

    // Back-references that will be set when this Token is used in
    // other structures
    // ---------------------------------------------------------
    // Labels/LongLabels by category
    this.registeredLabels = {};

    // Links
    this.links = [];
  }

  /**
   * Any data (essentially arbitrary labels) that this Token is
   * associated with
   * @param data
   */
  addAssociation(data) {
    if (this.associations.indexOf(data) < 0) {
      this.associations.push(data);
    }
  }

  /**
   * Register this Token's Label for the given category of labels (e.g., POS
   * tags, lemmas, etc.)
   *
   * At run-time, one category of Labels can be shown above this Token and
   * another can be shown below it.
   * @param {String} category
   * @param {String} text
   */
  registerLabel(category = "default", text) {
    this.registeredLabels[category] = new Label(text, this);
  }

  /**
   * Returns all the categories for which a Label/LongLabel is currently
   * registered for this Token.
   */
  getLabelCategories() {
    return Object.keys(this.registeredLabels);
  }

  /**
   * Registers a LongLabel for this Token under the given category.
   * Called when a new LongLabel is created; Parsers should not call this
   * method directly.
   * @param category
   * @param longLabel
   */
  registerLongLabel(category, longLabel) {
    this.registeredLabels[category] = longLabel;
  }
}

export default Token;
