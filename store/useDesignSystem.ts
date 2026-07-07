/**
 * Arkitype Core State Engine.
 * ONE deep tree: primitives → semantics → components → journey. Every step
 * screen reads and mutates this store — no siloed page state for core data.
 * Persisted to localStorage so the build survives reloads.
 *
 * Design principle: every scale keeps a *generator* (seed→ramp, base→spacing,
 * base×ratio→type) so changing one input re-tunes the whole scale — but a sparse
 * `overrides` layer sits on top, so any single value can be pinned by hand
 * without regenerating its siblings. Collections (colour families, semantic
 * roles, elevation levels) are editable arrays, not fixed constants.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { generateRamp, hexToRgba, isValidHex, rampStepLabels } from "@/lib/color";
import { generateTypeScale, FontRoleId, RoundingMode } from "@/lib/typography";

/* ────────────────────────────── vocabulary ────────────────────────────── */

/** Colour families are now dynamic — the id is any stable slug, not a union. */
export type ColorSlotId = string;

export interface ColorFamily {
  id: string; // stable slug: "brand", "neutral", "neutral-warm"
  name: string; // display label
  seed: string; // hex
  steps: number; // configurable shade count (default 10)
  overrides: Record<number, string>; // {600: "#..."} — per-swatch hand-edit
}

/** Default family ids. Screens iterate `primitives.colorFamilies` at runtime;
 *  this stays exported for the handful of call-sites that seed from defaults. */
export const COLOR_SLOTS: string[] = [
  "brand",
  "secondary",
  "neutral",
  "success",
  "warning",
  "error",
];

export type PreviewMode = "light" | "dark";

/** Appearance of the tool itself (chrome), independent of the preview mode. */
export type ChromeTheme = "light" | "dark";

/* ── The build order. This IS the product's information architecture. ── */

export type StepId =
  | "colour"
  | "type"
  | "space"
  | "shape"
  | "motion"
  | "roles"
  | "components"
  | "preview"
  | "ship";

// Roles is no longer its own stop — it's a tab inside the Colour section (they
// are the same colour concern: primitives, then the semantic roles onto them).
export const STEP_ORDER: StepId[] = [
  "colour",
  "type",
  "space",
  "shape",
  "motion",
  "components",
  "preview",
  "ship",
];

export const STEP_META: Record<
  StepId,
  { n: string; label: string; blurb: string }
> = {
  colour: { n: "01", label: "Colour & roles", blurb: "Palette primitives and the semantic roles mapped onto them" },
  type: { n: "02", label: "Typography", blurb: "Scale, weights, font roles" },
  space: { n: "03", label: "Spacing & layout", blurb: "Rhythm and breakpoints" },
  shape: { n: "04", label: "Shape & elevation", blurb: "Radius and depth" },
  motion: { n: "05", label: "Motion", blurb: "Durations and easing curves" },
  // roles: merged into the Colour section as a tab; kept as a StepId so bindings
  // can still name it as a jump target. Not a rail stop, so `n` is unused.
  roles: { n: "", label: "Roles", blurb: "Meaning mapped onto values" },
  components: { n: "06", label: "Components", blurb: "Parts assembled from roles" },
  preview: { n: "07", label: "Preview", blurb: "Stress-test on a real product" },
  ship: { n: "08", label: "Ship", blurb: "Figma bundle and handoff docs" },
};

export function nextStep(step: StepId): StepId | null {
  const i = STEP_ORDER.indexOf(step);
  return i >= 0 && i < STEP_ORDER.length - 1 ? STEP_ORDER[i + 1] : null;
}

export function prevStep(step: StepId): StepId | null {
  const i = STEP_ORDER.indexOf(step);
  return i > 0 ? STEP_ORDER[i - 1] : null;
}

/* ────────────────────────────── semantic roles ────────────────────────── */

export interface SemanticGroup {
  label: string;
  tokens: string[];
}

/** Seed groups — now stored in state (semantics.groups) so they're editable. */
export const DEFAULT_SEMANTIC_GROUPS: SemanticGroup[] = [
  {
    label: "Surface",
    tokens: [
      "surface-base",
      "surface-elevated",
      "surface-subtle",
      "surface-sunken",
      "surface-overlay",
    ],
  },
  {
    label: "Text",
    tokens: [
      "text-primary",
      "text-secondary",
      "text-muted",
      "text-on-action",
      "text-link",
      "text-link-hover",
    ],
  },
  {
    label: "Action",
    tokens: [
      "action-primary-default",
      "action-primary-hover",
      "action-primary-active",
      "action-primary-disabled",
      "action-secondary-default",
      "action-secondary-hover",
      "action-secondary-active",
    ],
  },
  {
    label: "Border",
    tokens: ["border-default", "border-muted", "border-strong", "border-focus"],
  },
  {
    label: "Feedback — Info",
    tokens: ["feedback-info-surface", "feedback-info-text", "feedback-info-border"],
  },
  {
    label: "Feedback — Success",
    tokens: [
      "feedback-success-surface",
      "feedback-success-text",
      "feedback-success-border",
    ],
  },
  {
    label: "Feedback — Warning",
    tokens: [
      "feedback-warning-surface",
      "feedback-warning-text",
      "feedback-warning-border",
    ],
  },
  {
    label: "Feedback — Error",
    tokens: [
      "feedback-error-surface",
      "feedback-error-text",
      "feedback-error-border",
    ],
  },
];

/* Back-compat export: some screens still read a flat groups constant. */
export const SEMANTIC_GROUPS: ReadonlyArray<SemanticGroup> = DEFAULT_SEMANTIC_GROUPS;

export const ALL_SEMANTIC_TOKENS: string[] = DEFAULT_SEMANTIC_GROUPS.flatMap(
  (g) => g.tokens
);

/* ────────────────────────────── scales ────────────────────────────── */

export const DEFAULT_SPACING_MULTIPLIERS = [1, 2, 3, 4, 6, 8, 12, 16];
export const SPACING_MULTIPLIERS = DEFAULT_SPACING_MULTIPLIERS; // back-compat
export const BASE_RADII = [0, 2, 4, 8, 12, 16, 24, 9999] as const;
export const RADII_NAMES = [
  "none",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "full",
] as const;

export const DURATION_NAMES = ["fast", "base", "slow"] as const;
export type DurationName = (typeof DURATION_NAMES)[number];

export const BREAKPOINT_NAMES = ["sm", "md", "lg", "xl"] as const;
export type BreakpointName = (typeof BREAKPOINT_NAMES)[number];

/* ── Elevation: structured, per-mode shadow definitions ── */

