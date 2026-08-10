/**
 * Arkitype Variable Graph.
 *
 * The system's token structure, read as a *graph* rather than as lists. Every
 * variable in the file — primitive ramp steps and scales, semantic roles,
 * component tokens, and the component properties that consume them — becomes a
 * node; every alias becomes an edge. This is what the Variables tab draws, and
 * it's derived state: nothing here is persisted, so the graph can never drift
 * from the store it was built from.
 *
 * Four tiers, left to right, mirroring how a value actually flows:
 *
 *   primitive → semantic role → component token → component property
 *   brand-600   action-primary   button-bg        Button · container.bg
 *
 * A semantic/component token's stored value is either a ramp reference
 * ("brand-600"), an "@token" alias, or a raw hex — the same grammar
 * `lib/tokens.ts` resolves. A component property holds a *binding*
 * ("role:text-primary", "space:3") — the grammar in `lib/binding.ts`. Both
 * become edges here, so one picture covers the whole chain.
 */
import {
  ArkitypeState,
  ModeDef,
  PreviewMode,
  RADII_NAMES,
  SemanticGroup,
  TokenKind,
  modeDefsOf,
  shadowToCss,
} from "@/store/useDesignSystem";
import {
  describeTokenValue,
  resolveRef,
  resolveTokenValue,
  splitAlpha,
  splitTypedValue,
  tokenKind,
  valueKind,
} from "@/lib/tokens";
import { bindingSwatch, describeBinding, parseBinding } from "@/lib/binding";
import { rampStepLabels } from "@/lib/color";
import { generateTypeScale, STEP_DEFS } from "@/lib/typography";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import {
  COMPONENT_SPECS,
  BindingType,
  ComponentSpec,
  PropSpec,
  STATE_LABEL,
  CState,
  bindingKey,
  defBinding,
} from "@/lib/componentSchema";

/* ────────────────────────────── model ────────────────────────────── */

/** Which band of the graph a node sits in. Rank doubles as the tier index. */
export type VarTier = "primitive" | "semantic" | "component" | "usage";

export const TIER_RANK: Record<VarTier, number> = {
  primitive: 0,
  semantic: 1,
  component: 2,
  usage: 3,
};

export const TIER_ORDER: VarTier[] = ["primitive", "semantic", "component", "usage"];

/**
 * How a tier presents itself — everywhere. The map, the rail, the inspector and
 * the legend all read this one table, so a tier looks the same wherever you
 * meet it.
 *
 * Colour is a shortcut, never the only cue: every accent ships with an ordinal
 * (1–4, which doubles as "how far along the chain you are") and a distinct
 * word, so the map is still readable in greyscale or at 40% zoom.
 */
export interface TierMeta {
  /** 1-based position in the chain — rendered on every card and rail row. */
  step: number;
  /** Singular, for one variable ("Semantic role"). */
  label: string;
  /** Plural, for bands and counts ("Semantic roles"). */
  plural: string;
  /** One line, in the user's words, on what this band holds. */
  blurb: string;
  /** The channel-form custom property carrying this tier's accent. */
  cssVar: string;
}

export const TIER_META: Record<VarTier, TierMeta> = {
  primitive: {
    step: 1,
    label: "Primitive",
    plural: "Primitives",
    blurb: "Raw values — the ramps and scales everything else is built from",
    cssVar: "--c-tier-primitive",
  },
  semantic: {
    step: 2,
    label: "Semantic role",
    plural: "Semantic roles",
    blurb: "Jobs, not values — what a colour is for, pointed at a primitive",
    cssVar: "--c-tier-semantic",
  },
  component: {
    step: 3,
    label: "Component token",
    plural: "Component tokens",
    blurb: "A component's own names, usually pointed at a role",
    cssVar: "--c-tier-component",
  },
  usage: {
    step: 4,
    label: "Component property",
    plural: "Component properties",
    blurb: "The end of the line — a real property on a real component",
    cssVar: "--c-tier-usage",
  },
};

/** A tier's accent as a paintable colour, optionally at partial alpha. */
export function tierColor(tier: VarTier, alpha = 1): string {
  return `rgb(var(${TIER_META[tier].cssVar})${alpha === 1 ? "" : ` / ${alpha}`})`;
}

/**
 * What a node *carries*. Connections are only legal between matching kinds
 * (you can't alias a radius step into a colour role), so this is the type
 * system of the canvas. Shared with the store, since a token now declares its
 * own kind through its value (see `lib/tokens.ts`).
 */
export type VarKind = TokenKind;

export interface VarNode {
  /** Stable across rebuilds: "prim:color:brand-600", "tok:surface-base", "use:button:container.bg". */
  id: string;
  collectionId: string;
  tier: VarTier;
  kind: VarKind;
  /** Row label — short, because it reads inside its collection card. */
  label: string;
  /** Fully-qualified name, for search and the inspector header. */
  path: string;
  /** The copyable reference, in the same form the Tokens panel hands out. */
  ref: string;
  /** The emitted custom property, or "" for usage nodes (which have none). */
  cssVar: string;
  /** Raw stored value per mode — token nodes only. */
  raw?: Record<PreviewMode, string>;
  /** Resolved hex per mode — colour nodes only. */
  swatch?: Record<PreviewMode, string>;
  /** Right-aligned secondary text on the row (px value, weight, family…). */
  detail?: string;
  /** Set on usage nodes so a drop can be validated against the prop's type. */
  usage?: {
    componentId: string;
    storageKey: string;
    propKey: string;
    state?: CState;
    type: BindingType;
    /**
     * False when this row is still on the schema's default binding — nothing is
     * stored for it, so there is a wire to *move* but nothing to cut.
     */
    overridden: boolean;
  };
}

export interface VarCollection {
  id: string;
  label: string;
  /** Second line in the card header — what this collection is. */
  note?: string;
  tier: VarTier;
  kind: VarKind;
  nodes: VarNode[];
  /** Where "+ Add" writes, for the tiers that accept new variables inline. */
  addTo?: { kind: "role" | "componentToken"; groupLabel: string };
  /** Group/family this card came from, so the inspector can act on it. */
  source?: { groupLabel?: string; familyId?: string; componentId?: string; laneLabel?: string };
  /**
   * Folded on the map until someone asks for it. The component lane holds every
   * component in the library, and a lane that opened all of them at once would
   * be four hundred rows deep — so the ones nobody has customised read as a list
   * of names, one click from their rows. Unfolding sticks (see `VariablesUI`).
   */
  defaultCollapsed?: boolean;
  /**
   * A generated scale that nothing in the file points at yet, kept on the map
   * with "hide unused primitives" on rather than dropped from it. Losing a few
   * ramp steps to that setting is a tidy-up; losing Motion entirely is the map
   * telling you your file has no motion scale, which isn't true.
   */
  unreferenced?: boolean;
}

/**
 * One connection.
 *
 * A token alias holds in some set of modes — usually all of them, since most
 * tokens point at the same place whatever the mode; the ones that differ are
 * exactly the interesting ones. A component binding holds in every mode by
 * construction (it resolves to a `var()`, which flips on its own), so it
 * carries `binding: true` and an empty mode list rather than pretending to be
 * mode-specific.
 */
