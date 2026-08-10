// lib/a11y.ts

/**
 * The contrast maths the audit runs on. Pure — no React, no store.
 *
 * Two things here are easy to get wrong and were, until this file learned to
 * flatten:
 *
 *  • **Alpha is not decoration.** A token stored as `neutral-500/40` resolves to
 *    an eight-digit `#RRGGBBAA`, and measuring only its first six digits scores
 *    a colour the screen never shows. Every ratio below is taken between two
 *    *opaque* colours, reached by compositing each translucent one over what is
 *    actually behind it.
 *  • **A hex can be three digits.** `#0af` is a colour a person will type, and
 *    substring arithmetic that assumes six turns it into NaN — which then fails
 *    every comparison silently. Parsing goes through `hexToRgb`, which knows all
 *    four lengths.
 */
import { hexToRgb, type RGB } from "@/lib/color";

/** sRGB channel -> linear, per WCAG 2.x */
function linearize(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

const BLACK: RGB = { r: 0, g: 0, b: 0 };

const rgbToCss = ({ r, g, b }: RGB): string =>
  `#${[r, g, b]
    .map((v) => Math.round(Math.min(Math.max(v, 0), 255)).toString(16).padStart(2, "0"))
    .join("")}`;

/**
 * Alpha of a hex as 0–1. Unparseable or opaque → 1, so a broken value is
 * measured as itself rather than vanishing into its backdrop.
 */
function alphaFraction(hex: string): number {
  const raw = hex.trim().replace(/^#/, "");
  if (raw.length === 4) return parseInt(raw[3] + raw[3], 16) / 255;
  if (raw.length === 8) return parseInt(raw.slice(6, 8), 16) / 255;
  return 1;
}

/**
 * `hex` as it actually renders on top of `behind` — the source-over composite.
 * An opaque `hex` is returned as itself; a translucent one is blended, so the
 * colour that gets measured is the colour the eye receives.
 *
 * `behind` is assumed opaque. Where it isn't (a translucent surface on a
 * translucent surface), flatten it first — see {@link checkContrast}.
 */
export function flattenOver(hex: string, behind: string): string {
  const a = alphaFraction(hex);
  const top = hexToRgb(hex) ?? BLACK;
  if (a >= 1) return rgbToCss(top);
  const base = hexToRgb(behind) ?? { r: 255, g: 255, b: 255 };
  return rgbToCss({
    r: top.r * a + base.r * (1 - a),
    g: top.g * a + base.g * (1 - a),
    b: top.b * a + base.b * (1 - a),
  });
}

/** Relative luminance of a hex colour, per WCAG 2.x. Any alpha is ignored —
 *  composite with {@link flattenOver} first if the colour is translucent. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex) ?? BLACK;
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Contrast ratio between two hex colours, always >= 1. Both are taken as
 *  opaque; alpha is a question for {@link flattenOver}. */
export function contrastRatio(hexA: string, hexB: string): number {
  const L1 = relativeLuminance(hexA);
  const L2 = relativeLuminance(hexB);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type A11yContext = "text-normal" | "text-large" | "ui-component";

/**
 * WCAG 2.x thresholds:
 *  - text-normal:  AA >= 4.5,  AAA >= 7
 *  - text-large (>=24px, or >=18.66px bold): AA >= 3, AAA >= 4.5
 *  - ui-component (icons, borders, focus rings, non-text): AA >= 3 (SC 1.4.11), no AAA tier defined
 */
export function wcagLevel(
  ratio: number,
  context: A11yContext
): "fail" | "AA" | "AAA" {
  if (context === "text-normal") {
    if (ratio >= 7) return "AAA";
    if (ratio >= 4.5) return "AA";
    return "fail";
  }
  if (context === "text-large") {
    if (ratio >= 4.5) return "AAA";
    if (ratio >= 3) return "AA";
    return "fail";
  }
  // ui-component
  return ratio >= 3 ? "AA" : "fail";
}

export interface ContrastCheck {
  ratio: number;
  level: "fail" | "AA" | "AAA";
  context: A11yContext;
  /** The opaque colours the ratio was actually taken between, once any alpha
   *  was composited. Equal to the inputs for a fully opaque pairing. */
  fgHex: string;
  bgHex: string;
}

/**
 * The verdict for a foreground on a background, with translucency resolved.
 *
 * `backdrop` is the opaque colour behind the *background* — the page under a
 * tinted card, say. It only matters when the background itself carries alpha,
 * and defaults to white because that is what an unstyled page is.
 */
export function checkContrast(
  hexA: string,
  hexB: string,
  context: A11yContext,
  backdrop = "#ffffff"
): ContrastCheck {
  const bgHex = flattenOver(hexB, backdrop);
  const fgHex = flattenOver(hexA, bgHex);
  const ratio = contrastRatio(fgHex, bgHex);
  return {
    ratio: Math.round(ratio * 100) / 100,
    level: wcagLevel(ratio, context),
    context,
    fgHex,
    bgHex,
  };
}

export type A11yTier = "AA" | "AAA";

/**
 * The ratio a pairing must clear for a tier in a given context. `ui-component`
 * has no AAA tier in WCAG 2.x (SC 1.4.11 defines 3:1 only), so AAA reuses the
 * AA bar there and {@link tierApplies} reports it as not-applicable.
 */
export function thresholdFor(context: A11yContext, tier: A11yTier): number {
  if (context === "text-normal") return tier === "AAA" ? 7 : 4.5;
  if (context === "text-large") return tier === "AAA" ? 4.5 : 3;
  return 3;
}

/** Whether a tier is even defined for a context (AAA is not, for non-text). */
export function tierApplies(context: A11yContext, tier: A11yTier): boolean {
  return !(context === "ui-component" && tier === "AAA");
}
