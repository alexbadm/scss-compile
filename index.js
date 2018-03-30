#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const autoprefixer = require("autoprefixer");
const chalk_1 = __importDefault(require("chalk"));
const chokidar = require("chokidar");
const fs = require("fs");
const globParent = require("glob-parent");
const sass = require("node-sass");
const path = require("path");
const postcss = require("postcss");
require("rxjs/add/operator/debounceTime");
const Subject_1 = require("rxjs/Subject");
const prefixer = postcss([autoprefixer]);
const log = console.log.bind(console);
const ignored = /(^|[\/\\])\../;
const rootPath = path.resolve(globParent(process.argv[2]));
log(chalk_1.default.yellow('Watching dir: ' + rootPath));
const scssFiles = getAllFiles(rootPath)
    .filter(name => /^[^_.].*\.s[ac]ss$/.test(path.basename(name)))
    .map(name => path.resolve(name));
const watcher = chokidar.watch(path.join(rootPath, '**/*.scss'), { ignored, persistent: true });
const processFiles = processScss.bind(null, scssFiles);
const eventStream = new Subject_1.Subject();
eventStream.debounceTime(200).subscribe(processFiles);
processFiles();
const writeFileError = (filename) => (err) => {
    err ? log(chalk_1.default.red('Failed to write file: ' + err)) : log(chalk_1.default.green('Write file ' + filename));
};
watcher.on('change', (filePath) => {
    log(`File ${filePath} has been changed`);
    eventStream.next(filePath);
});
function processScss(fileNames) {
    fileNames.forEach((fileName) => {
        const cssPath = fileName.replace(/scss$/, 'css');
        sass.render({
            file: fileName,
            outFile: cssPath,
            sourceMap: true,
            sourceMapEmbed: true,
        }, (err, result) => {
            if (err) {
                log(chalk_1.default.red('Sass render err:' + err));
                return;
            }
            prefixer.process(result.css.toString(), {
                from: fileName,
                map: { inline: false },
                to: cssPath,
            }).then((prefixed) => {
                prefixed.warnings().forEach((warn) => log(chalk_1.default.magenta(warn.toString())));
                fs.writeFile(cssPath, prefixed.css, writeFileError(cssPath));
                if (prefixed.map) {
                    const mapPath = cssPath + '.map';
                    fs.writeFile(mapPath, prefixed.map, writeFileError(mapPath));
                }
            }).catch((error) => log(chalk_1.default.red('Failed to process autoprefix: ' + error)));
        });
    });
}
function getAllFiles(dir) {
    return fs.readdirSync(dir).reduce((allFiles, file) => {
        if (file === 'node_modules' || ignored.test(file)) {
            return allFiles;
        }
        const name = path.join(dir, file);
        const isDirectory = fs.statSync(name).isDirectory();
        return isDirectory ? [...allFiles, ...getAllFiles(name)] : [...allFiles, name];
    }, []);
}
