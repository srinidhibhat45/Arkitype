import {
  ArkitypeState,
  RADII_NAMES,
  countTokens,
  shadowToCss,
} from "@/store/useDesignSystem";
import { hexToFigmaRgba, isValidHex, rampStepLabels } from "@/lib/color";
import { resolveToken } from "@/lib/tokens";
import { generateTypeScale, STEP_DEFS } from "@/lib/typography";
import {
  COMPONENT_SPECS,
  ComponentSpec,
  defBinding,
  optionValue,
  WIRED_COMPONENTS,
} from "@/lib/componentSchema";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import { ComponentDoc, componentDoc } from "@/lib/componentDocs";

export interface FigmaRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaAlias {
  type: "VARIABLE_ALIAS";
  id: string;
}

export type FigmaVariableValue = FigmaRgba | FigmaAlias | number | string;

export interface FigmaVariable {
  name: string;
  resolvedType: "COLOR" | "FLOAT" | "STRING";
  scopes: string[];
  valuesByMode: Record<string, FigmaVariableValue>;
  resolvedValuesByMode?: Record<string, string>;
}

export interface FigmaCollection {
  name: string;
  id: string;
  modes: Array<{ modeId: string; name: string }>;
  variables: FigmaVariable[];
}

export interface FigmaStyleBinding {
  type: "ALIAS" | "LITERAL";
  collection?: "Primitives" | "Semantics";
  path?: string;
  value?: string | number;
}

export interface FigmaComponentVariant {
  properties: Record<string, string>;
  styles: Record<string, FigmaStyleBinding>;
  options: Record<string, any>;
}

/**
 * A non-variant Figma component property (properties panel entry).
 * TEXT drives a text layer's characters; BOOLEAN drives a layer's visibility.
 * `layer` is the node name the plugin wires the property to inside every variant.
 */
export interface FigmaComponentProperty {
  name: string;
  type: "TEXT" | "BOOLEAN";
  layer: string;
  defaultValue: string | boolean;
}

export interface FigmaComponent {
  id: string;
  name: string;
  tier: number;
  lane: string;
  laneLabel: string;
  description: string;
  docs: ComponentDoc;
  properties: FigmaComponentProperty[];
  variants: FigmaComponentVariant[];
}

/** One Figma page of the generated kit: a single component (with its lane). */
export interface FigmaPageDef {
  id: string;
  label: string;
  note: string;
  /** Lane the component belongs to — drives page naming/grouping in Figma. */
  lane?: string;
  laneLabel?: string;
  components: string[];
}

/** Options for compiling the bundle — component include list, etc. */
export interface FigmaBundleOptions {
  /** Component ids to include; omit to include every wired component. */
  includeComponents?: string[];
}

export interface FigmaBundle {
  meta: {
    generator: string;
    version: string;
    generatedAt: string;
    systemName: string;
    tokenCount: number;
    componentCount: number;
  };
  structure: { pages: FigmaPageDef[] };
  collections: FigmaCollection[];
  components: FigmaComponent[];
}

const VALUE_MODE = "mode:value";
const LIGHT_MODE = "mode:light";
const DARK_MODE = "mode:dark";

function getVariantDimensions(spec: ComponentSpec): Record<string, string[]> {
  const dims: Record<string, string[]> = {};
  
  if (spec.states && spec.states.length > 0) {
    dims["state"] = spec.states.map(s => s.toString());
  } else {
    dims["state"] = ["default"];
  }
  
  const pAxis = spec.options?.find(o => o.previewAxis && o.type === "enum");
  if (pAxis && pAxis.options) {
    dims[pAxis.key] = pAxis.options.map(o => o.value);
  } else if (spec.id === "checkbox" || spec.id === "radio" || spec.id === "switch") {
    dims["checked"] = ["true", "false"];
  } else if (spec.id === "badge") {
    const toneOpt = spec.options?.find(o => o.key === "tone");
    const styleOpt = spec.options?.find(o => o.key === "style");
    if (toneOpt?.options) dims["tone"] = toneOpt.options.map(o => o.value);
    if (styleOpt?.options) dims["style"] = styleOpt.options.map(o => o.value);
  } else if (spec.id === "tag") {
    dims["removable"] = ["true", "false"];
  } else if (spec.id === "avatar") {
    const sizeOpt = spec.options?.find(o => o.key === "size");
    const presenceOpt = spec.options?.find(o => o.key === "presence");
    if (sizeOpt?.options) dims["size"] = sizeOpt.options.map(o => o.value);
    if (presenceOpt?.options) dims["presence"] = presenceOpt.options.map(o => o.value);
  } else if (spec.id === "alert" || spec.id === "toast") {
    const toneOpt = spec.options?.find(o => o.key === "tone");
    if (toneOpt?.options) dims["tone"] = toneOpt.options.map(o => o.value);
  } else if (spec.id === "card") {
    const elevOpt = spec.options?.find(o => o.key === "elevation");
    if (elevOpt?.options) dims["elevation"] = elevOpt.options.map(o => o.value);
  }
  
  return dims;
}

