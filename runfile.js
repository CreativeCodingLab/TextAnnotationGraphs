/**
 * Contains the main build scripts
 * See https://github.com/pawelgalazka/runjs
 */

const {run} = require("runjs");
const chalk = require("chalk");
const {performance} = require("perf_hooks");

// Coloured output/logging
// -----------------------
// Force colours on MinTTY (i.e., for the Windows Git SDK). Change this if
// it garbles output on other terminals.
chalk.default.enabled = true;
chalk.default.level = 3;

// Output colours
const colourType = chalk.default.green;
const colourOutput = chalk.default.cyan;
const colourInfo = chalk.default.yellow;

// Project-specific configuration
// ------------------------------
const config = {
  // Folder for built static assets -- Build tasks will put their output here
  assetsDir: "dist/tag",
  // Sub-folders for different file types
  scriptsDir: "js",
  stylesDir: "css"
};

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Build tasks
// -----------
const build = {};

// ---------
// App tasks
// ---------
// Generates various scripts and styles from app-specific sources, putting
// them in the static assets directory
build.app = {};

// App scripts
// -----------
// Bundles up the various .js scripts, putting them in the static assets
// directory. `quick` versions of the build functions leave out expensive
// transforms like babelify and tinyify.
build.app.scripts = {
  // Main TAG bundle
  // -----------------
  async tag() {
    const input = "src/js/tag.js";
    const output = `${config.assetsDir}/${config.scriptsDir}/tag.min.js`;
    const type = "Build";
    const desc = "Main TAG JS bundle";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    run(`mkdirp ${config.assetsDir}/${config.scriptsDir}`);
    return run(`browserify ${input} -p browserify-derequire -s TAG -t [ babelify ] -t [ hbsfy ] -p [ tinyify ] -o ${output} -v`, {async: true});
  },
  async quickTag() {
    const input = "src/js/tag.js";
    const output = `${config.assetsDir}/${config.scriptsDir}/tag.js`;
    const type = "Build";
    const desc = "Main TAG JS bundle (Unminified)";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    run(`mkdirp ${config.assetsDir}/${config.scriptsDir}`);
    return run(`browserify ${input} -p browserify-derequire -s tag -t [ babelify ] -t [ hbsfy ] -o ${output} -v`, {async: true});
  },

  // All/Quick
  // ---------
  all() {
    return Promise.all([
      build.app.scripts.tag(),
      build.app.scripts.quickTag()
    ]);
  },
  quick() {
    return Promise.all([
      build.app.scripts.quickTag()
    ]);
  }
};

// App styles
// ----------
// Bundles up the app-specific .css files
build.app.styles = {
  // Main TAG Sass
  // ----------------
  async tag() {
    const input = "src/css/tag.scss";
    const output = `${config.assetsDir}/${config.stylesDir}/tag.min.css`;
    const type = "Build";
    const desc = "Main TAG CSS bundle";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    await run(`sass ${input} ${output}`, {async: true});
    // Autoprefixer
    await run(`postcss ${output} --use autoprefixer --replace`, {async: true});
    // Minify
    return run(`cleancss ${output} -o ${output}`, {async: true});
  },
  async quickTag() {
    const input = "src/css/tag.scss";
    const output = `${config.assetsDir}/${config.stylesDir}/tag.css`;
    const type = "Build";
    const desc = "Main TAG CSS bundle (Unminified)";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    await run(`sass ${input} ${output}`, {async: true});
    // Autoprefixer
    return run(`postcss ${output} --use autoprefixer --replace`, {async: true});
  },

  // All/Quick
  // ---------
  all() {
    return Promise.all([
      build.app.styles.tag(),
      build.app.styles.quickTag()
    ]);
  },
  quick() {
    return Promise.all([
      build.app.styles.quickTag()
    ]);
  }
};

// App docs
// --------
// Generates the documentation for the app
build.app.docs = {
  // JSDoc
  // -----
  async jsdoc() {
    const input = "src/js";
    const output = "docs";
    const type = "Build";
    const desc = "Main TAG documentation";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    // Clean and (re-)build docs
    await run(`rimraf ${output}`, {async: true});
    await run(`jsdoc ${input} README.md -c .jsdoc.json -d ${output} --verbose`, {async: true});
    return build.app.docs.figures();
  },

  // Copy figures to doc directory
  async figures() {
    const input = "figs";
    const output = "docs/figs";
    const type = "Build";
    const desc = "TAG documentation figures";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    return run(`cpy ${input} ${output}`, {async: true});
  },

  // All/Quick
  // ---------
  all() {
    return Promise.all([
      build.app.docs.jsdoc()
    ]);
  },
  quick() {
    return Promise.all([
      build.app.docs.jsdoc()
    ]);
  }
};

