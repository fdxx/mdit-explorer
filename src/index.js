import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isBinaryFileSync } from 'isbinaryfile';

const languageByExtension = {
  c: 'c', cc: 'cpp', cpp: 'cpp', cxx: 'cpp', h: 'cpp', hpp: 'cpp',
  css: 'css', html: 'html', htm: 'html', js: 'javascript', cjs: 'javascript',
  mjs: 'javascript', json: 'json', jsx: 'jsx', lua: 'lua', md: 'markdown',
  py: 'python', rb: 'ruby', rs: 'rust', sh: 'bash', bash: 'bash', sql: 'sql',
  ts: 'typescript', tsx: 'tsx', txt: 'plaintext', xml: 'xml', yml: 'yaml', yaml: 'yaml'
};

const icons = {
  folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 5.5A1.5 1.5 0 0 1 4.5 4H9l2 2h8.5A1.5 1.5 0 0 1 21 7.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-12Z"/></svg>',
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 2h8l5 5v15H6V2Zm8 2.2V8h3.8L14 4.2ZM8 4v16h9V10h-5V4H8Z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 8h11v13H9V8Zm2 2v9h7v-9h-7ZM4 3h11v3h-2V5H6v9h1v2H4V3Z"/></svg>'
};

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function renderAssets() {
  const stylesheet = fs.readFileSync(new URL('./style.css', import.meta.url), 'utf8');
  const browserScript = fs.readFileSync(new URL('./browser.js', import.meta.url), 'utf8');
  return `<style data-mdit-explorer-style>\n${stylesheet}</style><script data-mdit-explorer-script>\n${browserScript}</script>`;
}

function readDirectory(root, filters, current = root) {
  const entries = fs.readdirSync(current, { withFileTypes: true })
    .filter(entry => entry.name !== '.git' && !entry.isSymbolicLink())
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name, 'en');
    });

  return entries.flatMap(entry => {
    const absolutePath = path.join(current, entry.name);
    const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');
    if (entry.isDirectory()) {
      const children = readDirectory(root, filters, absolutePath);
      if (filters.active && children.length === 0) return [];
      return [{ type: 'directory', name: entry.name, path: relativePath, children }];
    }
    if (!entry.isFile()) return [];
    if (filters.include.size > 0 && !filters.include.has(relativePath)) return [];
    if (filters.exclude.has(relativePath)) return [];
    const binary = isBinaryFileSync(absolutePath);
    const content = binary ? 'Binary file' : fs.readFileSync(absolutePath, 'utf8');
    return [{ type: 'file', name: entry.name, path: relativePath, content, binary }];
  });
}

function flattenFiles(nodes) {
  return nodes.flatMap(node => node.type === 'file' ? [node] : flattenFiles(node.children));
}

function renderTree(nodes, selectedPath) {
  const items = nodes.map(node => {
    if (node.type === 'directory') {
      return `<li class="mexp__item"><div class="mexp__folder"><span class="mexp__icon">${icons.folder}</span><span class="mexp__name">${escapeHtml(node.name)}</span></div>${renderTree(node.children, selectedPath)}</li>`;
    }
    const extension = path.extname(node.name).slice(1).toLowerCase();
    const selected = node.path === selectedPath;
    return `<li class="mexp__item"><button class="mexp__file" type="button" role="treeitem" aria-selected="${selected}" data-path="${escapeHtml(node.path)}" data-name="${escapeHtml(node.name)}" data-ext="${escapeHtml(extension)}" title="${escapeHtml(node.path)}"><span class="mexp__icon">${icons.file}</span><span class="mexp__name">${escapeHtml(node.name)}</span></button></li>`;
  }).join('');
  return `<ul class="mexp__group" role="group">${items}</ul>`;
}

function highlightFile(md, file) {
  const extension = path.extname(file.name).slice(1).toLowerCase();
  const language = file.binary ? 'plaintext' : languageByExtension[extension] || extension;
  const highlighted = !file.binary && typeof md.options.highlight === 'function'
    ? md.options.highlight(file.content, language, '')
    : '';
  return { html: highlighted || escapeHtml(file.content), language };
}

function isRemoteGitSource(source) {
  try {
    return ['http:', 'https:', 'file:'].includes(new URL(source).protocol);
  } catch {
    return false;
  }
}

function cloneRepository(source) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mdit-explorer-'));
  const repositoryRoot = path.join(temporaryRoot, 'repository');
  try {
    execFileSync('git', ['clone', '--depth', '1', '--quiet', '--', source, repositoryRoot], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000
    });
  } catch (error) {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
    const detail = error.stderr?.toString().trim() || error.message;
    throw new Error(`mdit-explorer: failed to clone repository: ${detail}`, { cause: error });
  }
  return { repositoryRoot, temporaryRoot };
}

function normalizeFilePath(filePath) {
  return path.posix.normalize(filePath.replaceAll('\\', '/').replace(/^\.\/+/, ''));
}

