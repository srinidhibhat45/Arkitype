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
  TokenKind,
  elevationOf,
  shadowToCss,
  useDesignSystem,
} from "@/store/useDesignSystem";
import { alphaOf, isValidHex, rampStepLabels, withAlpha } from "@/lib/color";
import { generateTypeScale, STEP_DEFS } from "@/lib/typography";

const FALLBACK = "#ff00ff"; // loud magenta = broken reference, on purpose
const MAX_TOKEN_DEPTH = 16; // cycle/blow-up guard for @token → @token chains

/* ────────────────────── what a token carries ────────────────────── */

export type { TokenKind };

/**
 * A token's value grammar, extended past colour.
 *
 * A colour is written bare — "brand-600", "#0af", "@text-primary" — because
 * that's the grammar the file already had and the one every colour surface
 * writes. Everything else carries an explicit prefix, so "radius:md" is a
 * radius no matter what a colour ramp happens to be called:
 *
 *   space:3      radius:md     text:sm      weight:medium    font:body
 *   shadow:low   duration:fast ease:standard px:12
 *
 * The prefixes are deliberately the same ones `lib/binding.ts` uses for
 * component properties — one vocabulary for "point this at that", whichever
 * tier is doing the pointing.
 */
const VALUE_PREFIX: Record<string, TokenKind> = {
  space: "space",
  radius: "radius",
  text: "size",
  weight: "weight",
  font: "font",
  shadow: "shadow",
  duration: "duration",
  ease: "ease",
  px: "dimension",
};

/** The CSS custom-property family each prefix reads from. */
const VALUE_VAR: Record<string, string> = {
  space: "space",
  radius: "radius",
  text: "text",
  weight: "font-weight",
  font: "font",
  shadow: "shadow",
  duration: "duration",
  ease: "ease",
};

/** Split "radius:md" into its prefix and target, or null for a colour value. */
export function splitTypedValue(value: string): { prefix: string; rest: string; kind: TokenKind } | null {
  const cut = (value ?? "").indexOf(":");
  if (cut <= 0) return null;
  const prefix = value.slice(0, cut);
  const kind = VALUE_PREFIX[prefix];
  return kind ? { prefix, rest: value.slice(cut + 1), kind } : null;
}

/** The kind a stored value declares on its own — an alias declares nothing. */
export function valueKind(value: string): TokenKind | "alias" {
  const v = (value ?? "").trim();
  if (v.startsWith("@")) return "alias";
  return splitTypedValue(v)?.kind ?? "color";
}

/**
 * What a named token carries, following "@alias" chains until something says.
 * Colour is the answer when nothing does — an empty or dangling token is a
 * colour, which is what every token in a pre-typed file was.
 */
export function tokenKind(
  state: Pick<ArkitypeState, "semantics">,
  token: string,
  mode?: PreviewMode
): TokenKind {
  const maps = mode
    ? [state.semantics.modes[mode]]
    : Object.values(state.semantics.modes ?? {});
  for (const map of maps) {
    if (!map) continue;
    let cur = token;
    for (let i = 0; i < MAX_TOKEN_DEPTH; i++) {
      const raw = (map[cur] ?? "").trim();
      if (!raw) break;
      const k = valueKind(splitAlpha(raw).base);
      if (k !== "alias") {
        if (k !== "color") return k; // typed: definitive
        break; // colour: keep looking in case another mode is typed
      }
      cur = splitAlpha(raw).base.slice(1);
    }
  }
  return "color";
}

/** The radius index a "radius:" target names — by name or by position. */
function radiusIndex(primitives: ArkitypeState["primitives"], target: string): number {
  const names = primitives.radiusNames ?? [...RADII_NAMES];
  const byName = names.indexOf(target);
  if (byName !== -1) return byName;
  const n = Number(target);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), names.length - 1) : 0;
}

/**
 * A stored value as a CSS value — the one function that covers every kind.
 *
 * Colours resolve all the way to a hex (the contrast audit and every swatch
 * need a concrete colour). Everything else resolves to the `var()` of the
 * primitive it points at, so a radius token re-reads its scale the moment the
 * scale changes, exactly like a bound component property does.
 */
export function resolveTokenCss(
  state: Pick<ArkitypeState, "primitives" | "semantics">,
  mode: PreviewMode,
  value: string,
  depth = 0
): string {
  const raw = (value ?? "").trim();
  if (!raw) return FALLBACK;

  if (raw.startsWith("@")) {
    if (depth >= MAX_TOKEN_DEPTH) return FALLBACK;
    const target = raw.slice(1);
    // An alias to a non-colour token is a var() hop; a colour alias still
    // resolves to a hex so alpha suffixes and swatches keep working.
    return tokenKind(state, target, mode) === "color"
      ? resolveTokenValue(state, mode, raw, depth)
      : `var(--ark-${splitAlpha(target).base})`;
  }

  const typed = splitTypedValue(raw);
  if (!typed) return resolveTokenValue(state, mode, raw, depth);

  switch (typed.prefix) {
    case "px":
      return `${Number(typed.rest) || 0}px`;
    case "radius": {
      const names = state.primitives.radiusNames ?? [...RADII_NAMES];
      return `var(--ark-radius-${names[radiusIndex(state.primitives, typed.rest)]})`;
    }
    case "space": {
      const i = Math.min(Math.max(Number(typed.rest) || 1, 1), state.primitives.spacing.length);
      return `var(--ark-space-${i})`;
    }
    default:
      return `var(--ark-${VALUE_VAR[typed.prefix]}-${typed.rest})`;
  }
}

