/**
 * Arkitype Component Schema.
 *
 * The declarative description of every component's *styleable surface* — which
 * parts it has (container, label, prefix/suffix icon…), which properties each
 * part exposes (background, text colour, border, radius, padding, font, weight,
 * icon colour/size…), and which of those vary per interaction state.
 *
 * This drives two things:
 *   1. the inspector UI (auto-generated controls, one row per property), and
 *   2. the *default binding* shown for a property before the user overrides it.
 *
 * It does NOT drive rendering defaults — a component renders from its own
 * hardcoded fallback and only diverges once the user stores an override. The
 * `def` here mirrors that fallback so the inspector shows the truth.
 */
import { useDesignSystem } from "@/store/useDesignSystem";
import { resolveBinding } from "@/lib/binding";

export const C_STATES = ["default", "hover", "focus", "active", "disabled"] as const;
export type CState = (typeof C_STATES)[number];

export const STATE_LABEL: Record<CState, string> = {
  default: "Default",
  hover: "Hover",
  focus: "Focus",
  active: "Active",
  disabled: "Disabled",
};

export type BindingType =
  | "color"
  | "space"
  | "radius"
  | "textSize"
  | "weight"
  | "fontRole"
  | "dimension";

export interface PropSpec {
  key: string; // unique within component, e.g. "container.bg"
  label: string;
  type: BindingType;
  stateful?: boolean; // one binding per applicable state
  states?: CState[]; // subset of the component's states (defaults to all)
  def: string | Partial<Record<CState, string>>; // default binding(s)
  min?: number; // for dimension inputs
  max?: number;
}

export interface PartSpec {
  id: string;
  label: string;
  props: PropSpec[];
}

/**
 * A named placement of one molecule inside an organism — e.g. Modal's
 * "primaryAction" is an instance of "button". A slot's `content` may only
 * hold content-level fields (text, icon name, which variant/size to render)
 * — NEVER a colour/space/radius/border/font field. Style always comes from
 * the molecule's own global ComponentConfig; slots have no way to override
 * it, by construction (see `useSlotInstance`).
 */
export interface SlotSpec {
  id: string;
  componentId: string;
  label: string;
  content: OptionSpec[];
}

/**
 * A configurable *option* — a functional choice (not a token binding) that
 * changes what the component IS, not just its colours: tone/variant, whether it
 * shows an icon, is dismissible, its visual style, elevation, etc. Stored under
 * `ComponentConfig.properties[key]` (persisted + exported). One enum option may
 * set `previewAxis` — it becomes the studio's top Variant selector and the
 * preview strip iterates it.
 */
export interface OptionSpec {
  key: string;
  label: string;
  type: "enum" | "boolean" | "text" | "number" | "color";
  options?: Array<{ value: string; label: string }>; // enum choices
  def: string | boolean | number; // read-time default when nothing is stored
  min?: number;
  max?: number;
  previewAxis?: boolean; // enum that drives the Variant selector + strip
}

export interface ComponentSpec {
  id: string;
  tier: 1 | 2;
  states: CState[];
  parts: PartSpec[];
  options?: OptionSpec[];
  /** @deprecated prefer `slots` — kept for organisms not yet migrated (see ATOMIC_DESIGN_PLAN.md). */
  children?: string[];
  /** Named molecule instances this organism embeds. Replaces `children`. */
  slots?: SlotSpec[];
}

/* ── authoring helpers ── */

const prop = (
  key: string,
  label: string,
  type: BindingType,
  def: PropSpec["def"],
  opts: Partial<Pick<PropSpec, "stateful" | "states" | "min" | "max">> = {}
): PropSpec => ({ key, label, type, def, ...opts });

/* ── option-authoring helpers ── */

const enumOpt = (
  key: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  def: string,
  previewAxis = false
): OptionSpec => ({ key, label, type: "enum", options, def, previewAxis });

const boolOpt = (key: string, label: string, def: boolean): OptionSpec => ({
  key,
  label,
  type: "boolean",
  def,
});

const textOpt = (key: string, label: string, def: string): OptionSpec => ({
  key,
  label,
  type: "text",
  def,
});

const numOpt = (key: string, label: string, def: number, min?: number, max?: number): OptionSpec => ({
  key,
  label,
  type: "number",
  def,
  min,
  max,
});

const colorOpt = (key: string, label: string, def: string): OptionSpec => ({
  key,
  label,
  type: "color",
  def,
});

const opt = (value: string, label: string) => ({ value, label });

const STYLE_OPTS = [opt("subtle", "Subtle"), opt("solid", "Solid"), opt("outline", "Outline")];
const FEEDBACK_TONES = [
  opt("info", "Info"),
  opt("success", "Success"),
  opt("warning", "Warning"),
  opt("error", "Error"),
];
const TOAST_TONES = [opt("neutral", "Neutral"), ...FEEDBACK_TONES];
const BANNER_TONES = [opt("brand", "Brand"), ...FEEDBACK_TONES];
const BADGE_TONES = [opt("neutral", "Neutral"), opt("brand", "Brand"), ...FEEDBACK_TONES];
const ELEVATION_OPTS = [
  opt("flat", "Flat"),
  opt("low", "Low"),
  opt("medium", "Medium"),
  opt("high", "High"),
];
const ACCENT_OPTS = [opt("left", "Left bar"), opt("top", "Top bar"), opt("none", "None")];

/** Container: background + border (both stateful) + border width, radius, padding. */
function containerPart(o: {
  bg: PropSpec["def"];
  border?: PropSpec["def"];
  borderWidth?: string;
  radius?: string;
  padX?: string;
  padY?: string;
  states?: CState[];
}): PartSpec {
  const props: PropSpec[] = [
    prop("container.bg", "Background", "color", o.bg, { stateful: true, states: o.states }),
  ];
  if (o.border !== undefined)
    props.push(
      prop("container.border", "Border colour", "color", o.border, {
        stateful: true,
        states: o.states,
      }),
      prop("container.borderWidth", "Border width", "dimension", o.borderWidth ?? "px:1", {
        min: 0,
        max: 8,
      })
    );
  if (o.radius !== undefined)
    props.push(prop("container.radius", "Corner radius", "radius", o.radius));
  if (o.padX !== undefined) props.push(prop("container.padX", "Padding · X", "space", o.padX));
  if (o.padY !== undefined) props.push(prop("container.padY", "Padding · Y", "space", o.padY));
  return { id: "container", label: "Container", props };
}

