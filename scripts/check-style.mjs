#!/usr/bin/env node
/**
 * Fail CI if a docs page breaks the writing rules in CONTRIBUTING.md: an em
 * dash, the wrong wordmark, a contraction, a word from the house list, or a
 * sentence that is too long. Reads the markdown source, not dist/.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, 'src/content/docs');

// Words that ASD-STE100 does not approve and that this site used most, with
// the approved replacement. The full STE dictionary is not in this repo
// (ASD copyright), so this list is the only word check.
const HOUSE = {
  so: 'split the sentence',
  need: 'must, necessary',
  would: 'will, or the present tense',
  per: 'each, for each',
  require: 'must, necessary',
  allow: 'let, can',
  permit: 'let, can',
  enable: 'let, can (UI labels in bold are not checked)',
  should: 'must',
  whether: 'if',
  however: 'but',
  via: 'through, with',
  already: 'remove the word',
  still: 'remove the word',
  every: 'each, all',
};
const houseRe = new RegExp(
  `(?<!-)\\b(${Object.keys(HOUSE).join("|")})(s|d|ed|ing)?\\b(?!-)`,
  'gi',
);
const CONTRACTION = /\b\w+(n't|'re|'ll|'ve|'m)\b|\b(it|that|there|here|what|who|let)'s\b/gi;

/** @param {string} dir */
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.mdx?$/.test(name)) yield full;
  }
}

/** Remove the parts of a line that are not prose: code, link targets, UI labels, tags. */
const prose = (line) =>
  line
    .replace(/`[^`]*`/g, 'X')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/\*\*[^*]+\*\*/g, 'X')
    .replace(/<[^>]+>/g, ' ')
    .replace(/https?:\/\/\S+/g, 'X');

const errors = [];
for (const file of walk(docs)) {
  const rel = relative(root, file);
  const glossary = rel.endsWith('reference/glossary.md');
  const lines = readFileSync(file, 'utf8').split('\n');
  /** @type {{ line: number, text: string, max: number }[]} */
  const blocks = [];
  let fence = false;
  let front = lines[0] === '---';
  let block = null;
  const close = () => block && (blocks.push(block), (block = null));

  lines.forEach((raw, i) => {
    const n = i + 1;
    if (front) {
      if (i > 0 && raw === '---') front = false;
      const desc = raw.match(/^description:\s*"?(.*?)"?$/);
      if (desc) blocks.push({ line: n, text: desc[1], max: 25 });
      return;
    }
    if (/^\s*(```|~~~)/.test(raw)) return void ((fence = !fence), close());
    if (fence) return;

    if (raw.includes('—')) errors.push(`${rel}:${n}: em dash`);
    const text = prose(raw);
    if (!glossary && /OpenPreflight/.test(text)) errors.push(`${rel}:${n}: write "openpreflight"`);
    for (const m of text.matchAll(CONTRACTION)) errors.push(`${rel}:${n}: contraction "${m[0]}"`);
    if (!glossary) {
      for (const m of text.matchAll(houseRe)) {
        errors.push(`${rel}:${n}: "${m[0]}" (use: ${HOUSE[m[1].toLowerCase()]})`);
      }
    }

    if (!raw.trim() || /^\s*(import |:::|<|\|?\s*-{3})/.test(raw)) return close();
    if (raw.startsWith('#') || raw.startsWith('|')) {
      close();
      // A table row: each cell is one block.
      for (const cell of text.split('|')) blocks.push({ line: n, text: cell, max: 25 });
      return;
    }
    const item = raw.match(/^\s*(\d+\.|[-*])\s+/);
    if (item) {
      close();
      block = { line: n, text: '', max: /\d/.test(item[1]) ? 20 : 25 };
    } else if (!block) {
      block = { line: n, text: '', max: 25 };
    }
    block.text += ' ' + text;
  });
  close();

  for (const b of blocks) {
    // ponytail: splits on .!? and does not know abbreviations ("e.g.");
    // use a real tokenizer if false positives become a problem.
    for (const s of b.text.split(/(?<=[.!?])\s+/)) {
      const words = s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w));
      if (words.length > b.max) {
        errors.push(`${rel}:${b.line}: ${words.length} words (max ${b.max}): "${words.slice(0, 8).join(' ')} …"`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} style errors. The rules are in CONTRIBUTING.md "Writing docs".`);
  process.exit(1);
}
console.log('OK: no em dash, wordmark, contraction, house-list word or long sentence.');
