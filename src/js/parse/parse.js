import ReachParser from "./reach.js";
import BratParser from "./ann.js";
import load from "../xhr.js";

const re = /.*(?=\.(\S+))|.*/;

class Parser {
  constructor() {
    /* output */
    this.parsedData = {
      words: [],
      links: [],
      clusters: []
    };

    /* supported formats */
    this.reach = new ReachParser();
    this.ann = new BratParser();
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

      return this.parsedData;
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
   * Loads annotation data directly into the parser
   * @param data
   * @param format
   */
  loadData(data, format) {
    if (format === "json") {
      this.parseJson(data);
    } else if (format === "brat") {
      this.parseText(data);
    } else {
      throw `Unknown annotation format: ${format}`;
    }
    return this.parsedData;
  }

  parseJson(data) {
    this.reach.parse(data);
    this.parsedData = this.reach.data;
  }

  parseText() {
    this.ann.parse.apply(this.ann, arguments);
    this.parsedData = this.ann.data;
  }
}

module.exports = Parser;