/** A text/label part: colour (stateful) + font role + weight + size. */
function labelPart(
  id: string,
  label: string,
  o: {
    color: PropSpec["def"];
    font?: string;
    weight?: string;
    size?: string;
    states?: CState[];
  }
): PartSpec {
  const props: PropSpec[] = [
    prop(`${id}.color`, "Colour", "color", o.color, { stateful: true, states: o.states }),
  ];
  if (o.font !== undefined) props.push(prop(`${id}.font`, "Font role", "fontRole", o.font));
  if (o.weight !== undefined) props.push(prop(`${id}.weight`, "Weight", "weight", o.weight));
  if (o.size !== undefined) props.push(prop(`${id}.size`, "Size", "textSize", o.size));
  return { id, label, props };
}

/** An icon part: colour (stateful) + pixel size. */
function iconPart(
  id: string,
  label: string,
  o: { color: PropSpec["def"]; size?: string; states?: CState[] }
): PartSpec {
  return {
    id,
    label,
    props: [
      prop(`${id}.color`, "Colour", "color", o.color, { stateful: true, states: o.states }),
      prop(`${id}.size`, "Size", "dimension", o.size ?? "px:14", { min: 8, max: 48 }),
    ],
  };
}

const ALL: CState[] = ["default", "hover", "focus", "active", "disabled"];
const NO_ACTIVE: CState[] = ["default", "hover", "focus", "disabled"];

/* ────────────────────────────── Controls (full depth) ────────────────────── */

const buttonSpec: ComponentSpec = {
  id: "button",
  tier: 1,
  states: ALL,
  parts: [
    containerPart({
      bg: {
        default: "role:action-primary-default",
        hover: "role:action-primary-hover",
        focus: "role:action-primary-default",
        active: "role:action-primary-active",
        disabled: "role:action-primary-disabled",
      },
      border: "raw:transparent",
      borderWidth: "px:1",
      radius: "radius:2",
      padX: "space:3",
      padY: "space:1",
    }),
    labelPart("label", "Label", {
      color: { default: "role:text-on-action", disabled: "role:text-muted" },
      font: "font:body",
      weight: "weight:semibold",
      size: "text:sm",
    }),
    iconPart("prefixIcon", "Prefix icon", {
      color: { default: "role:text-on-action", disabled: "role:text-muted" },
      size: "px:14",
    }),
    iconPart("suffixIcon", "Suffix icon", {
      color: { default: "role:text-on-action", disabled: "role:text-muted" },
      size: "px:14",
    }),
  ],
  options: [
    enumOpt("variant", "Style Variant", [
      opt("filled", "Filled"),
      opt("tonal", "Filled Tonal"),
      opt("elevated", "Elevated"),
      opt("outlined", "Outlined"),
      opt("text", "Text"),
      opt("error", "Error Tone"),
      opt("warning", "Warning Tone"),
      opt("success", "Success Tone"),
    ], "filled", true),
    textOpt("prefixIcon", "Prefix Icon (Material name)", ""),
    textOpt("suffixIcon", "Suffix Icon (Material name)", ""),
  ],
};

const inputLikeContainer = () =>
  containerPart({
    bg: { default: "role:surface-elevated", disabled: "role:surface-subtle" },
    border: {
      default: "role:border-default",
      hover: "role:text-muted",
      focus: "role:border-focus",
      active: "role:text-muted",
      disabled: "role:border-default",
    },
    borderWidth: "px:1",
    radius: "radius:2",
    padX: "space:3",
    padY: "space:1",
  });

const inputSpec: ComponentSpec = {
  id: "input",
  tier: 1,
  states: ALL,
  parts: [
    inputLikeContainer(),
    labelPart("text", "Text", {
      color: { default: "role:text-primary", disabled: "role:text-muted" },
      font: "font:body",
      size: "text:sm",
    }),
  ],
};

const textareaSpec: ComponentSpec = { ...inputSpec, id: "textarea", tier: 1 };

const selectSpec: ComponentSpec = {
  id: "select",
  tier: 1,
  states: ALL,
  parts: [
    containerPart({
      bg: { default: "role:surface-elevated", disabled: "role:surface-subtle" },
      border: {
        default: "role:border-default",
        hover: "role:text-muted",
        focus: "role:border-focus",
        active: "role:border-focus",
        disabled: "role:border-default",
      },
      radius: "radius:2",
      padX: "space:3",
      padY: "space:1",
    }),
    labelPart("text", "Value text", {
      color: { default: "role:text-primary", disabled: "role:text-muted" },
      font: "font:body",
      size: "text:sm",
    }),
    iconPart("chevron", "Chevron", { color: "role:text-muted", size: "px:13" }),
  ],
};

const searchSpec: ComponentSpec = {
  id: "searchField",
  tier: 1,
  states: ALL,
  parts: [
    containerPart({
      bg: { default: "role:surface-elevated", disabled: "role:surface-subtle" },
      border: {
        default: "role:border-default",
        hover: "role:text-muted",
        focus: "role:border-focus",
        disabled: "role:border-default",
      },
      radius: "radius:2",
      padX: "space:3",
      padY: "space:1",
    }),
    iconPart("prefixIcon", "Search icon", { color: "role:text-muted", size: "px:14" }),
    labelPart("text", "Text", {
      color: { default: "role:text-muted", active: "role:text-primary" },
      font: "font:body",
      size: "text:sm",
    }),
    iconPart("clearIcon", "Clear icon", { color: "role:text-muted", size: "px:13" }),
  ],
};

