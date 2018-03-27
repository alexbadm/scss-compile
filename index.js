#!/usr/bin/env node

const autoprefixer = require('autoprefixer');
const chalk = require('chalk');
const chokidar = require('chokidar');
const fs = require('fs');
const globParent = require('glob-parent');
const path = require('path');
const postcss  = require('postcss');
const sass = require('node-sass');

const prefixer = postcss([ autoprefixer ]);
const log = console.log.bind(console);
const ignoredRegexp = /(^|[\/\\])\../;

const rootPath = path.resolve(globParent(process.argv[2]));
log(chalk.yellow('Watching dir: ' + rootPath));

const files = getAllFiles(rootPath);
const scssFiles = files.filter(name => /^[^_.].*\.scss$/.test(path.basename(name))).map(name => path.resolve(name));
processScss(scssFiles);

const watcher = chokidar.watch(path.join(rootPath, '**/*.scss'), {
  ignored: ignoredRegexp,
  persistent: true
});

watcher.on('change', filePath => {
  log(`File ${filePath} has been changed`);
  processScss(scssFiles);
});

function processScss (files) {
  files.forEach(fileName => {
    const cssPath = fileName.replace(/scss$/, 'css');
    sass.render({
      file: fileName,
      sourceMap: true,
      outFile: cssPath,
      sourceMapEmbed: true,
    }, function (err, result) {
      if (err) {
        log(chalk.red('Sass render err:' + err));
        return;
      }

      const css = prefixer.process(result.css.toString(), {
        from: fileName,
        to: cssPath,
        map: { inline: false }
      });
  
      css.then(result => {
        result.warnings().forEach(function (warn) {
          log(chalk.magenta(warn.toString()));
        });
        fs.writeFile(cssPath, result.css);
        log(chalk.green('Write file ' + cssPath));
        if ( result.map ) fs.writeFile(cssPath + '.map', result.map);
      });
    });
  });
}

/**
 * Find all files inside a dir, recursively.
 * @function getAllFiles
 * @param  {string} dir Dir path string.
 * @return {string[]} Array with all file names that are inside the directory.
 */
function getAllFiles (dir) {
  return fs.readdirSync(dir).reduce((files, file) => {
    if (file === 'node_modules' || ignoredRegexp.test(file)) {
      return files;
    }
    const name = path.join(dir, file);
    const isDirectory = fs.statSync(name).isDirectory();
    return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name];
  }, []);
}