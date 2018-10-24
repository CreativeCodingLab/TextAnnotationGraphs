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

// Build tasks
// -----------
const build = {};

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
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
    const input = "src/js/main.js";
    const output = `${config.assetsDir}/${config.scriptsDir}/tag.min.js`;
    const type = "Build";
    const desc = "Main TAG JS bundle";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    run(`mkdirp ${config.assetsDir}/${config.scriptsDir}`);
    return run(`browserify ${input} -t [ babelify ] -t [ hbsfy ] -p [ tinyify ] -o ${output} -v`, {async: true});
  },
  async quickTag() {
    const input = "src/js/main.js";
    const output = `${config.assetsDir}/${config.scriptsDir}/tag.min.js`;
    const type = "Build";
    const desc = "Main TAG JS bundle (No Babelify/Tinyify)";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    run(`mkdirp ${config.assetsDir}/${config.scriptsDir}`);
    return run(`browserify ${input} -t [ hbsfy ] -o ${output} -v`, {async: true});
  },

  // All/Quick
  // ---------
  all() {
    return Promise.all([
      build.app.scripts.tag()
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
    const input = "src/css/app.scss";
    const output = `${config.assetsDir}/${config.stylesDir}/tag.min.css`;
    const type = "Build";
    const desc = "Main TAG CSS bundle";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    await run(`sass ${input} ${output}`, {async: true});
    // Autoprefixer
    await run(`postcss ${output} --use autoprefixer --replace`, {async: true});
    // Minify
    run(`cleancss ${output} -o ${output}`, {async: true});
  },

  // All/Quick
  // ---------
  all() {
    return Promise.all([
      build.app.styles.tag()
    ]);
  },
  quick() {
    return build.app.styles.all();
  }
};

// All/quick
// ---------
build.app.all = async () => {
  return Promise.all([
    build.app.scripts.all(),
    build.app.styles.all()
  ]);
};
build.app.quick = async () => {
  return Promise.all([
    build.app.scripts.quick(),
    build.app.styles.quick()
  ]);
};

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
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
      run(`cleancss ${input} -o ${output}`, {async: true});
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

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
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

// Watch tasks
// -----------
const watch = {};

watch.scripts = {
  async tag() {
    const input = "src/js/main.js";
    const output = `${config.assetsDir}/${config.scriptsDir}/tag.min.js`;
    const type = "Watch";
    const desc = "Main TAG JS bundle (No Tinyify)";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    return run(`watchify ${input} -t [ babelify ] -t [ hbsfy ] -o ${output} -v --poll=500`, {async: true});
  },
  async quickTag() {
    const input = "src/js/main.js";
    const output = `${config.assetsDir}/${config.scriptsDir}/tag.min.js`;
    const type = "Watch";
    const desc = "Main TAG JS bundle (No Babelify/Tinyify)";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    return run(`watchify ${input} -t [ hbsfy ] -o ${output} -v --poll=500`, {async: true});
  },

  all() {
    return Promise.all([
      watch.scripts.tag()
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
    const input = "src/css/app.scss";
    const output = `${config.assetsDir}/${config.stylesDir}/tag.min.css`;
    const type = "Watch";
    const desc = "Main TAG CSS bundle";

    console.log(`\n[${colourType(type)}: ${colourOutput(output)}] ${colourInfo(desc)}`);

    run(`chokidar ${input} --initial -c "sass ${input} ${output} && postcss ${output} --use autoprefixer --replace"`, {async: true});
  },

  all() {
    return Promise.all([
      watch.styles.tag()
    ]);
  },
  quick() {
    return watch.styles.all();
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

module.exports = {
  build,
  watch
};