const stepperSpec: ComponentSpec = {
  id: "stepper",
  tier: 1,
  states: NO_ACTIVE,
  parts: [
    containerPart({
      bg: { default: "role:surface-elevated", disabled: "role:surface-subtle" },
      border: {
        default: "role:border-default",
        hover: "role:text-muted",
        focus: "role:border-focus",
        disabled: "role:border-default",
      },
      radius: "radius:2",
      states: NO_ACTIVE,
    }),
    {
      id: "buttons",
      label: "Step buttons",
      props: [
        prop("buttons.bg", "Background", "color", "role:surface-subtle"),
        prop("buttons.color", "Glyph colour", "color", {
          default: "role:text-secondary",
          disabled: "role:text-muted",
        }, { stateful: true, states: NO_ACTIVE }),
        prop("buttons.divider", "Divider", "color", "role:border-muted"),
      ],
    },
    labelPart("value", "Value", {
      color: { default: "role:text-primary", disabled: "role:text-muted" },
      font: "font:mono",
      size: "text:sm",
    }),
  ],
};

const sliderSpec: ComponentSpec = {
  id: "slider",
  tier: 1,
  states: NO_ACTIVE,
  parts: [
    {
      id: "track",
      label: "Track",
      props: [
        prop("track.bg", "Track", "color", "role:surface-subtle"),
        prop("track.radius", "Track radius", "radius", "radius:7"),
      ],
    },
    {
      id: "fill",
      label: "Fill",
      props: [
        prop("fill.bg", "Fill", "color", {
          default: "role:action-primary-default",
          hover: "role:action-primary-hover",
          disabled: "role:action-primary-disabled",
        }, { stateful: true, states: NO_ACTIVE }),
      ],
    },
    {
      id: "thumb",
      label: "Thumb",
      props: [
        prop("thumb.bg", "Fill", "color", "role:surface-base"),
        prop("thumb.border", "Border", "color", {
          default: "role:action-primary-default",
          disabled: "role:action-primary-disabled",
        }, { stateful: true, states: NO_ACTIVE }),
      ],
    },
  ],
};

const buttonGroupSpec: ComponentSpec = {
  id: "buttonGroup",
  tier: 2,
  children: ["button"],
  states: ["default", "active"],
  parts: [
    {
      id: "container",
      label: "Container",
      props: [
        prop("container.bg", "Background", "color", "role:surface-elevated"),
        prop("container.border", "Border colour", "color", "role:border-default"),
        prop("container.radius", "Corner radius", "radius", "radius:2"),
      ],
    },
    {
      id: "segment",
      label: "Segment",
      props: [
        prop("segment.bg", "Background", "color", {
          default: "raw:transparent",
          active: "role:action-primary-default",
        }, { stateful: true, states: ["default", "active"] }),
        prop("segment.text", "Text", "color", {
          default: "role:text-secondary",
          active: "role:text-on-action",
        }, { stateful: true, states: ["default", "active"] }),
        prop("segment.divider", "Divider", "color", "role:border-muted"),
        prop("segment.font", "Font role", "fontRole", "font:body"),
        prop("segment.size", "Size", "textSize", "text:sm"),
      ],
    },
  ],
};

const iconButtonSpec: ComponentSpec = {
  id: "iconButton",
  tier: 1,
  states: NO_ACTIVE,
  parts: [
    {
      id: "container",
      label: "Shared",
      props: [prop("container.radius", "Corner radius", "radius", "radius:2")],
    },
    iconPart("icon", "Icon", {
      color: {
        default: "role:text-on-action",
        disabled: "role:text-muted",
      },
      size: "px:14",
      states: NO_ACTIVE,
    }),
    {
      id: "solid",
      label: "Solid variant",
      props: [
        prop("solid.bg", "Background", "color", {
          default: "role:action-primary-default",
          hover: "role:action-primary-hover",
          active: "role:action-primary-active",
          disabled: "role:action-primary-disabled",
        }, { stateful: true, states: NO_ACTIVE }),
      ],
    },
    {
      id: "outline",
      label: "Outline variant",
      props: [
        prop("outline.bg", "Background", "color", {
          default: "raw:transparent",
          hover: "role:surface-subtle",
        }, { stateful: true, states: NO_ACTIVE }),
        prop("outline.border", "Border", "color", {
          default: "role:border-default",
          disabled: "role:border-muted",
        }, { stateful: true, states: NO_ACTIVE }),
      ],
    },
    {
      id: "ghost",
      label: "Ghost variant",
      props: [
        prop("ghost.bg", "Background", "color", {
          default: "raw:transparent",
          hover: "role:surface-subtle",
        }, { stateful: true, states: NO_ACTIVE }),
      ],
    },
  ],
  options: [
    enumOpt(
      "variant",
      "Variant",
      [opt("solid", "Solid"), opt("outline", "Outline"), opt("ghost", "Ghost")],
      "solid",
      true
    ),
  ],
};

const checkboxSpec: ComponentSpec = {
  id: "checkbox",
  tier: 1,
  states: NO_ACTIVE,
  parts: [
    {
      id: "box",
      label: "Box",
      props: [
        prop("box.bgOff", "Background · off", "color", "role:surface-elevated"),
        prop("box.bgOn", "Background · on", "color", "role:action-primary-default"),
        prop("box.borderOff", "Border · off", "color", "role:border-default"),
        prop("box.radius", "Corner radius", "radius", "radius:1"),
      ],
    },
    iconPart("check", "Checkmark", { color: "role:text-on-action", size: "px:12" }),
  ],
};

const radioSpec: ComponentSpec = {
  id: "radio",
  tier: 1,
  states: NO_ACTIVE,
  parts: [
    {
      id: "dot",
      label: "Control",
      props: [
        prop("dot.bg", "Background", "color", "role:surface-elevated"),
        prop("dot.border", "Border · off", "color", "role:border-default"),
        prop("dot.fill", "Selected dot", "color", "role:action-primary-default"),
      ],
    },
  ],
};

const switchSpec: ComponentSpec = {
  id: "switch",
  tier: 1,
  states: NO_ACTIVE,
  parts: [
    {
      id: "switchTrack",
      label: "Track",
      props: [
        prop("switchTrack.off", "Off", "color", "role:surface-subtle"),
        prop("switchTrack.on", "On", "color", "role:action-primary-default"),
      ],
    },
    {
      id: "switchThumb",
      label: "Thumb",
      props: [prop("switchThumb.bg", "Fill", "color", "role:surface-base")],
    },
  ],
};

