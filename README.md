<div align="center">

<img src="https://openpreflight.xyz/apple-touch-icon.png" alt="openpreflight" width="72" height="72" />

# openpreflight docs

**A small CI provider for private repositories.**

One Go binary · one SQLite file · one Check Run for each commit

[Website](https://openpreflight.xyz) · [Docs](https://docs.openpreflight.xyz) · [Source](https://github.com/openpreflight/openpreflight)

<br />

<a href="https://www.producthunt.com/products/openpreflight?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-openpreflight" target="_blank" rel="noopener noreferrer"><img alt="openpreflight - Self-hosted CI without the CI platform. | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1244953&theme=light&t=1789004638189"></a>

</div>

The documentation site, published at **https://docs.openpreflight.xyz**.
Astro + Starlight + Tailwind v4. It describes **v2.3.2**
([GitHub Release](https://github.com/openpreflight/openpreflight/releases/tag/v2.3.2)).

This repository is the source of truth for the documentation. The markdown
under `src/content/docs/` is hand-authored and committed. Nothing is
generated, and nothing is synced in from
[openpreflight/openpreflight](https://github.com/openpreflight/openpreflight).

## Layout

```text
src/content/docs/
  index.mdx           the splash page
  getting-started/    overview, quickstart, comparison
  deploy/             deployment, networking, coolify
  configure/          github-app, bindings, pipelines, path-filters, dry-run, fork-pull-requests
  use/                runs, logs
  operate/            health, backup-restore, upgrade, rotate-secret-key, troubleshooting
  reference/          configuration, resolution, api, architecture, security-model, glossary
    decisions/        the numbered decision records
  contributing/       development
```

Each directory is a sidebar group. All groups are `autogenerate`d in
`astro.config.mjs`, except Reference, which lists its pages. To add a page:

1. Put the markdown in the correct directory.
2. Give it `title:`, a unique `description:` and `sidebar: { order: N }` frontmatter.
3. If the page is in Reference, add it to the Reference list in `astro.config.mjs`.

To remove a page, use `git rm`. A new name changes the URL. Add a redirect in
`astro.config.mjs` if the old URL is public.

## Local development

```bash
npm ci
npm run dev
```

`npm run build` makes `dist/`. After a build, `npm run check-links` makes sure
that the required routes and redirects exist, and that no page links to a
missing internal path. `npm run check-style` checks the writing rules in
`CONTRIBUTING.md`. CI runs all three.

## Writing

- Links between pages are site routes, not file paths:
  `/getting-started/quickstart/`, not `../getting-started/quickstart.md`.
- The pages use ASD-STE100 Simplified Technical English. The rules are in
  [CONTRIBUTING.md](CONTRIBUTING.md#writing-docs), and the terms are in the
  [glossary](https://docs.openpreflight.xyz/reference/glossary/).
- Links to files that live in the code repo (`README.md`, `SECURITY.md`,
  `examples/.ci.yml`) are absolute GitHub URLs.
- A doc that describes behaviour should say what the binary actually does. When
  a change in
  [openpreflight/openpreflight](https://github.com/openpreflight/openpreflight)
  changes behaviour, the docs change belongs in a pull request here that lands
  alongside it.

## Deployment

Cloudflare Pages. Root directory is the repository root, build command
`npm run build`, output `dist`.

MIT licensed.