function cartesianProduct(dimensions: Record<string, string[]>): Record<string, string>[] {
  const keys = Object.keys(dimensions);
  if (keys.length === 0) return [{}];
  
  let results: Record<string, string>[] = [{}];
  for (const key of keys) {
    const values = dimensions[key];
    const nextResults: Record<string, string>[] = [];
    for (const res of results) {
      for (const val of values) {
        nextResults.push({ ...res, [key]: val });
      }
    }
    results = nextResults;
  }
  return results;
}

function getBindingForVariant(
  state: ArkitypeState,
  componentId: string,
  propKey: string,
  combo: Record<string, string>,
  isStateful?: boolean
): string | null {
  const bindings = state.components[componentId]?.bindings;
  if (!bindings) return null;
  
  const componentState = combo["state"];
  const variantKeys = Object.keys(combo).filter(k => k !== "state");
  
  if (variantKeys.length > 0) {
    for (const vKey of variantKeys) {
      const vVal = combo[vKey];
      if (isStateful && componentState) {
        const keyWithState = `${vVal}.${propKey}@${componentState}`;
        if (bindings[keyWithState] !== undefined) return bindings[keyWithState];
      } else {
        const keyWithoutState = `${vVal}.${propKey}`;
        if (bindings[keyWithoutState] !== undefined) return bindings[keyWithoutState];
      }
    }
  }
  
  if (isStateful && componentState) {
    const keyWithState = `${propKey}@${componentState}`;
    if (bindings[keyWithState] !== undefined) return bindings[keyWithState];
  } else {
    if (bindings[propKey] !== undefined) return bindings[propKey];
  }
  
  return null;
}

function resolveBindingToFigma(bindingString: string, radiusNames: readonly string[]): FigmaStyleBinding | null {
  if (!bindingString) return null;
  const cut = bindingString.indexOf(":");
  if (cut === -1) {
    return { type: "LITERAL", value: bindingString };
  }
  const kind = bindingString.slice(0, cut);
  const value = bindingString.slice(cut + 1);
  
  switch (kind) {
    case "role":
      return {
        type: "ALIAS",
        collection: "Semantics",
        path: value.replace(/-/g, "/"),
      };
    case "prim":
      const separatorIndex = value.lastIndexOf("-");
      if (separatorIndex === -1) {
        return {
          type: "ALIAS",
          collection: "Primitives",
          path: `color/${value}`,
        };
      }
      const famId = value.slice(0, separatorIndex);
      const step = value.slice(separatorIndex + 1);
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `color/${famId}/${step}`,
      };
    case "space":
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `space/${value}`,
      };
    case "radius": {
      const names = radiusNames ?? RADII_NAMES;
      const i = Math.min(Math.max(Number(value) || 0, 0), names.length - 1);
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `radius/${names[i]}`,
      };
    }
    case "text":
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `type/size/${value}`,
      };
    case "leading":
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `type/leading/${value}`,
      };
    case "weight":
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `font/weight/${value}`,
      };
    case "font":
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `font/${value}`,
      };
    case "px": {
      const num = Number(value);
      return {
        type: "LITERAL",
        value: isNaN(num) ? value : num,
      };
    }
    case "hex":
      return {
        type: "LITERAL",
        value,
      };
    case "raw":
    default:
      const numVal = Number(value);
      return {
        type: "LITERAL",
        value: isNaN(numVal) ? value : numVal,
      };
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Variant-aware default styling.
 *
 * The live React components derive per-variant/per-tone styling in code
 * (CoreComponents.tsx, DisplayComponents.tsx) — the schema `def` only covers
 * the base variant. Without mirroring that logic here, every exported variant
 * (button error/warning/outlined…, badge/alert tones) collapses to identical
 * base styles. These maps reproduce the renderers' token recipes as binding
 * strings; user overrides (variant-scoped or shared) still win.
 * ──────────────────────────────────────────────────────────────────────── */