export interface VarEdge {
  id: string;
  from: string;
  to: string;
  /** Modes this alias applies in. Empty on a binding. */
  modes: PreviewMode[];
  binding: boolean;
  /** Alpha the consumer applies on top of the source, if any. */
  alpha: number | null;
}

/** True when an alias holds in every mode the file has — the common case. */
export const isEveryMode = (edge: VarEdge, all: number): boolean =>
  edge.binding || edge.modes.length >= all;

export interface VarIssue {
  nodeId: string;
  mode: PreviewMode;
  type: "broken" | "cycle";
  message: string;
}

export interface VariableGraph {
  collections: VarCollection[];
  nodes: Record<string, VarNode>;
  order: string[];
  edges: VarEdge[];
  /** Adjacency, precomputed — the canvas highlights chains on every hover. */
  outgoing: Record<string, string[]>;
  incoming: Record<string, string[]>;
  issues: VarIssue[];
}

type GraphState = Pick<ArkitypeState, "primitives" | "semantics" | "components">;

/* ────────────────────────────── ids ────────────────────────────── */

export const tokenNodeId = (token: string): string => `tok:${token}`;
export const colorNodeId = (ref: string): string => `prim:color:${ref}`;
export const usageNodeId = (componentId: string, storageKey: string): string =>
  `use:${componentId}:${storageKey}`;

/** The token name behind a "tok:" id, or null for any other node. */
export function nodeTokenName(id: string): string | null {
  return id.startsWith("tok:") ? id.slice(4) : null;
}

/* ────────────────────────────── build ────────────────────────────── */

/** The file's modes, in table order. Light and dark are always among them. */
const modesOf = (state: GraphState): ModeDef[] => modeDefsOf(state.semantics);

/**
 * The node a stored token *value* points at, or null when the value is a
 * literal (a raw hex, a "px:" dimension) or dangles. Alpha suffixes are
 * stripped first — a "brand-600/40" still points at brand-600, it just lands
 * there at 40%.
 *
 * Typed values ("radius:md", "space:3") point at the primitive of that type, so
 * a component token's corner is as much a wire on the map as its fill is.
 */
function valueSource(
  state: GraphState,
  value: string
): { id: string; alpha: number | null } | null {
  if (!value) return null;
  const { base, alpha } = splitAlpha(value.trim());
  if (!base || base.startsWith("#")) return null;
  if (base.startsWith("@")) return { id: tokenNodeId(base.slice(1)), alpha };

  const typed = splitTypedValue(base);
  if (!typed) return { id: colorNodeId(base), alpha };

  switch (typed.prefix) {
    case "space":
      return { id: `prim:space:${typed.rest}`, alpha: null };
    case "radius": {
      const names = state.primitives.radiusNames ?? [...RADII_NAMES];
      const name = names.includes(typed.rest) ? typed.rest : names[Number(typed.rest)];
      return name ? { id: `prim:radius:${name}`, alpha: null } : null;
    }
    case "text":
      return { id: `prim:size:${typed.rest}`, alpha: null };
    case "weight":
      return { id: `prim:weight:${typed.rest}`, alpha: null };
    case "font":
      return { id: `prim:font:${typed.rest}`, alpha: null };
    case "shadow":
      return { id: `prim:shadow:${typed.rest}`, alpha: null };
    case "duration":
      return { id: `prim:duration:${typed.rest}`, alpha: null };
    case "ease":
      return { id: `prim:ease:${typed.rest}`, alpha: null };
    default:
      return null; // px: — a literal, with nothing to point at
  }
}

/**
 * The inverse: the value that points a token at a given node — the thing
 * written when a wire is dropped or a source picked. A colour primitive keeps
 * the bare grammar the colour surfaces already write; every other type names
 * itself, so the value says what it is without needing its consumer to.
 */
export function tokenValueFor(node: VarNode, radiusNames: string[]): string | null {
  if (node.tier === "usage") return null;
  if (node.tier !== "primitive") return `@${node.path}`;

  const [, group, rest] = node.id.split(":");
  switch (group) {
    case "color":
      return rest;
    case "space":
      return `space:${rest}`;
    case "radius":
      // The node id already carries the step's *name*, which is the form that
      // survives a scale being re-ordered — so it's the form that's written.
      return `radius:${radiusNames.includes(rest) ? rest : (radiusNames[0] ?? rest)}`;
    case "size":
      return `text:${rest}`;
    case "weight":
      return `weight:${rest}`;
    case "font":
      return `font:${rest}`;
    case "shadow":
      return `shadow:${rest}`;
    case "duration":
      return `duration:${rest}`;
    case "ease":
      return `ease:${rest}`;
    default:
      return null;
  }
}

/** The node a component *binding* points at, or null for literals. */
function bindingSource(state: GraphState, binding: string): string | null {
  const { kind, value } = parseBinding(binding);
  switch (kind) {
    case "role":
      return tokenNodeId(value);
    case "prim":
      return colorNodeId(value);
    case "space":
      return `prim:space:${value}`;
    case "radius": {
      const names = state.primitives.radiusNames ?? RADII_NAMES;
      const name = names[Number(value)] ?? value;
      return `prim:radius:${name}`;
    }
    case "text":
    case "leading":
      return `prim:size:${value}`;
    case "weight":
      return `prim:weight:${value}`;
    case "font":
      return `prim:font:${value}`;
    default:
      return null; // hex / px / raw — a literal, with nothing to point at
  }
}

