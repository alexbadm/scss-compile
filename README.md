# SCSS-COMPILE

Compiles scss and sets vendor prefixes.

It uses [node-sass](https://github.com/sass/node-sass) for scss compilation, [postcss](https://github.com/postcss/postcss) with [autoprefixer](https://github.com/postcss/autoprefixer) for verdor prefixes and [chokidar](https://github.com/paulmillr/chokidar) for filesystem watch.

## Install

```sh
npm i -D git+https://github.com/alexbadm/scss-compile.git
```

## Usage

package.json

```json
"scripts": {
  "compile": "scss-compile"
}
```

```sh
npm run compile [path-to-target-folder]
```

## Configure

To configure target browsers put your .browserslistrc config file near your scss files.

For example:

```txt
# .browserslistrc
> 1%
Last 2 versions
IE 10
```