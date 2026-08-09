/**
 * Ready-made variable sets.
 *
 * Starting a set from nothing means naming eight tokens and picking sixteen
 * values before anything is worth looking at. These are the sets a design
 * system reaches for anyway — focus rings, disabled states, chart series, a
 * tooltip's own colours — written out once, wired to the file's own ramps and
 * roles, and dropped in as a single undoable edit.
 *
 * A preset is a *starting point*, not a template: once applied it's ordinary
 * tokens, editable and deletable like anything else. Nothing here is stored,
 * referenced, or re-applied later.
 *
 * Values are written against family *slots* — "{brand}-500", "{neutral}-900/50"
 * — because a file's ramps are the user's, not ours. `resolvePreset` binds each
 * slot to a real family (see {@link pickFamily}), and swaps any "@role" whose
 * role isn't in the file for the primitive fallback declared beside it.
 */

/** One variable in a preset, in the same value grammar `lib/tokens.ts` reads. */
export interface PresetToken {
  name: string;
  /** Light value: a "{slot}-step" reference, an "@role", or a raw hex. */
  light: string;
  /** Dark value. Omitted means "same in both modes" — the @role case. */
  dark?: string;
  /**
   * Where to point when `light`/`dark` name a role the file doesn't have.
   * Required on any token that references an "@role".
   */
  fallback?: { light: string; dark: string };
}

export interface VariableSetPreset {
  id: string;
  /** The set's name — becomes the group label, and the card on the map. */
  label: string;
  kind: "semantic" | "component";
  /** One line, in the user's words, on what this set is for. */
  blurb: string;
  tokens: PresetToken[];
}

/* ────────────────────────── the library ────────────────────────── */