/**
 * The value that *freezes* a token where it currently stands — what "unlink,
 * keep what it looks like now" writes, so cutting a link never changes the
 * rendering by a pixel.
 *
 * A colour freezes to its hex, and anything measured in px freezes to those px.
 * A weight, a family, an easing has no literal form in the grammar, so there's
 * nothing to freeze to and the caller is told so rather than handed a lie.
 */
export function freezeTokenValue(
  state: Pick<ArkitypeState, "primitives" | "semantics">,
  mode: PreviewMode,
  token: string
): string | null {
  const value = state.semantics.modes[mode]?.[token] ?? "";
  const kind = tokenKind(state, token, mode);
  if (kind === "color") return resolveTokenValue(state, mode, value);
  if (kind !== "space" && kind !== "radius" && kind !== "size" && kind !== "dimension") return null;
  const px = parseFloat(describeTokenValue(state.primitives, resolveTypedThrough(state, mode, value)));
  return Number.isFinite(px) ? `px:${px}` : null;
}

/** Follow "@alias" hops to the typed value at the end of the chain. */
function resolveTypedThrough(
  state: Pick<ArkitypeState, "semantics">,
  mode: PreviewMode,
  value: string
): string {
  let cur = (value ?? "").trim();
  for (let i = 0; i < MAX_TOKEN_DEPTH && cur.startsWith("@"); i++) {
    cur = (state.semantics.modes[mode]?.[splitAlpha(cur).base.slice(1)] ?? "").trim();
  }
  return cur;
}

/**
 * The same value as something a person can read — "8px", "600", "Inter". Used
 * wherever a row has to *state* its value rather than apply it, since a cell
 * reading "var(--ark-space-3)" answers a question nobody asked.
 */
export function describeTokenValue(
  primitives: ArkitypeState["primitives"],
  value: string
): string {
  const typed = splitTypedValue((value ?? "").trim());
  if (!typed) return "";
  switch (typed.prefix) {
    case "px":
      return `${Number(typed.rest) || 0}px`;
    case "space": {
      const px = primitives.spacing[Math.max(1, Number(typed.rest) || 1) - 1];
      return px === undefined ? "—" : `${px}px`;
    }
    case "radius": {
      const px = primitives.radii[radiusIndex(primitives, typed.rest)];
      return px === undefined ? "—" : px >= 9999 ? "full" : `${px}px`;
    }
    case "text": {
      const t = primitives.typography;
      const step = generateTypeScale(
        t.baseSize,
        t.scaleFactor,
        {
          rounding: t.rounding,
          sizeOverrides: t.sizeOverrides,
          leadingOverrides: t.leadingOverrides,
          stepAssign: t.stepAssign,
        },
        t.stepDefs ?? STEP_DEFS
      ).find((s) => s.name === typed.rest);
      return step ? `${step.size}px` : "—";
    }
    case "weight":
      return String(
        primitives.typography.weights.find((w) => w.name === typed.rest)?.value ?? "—"
      );
    case "font":
      return (
        primitives.typography.fontRoles[typed.rest]?.family.split(",")[0].trim() ?? "—"
      );
    case "duration": {
      const ms = (primitives.motion.durations as Record<string, number>)[typed.rest];
      return ms === undefined ? "—" : `${ms}ms`;
    }
    case "ease":
      return primitives.motion.easings.find((e) => e.name === typed.rest)?.value ?? "—";
    case "shadow":
      // The chip already reads "shadow-low"; repeating the level as its own
      // detail would state the same fact twice.
      return "";
    default:
      return "";
  }
}

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
export function splitAlpha(ref: string): { base: string; alpha: number | null } {
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
    const target = state.semantics.modes[mode]?.[base.slice(1)];
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
  const value = state.semantics.modes[mode]?.[token];
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

  // Semantic tokens. Most are colours; a token that declares another type
  // (radius:md, space:3, text:sm…) emits that type's value instead, so a
  // component token can carry a component's shape and rhythm as well as its
  // ink — same map, same cascade, same per-mode column.
  for (const [token, value] of Object.entries(state.semantics.modes[mode] ?? {})) {
    vars[`--ark-${token}`] = resolveTokenCss(state, mode, value);
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

  // Shadows — compiled from structured definitions. Every mode owns its ramp
  // (a mode with none yet reads the one matching its appearance).
  elevationOf(state.primitives, state.semantics, mode).forEach((def) => {
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
