/**
 * Component Templates — alternate *design-system personalities* for every
 * component in the library, modeled on systems that have been through years of
 * real use: Material 3 (Google/MUI), Apple's Human Interface Guidelines, IBM
 * Carbon, Atlassian's ADS and Microsoft's Fluent 2.
 *
 * Two things a template is allowed to change, and nothing else:
 *
 *  1. **Shape grammar** — corner radius, border weight, density, elevation,
 *     label typography, and the handful of treatments that make a system
 *     recognisable at a glance (how a field draws its edge, how a nav marks the
 *     active item, whether a toggle is round or square). This is the
 *     `TemplateProfile` below, and it applies to all 53 components uniformly.
 *  2. **Structure**, for the ten compound components that carry a hand-built
 *     layout per system (Alert, Toast, Banner, Card, Empty state, Accordion,
 *     Dropdown, List item, Feed item, Popover) — see the `material3`/`apple`/
 *     `carbon` branches in the `Token*` components.
 *
 * A template never introduces a literal colour: every value below is a shape,
 * a weight or a multiplier, and each one is applied as a *fallback* underneath
 * the user's own `resolve()` binding — so switching template keeps the file's
 * colours, and any part override already set still wins. See
 * `components/factory/templateKit.tsx` for the helpers that apply a profile.
 *
 * Storage: the active template id lives at `ComponentConfig.properties.template`
 * — a plain, undeclared property (same convention as `radiusStep`/`title.size`),
 * never a schema `OptionSpec`, so it never appears in the generic Options list
 * and needs no store/migration changes. Absent = "arkitype" (today's exact
 * output, unchanged) for every project that never opens the picker.
 */
import { COMPONENT_LANES } from "@/lib/componentLanes";

export type TemplateId = "arkitype" | "material3" | "apple" | "carbon" | "atlassian" | "fluent";

/** Which shape bucket a radius belongs to. A system rounds a button and a
 *  sheet by very different amounts, so one number per template would flatten
 *  exactly the thing that makes it recognisable. */
export type RadiusRole = "control" | "field" | "surface" | "chip" | "toggle" | "overlay";

/** How a text field draws its edge — the single most system-specific detail on
 *  any form, and the one people recognise without being able to name. */
export type FieldTreatment =
  /** box border on all four sides (Arkitype's own, Carbon's "fluid" cousin) */
  | "outline"
  /** tonal fill, one rule along the bottom (Material 3) */
  | "filled-underline"
  /** tonal fill, no border at all (Apple) */
  | "filled"
  /** flat fill with a single hairline bottom rule, square (Carbon) */
  | "underline"
  /** subtle sunken fill inside a heavier border that lights up on focus (Atlassian) */
  | "sunken"
  /** hairline box plus a heavier accent stroke along the bottom edge (Fluent) */
  | "accent-underline";

/** How the active item is marked in a nav/tab/step surface. */
export type IndicatorTreatment =
  /** filled pill behind the label (Material 3) */
  | "pill"
  /** tinted rounded rectangle behind the label (Apple segmented control) */
  | "tint"
  /** square bar along the active edge (Carbon) */
  | "bar"
  /** hairline rule along the active edge (Atlassian) */
  | "underline"
  /** short bar with rounded caps (Fluent) */
  | "rounded-bar";

/** Checkbox/radio/switch shape family. */
export type ToggleTreatment =
  /** softly-rounded box, wide pill track (Material 3) */
  | "soft"
  /** circular check, tall capsule track (Apple) */
  | "round"
  /** square box, square knob (Carbon) */
  | "square";

/** How a container announces itself: a border, a tonal fill, or elevation. */
export type SurfaceTreatment =
  /** tonal fill, no border (Material 3) */
  | "tonal"
  /** elevated neutral surface + shadow, no border (Apple, Atlassian) */
  | "elevated"
  /** flat fill + hairline border, no shadow (Carbon) */
  | "flat"
  /** hairline border + a whisper of shadow (Fluent) */
  | "outlined";

