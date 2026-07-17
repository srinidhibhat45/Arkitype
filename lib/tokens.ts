/**
 * Arkitype Token Pipeline.
 * Resolves semantic references ("brand-600") or raw hex values to concrete
 * colours and compiles the entire system state into CSS custom properties.
 * Every preview frame and the stress-test canvas consume these vars — nothing
 * is hardcoded.
 */
import type { CSSProperties } from "react";
import {
  ArkitypeState,
  ColorFamily,
  PreviewMode,
  RADII_NAMES,
  shadowToCss,
  useDesignSystem,
} from "@/store/useDesignSystem";
import { alphaOf, isValidHex, rampStepLabels, withAlpha } from "@/lib/color";
import { generateTypeScale, STEP_DEFS } from "@/lib/typography";

const FALLBACK = "#ff00ff"; // loud magenta = broken reference, on purpose
const MAX_TOKEN_DEPTH = 16; // cycle/blow-up guard for @token → @token chains

interface ColorPrimitives {
  colorFamilies: ColorFamily[];
  colors: Record<string, string[]>;
}

/**
 * Split an optional trailing "/NN" alpha-percent suffix off a reference. So
 * "brand-600/40" → { base: "brand-600", alpha: 40 } (40% opacity), while a
 * plain ref or an 8-digit hex (which carries its own alpha and no slash) passes
 * through untouched. Alpha is clamped to 0–100.
 */
function splitAlpha(ref: string): { base: string; alpha: number | null } {
  const slash = ref.lastIndexOf("/");
  if (slash === -1) return { base: ref, alpha: null };
  const a = Number(ref.slice(slash + 1));
  if (!Number.isFinite(a)) return { base: ref, alpha: null };
  return { base: ref.slice(0, slash), alpha: Math.min(Math.max(a, 0), 100) };
}

/**
 * Resolve a bare primitive reference — a raw hex ("#0af", "#0af8", "#RRGGBBAA")
 * or a "slot-step" reference ("brand-600") — to a concrete hex. No alpha suffix
 * or @token handling (see {@link resolveRef} / {@link resolveTokenValue}).
 * Step labels are per-family, so the index is looked up against that family's
 * label ladder rather than a fixed 50–900 set.
 */
function resolveRefBase(primitives: ColorPrimitives, ref: string): string {
  if (!ref) return FALLBACK;
  if (ref.startsWith("#")) return isValidHex(ref) ? ref : FALLBACK;
  const cut = ref.lastIndexOf("-");
  if (cut === -1) return FALLBACK;
  const slot = ref.slice(0, cut);
  const step = Number(ref.slice(cut + 1));
  const fam = primitives.colorFamilies.find((f) => f.id === slot);
  const ramp = primitives.colors[slot];
  if (!fam || !ramp) return FALLBACK;
  const idx = rampStepLabels(fam.steps).indexOf(step);
  if (idx === -1) return FALLBACK;
  return ramp[idx] ?? FALLBACK;
}

/**
 * Resolve a primitive reference to a concrete hex, honouring an optional "/NN"
 * alpha suffix (→ 8-digit #RRGGBBAA). Does NOT resolve @token references — those
 * need the semantic map, so use {@link resolveTokenValue}/{@link resolveToken}.
 */
export function resolveRef(primitives: ColorPrimitives, ref: string): string {
  if (!ref) return FALLBACK;
  const { base, alpha } = splitAlpha(ref);
  const hex = resolveRefBase(primitives, base);
  return alpha === null ? hex : withAlpha(hex, alpha);
}

/**
 * Resolve any stored colour *value* for a mode — a raw hex, a "slot-step"
 * primitive ref, or an "@token" reference to another named token (semantic or
 * component) — each optionally carrying a "/NN" alpha suffix. @token chains let
 * component tokens point at semantic roles; a depth cap guards against cycles.
 */
export function resolveTokenValue(
  state: Pick<ArkitypeState, "primitives" | "semantics">,
  mode: PreviewMode,
  value: string,
  depth = 0
): string {
  if (!value) return FALLBACK;
  const { base, alpha } = splitAlpha(value);
  let hex: string;
  if (base.startsWith("@")) {
    if (depth >= MAX_TOKEN_DEPTH) return FALLBACK;
    const target = state.semantics.modes[mode][base.slice(1)];
    hex = target === undefined ? FALLBACK : resolveTokenValue(state, mode, target, depth + 1);
  } else {
    hex = resolveRefBase(state.primitives, base);
  }
  return alpha === null ? hex : withAlpha(hex, alpha);
}

/** Resolve a named token (e.g. "surface-base" or a component token) for a mode. */
export function resolveToken(
  state: Pick<ArkitypeState, "primitives" | "semantics">,
  mode: PreviewMode,
  token: string
): string {
  const value = state.semantics.modes[mode][token];
  if (value === undefined) return FALLBACK;
  return resolveTokenValue(state, mode, value);
}

/**
 * The alpha (0–100) a stored value carries — whether inline in an 8-digit hex
 * or as a "/NN" suffix on a ref/@token. Opaque values → 100.
 */
export function alphaOfValue(value: string): number {
  if (!value) return 100;
  const { base, alpha } = splitAlpha(value);
  if (alpha !== null) return alpha;
  return base.startsWith("#") ? alphaOf(base) : 100;
}

