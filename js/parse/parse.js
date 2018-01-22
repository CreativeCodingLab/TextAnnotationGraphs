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
      const extension = path.slice(path.lastIndexOf('.'));
      if (extension === '.json') {
        format = 'json';
      }
      else if (extension === '.ann') {
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

  parseJson(data) {
    this.reach.parse(data);
    this.parsedData = this.reach.data;
  }

  parseText(text) {
    this.ann.parse(text);
    this.parsedData = this.ann.data;
  }
}