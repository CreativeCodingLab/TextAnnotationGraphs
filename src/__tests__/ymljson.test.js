/**
 * Test YAML parser
 */

import * as fs from "fs";

// Native implementation
import * as ymljson from "../js/old/ymljson";

// JS-YAML library
import * as yaml from "js-yaml";

describe("The `js-yaml` parser", () => {
  it("generates the same JS object as the previous implementation", () => {
    // Pull the sample taxonomy file
    const yamlData = fs.readFileSync("demo/taxonomy.yml", "utf8");

    // Native implementation
    let converted = ymljson.convertData(yamlData);
    expect(JSON.stringify(converted)).toMatchSnapshot();

    // JS-YAML library
    const converted2 = yaml.safeLoad(yamlData);
    expect(converted2).toEqual(converted);
  });
});