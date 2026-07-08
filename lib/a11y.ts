// lib/a11y.ts

/** sRGB channel -> linear, per WCAG 2.x */
function linearize(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/** Relative luminance of a #rrggbb hex string, per WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const [R, G, B] = [linearize(r), linearize(g), linearize(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** Contrast ratio between two #rrggbb hex colours, always >= 1. */
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
}

export function checkContrast(hexA: string, hexB: string, context: A11yContext): ContrastCheck {
  const ratio = contrastRatio(hexA, hexB);
  return { ratio: Math.round(ratio * 100) / 100, level: wcagLevel(ratio, context), context };
}
