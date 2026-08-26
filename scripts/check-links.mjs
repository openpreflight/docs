#!/usr/bin/env node
/**
 * Fail CI if expected docs routes are missing from dist/, if built HTML
 * links to an internal path that was not emitted, or if any page still
 * emits the site-wide default meta description.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const SITE_DEFAULT_DESCRIPTION =
  'Self-hosted GitHub Check Runs CI for private repos. One Go binary, one SQLite file.';

const required = [
  'index.html',
  'start/quickstart/index.html',
  'start/configuration/index.html',
  'start/comparison/index.html',
  'start/faq/index.html',
  'setup/github-app/index.html',
  'setup/coolify/index.html',
  'setup/bindings/index.html',
  'using/pipelines/index.html',
  'using/logs/index.html',
  'using/api/index.html',
  'using/troubleshooting/index.html',
  'understanding/architecture/index.html',
  'understanding/security-model/index.html',
  'understanding/deployment/index.html',
  'understanding/operations/index.html',
  'contributing/development/index.html',
  'adr/005-check-suite-gating/index.html',
  'favicon.svg',
  'favicon.ico',
  'favicon-32.png',
  'apple-touch-icon.png',
  'og.png',
];

const missing = required.filter((p) => !existsSync(join(dist, p)));
if (missing.length) {
  console.error('Missing required dist paths:');
  for (const p of missing) console.error(`  - ${p}`);
  process.exit(1);
}

/** @param {string} dir */
function* walkHtml(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walkHtml(full);
    else if (name.endsWith('.html')) yield full;
  }
}

const broken = [];
const sharedDescriptions = [];
for (const file of walkHtml(dist)) {
  const html = readFileSync(file, 'utf8');
  const rel = file.replace(dist + '/', '');

  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (descMatch && descMatch[1] === SITE_DEFAULT_DESCRIPTION && rel !== 'index.html' && rel !== '404.html') {
    // Splash index may use the site tagline; Starlight's 404 has no frontmatter.
    // Every content page must be specific.
    sharedDescriptions.push(rel);
  }

  const hrefs = [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
  for (const href of hrefs) {
    if (href.startsWith('//')) continue;
    // Starlight assets and pagefind live under /_astro, /pagefind, etc.
    if (
      href.startsWith('/_') ||
      href.startsWith('/pagefind') ||
      href === '/' ||
      href.endsWith('.svg') ||
      href.endsWith('.png') ||
      href.endsWith('.ico') ||
      href.endsWith('.xml') ||
      href.endsWith('.txt') ||
      href.endsWith('.css') ||
      href.endsWith('.js') ||
      href.endsWith('.woff2') ||
      href.endsWith('.woff')
    ) {
      continue;
    }
    const normalized = href.replace(/\/$/, '') || '';
    const candidates = [
      join(dist, href.replace(/^\//, ''), 'index.html'),
      join(dist, `${normalized.replace(/^\//, '')}.html`),
      join(dist, href.replace(/^\//, '')),
    ];
    if (!candidates.some((c) => existsSync(c))) {
      broken.push(`${rel} → ${href}`);
    }
  }
}

if (sharedDescriptions.length) {
  console.error('Pages still using the site-wide default meta description:');
  for (const p of sharedDescriptions) console.error(`  - ${p}`);
  process.exit(1);
}

if (broken.length) {
  console.error('Broken internal links:');
  for (const b of [...new Set(broken)].slice(0, 50)) console.error(`  - ${b}`);
  if (broken.length > 50) console.error(`  … and ${broken.length - 50} more`);
  process.exit(1);
}

console.log(
  `OK: ${required.length} required paths present; descriptions unique; no broken internal hrefs.`,
);
