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
  type: "enum" | "boolean";
  options?: Array<{ value: string; label: string }>; // enum choices
  def: string | boolean; // read-time default when nothing is stored
  previewAxis?: boolean; // enum that drives the Variant selector + strip
}

export interface ComponentSpec {
  id: string;
  states: CState[];
  parts: PartSpec[];
  options?: OptionSpec[];
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

const textareaSpec: ComponentSpec = { ...inputSpec, id: "textarea" };

const selectSpec: ComponentSpec = {
  id: "select",
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
    ],
  },
  {
    id: "toast",
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
): string | boolean {
  const v = properties?.[o.key];
  if (o.type === "boolean") return typeof v === "boolean" ? v : (o.def as boolean);
  return typeof v === "string" ? v : (o.def as string);
}

/** All resolved option values for a component, keyed by option key. */
export function resolveOptions(
  id: string,
  properties: Record<string, string | number | boolean> | undefined
): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
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