// All/quick
// ---------
build.app.all = async () => {
  return Promise.all([
    build.app.scripts.all(),
    build.app.styles.all(),
    build.app.docs.all()
  ]);
};
build.app.quick = async () => {
  return Promise.all([
    build.app.scripts.quick(),
    build.app.styles.quick(),
    build.app.docs.all()
  ]);
};

// ------------
// Vendor tasks
// ------------
// Copies and post-processes various vendor scripts and styles from the
// `node_modules` directory, putting them in the static assets directory.
build.vendor = {};

// Vendor styles
// --------------
build.vendor.styles = {
  // Concat and minify all vendor CSS files that can be directly used without
  // further processing
  async concat() {
    const input = [].join(" ");
    const output = `${config.assetsDir}/${config.stylesDir}/vendor.min.css`;
    const type = "Build (Vendor)";
    const desc = "Vendor CSS (concatenate + minify)";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    if (input === "") {
      console.log(`No vendor CSS to bundle.`);
    } else {
      // Cleancss chokes if the output directory is not present
      run(`mkdirp ${config.assetsDir}/${config.stylesDir}`);
      return run(`cleancss ${input} -o ${output}`, {async: true});
    }
  },

  // All/Quick
  // ---------
  all() {
    return Promise.all([
      build.vendor.styles.concat()
    ]);
  },
  quick() {
    return build.vendor.styles.all();
  }
};

// All/quick
// ---------
build.vendor.all = async () => {
  return Promise.all([
    build.vendor.styles.all()
  ]);
};
build.vendor.quick = async () => {
  return Promise.all([
    build.vendor.styles.quick()
  ]);
};

// -------------------
// Comprehensive tasks
// -------------------
build.all = async () => {
  const t0 = performance.now();

  await Promise.all([
    build.app.all(),
    build.vendor.all()
  ]);

  const time = (performance.now() - t0) / 1000;
  const doneString = `Done! (in ${time.toFixed(3)}s)`;
  console.log();
  console.log(`${colourInfo(doneString)}`);
};

build.quick = async () => {
  const t0 = performance.now();

  await Promise.all([
    build.app.quick(),
    build.vendor.quick()
  ]);

  const time = (performance.now() - t0) / 1000;
  const doneString = `Done! (in ${time.toFixed(3)}s)`;
  console.log();
  console.log(`${colourInfo(doneString)}`);
};

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Watch tasks
// -----------
const watch = {};

watch.scripts = {
  async tag() {
    const input = "src/js/tag.js";
    const output = `${config.assetsDir}/${config.scriptsDir}/tag.min.js`;
    const type = "Watch";
    const desc = "Main TAG JS bundle";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    return run(`watchify ${input} -t [ babelify ] -t [ hbsfy ] -p [ tinyify ] -o ${output} -v --poll=500`, {async: true});
  },
  async quickTag() {
    const input = "src/js/tag.js";
    const output = `${config.assetsDir}/${config.scriptsDir}/tag.js`;
    const type = "Watch";
    const desc = "Main TAG JS bundle (Unminified)";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    return run(`watchify ${input} -t [ babelify ] -t [ hbsfy ] -o ${output} -v --poll=500`, {async: true});
  },

  all() {
    return Promise.all([
      watch.scripts.tag(),
      watch.scripts.quickTag()
    ]);
  },
  quick() {
    return Promise.all([
      watch.scripts.quickTag()
    ]);
  }
};

watch.styles = {
  async tag() {
    const input = "src/css/tag.scss";
    const output = `${config.assetsDir}/${config.stylesDir}/tag.min.css`;
    const type = "Watch";
    const desc = "Main TAG CSS bundle";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    return run(`chokidar ${input} --initial -c "sass ${input} ${output} && postcss ${output} --use autoprefixer --replace && cleancss ${output} -o ${output} -d"`, {async: true});
  },
  async quickTag() {
    const input = "src/css/tag.scss";
    const output = `${config.assetsDir}/${config.stylesDir}/tag.css`;
    const type = "Watch";
    const desc = "Main TAG CSS bundle (Unminified)";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    return run(`chokidar ${input} --initial -c "sass ${input} ${output} && postcss ${output} --use autoprefixer --replace --verbose"`, {async: true});
  },

  all() {
    return Promise.all([
      watch.styles.tag(),
      watch.styles.quickTag()
    ]);
  },
  quick() {
    return Promise.all([
      watch.styles.quickTag()
    ]);
  }
};

watch.all = async () => {
  await Promise.all([
    watch.scripts.all(),
    watch.styles.all()
  ]);
};

