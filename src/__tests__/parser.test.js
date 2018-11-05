/**
 * Test parser manager
 */

import Parser from "../js/parse/parse.js";

describe("The annotation parser", () => {
  it("returns a cloned copy of the parsed data with circular references" +
    " intact", () => {
    // Pull the sample annotation file
    const jsonData = require("./data/reach.json");

    // Parse and get cloned copy
    const parser = new Parser();
    const parsed = parser.loadData(jsonData, "json");

    // Check circular references
    // (Using the first word/link pair as a proxy for the others)
    expect(parsed.words[0]).toBe(parsed.words[0].links[0].endpoints[0]);

    // Compare with private copy
    expect(parsed.words[0]).not.toBe(parser._parsedData.words[0]);
  });
});