/* ────────────────────── Display / Navigation / Patterns (lighter) ────────── */

const OTHER_SPECS: ComponentSpec[] = [
  /* display */
  {
    id: "badge",
    tier: 1,
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.radius", "Corner radius", "radius", "radius:7"),
          prop("container.padX", "Padding · X", "space", "space:2"),
          prop("text.font", "Font role", "fontRole", "font:body"),
        ],
      },
    ],
    options: [
      enumOpt("tone", "Tone", BADGE_TONES, "brand", true),
      enumOpt("style", "Style", STYLE_OPTS, "subtle"),
      boolOpt("dot", "Status dot", true),
    ],
  },
  {
    id: "tag",
    tier: 1,
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.bg", "Background", "color", "role:surface-subtle"),
          prop("container.radius", "Corner radius", "radius", "radius:2"),
        ],
      },
      {
        id: "text",
        label: "Text",
        props: [
          prop("text.color", "Colour", "color", "role:text-secondary"),
          prop("text.font", "Font role", "fontRole", "font:body"),
        ],
      },
      iconPart("removeIcon", "Remove icon", { color: "role:text-muted", size: "px:11" }),
    ],
  },
  {
    id: "avatar",
    tier: 1,
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.bg", "Background", "color", "role:action-primary-default"),
          prop("container.radius", "Corner radius", "radius", "radius:7"),
        ],
      },
      {
        id: "text",
        label: "Initials",
        props: [
          prop("text.color", "Colour", "color", "role:text-on-action"),
          prop("text.font", "Font role", "fontRole", "font:body"),
        ],
      },
      {
        id: "presence",
        label: "Presence dot",
        props: [
          prop("presence.online", "Online", "color", "role:border-focus"),
          prop("presence.away", "Away", "color", "role:text-muted"),
        ],
      },
    ],
  },
  {
    id: "tooltip",
    tier: 1,
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.bg", "Background", "color", "role:text-primary"),
          prop("container.radius", "Corner radius", "radius", "radius:2"),
        ],
      },
      {
        id: "text",
        label: "Text",
        props: [
          prop("text.color", "Colour", "color", "role:surface-base"),
          prop("text.font", "Font role", "fontRole", "font:body"),
        ],
      },
    ],
  },
  {
    id: "progress",
    tier: 1,
    states: ["default"],
    parts: [
      {
        id: "track",
        label: "Track",
        props: [
          prop("track.bg", "Track", "color", "role:surface-subtle"),
          prop("track.radius", "Radius", "radius", "radius:7"),
        ],
      },
      { id: "fill", label: "Fill", props: [prop("fill.bg", "Fill", "color", "role:action-primary-default")] },
      {
        id: "label",
        label: "Label",
        props: [
          prop("label.title", "Title", "color", "role:text-secondary"),
          prop("label.value", "Value", "color", "role:text-muted"),
        ],
      },
    ],
  },
  {
    id: "spinner",
    tier: 1,
    states: ["default"],
    parts: [
      {
        id: "spinner",
        label: "Spinner",
        props: [
          prop("spinner.color", "Colour", "color", "role:action-primary-default"),
          prop("spinner.muted", "Muted colour", "color", "role:text-muted"),
        ],
      },
    ],
  },
  {
    id: "skeleton",
    tier: 1,
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Blocks",
        props: [
          prop("container.bg", "Fill", "color", "role:surface-subtle"),
          prop("container.radius", "Corner radius", "radius", "radius:2"),
        ],
      },
    ],
  },
  {
    id: "alert",
    tier: 2,
    children: ["button", "iconButton"],
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.radius", "Corner radius", "radius", "radius:3"),
          prop("container.padX", "Padding · X", "space", "space:3"),
          prop("container.padY", "Padding · Y", "space", "space:2"),
          prop("text.font", "Font role", "fontRole", "font:body"),
        ],
      },
    ],
    options: [
      enumOpt("tone", "Tone", FEEDBACK_TONES, "info", true),
      enumOpt("style", "Style", STYLE_OPTS, "subtle"),
      enumOpt("accent", "Accent", ACCENT_OPTS, "left"),
      boolOpt("icon", "Leading icon", true),
      boolOpt("dismissible", "Dismissible", false),
      boolOpt("action", "Action button", false),
    ],
  },
  {
    id: "toast",
    tier: 2,
    children: ["button", "iconButton"],
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.bg", "Background", "color", "role:surface-elevated"),
          prop("container.border", "Border colour", "color", "role:border-default"),
          prop("container.radius", "Corner radius", "radius", "radius:3"),
        ],
      },
      {
        id: "text",
        label: "Text",
        props: [
          prop("text.title", "Title", "color", "role:text-primary"),
          prop("text.body", "Body", "color", "role:text-muted"),
        ],
      },
    ],
    options: [
      enumOpt("tone", "Tone", TOAST_TONES, "success", true),
      enumOpt("elevation", "Elevation", ELEVATION_OPTS, "high"),
      boolOpt("icon", "Leading icon", true),
      boolOpt("action", "Action button", false),
      boolOpt("dismissible", "Dismissible", true),
    ],
  },
  {
    id: "stat",
    tier: 1,
    states: ["default"],
    parts: [
      {
        id: "text",
        label: "Text",
        props: [
          prop("text.label", "Label", "color", "role:text-muted"),
          prop("text.value", "Value", "color", "role:text-primary"),
          prop("text.font", "Value font", "fontRole", "font:body"),
        ],
      },
    ],
  },
  {
    id: "divider",
    tier: 1,
    states: ["default"],
    parts: [
      {
        id: "divider",
        label: "Divider",
        props: [
          prop("divider.line", "Line", "color", "role:border-muted"),
          prop("divider.label", "Label", "color", "role:text-muted"),
        ],
      },
    ],
  },
  {
    id: "kbd",
    tier: 1,
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Keycap",
        props: [
          prop("container.bg", "Background", "color", "role:surface-elevated"),
          prop("container.border", "Border colour", "color", "role:border-default"),
          prop("container.underline", "Underline", "color", "role:border-strong"),
          prop("container.radius", "Corner radius", "radius", "radius:2"),
        ],
      },
      {
        id: "text",
        label: "Text",
        props: [prop("text.color", "Colour", "color", "role:text-secondary")],
      },
    ],
  },
  {
    id: "emptyState",
    tier: 2,
    children: ["button"],
    states: ["default"],
    parts: [
      {
        id: "icon",
        label: "Icon badge",
        props: [
          prop("icon.bg", "Background", "color", "role:surface-subtle"),
          prop("icon.border", "Border", "color", "role:border-muted"),
          prop("icon.color", "Glyph", "color", "role:text-muted"),
          prop("icon.radius", "Corner radius", "radius", "radius:4"),
        ],
      },
      {
        id: "text",
        label: "Text",
        props: [
          prop("text.title", "Title", "color", "role:text-primary"),
          prop("text.body", "Body", "color", "role:text-muted"),
        ],
      },
    ],
  },
  {
    id: "codeBlock",
    tier: 1,
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.bg", "Background", "color", "role:surface-sunken"),
          prop("container.border", "Border colour", "color", "role:border-default"),
          prop("container.radius", "Corner radius", "radius", "radius:3"),
        ],
      },
      {
        id: "syntax",
        label: "Syntax",
        props: [
          prop("syntax.keyword", "Keyword", "color", "role:text-link"),
          prop("syntax.string", "String", "color", "role:action-primary-default"),
          prop("syntax.comment", "Comment", "color", "role:text-muted"),
          prop("syntax.function", "Function", "color", "role:text-primary"),
        ],
      },
    ],
  },
  /* navigation */
  {
    id: "navbar",
    tier: 2,
    children: ["button", "iconButton", "avatar", "badge"],
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.bg", "Background", "color", "role:surface-elevated"),
          prop("container.border", "Bottom border", "color", "role:border-muted"),
        ],
      },
      {
        id: "brand",
        label: "Brand",
        props: [
          prop("brand.mark", "Logo mark", "color", "role:action-primary-default"),
          prop("brand.text", "Wordmark", "color", "role:text-primary"),
        ],
      },
      {
        id: "link",
        label: "Nav links",
        props: [
          prop("link.active", "Active", "color", "role:text-primary"),
          prop("link.activeBg", "Active background", "color", "role:surface-subtle"),
          prop("link.inactive", "Inactive", "color", "role:text-muted"),
        ],
      },
    ],
  },
  {
    id: "sidebar",
    tier: 2,
    children: ["badge", "avatar", "link"],
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.bg", "Background", "color", "role:surface-elevated"),
          prop("container.border", "Right border", "color", "role:border-muted"),
        ],
      },
      {
        id: "item",
        label: "Items",
        props: [
          prop("item.active", "Active text", "color", "role:text-primary"),
          prop("item.inactive", "Inactive text", "color", "role:text-secondary"),
          prop("item.activeBg", "Active background", "color", "role:surface-subtle"),
          prop("item.accent", "Accent bar / icon", "color", "role:action-primary-default"),
          prop("item.radius", "Item radius", "radius", "radius:2"),
        ],
      },
    ],
  },
  {
    id: "breadcrumbs",
    tier: 1,
    states: ["default"],
    parts: [
      {
        id: "text",
        label: "Text",
        props: [
          prop("text.item", "Item", "color", "role:text-muted"),
          prop("text.current", "Current", "color", "role:text-primary"),
          prop("text.sep", "Separator", "color", "role:text-muted"),
        ],
      },
    ],
  },
  {
    id: "steps",
    tier: 1,
    states: ["default"],
    parts: [
      {
        id: "circle",
        label: "Step marker",
        props: [
          prop("circle.on", "Done / active", "color", "role:action-primary-default"),
          prop("circle.onText", "Done / active text", "color", "role:text-on-action"),
          prop("circle.todo", "Upcoming", "color", "role:surface-subtle"),
          prop("circle.todoText", "Upcoming text", "color", "role:text-muted"),
        ],
      },
      {
        id: "label",
        label: "Label",
        props: [
          prop("label.active", "Active", "color", "role:text-primary"),
          prop("label.inactive", "Inactive", "color", "role:text-muted"),
        ],
      },
      {
        id: "connector",
        label: "Connector",
        props: [
          prop("connector.done", "Completed", "color", "role:action-primary-default"),
          prop("connector.todo", "Upcoming", "color", "role:border-muted"),
        ],
      },
    ],
  },
  {
    id: "pagination",
    tier: 2,
    children: ["button", "iconButton"],
    states: ["default"],
    parts: [
      {
        id: "cell",
        label: "Page cell",
        props: [
          prop("cell.activeBg", "Active background", "color", "role:action-primary-default"),
          prop("cell.activeText", "Active text", "color", "role:text-on-action"),
          prop("cell.text", "Text", "color", "role:text-secondary"),
          prop("cell.border", "Border", "color", "role:border-muted"),
          prop("cell.radius", "Radius", "radius", "radius:2"),
        ],
      },
    ],
  },
  {
    id: "dropdown",
    tier: 2,
    children: ["iconButton", "divider"],
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.bg", "Background", "color", "role:surface-elevated"),
          prop("container.border", "Border", "color", "role:border-default"),
          prop("container.radius", "Corner radius", "radius", "radius:3"),
        ],
      },
      {
        id: "item",
        label: "Items",
        props: [
          prop("item.text", "Text", "color", "role:text-secondary"),
          prop("item.activeText", "Highlighted text", "color", "role:text-primary"),
          prop("item.activeBg", "Highlighted background", "color", "role:surface-subtle"),
        ],
      },
    ],
  },
  {
    id: "link",
    tier: 1,
    states: ["default", "hover", "disabled"],
    parts: [
      {
        id: "link",
        label: "Link",
        props: [
          prop("link.default", "Default", "color", "role:text-link"),
          prop("link.hover", "Hover", "color", "role:text-link-hover"),
          prop("link.disabled", "Disabled", "color", "role:text-muted"),
          prop("link.font", "Font role", "fontRole", "font:body"),
        ],
      },
    ],
  },
  /* patterns */
  {
    id: "card",
    tier: 2,
    children: ["badge", "avatar", "button", "divider"],
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.bg", "Background", "color", "role:surface-elevated"),
          prop("container.border", "Border / dividers", "color", "role:border-muted"),
          prop("container.radius", "Corner radius", "radius", "radius:4"),
        ],
      },
      {
        id: "text",
        label: "Text",
        props: [
          prop("text.title", "Title", "color", "role:text-primary"),
          prop("text.value", "Value", "color", "role:text-primary"),
          prop("text.body", "Body", "color", "role:text-secondary"),
          prop("text.action", "Action link", "color", "role:action-primary-default"),
        ],
      },
    ],
  },
  {
    id: "listItem",
    tier: 2,
    children: ["avatar", "badge"],
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.bg", "Background", "color", "role:surface-elevated"),
          prop("container.border", "Border / dividers", "color", "role:border-muted"),
          prop("container.radius", "Corner radius", "radius", "radius:4"),
        ],
      },
      {
        id: "text",
        label: "Text",
        props: [
          prop("text.name", "Name", "color", "role:text-primary"),
          prop("text.meta", "Meta", "color", "role:text-muted"),
          prop("text.amount", "Amount", "color", "role:text-primary"),
        ],
      },
    ],
  },
  {
    id: "feedItem",
    tier: 2,
    children: ["avatar", "badge", "iconButton"],
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.bg", "Background", "color", "role:surface-elevated"),
          prop("container.border", "Border", "color", "role:border-muted"),
          prop("container.radius", "Corner radius", "radius", "radius:4"),
        ],
      },
      {
        id: "text",
        label: "Text",
        props: [
          prop("text.name", "Name", "color", "role:text-primary"),
          prop("text.body", "Body", "color", "role:text-secondary"),
          prop("text.meta", "Meta / actions", "color", "role:text-muted"),
          prop("text.link", "Reply link", "color", "role:text-link"),
        ],
      },
    ],
  },
  {
    id: "accordion",
    tier: 2,
    children: ["iconButton", "divider"],
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.border", "Border / dividers", "color", "role:border-muted"),
          prop("container.openBg", "Open background", "color", "role:surface-elevated"),
          prop("container.radius", "Corner radius", "radius", "radius:3"),
        ],
      },
      {
        id: "text",
        label: "Text",
        props: [
          prop("text.header", "Header", "color", "role:text-primary"),
          prop("text.body", "Body", "color", "role:text-secondary"),
          prop("chevron.color", "Chevron", "color", "role:text-muted"),
        ],
      },
    ],
  },
  {
    id: "banner",
    tier: 2,
    children: ["button", "iconButton"],
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Container",
        props: [
          prop("container.radius", "Corner radius", "radius", "radius:3"),
          prop("container.padX", "Padding · X", "space", "space:3"),
          prop("container.padY", "Padding · Y", "space", "space:2"),
        ],
      },
    ],
    options: [
      enumOpt("tone", "Tone", BANNER_TONES, "brand", true),
      boolOpt("icon", "Leading icon", true),
      boolOpt("action", "Action button", true),
      boolOpt("dismissible", "Dismissible", true),
    ],
  },
  {
    id: "field",
    tier: 2,
    children: ["input", "badge"],
    states: ["default"],
    parts: [
      {
        id: "text",
        label: "Text",
        props: [
          prop("text.label", "Label", "color", "role:text-primary"),
          prop("text.required", "Required mark", "color", "role:feedback-error-text"),
          prop("text.help", "Help", "color", "role:text-muted"),
        ],
      },
    ],
  },
  {
    id: "statGrid",
    tier: 2,
    children: ["divider"],
    states: ["default"],
    parts: [
      {
        id: "cell",
        label: "Cells",
        props: [
          prop("cell.bg", "Background", "color", "role:surface-elevated"),
          prop("cell.border", "Border", "color", "role:border-muted"),
          prop("cell.radius", "Corner radius", "radius", "radius:4"),
        ],
      },
    ],
  },
  {
    id: "statGrid",
    tier: 2,
    children: ["divider"],
    states: ["default"],
    parts: [
      {
        id: "cell",
        label: "Cells",
        props: [
          prop("cell.bg", "Background", "color", "role:surface-elevated"),
          prop("cell.border", "Border", "color", "role:border-muted"),
          prop("cell.radius", "Corner radius", "radius", "radius:4"),
        ],
      },
    ],
  },
  {
    id: "modal",
    tier: 2,
    children: ["button", "iconButton", "input", "select", "alert"],
    slots: [
      {
        id: "primaryAction",
        componentId: "button",
        label: "Primary action",
        content: [
          textOpt("label", "Label", "Confirm"),
          enumOpt("variant", "Style variant", [
            opt("filled", "Filled"),
            opt("tonal", "Filled Tonal"),
            opt("elevated", "Elevated"),
            opt("outlined", "Outlined"),
            opt("text", "Text"),
            opt("error", "Error Tone"),
            opt("warning", "Warning Tone"),
            opt("success", "Success Tone"),
          ], "filled"),
          enumOpt("size", "Size", [opt("sm", "Small"), opt("md", "Medium"), opt("lg", "Large"), opt("xl", "Extra Large")], "sm"),
          textOpt("prefixIcon", "Prefix icon (Material name)", ""),
          textOpt("suffixIcon", "Suffix icon (Material name)", ""),
        ],
      },
      {
        id: "secondaryAction",
        componentId: "button",
        label: "Secondary action",
        content: [
          textOpt("label", "Label", "Cancel"),
          enumOpt("variant", "Style variant", [
            opt("filled", "Filled"),
            opt("tonal", "Filled Tonal"),
            opt("elevated", "Elevated"),
            opt("outlined", "Outlined"),
            opt("text", "Text"),
          ], "outlined"),
          enumOpt("size", "Size", [opt("sm", "Small"), opt("md", "Medium"), opt("lg", "Large"), opt("xl", "Extra Large")], "sm"),
          textOpt("prefixIcon", "Prefix icon (Material name)", ""),
          textOpt("suffixIcon", "Suffix icon (Material name)", ""),
        ],
      },
      {
        id: "closeButton",
        componentId: "iconButton",
        label: "Close icon",
        content: [
          enumOpt("variant", "Variant", [opt("solid", "Solid"), opt("outline", "Outline"), opt("ghost", "Ghost")], "ghost"),
          enumOpt("size", "Size", [opt("sm", "Small"), opt("md", "Medium"), opt("lg", "Large"), opt("xl", "Extra Large")], "sm"),
        ],
      },
    ],
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Layout Properties",
        props: [
          prop("container.bg", "Background", "color", "role:surface-elevated"),
          prop("overlay.bg", "Overlay background", "color", "raw:rgba(9, 9, 11, 0.4)"),
          prop("container.border", "Border colour", "color", "role:border-default"),
          prop("container.radius", "Corner radius", "radius", "radius:4"),
        ],
      },
    ],
    options: [
      enumOpt("skeletonId", "Structure / Layout", [
        opt("1", "Centered Overlay"),
        opt("2", "Right Side-Sheet"),
        opt("3", "Full-Screen Overlay"),
        opt("4", "Bottom-Sheet"),
      ], "1", true),
      textOpt("title", "Title", "Confirm deletion"),
      textOpt("subtitle", "Subtitle", "This action cannot be undone"),
      enumOpt("align", "Text alignment", [opt("left", "Left"), opt("center", "Center")], "left"),
      boolOpt("showClose", "Show close icon", true),
      boolOpt("forcedAction", "Forced Action (No Close Icon)", false),
      enumOpt("position", "Overlay positioning", [opt("center", "Center-Screen"), opt("top", "Top-Aligned"), opt("bottom", "Bottom-Aligned")], "center"),
      boolOpt("showDivider", "Show header line", true),
      numOpt("radius", "Corner radius", 12, 0, 32),
      enumOpt("shadow", "Elevation shadow", [opt("none", "None"), opt("sm", "Small"), opt("md", "Medium"), opt("lg", "Large"), opt("xl", "Extra Large")], "lg"),
      numOpt("borderWidth", "Border thickness", 1, 0, 8),
      textOpt("bodyText", "Body text description", "Are you absolutely sure you want to proceed?"),
      boolOpt("showSecondary", "Show cancel action", true),
      enumOpt("width", "Modal size / width", [opt("xs", "Extra Small"), opt("sm", "Small"), opt("md", "Medium"), opt("lg", "Large")], "sm"),
      numOpt("overlayOpacity", "Backdrop opacity", 40, 0, 100),
      numOpt("paddingH", "Padding · Horizontal", 24, 0, 64),
      numOpt("paddingV", "Padding · Vertical", 24, 0, 64),
    ],
  },
  {
    id: "tabs",
    tier: 2,
    children: ["button", "input", "alert", "searchField", "stepper", "badge"],
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Layout Properties",
        props: [
          prop("container.radius", "Corner radius", "radius", "radius:2"),
          prop("container.borderWidth", "Border width", "dimension", "px:1"),
          prop("container.borderColor", "Border color", "color", "role:border-default"),
        ],
      },
      {
        id: "tab",
        label: "Tab items",
        props: [
          prop("tab.activeBg", "Active background", "color", "role:surface-subtle"),
          prop("tab.activeText", "Active text", "color", "role:text-primary"),
        ],
      },
    ],
    options: [
      enumOpt("skeletonId", "Structure / Layout", [
        opt("1", "Standard Underline"),
        opt("2", "Contained Pills"),
        opt("3", "Segmented Matrix"),
        opt("4", "Vertical Sidebar Stack"),
      ], "1", true),
      numOpt("radius", "Corner radius", 6, 0, 32),
      numOpt("borderWidth", "Border thickness", 1, 0, 8),
      colorOpt("borderColor", "Border color", "#e4e4e7"),
      colorOpt("activeBg", "Active background", "#f4f4f5"),
      colorOpt("activeTextColor", "Active text color", "#18181b"),
      numOpt("padding", "Tab spacing padding", 8, 0, 32),
      boolOpt("showIcons", "Show icons", true),
    ],
  },
  {
    id: "table",
    tier: 2,
    children: ["badge", "avatar", "iconButton"],
    states: ["default"],
    parts: [
      {
        id: "container",
        label: "Layout Properties",
        props: [
          prop("container.bg", "Table background", "color", "role:surface-elevated"),
          prop("container.border", "Table border", "color", "role:border-muted"),
          prop("container.radius", "Corner radius", "radius", "radius:3"),
        ],
      },
    ],
    options: [
      enumOpt("skeletonId", "Structure / Layout", [
        opt("1", "Dense Financial Ledger"),
        opt("2", "Card Grid Layout"),
        opt("3", "Borderless Clean List"),
        opt("4", "Timeline Audit Log"),
      ], "1", true),
      boolOpt("showHeader", "Show table header", true),
      numOpt("borderWidth", "Border thickness", 1, 0, 8),
      colorOpt("borderColor", "Border color", "#e4e4e7"),
      colorOpt("bg", "Table background fill", "#ffffff"),
      numOpt("radius", "Corner radius", 8, 0, 32),
      numOpt("padding", "Cell padding", 12, 0, 48),
      boolOpt("striped", "Striped row background", true),
      numOpt("rowHeight", "Row height limit", 44, 24, 80),
      colorOpt("accentColor", "Accent color highlight", "#4f46e5"),
    ],
  },
];

