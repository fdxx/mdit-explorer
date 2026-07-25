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
  .use(explorer, { injectAssets: false, root: 'path/to' })
```

- `injectAssets`: Inline `style.css` and `browser.js`. They are injected only once when rendering multiple blocks. Defaults to `false`.
- `root`: Where to start searching the directory. Defaults to `process.cwd()`.

