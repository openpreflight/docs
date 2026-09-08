/**
 * Docs-site JSON-LD. Organization @id is the marketing origin so the two
 * sites graph as one org; this host is a WebSite under it.
 */
export const MARKETING = "https://openpreflight.xyz";
export const SITE = "https://docs.openpreflight.xyz";
export const REPO = "https://github.com/openpreflight/openpreflight";
export const ORG_ID = `${MARKETING}/#organization`;
export const WEBSITE_ID = `${SITE}/#website`;

const DESCRIPTION =
  "A small CI provider for private repos. One Go binary, one SQLite file: register a GitHub App, enable your repos, and get one Check Run per commit.";

export function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "openpreflight",
    url: MARKETING,
    logo: {
      "@type": "ImageObject",
      url: `${SITE}/apple-touch-icon.png`,
      width: 180,
      height: 180,
    },
    sameAs: ["https://github.com/openpreflight", REPO],
    description: DESCRIPTION,
  };
}

export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE,
    name: "openpreflight docs",
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": `${MARKETING}/#website` },
  };
}

export function breadcrumbJsonLd(
  crumbs: readonly { label: string; href?: string }[],
  pageUrl: string,
) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.label,
      item: crumb.href ? new URL(crumb.href, SITE).href : pageUrl,
    })),
  };
}

export function techArticleJsonLd(opts: {
  title: string;
  description: string;
  url: string;
  dateModified?: Date;
  image: string;
}) {
  return {
    "@type": "TechArticle",
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    image: opts.image,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORG_ID },
    ...(opts.dateModified
      ? { dateModified: opts.dateModified.toISOString() }
      : {}),
  };
}

export function jsonLdScript(graph: unknown[]) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": graph,
  });
}

export function ogImagePath(id: string): string {
  if (!id || id === "index" || id === "404") return "/og.png";
  return `/og/${id}.png`;
}

const GROUPS: Record<string, string> = {
  "getting-started": "Getting started",
  deploy: "Deploy",
  configure: "Configure",
  use: "Use",
  operate: "Operate",
  reference: "Reference",
  contributing: "Contributing",
};

export function kickerFromId(id: string): string {
  const top = id.split("/")[0] ?? id;
  return GROUPS[top] ?? top;
}

export function crumbsForId(
  id: string,
  title: string,
): { label: string; href?: string }[] {
  if (!id || id === "index" || id === "404") {
    return [{ label: "Docs" }];
  }
  const parts = id.split("/");
  const crumbs: { label: string; href?: string }[] = [
    { label: "Docs", href: "/" },
  ];
  if (parts[0] && GROUPS[parts[0]]) {
    crumbs.push({ label: GROUPS[parts[0]] });
  }
  if (parts.length > 2 && parts[1] === "decisions") {
    crumbs.push({ label: "Decisions" });
  }
  crumbs.push({ label: title });
  return crumbs;
}
