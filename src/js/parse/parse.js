import ReachParser from './reach.js';
import BratParser from './ann.js';
import load from '../xhr.js';

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

      if (extension === 'json') {
        format = 'json';
      }
      else {
        format = 'brat';
      }
    }

    // load and parse file
    return load(path).then(data => {
      if (format === 'json') {
        this.parseJson(JSON.parse(data));
      }
      else if (format === 'brat') {
        this.parseText(data);
      }

      return this.parsedData;
    })
  }

  parseFiles(files) {
    console.log(files);
    if (files.length === 1) {
      const file = files[0];
      if (file.type === 'application/json') {
        this.parseJson(JSON.parse(file.content));
      }
      else if (file.type === '') {
        this.parseText(file.content);
      }
      return file.name;
    }
    else if (files.length > 1) {
      // find two files that match in name
      files.sort((a, b) => a.name.localeCompare(b.name));

      // file to check against
      let i = 0;
      let iname = files[i].name.match(re);

      let annRe = /a/;
      let txtRe = /s/;

      for (let j = 1; j < files.length; ++j) {
        let jname = files[j].name.match(re);
        if (jname[1] && jname[1] !== 'txt' && jname[1] !== 'ann') {
          // not a valid extension
          ++i;
          continue;
        }

        // check if name matches
        if (jname[0] === iname[0]) {
          if (iname[1] === 'ann' && jname[1] !== 'ann') {
            this.parseText(files[j].content, files[i].content);
            return;
          }
          else if ((iname[1] === 'txt' || !iname[1]) && jname[1] === 'ann') {
            this.parseText(files[i].content, files[j].content);
            return;
          }
        }

        // iterate to next file
        ++i;
        iname = jname;
      }
    }
  }

  parseJson(data) {
    this.reach.parse(data);
    this.parsedData = this.reach.data;
  }

  parseText(text, ann) {
    this.ann.parse(text, ann);
    this.parsedData = this.ann.data;
  }
}

module.exports = Parser;
