import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import {
  SITE,
  breadcrumbJsonLd,
  crumbsForId,
  jsonLdScript,
  ogImagePath,
  organizationJsonLd,
  techArticleJsonLd,
  websiteJsonLd,
} from "./lib/seo";

function upsertMeta(
  head: { tag: string; attrs?: Record<string, string | boolean | undefined> }[],
  attr: "name" | "property",
  key: string,
  content: string,
) {
  const next = { tag: "meta" as const, attrs: { [attr]: key, content } };
  const i = head.findIndex((h) => h.tag === "meta" && h.attrs?.[attr] === key);
  if (i >= 0) head[i] = next;
  else head.push(next);
}

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  const { id, entry, head, lastUpdated } = route;
  const origin = context.site ?? new URL(SITE);
  const canonical = new URL(context.url.pathname, origin).href;
  const ogPath = ogImagePath(id);
  const ogAbs = new URL(ogPath, origin).href;
  const title = entry.data.title;
  const description = entry.data.description ?? "";
  const is404 = id === "404";
  const isHome = id === "index" || id === "";

  upsertMeta(head, "property", "og:image", ogAbs);
  upsertMeta(head, "property", "og:image:width", "1200");
  upsertMeta(head, "property", "og:image:height", "630");
  upsertMeta(head, "property", "og:locale", "en_US");
  upsertMeta(head, "name", "twitter:image", ogAbs);
  upsertMeta(head, "name", "twitter:image:alt", title);

  head.push({ tag: "link", attrs: { rel: "alternate", hreflang: "en", href: canonical } });
  head.push({
    tag: "link",
    attrs: { rel: "alternate", hreflang: "x-default", href: canonical },
  });

  if (is404) {
    upsertMeta(head, "name", "robots", "noindex, follow");
  }

  const graph = [organizationJsonLd(), websiteJsonLd()];
  if (!isHome && !is404) {
    graph.push(breadcrumbJsonLd(crumbsForId(id, title), canonical));
    graph.push(
      techArticleJsonLd({
        title,
        description,
        url: canonical,
        dateModified: lastUpdated,
        image: ogAbs,
      }),
    );
  }

  head.push({
    tag: "script",
    attrs: { type: "application/ld+json" },
    content: jsonLdScript(graph),
  });
});