function renderExplorerRoot(md, explorerRoot, directives, options) {
  const include = new Set(directives.addFiles.map(normalizeFilePath));
  const exclude = new Set(directives.excludeFiles.map(normalizeFilePath));
  const tree = readDirectory(explorerRoot, { include, exclude, active: include.size > 0 || exclude.size > 0 });
  const files = flattenFiles(tree);
  if (files.length === 0) {
    return '<div class="mexp mexp--empty" data-mdit-explorer>No files found.</div>';
  }
  const normalizedOpenPath = directives.defaultOpenPath
    ? normalizeFilePath(directives.defaultOpenPath)
    : '';
  const selected = files.find(file => file.path === normalizedOpenPath) || files[0];
  const views = files.map(file => {
    const hidden = file.path === selected.path ? '' : ' hidden';
    const highlighted = highlightFile(md, file);
    const languageClass = highlighted.language ? ` language-${escapeHtml(highlighted.language)}` : '';
    const showLineNumbers = options.lineNumbers !== false;
    const viewModifier = showLineNumbers ? '' : ' mexp__view--no-lines';
    const lineNumbers = showLineNumbers
      ? `<pre class="mexp__lines" aria-hidden="true">${Array.from({ length: file.content.split('\n').length }, (_, index) => index + 1).join('\n')}</pre>`
      : '';
    return `<div class="mexp__view${viewModifier}" data-path="${escapeHtml(file.path)}"${hidden}>${lineNumbers}<pre class="mexp__code"><code class="hljs${languageClass}">${highlighted.html}</code></pre></div>`;
  }).join('');

  return `<div class="mexp" data-mdit-explorer><aside class="mexp__sidebar"><div class="mexp__side-title">Explorer</div><nav class="mexp__tree" aria-label="File explorer">${renderTree(tree, selected.path)}</nav></aside><section class="mexp__main"><div class="mexp__tabbar"><div class="mexp__tab"><span class="mexp__tab-name">${escapeHtml(selected.name)}</span></div></div><div class="mexp__crumbbar"><span class="mexp__crumb">${escapeHtml(selected.path)}</span><div class="mexp__actions"><button class="mexp__copy" type="button" data-path="${escapeHtml(selected.path)}" aria-label="Copy code">${icons.copy}</button></div></div><div class="mexp__views">${views}</div></section></div>`;
}

function renderExplorer(md, directives, options) {
  const { source } = directives;
  if (isRemoteGitSource(source)) {
    const { repositoryRoot, temporaryRoot } = cloneRepository(source);
    try {
      return renderExplorerRoot(md, repositoryRoot, directives, options);
    } finally {
      fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
  }

  const baseDir = path.resolve(options.root || process.cwd());
  const explorerRoot = path.resolve(baseDir, source);
  const relativeToBase = path.relative(baseDir, explorerRoot);
  if (relativeToBase.startsWith('..') || path.isAbsolute(relativeToBase)) {
    throw new Error(`mdit-explorer: directory is outside root: ${source}`);
  }
  if (!fs.statSync(explorerRoot).isDirectory()) {
    throw new Error(`mdit-explorer: not a directory: ${source}`);
  }
  return renderExplorerRoot(md, explorerRoot, directives, options);
}

function parseInfo(info) {
  const match = info.trim().match(/^explorer(?:\s+(.+))?$/);
  return match?.[1]?.trim() || null;
}

export default function explorerPlugin(md, options = {}) {
  md.block.ruler.before('fence', 'explorer', (state, startLine, endLine, silent) => {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    const marker = state.src.slice(start, max);
    if (!marker.startsWith(':::')) return false;
    const source = parseInfo(marker.slice(3));
    if (!source) return false;

    let nextLine = startLine + 1;
    let defaultOpenPath = '';
    const addFiles = [];
    const excludeFiles = [];
    for (; nextLine < endLine; nextLine += 1) {
      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
      const line = state.src.slice(lineStart, state.eMarks[nextLine]).trim();
      if (line === ':::') break;
      if (line.startsWith('defaultopen=')) defaultOpenPath = line.slice('defaultopen='.length).trim();
      if (line.startsWith('addfile=')) {
        const filePath = line.slice('addfile='.length).trim();
        if (filePath) addFiles.push(filePath);
      }
      if (line.startsWith('excludefile=')) {
        const filePath = line.slice('excludefile='.length).trim();
        if (filePath) excludeFiles.push(filePath);
      }
    }
    if (nextLine >= endLine) return false;
    if (silent) return true;

    const token = state.push('explorer', '', 0);
    token.block = true;
    token.map = [startLine, nextLine + 1];
    token.meta = { source, defaultOpenPath, addFiles, excludeFiles };
    state.line = nextLine + 1;
    return true;
  });

  md.renderer.rules.explorer = (tokens, index) => {
    const token = tokens[index];
    const firstExplorer = tokens.findIndex(item => item.type === 'explorer') === index;
    const assets = firstExplorer && options.injectAssets === true ? renderAssets() : '';
    return `${assets}${renderExplorer(md, token.meta, options)}\n`;
  };
}
