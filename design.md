---
version: 1
name: openpreflight
description: >
  Shared visual system for openpreflight.xyz (marketing) and docs.openpreflight.xyz.
  Self-hosted GitHub Check Runs CI — technical, calm, product-first. Not generic SaaS marketing.
principle: brand atoms are sacred · Check Run is the hero artifact · copy stays concrete

colors:
  # Light
  ground: "#f7f8f5"
  raised: "#ffffff"
  edge: "#dfe3dc"
  edge-strong: "#8a8a84"
  ink: "#1a1d19"
  ink-muted: "#5f665c"
  accent: "#2f6f4f"
  accent-hover: "#1e4a34"
  on-accent: "#ffffff"
  pass: "#2f6f4f"
  # Dark
  ground-dark: "#121412"
  raised-dark: "#1a1d1a"
  edge-dark: "#2a2f2a"
  ink-dark: "#e8ebe6"
  ink-muted-dark: "#9aa39a"
  accent-dark: "#7cc79c"
  accent-hover-dark: "#b6e4c8"
  on-accent-dark: "#102018"
  # Atmosphere (website hero / rivelle surfaces)
  atmosphere: "radial forest bloom at 28% primary over a soft olive grid"
  primary-oklch: "oklch(0.45 0.08 155)" # forest — prefer hex tokens above for product chrome

typography:
  display: { fontFamily: "Inter", weight: 600, tracking: "-0.04em", lineHeight: 1.0 }
  body: { fontFamily: "Inter", weight: 400, lineHeight: 1.55 }
  mono: { fontFamily: "JetBrains Mono", weight: 400-600, lineHeight: 1.5 }
  kicker: { fontFamily: "JetBrains Mono", weight: 500, size: "0.875rem", color: "accent" }

spacing:
  radius-sm: "6px"
  radius-md: "10px"
  radius-lg: "16px"
  radius-xl: "24px"
  section-y: "5rem"
  content-max: "72rem"
  reading-max: "42rem"

components:
  mark:
    description: >
      Rounded square (#2f6f4f) with a white runway-check: diagonal check that levels into a
      short horizontal runway, plus a caret above the apex. No wordmark inside the favicon.
  check-run-panel:
    description: >
      The product's only hero artifact — monospace Check Run output (pass greens, muted sep).
      Prefer this over stock dashboard mockups when the page needs a product visual.
  cta-primary:
    background: "{colors.accent}"
    color: "{colors.on-accent}"
    radius: "{spacing.radius-md}"
  cta-secondary:
    border: "1px solid {colors.edge-strong}"
    radius: "{spacing.radius-md}"
---

# openpreflight — design system

## Overview

openpreflight is a **small self-hosted CI provider** for private GitHub repos: one Go binary,
one SQLite file, one Check Run per commit. The sites should feel like a finished developer
product — calm forest greens, warm olive neutrals, monospace for program output — not a
startup pitch deck.

**Key characteristics**

- Forest green accent (`#2f6f4f` / `#7cc79c` dark), never purple, never cool SaaS blue as the brand.
- Inter for UI and display; **JetBrains Mono** for kickers, code, and the Check Run panel.
- Soft olive-tinted ground (`#f7f8f5` / `#121412`), not pure white or stark cold gray.
- Elevation via hairline borders and light atmospheric bloom — no heavy multi-layer shadows, no glow.
- Copy is technical and specific; no fabricated customer logos, fake stats, or invented pricing tiers.

## Brand voice

- Short, concrete sentences. Name the mechanism (HMAC, Check Run, SQLite, GitHub App).
- Prefer “what it does” over “transform your workflow.”
- The wordmark is lowercase: **openpreflight**.

## Mark / favicon

The mark is a **runway-check** on forest green: a checkstroke that finishes as a short runway,
with a caret at the apex (preflight / takeoff). Favicon and apple-touch use the mark only —
Starlight/docs may show mark + title text separately.

## Website (marketing)

- First viewport: brand, one headline, one supporting line, one CTA group, one product visual
  (Check Run panel or adapted dashboard preview that still reads as openpreflight).
- Use Rivelle `saas-landing-01` structure for production polish, but **replace placeholder SaaS
  copy** with real openpreflight positioning. Drop or rewrite pricing / testimonial blocks that
  invent customers or paid plans the product does not have.
- Keep accessibility: skip link, `<main>`, `:focus-visible`, labelled navs, reduced motion.

## Docs (Starlight)

- Inherit the same accent and mark; do not invent a second palette.
- Per-page meta descriptions; logo light/dark pair without `currentColor` in `<img>` SVGs.

## Do

- Lead with the Check Run as the product surface.
- Link out to docs for how-to; keep the marketing page to positioning and proof.
- Match contrast: text AA; control borders ≥ 3:1 against ground (`edge-strong`).

## Don't

- Don't use Inter-only pages with no mono voice — the product is terminal-adjacent.
- Don't put cards, stats strips, or logo clouds in the hero.
- Don't introduce a second accent (coral, violet, electric blue) for “interest.”
- Don't fabricate testimonials, pricing, or “used by” logos.