/** `prim:` binding for a ramp step by index, e.g. famStep("error", 6) → error-600. */
function famStepBinding(state: ArkitypeState, famId: string, idx: number): string | null {
  const fam = state.primitives.colorFamilies.find((f) => f.id === famId);
  if (!fam || !(state.primitives.colors[famId] ?? []).length) return null;
  const labels = rampStepLabels(fam.steps);
  const i = Math.min(Math.max(idx, 0), labels.length - 1);
  return `prim:${famId}-${labels[i]}`;
}

/** Does a semantic role exist in this system? */
function hasRole(state: ArkitypeState, token: string): boolean {
  return state.semantics.modes.light[token] !== undefined;
}

/** Which colour family backs each tone (mirrors DisplayComponents.TONE_SLOT). */
const TONE_SLOT: Record<string, string> = {
  brand: "brand",
  info: "secondary",
  success: "success",
  warning: "warning",
  error: "error",
};

interface ToneRecipe {
  bg: string;
  border: string;
  text: string;
  accent: string;
}

/**
 * Wash/border/text/accent bindings for a tone. Feedback tones prefer the
 * mode-aware `feedback-*` semantic roles (they flip in dark mode in Figma);
 * brand/no-role tones fall back to ramp steps (light-mode recipe: 50/200/800/500).
 */
function toneRecipe(state: ArkitypeState, tone: string): ToneRecipe | null {
  if (tone === "neutral") {
    return {
      bg: "role:surface-subtle",
      border: "role:border-default",
      text: "role:text-secondary",
      accent: "role:text-muted",
    };
  }
  if (hasRole(state, `feedback-${tone}-surface`)) {
    return {
      bg: `role:feedback-${tone}-surface`,
      border: `role:feedback-${tone}-border`,
      text: `role:feedback-${tone}-text`,
      // The accent (dots, solid fills) is the vivid mid-ramp step, like the app.
      accent:
        famStepBinding(state, TONE_SLOT[tone] ?? tone, 5) ?? `role:feedback-${tone}-text`,
    };
  }
  const fam = TONE_SLOT[tone];
  if (!fam) return null;
  const bg = famStepBinding(state, fam, 0);
  const border = famStepBinding(state, fam, 2);
  const text = famStepBinding(state, fam, 8);
  const accent = famStepBinding(state, fam, 5);
  if (!bg || !border || !text || !accent) return null;
  return { bg, border, text, accent };
}

/**
 * Default bindings for one button variant × state, mirroring TokenButton.
 * Returns undefined for keys the spec default already covers (filled).
 */
function buttonVariantDefault(
  state: ArkitypeState,
  variant: string,
  st: string,
  key: string
): string | undefined {
  const isColorKey =
    key === "container.bg" ||
    key === "container.border" ||
    key === "label.color" ||
    key === "prefixIcon.color" ||
    key === "suffixIcon.color";
  if (!isColorKey || !variant || variant === "filled") return undefined;

  const textish = key === "label.color" || key === "prefixIcon.color" || key === "suffixIcon.color";

  if (st === "disabled") {
    if (textish) return "role:text-muted";
    if (key === "container.border")
      return variant === "outlined" ? "role:border-default" : "raw:transparent";
    // container.bg
    if (variant === "error" || variant === "warning" || variant === "success")
      return famStepBinding(state, "neutral", 3) ?? "role:surface-subtle";
    if (variant === "tonal" || variant === "elevated") return "role:surface-subtle";
    return "raw:transparent";
  }

  switch (variant) {
    case "tonal":
      if (key === "container.bg")
        return st === "hover"
          ? "role:action-secondary-hover"
          : st === "active"
            ? "role:action-secondary-active"
            : "role:action-secondary-default";
      if (key === "container.border") return "raw:transparent";
      return "role:text-primary";
    case "elevated":
      if (key === "container.bg")
        return st === "hover"
          ? "role:surface-subtle"
          : st === "active"
            ? "role:action-secondary-hover"
            : "role:surface-elevated";
      if (key === "container.border") return "raw:transparent";
      return "role:text-link";
    case "outlined":
      if (key === "container.bg")
        return st === "hover" || st === "active" ? "role:surface-subtle" : "raw:transparent";
      if (key === "container.border") return "role:border-default";
      return "role:text-link";
    case "text":
      if (key === "container.bg")
        return st === "hover" || st === "active" ? "role:surface-subtle" : "raw:transparent";
      if (key === "container.border") return "raw:transparent";
      return "role:text-link";
    case "error":
    case "warning":
    case "success": {
      if (key === "container.border") return "raw:transparent";
      if (key === "container.bg") {
        const idx = st === "hover" ? 7 : st === "active" ? 8 : 6; // 600/700/800
        return famStepBinding(state, variant, idx) ?? `role:feedback-${variant}-text`;
      }
      return "role:text-on-action";
    }
  }
  return undefined;
}

