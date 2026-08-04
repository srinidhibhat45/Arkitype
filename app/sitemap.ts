import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Only the two public marketing surfaces.
 *
 * Published styleguides (`/p/<slug>`) are deliberately absent and must stay
 * that way: with `select using (true)` on `published_snapshots`, the slug is
 * the access grant, so enumerating them in a sitemap would publish every
 * customer's system to anyone who fetched this file. See app/robots.ts.
 *
 * The workspace itself (`/` behind auth) has nothing else to list — it's a
 * single client-rendered route, not a set of crawlable pages.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/docs"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
