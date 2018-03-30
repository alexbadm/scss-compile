#!/usr/bin/env node

import autoprefixer = require('autoprefixer');
import chalk from 'chalk';
import chokidar = require('chokidar');
import fs = require('fs');
import globParent = require('glob-parent');
import sass = require('node-sass');
import path = require('path');
import postcss  = require('postcss');
import 'rxjs/add/operator/debounceTime';
import { Subject } from 'rxjs/Subject';

// const prefixer = postcss([ autoprefixer({ flexbox: 'no-2009' }) ]); /* use it to remove -webkit-box */
const prefixer = postcss([ autoprefixer ]);
const log = console.log.bind(console);
const ignored = /(^|[\/\\])\../;

const rootPath = path.resolve(globParent(process.argv[2]));
log(chalk.yellow('Watching dir: ' + rootPath));
const scssFiles = getAllFiles(rootPath)
  .filter(name => /^[^_.].*\.s[ac]ss$/.test(path.basename(name)))
  .map(name => path.resolve(name));

const watcher = chokidar.watch(path.join(rootPath, '**/*.scss'), { ignored, persistent: true });
const processFiles = processScss.bind(null, scssFiles);
const eventStream = new Subject<string>();
eventStream.debounceTime(200).subscribe(processFiles);
processFiles();

const writeFileError = (filename: string) => (err: NodeJS.ErrnoException) => {
  err ? log(chalk.red('Failed to write file: ' + err)) : log(chalk.green('Write file ' + filename));
};

watcher.on('change', (filePath) => {
  log(`File ${filePath} has been changed`);
  // processScss(scssFiles);
  eventStream.next(filePath);
});

function processScss(fileNames: string[]) {
  fileNames.forEach((fileName) => {
    const cssPath = fileName.replace(/scss$/, 'css');
    sass.render({
      file: fileName,
      outFile: cssPath,
      sourceMap: true,
      sourceMapEmbed: true,
    }, (err, result) => {
      if (err) {
        log(chalk.red('Sass render err:' + err));
        return;
      }

      prefixer.process(result.css.toString(), {
        from: fileName,
        map: { inline: false },
        to: cssPath,
      }).then((prefixed: postcss.Result) => {
        prefixed.warnings().forEach((warn) => log(chalk.magenta(warn.toString())));
        fs.writeFile(cssPath, prefixed.css, writeFileError(cssPath));
        if (prefixed.map) {
          const mapPath = cssPath + '.map';
          fs.writeFile(mapPath, prefixed.map, writeFileError(mapPath));
        }
      }).catch((error: Error) => log(chalk.red('Failed to process autoprefix: ' + error)));
    });
  });
}

/**
 * Find all files inside a dir, recursively.
 * @function getAllFiles
 * @param  {string} dir Dir path string.
 * @return {string[]} Array with all file names that are inside the directory.
 */
function getAllFiles(dir: string): string[] {
  return fs.readdirSync(dir).reduce((allFiles: string[], file: string) => {
    if (file === 'node_modules' || ignored.test(file)) {
      return allFiles;
    }
    const name = path.join(dir, file);
    const isDirectory = fs.statSync(name).isDirectory();
    return isDirectory ? [...allFiles, ...getAllFiles(name)] : [...allFiles, name];
  }, []);
}
