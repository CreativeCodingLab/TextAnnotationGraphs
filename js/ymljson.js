// non-comprehensive function to convert yml file to json
const ymlToJson = (function() {
  function convert(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        let taxonomy = [];
        let arr = taxonomy;
        const text = xhr.responseText;
        const lines = text.split('\n');
        let depths = [];

        lines.forEach(line => {
          let comment = line.indexOf('#');
          let lineStart = line.indexOf('-');
          if (lineStart < 0 || (comment >= 0 && comment < lineStart)) {
            return;
          }

          line = ((comment >= 0) ? line.slice(lineStart + 1, comment) : line.slice(lineStart + 1)).trim();

          while (depths.length > 0 && depths[depths.length - 1].i >= lineStart) {
            arr = depths.pop().arr;
          }
          if (depths.length === 0) { arr = taxonomy; }

          if (line.endsWith(':')) {
            depths.push({ arr, i: lineStart });

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
      }
    }
    xhr.open("GET", url);
    xhr.send();
  };

  return {
    convert
  };
})();