export interface TemplateProfile {
  id: TemplateId;
  name: string;
  /** Short attribution line — a name only, never a literal asset/logo. */
  source: string;
  /**
   * Every field below is nullable, and `null` means exactly one thing: *this
   * template has no opinion, use the component's own fallback*. That's what
   * makes "arkitype" (all-null) provably identical to the pre-template output
   * — there is no branch for it, its profile simply never supplies anything.
   */
  /** px corner radius per shape role. */
  radius: Record<RadiusRole, number> | null;
  /** Multiplier on the component's own padding — `1` is unchanged. */
  density: number;
  /** Hairline width in px for bordered containers. `0` = borderless. */
  border: number | null;
  /** Border width for form fields, where a system draws a heavier one. */
  fieldBorder: number | null;
  /** Elevation recipe. Values are the file's own shadow tokens, never literals. */
  elevation: { raised: string; overlay: string } | null;
  /** Label typography: weight, tracking, and whether labels are uppercased. */
  type: { weight: number; tracking: string; caps: boolean } | null;
  field: FieldTreatment | null;
  indicator: IndicatorTreatment | null;
  toggle: ToggleTreatment | null;
  surface: SurfaceTreatment | null;
}

/* ── the five systems, plus this file's own ──
 *
 * Numbers here are shape only — the corner radii, stroke weights and density
 * each system is known for. They are deliberately literal px: a radius *is*
 * the signature of a system, and it's still only ever a fallback under the
 * user's own radius binding. */

const ARKITYPE_PROFILE: TemplateProfile = {
  id: "arkitype",
  name: "Arkitype (Original)",
  source: "This design system",
  radius: null,
  density: 1,
  border: null,
  fieldBorder: null,
  elevation: null,
  type: null,
  field: null,
  indicator: null,
  toggle: null,
  surface: null,
};

const MATERIAL_PROFILE: TemplateProfile = {
  id: "material3",
  name: "Material 3",
  source: "Google · Material Design / MUI",
  // Fully-rounded controls, generously-rounded surfaces — M3's defining move.
  radius: { control: 999, field: 10, surface: 16, chip: 8, toggle: 4, overlay: 12 },
  density: 1.15,
  border: 0,
  fieldBorder: 0,
  elevation: { raised: "var(--ark-shadow-low)", overlay: "var(--ark-shadow-medium)" },
  type: { weight: 500, tracking: "0.01em", caps: false },
  field: "filled-underline",
  indicator: "pill",
  toggle: "soft",
  surface: "tonal",
};

const APPLE_PROFILE: TemplateProfile = {
  id: "apple",
  name: "Apple (HIG)",
  source: "Apple · Human Interface Guidelines",
  radius: { control: 10, field: 10, surface: 18, chip: 999, toggle: 7, overlay: 14 },
  density: 1,
  border: 0,
  fieldBorder: 0,
  elevation: { raised: "var(--ark-shadow-low)", overlay: "var(--ark-shadow-medium)" },
  type: { weight: 600, tracking: "-0.01em", caps: false },
  field: "filled",
  indicator: "tint",
  toggle: "round",
  surface: "elevated",
};

const CARBON_PROFILE: TemplateProfile = {
  id: "carbon",
  name: "IBM Carbon",
  source: "IBM · Carbon Design System",
  // Zero radius everywhere is the whole point; productive density is tighter
  // than anyone else's.
  radius: { control: 0, field: 0, surface: 0, chip: 0, toggle: 0, overlay: 0 },
  density: 0.88,
  border: 1,
  fieldBorder: 1,
  elevation: { raised: "none", overlay: "var(--ark-shadow-low)" },
  type: { weight: 600, tracking: "0.02em", caps: false },
  field: "underline",
  indicator: "bar",
  toggle: "square",
  surface: "flat",
};

const ATLASSIAN_PROFILE: TemplateProfile = {
  id: "atlassian",
  name: "Atlassian",
  source: "Atlassian · Design System",
  // ADS's 3px corner is unmistakable next to everyone else's 8–16.
  radius: { control: 3, field: 3, surface: 8, chip: 3, toggle: 3, overlay: 8 },
  density: 0.95,
  border: 0,
  fieldBorder: 2,
  elevation: { raised: "var(--ark-shadow-low)", overlay: "var(--ark-shadow-medium)" },
  type: { weight: 600, tracking: "0em", caps: false },
  field: "sunken",
  indicator: "underline",
  toggle: "soft",
  surface: "elevated",
};

const FLUENT_PROFILE: TemplateProfile = {
  id: "fluent",
  name: "Fluent 2",
  source: "Microsoft · Fluent Design",
  radius: { control: 4, field: 4, surface: 8, chip: 999, toggle: 4, overlay: 8 },
  density: 1,
  border: 1,
  fieldBorder: 1,
  elevation: { raised: "var(--ark-shadow-low)", overlay: "var(--ark-shadow-medium)" },
  type: { weight: 600, tracking: "0em", caps: false },
  field: "accent-underline",
  indicator: "rounded-bar",
  toggle: "soft",
  surface: "outlined",
};

