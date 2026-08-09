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
  PreviewMode,
  RADII_NAMES,
  SemanticGroup,
  shadowToCss,
} from "@/store/useDesignSystem";
import { resolveRef, resolveTokenValue, splitAlpha } from "@/lib/tokens";
import { parseBinding } from "@/lib/binding";
import { rampStepLabels } from "@/lib/color";
import { generateTypeScale, STEP_DEFS } from "@/lib/typography";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import { COMPONENT_SPECS, BindingType, STATE_LABEL, CState } from "@/lib/componentSchema";

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
 * system of the canvas.
 */
export type VarKind =
  | "color"
  | "space"
  | "radius"
  | "size"
  | "weight"
  | "font"
  | "shadow"
  | "duration"
  | "ease"
  | "dimension";

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
  usage?: { componentId: string; storageKey: string; propKey: string; state?: CState; type: BindingType };
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
  source?: { groupLabel?: string; familyId?: string; componentId?: string };
}

/** One alias. `mode` is "both" when light and dark agree — the common case. */
export interface VarEdge {
  id: string;
  from: string;
  to: string;
  mode: PreviewMode | "both" | "binding";
  /** Alpha the consumer applies on top of the source, if any. */
  alpha: number | null;
}

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

const MODES: PreviewMode[] = ["light", "dark"];

/**
 * The node a stored token *value* points at, or null when the value is a
 * literal (a raw hex) or dangles. Alpha suffixes are stripped first — a
 * "brand-600/40" still points at brand-600, it just lands there at 40%.
 */
function valueSource(value: string): { id: string; alpha: number | null } | null {
  if (!value) return null;
  const { base, alpha } = splitAlpha(value.trim());
  if (!base || base.startsWith("#")) return null;
  if (base.startsWith("@")) return { id: tokenNodeId(base.slice(1)), alpha };
  return { id: colorNodeId(base), alpha };
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
        .filter((token) => modes.light[token] !== undefined || modes.dark[token] !== undefined)
        .map((token) => {
          const raw = { light: modes.light[token] ?? "", dark: modes.dark[token] ?? "" };
          return {
            id: tokenNodeId(token),
            collectionId: id,
            tier,
            kind: "color" as const,
            label: token,
            path: token,
            ref: `@${token}`,
            cssVar: `--ark-${token}`,
            raw,
            swatch: {
              light: resolveTokenValue(state, "light", raw.light),
              dark: resolveTokenValue(state, "dark", raw.dark),
            },
          };
        }),
    };
  });
}

/**
 * The consuming end: component properties the user has actually bound. Only
 * overridden bindings are stored, so this column stays small and honest — it
 * shows the wiring someone chose, not the 800 defaults they didn't.
 */
