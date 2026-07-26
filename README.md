# mdit-explorer

A markdown-it plugin, For rendering an embedded code explorer similar to VS Code style.

## In the md file
```md
::: explorer ./demo
defaultopen=src/main.cpp
addfile=src/main.cpp
addfile=src/main.h
excludefile=src/main.h
:::
```

- `./demo`: The folder to be parsed and scanned.
- `defaultopen`: The file to open by default.
- `addfile`: Optional. Only render the specified file. Repeat the directive to add multiple files.
- `excludefile`: Optional. Exclude the specified file. Repeat the directive to exclude multiple files. Exclusions take precedence over additions.

Remote HTTP(S) Git repositories are shallow-cloned while Markdown is rendered:

```md
::: explorer https://github.com/fdxx/mdit-explorer.git
defaultopen=src/index.js
:::
```

The generated HTML contains the repository files and does not access Git at runtime. Binary files remain visible in the tree and display `Binary file` instead of their contents.


## Use in markdown-it
```js
import markdownit from 'markdown-it';
import hljs from 'highlight.js';
import explorer from 'mdit-explorer';

const mdrenderer = markdownit({ html: true, highlight })
  .use(explorer)
```

## Plugin Options

```js
import explorer from 'mdit-explorer';

const mdrenderer = markdownit({ html: true, highlight })
  .use(explorer, { injectAssets: false, lineNumbers: true, root: 'path/to' })
```

- `injectAssets`: Inline `style.css` and `browser.js`. They are injected only once when rendering multiple blocks. Defaults to `false`.
- `lineNumbers`: Show line numbers in the code area. Defaults to `true`; `browser.js` generates them only when a file is viewed for the first time.
- `root`: Where to start searching the directory. Defaults to `process.cwd()`.
