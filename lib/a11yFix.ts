/**
 * Contrast auto-repair.
 *
 * Given a failing pairing, propose the smallest edit to the *foreground* token
 * that clears a WCAG tier. Two strategies, in order of preference:
 *
 *  1. **Stay on the ramp.** If the token points at a primitive step
 *     ("neutral-500"), walk that family's ladder to the nearest step that
 *     passes. The token keeps its binding, so the fix is a design decision the
 *     system can still re-tune from the seed — not a hardcoded colour.
 *  2. **Solve a hex.** Otherwise hold hue and saturation and move HSL lightness
 *     to the exact luminance the ratio demands, in whichever direction is
 *     closer to where the colour already is.
 *
 * A proposal is always reversible: it carries the value it replaces, which is
 * what the audit's undo writes back.
 */
import {
  ArkitypeState,
  PreviewMode,
  modeBase,
} from "@/store/useDesignSystem";
import {
  contrastRatio,
  hexToRgb,
  hslToRgb,
  rampStepLabels,
  relativeLuminance,
  rgbToHex,
  rgbToHsl,
  type RGB,
} from "@/lib/color";
import {
  alphaOfValue,
  applyAlphaToValue,
  resolveRef,
  resolveToken,
  resolveTokenValue,
} from "@/lib/tokens";
import { A11yTier, flattenOver, thresholdFor } from "@/lib/a11y";
import { derivePairs, type RoleContrastPair } from "@/lib/a11yPairs";

type StateSlice = Pick<ArkitypeState, "primitives" | "semantics">;

export interface ContrastFix {
  mode: PreviewMode;
  /** The token actually written — the end of any "@role" alias chain. */
  token: string;
  /** Stored value being replaced (what undo restores). */
  from: string;
  /** Stored value to write. */
  to: string;
  /** How the value was chosen. */
  via: "ramp" | "hex";
  /** Ratio the pairing reaches once applied. */
  ratio: number;
  /** True when no value could clear the tier without also moving the surface. */
  short: boolean;
}

const MAX_ALIAS_DEPTH = 16;

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * The opaque colour a mode's surfaces sit on.
 *
 * It matters because alpha is composited rather than discarded, and a
 * translucent card has to be blended over *something*. `surface-base` is that
 * something — it is the page. A mode with no such token falls back to the paper
 * its own appearance implies, which is the only other honest answer.
 *
 * Every surface that measures contrast reads this, so the badge on a token row
 * and the row in the audit can't disagree about what is behind the colour.
 */
export function pageBackdrop(state: StateSlice, mode: PreviewMode): string {
  const paper =
    modeBase(state.semantics, mode, state.primitives) === "dark" ? "#000000" : "#ffffff";
  const stored = state.semantics.modes[mode]?.["surface-base"];
  if (typeof stored !== "string" || !stored.trim()) return paper;
  return flattenOver(resolveToken(state, mode, "surface-base"), paper);
}

/**
 * The hex a pairing's background actually is. A declared background carries its
 * value inline (see `RoleContrastPair.bgIsValue`); everything else names a token.
 */
export function pairBackgroundHex(
  state: StateSlice,
  mode: PreviewMode,
  pair: RoleContrastPair
): string {
  return pair.bgIsValue
    ? resolveTokenValue(state, mode, pair.bg)
    : resolveToken(state, mode, pair.bg);
}

/**
 * What a candidate colour is worth at a given opacity, on a given surface.
 *
 * A token at 40% that gets walked to a darker ramp step doesn't arrive at that
 * step's ratio — it arrives at the ratio of the blend. Scoring candidates on
 * their bare hex is how a "fix" lands on a value that still fails.
 */
function ratioAtAlpha(hex: string, againstHex: string, alphaPct: number): number {
  const tinted = alphaPct >= 100 ? hex : withAlphaHex(hex, alphaPct);
  return contrastRatio(flattenOver(tinted, againstHex), againstHex);
}

/** `hex` carrying an 0–100 alpha as #RRGGBBAA — the form `flattenOver` reads.
 *  Goes through `hexToRgb` so a three-digit hex normalises rather than truncates. */