export const TEMPLATE_PROFILES: Record<TemplateId, TemplateProfile> = {
  arkitype: ARKITYPE_PROFILE,
  material3: MATERIAL_PROFILE,
  apple: APPLE_PROFILE,
  carbon: CARBON_PROFILE,
  atlassian: ATLASSIAN_PROFILE,
  fluent: FLUENT_PROFILE,
};

/** Presentation order in the picker: this file's own first, then the systems. */
export const TEMPLATE_ORDER: TemplateId[] = [
  "arkitype",
  "material3",
  "apple",
  "carbon",
  "atlassian",
  "fluent",
];

/* ── what each system does to each kind of component ── */

/** The shape family a component belongs to — decides which half of a profile
 *  actually shows up on it, and therefore what the picker should promise. */
export type ComponentFamily =
  | "control"
  | "field"
  | "toggle"
  | "surface"
  | "indicator"
  | "nav"
  | "data"
  /** Tracks, rules and spinners — parts with no container of their own, where a
   *  system shows up in cap shape and label voice rather than in a corner. */
  | "rule";

/** Every id in `COMPONENT_LANES` maps to exactly one family. Checked against
 *  the lanes at module load in dev (see the console.warn below) so a component
 *  added to the library can't silently miss out on templates. */
export const COMPONENT_FAMILY: Record<string, ComponentFamily> = {
  /* controls */
  button: "control",
  iconButton: "control",
  buttonGroup: "control",
  input: "field",
  textarea: "field",
  select: "field",
  searchField: "field",
  checkbox: "toggle",
  radio: "toggle",
  switch: "toggle",
  slider: "control",
  stepper: "control",
  chip: "indicator",
  datePicker: "field",
  fileUpload: "field",
  /* display */
  badge: "indicator",
  tag: "indicator",
  avatar: "indicator",
  tooltip: "surface",
  progress: "rule",
  spinner: "rule",
  skeleton: "indicator",
  alert: "surface",
  toast: "surface",
  stat: "data",
  rating: "rule",
  avatarGroup: "indicator",
  divider: "rule",
  kbd: "indicator",
  popover: "surface",
  emptyState: "surface",
  codeBlock: "surface",
  /* navigation */
  tabs: "nav",
  navbar: "nav",
  sidebar: "nav",
  breadcrumbs: "nav",
  steps: "nav",
  pagination: "nav",
  dropdown: "surface",
  tree: "nav",
  jumplist: "nav",
  link: "nav",
  /* patterns */
  modal: "surface",
  table: "data",
  card: "surface",
  listItem: "data",
  feedItem: "surface",
  accordion: "surface",
  banner: "surface",
  field: "field",
  statGrid: "data",
  timeline: "data",
  drawer: "surface",
};

/**
 * One sentence per system per family — what picking it will actually do to
 * this kind of component. Written from the profile above rather than from
 * memory of the system, so the copy and the rendering can't drift.
 */