function usageCollections(state: GraphState): VarCollection[] {
  const labelOf: Record<string, string> = {};
  for (const lane of COMPONENT_LANES) for (const item of lane.items) labelOf[item.id] = item.label;

  const out: VarCollection[] = [];
  for (const [componentId, cfg] of Object.entries(state.components)) {
    const bindings = cfg?.bindings;
    if (!bindings) continue;
    const spec = COMPONENT_SPECS[componentId];
    const propByKey: Record<string, { label: string; type: BindingType }> = {};
    for (const part of spec?.parts ?? []) {
      for (const p of part.props) propByKey[p.key] = { label: `${part.label} · ${p.label}`, type: p.type };
    }

    const nodes: VarNode[] = [];
    for (const storageKey of Object.keys(bindings).sort()) {
      const at = storageKey.indexOf("@");
      const propKey = at === -1 ? storageKey : storageKey.slice(0, at);
      const state_ = at === -1 ? undefined : (storageKey.slice(at + 1) as CState);
      const spec_ = propByKey[propKey];
      const stateSuffix = state_ ? ` (${STATE_LABEL[state_] ?? state_})` : "";
      nodes.push({
        id: usageNodeId(componentId, storageKey),
        collectionId: `use:${componentId}`,
        tier: "usage",
        kind: bindingKindOf(spec_?.type),
        label: (spec_?.label ?? propKey) + stateSuffix,
        path: `${labelOf[componentId] ?? componentId} · ${propKey}${stateSuffix}`,
        ref: bindings[storageKey],
        cssVar: "",
        detail: bindings[storageKey],
        usage: {
          componentId,
          storageKey,
          propKey,
          state: state_,
          type: spec_?.type ?? "color",
        },
      });
    }
    if (nodes.length === 0) continue;
    out.push({
      id: `use:${componentId}`,
      label: labelOf[componentId] ?? componentId,
      note: `${nodes.length} bound ${nodes.length === 1 ? "property" : "properties"}`,
      tier: "usage",
      kind: "color",
      source: { componentId },
      nodes,
    });
  }
  return out.sort((a, b) => a.label.localeCompare(b.label));
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
  // Token aliases are per mode; a pair present in both collapses to "both" so
  // the common case draws one line instead of two stacked on the same path.
  const perMode: Record<string, { from: string; to: string; alpha: number | null; modes: Set<PreviewMode> }> = {};
  for (const mode of MODES) {
    for (const [token, value] of Object.entries(state.semantics.modes[mode])) {
      const to = tokenNodeId(token);
      if (!nodes[to]) continue; // a value with no group — not on the canvas
      const src = valueSource(value);
      if (!src || !nodes[src.id]) continue;
      const key = `${src.id}→${to}`;
      const entry = (perMode[key] ??= { from: src.id, to, alpha: src.alpha, modes: new Set() });
      entry.modes.add(mode);
      if (src.alpha !== null) entry.alpha = src.alpha;
    }
  }

  const edges: VarEdge[] = Object.entries(perMode).map(([key, e]) => ({
    id: `a:${key}`,
    from: e.from,
    to: e.to,
    mode: e.modes.size === 2 ? "both" : e.modes.has("light") ? "light" : "dark",
    alpha: e.alpha,
  }));

  // Component bindings — mode-independent by construction (a binding resolves
  // to a var(), and the var flips per mode on its own).
  for (const [componentId, cfg] of Object.entries(state.components)) {
    for (const [storageKey, binding] of Object.entries(cfg?.bindings ?? {})) {
      const to = usageNodeId(componentId, storageKey);
      if (!nodes[to]) continue;
      const from = bindingSource(state, binding);
      if (!from || !nodes[from]) continue;
      edges.push({ id: `b:${from}→${to}`, from, to, mode: "binding", alpha: null });
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
  for (const mode of MODES) {
    const map = state.semantics.modes[mode];
    for (const [token, value] of Object.entries(map)) {
      const id = tokenNodeId(token);
      if (!nodes[id]) continue;
      const { base } = splitAlpha((value ?? "").trim());
      if (!base) {
        issues.push({ nodeId: id, mode, type: "broken", message: `${token} has no ${mode} value` });
        continue;
      }
      if (base.startsWith("#")) continue;

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
              message: `${token} → @${cur} loops back on itself in ${mode}`,
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
  const value = provider.tier === "primitive" ? provider.path : `@${provider.path}`;
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
    const src = valueSource(raw);
    cur = src ? graph.nodes[src.id] : undefined;
    if (!cur && raw.trim().startsWith("#")) {
      chain.push({ nodeId: null, label: "literal", value: raw.trim(), swatch: raw.trim() });
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
export const SUBCOL_GAP = 30;
export const TIER_GAP = 148;
export const MAX_COL_H = 940;
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
 * A card's height. A collapsed card is its header and nothing else — the main
 * lever against wire crowding, since every wire into a collapsed collection
 * lands on that one header instead of fanning across forty rows.
 */
export const cardHeight = (c: VarCollection, collapsed?: ReadonlySet<string>): number =>
  collapsed?.has(c.id)
    ? CARD_HEAD_H
    : CARD_HEAD_H + c.nodes.length * ROW_H + (c.addTo ? CARD_FOOT_H : 6);

/**
 * Tier-banded auto-layout. Each tier gets its own plate on the canvas, and
 * value flows left to right across them — so "where am I in the chain" is a
 * question the arrangement answers before any colour does.
 *
 * Within a band, cards are packed into *balanced* columns rather than filling
 * one to MAX_COL_H and spilling the remainder into a stub next to it: the
 * primitive tier is by far the tallest, and an even split is what keeps it
 * from towering over the other three.
 */
export function autoLayout(
  collections: VarCollection[],
  collapsed?: ReadonlySet<string>
): Record<string, CardBox> {
  const boxes: Record<string, CardBox> = {};
  let xCursor = 0;

  for (const tier of TIER_ORDER) {
    // Tallest first: big ramps anchor the top of each column, and the short
    // cards fill in around them instead of stranding a column half empty.
    const inTier = collections
      .filter((c) => c.tier === tier)
      .sort(
        (a, b) => cardHeight(b, collapsed) - cardHeight(a, collapsed) || a.label.localeCompare(b.label)
      );
    if (inTier.length === 0) continue;

    const heights = inTier.map((c) => cardHeight(c, collapsed) + CARD_GAP_Y);
    const total = heights.reduce((s, h) => s + h, 0);
    const cols = Math.max(1, Math.ceil(total / MAX_COL_H));
    const target = total / cols;

    const colY = new Array<number>(cols).fill(0);
    let col = 0;
    inTier.forEach((c, i) => {
      // Start the next column once this one has had its share — unless we're
      // on the last column, which takes whatever is left.
      if (col < cols - 1 && colY[col] > 0 && colY[col] + heights[i] / 2 > target) col += 1;
      boxes[c.id] = {
        id: c.id,
        x: xCursor + col * (CARD_W + SUBCOL_GAP),
        y: colY[col],
        w: CARD_W,
        h: cardHeight(c, collapsed),
      };
      colY[col] += heights[i];
    });

    xCursor += cols * (CARD_W + SUBCOL_GAP) - SUBCOL_GAP + TIER_GAP;
  }
  return boxes;
}

/** The row index of a node inside its card — the y offset of its anchor. */
export function rowIndex(collection: VarCollection, nodeId: string): number {
  return collection.nodes.findIndex((n) => n.id === nodeId);
}

/* ────────────────────────── wire routing ────────────────────────── */

/**
 * How a connection is drawn. Two routings, because they answer different
 * questions: elbows share their trunk, so a dozen wires leaving one ramp read
 * as one bundle you can trace; curves keep each wire's own identity, which is
 * easier when two cards sit almost on top of each other.
 */
export type WireStyle = "stepped" | "curved";

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

/** The elbow's trunk — the x every stepped wire between these two turns on. */
function trunkX(a: Point, b: Point): number {
  return a.x + Math.max(30, (b.x - a.x) / 2);
}

/**
 * Right-angle routing with rounded corners: out of the source, along a shared
 * vertical trunk, and into the consumer. Falls back to a curve when the two
 * anchors are too close (or the wire runs backwards) for an elbow to have room
 * to turn.
 */
export function steppedPath(a: Point, b: Point): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx < 76) return curvedPath(a, b);
  if (Math.abs(dy) < 1) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  const mx = trunkX(a, b);
  const down = dy > 0 ? 1 : -1;
  const r = Math.min(10, Math.abs(dy) / 2, dx / 2 - 4);
  return [
    `M ${a.x} ${a.y}`,
    `L ${mx - r} ${a.y}`,
    `Q ${mx} ${a.y} ${mx} ${a.y + r * down}`,
    `L ${mx} ${b.y - r * down}`,
    `Q ${mx} ${b.y} ${mx + r} ${b.y}`,
    `L ${b.x} ${b.y}`,
  ].join(" ");
}

export const wirePath = (a: Point, b: Point, style: WireStyle): string =>
  style === "curved" ? curvedPath(a, b) : steppedPath(a, b);

/** Where the wire's own controls sit — its visual middle, in graph coordinates. */
export function wireMid(a: Point, b: Point, style: WireStyle): Point {
  if (style === "stepped" && b.x - a.x >= 76) {
    return { x: trunkX(a, b), y: (a.y + b.y) / 2 };
  }
  const r = curveReach(a, b);
  const c1 = { x: a.x + r, y: a.y };
  const c2 = { x: b.x - r, y: b.y };
  return {
    x: (a.x + 3 * c1.x + 3 * c2.x + b.x) / 8,
    y: (a.y + 3 * c1.y + 3 * c2.y + b.y) / 8,
  };
}
