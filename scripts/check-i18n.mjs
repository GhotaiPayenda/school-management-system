import fs from 'node:fs';
import path from 'node:path';

const dictionary = fs.readFileSync('web/src/i18n/dictionary.js', 'utf8');
const keys = new Set([...dictionary.matchAll(/^  '([^']+)':/gm)].map((match) => match[1]));
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(jsx|js)$/.test(entry.name)) files.push(full);
  }
}
walk('web/src');

const missing = new Map();
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\bt\(\s*'([^']+)'/g)) {
    const key = match[1];
    if (!keys.has(key)) {
      if (!missing.has(key)) missing.set(key, []);
      missing.get(key).push(file);
    }
  }
}

for (const [key, places] of [...missing].sort()) {
  console.log(`${key}  <- ${[...new Set(places)].join(',')}`);
}
console.log('TOTAL', missing.size);