const FAMILY_BLURB: Record<TemplateId, Record<ComponentFamily, string>> = {
  arkitype: {
    control: "This file's own control — your radius scale, your spacing steps.",
    field: "This file's own field — bordered box on your radius scale.",
    toggle: "This file's own toggle — your radius scale, 18px box, pill track.",
    surface: "This file's own surface — hairline border, your radius scale.",
    indicator: "This file's own indicator — bordered, on your radius scale.",
    nav: "This file's own wayfinding — your radius scale and spacing.",
    data: "This file's own density — ruled rows on your spacing scale.",
    rule: "This file's own rhythm — your radius scale, your spacing, your label voice.",
  },
  material3: {
    control: "Fully-rounded pill and airy padding — Material's control shape.",
    field: "Tonal filled field with a single underline — no outline box.",
    toggle: "Softly-rounded box and a wide pill track with a large knob.",
    surface: "Borderless tonal surface, 16px corners, text-only actions.",
    indicator: "8px corners, no border, medium 500 label.",
    nav: "A filled pill sits behind the active item.",
    data: "Borderless rows on a tonal surface, generous row height.",
    rule: "Rounded caps, airier spacing between marks, medium 500 label.",
  },
  apple: {
    control: "10px continuous corners, medium-weight label.",
    field: "Filled grey field, no outline at all, 10px corners.",
    toggle: "Circular check and a tall capsule track — iOS Settings.",
    surface: "Neutral elevated card, soft shadow, 18px corners.",
    indicator: "Fully-rounded capsule, no border.",
    nav: "A tinted rounded segment sits behind the active item.",
    data: "18px corners, borderless rows carried on soft elevation.",
    rule: "Fully-rounded caps, standard spacing, tight medium-weight label.",
  },
  carbon: {
    control: "Square corners and productive (tighter) density.",
    field: "Flat field with one bottom rule and square corners.",
    toggle: "Square box, square knob, square track.",
    surface: "Square corners, hairline rules, flat fill — no shadow.",
    indicator: "Square corners, hairline border, tight tracking.",
    nav: "A square 3px bar marks the active item.",
    data: "Square, ruled and compact — Carbon's data density.",
    rule: "Square caps, square tracks and tighter spacing — nothing rounded.",
  },
  atlassian: {
    control: "3px corners and compact padding — the tightest of the five.",
    field: "Sunken subtle fill inside a 2px border that lights on focus.",
    toggle: "3px box on a compact track.",
    surface: "8px corners, no border, resting-elevation shadow.",
    indicator: "3px lozenge — the tightest corner of the five.",
    nav: "A 2px rule marks the active item.",
    data: "8px elevated card with ruled rows, compact density.",
    rule: "Rounded caps, compact spacing, bold label.",
  },
  fluent: {
    control: "4px corners, semibold label.",
    field: "1px stroke plus a heavier accent stroke along the bottom edge.",
    toggle: "4px box and a pill track with a small dot knob.",
    surface: "8px corners, 1px stroke, low ambient shadow.",
    indicator: "Capsule badge and chip, semibold label.",
    nav: "A short rounded bar marks the active item.",
    data: "8px stroked surface with ruled rows.",
    rule: "Rounded caps, standard spacing, semibold label.",
  },
};

/**
 * Hand-written descriptions for the ten compound components that carry a
 * bespoke *structure* per system (not just the shape grammar) — these say what
 * the layout does, which is more than the family blurb can promise. Anything
 * absent here falls back to `FAMILY_BLURB`.
 */
const STRUCTURAL_BLURB: Partial<Record<string, Partial<Record<TemplateId, string>>>> = {
  alert: {
    arkitype: "Icon, stacked title and body, accent bar on one edge.",
    material3: "Tonal filled surface, no border, generous corners, text-only action.",
    apple: "Elevated neutral card with a tinted icon badge, like an iOS in-app notification.",
    carbon: "Square corners, bold left bar, top-right close, underlined text action.",
  },
  toast: {
    arkitype: "Elevated card, circular icon badge, inline title and body.",
    material3: "Tonal filled surface, no border, pill-leaning corners, text-only action.",
    apple: "Compact elevated card with a tinted app-icon-style badge, iOS notification banner style.",
    carbon: "Square corners, bold left bar, flat fill, underlined text action.",
  },
  banner: {
    arkitype: "Full-width tone wash with a hairline border and inline action.",
    material3: "Tonal filled bar, no border, pill action button trailing.",
    apple: "Neutral elevated bar with a tinted icon badge and a plain trailing link.",
    carbon: "Square corners, bold left bar, flat fill, underlined text action.",
  },
  card: {
    arkitype: "Bordered surface, ruled header/footer, filled button.",
    material3: "Borderless tonal-elevated surface, generous corners, text-only action.",
    apple: "Grouped-list style card — neutral surface, soft shadow, chevron affordance.",
    carbon: "Square corners, ruled dividers, underlined text action.",
  },
  emptyState: {
    arkitype: "Bordered icon roundel, centered stack, filled button.",
    material3: "Tonal icon roundel, generous corners, filled button.",
    apple: "Large glyph, bold title, secondary body, plain text action link.",
    carbon: "Square icon frame, left-aligned copy, underlined text action.",
  },
  accordion: {
    arkitype: "Bordered container, chevron rotates open, ruled rows.",
    material3: "Tonal-filled row when open, no outer border, generous corners.",
    apple: "Inset grouped rows with hairline dividers, iOS Settings list style.",
    carbon: "Square corners, ruled dividers, bold header row, plus/minus glyph.",
  },
  dropdown: {
    arkitype: "Bordered menu, subtle highlight on the active row.",
    material3: "Borderless tonal surface, filled pill highlight, larger row height.",
    apple: "Elevated rounded menu with dividers and trailing checkmarks, macOS context-menu style.",
    carbon: "Square corners, compact rows, left accent bar on the active row.",
  },
  listItem: {
    arkitype: "Bordered container, ruled rows, trailing chevron.",
    material3: "Borderless surface, rounded tonal highlight on rows, larger avatar.",
    apple: "Inset grouped rows with hairline dividers and chevrons, iOS Settings style.",
    carbon: "Square corners, ruled rows, compact structured-list density.",
  },
  feedItem: {
    arkitype: "Bordered card, avatar-led header, inline reaction row.",
    material3: "Borderless tonal-elevated card, generous corners, text-only reply link.",
    apple: "Neutral elevated card, bold author line, plain trailing chevron.",
    carbon: "Square corners, ruled divider under the header, underlined reply link.",
  },
  popover: {
    arkitype: "Bordered elevated card, inline close and action.",
    material3: "Borderless tonal-elevated surface, generous corners, text-only action.",
    apple: "Neutral elevated card, soft shadow, plain trailing text action.",
    carbon: "Square corners, ruled divider above the action, underlined text action.",
  },
};

