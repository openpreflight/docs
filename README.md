<div align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://openpreflight.xyz/banner-dark.png"
    />
    <img
      src="https://openpreflight.xyz/banner-light.png"
      alt="openpreflight: a small CI provider for private repos. One Go binary, one SQLite file: register a GitHub App, enable your repos, and get one Check Run per commit."
      width="880"
    />
  </picture>
</div>

# openpreflight docs

The documentation site, published at **https://docs.openpreflight.xyz**.
Astro + Starlight + Tailwind v4. It describes **v2.0.0**
([GitHub Release](https://github.com/openpreflight/openpreflight/releases/tag/v2.0.0)).

This repository is the source of truth for the documentation. The markdown
under `src/content/docs/` is hand-authored and committed. Nothing is
generated, and nothing is synced in from
[openpreflight/openpreflight](https://github.com/openpreflight/openpreflight).

## Layout

```text
src/content/docs/
  index.mdx           the splash page
  start/              quickstart, configuration
  setup/              github-app, coolify, bindings
  using/              pipelines, logs, api
  understanding/      architecture, security-model, deployment
  contributing/       development
  adr/                the numbered decision records
```

Each directory is a sidebar group, and every group is `autogenerate`d in
`astro.config.mjs`. Adding a page needs no config change:

1. Drop the markdown into the right directory.
2. Give it `title:` and `sidebar: { order: N }` frontmatter.

Removing a page is a `git rm`. Renaming one changes its URL, so leave a
redirect if the old path was linked publicly.

## Local development

```bash
npm ci
npm run dev
```

`npm run build` produces `dist/`. After a build, `npm run check-links` asserts
every splash CTA route exists and no built HTML links to a missing internal
path. CI runs both.

## Writing

- Links between pages are site routes, not file paths: `/start/quickstart/`,
  not `../start/quickstart.md`.
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
