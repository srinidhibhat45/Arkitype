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
} from "@/store/useDesignSystem";
import { isValidHex, rampStepLabels } from "@/lib/color";
import { generateTypeScale } from "@/lib/typography";

const FALLBACK = "#ff00ff"; // loud magenta = broken reference, on purpose

interface ColorPrimitives {
  colorFamilies: ColorFamily[];
  colors: Record<string, string[]>;
}

/**
 * Resolve a value that is either a raw hex ("#0af") or a "slot-step" reference
 * ("brand-600") to a concrete hex. Step labels are per-family, so the index is
 * looked up against that family's label ladder rather than a fixed 50–900 set.
 */
export function resolveRef(primitives: ColorPrimitives, ref: string): string {
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

/** Resolve a semantic token (e.g. "surface-base") for a given mode. */
export function resolveToken(
  state: Pick<ArkitypeState, "primitives" | "semantics">,
  mode: PreviewMode,
  token: string
): string {
  const value = state.semantics.modes[mode][token];
  if (!value) return FALLBACK;
  return resolveRef(state.primitives, value);
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
  state.primitives.radii.forEach((px, i) => {
    vars[`--ark-radius-${RADII_NAMES[i]}`] = `${px}px`;
  });

  // Typography — sizes, leading and per-step resolved weight
  const t = state.primitives.typography;
  const steps = generateTypeScale(t.baseSize, t.scaleFactor, {
    rounding: t.rounding,
    sizeOverrides: t.sizeOverrides,
    leadingOverrides: t.leadingOverrides,
    stepAssign: t.stepAssign,
  });
  const weightValue = (name: string): number =>
    t.weights.find((w) => w.name === name)?.value ?? 400;
  steps.forEach((s) => {
    vars[`--ark-text-${s.name}`] = `${s.size}px`;
    vars[`--ark-leading-${s.name}`] = `${s.lineHeight}`;
    vars[`--ark-weight-${s.name}`] = `${weightValue(s.weight)}`;
  });

  // Weight tokens + font-role families (with back-compat sans/mono aliases)
  t.weights.forEach((w) => {
    vars[`--ark-font-weight-${w.name}`] = `${w.value}`;
  });
  vars["--ark-font-display"] = t.fontRoles.display.family;
  vars["--ark-font-heading"] = t.fontRoles.heading.family;
  vars["--ark-font-body"] = t.fontRoles.body.family;
  vars["--ark-font-mono"] = t.fontRoles.mono.family;
  vars["--ark-font-sans"] = t.fontRoles.body.family;

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

/** var() accessor for a semantic token. */
export const tv = (token: string): string => `var(--ark-${token})`;

/** var() accessor for a spacing step (1–8). */
export const sv = (step: number): string => `var(--ark-space-${step})`;

/** var() accessor for a radius step index (0–7). */
export const rv = (stepIndex: number): string =>
  `var(--ark-radius-${RADII_NAMES[Math.min(Math.max(stepIndex, 0), RADII_NAMES.length - 1)]})`;