/** Every primitive in the file, as collections of nodes. */
function primitiveCollections(state: GraphState): VarCollection[] {
  const p = state.primitives;
  const out: VarCollection[] = [];

  // Colour ramps — one card per family, one row per step.
  for (const fam of p.colorFamilies) {
    const ramp = p.colors[fam.id] ?? [];
    const labels = rampStepLabels(fam.steps);
    out.push({
      id: `colors:${fam.id}`,
      label: fam.name,
      note: "colour ramp",
      tier: "primitive",
      kind: "color",
      source: { familyId: fam.id },
      nodes: labels.map((step, i) => {
        const hex = ramp[i] ?? "#000000";
        return {
          id: colorNodeId(`${fam.id}-${step}`),
          collectionId: `colors:${fam.id}`,
          tier: "primitive" as const,
          kind: "color" as const,
          label: String(step),
          path: `${fam.id}-${step}`,
          ref: `{colors.${fam.id}-${step}}`,
          cssVar: `--ark-${fam.id}-${step}`,
          swatch: { light: hex, dark: hex },
          detail: hex.toUpperCase(),
        };
      }),
    });
  }

  // Spacing — 1-indexed to match --ark-space-N.
  out.push({
    id: "scale:space",
    label: "Spacing",
    note: `${p.spacingBase}px base`,
    tier: "primitive",
    kind: "space",
    nodes: p.spacing.map((px, i) => ({
      id: `prim:space:${i + 1}`,
      collectionId: "scale:space",
      tier: "primitive" as const,
      kind: "space" as const,
      label: `space-${i + 1}`,
      path: `space-${i + 1}`,
      ref: `{spacing.${i + 1}}`,
      cssVar: `--ark-space-${i + 1}`,
      detail: `${px}px`,
    })),
  });

  // Radii
  const radiusNames = p.radiusNames ?? RADII_NAMES;
  out.push({
    id: "scale:radius",
    label: "Radius",
    tier: "primitive",
    kind: "radius",
    nodes: radiusNames.map((name, i) => ({
      id: `prim:radius:${name}`,
      collectionId: "scale:radius",
      tier: "primitive" as const,
      kind: "radius" as const,
      label: name,
      path: `radius-${name}`,
      ref: `{radius.${name}}`,
      cssVar: `--ark-radius-${name}`,
      detail: `${p.radii[i] ?? 0}px`,
    })),
  });

  // Type scale
  const t = p.typography;
  const steps = generateTypeScale(
    t.baseSize,
    t.scaleFactor,
    { rounding: t.rounding, sizeOverrides: t.sizeOverrides, leadingOverrides: t.leadingOverrides, stepAssign: t.stepAssign },
    t.stepDefs ?? STEP_DEFS
  );
  out.push({
    id: "scale:size",
    label: "Type scale",
    note: `${t.baseSize}px · ×${t.scaleFactor}`,
    tier: "primitive",
    kind: "size",
    nodes: steps.map((s) => ({
      id: `prim:size:${s.name}`,
      collectionId: "scale:size",
      tier: "primitive" as const,
      kind: "size" as const,
      label: s.name,
      path: `text-${s.name}`,
      ref: `{fontSize.${s.name}}`,
      cssVar: `--ark-text-${s.name}`,
      detail: `${s.size}px`,
    })),
  });

  // Weights
  out.push({
    id: "scale:weight",
    label: "Weights",
    tier: "primitive",
    kind: "weight",
    nodes: t.weights.map((w) => ({
      id: `prim:weight:${w.name}`,
      collectionId: "scale:weight",
      tier: "primitive" as const,
      kind: "weight" as const,
      label: w.name,
      path: `weight-${w.name}`,
      ref: `{fontWeight.${w.name}}`,
      cssVar: `--ark-font-weight-${w.name}`,
      detail: String(w.value),
    })),
  });

  // Font roles
  out.push({
    id: "scale:font",
    label: "Font families",
    tier: "primitive",
    kind: "font",
    nodes: Object.entries(t.fontRoles).map(([role, r]) => ({
      id: `prim:font:${role}`,
      collectionId: "scale:font",
      tier: "primitive" as const,
      kind: "font" as const,
      label: role,
      path: `font-${role}`,
      ref: `{fonts.${role}}`,
      cssVar: `--ark-font-${role}`,
      detail: r.family.split(",")[0],
    })),
  });

  // Elevation
  out.push({
    id: "scale:shadow",
    label: "Elevation",
    tier: "primitive",
    kind: "shadow",
    nodes: p.elevation.light.map((def, i) => ({
      id: `prim:shadow:${def.name}`,
      collectionId: "scale:shadow",
      tier: "primitive" as const,
      kind: "shadow" as const,
      label: def.name,
      path: `shadow-${def.name}`,
      ref: `{shadows.${def.name}}`,
      cssVar: `--ark-shadow-${def.name}`,
      detail: shadowToCss(p.elevation.light[i] ?? def).slice(0, 22),
    })),
  });

  // Motion
  out.push({
    id: "scale:motion",
    label: "Motion",
    note: "durations · easings",
    tier: "primitive",
    kind: "duration",
    nodes: [
      ...Object.entries(p.motion.durations).map(([name, ms]) => ({
        id: `prim:duration:${name}`,
        collectionId: "scale:motion",
        tier: "primitive" as const,
        kind: "duration" as const,
        label: name,
        path: `duration-${name}`,
        ref: `{motion.duration-${name}}`,
        cssVar: `--ark-duration-${name}`,
        detail: `${ms}ms`,
      })),
      ...p.motion.easings.map((e) => ({
        id: `prim:ease:${e.name}`,
        collectionId: "scale:motion",
        tier: "primitive" as const,
        kind: "ease" as const,
        label: e.name,
        path: `ease-${e.name}`,
        ref: `{motion.ease-${e.name}}`,
        cssVar: `--ark-ease-${e.name}`,
        detail: e.value.replace("cubic-bezier", "cb"),
      })),
    ],
  });

  return out.filter((c) => c.nodes.length > 0);
}

/** Semantic + component token collections, one card per group. */
function tokenCollections(state: GraphState): VarCollection[] {
  const { groups, modes } = state.semantics;
  const defs = modesOf(state);
  return groups.map((g: SemanticGroup) => {
    const tier: VarTier = g.kind === "component" ? "component" : "semantic";
    const id = `${tier}:${g.label}`;
    return {
      id,
      label: g.label,
      note: tier === "component" ? "component tokens" : "semantic roles",
      tier,
      kind: "color" as const,
      source: { groupLabel: g.label },
      addTo: { kind: tier === "component" ? ("componentToken" as const) : ("role" as const), groupLabel: g.label },
      nodes: g.tokens
        .filter((token) => defs.some((d) => modes[d.id]?.[token] !== undefined))
        .map((token) => {
          // A token's type is a property of what it holds, not of the set it
          // sits in — so a Button set can carry its corner and its padding
          // beside its fill, and each row is checked against its own type.
          const kind = tokenKind(state, token);
          const raw: Record<string, string> = {};
          const swatch: Record<string, string> = {};
          for (const d of defs) {
            raw[d.id] = modes[d.id]?.[token] ?? "";
            if (kind === "color") swatch[d.id] = resolveTokenValue(state, d.id, raw[d.id]);
          }
          return {
            id: tokenNodeId(token),
            collectionId: id,
            tier,
            kind,
            label: token,
            path: token,
            ref: `@${token}`,
            cssVar: `--ark-${token}`,
            raw,
            ...(kind === "color"
              ? { swatch }
              : { detail: describeTokenValue(state.primitives, raw[defs[0]?.id ?? "light"] ?? "") }),
          };
        }),
    };
  });
}

/**
 * One row of a component card: a property (in a state, where the property has
 * states) and the binding it actually renders from.
 */
interface UsageRow {
  /** The key this property is stored under — "container.bg", "container.bg@hover". */
  storageKey: string;
  state?: CState;
  /** The binding in force: the stored override, or the schema's default. */
  binding: string;
  /** True when that binding came from the store rather than the schema. */
  overridden: boolean;
}

/**
 * The rows one property contributes.
 *
 * A stateful property earns extra rows only for the states that are actually
 * *different* — Button's background is a separate colour on hover and on
 * active, but its focus colour is its default colour, and five identical rows
 * per property would bury the two that matter. Any state you have overridden
 * appears whether the schema distinguishes it or not, because by then it is
 * different by definition.
 */
function usageRows(
  spec: ComponentSpec,
  p: PropSpec,
  bindings: Record<string, string>
): UsageRow[] {
  if (!p.stateful) {
    const stored = bindings[p.key];
    return [
      { storageKey: p.key, binding: stored ?? defBinding(p), overridden: stored !== undefined },
    ];
  }

  const states = p.states ?? spec.states;
  const base = states[0];
  const baseDef = defBinding(p, base);
  const out: UsageRow[] = [];
  for (const st of states) {
    const storageKey = bindingKey(p.key, st);
    const stored = bindings[storageKey];
    const def = defBinding(p, st);
    if (st !== base && stored === undefined && def === baseDef) continue;
    out.push({ storageKey, state: st, binding: stored ?? def, overridden: stored !== undefined });
  }
  return out;
}

