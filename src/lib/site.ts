export const SITE = "https://openpreflight.xyz";
export const REPO = "https://github.com/openpreflight/openpreflight";
export const DOCS_REPO = "https://github.com/openpreflight/docs";

export const tagline =
  "Self-hosted CI without the CI platform: every commit gets a native GitHub Check Run, written by a GitHub App you own, from one Go binary and one SQLite file on a server you already run.";

export const footerGroups = [
  {
    title: "Getting started",
    links: [
      { label: "Quickstart", href: "/getting-started/quickstart/" },
      { label: "FAQ", href: "/getting-started/faq/" },
      { label: "Comparison", href: "/getting-started/comparison/" },
    ],
  },
  {
    title: "Configure",
    links: [
      { label: "Configuration", href: "/configure/configuration/" },
      { label: "GitHub App", href: "/configure/github-app/" },
      { label: "Bindings", href: "/configure/bindings/" },
    ],
  },
  {
    title: "Use",
    links: [
      { label: "Pipelines", href: "/use/pipelines/" },
      { label: "Runs", href: "/use/runs/" },
      { label: "Logs", href: "/use/logs/" },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "Website", href: SITE },
      { label: "GitHub", href: REPO },
      { label: "Architecture", href: "/reference/architecture/" },
      { label: "Security model", href: "/reference/security-model/" },
    ],
  },
] as const;

export const compactLinks = [
  { label: "Docs home", href: "/" },
  { label: "Website", href: SITE },
  { label: "GitHub", href: REPO },
  { label: "Quickstart", href: "/getting-started/quickstart/" },
] as const;

export const legalLinks = [
  { label: "Apache-2.0", href: `${REPO}/blob/main/LICENSE` },
  { label: "MIT", href: `${DOCS_REPO}/blob/main/LICENSE` },
  { label: "Security", href: `${REPO}/blob/main/SECURITY.md` },
] as const;