/**
 * Apply a 0–100 alpha to a stored value, preserving its form: a raw hex becomes
 * #RRGGBB(AA); a ramp ref or "@token" keeps its link and gains/loses a "/NN"
 * suffix. This is how the colour surface edits transparency without severing a
 * token's binding — matching the "8-digit hex on output" model end to end.
 */
export function applyAlphaToValue(value: string, alphaPct: number): string {
  const pct = Math.min(Math.max(Math.round(alphaPct), 0), 100);
  const { base } = splitAlpha(value);
  if (base.startsWith("#")) return withAlpha(base, pct);
  return pct >= 100 ? base : `${base}/${pct}`;
}

/** Every "--ark-*" custom property for one mode: semantics + scales + type. */
export function systemCssVars(
  state: Pick<ArkitypeState, "primitives" | "semantics">,
  mode: PreviewMode
): CSSProperties {
  const vars: Record<string, string> = {};

  // Semantic color tokens
  for (const token of Object.keys(state.semantics.modes[mode])) {
    vars[`--ark-${token}`] = resolveToken(state, mode, token);
  }

  // Primitive swatches — exposed so a component binding can point straight at a
  // raw ramp step (prim:brand-600 → var(--ark-brand-600)). Mode-independent.
  for (const fam of state.primitives.colorFamilies) {
    const ramp = state.primitives.colors[fam.id] ?? [];
    rampStepLabels(fam.steps).forEach((label, i) => {
      if (ramp[i]) vars[`--ark-${fam.id}-${label}`] = ramp[i];
    });
  }

  // Spacing scale (1-indexed for readability: --ark-space-1 … --ark-space-8)
  state.primitives.spacing.forEach((px, i) => {
    vars[`--ark-space-${i + 1}`] = `${px}px`;
  });

  // Radii
  const radiusNames = state.primitives.radiusNames ?? RADII_NAMES;
  state.primitives.radii.forEach((px, i) => {
    const name = radiusNames[i] || `step-${i}`;
    vars[`--ark-radius-${name}`] = `${px}px`;
  });

  // Typography — sizes, leading and per-step resolved weight
  const t = state.primitives.typography;
  const steps = generateTypeScale(t.baseSize, t.scaleFactor, {
    rounding: t.rounding,
    sizeOverrides: t.sizeOverrides,
    leadingOverrides: t.leadingOverrides,
    stepAssign: t.stepAssign,
  }, t.stepDefs ?? STEP_DEFS);
  const weightValue = (name: string): number =>
    t.weights.find((w) => w.name === name)?.value ?? 400;
  steps.forEach((s) => {
    vars[`--ark-text-${s.name}`] = `${s.size}px`;
    vars[`--ark-leading-${s.name}`] = `${s.lineHeight}`;
    vars[`--ark-weight-${s.name}`] = `${weightValue(s.weight)}`;
    vars[`--ark-font-role-${s.name}`] = `var(--ark-font-${s.role})`;
  });

  // Weight tokens + font-role families
  t.weights.forEach((w) => {
    vars[`--ark-font-weight-${w.name}`] = `${w.value}`;
  });
  Object.entries(t.fontRoles).forEach(([role, r]) => {
    vars[`--ark-font-${role}`] = r.family;
  });
  vars["--ark-font-sans"] = t.fontRoles.body?.family ?? "";

  // Shadows — per mode, compiled from structured definitions
  state.primitives.elevation[mode].forEach((def) => {
    vars[`--ark-shadow-${def.name}`] = shadowToCss(def);
  });

  // Motion
  Object.entries(state.primitives.motion.durations).forEach(([name, ms]) => {
    vars[`--ark-duration-${name}`] = `${ms}ms`;
  });
  state.primitives.motion.easings.forEach((e) => {
    vars[`--ark-ease-${e.name}`] = e.value;
  });

  // Layout breakpoints (exported for reference / container queries)
  Object.entries(state.primitives.layout.breakpoints).forEach(([name, px]) => {
    vars[`--ark-bp-${name}`] = `${px}px`;
  });

  return vars as CSSProperties;
}

/**
 * Tool-chrome token names that are emitted as `--c-*` (see globals.css), NOT as
 * the `--ark-*` design-system vars `tv()` produces. Referencing one here yields
 * an undefined variable, so the element silently falls back to its inherited
 * (often near-black) colour — the "text turns too dark" class of bug. Only DS
 * roles (surface-*, text-*, action-*, border-*, feedback-*) and raw ramp steps
 * (brand-600, error-400 …) are valid tokens.
 */
const CHROME_LEAK = /^(ink-|fg-|c-|bg-|text-(dim|mute)$)/;

/** var() accessor for a semantic token. */
export const tv = (token: string): string => {
  if (process.env.NODE_ENV !== "production" && CHROME_LEAK.test(token)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[arkitype] tv("${token}") is a tool-chrome token — --ark-${token} is never emitted, so this renders as an undefined var. Use a semantic role or ramp step instead.`
    );
  }
  return `var(--ark-${token})`;
};

/** var() accessor for a spacing step (1–8). */
export const sv = (step: number): string => `var(--ark-space-${step})`;

/** var() accessor for a radius step index. */
export const rv = (stepIndex: number): string => {
  const state = typeof useDesignSystem?.getState === "function" ? useDesignSystem.getState() : null;
  const radiusNames = state?.primitives?.radiusNames ?? RADII_NAMES;
  const name = radiusNames[Math.min(Math.max(stepIndex, 0), radiusNames.length - 1)] || "none";
  return `var(--ark-radius-${name})`;
};
