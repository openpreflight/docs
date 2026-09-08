import type { APIRoute } from "astro";

const DESCRIPTION =
  "A small CI provider for private repos. One Go binary, one SQLite file: register a GitHub App, enable your repos, and get one Check Run per commit.";

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      {
        name: "openpreflight docs",
        short_name: "openpreflight",
        description: DESCRIPTION,
        start_url: "/",
        display: "browser",
        background_color: "#f7f8f5",
        theme_color: "#2f6f4f",
        icons: [
          {
            src: "/favicon.svg",
            type: "image/svg+xml",
            sizes: "any",
            purpose: "any",
          },
          {
            src: "/apple-touch-icon.png",
            type: "image/png",
            sizes: "180x180",
          },
        ],
      },
      null,
      2,
    ),
    {
      headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
    },
  );
