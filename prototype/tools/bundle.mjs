// Składa prototyp w jeden samodzielny plik HTML: node tools/bundle.mjs
// Czyta index.html, wstawia style i skrypty w tej samej kolejności i zapisuje dist/prototype.html.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let html = readFileSync(join(root, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) =>
  `<style>\n${readFileSync(join(root, href), 'utf8')}\n</style>`);

html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) =>
  `<script>\n${readFileSync(join(root, src), 'utf8').replace(/<\/script>/gi, '<\\/script>')}\n</script>`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'prototype.html'), html);
console.log('Zapisano dist/prototype.html (' + Math.round(html.length / 1024) + ' KB)');