/* ────────────────────────────── registry ────────────────────────────── */

export const COMPONENT_SPECS: Record<string, ComponentSpec> = Object.fromEntries(
  [
    buttonSpec,
    inputSpec,
    textareaSpec,
    selectSpec,
    searchSpec,
    stepperSpec,
    sliderSpec,
    buttonGroupSpec,
    iconButtonSpec,
    checkboxSpec,
    radioSpec,
    switchSpec,
    ...OTHER_SPECS,
  ].map((s) => [s.id, s])
);

/**
 * Components whose factory renderer actually consumes bindings today, so the
 * inspector shows *live* controls. Others have a schema (for the roadmap) but
 * render the "coming next" note until their renderer is wired. Grows lane by
 * lane; the Controls lane is fully wired.
 */
export const WIRED_COMPONENTS = new Set<string>([
  // Controls
  "button",
  "input",
  "textarea",
  "select",
  "searchField",
  "stepper",
  "slider",
  "buttonGroup",
  "iconButton",
  "checkbox",
  "radio",
  "switch",
  // Display
  "badge",
  "tag",
  "avatar",
  "tooltip",
  "progress",
  "spinner",
  "skeleton",
  "alert",
  "toast",
  "stat",
  "divider",
  "kbd",
  "emptyState",
  "codeBlock",
  // Navigation
  "navbar",
  "sidebar",
  "breadcrumbs",
  "steps",
  "pagination",
  "dropdown",
  "link",
  // Patterns
  "card",
  "modal",
  "tabs",
  "table",
  "listItem",
  "feedItem",
  "accordion",
  "banner",
  "field",
  "statGrid",
]);