export interface ShadowDef {
  name: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string; // hex
  opacity: number; // 0–1
}

export type ShadowField = "x" | "y" | "blur" | "spread" | "opacity";

export interface ElevationTokens {
  light: ShadowDef[];
  dark: ShadowDef[];
}

/** Compile a shadow definition to a CSS box-shadow string. */
export function shadowToCss(def: ShadowDef): string {
  if (def.opacity <= 0 || (def.blur === 0 && def.spread === 0 && def.y === 0 && def.x === 0)) {
    return "none";
  }
  return `${def.x}px ${def.y}px ${def.blur}px ${def.spread}px ${hexToRgba(
    def.color,
    def.opacity
  )}`;
}

const DEFAULT_ELEVATION: ElevationTokens = {
  light: [
    { name: "flat", x: 0, y: 0, blur: 0, spread: 0, color: "#0f172a", opacity: 0 },
    { name: "low", x: 0, y: 1, blur: 2, spread: 0, color: "#0f172a", opacity: 0.1 },
    { name: "medium", x: 0, y: 4, blur: 12, spread: -2, color: "#0f172a", opacity: 0.14 },
    { name: "high", x: 0, y: 16, blur: 40, spread: -8, color: "#0f172a", opacity: 0.2 },
  ],
  dark: [
    { name: "flat", x: 0, y: 0, blur: 0, spread: 0, color: "#09090b", opacity: 0 },
    { name: "low", x: 0, y: 1, blur: 2, spread: 0, color: "#09090b", opacity: 0.28 },
    { name: "medium", x: 0, y: 4, blur: 12, spread: -2, color: "#09090b", opacity: 0.38 },
    { name: "high", x: 0, y: 16, blur: 40, spread: -8, color: "#09090b", opacity: 0.55 },
  ],
};

export interface EasingToken {
  name: string;
  value: string;
}

export interface MotionTokens {
  durations: Record<DurationName, number>; // ms
  easings: EasingToken[];
}

export interface LayoutTokens {
  breakpoints: Record<BreakpointName, number>; // px
}

const DEFAULT_MOTION: MotionTokens = {
  durations: { fast: 120, base: 240, slow: 400 },
  easings: [
    { name: "linear", value: "linear" },
    { name: "out", value: "cubic-bezier(0.16, 1, 0.3, 1)" },
    { name: "in-out", value: "cubic-bezier(0.65, 0, 0.35, 1)" },
    { name: "spring", value: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  ],
};

const DEFAULT_LAYOUT: LayoutTokens = {
  breakpoints: { sm: 640, md: 768, lg: 1024, xl: 1280 },
};

/* ── Typography ── */

export interface WeightToken {
  name: string;
  value: number;
}

export interface FontRole {
  family: string;
  weight: string; // references a weight-token name
}

export interface TypographyTokens {
  baseSize: number;
  scaleFactor: number;
  rounding: RoundingMode;
  weights: WeightToken[];
  fontRoles: Record<FontRoleId, FontRole>;
  families: { sans: string; mono: string }; // back-compat mirror of body/mono
  sizeOverrides: Record<string, number>;
  leadingOverrides: Record<string, number>;
  stepAssign: Record<string, { role: FontRoleId; weight: string }>;
}

const INTER = "Inter, -apple-system, BlinkMacSystemFont, sans-serif";
const MONO = "ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace";

const DEFAULT_WEIGHTS: WeightToken[] = [
  { name: "regular", value: 400 },
  { name: "medium", value: 500 },
  { name: "semibold", value: 600 },
  { name: "bold", value: 700 },
];

const DEFAULT_TYPOGRAPHY: TypographyTokens = {
  baseSize: 16,
  scaleFactor: 1.25,
  rounding: "integer",
  weights: DEFAULT_WEIGHTS,
  fontRoles: {
    display: { family: INTER, weight: "bold" },
    heading: { family: INTER, weight: "semibold" },
    body: { family: INTER, weight: "regular" },
    mono: { family: MONO, weight: "regular" },
  },
  families: { sans: INTER, mono: MONO },
  sizeOverrides: {},
  leadingOverrides: {},
  stepAssign: {},
};

/* ────────────────────────────── builders ────────────────────────────── */

const buildSpacing = (
  base: number,
  multipliers: number[],
  overrides: Record<number, number>
): number[] =>
  multipliers.map((m, i) =>
    typeof overrides[i] === "number" ? overrides[i] : Math.round(m * base)
  );

const buildRadii = (
  scale: number,
  overrides: Record<number, number>
): number[] =>
  BASE_RADII.map((r, i) =>
    typeof overrides[i] === "number"
      ? overrides[i]
      : r === 0 || r === 9999
        ? r
        : Math.round(r * scale * 100) / 100
  );

/** Resolve a family's ramp (generated shades, then per-swatch overrides). */
export function familyRamp(family: ColorFamily): string[] {
  const labels = rampStepLabels(family.steps);
  const generated = generateRamp(family.seed, family.steps);
  return labels.map((label, i) =>
    family.overrides[label] ?? generated[i] ?? "#000000"
  );
}

const buildColors = (families: ColorFamily[]): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const f of families) out[f.id] = familyRamp(f);
  return out;
};

const buildSeeds = (families: ColorFamily[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const f of families) out[f.id] = f.seed;
  return out;
};

const cloneShadows = (defs: ShadowDef[]): ShadowDef[] =>
  defs.map((d) => ({ ...d }));

/* ────────────────────────────── state shape ────────────────────────────── */

export interface ComponentConfig {
  skeletonId: string;
  properties: Record<string, string | number | boolean>;
  /** Per-part/per-state overrides — maps a schema property key to a binding
   *  string (see lib/binding.ts). Empty means "render from defaults". */
  bindings?: Record<string, string>;
}

export interface ArkitypeState {
  meta: { name: string; started: boolean };
  journey: {
    activeStep: StepId;
    done: Partial<Record<StepId, boolean>>;
    visited: Partial<Record<StepId, boolean>>;
  };
  primitives: {
    colorFamilies: ColorFamily[];
    seeds: Record<string, string>; // derived cache
    colors: Record<string, string[]>; // derived cache (resolved w/ overrides)
    spacingBase: number;
    spacingMultipliers: number[];
    spacingOverrides: Record<number, number>;
    spacing: number[]; // derived cache
    radiusScale: number;
    radiusOverrides: Record<number, number>;
    radii: number[]; // derived cache
    typography: TypographyTokens;
    elevation: ElevationTokens;
    motion: MotionTokens;
    layout: LayoutTokens;
  };
  semantics: {
    groups: SemanticGroup[];
    modes: {
      light: Record<string, string>;
      dark: Record<string, string>;
    };
  };
  components: Record<string, ComponentConfig>;
  currentPreviewMode: PreviewMode;
  /** Light/dark appearance of the tool chrome (not the component preview). */
  chromeTheme: ChromeTheme;
  canvasZoom: number;
  /** Transient "jump here and highlight X" target — never persisted. */
  pendingFocus: { step: StepId; anchor: string } | null;