/** Normalise the schema's mixed elevation vocabularies onto shadow level names. */
function normalizeElevation(value: unknown): string | null {
  const v = String(value ?? "").toLowerCase();
  const map: Record<string, string> = {
    none: "flat",
    flat: "flat",
    sm: "low",
    low: "low",
    md: "medium",
    medium: "medium",
    lg: "high",
    high: "high",
    xl: "high",
  };
  return map[v] ?? null;
}

/**
 * Inject styles the schema doesn't declare as props but the drawn kit needs:
 * tone washes for badge/tag/alert/banner, tone accents for toast, and a
 * `container.elevation` level for anything that casts a shadow. Never
 * overwrites a key the user has explicitly bound.
 */
function injectVariantExtras(
  state: ArkitypeState,
  cid: string,
  combo: Record<string, string>,
  options: Record<string, any>,
  styles: Record<string, FigmaStyleBinding>,
  hasOverride: (key: string) => boolean
): void {
  const put = (key: string, binding: string | FigmaStyleBinding | null | undefined) => {
    if (binding == null || hasOverride(key)) return;
    if (typeof binding === "string") {
      const resolved = resolveBindingToFigma(binding, state.primitives.radiusNames ?? RADII_NAMES);
      if (resolved) styles[key] = resolved;
    } else {
      styles[key] = binding;
    }
  };

  const tone = combo["tone"] ?? (typeof options.tone === "string" ? options.tone : undefined);
  const recipe = tone ? toneRecipe(state, tone) : null;

  if ((cid === "badge" || cid === "tag") && recipe) {
    const style = String(options.style ?? "subtle");
    if (style === "solid") {
      put("container.bg", recipe.accent);
      put("container.border", "raw:transparent");
      put("text.color", "role:text-on-action");
    } else if (style === "outline") {
      put("container.bg", "raw:transparent");
      put("container.border", recipe.border);
      put("container.borderWidth", { type: "LITERAL", value: 1 });
      put("text.color", recipe.text);
    } else {
      put("container.bg", recipe.bg);
      put("container.border", "raw:transparent");
      put("text.color", recipe.text);
    }
    put("statusDot.color", recipe.accent);
  }

  if ((cid === "alert" || cid === "banner") && recipe) {
    const style = cid === "alert" ? String(options.style ?? "subtle") : "subtle";
    if (style === "solid") {
      put("container.bg", recipe.accent);
      put("container.border", "raw:transparent");
      put("label.color", "role:text-on-action");
      put("text.color", "role:text-on-action");
      put("indicator.color", "role:text-on-action");
    } else if (style === "outline") {
      put("container.bg", "raw:transparent");
      put("container.border", recipe.border);
      put("container.borderWidth", { type: "LITERAL", value: 1 });
      put("label.color", recipe.text);
      put("text.color", "role:text-secondary");
      put("indicator.color", recipe.accent);
    } else {
      put("container.bg", recipe.bg);
      put("container.border", recipe.border);
      put("container.borderWidth", { type: "LITERAL", value: 1 });
      put("label.color", recipe.text);
      put("text.color", recipe.text);
      put("indicator.color", recipe.accent);
    }
  }

  if (cid === "toast" && recipe) {
    // Toast keeps its neutral elevated surface; only the indicator takes the tone.
    put("indicator.color", recipe.accent);
  }

  /* Elevation → effect-style level, consumed by the plugin. */
  let level: string | null = null;
  if (cid === "card" || cid === "modal" || cid === "popover") {
    level = normalizeElevation(options.shadow) ?? (cid === "modal" ? "high" : "medium");
  } else if (cid === "toast" || cid === "statGrid") {
    level = normalizeElevation(options.elevation) ?? "medium";
  } else if (cid === "button" && combo["variant"] === "elevated" && combo["state"] !== "disabled") {
    level = combo["state"] === "hover" ? "medium" : "low";
  } else if (cid === "dropdown" || cid === "tooltip") {
    level = "low";
  }
  if (level && level !== "flat") {
    put("container.elevation", { type: "LITERAL", value: level });
  }
}

