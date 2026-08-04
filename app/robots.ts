import type { MetadataRoute } from "next";
import { SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * ⚠️ `/p/` is disallowed on purpose, and this is a security boundary, not an
 * SEO preference.
 *
 * `published_snapshots` is the one anon-readable table (`select using (true)`),
 * so **knowing a published slug IS the access grant** — that's why slugs carry
 * a random suffix (see lib/publish.ts). Letting crawlers index those pages
 * would turn "anyone with the link" into "anyone with a search box", and a
 * designer who published a client's system would have no way to un-share it
 * short of taking it offline. Figma's own link-sharing is noindex for exactly
 * this reason.
 *
 * The published routes also set `robots: { index: false }` in their own
 * metadata — robots.txt governs crawling, the meta tag governs indexing, and a
 * URL discovered via an inbound link needs the second one.
 *
 * If published styleguides should ever be discoverable, that's a deliberate
 * product decision and belongs behind a per-publication opt-in, not a blanket
 * change here.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/p/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