export interface ComponentTemplate {
  id: TemplateId;
  name: string;
  source: string;
  /** One sentence on what's different from the default. */
  description: string;
  /** True where the template also swaps the component's *layout*, not just its
   *  shape grammar — surfaced in the picker so the promise matches the render. */
  structural: boolean;
}

/** Which components carry a hand-built layout per system, and for which ids.
 *  "arkitype" never counts: it *is* the layout being departed from, so marking
 *  its card as a rebuild would promise a change that picking it can't make. */
export function hasStructuralTemplate(componentId: string, templateId: TemplateId): boolean {
  if (templateId === "arkitype") return false;
  return Boolean(STRUCTURAL_BLURB[componentId]?.[templateId]);
}

function familyOf(componentId: string): ComponentFamily {
  return COMPONENT_FAMILY[componentId] ?? "surface";
}

const templateCache = new Map<string, ComponentTemplate[]>();

/**
 * Every template for a component, "Arkitype" first. Never empty — a component
 * outside the lane inventory still gets the full set through its fallback
 * family, so callers never need a null-check before reading `[0]`.
 */
export function getTemplates(componentId: string): ComponentTemplate[] {
  const cached = templateCache.get(componentId);
  if (cached) return cached;
  const family = familyOf(componentId);
  const list = TEMPLATE_ORDER.map((id) => {
    const profile = TEMPLATE_PROFILES[id];
    return {
      id,
      name: profile.name,
      source: profile.source,
      description: STRUCTURAL_BLURB[componentId]?.[id] ?? FAMILY_BLURB[id][family],
      structural: hasStructuralTemplate(componentId, id),
    };
  });
  templateCache.set(componentId, list);
  return list;
}

/** Whether a component has more than the default to choose from. Every
 *  component in the library does now; kept as the picker's gate so a future
 *  component that opts out still renders no chrome. */
export function hasTemplates(componentId: string): boolean {
  return getTemplates(componentId).length > 1;
}

/** The effective template id for a component: a stored `properties.template`
 *  if present and still valid, else "arkitype". Centralizing this (rather than
 *  repeating `(properties?.template as string) ?? "arkitype"` at every call
 *  site) keeps the "unknown/removed template id" case handled in one place. */
export function activeTemplateId(
  componentId: string,
  properties: Record<string, string | number | boolean> | undefined
): TemplateId {
  const stored = properties?.template;
  if (typeof stored !== "string" || !stored) return "arkitype";
  const known = getTemplates(componentId).some((t) => t.id === stored);
  return known ? (stored as TemplateId) : "arkitype";
}

export function getTemplate(componentId: string, templateId: string): ComponentTemplate {
  return (
    getTemplates(componentId).find((t) => t.id === templateId) ?? getTemplates(componentId)[0]
  );
}

/** The shape grammar for a template id. Unknown ids resolve to Arkitype's
 *  all-null profile, which is what "render exactly as before" means. */
export function templateProfile(templateId: string | undefined): TemplateProfile {
  if (!templateId) return ARKITYPE_PROFILE;
  return TEMPLATE_PROFILES[templateId as TemplateId] ?? ARKITYPE_PROFILE;
}

/* A component in the lanes with no family would quietly get the "surface"
 * fallback and describe itself wrongly in the picker. Say so in dev instead. */
if (process.env.NODE_ENV !== "production") {
  const missing = COMPONENT_LANES.flatMap((lane) => lane.items)
    .map((item) => item.id)
    .filter((id) => !COMPONENT_FAMILY[id]);
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `[arkitype] componentTemplates: no COMPONENT_FAMILY entry for ${missing.join(", ")} — ` +
        `their template descriptions fall back to "surface".`
    );
  }
}
