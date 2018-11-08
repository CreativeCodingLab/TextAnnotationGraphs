import _ from "lodash";

import ReachParser from "./reach.js";
import BratParser from "./ann.js";
import load from "../xhr.js";

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
    this.reach = new ReachParser();
    this.ann = new BratParser();
  }

  /**
   * Loads annotation data directly into the parser
   * @param {Object} data - The raw data expected by the parser for the
   *     given format
   * @param {String} format
   */
  loadData(data, format) {
    if (format === "json") {
      this.parseJson(data);
    } else if (format === "brat") {
      this.parseText(data);
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
      if (format === "json") {
        this.parseJson(JSON.parse(file.content));
      } else if (format === "brat") {
        this.parseText(file.content);
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
          this.parseText(text.content, standoff.content);
        } else {
          let text = matchingFiles.find(file => file.name.endsWith(".txt"));
          let entities = matchingFiles.find(file => file.name.endsWith(".a1"));
          let evts = matchingFiles.find(file => file.name.endsWith(".a2"));
          if (text && evts && entities) {
            this.parseText(text.content, entities.content, evts.content);
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

  loadFile(path, format) {
    // get format from extension
    if (!format) {
      const extension = path.toLowerCase().match(re)[1];

      if (extension === "json") {
        format = "json";
      }
      else {
        format = "brat";
      }
    }

    // load and parse file
    return load(path).then(data => {
      if (format === "json") {
        this.parseJson(JSON.parse(data));
      }
      else if (format === "brat") {
        this.parseText(data);
      }

      return this.getParsedData();
    });
  }

  parseFiles(files) {
    // console.log(files);
    if (files.length === 1) {
      const file = files[0];
      if (file.type === "application/json") {
        this.parseJson(JSON.parse(file.content));
      }
      else if (file.type === "") {
        this.parseText(file.content);
      }
      return file.name;
    }
    else if (files.length > 1) {
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
      if (matchingFiles.length === 2) {
        // find text content
        let text = matchingFiles.find(file => file.name.endsWith(".txt"));
        let standoff = matchingFiles.find(file => !file.name.endsWith(".txt"));
        this.parseText(text.content, standoff.content);
        return [text.name, standoff.name].join("\n");
      } else {
        let text = matchingFiles.find(file => file.name.endsWith(".txt"));
        let entities = matchingFiles.find(file => file.name.endsWith(".a1"));
        let evts = matchingFiles.find(file => file.name.endsWith(".a2"));
        if (text && evts && entities) {
          this.parseText(text.content, entities.content, evts.content);
        }
        return [text.name, entities.name, evts.name].join("\n");
      }
    }
  }

  /**
   * Returns a cloned copy of the most recently parsed data, with circular
   * references (e.g., between Words and Links) intact
   */
  getParsedData() {
    return _.cloneDeep(this._parsedData);
  }

  parseJson(data) {
    this.reach.parse(data);
    this._parsedData = this.reach.data;
  }

  parseText() {
    this.ann.parse.apply(this.ann, arguments);
    this._parsedData = this.ann.data;
  }
}

module.exports = Parser;