  /* actions */
  startSystem: (name: string, brandHex: string) => void;
  setSystemName: (name: string) => void;
  goToStep: (step: StepId) => void;
  completeStep: (step: StepId) => void;
  setPendingFocus: (target: { step: StepId; anchor: string } | null) => void;

  /* colour */
  setSeed: (slot: string, hex: string) => void;
  addFamily: () => void;
  removeFamily: (id: string) => void;
  renameFamily: (id: string, name: string) => void;
  setFamilySteps: (id: string, steps: number) => void;
  setFamilyOverride: (id: string, label: number, hex: string) => void;
  clearFamilyOverride: (id: string, label: number) => void;

  /* spacing / radii */
  setSpacingBase: (base: number) => void;
  setSpacingMultiplier: (index: number, multiplier: number) => void;
  setSpacingOverride: (index: number, px: number) => void;
  clearSpacingOverride: (index: number) => void;
  addSpacingStep: () => void;
  removeSpacingStep: (index: number) => void;
  setRadiusScale: (scale: number) => void;
  setRadiusOverride: (index: number, px: number) => void;
  clearRadiusOverride: (index: number) => void;

  /* typography */
  setTypographyBase: (size: number) => void;
  setScaleFactor: (factor: number) => void;
  setRounding: (mode: RoundingMode) => void;
  setFontFamily: (kind: "sans" | "mono", value: string) => void;
  setFontRole: (role: FontRoleId, patch: Partial<FontRole>) => void;
  addWeight: () => void;
  setWeight: (index: number, patch: Partial<WeightToken>) => void;
  removeWeight: (index: number) => void;
  setTypeSizeOverride: (step: string, px: number) => void;
  clearTypeSizeOverride: (step: string) => void;
  setTypeLeadingOverride: (step: string, value: number) => void;
  clearTypeLeadingOverride: (step: string) => void;
  setStepAssign: (step: string, patch: { role?: FontRoleId; weight?: string }) => void;

  /* elevation */
  setShadowField: (mode: PreviewMode, index: number, field: ShadowField, value: number) => void;
  setShadowColor: (mode: PreviewMode, index: number, hex: string) => void;
  renameLevel: (index: number, name: string) => void;
  addLevel: () => void;
  removeLevel: (index: number) => void;

  /* motion / layout */
  setMotionDuration: (name: DurationName, ms: number) => void;
  setEasing: (index: number, value: string) => void;
  setBreakpoint: (name: BreakpointName, px: number) => void;

  /* roles */
  setSemantic: (mode: PreviewMode, token: string, value: string) => void;
  addRole: (groupLabel: string, token: string) => void;
  removeRole: (token: string) => void;
  addGroup: (label: string) => void;

  /* components */
  setComponentSkeleton: (componentId: string, skeletonId: string) => void;
  setComponentProperty: (
    componentId: string,
    key: string,
    value: string | number | boolean
  ) => void;
  setComponentBinding: (componentId: string, key: string, binding: string) => void;
  clearComponentBinding: (componentId: string, key: string) => void;
  resetComponentBindings: (componentId: string) => void;

  setPreviewMode: (mode: PreviewMode) => void;
  togglePreviewMode: () => void;
  setChromeTheme: (theme: ChromeTheme) => void;
  toggleChromeTheme: () => void;
  setCanvasZoom: (zoom: number) => void;
}

/* ────────────────────────────── defaults ────────────────────────────── */

const DEFAULT_FAMILIES: ColorFamily[] = [
  { id: "brand", name: "Brand", seed: "#4f46e5", steps: 10, overrides: {} },
  { id: "secondary", name: "Secondary", seed: "#06b6d4", steps: 10, overrides: {} },
  { id: "neutral", name: "Neutral", seed: "#71717a", steps: 10, overrides: {} },
  { id: "success", name: "Success", seed: "#22c55e", steps: 10, overrides: {} },
  { id: "warning", name: "Warning", seed: "#f59e0b", steps: 10, overrides: {} },
  { id: "error", name: "Error", seed: "#ef4444", steps: 10, overrides: {} },
];

const cloneFamilies = (fams: ColorFamily[]): ColorFamily[] =>
  fams.map((f) => ({ ...f, overrides: { ...f.overrides } }));

const DEFAULT_LIGHT: Record<string, string> = {
  "surface-base": "neutral-50",
  "surface-elevated": "neutral-100",
  "surface-subtle": "neutral-200",
  "surface-sunken": "neutral-200",
  "surface-overlay": "neutral-900",
  "text-primary": "neutral-900",
  "text-secondary": "neutral-700",
  "text-muted": "neutral-500",
  "text-on-action": "neutral-50",
  "text-link": "brand-600",
  "text-link-hover": "brand-700",
  "action-primary-default": "brand-600",
  "action-primary-hover": "brand-700",
  "action-primary-active": "brand-800",
  "action-primary-disabled": "neutral-300",
  "action-secondary-default": "neutral-200",
  "action-secondary-hover": "neutral-300",
  "action-secondary-active": "neutral-400",
  "border-default": "neutral-300",
  "border-muted": "neutral-200",
  "border-strong": "neutral-400",
  "border-focus": "brand-500",
  "feedback-info-surface": "secondary-50",
  "feedback-info-text": "secondary-800",
  "feedback-info-border": "secondary-200",
  "feedback-success-surface": "success-50",
  "feedback-success-text": "success-800",
  "feedback-success-border": "success-200",
  "feedback-warning-surface": "warning-50",
  "feedback-warning-text": "warning-800",
  "feedback-warning-border": "warning-200",
  "feedback-error-surface": "error-50",
  "feedback-error-text": "error-800",
  "feedback-error-border": "error-200",
};