/**
 * The consuming end: every component in the library, and every property each
 * one styles.
 *
 * This lane used to hold only the bindings someone had overridden by hand,
 * which kept it small and made it useless — a file with fifty-three components
 * showed two cards, and the one thing you come to a map for (see where a
 * component gets its colour, then point it somewhere else) could only be done
 * for wiring you had already done somewhere else. So every component is here,
 * always, each property sitting on the binding it really renders from: the
 * schema's default until you move it, your own after. Moving one is the same
 * gesture either way, which is the whole point of having them in one place.
 *
 * Order is the component library's own — Controls, Display, Navigation,
 * Patterns, in the order the lanes list them — so a component is where it is in
 * the Components step, not somewhere else because of its initial letter.
 */
function usageCollections(state: GraphState): VarCollection[] {
  const defs = modesOf(state);
  const radiusNames = state.primitives.radiusNames ?? [...RADII_NAMES];
  const out: VarCollection[] = [];

  for (const lane of COMPONENT_LANES) {
    for (const item of lane.items) {
      const spec = COMPONENT_SPECS[item.id];
      if (!spec) continue;
      const bindings = state.components[item.id]?.bindings ?? {};
      const collectionId = `use:${item.id}`;

      const nodes: VarNode[] = [];
      let changed = 0;
      for (const part of spec.parts) {
        for (const p of part.props) {
          const base = (p.states ?? spec.states)[0];
          for (const row of usageRows(spec, p, bindings)) {
            const kind = bindingKindOf(p.type);
            const suffix =
              row.state && row.state !== base ? ` (${STATE_LABEL[row.state] ?? row.state})` : "";
            if (row.overridden) changed += 1;

            // A bound colour resolves through the whole chain to a hex, so the
            // row can show the colour it lands on rather than the name of the
            // thing that decides it.
            const swatch: Record<PreviewMode, string> = {};
            if (kind === "color") {
              for (const d of defs) {
                const hex = bindingSwatch(state, d.id, row.binding);
                if (hex) swatch[d.id] = hex;
              }
            }

            nodes.push({
              id: usageNodeId(item.id, row.storageKey),
              collectionId,
              tier: "usage",
              kind,
              label: `${part.label} · ${p.label}${suffix}`,
              path: `${item.label} · ${p.key}${suffix}`,
              ref: row.binding,
              cssVar: "",
              ...(Object.keys(swatch).length > 0 ? { swatch } : {}),
              detail: describeBinding(row.binding, radiusNames).label,
              usage: {
                componentId: item.id,
                storageKey: row.storageKey,
                propKey: p.key,
                state: row.state,
                type: p.type,
                overridden: row.overridden,
              },
            });
          }
        }
      }
      if (nodes.length === 0) continue;

      out.push({
        id: collectionId,
        label: item.label,
        note: changed > 0 ? `${lane.label.toLowerCase()} · ${changed} changed` : lane.label.toLowerCase(),
        tier: "usage",
        kind: "color",
        source: { componentId: item.id, laneLabel: lane.label },
        // A component you've customised is the interesting card, so it opens.
        // The rest keep the lane to a readable list of names.
        defaultCollapsed: changed === 0,
        nodes,
      });
    }
  }
  return out;
}

/* ────────────────────── where a primitive is edited ────────────────────── */

/**
 * Primitives are generated scales, not a list you type into: a ramp comes from
 * a seed, spacing from a base × multipliers, type from a base × a ratio. So the
 * Variables surfaces don't try to be a second editor for them — they say where
 * the real one is and take you there.
 *
 * Two destinations, because they answer two different questions:
 *   • the **step** tunes the scale — the generator, the curve, each value
 *   • the **Tokens panel** changes its *shape* — add a step, remove one, rename
 *
 * Both already exist and are the only places either edit has ever happened;
 * this is the route to them, not a copy of them.
 */
export interface PrimitiveHome {
  /** The builder step that tunes this scale's values. */
  step: "colour" | "type" | "space" | "shape" | "motion";
  /** That step's name, for the button. */
  stepLabel: string;
  /** The Tokens-panel section that adds and removes steps, if it has one. */
  section?: string;
  /** What the Tokens panel calls that section. */
  sectionLabel?: string;
  /** Anchor for the step's own "scroll to this" mechanism, where it has one. */
  anchor?: string;
}

export function primitiveHome(collection: VarCollection): PrimitiveHome | null {
  if (collection.tier !== "primitive") return null;

  if (collection.id.startsWith("colors:")) {
    return {
      step: "colour",
      stepLabel: "Colour",
      section: "colors",
      sectionLabel: "Colors",
      anchor: collection.source?.familyId,
    };
  }

  switch (collection.id) {
    case "scale:space":
      return { step: "space", stepLabel: "Spacing", section: "spacing", sectionLabel: "Spacing" };
    case "scale:radius":
      return { step: "shape", stepLabel: "Shape", section: "radius", sectionLabel: "Radius" };
    case "scale:size":
      return {
        step: "type",
        stepLabel: "Typography",
        section: "type-steps",
        sectionLabel: "Font Scale Steps",
      };
    case "scale:weight":
      // Weights are tuned on the Type step; the Tokens panel has no separate
      // section for them, so there's nowhere honest to send an "add" to.
      return { step: "type", stepLabel: "Typography" };
    case "scale:font":
      return { step: "type", stepLabel: "Typography", section: "fonts", sectionLabel: "Font Families" };
    case "scale:shadow":
      return {
        step: "shape",
        stepLabel: "Shape",
        section: "elevation",
        sectionLabel: "Elevation (Shadows)",
      };
    case "scale:motion":
      return { step: "motion", stepLabel: "Motion", section: "motion", sectionLabel: "Motion" };
    default:
      return null;
  }
}

/** A prop's binding type, expressed in the graph's kind vocabulary. */
function bindingKindOf(type: BindingType | undefined): VarKind {
  switch (type) {
    case "space":
      return "space";
    case "radius":
      return "radius";
    case "textSize":
      return "size";
    case "weight":
      return "weight";
    case "fontRole":
      return "font";
    case "dimension":
      return "dimension";
    default:
      return "color";
  }
}

/** Which node kinds may legally feed a consumer of this kind. */
export function acceptsKind(consumer: VarKind, provider: VarKind): boolean {
  if (consumer === "dimension") return provider === "space";
  return consumer === provider;
}

