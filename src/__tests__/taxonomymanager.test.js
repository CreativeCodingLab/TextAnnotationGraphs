/**
 * Test taxonomy manager
 */

import * as fs from "fs";

import TaxonomyManager from "../js/managers/taxonomy.js";
import Config from "../js/config.js";

describe("The TaxonomyManager", () => {
  it("should load an Odin taxonomy (yaml string)", () => {
    const yamlData = fs.readFileSync(
      "./src/__tests__/data/taxonomy.yml",
      "utf8"
    );

    const conf = new Config();

    // Initialize TaxonomyManager and load data
    const taxman = new TaxonomyManager(conf);

    taxman.loadTaxonomyYaml(yamlData);

    const tree = taxman.getTaxonomyTree();

    expect(JSON.stringify(tree)).toMatchSnapshot();
  });
});
