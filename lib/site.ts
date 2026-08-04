/**
 * Canonical site identity — one source of truth for anything that has to agree
 * across metadata, sitemap, robots, structured data, and the Figma plugin's
 * allow-listed origin. A hostname copied into six files is five chances to be
 * wrong the next time it moves.
 *
 * `NEXT_PUBLIC_SITE_URL` overrides for preview deployments; the default is the
 * production host.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://arkitype.srinidhibhat.com"
).replace(/\/+$/, "");

export const SITE_NAME = "Arkitype";

export const SITE_TAGLINE = "Build the system before the screens";

/** Used verbatim as the meta description — kept inside the ~155 char cut-off. */
export const SITE_DESCRIPTION =
  "A guided design-system builder: turn one brand colour into tokens, 53 accessible components, a Figma bundle, and a hosted styleguide.";

/** Longer form for structured data and OG, where there's no length pressure. */
export const SITE_DESCRIPTION_LONG =
  "Arkitype turns a single brand colour into a complete, accessible design system — colour ramps and semantic roles, type and spacing scales, 53 token-bound components, a Figma Variables bundle, Tailwind/MUI/CSS exports, and a hosted styleguide — across eight ordered steps.";

/** Absolute URL for a site-relative path. */
export const absoluteUrl = (path = "/"): string =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