const DEFAULT_DARK: Record<string, string> = {
  "surface-base": "neutral-900",
  "surface-elevated": "neutral-800",
  "surface-subtle": "neutral-700",
  "surface-sunken": "neutral-900",
  "surface-overlay": "neutral-50",
  "text-primary": "neutral-50",
  "text-secondary": "neutral-200",
  "text-muted": "neutral-400",
  "text-on-action": "neutral-50",
  "text-link": "brand-400",
  "text-link-hover": "brand-300",
  "action-primary-default": "brand-500",
  "action-primary-hover": "brand-400",
  "action-primary-active": "brand-300",
  "action-primary-disabled": "neutral-700",
  "action-secondary-default": "neutral-700",
  "action-secondary-hover": "neutral-600",
  "action-secondary-active": "neutral-500",
  "border-default": "neutral-700",
  "border-muted": "neutral-800",
  "border-strong": "neutral-600",
  "border-focus": "brand-400",
  "feedback-info-surface": "secondary-900",
  "feedback-info-text": "secondary-100",
  "feedback-info-border": "secondary-700",
  "feedback-success-surface": "success-900",
  "feedback-success-text": "success-100",
  "feedback-success-border": "success-700",
  "feedback-warning-surface": "warning-900",
  "feedback-warning-text": "warning-100",
  "feedback-warning-border": "warning-700",
  "feedback-error-surface": "error-900",
  "feedback-error-text": "error-100",
  "feedback-error-border": "error-700",
};

const DEFAULT_COMPONENTS: Record<string, ComponentConfig> = {
  /* patterns with structural skeletons */
  modal: { skeletonId: "1", properties: { radiusStep: 4 } },
  tabs: { skeletonId: "1", properties: { radiusStep: 2 } },
  table: { skeletonId: "1", properties: { radiusStep: 2 } },
  /* controls */
  button: { skeletonId: "1", properties: { size: "md", radiusStep: 2 } },
  iconButton: { skeletonId: "1", properties: { size: "md", radiusStep: 2 } },
  buttonGroup: { skeletonId: "1", properties: { radiusStep: 2 } },
  input: { skeletonId: "1", properties: { size: "md", radiusStep: 2 } },
  textarea: { skeletonId: "1", properties: { size: "md", radiusStep: 2 } },
  select: { skeletonId: "1", properties: { size: "md", radiusStep: 2 } },
  searchField: { skeletonId: "1", properties: { size: "md", radiusStep: 2 } },
  checkbox: { skeletonId: "1", properties: { radiusStep: 1 } },
  radio: { skeletonId: "1", properties: {} },
  switch: { skeletonId: "1", properties: {} },
  slider: { skeletonId: "1", properties: { radiusStep: 7 } },
  stepper: { skeletonId: "1", properties: { size: "md", radiusStep: 2 } },
  /* display & feedback */
  alert: { skeletonId: "1", properties: { radiusStep: 3 } },
  toast: { skeletonId: "1", properties: { radiusStep: 3 } },
  badge: { skeletonId: "1", properties: { radiusStep: 7 } },
  tag: { skeletonId: "1", properties: { radiusStep: 2 } },
  avatar: { skeletonId: "1", properties: { radiusStep: 7 } },
  tooltip: { skeletonId: "1", properties: { radiusStep: 2 } },
  progress: { skeletonId: "1", properties: { radiusStep: 7 } },
  spinner: { skeletonId: "1", properties: {} },
  skeleton: { skeletonId: "1", properties: { radiusStep: 2 } },
  stat: { skeletonId: "1", properties: {} },
  divider: { skeletonId: "1", properties: {} },
  kbd: { skeletonId: "1", properties: {} },
  emptyState: { skeletonId: "1", properties: { radiusStep: 4 } },
  codeBlock: { skeletonId: "1", properties: { radiusStep: 3 } },
  /* navigation */
  navbar: { skeletonId: "1", properties: { radiusStep: 7 } },
  sidebar: { skeletonId: "1", properties: { radiusStep: 2 } },
  breadcrumbs: { skeletonId: "1", properties: {} },
  steps: { skeletonId: "1", properties: {} },
  pagination: { skeletonId: "1", properties: { radiusStep: 2 } },
  dropdown: { skeletonId: "1", properties: { radiusStep: 3 } },
  link: { skeletonId: "1", properties: {} },
  /* composition patterns */
  card: { skeletonId: "1", properties: { radiusStep: 4 } },
  listItem: { skeletonId: "1", properties: { radiusStep: 4 } },
  feedItem: { skeletonId: "1", properties: { radiusStep: 4 } },
  accordion: { skeletonId: "1", properties: { radiusStep: 3 } },
  banner: { skeletonId: "1", properties: { radiusStep: 3 } },
  field: { skeletonId: "1", properties: { radiusStep: 2 } },
  statGrid: { skeletonId: "1", properties: { radiusStep: 4 } },
};

/* ── helpers for dynamic ids / uniqueness ── */

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "family";

function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

/* ────────────────────────────── store ────────────────────────────── */

function freshPrimitives(): ArkitypeState["primitives"] {
  const families = cloneFamilies(DEFAULT_FAMILIES);
  const spacingMultipliers = [...DEFAULT_SPACING_MULTIPLIERS];
  return {
    colorFamilies: families,
    seeds: buildSeeds(families),
    colors: buildColors(families),
    spacingBase: 4,
    spacingMultipliers,
    spacingOverrides: {},
    spacing: buildSpacing(4, spacingMultipliers, {}),
    radiusScale: 1,
    radiusOverrides: {},
    radii: buildRadii(1, {}),
    typography: JSON.parse(JSON.stringify(DEFAULT_TYPOGRAPHY)) as TypographyTokens,
    elevation: {
      light: cloneShadows(DEFAULT_ELEVATION.light),
      dark: cloneShadows(DEFAULT_ELEVATION.dark),
    },
    motion: JSON.parse(JSON.stringify(DEFAULT_MOTION)) as MotionTokens,
    layout: JSON.parse(JSON.stringify(DEFAULT_LAYOUT)) as LayoutTokens,
  };
}

