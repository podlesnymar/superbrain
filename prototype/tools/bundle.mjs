// Składa prototyp w jeden samodzielny plik HTML.
//   node tools/bundle.mjs            -> dist/prototype.html (nawigacja przez adres #/…)
//   node tools/bundle.mjs --memory   -> dist/prototype-preview.html (nawigacja w pamięci, do osadzonych podglądów)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const memory = process.argv.includes('--memory');
let html = readFileSync(join(root, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) =>
  `<style>\n${readFileSync(join(root, href), 'utf8')}\n</style>`);

html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) =>
  `<script>\n${readFileSync(join(root, src), 'utf8').replace(/<\/script>/gi, '<\\/script>')}\n</script>`);

if (memory) html = html.replace('<body>', '<body>\n  <script>window.CS_MEMORY_ROUTING = true;</script>');
const out = memory ? 'prototype-preview.html' : 'prototype.html';
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', out), html);
console.log(`Zapisano dist/${out} (` + Math.round(html.length / 1024) + ' KB)');