export function buildVariableGraph(state: GraphState): VariableGraph {
  const collections = [
    ...primitiveCollections(state),
    ...tokenCollections(state),
    ...usageCollections(state),
  ];

  const nodes: Record<string, VarNode> = {};
  const order: string[] = [];
  for (const c of collections) {
    for (const n of c.nodes) {
      if (nodes[n.id]) continue; // first definition wins; ids are unique by construction
      nodes[n.id] = n;
      order.push(n.id);
    }
  }

  // ── edges ──
  // Token aliases are per mode, but the same pair usually recurs across every
  // mode — so they're collected once and carry the list of modes they hold in,
  // rather than stacking N identical lines on one path.
  const perPair: Record<string, { from: string; to: string; alpha: number | null; modes: PreviewMode[] }> = {};
  for (const def of modesOf(state)) {
    for (const [token, value] of Object.entries(state.semantics.modes[def.id] ?? {})) {
      const to = tokenNodeId(token);
      if (!nodes[to]) continue; // a value with no group — not on the canvas
      const src = valueSource(state, value);
      if (!src || !nodes[src.id]) continue;
      const key = `${src.id}→${to}`;
      const entry = (perPair[key] ??= { from: src.id, to, alpha: src.alpha, modes: [] });
      entry.modes.push(def.id);
      if (src.alpha !== null) entry.alpha = src.alpha;
    }
  }

  const edges: VarEdge[] = Object.entries(perPair).map(([key, e]) => ({
    id: `a:${key}`,
    from: e.from,
    to: e.to,
    modes: e.modes,
    binding: false,
    alpha: e.alpha,
  }));

  // Component bindings — mode-independent by construction (a binding resolves
  // to a var(), and the var flips per mode on its own). Read off the usage
  // nodes rather than the store, since a property's binding is its default
  // until someone overrides it and a default is every bit as much a wire.
  for (const c of collections) {
    if (c.tier !== "usage") continue;
    for (const n of c.nodes) {
      const from = bindingSource(state, n.ref);
      if (!from || !nodes[from]) continue;
      edges.push({ id: `b:${from}→${n.id}`, from, to: n.id, modes: [], binding: true, alpha: null });
    }
  }

  const outgoing: Record<string, string[]> = {};
  const incoming: Record<string, string[]> = {};
  for (const e of edges) {
    (outgoing[e.from] ??= []).push(e.to);
    (incoming[e.to] ??= []).push(e.from);
  }

  return { collections, nodes, order, edges, outgoing, incoming, issues: findIssues(state, nodes) };
}

/* ────────────────────────── health ────────────────────────── */

/**
 * Dangling references and alias cycles — the two ways a token can be wired to
 * nothing. Both render as loud magenta at runtime (see lib/tokens.ts), which is
 * a fine last resort but a poor first warning; the canvas flags them instead.
 */
function findIssues(state: GraphState, nodes: Record<string, VarNode>): VarIssue[] {
  const issues: VarIssue[] = [];
  for (const def of modesOf(state)) {
    const mode = def.id;
    const map = state.semantics.modes[mode] ?? {};
    for (const [token, value] of Object.entries(map)) {
      const id = tokenNodeId(token);
      if (!nodes[id]) continue;
      const { base } = splitAlpha((value ?? "").trim());
      if (!base) {
        issues.push({ nodeId: id, mode, type: "broken", message: `${token} has no value in ${def.name}` });
        continue;
      }
      if (base.startsWith("#")) continue;

      // A typed value names a primitive of its own type: it's sound exactly
      // when that primitive is still in the file.
      const typed = splitTypedValue(base);
      if (typed) {
        if (typed.prefix === "px") continue;
        const src = valueSource(state, base);
        if (!src || !nodes[src.id]) {
          issues.push({
            nodeId: id,
            mode,
            type: "broken",
            message: `${token} points at ${base}, which isn't in the ${typed.kind} scale`,
          });
        }
        continue;
      }

      if (base.startsWith("@")) {
        // Walk the alias chain, watching for a repeat.
        const seen = new Set<string>([token]);
        let cur = base.slice(1);
        let broken = false;
        for (let i = 0; i < 32; i++) {
          if (seen.has(cur)) {
            issues.push({
              nodeId: id,
              mode,
              type: "cycle",
              message: `${token} → @${cur} loops back on itself in ${def.name}`,
            });
            broken = true;
            break;
          }
          seen.add(cur);
          const next = map[cur];
          if (next === undefined) {
            issues.push({
              nodeId: id,
              mode,
              type: "broken",
              message: `${token} points at @${cur}, which doesn't exist`,
            });
            broken = true;
            break;
          }
          const nb = splitAlpha(next.trim()).base;
          if (!nb.startsWith("@")) {
            // The chain ends on a typed value — sound if that scale still has
            // the step, and never a "missing swatch" (it isn't a colour).
            const endTyped = splitTypedValue(nb);
            if (endTyped) {
              if (endTyped.prefix !== "px" && !nodes[valueSource(state, nb)?.id ?? ""]) {
                issues.push({
                  nodeId: id,
                  mode,
                  type: "broken",
                  message: `${token} resolves through @${cur} to ${nb}, which isn't in the ${endTyped.kind} scale`,
                });
              }
              break;
            }
            if (!nb.startsWith("#") && resolveRef(state.primitives, nb) === "#ff00ff") {
              issues.push({
                nodeId: id,
                mode,
                type: "broken",
                message: `${token} resolves through @${cur} to a missing swatch (${nb})`,
              });
            }
            break;
          }
          cur = nb.slice(1);
        }
        if (broken) continue;
      } else if (resolveRef(state.primitives, base) === "#ff00ff") {
        issues.push({
          nodeId: id,
          mode,
          type: "broken",
          message: `${token} points at ${base}, which isn't in any ramp`,
        });
      }
    }
  }
  return issues;
}

/** Would aliasing `consumer` to `provider` create a loop? */
export function wouldCycle(graph: VariableGraph, consumerId: string, providerId: string): boolean {
  if (consumerId === providerId) return true;
  const seen = new Set<string>();
  const stack = [providerId];
  while (stack.length) {
    const cur = stack.pop() as string;
    if (cur === consumerId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of graph.incoming[cur] ?? []) stack.push(next);
  }
  return false;
}

/* ────────────────────────── connections ────────────────────────── */

export type ConnectionPlan =
  | {
      ok: true;
      /** Token alias — write with setSemantic on each listed mode. */
      kind: "token";
      token: string;
      value: string;
      modes: PreviewMode[];
      label: string;
    }
  | {
      ok: true;
      /** Component property — write with setComponentBinding. */
      kind: "binding";
      componentId: string;
      storageKey: string;
      binding: string;
      label: string;
    }
  | { ok: false; reason: string };

/** The binding string that points a component property at a given node. */
export function bindingFor(node: VarNode, radiusNames: string[]): string | null {
  const [, group, rest] = node.id.split(":");
  if (node.tier !== "primitive") return node.tier === "usage" ? null : `role:${node.path}`;
  switch (group) {
    case "color":
      return `prim:${rest}`;
    case "space":
      return `space:${rest}`;
    case "radius": {
      const i = radiusNames.indexOf(rest);
      return `radius:${i === -1 ? 0 : i}`;
    }
    case "size":
      return `text:${rest}`;
    case "weight":
      return `weight:${rest}`;
    case "font":
      return `font:${rest}`;
    default:
      return null;
  }
}

/**
 * Validate and describe a drag-to-connect, without performing it. The canvas
 * calls this on every hovered drop target (to colour the target) and again on
 * release (to apply), so it has to be pure and cheap.
 */