/**
 * Which Figma component properties each component exposes, and which named
 * layer inside the drawn variants they control. `optionKey` pulls the default
 * from the user's stored Component Studio options; `fallback` is used when the
 * option isn't set. Layer names must match the plugin's renderers.
 */
const FIGMA_PROP_DEFS: Record<
  string,
  Array<{
    name: string;
    type: "TEXT" | "BOOLEAN";
    layer: string;
    optionKey?: string;
    fallback: string | boolean;
  }>
> = {
  button: [
    { name: "Label", type: "TEXT", layer: "label", optionKey: "label", fallback: "Action Button" },
    { name: "Show prefix icon", type: "BOOLEAN", layer: "prefixIcon", fallback: false },
    { name: "Show suffix icon", type: "BOOLEAN", layer: "suffixIcon", fallback: false },
  ],
  input: [{ name: "Placeholder", type: "TEXT", layer: "text", optionKey: "placeholder", fallback: "Enter text..." }],
  textarea: [{ name: "Placeholder", type: "TEXT", layer: "text", optionKey: "placeholder", fallback: "Enter text..." }],
  select: [{ name: "Placeholder", type: "TEXT", layer: "text", fallback: "Select option..." }],
  searchField: [{ name: "Placeholder", type: "TEXT", layer: "text", fallback: "Search..." }],
  checkbox: [{ name: "Label", type: "TEXT", layer: "label", optionKey: "label", fallback: "Selection Option" }],
  radio: [{ name: "Label", type: "TEXT", layer: "label", optionKey: "label", fallback: "Selection Option" }],
  badge: [
    { name: "Label", type: "TEXT", layer: "label", optionKey: "label", fallback: "Badge" },
    { name: "Show dot", type: "BOOLEAN", layer: "statusDot", optionKey: "dot", fallback: false },
  ],
  tag: [{ name: "Label", type: "TEXT", layer: "label", optionKey: "label", fallback: "Tag" }],
  avatar: [{ name: "Initials", type: "TEXT", layer: "initials", optionKey: "initials", fallback: "JD" }],
  tooltip: [{ name: "Text", type: "TEXT", layer: "text", optionKey: "label", fallback: "Tooltip description text" }],
  alert: [
    { name: "Title", type: "TEXT", layer: "title", optionKey: "title", fallback: "Notification Title" },
    { name: "Description", type: "TEXT", layer: "desc", optionKey: "description", fallback: "Detailed message regarding the alert." },
    { name: "Dismissible", type: "BOOLEAN", layer: "closeIcon", optionKey: "dismissible", fallback: true },
  ],
  toast: [
    { name: "Title", type: "TEXT", layer: "title", optionKey: "title", fallback: "Notification Title" },
    { name: "Description", type: "TEXT", layer: "desc", optionKey: "description", fallback: "Detailed message regarding the alert." },
    { name: "Dismissible", type: "BOOLEAN", layer: "closeIcon", optionKey: "dismissible", fallback: true },
  ],
  banner: [
    { name: "Title", type: "TEXT", layer: "title", optionKey: "title", fallback: "Notification Title" },
    { name: "Description", type: "TEXT", layer: "desc", optionKey: "description", fallback: "Detailed message regarding the alert." },
    { name: "Dismissible", type: "BOOLEAN", layer: "closeIcon", optionKey: "dismissible", fallback: true },
  ],
  card: [
    { name: "Title", type: "TEXT", layer: "title", optionKey: "title", fallback: "Card Header" },
    { name: "Body", type: "TEXT", layer: "bodyText", optionKey: "bodyText", fallback: "This represents the main content block for the container." },
  ],
  modal: [
    { name: "Title", type: "TEXT", layer: "title", optionKey: "title", fallback: "Dialog Window" },
    { name: "Body", type: "TEXT", layer: "bodyText", optionKey: "bodyText", fallback: "This represents the main content block for the container." },
  ],
  accordion: [{ name: "Header", type: "TEXT", layer: "title", optionKey: "label", fallback: "Collapsible Header" }],
  listItem: [
    { name: "Title", type: "TEXT", layer: "title", optionKey: "title", fallback: "List Item Headline" },
    { name: "Subtitle", type: "TEXT", layer: "desc", optionKey: "subtitle", fallback: "Supporting subtext line descriptor." },
  ],
  feedItem: [
    { name: "Title", type: "TEXT", layer: "title", optionKey: "title", fallback: "List Item Headline" },
    { name: "Subtitle", type: "TEXT", layer: "desc", optionKey: "subtitle", fallback: "Supporting subtext line descriptor." },
  ],
  emptyState: [
    { name: "Title", type: "TEXT", layer: "title", fallback: "No items synchronized" },
    { name: "Subtitle", type: "TEXT", layer: "sub", fallback: "Pasted schemas will appear here as catalog widgets." },
  ],
  kbd: [{ name: "Key", type: "TEXT", layer: "key", optionKey: "label", fallback: "Ctrl" }],
  link: [{ name: "Label", type: "TEXT", layer: "label", optionKey: "label", fallback: "Link Action" }],
  stat: [
    { name: "Label", type: "TEXT", layer: "label", optionKey: "label", fallback: "Monthly Revenue" },
    { name: "Value", type: "TEXT", layer: "value", optionKey: "value", fallback: "$45,210.00" },
  ],
  dropdown: [{ name: "Label", type: "TEXT", layer: "text", optionKey: "label", fallback: "Dropdown Menu" }],
  chip: [{ name: "Label", type: "TEXT", layer: "label", optionKey: "label", fallback: "Filter Chip" }],
  datePicker: [{ name: "Value", type: "TEXT", layer: "text", fallback: "12 / 07 / 2026" }],
  fileUpload: [{ name: "Prompt", type: "TEXT", layer: "title", fallback: "Drop files to upload" }],
};

