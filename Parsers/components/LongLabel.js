/**
 * Annotations labels that span multiple Tokens.
 *
 * Parsers should not instantiate LongLabels directly.
 *
 * Because LongLabels span multiple words, they cannot simply be added via
 * Token methods; rather, use the static `LongLabel.registerLongLabel()` method
 * to register a LongLabel to a group of Tokens.
 */

class LongLabel {
  /**
   * Instantiates a LongLabel.
   * Parsers should be calling `LongLabel.registerLongLabel()` instead.
   * @param {String} val - The raw text for the Label
   * @param {Token[]} tokens - The parent Tokens for the LongLabel
   */
  constructor(val, tokens) {
    this.type = "LongLabel";

    this.val = val;
    this.tokens = tokens;
  }

  /**
   * Registers a new LongLabel for a group of Tokens.
   * @param {String} category - The category to register this LongLabel under
   * @param {String} val - The raw text for the Label
   * @param {Token[]} tokens - The parent Tokens for the LongLabel
   */
  static registerLongLabel(category, val, tokens) {
    const longLabel = new LongLabel(val, tokens);
    tokens.forEach((token) => {
      token.registerLongLabel(category, longLabel);
    });

    return longLabel;
  }
}

export default LongLabel;
