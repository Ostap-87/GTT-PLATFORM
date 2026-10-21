// Фразы интерфейса для перевода: собирает все __('…') из mobile/src и показывает, чего нет в словарях
// mobile/src/i18n/<язык>.json. `node tools/i18n-keys.mjs` — сводка; `--missing en` — недостающие фразы JSON-ом;
// `--prune` — убрать из словарей фразы, которых больше нет в коде.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../mobile/src/', import.meta.url).pathname;
const LANGS = ['en', 'zh', 'kk', 'ar', 'hi'];
const files = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : []; });
const unesc = (s) => s.replace(/\\n/g, '\n').replace(/\\(['"\\])/g, '$1');
const keys = new Set();
for (const f of files(ROOT)) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/__\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) keys.add(unesc(m[1] ?? m[2]));
}
const dictPath = (l) => join(ROOT, 'i18n', `${l}.json`);
const arg = process.argv[2];
if (arg === '--missing') {
  const d = JSON.parse(readFileSync(dictPath(process.argv[3]), 'utf8'));
  console.log(JSON.stringify([...keys].filter((k) => !d[k]), null, 1));
} else if (arg === '--prune') {
  for (const l of LANGS) {
    const d = JSON.parse(readFileSync(dictPath(l), 'utf8'));
    writeFileSync(dictPath(l), JSON.stringify(Object.fromEntries(Object.entries(d).filter(([k]) => keys.has(k))), null, 1) + '\n');
  }
} else {
  console.log(`фраз в коде: ${keys.size}`);
  for (const l of LANGS) {
    const d = JSON.parse(readFileSync(dictPath(l), 'utf8'));
    console.log(`${l}: переведено ${[...keys].filter((k) => d[k]).length}, нет ${[...keys].filter((k) => !d[k]).length}`);
  }
}