/** Compile the component-property definitions for one component. */
function compileFigmaProps(
  state: ArkitypeState,
  cid: string
): FigmaComponentProperty[] {
  const defs = FIGMA_PROP_DEFS[cid] ?? [];
  const stored = state.components[cid]?.properties;
  return defs.map((d) => {
    let defaultValue: string | boolean = d.fallback;
    if (d.optionKey) {
      const v = stored?.[d.optionKey];
      if (typeof d.fallback === "boolean") {
        if (typeof v === "boolean") defaultValue = v;
      } else if (typeof v === "string" && v.trim() !== "") {
        defaultValue = v;
      }
    }
    return { name: d.name, type: d.type, layer: d.layer, defaultValue };
  });
}

/** Display name + lane for a component id, from the lanes inventory. */
function laneInfoFor(cid: string): { name: string; lane: string; laneLabel: string } {
  for (const lane of COMPONENT_LANES) {
    const item = lane.items.find((i) => i.id === cid);
    if (item) return { name: item.label, lane: lane.id, laneLabel: lane.label };
  }
  return {
    name: cid.charAt(0).toUpperCase() + cid.slice(1),
    lane: "patterns",
    laneLabel: "Patterns",
  };
}

export function compileFigmaBundle(
  state: ArkitypeState,
  opts: FigmaBundleOptions = {}
): FigmaBundle {
  const { primitives, semantics } = state;
  const radiusNames = primitives.radiusNames ?? RADII_NAMES;
  const include = opts.includeComponents ? new Set(opts.includeComponents) : null;

  /* ── Collection 1: Primitives (single "Value" mode) ── */
  const primitiveVars: FigmaVariable[] = [];

  primitives.colorFamilies.forEach((fam) => {
    const labels = rampStepLabels(fam.steps);
    (primitives.colors[fam.id] ?? []).forEach((hex, i) => {
      primitiveVars.push({
        name: `color/${fam.id}/${labels[i]}`,
        resolvedType: "COLOR",
        scopes: ["ALL_SCOPES"],
        valuesByMode: { [VALUE_MODE]: hexToFigmaRgba(hex) },
        resolvedValuesByMode: { [VALUE_MODE]: hex },
      });
    });
  });

  primitives.spacing.forEach((px, i) => {
    primitiveVars.push({
      name: `space/${i + 1}`,
      resolvedType: "FLOAT",
      scopes: ["GAP", "WIDTH_HEIGHT"],
      valuesByMode: { [VALUE_MODE]: px },
    });
  });

  primitives.radii.forEach((px, i) => {
    primitiveVars.push({
      name: `radius/${radiusNames[i]}`,
      resolvedType: "FLOAT",
      scopes: ["CORNER_RADIUS"],
      valuesByMode: { [VALUE_MODE]: px },
    });
  });

  const t = primitives.typography;
  const typeSteps = generateTypeScale(t.baseSize, t.scaleFactor, {
    rounding: t.rounding,
    sizeOverrides: t.sizeOverrides,
    leadingOverrides: t.leadingOverrides,
    stepAssign: t.stepAssign,
  }, t.stepDefs ?? STEP_DEFS);
  const weightValue = (name: string): number =>
    t.weights.find((w) => w.name === name)?.value ?? 400;
  typeSteps.forEach((s) => {
    primitiveVars.push({
      name: `type/size/${s.name}`,
      resolvedType: "FLOAT",
      scopes: ["FONT_SIZE"],
      valuesByMode: { [VALUE_MODE]: s.size },
    });
    primitiveVars.push({
      name: `type/leading/${s.name}`,
      resolvedType: "FLOAT",
      scopes: ["LINE_HEIGHT"],
      valuesByMode: { [VALUE_MODE]: s.lineHeight },
    });
    primitiveVars.push({
      name: `type/weight/${s.name}`,
      resolvedType: "FLOAT",
      scopes: ["FONT_WEIGHT"],
      valuesByMode: { [VALUE_MODE]: weightValue(s.weight) },
    });
  });

  t.weights.forEach((w) => {
    primitiveVars.push({
      name: `font/weight/${w.name}`,
      resolvedType: "FLOAT",
      scopes: ["FONT_WEIGHT"],
      valuesByMode: { [VALUE_MODE]: w.value },
    });
  });

  (["display", "heading", "body", "mono"] as const).forEach((role) => {
    primitiveVars.push({
      name: `font/${role}`,
      resolvedType: "STRING",
      scopes: ["FONT_FAMILY"],
      valuesByMode: { [VALUE_MODE]: t.fontRoles[role].family },
    });
  });

  // Elevation — per-mode shadow strings (light + dark).
  (["light", "dark"] as const).forEach((elevMode) => {
    primitives.elevation[elevMode].forEach((def) => {
      primitiveVars.push({
        name: `shadow/${elevMode}/${def.name}`,
        resolvedType: "STRING",
        scopes: ["EFFECT_COLOR"],
        valuesByMode: { [VALUE_MODE]: shadowToCss(def) },
      });
    });
  });

  Object.entries(primitives.motion.durations).forEach(([name, ms]) => {
    primitiveVars.push({
      name: `motion/duration/${name}`,
      resolvedType: "FLOAT",
      scopes: ["ALL_SCOPES"],
      valuesByMode: { [VALUE_MODE]: ms },
    });
  });
  primitives.motion.easings.forEach((e) => {
    primitiveVars.push({
      name: `motion/easing/${e.name}`,
      resolvedType: "STRING",
      scopes: ["ALL_SCOPES"],
      valuesByMode: { [VALUE_MODE]: e.value },
    });
  });

  Object.entries(primitives.layout.breakpoints).forEach(([name, px]) => {
    primitiveVars.push({
      name: `layout/breakpoint/${name}`,
      resolvedType: "FLOAT",
      scopes: ["WIDTH_HEIGHT"],
      valuesByMode: { [VALUE_MODE]: px },
    });
  });

  /* ── Collection 2: Semantics (Light + Dark modes) ── */
  const semanticVars: FigmaVariable[] = Object.keys(semantics.modes.light).map(
    (token) => {
      const lightRef = semantics.modes.light[token];
      const darkRef = semantics.modes.dark[token];
      const bind = (ref: string): FigmaVariableValue =>
        ref && ref.startsWith("#") && isValidHex(ref)
          ? hexToFigmaRgba(ref)
          : { type: "VARIABLE_ALIAS", id: `color/${ref.slice(0, ref.lastIndexOf("-"))}/${ref.slice(ref.lastIndexOf("-") + 1)}` };
      return {
        name: token.replace(/-/g, "/"),
        resolvedType: "COLOR",
        scopes: ["ALL_SCOPES"],
        valuesByMode: {
          [LIGHT_MODE]: bind(lightRef),
          [DARK_MODE]: bind(darkRef),
        },
        resolvedValuesByMode: {
          [LIGHT_MODE]: resolveToken(state, "light", token),
          [DARK_MODE]: resolveToken(state, "dark", token),
        },
      };
    }
  );

  const componentsList = Array.from(WIRED_COMPONENTS)
    .filter((cid) => !include || include.has(cid))
    .map((cid) => {
    const spec = COMPONENT_SPECS[cid];
    if (!spec) return null;

    const dims = getVariantDimensions(spec);
    const combos = cartesianProduct(dims);

    const variants: FigmaComponentVariant[] = combos.map((combo) => {
      const styles: Record<string, FigmaStyleBinding> = {};
      const options: Record<string, any> = {};

      // Resolve styles for all part properties
      for (const part of spec.parts) {
        for (const prop of part.props) {
          const override = getBindingForVariant(state, cid, prop.key, combo, prop.stateful);
          let bindingString = override !== null ? override : defBinding(prop, combo["state"] as any);
          if (override === null && cid === "button") {
            // The schema default only describes the "filled" variant — swap in
            // the variant's own recipe (mirrors TokenButton) when unoverridden.
            const vd = buttonVariantDefault(state, combo["variant"], combo["state"], prop.key);
            if (vd !== undefined) bindingString = vd;
          }
          const resolved = resolveBindingToFigma(bindingString, radiusNames);
          if (resolved) {
            styles[prop.key] = resolved;
          }
        }
      }

      // Resolve options
      for (const opt of spec.options ?? []) {
        if (combo[opt.key] !== undefined) {
          options[opt.key] = combo[opt.key];
        } else {
          const stored = state.components[cid]?.properties;
          options[opt.key] = optionValue(stored, opt);
        }
      }

      // Tone washes, accents, and elevation levels the schema doesn't declare.
      injectVariantExtras(state, cid, combo, options, styles, (key) =>
        getBindingForVariant(state, cid, key, combo, true) !== null ||
        getBindingForVariant(state, cid, key, combo, false) !== null
      );

      return {
        properties: combo,
        styles,
        options,
      };
    });
    
    const { name, lane, laneLabel } = laneInfoFor(cid);
    const docs = componentDoc(cid, name);
    return {
      id: spec.id,
      name,
      tier: spec.tier,
      lane,
      laneLabel,
      description: docs.description,
      docs,
      properties: compileFigmaProps(state, cid),
      variants,
    };
  }).filter((c) => c !== null) as FigmaComponent[];

  /* File structure: one Figma page PER COMPONENT, in lane order — each
   * component is managed on its own page instead of a bundled lane page. */
  const pages: FigmaPageDef[] = [];
  for (const lane of COMPONENT_LANES) {
    for (const item of lane.items) {
      if (!componentsList.some((c) => c.id === item.id)) continue;
      pages.push({
        id: item.id,
        label: item.label,
        note: lane.note,
        lane: lane.id,
        laneLabel: lane.label,
        components: [item.id],
      });
    }
  }

  return {
    meta: {
      generator: "Arkitype",
      version: "0.1.0-alpha",
      generatedAt: new Date().toISOString(),
      systemName: state.meta.name || "Arkitype System",
      tokenCount: countTokens(state),
      componentCount: componentsList.length,
    },
    structure: { pages },
    collections: [
      {
        name: "Arkitype / Primitives",
        id: "collection:primitives",
        modes: [{ modeId: VALUE_MODE, name: "Value" }],
        variables: primitiveVars,
      },
      {
        name: "Arkitype / Semantics",
        id: "collection:semantics",
        modes: [
          { modeId: LIGHT_MODE, name: "Light" },
          { modeId: DARK_MODE, name: "Dark" },
        ],
        variables: semanticVars,
      },
    ],
    components: componentsList,
  };
}
