/**
 * Annotations labels for single Tokens.
 *
 * Labels are added to a Token via the `.registerLabel()` method. Parsers
 * should not instantiate Labels directly.
 */

class Label {
  /**
   * Creates a new Label.
   * @param {String} val - The raw text for the Label
   * @param {Token} token - The parent Token for the Label
   */
  constructor(val, token) {
    this.type = "Label";

    this.val = val;
    this.token = token;
  }
}

export default Label;
