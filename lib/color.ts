/**
 * Arkitype Color Engine — pure TypeScript, zero dependencies.
 *
 * Ramp generation strategy: instead of naive HSL lightness interpolation
 * (which produces perceptually uneven steps across hues), each of the 10
 * steps targets a fixed WCAG relative-luminance value. We binary-search the
 * HSL lightness channel until the produced color's luminance matches the
 * target. Saturation follows a bell curve — desaturated at the extremes,
 * fully saturated through the mid-range — which keeps 50/900 usable as
 * surfaces and 500/600 vivid enough for actions.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number; // 0–360
  s: number; // 0–100
  l: number; // 0–100
}

export const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

/** Canonical 10-step relative-luminance targets (50 → 900). */
const LUMA_TARGETS = [0.93, 0.83, 0.68, 0.5, 0.35, 0.225, 0.14, 0.082, 0.042, 0.018];

/** Canonical 10-step saturation multiplier bell curve. */
const SAT_CURVE = [0.55, 0.68, 0.82, 0.94, 1.0, 1.0, 0.96, 0.9, 0.84, 0.78];

/**
 * Numeric labels for an N-step ramp. 10 → 50…900 and 11 → 50…950 match the
 * Tailwind convention exactly; other counts interpolate a strictly-increasing,
 * round-number ladder so every step keeps a stable, conventional-looking id.
 */