export function planConnection(
  graph: VariableGraph,
  state: GraphState,
  providerId: string,
  consumerId: string,
  modes: PreviewMode[]
): ConnectionPlan {
  const provider = graph.nodes[providerId];
  const consumer = graph.nodes[consumerId];
  if (!provider || !consumer) return { ok: false, reason: "Unknown variable" };
  if (provider.id === consumer.id) return { ok: false, reason: "A variable can't point at itself" };

  if (consumer.tier === "primitive") {
    return { ok: false, reason: "Primitives hold raw values — they can't alias another variable" };
  }

  if (!acceptsKind(consumer.kind, provider.kind)) {
    return {
      ok: false,
      reason: `${consumer.label} takes a ${consumer.kind} value, and ${provider.label} is a ${provider.kind}`,
    };
  }

  if (consumer.tier === "usage") {
    const u = consumer.usage;
    if (!u) return { ok: false, reason: "This property can't be bound" };
    if (provider.tier === "usage") return { ok: false, reason: "A component property isn't a source" };
    const radiusNames = state.primitives.radiusNames ?? [...RADII_NAMES];
    const binding = bindingFor(provider, radiusNames);
    if (!binding) return { ok: false, reason: `${provider.label} can't be bound to a component property` };
    return {
      ok: true,
      kind: "binding",
      componentId: u.componentId,
      storageKey: u.storageKey,
      binding,
      label: `${consumer.path} → ${provider.path}`,
    };
  }

  // Token consumer (semantic or component tier).
  if (provider.tier === "usage") return { ok: false, reason: "A component property isn't a source" };
  if (wouldCycle(graph, consumerId, providerId)) {
    return { ok: false, reason: "That would make the alias chain loop back on itself" };
  }

  const token = nodeTokenName(consumerId);
  if (!token) return { ok: false, reason: "Unknown token" };
  const value = tokenValueFor(provider, state.primitives.radiusNames ?? [...RADII_NAMES]);
  if (!value) return { ok: false, reason: `${provider.label} can't be pointed at` };
  return {
    ok: true,
    kind: "token",
    token,
    value,
    modes,
    label: `${consumer.label} → ${provider.path}`,
  };
}

/* ────────────────────────── chains ────────────────────────── */

/** Every node upstream and downstream of `id`, for hover/selection highlight. */
export function relatedNodes(graph: VariableGraph, id: string): Set<string> {
  const out = new Set<string>([id]);
  const walk = (start: string, adj: Record<string, string[]>) => {
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop() as string;
      for (const next of adj[cur] ?? []) {
        if (out.has(next)) continue;
        out.add(next);
        stack.push(next);
      }
    }
  };
  walk(id, graph.outgoing);
  walk(id, graph.incoming);
  return out;
}

export interface ChainLink {
  nodeId: string | null;
  label: string;
  value: string;
  swatch?: string;
}

/**
 * How a token's value is arrived at, step by step: the row the inspector shows
 * as "brand-600 → #4f46e5" or "@surface-base → neutral-50 → #fafafa".
 */
export function resolutionChain(
  graph: VariableGraph,
  state: GraphState,
  nodeId: string,
  mode: PreviewMode
): ChainLink[] {
  const node = graph.nodes[nodeId];
  if (!node) return [];
  const chain: ChainLink[] = [];
  let cur: VarNode | undefined = node;
  const seen = new Set<string>();

  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.tier === "usage") {
      chain.push({ nodeId: cur.id, label: cur.label, value: cur.ref });
      const nextId: string | undefined = graph.incoming[cur.id]?.[0];
      cur = nextId ? graph.nodes[nextId] : undefined;
      continue;
    }
    if (cur.tier === "primitive") {
      chain.push({ nodeId: cur.id, label: cur.path, value: cur.detail ?? "", swatch: cur.swatch?.[mode] });
      break;
    }
    const raw = cur.raw?.[mode] ?? "";
    chain.push({ nodeId: cur.id, label: cur.path, value: raw, swatch: cur.swatch?.[mode] });
    const src = valueSource(state, raw);
    const wasTyped = splitTypedValue(splitAlpha(raw.trim()).base);
    cur = src ? graph.nodes[src.id] : undefined;
    if (!cur && raw.trim().startsWith("#")) {
      chain.push({ nodeId: null, label: "literal", value: raw.trim(), swatch: raw.trim() });
    } else if (!cur && wasTyped) {
      chain.push({
        nodeId: null,
        label: "literal",
        value: describeTokenValue(state.primitives, raw.trim()) || raw.trim(),
      });
    }
  }
  return chain;
}

/* ────────────────────────── layout ────────────────────────── */

export const CARD_W = 224;
export const ROW_H = 22;
export const CARD_HEAD_H = 34;
export const CARD_FOOT_H = 22;
export const CARD_GAP_Y = 26;
export const TIER_GAP = 168;
/** Headroom above the cards, where each band writes its name. */
export const BAND_HEAD_H = 46;
/** Breathing room inside a band's tinted plate. */
export const BAND_PAD = 22;

export interface CardBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The horizontal territory one tier's columns occupy.
 *
 * Read off the arrangement rather than off the cards, and that's the point:
 * lanes computed this way are disjoint by construction, so the tinted plates
 * behind them can never grow into each other however far a card inside one has
 * been nudged. Measuring them from live card positions is what used to let two
 * bands overlap into an unreadable stack the moment anything was dragged.
 */
export interface LaneSpan {
  tier: VarTier;
  x: number;
  w: number;
}

export interface LayoutResult {
  boxes: Record<string, CardBox>;
  lanes: LaneSpan[];
}

/**
 * Whether a card draws a footer strip — "New variable" on a set you author, the
 * way out to its editor on a generated scale. One predicate, because the height
 * the layout reserves and the row the card renders have to agree or every wire
 * below it lands a few pixels off.
 */
export const hasCardFooter = (c: VarCollection): boolean =>
  !!c.addTo || (c.tier === "primitive" && primitiveHome(c) !== null);

/**
 * A card's height. A collapsed card is its header and nothing else — the main
 * lever against wire crowding, since every wire into a collapsed collection
 * lands on that one header instead of fanning across forty rows.
 */
export const cardHeight = (c: VarCollection, collapsed?: ReadonlySet<string>): number =>
  collapsed?.has(c.id)
    ? CARD_HEAD_H
    : CARD_HEAD_H + c.nodes.length * ROW_H + (hasCardFooter(c) ? CARD_FOOT_H : 6);

/** Gap between the sub-columns a packed band wraps itself into. */
export const PACK_GAP_X = 24;

/** The canvas shape assumed when nobody has measured one yet. */
const PACK_FALLBACK_ASPECT = 1.6;

/**
 * How deep a packed band should run before wrapping — chosen for *this* screen.
 *
 * Packed exists to put a whole system in front of you at once, and a fixed
 * wrap depth can't do that: hold every band to 780px and a file with fifty-odd
 * component cards lays itself out four thousand pixels wide, which fits a
 * 900px canvas at 20% — below the floor where anything has a name. The map
 * then didn't fit *and* couldn't be read, which is the worst of both.
 *
 * So the depth is solved for instead. Wrapping is simulated at a range of
 * candidate depths and the one whose resulting bounding box comes closest to
 * the shape of the canvas wins — deep and narrow for a tall panel, shallow and
 * wide for a letterbox. Same cards, same order, same reading direction; only
 * the fold changes, and it changes to the one that leaves the most pixels per
 * card once the whole thing is on screen.
 *
 * `aspect` is quantised by the caller, so nudging a panel a few pixels can't
 * re-flow the map underneath you.
 */