export const useDesignSystem = create<ArkitypeState>()(
  persist(
    (set) => ({
      meta: { name: "", started: false },
      journey: { activeStep: "colour", done: {}, visited: { colour: true } },
      primitives: freshPrimitives(),
      semantics: {
        groups: JSON.parse(JSON.stringify(DEFAULT_SEMANTIC_GROUPS)) as SemanticGroup[],
        modes: {
          light: { ...DEFAULT_LIGHT },
          dark: { ...DEFAULT_DARK },
        },
      },
      components: JSON.parse(JSON.stringify(DEFAULT_COMPONENTS)) as Record<
        string,
        ComponentConfig
      >,
      currentPreviewMode: "dark",
      chromeTheme: "light",
      canvasZoom: 1,
      pendingFocus: null,

      startSystem: (name, brandHex) =>
        set((state) => {
          const families = cloneFamilies(state.primitives.colorFamilies);
          if (isValidHex(brandHex)) {
            const brand = families.find((f) => f.id === "brand") ?? families[0];
            if (brand) brand.seed = brandHex;
          }
          return {
            meta: { name: name.trim() || "Untitled system", started: true },
            journey: { activeStep: "colour", done: {}, visited: { colour: true } },
            primitives: {
              ...state.primitives,
              colorFamilies: families,
              seeds: buildSeeds(families),
              colors: buildColors(families),
            },
          };
        }),

      setSystemName: (name) =>
        set((state) => ({ meta: { ...state.meta, name } })),

      setPendingFocus: (target) => set({ pendingFocus: target }),

      goToStep: (step) =>
        set((state) => {
          // "roles" is a tab of the Colour section now — never land on it directly.
          const target: StepId = step === "roles" ? "colour" : step;
          return {
            journey: {
              ...state.journey,
              activeStep: target,
              visited: { ...state.journey.visited, [target]: true },
            },
          };
        }),

      completeStep: (step) =>
        set((state) => {
          const done = { ...state.journey.done, [step]: true };
          const next = nextStep(step);
          const landing = next ?? step;
          return {
            journey: {
              activeStep: landing,
              done,
              visited: { ...state.journey.visited, [landing]: true },
            },
          };
        }),

      /* ── colour ── */

      setSeed: (slot, hex) =>
        set((state) => {
          const families = cloneFamilies(state.primitives.colorFamilies);
          const fam = families.find((f) => f.id === slot);
          if (!fam) return state;
          fam.seed = hex;
          const valid = isValidHex(hex);
          return {
            primitives: {
              ...state.primitives,
              colorFamilies: families,
              seeds: buildSeeds(families),
              // Keep last-good ramp if the text is mid-edit and invalid.
              colors: valid
                ? buildColors(families)
                : {
                    ...state.primitives.colors,
                    [slot]: state.primitives.colors[slot] ?? familyRamp(fam),
                  },
            },
          };
        }),

      addFamily: () =>
        set((state) => {
          const families = cloneFamilies(state.primitives.colorFamilies);
          const taken = new Set(families.map((f) => f.id));
          const n = families.length + 1;
          const id = uniqueId(`accent-${n}`, taken);
          families.push({
            id,
            name: `Accent ${n}`,
            seed: "#8b5cf6",
            steps: 10,
            overrides: {},
          });
          return {
            primitives: {
              ...state.primitives,
              colorFamilies: families,
              seeds: buildSeeds(families),
              colors: buildColors(families),
            },
          };
        }),

      removeFamily: (id) =>
        set((state) => {
          if (state.primitives.colorFamilies.length <= 1) return state;
          const families = cloneFamilies(state.primitives.colorFamilies).filter(
            (f) => f.id !== id
          );
          return {
            primitives: {
              ...state.primitives,
              colorFamilies: families,
              seeds: buildSeeds(families),
              colors: buildColors(families),
            },
          };
        }),

      renameFamily: (id, name) =>
        set((state) => {
          const families = cloneFamilies(state.primitives.colorFamilies);
          const fam = families.find((f) => f.id === id);
          if (fam) fam.name = name;
          return { primitives: { ...state.primitives, colorFamilies: families } };
        }),

      setFamilySteps: (id, steps) =>
        set((state) => {
          const families = cloneFamilies(state.primitives.colorFamilies);
          const fam = families.find((f) => f.id === id);
          if (!fam) return state;
          fam.steps = Math.max(3, Math.min(12, Math.round(steps)));
          // Drop overrides whose label no longer exists at the new count.
          const labels = new Set(rampStepLabels(fam.steps));
          fam.overrides = Object.fromEntries(
            Object.entries(fam.overrides).filter(([k]) => labels.has(Number(k)))
          );
          return {
            primitives: {
              ...state.primitives,
              colorFamilies: families,
              colors: buildColors(families),
            },
          };
        }),

      setFamilyOverride: (id, label, hex) =>
        set((state) => {
          if (!isValidHex(hex)) return state;
          const families = cloneFamilies(state.primitives.colorFamilies);
          const fam = families.find((f) => f.id === id);
          if (!fam) return state;
          fam.overrides = { ...fam.overrides, [label]: hex };
          return {
            primitives: {
              ...state.primitives,
              colorFamilies: families,
              colors: buildColors(families),
            },
          };
        }),

      clearFamilyOverride: (id, label) =>
        set((state) => {
          const families = cloneFamilies(state.primitives.colorFamilies);
          const fam = families.find((f) => f.id === id);
          if (!fam) return state;
          const { [label]: _drop, ...rest } = fam.overrides;
          fam.overrides = rest;
          return {
            primitives: {
              ...state.primitives,
              colorFamilies: families,
              colors: buildColors(families),
            },
          };
        }),

      /* ── spacing / radii ── */

      setSpacingBase: (base) =>
        set((state) => ({
          primitives: {
            ...state.primitives,
            spacingBase: base,
            spacing: buildSpacing(
              base,
              state.primitives.spacingMultipliers,
              state.primitives.spacingOverrides
            ),
          },
        })),

      setSpacingMultiplier: (index, multiplier) =>
        set((state) => {
          const multipliers = [...state.primitives.spacingMultipliers];
          multipliers[index] = multiplier;
          return {
            primitives: {
              ...state.primitives,
              spacingMultipliers: multipliers,
              spacing: buildSpacing(
                state.primitives.spacingBase,
                multipliers,
                state.primitives.spacingOverrides
              ),
            },
          };
        }),

      setSpacingOverride: (index, px) =>
        set((state) => {
          const overrides = { ...state.primitives.spacingOverrides, [index]: px };
          return {
            primitives: {
              ...state.primitives,
              spacingOverrides: overrides,
              spacing: buildSpacing(
                state.primitives.spacingBase,
                state.primitives.spacingMultipliers,
                overrides
              ),
            },
          };
        }),

      clearSpacingOverride: (index) =>
        set((state) => {
          const { [index]: _drop, ...overrides } = state.primitives.spacingOverrides;
          return {
            primitives: {
              ...state.primitives,
              spacingOverrides: overrides,
              spacing: buildSpacing(
                state.primitives.spacingBase,
                state.primitives.spacingMultipliers,
                overrides
              ),
            },
          };
        }),

      addSpacingStep: () =>
        set((state) => {
          const multipliers = [...state.primitives.spacingMultipliers];
          const last = multipliers[multipliers.length - 1] ?? 16;
          const prev = multipliers[multipliers.length - 2] ?? 12;
          multipliers.push(last + (last - prev)); // continue the ladder
          return {
            primitives: {
              ...state.primitives,
              spacingMultipliers: multipliers,
              spacing: buildSpacing(
                state.primitives.spacingBase,
                multipliers,
                state.primitives.spacingOverrides
              ),
            },
          };
        }),

      removeSpacingStep: (index) =>
        set((state) => {
          // Keep the first 8 steps — components rely on space-1…8.
          if (state.primitives.spacingMultipliers.length <= 8 || index < 8) return state;
          const multipliers = state.primitives.spacingMultipliers.filter(
            (_, i) => i !== index
          );
          const overrides = Object.fromEntries(
            Object.entries(state.primitives.spacingOverrides)
              .map(([k, v]) => [Number(k), v] as const)
              .filter(([k]) => k !== index)
              .map(([k, v]) => [k > index ? k - 1 : k, v])
          );
          return {
            primitives: {
              ...state.primitives,
              spacingMultipliers: multipliers,
              spacingOverrides: overrides,
              spacing: buildSpacing(state.primitives.spacingBase, multipliers, overrides),
            },
          };
        }),

      setRadiusScale: (scale) =>
        set((state) => ({
          primitives: {
            ...state.primitives,
            radiusScale: scale,
            radii: buildRadii(scale, state.primitives.radiusOverrides),
          },
        })),

      setRadiusOverride: (index, px) =>
        set((state) => {
          const overrides = { ...state.primitives.radiusOverrides, [index]: px };
          return {
            primitives: {
              ...state.primitives,
              radiusOverrides: overrides,
              radii: buildRadii(state.primitives.radiusScale, overrides),
            },
          };
        }),

      clearRadiusOverride: (index) =>
        set((state) => {
          const { [index]: _drop, ...overrides } = state.primitives.radiusOverrides;
          return {
            primitives: {
              ...state.primitives,
              radiusOverrides: overrides,
              radii: buildRadii(state.primitives.radiusScale, overrides),
            },
          };
        }),

      /* ── typography ── */

      setTypographyBase: (size) =>
        set((state) => ({
          primitives: {
            ...state.primitives,
            typography: { ...state.primitives.typography, baseSize: size },
          },
        })),

      setScaleFactor: (factor) =>
        set((state) => ({
          primitives: {
            ...state.primitives,
            typography: { ...state.primitives.typography, scaleFactor: factor },
          },
        })),

      setRounding: (mode) =>
        set((state) => ({
          primitives: {
            ...state.primitives,
            typography: { ...state.primitives.typography, rounding: mode },
          },
        })),

      setFontFamily: (kind, value) =>
        set((state) => {
          const t = state.primitives.typography;
          const role: FontRoleId = kind === "sans" ? "body" : "mono";
          const fontRoles = {
            ...t.fontRoles,
            [role]: { ...t.fontRoles[role], family: value },
          };
          return {
            primitives: {
              ...state.primitives,
              typography: {
                ...t,
                fontRoles,
                families: { ...t.families, [kind]: value },
              },
            },
          };
        }),

      setFontRole: (role, patch) =>
        set((state) => {
          const t = state.primitives.typography;
          const nextRole = { ...t.fontRoles[role], ...patch };
          const families =
            role === "body"
              ? { ...t.families, sans: nextRole.family }
              : role === "mono"
                ? { ...t.families, mono: nextRole.family }
                : t.families;
          return {
            primitives: {
              ...state.primitives,
              typography: {
                ...t,
                fontRoles: { ...t.fontRoles, [role]: nextRole },
                families,
              },
            },
          };
        }),

      addWeight: () =>
        set((state) => {
          const t = state.primitives.typography;
          const weights = [...t.weights, { name: `weight-${t.weights.length + 1}`, value: 800 }];
          return {
            primitives: { ...state.primitives, typography: { ...t, weights } },
          };
        }),

      setWeight: (index, patch) =>
        set((state) => {
          const t = state.primitives.typography;
          const weights = t.weights.map((w, i) => (i === index ? { ...w, ...patch } : w));
          return {
            primitives: { ...state.primitives, typography: { ...t, weights } },
          };
        }),

      removeWeight: (index) =>
        set((state) => {
          const t = state.primitives.typography;
          if (t.weights.length <= 1) return state;
          const weights = t.weights.filter((_, i) => i !== index);
          return {
            primitives: { ...state.primitives, typography: { ...t, weights } },
          };
        }),

      setTypeSizeOverride: (step, px) =>
        set((state) => {
          const t = state.primitives.typography;
          return {
            primitives: {
              ...state.primitives,
              typography: {
                ...t,
                sizeOverrides: { ...t.sizeOverrides, [step]: px },
              },
            },
          };
        }),

      clearTypeSizeOverride: (step) =>
        set((state) => {
          const t = state.primitives.typography;
          const { [step]: _drop, ...sizeOverrides } = t.sizeOverrides;
          return {
            primitives: { ...state.primitives, typography: { ...t, sizeOverrides } },
          };
        }),

      setTypeLeadingOverride: (step, value) =>
        set((state) => {
          const t = state.primitives.typography;
          return {
            primitives: {
              ...state.primitives,
              typography: {
                ...t,
                leadingOverrides: { ...t.leadingOverrides, [step]: value },
              },
            },
          };
        }),

      clearTypeLeadingOverride: (step) =>
        set((state) => {
          const t = state.primitives.typography;
          const { [step]: _drop, ...leadingOverrides } = t.leadingOverrides;
          return {
            primitives: { ...state.primitives, typography: { ...t, leadingOverrides } },
          };
        }),

      setStepAssign: (step, patch) =>
        set((state) => {
          const t = state.primitives.typography;
          const current = t.stepAssign[step] ?? { role: "body" as FontRoleId, weight: "regular" };
          return {
            primitives: {
              ...state.primitives,
              typography: {
                ...t,
                stepAssign: { ...t.stepAssign, [step]: { ...current, ...patch } },
              },
            },
          };
        }),

      /* ── elevation ── */

      setShadowField: (mode, index, field, value) =>
        set((state) => {
          const arr = cloneShadows(state.primitives.elevation[mode]);
          if (arr[index]) arr[index] = { ...arr[index], [field]: value };
          return {
            primitives: {
              ...state.primitives,
              elevation: { ...state.primitives.elevation, [mode]: arr },
            },
          };
        }),

      setShadowColor: (mode, index, hex) =>
        set((state) => {
          const arr = cloneShadows(state.primitives.elevation[mode]);
          if (arr[index]) arr[index] = { ...arr[index], color: hex };
          return {
            primitives: {
              ...state.primitives,
              elevation: { ...state.primitives.elevation, [mode]: arr },
            },
          };
        }),

      renameLevel: (index, name) =>
        set((state) => {
          const light = cloneShadows(state.primitives.elevation.light);
          const dark = cloneShadows(state.primitives.elevation.dark);
          if (light[index]) light[index].name = name;
          if (dark[index]) dark[index].name = name;
          return {
            primitives: { ...state.primitives, elevation: { light, dark } },
          };
        }),

      addLevel: () =>
        set((state) => {
          const light = cloneShadows(state.primitives.elevation.light);
          const dark = cloneShadows(state.primitives.elevation.dark);
          const name = `level-${light.length + 1}`;
          const lastL = light[light.length - 1];
          const lastD = dark[dark.length - 1];
          light.push({ ...lastL, name, y: lastL.y + 8, blur: lastL.blur + 16, opacity: Math.min(1, lastL.opacity + 0.05) });
          dark.push({ ...lastD, name, y: lastD.y + 8, blur: lastD.blur + 16, opacity: Math.min(1, lastD.opacity + 0.08) });
          return {
            primitives: { ...state.primitives, elevation: { light, dark } },
          };
        }),

      removeLevel: (index) =>
        set((state) => {
          if (state.primitives.elevation.light.length <= 1) return state;
          const light = state.primitives.elevation.light.filter((_, i) => i !== index);
          const dark = state.primitives.elevation.dark.filter((_, i) => i !== index);
          return {
            primitives: { ...state.primitives, elevation: { light, dark } },
          };
        }),

      /* ── motion / layout ── */

      setMotionDuration: (name, ms) =>
        set((state) => ({
          primitives: {
            ...state.primitives,
            motion: {
              ...state.primitives.motion,
              durations: { ...state.primitives.motion.durations, [name]: ms },
            },
          },
        })),

      setEasing: (index, value) =>
        set((state) => ({
          primitives: {
            ...state.primitives,
            motion: {
              ...state.primitives.motion,
              easings: state.primitives.motion.easings.map((e, i) =>
                i === index ? { ...e, value } : e
              ),
            },
          },
        })),

      setBreakpoint: (name, px) =>
        set((state) => ({
          primitives: {
            ...state.primitives,
            layout: {
              ...state.primitives.layout,
              breakpoints: {
                ...state.primitives.layout.breakpoints,
                [name]: px,
              },
            },
          },
        })),

      /* ── roles ── */

      setSemantic: (mode, token, value) =>
        set((state) => ({
          semantics: {
            ...state.semantics,
            modes: {
              ...state.semantics.modes,
              [mode]: { ...state.semantics.modes[mode], [token]: value },
            },
          },
        })),

      addRole: (groupLabel, token) =>
        set((state) => {
          const t = slugify(token);
          if (!t || state.semantics.modes.light[t] !== undefined) return state;
          const groups = state.semantics.groups.map((g) =>
            g.label === groupLabel ? { ...g, tokens: [...g.tokens, t] } : g
          );
          // Seed both modes with a sensible default reference.
          return {
            semantics: {
              groups,
              modes: {
                light: { ...state.semantics.modes.light, [t]: "neutral-500" },
                dark: { ...state.semantics.modes.dark, [t]: "neutral-400" },
              },
            },
          };
        }),

      removeRole: (token) =>
        set((state) => {
          const groups = state.semantics.groups.map((g) => ({
            ...g,
            tokens: g.tokens.filter((tk) => tk !== token),
          }));
          const { [token]: _l, ...light } = state.semantics.modes.light;
          const { [token]: _d, ...dark } = state.semantics.modes.dark;
          return { semantics: { groups, modes: { light, dark } } };
        }),

      addGroup: (label) =>
        set((state) => {
          if (state.semantics.groups.some((g) => g.label === label)) return state;
          return {
            semantics: {
              ...state.semantics,
              groups: [...state.semantics.groups, { label, tokens: [] }],
            },
          };
        }),

      /* ── components ── */

      setComponentSkeleton: (componentId, skeletonId) =>
        set((state) => ({
          components: {
            ...state.components,
            [componentId]: {
              ...(state.components[componentId] ?? {
                skeletonId: "1",
                properties: {},
              }),
              skeletonId,
            },
          },
        })),

      setComponentProperty: (componentId, key, value) =>
        set((state) => ({
          components: {
            ...state.components,
            [componentId]: {
              ...(state.components[componentId] ?? {
                skeletonId: "1",
                properties: {},
              }),
              properties: {
                ...(state.components[componentId]?.properties ?? {}),
                [key]: value,
              },
            },
          },
        })),

      setComponentBinding: (componentId, key, binding) =>
        set((state) => {
          const cfg = state.components[componentId] ?? {
            skeletonId: "1",
            properties: {},
          };
          return {
            components: {
              ...state.components,
              [componentId]: {
                ...cfg,
                bindings: { ...(cfg.bindings ?? {}), [key]: binding },
              },
            },
          };
        }),

      clearComponentBinding: (componentId, key) =>
        set((state) => {
          const cfg = state.components[componentId];
          if (!cfg?.bindings) return state;
          const { [key]: _drop, ...rest } = cfg.bindings;
          return {
            components: {
              ...state.components,
              [componentId]: { ...cfg, bindings: rest },
            },
          };
        }),

      resetComponentBindings: (componentId) =>
        set((state) => {
          const cfg = state.components[componentId];
          if (!cfg) return state;
          return {
            components: {
              ...state.components,
              [componentId]: { ...cfg, bindings: {} },
            },
          };
        }),

      setPreviewMode: (mode) => set({ currentPreviewMode: mode }),

      togglePreviewMode: () =>
        set((state) => ({
          currentPreviewMode:
            state.currentPreviewMode === "light" ? "dark" : "light",
        })),

      setChromeTheme: (theme) => set({ chromeTheme: theme }),

      toggleChromeTheme: () =>
        set((state) => ({
          chromeTheme: state.chromeTheme === "light" ? "dark" : "light",
        })),

      setCanvasZoom: (zoom) => set({ canvasZoom: zoom }),
    }),
    {
      name: "arkitype-system",
      version: 6,
      // v2 → v3: dynamic colour families, per-mode elevation, typography
      // weights/roles/rounding/overrides, editable spacing/radii + overrides,
      // stored semantic groups + expanded roles.
      // v3 → v4: component library expanded 23 → 43 (extended controls,
      // feedback, navigation and pattern parts); backfill their defaults.
      // v4 → v5: per-component `bindings` map (deep part/state customization);
      // backfill an empty map so components render from defaults.
      // v5 → v6: `journey.visited` map (distinct from `journey.done` — the
      // rail's free-jump now tracks "seen" separately from the footer's
      // "confirmed"); backfill from activeStep so the current step doesn't
      // look unvisited.
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as any;
        if (!state) return persisted as ArkitypeState;

        if (version < 2) {
          if (state.primitives) {
            state.primitives.motion =
              state.primitives.motion ??
              (JSON.parse(JSON.stringify(DEFAULT_MOTION)) as MotionTokens);
            state.primitives.layout =
              state.primitives.layout ??
              (JSON.parse(JSON.stringify(DEFAULT_LAYOUT)) as LayoutTokens);
          }
          state.components = {
            ...(JSON.parse(JSON.stringify(DEFAULT_COMPONENTS)) as Record<
              string,
              ComponentConfig
            >),
            ...(state.components ?? {}),
          };
          if (
            state.journey &&
            !STEP_ORDER.includes(state.journey.activeStep as StepId)
          ) {
            state.journey.activeStep = "colour";
          }
        }

        if (version < 3 && state.primitives) {
          const p = state.primitives;

          // Colour: seeds map → colorFamilies (preserve seeds; no overrides yet).
          if (!Array.isArray(p.colorFamilies)) {
            const oldSeeds: Record<string, string> = p.seeds ?? {};
            p.colorFamilies = DEFAULT_FAMILIES.map((d) => ({
              ...d,
              overrides: {},
              seed: oldSeeds[d.id] ?? d.seed,
            }));
          }
          p.seeds = buildSeeds(p.colorFamilies);
          p.colors = buildColors(p.colorFamilies);

          // Spacing: add editable multipliers + overrides.
          p.spacingMultipliers = Array.isArray(p.spacingMultipliers)
            ? p.spacingMultipliers
            : [...DEFAULT_SPACING_MULTIPLIERS];
          p.spacingOverrides = p.spacingOverrides ?? {};
          p.spacing = buildSpacing(
            p.spacingBase ?? 4,
            p.spacingMultipliers,
            p.spacingOverrides
          );

          // Radii: add overrides.
          p.radiusOverrides = p.radiusOverrides ?? {};
          p.radii = buildRadii(p.radiusScale ?? 1, p.radiusOverrides);

          // Typography: fold old {baseSize, scaleFactor, families} into the
          // richer model, preserving the user's chosen sizes and families.
          const oldT = p.typography ?? {};
          const base = JSON.parse(JSON.stringify(DEFAULT_TYPOGRAPHY)) as TypographyTokens;
          p.typography = {
            ...base,
            baseSize: oldT.baseSize ?? base.baseSize,
            scaleFactor: oldT.scaleFactor ?? base.scaleFactor,
            families: oldT.families ?? base.families,
            fontRoles: {
              ...base.fontRoles,
              display: { ...base.fontRoles.display, family: oldT.families?.sans ?? base.fontRoles.display.family },
              heading: { ...base.fontRoles.heading, family: oldT.families?.sans ?? base.fontRoles.heading.family },
              body: { ...base.fontRoles.body, family: oldT.families?.sans ?? base.fontRoles.body.family },
              mono: { ...base.fontRoles.mono, family: oldT.families?.mono ?? base.fontRoles.mono.family },
            },
          };

          // Elevation: old string[] shadows → structured per-mode defaults.
          p.elevation = {
            light: cloneShadows(DEFAULT_ELEVATION.light),
            dark: cloneShadows(DEFAULT_ELEVATION.dark),
          };
          delete p.shadows;
        }

        if (version < 3) {
          // Semantics: move groups into state; merge expanded default roles so
          // saved systems gain the new tokens without losing user remaps.
          state.semantics = state.semantics ?? { modes: { light: {}, dark: {} } };
          state.semantics.groups = JSON.parse(
            JSON.stringify(DEFAULT_SEMANTIC_GROUPS)
          ) as SemanticGroup[];
          state.semantics.modes = {
            light: { ...DEFAULT_LIGHT, ...(state.semantics.modes?.light ?? {}) },
            dark: { ...DEFAULT_DARK, ...(state.semantics.modes?.dark ?? {}) },
          };
        }

        if (version < 4) {
          // Backfill new component ids while preserving any user overrides.
          state.components = {
            ...(JSON.parse(JSON.stringify(DEFAULT_COMPONENTS)) as Record<
              string,
              ComponentConfig
            >),
            ...(state.components ?? {}),
          };
        }

        if (version < 5) {
          // Give every component a bindings map so the inspector has somewhere
          // to write overrides; existing property/skeleton choices are kept.
          const comps = (state.components ?? {}) as Record<string, ComponentConfig>;
          for (const id of Object.keys(comps)) {
            comps[id] = { ...comps[id], bindings: comps[id].bindings ?? {} };
          }
          state.components = comps;
        }

        if (version < 6 && state.journey) {
          state.journey.visited = state.journey.visited ?? {
            [state.journey.activeStep as StepId]: true,
          };
        }

        return state as ArkitypeState;
      },
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        meta: state.meta,
        journey: state.journey,
        primitives: state.primitives,
        semantics: state.semantics,
        components: state.components,
        currentPreviewMode: state.currentPreviewMode,
        chromeTheme: state.chromeTheme,
        canvasZoom: state.canvasZoom,
      }),
    }
  )
);

