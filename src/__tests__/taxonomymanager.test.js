/**
* Test taxonomy manager
*/

//import * as fs from "fs";

// JS-YAML library
//import * as yaml from "js-yaml";

import TaxonomyManager from "../js/managers/taxonomy.js";
import Config from "../js/config.js";

describe("The TaxonomyManager", () => {
 it("should load an Odin taxonomy (yaml string)", () => {

   // Pull the sample taxonomy file
   //const yamlData = fs.readFileSync("./src/__tests__/data/taxonomy.yml", "utf8");

   const yamlData = `
- Alias
- ModificationTrigger
- Site
- Context:
   - Species
   - CellLine
   - Organ
   - CellType
   - Cellular_component
   - TissueType
   - ContextDirection
   - ContextLocation
   - ContextPossessive
`
   const conf = new Config();

   // Initialize TaxonomyManager and load data
   const taxman = new TaxonomyManager(conf);

   taxman.loadTaxonomyYaml(yamlData);

   const tree = taxman.getTaxonomyTree();

   expect(tree[0]).toBe("Alias");
 });
});