/* ────────────────────────────── options ────────────────────────────── */

/** Every configurable option declared for a component. */
export function componentOptions(id: string): OptionSpec[] {
  return COMPONENT_SPECS[id]?.options ?? [];
}

/** The stored value for an option, or its schema default (read-time). */
export function optionValue(
  properties: Record<string, string | number | boolean> | undefined,
  o: OptionSpec
): string | boolean | number {
  const v = properties?.[o.key];
  if (o.type === "boolean") return typeof v === "boolean" ? v : (o.def as boolean);
  if (o.type === "number") return typeof v === "number" ? v : (o.def as number);
  return typeof v === "string" ? v : (o.def as string);
}

/** All resolved option values for a component, keyed by option key. */
export function resolveOptions(
  id: string,
  properties: Record<string, string | number | boolean> | undefined
): Record<string, string | boolean | number> {
  const out: Record<string, string | boolean | number> = {};
  for (const o of componentOptions(id)) out[o.key] = optionValue(properties, o);
  return out;
}

/** The enum option (if any) that drives the studio's Variant selector + strip. */
export function previewAxis(id: string): OptionSpec | undefined {
  return componentOptions(id).find((o) => o.type === "enum" && o.previewAxis);
}

/* ────────────────────────────── resolution ────────────────────────────── */

