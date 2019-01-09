import _ from "lodash";

import BratParser from "./brat.js";
import OdinParser from "./odin.js";

const re = /.*(?=\.(\S+))|.*/;

class Parser {
  constructor() {
    /* output */
    this._parsedData = {
      words: [],
      links: [],
      clusters: []
    };

    /* supported formats */
    this.ann = new BratParser();
    this.odin = new OdinParser();
  }

  /**
   * Loads annotation data directly into the parser
   * @param {Object} data - The raw data expected by the parser for the
   *     given format
   * @param {String} format
   */
  loadData(data, format) {
    if (format === "brat") {
      this.parseBrat(data);
    } else if (format === "odin") {
      this.parseOdin(data);
    } else {
      throw `Unknown annotation format: ${format}`;
    }
    return this.getParsedData();
  }

  /**
   * Loads annotation data from file objects (as read by Main.loadFilesAsync())
   * @param {Array} files - An array of objects with the following structure:
   *     {
   *       name: <file name>
   *       type: <file type>
   *       content: <file contents as a string>
   *     }
   * @param {String} format
   */
  loadFiles(files, format) {
    if (files.length === 1) {
      // Single file
      const file = files[0];
      if (format === "brat") {
        this.parseBrat(file.content);
      } else if (format === "odin") {
        // The Odin parser expects an Object directly, not a String
        this.parseOdin(JSON.parse(file.content));
      } else {
        throw `Unknown annotation format: ${format}`;
      }
    } else {
      // Multi-file format
      // find 2 or 3 files that match in name
      files.sort((a, b) => a.name.localeCompare(b.name));

      let matchingFiles = [];

      let i = 0;
      let iname = files[i].name.match(re);
      for (let j = 1; j < files.length; ++j) {
        let jname = files[j].name.match(re);
        if (jname[1] && jname[0] === iname[0]) {
          matchingFiles.push(files[i], files[j]);

          let k = j + 1;
          while (k < files.length) {
            let kname = files[k].name.match(re);
            if (kname[1] && kname[0] === iname[0]) {
              matchingFiles.push(files[k]);
            } else {
              break;
            }
            ++k;
          }
          break;
        }
      }

      // found matching files
      if (format === "brat") {
        if (matchingFiles.length === 2) {
          // find text content
          let text = matchingFiles.find(file => file.name.endsWith(".txt"));
          let standoff = matchingFiles.find(file => !file.name.endsWith(".txt"));
          this.parseBrat(text.content, standoff.content);
        } else {
          let text = matchingFiles.find(file => file.name.endsWith(".txt"));
          let entities = matchingFiles.find(file => file.name.endsWith(".a1"));
          let evts = matchingFiles.find(file => file.name.endsWith(".a2"));
          if (text && evts && entities) {
            this.parseBrat(text.content, entities.content, evts.content);
          } else {
            throw "Wrong number/type of files for Brat format";
          }
        }
      } else {
        throw "Unknown format, or wrong number/type of files for format";
      }
    }

    return this.getParsedData();
  }

  /**
   * Returns a cloned copy of the most recently parsed data, with circular
   * references (e.g., between Words and Links) intact
   */
  getParsedData() {
    return _.cloneDeep(this._parsedData);
  }

  /**
   * Parses the given Brat-format data
   * http://brat.nlplab.org/standoff.html
   */
  parseBrat() {
    this.ann.parse.apply(this.ann, arguments);
    this._parsedData = this.ann.data;
  }

  /**
   * Parses the given Odin-format data
   * https://gist.github.com/myedibleenso/87a3191c73938840b8ed768ec305db38
   */
  parseOdin(data) {
    this.odin.parse(data);
    this._parsedData = this.odin.data;
  }
}

export default Parser;
