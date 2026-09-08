import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { renderOgPng, type OgPage } from "../../lib/og";
import { kickerFromId } from "../../lib/seo";

export async function getStaticPaths() {
  const docs = await getCollection("docs");
  return docs
    .filter((doc) => doc.id !== "index" && doc.id !== "404")
    .map((doc) => ({
      params: { slug: doc.id },
      props: {
        slug: doc.id,
        kicker: kickerFromId(doc.id),
        headline: doc.data.title,
        description: doc.data.description ?? "",
      } satisfies OgPage,
    }));
}

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOgPng(props as OgPage);
  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