export const VARIABLE_SET_PRESETS: VariableSetPreset[] = [
  /* ── semantic roles ── */
  {
    id: "focus-overlay",
    label: "Focus & overlay",
    kind: "semantic",
    blurb: "The focus ring, and the scrims that sit over the page",
    tokens: [
      { name: "focus-ring", light: "{brand}-500", dark: "{brand}-400" },
      { name: "focus-ring-offset", light: "{neutral}-50", dark: "{neutral}-900" },
      { name: "overlay-scrim", light: "{neutral}-900/50", dark: "{neutral}-900/70" },
      { name: "overlay-veil", light: "{neutral}-50/80", dark: "{neutral}-800/80" },
    ],
  },
  {
    id: "selection",
    label: "Selection & highlight",
    kind: "semantic",
    blurb: "What a selected row, chip or search hit looks like",
    tokens: [
      { name: "selected-surface", light: "{brand}-50", dark: "{brand}-900" },
      { name: "selected-border", light: "{brand}-400", dark: "{brand}-500" },
      { name: "selected-text", light: "{brand}-700", dark: "{brand}-200" },
      { name: "highlight-surface", light: "{warning}-100", dark: "{warning}-800" },
      { name: "highlight-text", light: "{neutral}-900", dark: "{neutral}-50" },
    ],
  },
  {
    id: "disabled",
    label: "Disabled",
    kind: "semantic",
    blurb: "One set of greys for every control that can't be used",
    tokens: [
      { name: "disabled-surface", light: "{neutral}-100", dark: "{neutral}-800" },
      { name: "disabled-text", light: "{neutral}-400", dark: "{neutral}-600" },
      { name: "disabled-border", light: "{neutral}-200", dark: "{neutral}-700" },
    ],
  },
  {
    id: "chart",
    label: "Chart",
    kind: "semantic",
    blurb: "A six-colour categorical series, plus grid and axis",
    tokens: [
      { name: "chart-1", light: "{brand}-500", dark: "{brand}-400" },
      { name: "chart-2", light: "{secondary}-500", dark: "{secondary}-400" },
      { name: "chart-3", light: "{success}-500", dark: "{success}-400" },
      { name: "chart-4", light: "{warning}-500", dark: "{warning}-400" },
      { name: "chart-5", light: "{error}-500", dark: "{error}-400" },
      { name: "chart-6", light: "{neutral}-500", dark: "{neutral}-400" },
      { name: "chart-grid", light: "{neutral}-200", dark: "{neutral}-700" },
      { name: "chart-axis", light: "{neutral}-400", dark: "{neutral}-500" },
    ],
  },

  /* ── component tokens: each points at a role, so it follows light/dark ── */
  {
    id: "badge",
    label: "Badge",
    kind: "component",
    blurb: "A neutral badge that follows your surface and text roles",
    tokens: [
      {
        name: "badge-bg",
        light: "@surface-subtle",
        fallback: { light: "{neutral}-100", dark: "{neutral}-800" },
      },
      {
        name: "badge-text",
        light: "@text-secondary",
        fallback: { light: "{neutral}-700", dark: "{neutral}-200" },
      },
      {
        name: "badge-border",
        light: "@border-muted",
        fallback: { light: "{neutral}-200", dark: "{neutral}-700" },
      },
    ],
  },
  {
    id: "table",
    label: "Table",
    kind: "component",
    blurb: "Header, rows, hover and rules for a data table",
    tokens: [
      {
        name: "table-bg",
        light: "@surface-base",
        fallback: { light: "{neutral}-50", dark: "{neutral}-900" },
      },
      {
        name: "table-header-bg",
        light: "@surface-subtle",
        fallback: { light: "{neutral}-100", dark: "{neutral}-800" },
      },
      {
        name: "table-row-hover",
        light: "@surface-elevated",
        fallback: { light: "{neutral}-100", dark: "{neutral}-800" },
      },
      {
        name: "table-text",
        light: "@text-primary",
        fallback: { light: "{neutral}-900", dark: "{neutral}-50" },
      },
      {
        name: "table-border",
        light: "@border-muted",
        fallback: { light: "{neutral}-200", dark: "{neutral}-700" },
      },
    ],
  },
  {
    id: "tooltip",
    label: "Tooltip",
    kind: "component",
    blurb: "The inverted little panel that explains a control",
    tokens: [
      {
        name: "tooltip-bg",
        light: "@surface-overlay",
        fallback: { light: "{neutral}-900", dark: "{neutral}-100" },
      },
      {
        name: "tooltip-text",
        light: "@text-on-action",
        fallback: { light: "{neutral}-50", dark: "{neutral}-900" },
      },
      {
        name: "tooltip-border",
        light: "@border-strong",
        fallback: { light: "{neutral}-700", dark: "{neutral}-300" },
      },
    ],
  },
  {
    id: "dialog",
    label: "Dialog",
    kind: "component",
    blurb: "A modal's panel and the scrim behind it",
    tokens: [
      {
        name: "dialog-bg",
        light: "@surface-elevated",
        fallback: { light: "{neutral}-50", dark: "{neutral}-800" },
      },
      {
        name: "dialog-text",
        light: "@text-primary",
        fallback: { light: "{neutral}-900", dark: "{neutral}-50" },
      },
      {
        name: "dialog-border",
        light: "@border-default",
        fallback: { light: "{neutral}-200", dark: "{neutral}-700" },
      },
      { name: "dialog-scrim", light: "{neutral}-900/50", dark: "{neutral}-900/70" },
    ],
  },
  {
    id: "nav",
    label: "Navigation",
    kind: "component",
    blurb: "Sidebar and top-nav items, including the active indicator",
    tokens: [
      {
        name: "nav-bg",
        light: "@surface-base",
        fallback: { light: "{neutral}-50", dark: "{neutral}-900" },
      },
      {
        name: "nav-text",
        light: "@text-secondary",
        fallback: { light: "{neutral}-600", dark: "{neutral}-300" },
      },
      {
        name: "nav-text-active",
        light: "@text-primary",
        fallback: { light: "{neutral}-900", dark: "{neutral}-50" },
      },
      {
        name: "nav-hover",
        light: "@surface-subtle",
        fallback: { light: "{neutral}-100", dark: "{neutral}-800" },
      },
      {
        name: "nav-indicator",
        light: "@action-primary-default",
        fallback: { light: "{brand}-600", dark: "{brand}-400" },
      },
    ],
  },
  {
    id: "toast",
    label: "Toast",
    kind: "component",
    blurb: "The transient notification, and the action inside it",
    tokens: [
      {
        name: "toast-bg",
        light: "@surface-overlay",
        fallback: { light: "{neutral}-900", dark: "{neutral}-100" },
      },
      {
        name: "toast-text",
        light: "@text-on-action",
        fallback: { light: "{neutral}-50", dark: "{neutral}-900" },
      },
      {
        name: "toast-border",
        light: "@border-strong",
        fallback: { light: "{neutral}-700", dark: "{neutral}-300" },
      },
      {
        name: "toast-action",
        light: "@action-primary-default",
        fallback: { light: "{brand}-400", dark: "{brand}-600" },
      },
    ],
  },
];

