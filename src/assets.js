import fs from 'node:fs';

const stylesheet = fs.readFileSync(new URL('./style.css', import.meta.url), 'utf8');
const browserScript = fs.readFileSync(new URL('./browser.js', import.meta.url), 'utf8');

export const styles = `<style data-mdit-explorer-style>\n${stylesheet}</style>`;
export const script = `<script data-mdit-explorer-script>\n${browserScript}</script>`;