function withAlphaHex(hex: string, alphaPct: number): string {
  const base = rgbToHex(hexToRgb(hex) ?? { r: 0, g: 0, b: 0 });
  const aa = Math.round((Math.min(Math.max(alphaPct, 0), 100) / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${base}${aa}`;
}

/**
 * Follow an "@role" chain to the token that actually holds a value, so a fix
 * lands on the source and every alias pointing at it follows along.
 */
export function terminalToken(state: StateSlice, mode: PreviewMode, token: string): string {
  let current = token;
  for (let depth = 0; depth < MAX_ALIAS_DEPTH; depth++) {
    const value = state.semantics.modes[mode][current];
    if (typeof value !== "string") return current;
    const base = value.split("/")[0];
    if (!base.startsWith("@")) return current;
    const next = base.slice(1);
    if (!next || next === current) return current;
    current = next;
  }
  return current;
}

/** The HSL lightness whose colour hits `targetY` relative luminance, or null. */
function lightnessForLuminance(h: number, s: number, targetY: number): number | null {
  if (targetY < 0 || targetY > 1) return null;
  const yAt = (l: number) => relativeLuminance(hslToRgb({ h, s, l }));
  let lo = 0;
  let hi = 100;
  if (yAt(hi) < targetY) return null;
  if (yAt(lo) > targetY) return null;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (yAt(mid) < targetY) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * A colour derived from `hex` — same hue and saturation — that reaches
 * `target`:1 against `againstHex`. Falls back to whichever extreme (black or
 * white) gets closest when the ratio simply isn't reachable on that surface.
 */
export function solveHexForContrast(
  hex: string,
  againstHex: string,
  target: number,
  alphaPct = 100
): { hex: string; ratio: number; short: boolean } {
  const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
  const bg = hexToRgb(againstHex) ?? { r: 255, g: 255, b: 255 };
  const { h, s, l } = rgbToHsl(rgb);
  const yBg = relativeLuminance(bg);

  // The two luminances that satisfy the ratio — one above the surface, one below.
  const lighterY = target * (yBg + 0.05) - 0.05;
  const darkerY = (yBg + 0.05) / target - 0.05;

  const candidates: number[] = [];
  const up = lightnessForLuminance(h, s, lighterY);
  const down = lightnessForLuminance(h, s, darkerY);
  if (up !== null) candidates.push(up);
  if (down !== null) candidates.push(down);

  if (candidates.length > 0) {
    // Nudge a hair past the boundary so rounding can't land a whisker short.
    const best = candidates.reduce((a, b) => (Math.abs(a - l) <= Math.abs(b - l) ? a : b));
    const nudged = best > l ? Math.min(100, best + 0.4) : Math.max(0, best - 0.4);
    const composite = hslToRgb({ h, s, l: nudged });
    // The lightness above is what the *blend* has to be. At full opacity the
    // token is the blend; below it, the token has to sit further out so that
    // mixing it with the surface lands there — and past a certain opacity no
    // colour is far enough out, which is what the clamp and the honest
    // re-measure below are for.
    const solvedRgb = alphaPct >= 100 ? composite : unmix(composite, bg, alphaPct / 100);
    const solved = rgbToHex(solvedRgb);
    const ratio = round2(ratioAtAlpha(solved, againstHex, alphaPct));
    return { hex: solved, ratio, short: ratio < target };
  }

  // Unreachable on this surface — hand back the best either extreme can do.
  const white = round2(ratioAtAlpha("#ffffff", againstHex, alphaPct));
  const black = round2(ratioAtAlpha("#000000", againstHex, alphaPct));
  return white >= black
    ? { hex: "#ffffff", ratio: white, short: white < target }
    : { hex: "#000000", ratio: black, short: black < target };
}

/**
 * Invert a source-over composite: the colour that, drawn at `alpha` over `bg`,
 * produces `composite`. Channels are clamped, so an unreachable request comes
 * back as the closest legal colour rather than as nonsense — the caller
 * re-measures what it got instead of trusting the arithmetic.
 */
function unmix(composite: RGB, bg: RGB, alpha: number): RGB {
  // A token at zero opacity has no colour that would show; anything is as good
  // as anything else, and dividing by it is how you get NaN into a swatch.
  if (alpha < 0.01) return composite;
  const solve = (c: number, b: number): number =>
    Math.min(Math.max((c - b * (1 - alpha)) / alpha, 0), 255);
  return {
    r: solve(composite.r, bg.r),
    g: solve(composite.g, bg.g),
    b: solve(composite.b, bg.b),
  };
}

/**
 * How many pairings a token takes part in, once "@role" aliases are collapsed.
 * This is what decides which side of a failing pair to move: the token with
 * fewer commitments is the one that can change without dragging the rest of the
 * system with it.
 */
export interface FixContext {
  pairs: RoleContrastPair[];
  degrees: Map<string, number>;
}

export function buildFixContext(
  state: StateSlice,
  mode: PreviewMode,
  extraPairs: RoleContrastPair[] = []
): FixContext {
  const pairs = [...derivePairs(state.semantics.groups), ...extraPairs];
  const degrees = new Map<string, number>();
  for (const pair of pairs) {
    const tokens = [terminalToken(state, mode, pair.fg)];
    // A declared background is a value, not a token — there is nothing there to
    // hold a commitment, and counting it would give the foreground a phantom
    // rival for "which side moves".
    if (!pair.bgIsValue) tokens.push(terminalToken(state, mode, pair.bg));
    for (const token of tokens) degrees.set(token, (degrees.get(token) ?? 0) + 1);
  }
  return { pairs, degrees };
}

/** Split "brand-600" into its family id and step label, if it is one. */
function parseRampRef(
  state: StateSlice,
  base: string
): { familyId: string; step: number } | null {
  if (base.startsWith("#") || base.startsWith("@")) return null;
  const cut = base.lastIndexOf("-");
  if (cut === -1) return null;
  const familyId = base.slice(0, cut);
  const step = Number(base.slice(cut + 1));
  if (!Number.isFinite(step)) return null;
  const fam = state.primitives.colorFamilies.find((f) => f.id === familyId);
  if (!fam) return null;
  return { familyId, step };
}

/**
 * The nearest step in the same family that clears `target` against `bgHex`.
 * "Nearest" is measured in ladder position, so a fix moves as few rungs as it
 * can and the colour stays recognisably the same one.
 */
function nearestPassingStep(
  state: StateSlice,
  familyId: string,
  currentStep: number,
  againstHex: string,
  target: number,
  avoid: Set<string>,
  alphaPct = 100
): { ref: string; ratio: number } | null {
  const fam = state.primitives.colorFamilies.find((f) => f.id === familyId);
  if (!fam) return null;
  const labels = rampStepLabels(fam.steps);
  const currentIdx = labels.indexOf(currentStep);
  const from = currentIdx === -1 ? Math.floor(labels.length / 2) : currentIdx;

  let bestRef = "";
  let bestRatio = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let idx = 0; idx < labels.length; idx++) {
    const ref = `${familyId}-${labels[idx]}`;
    if (avoid.has(ref)) continue;
    const ratio = ratioAtAlpha(resolveRef(state.primitives, ref), againstHex, alphaPct);
    if (ratio < target) continue;
    const distance = Math.abs(idx - from);
    if (distance < bestDistance || (distance === bestDistance && ratio > bestRatio)) {
      bestRef = ref;
      bestRatio = round2(ratio);
      bestDistance = distance;
    }
  }
  return bestRef ? { ref: bestRef, ratio: bestRatio } : null;
}

/**
 * Values a fix must not land on. Repairing `action-primary-hover` by walking it
 * onto whatever `action-primary-default` already holds would satisfy the audit
 * by quietly deleting the hover state — accessible and useless.
 */
function siblingStateValues(state: StateSlice, mode: PreviewMode, token: string): Set<string> {
  const match = token.match(/^(.*)-(default|hover|active|pressed|selected|focus)$/);
  if (!match) return new Set();
  const [, stem] = match;
  const out = new Set<string>();
  for (const [name, value] of Object.entries(state.semantics.modes[mode])) {
    if (name === token) continue;
    if (name.startsWith(`${stem}-`) && typeof value === "string") out.add(value.split("/")[0]);
  }
  return out;
}

/**
 * Propose the edit that lifts `pair` to `tier` in `mode`, or null when it
 * already passes.
 *
 * Which side moves matters more than it looks. Moving the foreground is the
 * obvious choice for "muted text on a surface", but it is the wrong one for
 * "button label on the hover fill": `text-on-action` is pinned by the resting
 * fill and three other pairings, while `action-primary-hover` answers to one.
 * Repairing the shared token there just relocates the failure — and, in a
 * fix-all pass, sends the two constraints thrashing against each other. So the
 * side with fewer commitments moves, and ties fall to the foreground.
 */
export function proposeContrastFix(
  state: StateSlice,
  mode: PreviewMode,
  pair: RoleContrastPair,
  tier: A11yTier,
  context?: FixContext,
  backdrop = "#ffffff"
): ContrastFix | null {
  const target = thresholdFor(pair.context, tier);
  // Both sides are measured as they render: a translucent surface over the page
  // beneath it, then the foreground over that.
  const bgHex = flattenOver(pairBackgroundHex(state, mode, pair), backdrop);
  const fgHex = flattenOver(resolveToken(state, mode, pair.fg), bgHex);
  if (contrastRatio(fgHex, bgHex) >= target) return null;

  const { degrees } = context ?? buildFixContext(state, mode);
  const fgToken = terminalToken(state, mode, pair.fg);
  const bgToken = terminalToken(state, mode, pair.bg);
  // A declared background is a fixed given — the whole point of saying "this
  // has to work on white" is that white doesn't get to move.
  const moveBackground =
    !pair.bgIsValue && (degrees.get(bgToken) ?? 0) < (degrees.get(fgToken) ?? 0);

  const token = moveBackground ? bgToken : fgToken;
  const movingHex = moveBackground ? bgHex : fgHex;
  const anchorHex = moveBackground ? fgHex : bgHex;

  const from = state.semantics.modes[mode][token];
  if (typeof from !== "string" || from === "") return null;

  const alpha = alphaOfValue(from);
  const base = from.split("/")[0];
  const ramp = parseRampRef(state, base);
  const avoid = siblingStateValues(state, mode, token);

  if (ramp) {
    const step = nearestPassingStep(
      state,
      ramp.familyId,
      ramp.step,
      anchorHex,
      target,
      avoid,
      alpha
    );
    if (step) {
      const to = applyAlphaToValue(step.ref, alpha);
      if (to === from) return null;
      return { mode, token, from, to, via: "ramp", ratio: step.ratio, short: false };
    }
  }

  const solved = solveHexForContrast(movingHex, anchorHex, target, alpha);
  const to = applyAlphaToValue(solved.hex, alpha);
  if (to === from) return null;
  return { mode, token, from, to, via: "hex", ratio: solved.ratio, short: solved.short };
}