export function rampStepLabels(n: number): number[] {
  const count = Math.max(2, Math.round(n));
  if (count === 10) return [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  if (count === 11) return [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const top = count >= 11 ? 950 : 900;
  const labels: number[] = [50];
  const denom = Math.max(1, count - 2);
  for (let i = 1; i < count; i++) {
    const t = (i - 1) / denom; // 0…1 across the non-anchor steps
    labels.push(Math.round((100 + t * (top - 100)) / 10) * 10);
  }
  for (let i = 1; i < labels.length; i++) {
    if (labels[i] <= labels[i - 1]) labels[i] = labels[i - 1] + 10;
  }
  return labels;
}

/** Resample a canonical 10-length curve to N points via linear interpolation. */
function sampleCurve(curve: number[], n: number): number[] {
  if (n === curve.length) return curve.slice();
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : (i / (n - 1)) * (curve.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(curve.length - 1, lo + 1);
    const f = t - lo;
    out.push(curve[lo] * (1 - f) + curve[hi] * f);
  }
  return out;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function hexToRgb(hex: string): RGB | null {
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const to = (v: number) =>
    Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;
  if (sn === 0) {
    const v = ln * 255;
    return { r: v, g: v, b: v };
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hue2rgb = (t0: number): number => {
    let t = t0;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return {
    r: hue2rgb(hn + 1 / 3) * 255,
    g: hue2rgb(hn) * 255,
    b: hue2rgb(hn - 1 / 3) * 255,
  };
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance({ r, g, b }: RGB): number {
  const chan = (v: number): number => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

/** WCAG 2.1 contrast ratio between two hex colors (1–21). */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return 1;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export interface WcagVerdict {
  ratio: number;
  aa: boolean; // ≥ 4.5:1
  aaa: boolean; // ≥ 7:1
  aaLarge: boolean; // ≥ 3:1
}

export function wcagVerdict(bg: string, fg: string): WcagVerdict {
  const ratio = contrastRatio(bg, fg);
  return {
    ratio: Math.round(ratio * 100) / 100,
    aa: ratio >= 4.5,
    aaa: ratio >= 7,
    aaLarge: ratio >= 3,
  };
}

/** Best readable text color (white or near-black) for a given background. */
export function bestTextOn(bgHex: string): string {
  return contrastRatio(bgHex, "#ffffff") >= contrastRatio(bgHex, "#09090b")
    ? "#ffffff"
    : "#09090b";
}

/**
 * Generate an accessible, perceptually balanced ramp from a seed hex. Hue is
 * preserved; lightness is solved per-step against luminance targets. Defaults
 * to 10 steps; any count resamples the canonical luminance/saturation curves so
 * an 11- or 12-shade ramp stays perceptually even.
 */
export function generateRamp(seedHex: string, stepCount = 10): string[] {
  const rgb = hexToRgb(seedHex) ?? { r: 99, g: 102, b: 241 };
  const { h, s } = rgbToHsl(rgb);
  const targets = sampleCurve(LUMA_TARGETS, stepCount);
  const sats = sampleCurve(SAT_CURVE, stepCount);
  return targets.map((target, i) => {
    const sat = clamp(s * sats[i], 0, 100);
    let lo = 0;
    let hi = 100;
    for (let iter = 0; iter < 24; iter++) {
      const mid = (lo + hi) / 2;
      const y = relativeLuminance(hslToRgb({ h, s: sat, l: mid }));
      if (y < target) lo = mid;
      else hi = mid;
    }
    return rgbToHex(hslToRgb({ h, s: sat, l: (lo + hi) / 2 }));
  });
}

/** Nearest ramp-step index for a seed color (used to anchor 500 display). */
export function nearestStepIndex(seedHex: string): number {
  const rgb = hexToRgb(seedHex);
  if (!rgb) return 5;
  const y = relativeLuminance(rgb);
  let best = 0;
  let bestDist = Infinity;
  LUMA_TARGETS.forEach((t, i) => {
    const d = Math.abs(t - y);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

export function isValidHex(hex: string): boolean {
  return hexToRgb(hex) !== null;
}

/** Rotate a colour's hue by `deg`, preserving saturation and lightness. */
export function rotateHue(hex: string, deg: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const { h, s, l } = rgbToHsl(rgb);
  return rgbToHex(hslToRgb({ h: h + deg, s, l }));
}

export interface HarmonySuggestion {
  name: string;
  hex: string;
}

/**
 * Colour-theory suggestions derived from the user's own brand colour —
 * offered, never imposed. Complementary and analogous/triadic/split
 * rotations preserve the brand's saturation and lightness so every
 * suggestion already "belongs" to the palette.
 */
export function harmonySuggestions(brandHex: string): HarmonySuggestion[] {
  return [
    { name: "Complementary", hex: rotateHue(brandHex, 180) },
    { name: "Analogous −30°", hex: rotateHue(brandHex, -30) },
    { name: "Analogous +30°", hex: rotateHue(brandHex, 30) },
    { name: "Split −150°", hex: rotateHue(brandHex, -150) },
    { name: "Split +150°", hex: rotateHue(brandHex, 150) },
    { name: "Triadic +120°", hex: rotateHue(brandHex, 120) },
  ];
}

/** A near-grey that quietly carries the brand's hue — a "tinted neutral". */
export function tintedNeutral(brandHex: string): string {
  const rgb = hexToRgb(brandHex);
  if (!rgb) return "#71717a";
  const { h } = rgbToHsl(rgb);
  return rgbToHex(hslToRgb({ h, s: 8, l: 48 }));
}

/**
 * Status-colour suggestion: the conventional hue for the role, carrying the
 * brand's saturation so success/warning/error feel like the same family.
 */
export function statusSuggestion(
  brandHex: string,
  role: "success" | "warning" | "error"
): string {
  const rgb = hexToRgb(brandHex);
  const brandSat = rgb ? rgbToHsl(rgb).s : 70;
  const hue = role === "success" ? 148 : role === "warning" ? 38 : 4;
  return rgbToHex(
    hslToRgb({ h: hue, s: clamp(brandSat, 50, 88), l: role === "warning" ? 50 : 45 })
  );
}

/** `rgba(r, g, b, a)` string from a hex + 0–1 alpha (for shadow compilation). */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const a = Math.round(clamp(alpha, 0, 1) * 1000) / 1000;
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${a})`;
}

/** Convert hex to Figma-style normalized RGBA object. */
export function hexToFigmaRgba(
  hex: string
): { r: number; g: number; b: number; a: number } {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  return {
    r: Math.round((rgb.r / 255) * 10000) / 10000,
    g: Math.round((rgb.g / 255) * 10000) / 10000,
    b: Math.round((rgb.b / 255) * 10000) / 10000,
    a: 1,
  };
}