watch.quick = async () => {
  await Promise.all([
    watch.scripts.quick(),
    watch.styles.quick()
  ]);
};

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Demo tasks
// ----------
const demo = {
  build: {
    async scripts() {
      const input = "demo/src/demo.js";
      const output = `demo/demo.min.js`;
      const type = "Build";
      const desc = "TAG demo JS bundle";

      console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

      return run(`browserify ${input} -t [ babelify ] -t [ hbsfy ] -p [ tinyify ] -o ${output} -v`, {async: true});
    },

    async BSColourPicker() {
      const input = "node_modules/bootstrap-colorpicker/dist/js/bootstrap-colorpicker.min.js";
      const output = `demo/`;
      const type = "Build (Vendor)";
      const desc = "Bootstrap Colorpicker Library";

      // `cpy` takes a directory rather than a file as its target
      console.log(`\n[${colourType(type)}: ${colourOutput(output + "bootstrap-colorpicker.min.js")}] ${colourInfo(desc)}`);

      return run(`cpy ${input} ${output}`, {async: true});
    },

    async styles() {
      const input = "demo/src/demo.scss";
      const output = `demo/demo.min.css`;
      const type = "Build";
      const desc = "TAG demo CSS bundle";

      console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

      await run(`sass ${input} ${output}`, {async: true});
      // Autoprefixer
      await run(`postcss ${output} --use autoprefixer --replace`, {async: true});
      // Minify
      return run(`cleancss ${output} -o ${output}`, {async: true});
    },

    async all() {
      return Promise.all([
        demo.build.scripts(),
        demo.build.BSColourPicker(),
        demo.build.styles()
      ]);
    },
  },

  // For ease of demo development; intentionally left undocumented
  // (end-users should be importing the library into their own projects
  // rather than building directly off the demo script)
  watch: {
    async scripts() {
      const input = "demo/src/demo.js";
      const output = `demo/demo.min.js`;
      const type = "Watch";
      const desc = "TAG demo JS bundle";

      console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

      return run(`watchify ${input} -d -t [ babelify ] -t [ hbsfy ] -p [ tinyify ] -o ${output} -v --poll=500`, {async: true});
    },

    async BSColourPicker() {
      const input = "node_modules/bootstrap-colorpicker/dist/js/bootstrap-colorpicker.min.js";
      const output = `demo/`;
      const type = "Build (Vendor)";
      const desc = "Bootstrap Colorpicker Library";

      // `cpy` takes a directory rather than a file as its target
      console.log(`\n[${colourType(type)}: ${colourOutput(output + "bootstrap-colorpicker.min.js")}] ${colourInfo(desc)}`);

      return run(`chokidar ${input} --initial -c "cpy ${input} ${output}"`, {async: true});
    },

    async styles() {
      const input = "demo/src/demo.scss";
      const output = `demo/demo.min.css`;
      const type = "Build";
      const desc = "TAG demo CSS bundle";

      console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

      return run(`chokidar ${input} -c "sass ${input} ${output} && postcss ${output} --use autoprefixer --replace && cleancss ${output} -o ${output}"`, {async: true});
    },

    async coreStyles() {
      // This task rebuilds the demo stylesheet when the core TAG stylesheet
      // changes
      // (`demo.scss` imports `tag.css`, which needs to be rebuilt from
      // `tag.scss`)
      const input = "src/css/tag.scss";
      const output = `${config.assetsDir}/${config.stylesDir}/tag.css`;
      const input2 = "demo/src/demo.scss";
      const output2 = `demo/demo.min.css`;
      const type = "Build";
      const desc = "Main TAG CSS bundle (Unminified)";

      console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

      return run(`chokidar ${input} --initial -c "sass ${input} ${output} && postcss ${output} --use autoprefixer --replace && sass ${input2} ${output2} && postcss ${output2} --use autoprefixer --replace && cleancss ${output2} -o ${output2}"`, {async: true});
    },

    async docs() {
      // This task regenerates the documentation whenever one of the
      // source files (or the JSDoc template) changes
      const input = "src/**/*.js";
      const input2 = "README.md";
      const input3 = "src/jsdoc-template/**/*";
      const output = `${config.assetsDir}/${config.stylesDir}/tag.css`;
      const type = "Watch";
      const desc = "Main TAG documentation";

      console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

      return run(`chokidar "${input}" "${input2}" "${input3}" --initial -c "npm run generate-docs"`);
    },

    async all() {
      return Promise.all([
        demo.watch.scripts(),
        demo.watch.BSColourPicker(),
        demo.watch.styles(),
        demo.watch.coreStyles(),
        demo.watch.docs()
      ]);
    }
  },

  run() {
    return run(`cd demo && node server.js`);
  }
};

module.exports = {
  build,
  watch,
  demo
};
