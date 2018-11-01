import load from "./xhr.js";

// non-comprehensive function to convert yml file to json
export function convert(url, callback) {
  load(url).then(function (text) {
    let taxonomy = [];
    let arr = taxonomy;
    const lines = text.split("\n");
    let depths = [];

    lines.forEach(line => {
      let comment = line.indexOf("#");
      let lineStart = line.indexOf("-");
      if (lineStart < 0 || (comment >= 0 && comment < lineStart)) {
        return;
      }

      line = ((comment >= 0) ? line.slice(lineStart + 1, comment) : line.slice(lineStart + 1)).trim();

      while (depths.length > 0 && depths[depths.length - 1].i >= lineStart) {
        arr = depths.pop().arr;
      }
      if (depths.length === 0) {
        arr = taxonomy;
      }

      if (line.endsWith(":")) {
        depths.push({arr, i: lineStart});

        let newArray = [];
        let child = {};
        child[line.slice(0, -1).trim()] = newArray;
        arr.push(child);
        arr = newArray;
      }
      else {
        arr.push(line);
      }
    });//end forEach
    if (callback) {
      callback(taxonomy);
    }
  });
}

/**
 * Converts YAML data into a JS object, taking a YAML string directly
 * instead of a URL
 * @param data
 * @return {Array}
 */
export function convertData(data) {
  let taxonomy = [];
  let arr = taxonomy;
  const lines = data.split("\n");
  let depths = [];

  lines.forEach(line => {
    let comment = line.indexOf("#");
    let lineStart = line.indexOf("-");
    if (lineStart < 0 || (comment >= 0 && comment < lineStart)) {
      return;
    }

    line = ((comment >= 0) ? line.slice(lineStart + 1, comment) : line.slice(lineStart + 1)).trim();

    while (depths.length > 0 && depths[depths.length - 1].i >= lineStart) {
      arr = depths.pop().arr;
    }
    if (depths.length === 0) {
      arr = taxonomy;
    }

    if (line.endsWith(":")) {
      depths.push({arr, i: lineStart});

      let newArray = [];
      let child = {};
      child[line.slice(0, -1).trim()] = newArray;
      arr.push(child);
      arr = newArray;
    }
    else {
      arr.push(line);
    }
  });//end forEach

  return taxonomy;
}