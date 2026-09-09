/**
 * Inner-page Open Graph cards. Splash keeps `public/og.png`.
 * SVG → PNG through sharp; no extra dependency, no Chrome.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const mark = readFileSync(
  join(process.cwd(), "public/favicon.svg"),
  "utf8",
).replace("<svg ", '<svg x="80" y="72" width="72" height="72" ');

export type OgPage = {
  slug: string;
  kicker: string;
  headline: string;
  description: string;
};

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrap(text: string, width: number, lines: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width && line) {
      out.push(line);
      line = word;
      if (out.length === lines) return out;
    } else {
      line = next;
    }
  }
  if (line && out.length < lines) out.push(line);
  return out;
}

export async function renderOgPng(page: OgPage): Promise<Buffer> {
  const headlines = wrap(page.headline, 34, 2);
  const headlineSize = page.headline.length > 28 ? 40 : 56;
  const headlineTspans = headlines
    .map(
      (line, i) =>
        `<tspan x="80" dy="${i === 0 ? 0 : headlineSize + 4}">${esc(line)}</tspan>`,
    )
    .join("");
  const descY = 292 + headlines.length * (headlineSize + 4) + 28;
  const desc = wrap(page.description, 52, 2);
  const descTspans = desc
    .map(
      (line, i) =>
        `<tspan x="80" dy="${i === 0 ? 0 : 36}">${esc(line)}</tspan>`,
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f7f8f5"/>
  <rect width="12" height="630" fill="#2f6f4f"/>
  ${mark}
  <text x="80" y="210" fill="#2f6f4f" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="20" font-weight="600" letter-spacing="0.14em">${esc(page.kicker.toUpperCase())}</text>
  <text x="80" y="292" fill="#1a1d19" font-family="ui-sans-serif, system-ui, sans-serif" font-size="${headlineSize}" font-weight="600">${headlineTspans}</text>
  <text x="80" y="${descY}" fill="#5f665c" font-family="ui-sans-serif, system-ui, sans-serif" font-size="26">${descTspans}</text>
  <text x="80" y="560" fill="#5f665c" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="20">docs.openpreflight.xyz</text>
</svg>`;

  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