/** Store key for a property/state: stateful → "key@state", else "key". */
export function bindingKey(key: string, state?: CState): string {
  return state ? `${key}@${state}` : key;
}

/** The default binding for a property (optionally in a given state). */
export function defBinding(p: PropSpec, state?: CState): string {
  if (typeof p.def === "string") return p.def;
  if (state && p.def[state]) return p.def[state] as string;
  return (p.def.default ?? Object.values(p.def)[0] ?? "") as string;
}

/** The effective binding + whether it was overridden by the user. */
export function currentBinding(
  bindings: Record<string, string> | undefined,
  p: PropSpec,
  state?: CState
): { binding: string; overridden: boolean } {
  const st = p.stateful ? state : undefined;
  const stored = bindings?.[bindingKey(p.key, st)];
  if (stored) return { binding: stored, overridden: true };
  return { binding: defBinding(p, state), overridden: false };
}

/**
 * Hook returning a resolver for one component: `resolve(key, state)` gives the
 * CSS value of a *user override*, or `undefined` when nothing is bound (so the
 * caller falls back to its own hardcoded default).
 */
export function useComponentBindings(
  id: string
): (key: string, state?: CState) => string | undefined {
  const bindings = useDesignSystem((s) => s.components[id]?.bindings);
  return (key, state) => {
    if (!bindings) return undefined;
    const b = (state ? bindings[bindingKey(key, state)] : undefined) ?? bindings[key];
    return b ? resolveBinding(b) : undefined;
  };
}