function packTargetHeight(
  perTier: number[][],
  aspect: number
): number {
  const tallest = Math.max(0, ...perTier.flat());
  const floor = Math.max(420, tallest);

  // What a given wrap depth actually produces, walked the same way the real
  // layout walks it — so the estimate and the result agree.
  const shape = (target: number): { w: number; h: number } => {
    let w = 0;
    let h = 0;
    for (const heights of perTier) {
      if (heights.length === 0) continue;
      let columns = 1;
      let y = 0;
      let deepest = 0;
      for (const cardH of heights) {
        if (y > 0 && y + cardH > target) {
          columns += 1;
          y = 0;
        }
        y += cardH + CARD_GAP_Y;
        deepest = Math.max(deepest, y);
      }
      w += columns * (CARD_W + PACK_GAP_X) - PACK_GAP_X + TIER_GAP;
      h = Math.max(h, deepest);
    }
    return { w: Math.max(1, w - TIER_GAP), h: Math.max(1, h) };
  };

  let best = floor;
  let bestScore = Infinity;
  for (let target = floor; target <= floor * 24; target *= 1.1) {
    const { w, h } = shape(target);
    // Compared in log space: a box twice as wide as it should be and one half
    // as wide are equally wrong, and only the ratio matters to the fit.
    const score = Math.abs(Math.log(w / h / aspect));
    if (score < bestScore) {
      bestScore = score;
      best = target;
    }
  }
  return best;
}

/**
 * Tier-banded auto-layout, in one of two shapes.
 *
 * **Lanes** is one column per tier: every set at a known place in a single
 * list, so "Surface" is where you last saw it whatever an unrelated ramp did,
 * and every wire runs cleanly left to right between two columns. The cost is
 * depth — a full system is several thousand pixels of scroll, which is a poor
 * way to see the shape of a system.
 *
 * **Packed** wraps each band into as many sub-columns as it takes to land the
 * whole file on the screen it's being read on — the fold depth is solved for
 * the canvas's own shape (see {@link packTargetHeight}) rather than fixed. It
 * reads in the same order as Lanes — down a column, then across — so it's the
 * same map at a different aspect ratio, not a different one.
 *
 * The order either way is the order the graph was built in — colour ramps then
 * scales, then the file's own groups in the order the file lists them — because
 * that's the order the table's sets list and the rail use. One order everywhere.
 *
 * **Which column a card lives in doesn't depend on what you have open.** This
 * matters more than it sounds. Packing used to wrap on live heights, so
 * unfolding one card — Component properties, say, which is fifty-odd sets —
 * grew the band past its target and re-flowed every card after it into
 * different columns. You opened one card and the whole map rearranged itself
 * around you, which reads as a glitch even when the arrangement is correct.
 *
 * So the wrap is decided on each card's *resting* height — folded if the file
 * opens it folded, full height if not — and folding is then purely local: a
 * card grows or shrinks, the cards below it in its own column move, and nothing
 * changes column. The cost is a column that runs long when you unfold several
 * cards in it, which is a far smaller surprise than the map reshuffling.
 */
export function autoLayout(
  collections: VarCollection[],
  collapsed?: ReadonlySet<string>,
  layout: "lanes" | "packed" = "lanes",
  /** Width ÷ height of the canvas the result has to fit. Packed only. */
  aspect?: number
): LayoutResult {
  const boxes: Record<string, CardBox> = {};
  const lanes: LaneSpan[] = [];
  let xCursor = 0;

  // A card's *resting* height — the file's own idea of how it opens, not the
  // one you're currently looking at. Everything about where a card lands is
  // decided on these, so unfolding one can never move another (see below).
  const restingOf = (c: VarCollection) => (c.defaultCollapsed ? CARD_HEAD_H : cardHeight(c));
  const packTarget =
    layout === "packed"
      ? packTargetHeight(
          TIER_ORDER.map((t) => collections.filter((c) => c.tier === t).map(restingOf)),
          aspect && aspect > 0 ? aspect : PACK_FALLBACK_ASPECT
        )
      : Number.POSITIVE_INFINITY;

  for (const tier of TIER_ORDER) {
    const inTier = collections.filter((c) => c.tier === tier);
    if (inTier.length === 0) continue;

    const heights = inTier.map((c) => cardHeight(c, collapsed));
    const restingHeights = inTier.map(restingOf);
    // Never wrap below the tallest card — a column shorter than its own
    // contents would put every card in a column of its own.
    const target =
      layout === "packed"
        ? Math.max(packTarget, ...restingHeights)
        : Number.POSITIVE_INFINITY;

    // Column assignment first, off the resting heights, so it's stable…
    const columnOf: number[] = [];
    let restY = 0;
    let column = 0;
    inTier.forEach((_, i) => {
      if (restY > 0 && restY + restingHeights[i] > target) {
        column += 1;
        restY = 0;
      }
      columnOf[i] = column;
      restY += restingHeights[i] + CARD_GAP_Y;
    });

    // …then stack each column on the heights the cards actually have now, so
    // folding a card really does reclaim its space.
    const yOf: number[] = [];
    const columnY: number[] = [];
    inTier.forEach((_, i) => {
      const col = columnOf[i];
      yOf[i] = columnY[col] ?? 0;
      columnY[col] = yOf[i] + heights[i] + CARD_GAP_Y;
    });

    inTier.forEach((c, i) => {
      boxes[c.id] = {
        id: c.id,
        x: xCursor + columnOf[i] * (CARD_W + PACK_GAP_X),
        y: yOf[i],
        w: CARD_W,
        h: heights[i],
      };
    });

    const laneW = (column + 1) * (CARD_W + PACK_GAP_X) - PACK_GAP_X;
    lanes.push({ tier, x: xCursor, w: laneW });
    xCursor += laneW + TIER_GAP;
  }
  return { boxes, lanes };
}

/** The row index of a node inside its card — the y offset of its anchor. */
export function rowIndex(collection: VarCollection, nodeId: string): number {
  return collection.nodes.findIndex((n) => n.id === nodeId);
}

/* ────────────────────────── wire routing ────────────────────────── */

export interface Point {
  x: number;
  y: number;
}

/**
 * A horizontal-tangent cubic between two anchors. The control offset grows with
 * the span so long hops across the canvas stay readable, and a wire that has to
 * run *backwards* (a card dragged left of its source) bows out far enough not
 * to disappear under its own card.
 */
function curveReach(a: Point, b: Point): number {
  const dx = b.x - a.x;
  return dx < 0 ? Math.max(90, Math.abs(dx) * 0.6) : Math.max(38, dx * 0.45);
}

export function curvedPath(a: Point, b: Point): string {
  const r = curveReach(a, b);
  return `M ${a.x} ${a.y} C ${a.x + r} ${a.y}, ${b.x - r} ${b.y}, ${b.x} ${b.y}`;
}

/** The elbow's trunk — the x every wire between these two turns on. */
function trunkX(a: Point, b: Point): number {
  return a.x + Math.max(30, (b.x - a.x) / 2);
}

