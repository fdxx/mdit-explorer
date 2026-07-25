import fs from 'node:fs';
import markdownit from 'markdown-it';
import hljs from 'highlight.js';
import explorer from '../src/index.js';

function highlight(code, lang) {
  const formatted = code.replace(/\t/g, '    ');
  if (lang && hljs.getLanguage(lang)) {
    return hljs.highlight(formatted, { language: lang }).value;
  }
  return hljs.highlightAuto(formatted).value;
}

const source = `# mdit-explorer

::: explorer ./demo-file
open=src/gallery.cpp
:::
`;

const content = markdownit({ html: true, highlight })
  .use(explorer, { injectAssets: true })
  .render(source);
const page = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>mdit-explorer demo</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css" media="(prefers-color-scheme: light)">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css" media="(prefers-color-scheme: dark)">
  <style>
    :root { color-scheme: light dark; }
    body { background: #f6f7f9; color: #242424; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; }
    main { margin: 0 auto; max-width: 1180px; padding: 32px 20px 48px; }
    h1 { font-size: 22px; font-weight: 600; letter-spacing: 0; margin: 0 0 18px; }
    @media (prefers-color-scheme: dark) { body { background: #121212; color: #d4d4d4; } }
    @media (max-width: 640px) { main { padding: 18px 10px 28px; } h1 { font-size: 19px; margin-left: 2px; } }
  </style>
</head>
<body>
  <main>${content}</main>
</body>
</html>
`;

fs.writeFileSync(new URL('../index.html', import.meta.url), page);