export type Resolver = (key: string, state?: CState) => string | undefined;

/** A no-op resolver for standalone component usage (renders from fallbacks). */
export const NO_BINDINGS: Resolver = () => undefined;

/**
 * Creates a child resolver. Enforces Atomic Design by bypassing parent overrides
 * and returning the child component's own global resolver directly.
 */
export function createChildResolver(
  childId: string,
  parentResolve: Resolver,
  childResolve: Resolver
): Resolver {
  return childResolve;
}

/* ────────────────────────────── helper exports ────────────────────────────── */

export function getComponentTier(id: string): 1 | 2 {
  return COMPONENT_SPECS[id]?.tier ?? 1;
}

export function getComponentChildren(id: string): string[] {
  const spec = COMPONENT_SPECS[id];
  if (spec?.slots?.length) return Array.from(new Set(spec.slots.map((s) => s.componentId)));
  return spec?.children ?? [];
}

/** The stored content overrides + schema defaults for one slot, keyed by content option key. */
export function getSlotSpec(organismId: string, slotId: string): SlotSpec | undefined {
  return COMPONENT_SPECS[organismId]?.slots?.find((s) => s.id === slotId);
}

/**
 * Content-only resolver for one slot instance. `resolve` is the molecule's own
 * global style resolver (never parameterized by the organism — an organism has
 * no way to override a slot's colour/padding/radius/border, by construction).
 * `content` merges the slot's schema defaults with any stored per-instance
 * override (text/icon/variant/size — never a style field).
 */
export function useSlotInstance(
  organismId: string,
  slotId: string
): { resolve: Resolver; content: Record<string, string | number | boolean> } {
  const slot = getSlotSpec(organismId, slotId);
  const stored = useDesignSystem((s) => s.components[organismId]?.instances?.[slotId]);
  const resolve = useComponentBindings(slot?.componentId ?? "");
  const content: Record<string, string | number | boolean> = {};
  for (const o of slot?.content ?? []) {
    content[o.key] = stored?.[o.key] ?? o.def;
  }
  return { resolve, content };
}

export function getParentComponents(childId: string): string[] {
  const parents: string[] = [];
  for (const spec of Object.values(COMPONENT_SPECS)) {
    if (spec.children?.includes(childId)) {
      parents.push(spec.id);
    }
  }
  return parents;
}
