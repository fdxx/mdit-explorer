# mdit-explorer

A markdown-it plugin, For rendering an embedded code explorer similar to VS Code style.

## In the md file
```md
::: explorer ./demo
open=src/main.cpp
:::
```

- `./demo`: The folder to be parsed and scanned.
- `open`: The file to open by default.

Remote HTTP(S) Git repositories are shallow-cloned while Markdown is rendered:

```md
::: explorer https://github.com/fdxx/mdit-explorer.git
open=src/index.js
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
- `lineNumbers`: Show line numbers in the code area. Defaults to `true`.
- `root`: Where to start searching the directory. Defaults to `process.cwd()`.