/* ────────────────────────── resolution ────────────────────────── */

/**
 * Names a file might have used for the slot a preset asks for. Checked after an
 * exact id match and a substring match, so "brand-warm" wins over "primary"
 * when both exist.
 */
const NEAR_NAMES: Record<string, string[]> = {
  brand: ["primary", "accent", "main"],
  secondary: ["accent", "support", "brand"],
  neutral: ["gray", "grey", "slate", "stone", "zinc", "mono"],
  success: ["green", "positive", "ok"],
  warning: ["amber", "orange", "caution", "yellow"],
  error: ["red", "danger", "destructive", "critical", "negative"],
};

/** The family in this file that best answers a preset's "{slot}". */
export function pickFamily(slot: string, familyIds: string[]): string {
  if (familyIds.length === 0) return slot;
  if (familyIds.includes(slot)) return slot;
  const near = familyIds.find((id) => id.includes(slot) || slot.includes(id));
  if (near) return near;
  for (const alt of NEAR_NAMES[slot] ?? []) {
    const hit = familyIds.find((id) => id.includes(alt));
    if (hit) return hit;
  }
  // Nothing close. Greys are the safest stand-in for a missing ramp; anything
  // else falls back to whatever the file leads with.
  if (slot === "neutral") return familyIds[familyIds.length - 1];
  return familyIds[0];
}

/** Swap every "{slot}" for a real family id. */
function bindSlots(value: string, familyIds: string[]): string {
  return value.replace(/\{([a-z0-9-]+)\}/gi, (_, slot: string) => pickFamily(slot, familyIds));
}

/** The role an "@role" value points at, or null for anything else. */
function roleOf(value: string): string | null {
  return value.startsWith("@") ? value.slice(1).split("/")[0] : null;
}

/**
 * A preset, made concrete against one file: slots bound to its ramps, and any
 * role reference the file can't honour replaced by the primitive fallback
 * declared alongside it. The result is ready for `createVariableSet`.
 */
export function resolvePreset(
  preset: VariableSetPreset,
  familyIds: string[],
  existingTokens: ReadonlySet<string>
): Array<{ name: string; light: string; dark: string }> {
  return preset.tokens.map((t) => {
    const light = t.light;
    const dark = t.dark ?? t.light;
    const role = roleOf(light);
    // A component token whose role is missing would render as loud magenta and
    // read as a bug in the preset. Point it at the ramp instead.
    if (role && !existingTokens.has(role) && t.fallback) {
      return {
        name: t.name,
        light: bindSlots(t.fallback.light, familyIds),
        dark: bindSlots(t.fallback.dark, familyIds),
      };
    }
    return {
      name: t.name,
      light: bindSlots(light, familyIds),
      dark: bindSlots(dark, familyIds),
    };
  });
}

/** How much of this preset is already in the file — drives the "added" hint. */
export function presetNovelty(
  preset: VariableSetPreset,
  existingTokens: ReadonlySet<string>
): { total: number; missing: number } {
  const missing = preset.tokens.filter((t) => !existingTokens.has(t.name)).length;
  return { total: preset.tokens.length, missing };
}