/** True when there's room between two anchors for an elbow to turn. */
const canElbow = (a: Point, b: Point): boolean => b.x - a.x >= 76;

/**
 * How a connection is routed. Both readings of the same graph, and which one
 * reads better genuinely depends on the file in front of you:
 *
 * **Curved** is a horizontal-tangent cubic — it leaves and lands flat, so the
 * row it belongs to is unambiguous at both ends, and a hundred of them fan out
 * rather than stacking into a single black trunk. This is the default; it's
 * what a dense band of aliases wants.
 *
 * **Elbow** runs out, along a shared vertical trunk, and in, with rounded
 * corners. Wires between the same two cards share that trunk, which makes a
 * handful of them far easier to trace individually — but a few hundred sharing
 * it turns the trunk into a wall.
 */
export type WireStyle = "curved" | "elbow";

/**
 * An elbow route, or a curve when the anchors are too close (or the wire runs
 * backwards, past a card someone dragged) for an elbow to have room to turn.
 */
function elbowPath(a: Point, b: Point): string {
  const dy = b.y - a.y;
  if (!canElbow(a, b)) return curvedPath(a, b);
  if (Math.abs(dy) < 1) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  const mx = trunkX(a, b);
  const down = dy > 0 ? 1 : -1;
  const r = Math.min(10, Math.abs(dy) / 2, (b.x - a.x) / 2 - 4);
  return [
    `M ${a.x} ${a.y}`,
    `L ${mx - r} ${a.y}`,
    `Q ${mx} ${a.y} ${mx} ${a.y + r * down}`,
    `L ${mx} ${b.y - r * down}`,
    `Q ${mx} ${b.y} ${mx + r} ${b.y}`,
    `L ${b.x} ${b.y}`,
  ].join(" ");
}

export function wirePath(a: Point, b: Point, style: WireStyle = "curved"): string {
  return style === "elbow" ? elbowPath(a, b) : curvedPath(a, b);
}

/** Whether a route between these two anchors actually turns a corner. */
const isStepped = (a: Point, b: Point, style: WireStyle): boolean =>
  style === "elbow" && canElbow(a, b);

/** Where a wire's own controls sit — its visual middle, in graph coordinates. */
export function wireMid(a: Point, b: Point, style: WireStyle = "curved"): Point {
  if (isStepped(a, b, style)) return { x: trunkX(a, b), y: (a.y + b.y) / 2 };
  const r = curveReach(a, b);
  const c1 = { x: a.x + r, y: a.y };
  const c2 = { x: b.x - r, y: b.y };
  return {
    x: (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8,
    y: (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8,
  };
}

/* ────────────────────────── bundling ────────────────────────── */

/**
 * Every alias running between the same two sets, drawn once.
 *
 * Three hundred hairlines between the same handful of cards is a weave, not a
 * map: no single wire can be followed, and the only thing the picture actually
 * says — "Surface is built out of Neutral" — is the thing you can't see. A
 * bundle says it in one stroke, keeps the count the weave was spending three
 * hundred strokes to imply, and carries its members so the ribbon can be opened
 * and read link by link rather than only pointed at.
 */
export interface WireBundle {
  id: string;
  /** Collection ids, source and consumer. */
  from: string;
  to: string;
  /** The edge ids this ribbon stands in for — what its popover lists. */
  members: string[];
  /** How many aliases this ribbon stands in for. */
  count: number;
  /** Where it leaves and lands: the mean of its members' own anchors, so the
   *  ribbon points at where the wires actually are rather than at a card's
   *  midpoint. */
  a: Point;
  b: Point;
  /** Its visual middle, for the count chip. */
  mid: Point;
  d: string;
}

/**
 * Group resolved wires into one ribbon per pair of sets.
 *
 * `collectionOf` maps a node id to the card it sits on; a node the caller can't
 * place (hidden set, filtered row) drops its wire from the bundle rather than
 * inventing a home for it.
 */
export function bundleWires(
  wires: Array<{ id: string; from: string; to: string; a: Point; b: Point }>,
  collectionOf: (nodeId: string) => string | null,
  style: WireStyle = "curved"
): WireBundle[] {
  const groups = new Map<string, { from: string; to: string; members: string[]; a: Point[]; b: Point[] }>();
  for (const w of wires) {
    const from = collectionOf(w.from);
    const to = collectionOf(w.to);
    if (!from || !to) continue;
    const id = `${from}→${to}`;
    const g = groups.get(id) ?? { from, to, members: [], a: [], b: [] };
    g.members.push(w.id);
    g.a.push(w.a);
    g.b.push(w.b);
    groups.set(id, g);
  }

  const mean = (pts: Point[]): Point => ({
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  });

  const out: WireBundle[] = [];
  groups.forEach((g, id) => {
    const a = mean(g.a);
    const b = mean(g.b);
    out.push({
      id,
      from: g.from,
      to: g.to,
      members: g.members,
      count: g.members.length,
      a,
      b,
      mid: wireMid(a, b, style),
      d: wirePath(a, b, style),
    });
  });
  return out;
}

/**
 * Points along a route, ordered from its middle outwards.
 *
 * A ribbon's label wants the middle, but the middle is often behind a card —
 * and a label sitting on top of a row of real tokens hides data to report a
 * number. Walking outwards from the middle finds the nearest stretch of the
 * same ribbon that's actually in the open.
 */
export function wireSamples(a: Point, b: Point, n = 13, style: WireStyle = "curved"): Point[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const stepped = isStepped(a, b, style) && Math.abs(dy) >= 1;

  const at = (t: number): Point => {
    if (stepped) {
      // Out along a.y, down the shared trunk, in along b.y — length-weighted so
      // samples are spread evenly over the route rather than over its corners.
      const mx = trunkX(a, b);
      const legs = [mx - a.x, Math.abs(dy), b.x - mx];
      const total = legs[0] + legs[1] + legs[2];
      let d = t * total;
      if (d <= legs[0]) return { x: a.x + d, y: a.y };
      d -= legs[0];
      if (d <= legs[1]) return { x: mx, y: a.y + Math.sign(dy) * d };
      return { x: mx + (d - legs[1]), y: b.y };
    }
    const r = curveReach(a, b);
    const p0 = a;
    const p1 = { x: a.x + r, y: a.y };
    const p2 = { x: b.x - r, y: b.y };
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * b.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * b.y,
    };
  };

  // 0.5 first, then 0.5 ± one step, ± two steps… so the caller can take the
  // first point that clears and still be as close to the middle as possible.
  const out: Point[] = [at(0.5)];
  const span = 0.38;
  for (let i = 1; i <= Math.floor(n / 2); i++) {
    const d = (span * i) / Math.floor(n / 2);
    out.push(at(0.5 - d), at(0.5 + d));
  }
  return out;
}

/**
 * How thick a ribbon carrying `count` aliases is drawn, against the busiest
 * ribbon on the canvas. Square-rooted, because the useful comparison is "a lot
 * more" versus "a little more" — linear scaling would make one forty-wire
 * bundle a slab and leave every four-wire bundle a hairline again.
 */
export function bundleWidth(count: number, max: number): number {
  const t = max <= 1 ? 1 : Math.sqrt(Math.min(count, max) / max);
  return 2.4 + t * 5.2;
}
