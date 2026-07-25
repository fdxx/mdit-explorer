import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import markdownit from 'markdown-it';
import explorer from '../src/index.js';
import { script } from '../src/assets.js';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mdit-explorer-'));
  fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'src', 'main.js'), 'const value = 1;\n');
  fs.writeFileSync(path.join(root, 'README.md'), '# Demo\n');
  return root;
}

test('renders the tree, highlighted files, and selected file', t => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true }));
  const md = markdownit({ highlight: (code, lang) => `<mark data-lang="${lang}">${code}</mark>` })
    .use(explorer, { root, injectAssets: true });

  const html = md.render('::: explorer .\nopen=src/main.js\n:::\n');
  assert.match(html, /data-path="src\/main\.js"[^>]+aria-selected="true"|aria-selected="true"[^>]+data-path="src\/main\.js"/);
  assert.match(html, /data-lang="javascript"/);
  assert.match(html, /<code class="hljs language-javascript">/);
  assert.match(html, /data-mdit-explorer-style/);
  assert.match(html, /data-mdit-explorer-script/);
});

test('injects assets only once per render', t => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true }));
  const html = markdownit().use(explorer, { root, injectAssets: true })
    .render('::: explorer .\n:::\n\n::: explorer .\n:::\n');
  assert.equal(html.match(/data-mdit-explorer-style/g)?.length, 1);
  assert.equal(html.match(/data-mdit-explorer-script/g)?.length, 1);
});

test('omits inline assets by default for host-managed integration', t => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true }));
  const html = markdownit().use(explorer, { root })
    .render('::: explorer .\n:::\n');
  assert.doesNotMatch(html, /data-mdit-explorer-style/);
  assert.doesNotMatch(html, /data-mdit-explorer-script/);
  assert.match(html, /data-mdit-explorer/);
});

test('index.js runs without asset files when injection is disabled', async t => {
  const root = fixture();
  const standalone = fs.mkdtempSync(path.join(os.tmpdir(), 'mdit-explorer-standalone-'));
  t.after(() => fs.rmSync(root, { recursive: true }));
  t.after(() => fs.rmSync(standalone, { recursive: true }));
  fs.copyFileSync(new URL('../src/index.js', import.meta.url), path.join(standalone, 'index.mjs'));
  const { default: standaloneExplorer } = await import(path.join(standalone, 'index.mjs'));

  const html = markdownit().use(standaloneExplorer, { root }).render('::: explorer .\n:::\n');
  assert.match(html, /data-mdit-explorer/);
  assert.doesNotMatch(html, /data-mdit-explorer-style/);
});

test('escapes file contents when no highlighter is configured', t => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true }));
  fs.writeFileSync(path.join(root, 'unsafe.html'), '<script>alert(1)</script>');
  const html = markdownit().use(explorer, { root }).render('::: explorer .\nopen=unsafe.html\n:::\n');
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<code><script>/);
});

test('rejects directories outside the configured root', t => {
  const root = fixture();
  t.after(() => fs.rmSync(root, { recursive: true }));
  const md = markdownit().use(explorer, { root });
  assert.throws(() => md.render('::: explorer ..\n:::\n'), /outside root/);
});

test('browser script has valid JavaScript syntax', () => {
  const source = script.replace(/^\s*<script[^>]*>|<\/script>\s*$/g, '');
  assert.doesNotThrow(() => new Function(source));
});