/* ────────────────────────────── derived helpers ────────────────────────── */

/** Live count of every addressable token in the system. */
export function countTokens(state: ArkitypeState): number {
  const colorCount = state.primitives.colorFamilies.reduce(
    (sum, f) => sum + f.steps,
    0
  );
  const spacingCount = state.primitives.spacing.length;
  const radiiCount = state.primitives.radii.length;
  const typeCount =
    generateTypeScale(
      state.primitives.typography.baseSize,
      state.primitives.typography.scaleFactor,
      {
        rounding: state.primitives.typography.rounding,
        sizeOverrides: state.primitives.typography.sizeOverrides,
      }
    ).length * 2; // size + leading
  const weightCount = state.primitives.typography.weights.length;
  const fontCount = Object.keys(state.primitives.typography.fontRoles).length;
  const shadowCount =
    state.primitives.elevation.light.length +
    state.primitives.elevation.dark.length;
  const motionCount =
    Object.keys(state.primitives.motion.durations).length +
    state.primitives.motion.easings.length;
  const layoutCount = Object.keys(state.primitives.layout.breakpoints).length;
  const semanticCount =
    Object.keys(state.semantics.modes.light).length +
    Object.keys(state.semantics.modes.dark).length;
  return (
    colorCount +
    spacingCount +
    radiiCount +
    typeCount +
    weightCount +
    fontCount +
    shadowCount +
    motionCount +
    layoutCount +
    semanticCount
  );
}
