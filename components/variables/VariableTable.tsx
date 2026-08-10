"use client";

/**
 * The Variables table — sets down the left, modes across the top.
 *
 * This is the everyday surface: the shape designers already read in Figma, so
 * "which set am I in" and "what does this token say in dark" are answered by
 * the layout rather than by a legend. The map next door answers the other
 * question — what feeds this, and what breaks if I change it — and both are
 * views of the same store, so an edit here is the same edit the Colour step
 * makes.
 *
 * Rows group themselves: tokens that share a name prefix ("action-primary-*")
 * collapse under one heading and show only what differs, which is why a set of
 * thirty reads like a set of six.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  Check,
  Link2,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  Unlink,
} from "lucide-react";
import {
  ModeDef,
  PreviewMode,
  RADII_NAMES,
  TokenKind,
  isBuiltInMode,
  modeDefsOf,
  useDesignSystem,
} from "@/store/useDesignSystem";
import {
  TIER_META,
  TIER_ORDER,
  VarCollection,
  VarKind,
  VarNode,
  VarTier,
  VariableGraph,
  acceptsKind,
  bindingFor,
  nodeTokenName,
  primitiveHome,
  tierColor,
  tokenValueFor,
  wouldCycle,
} from "@/lib/variableGraph";
import {
  alphaOfValue,
  applyAlphaToValue,
  describeTokenValue,
  resolveTokenValue,
  splitAlpha,
  splitTypedValue,
} from "@/lib/tokens";
import { isValidHex, stripAlpha, withAlpha } from "@/lib/color";
import { KIND_LABEL, KindIcon, Swatch, TierBadge } from "@/components/variables/VariableBits";
import { AddModeButton, ModeHeader } from "@/components/variables/ModeColumns";

/** The types a new variable can be created as, in the order they're offered. */
const NEW_VARIABLE_KINDS: TokenKind[] = ["color", "space", "radius", "size", "weight", "font", "shadow"];

/* ────────────────────────── row grouping ────────────────────────── */

interface TableRow {
  node: VarNode;
  /** What's left of the name once the group heading has taken its share. */
  leaf: string;
}

interface RowBlock {
  /** "action / primary", or null for a row that stands on its own. */
  heading: string | null;
  rows: TableRow[];
}

/**
 * Tokens that share everything but their last segment become one block. A
 * prefix with a single member isn't a group — it stays a plain row under its
 * full name, in the place it already occupied.
 */
export function blockRows(nodes: VarNode[]): RowBlock[] {
  const prefixOf = (label: string): string => {
    const segs = label.split("-");
    return segs.length > 1 ? segs.slice(0, -1).join("-") : "";
  };

  const members = new Map<string, VarNode[]>();
  for (const n of nodes) {
    const p = prefixOf(n.label);
    if (!p) continue;
    const list = members.get(p);
    if (list) list.push(n);
    else members.set(p, [n]);
  }

  const out: RowBlock[] = [];
  const emitted = new Set<string>();
  for (const n of nodes) {
    const p = prefixOf(n.label);
    const group = p ? members.get(p) : undefined;
    if (group && group.length > 1) {
      if (emitted.has(p)) continue;
      emitted.add(p);
      out.push({
        heading: p.replace(/-/g, " / "),
        rows: group.map((g) => ({ node: g, leaf: g.label.slice(p.length + 1) })),
      });
    } else {
      out.push({ heading: null, rows: [{ node: n, leaf: n.label }] });
    }
  }
  return out;
}

/* ────────────────────────── value cells ────────────────────────── */

/** How a stored value presents itself in a cell. */
function readValue(value: string): {
  kind: "alias" | "ref" | "literal" | "typed" | "empty";
  label: string;
  alpha: number | null;
} {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { kind: "empty", label: "—", alpha: null };
  const { base, alpha } = splitAlpha(trimmed);
  if (base.startsWith("@")) return { kind: "alias", label: base.slice(1), alpha };
  if (base.startsWith("#")) return { kind: "literal", label: base.toUpperCase(), alpha };
  const typed = splitTypedValue(base);
  // A typed value reads as the primitive it names — "radius-md", not
  // "radius:md": the same name the Radius set shows it under.
  if (typed) {
    return {
      kind: "typed",
      label: typed.prefix === "px" ? `${typed.rest}px` : `${typed.prefix}-${typed.rest}`,
      alpha: null,
    };
  }
  return { kind: "ref", label: base, alpha };
}

/**
 * The chip inside a cell — a mark, then what the value *says*. An alias reads
 * as the name it follows (the point of aliasing); a literal reads as its hex,
 * because there's nothing else to call it; a radius or a space reads as the
 * step it names, with the px it currently works out to alongside.
 */
function ValueChip({
  value,
  resolved,
  detail,
  kind = "color",
  muted,
}: {
  value: string;
  /** Resolved hex — colours only. */
  resolved?: string;
  /** Concrete value ("8px", "600") — everything else. */
  detail?: string;
  kind?: VarKind;
  muted?: boolean;
}) {
  const v = readValue(value);
  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-1.5 rounded border px-1.5 py-[3px] ${
        v.kind === "empty"
          ? "border-dashed border-line text-fg-mute"
          : "border-line bg-ink"
      }`}
    >
      {v.kind === "empty" ? null : kind === "color" ? (
        <Swatch hex={resolved} size={11} />
      ) : (
        <KindIcon kind={kind} size={11} />
      )}
      <span
        className={`min-w-0 truncate font-mono text-[10.5px] leading-none ${
          muted ? "text-fg-mute" : "text-fg-dim"
        }`}
      >
        {v.label}
      </span>
      {v.alpha !== null ? (
        <span className="shrink-0 font-mono text-[9px] leading-none text-fg-mute">{v.alpha}%</span>
      ) : null}
      {detail ? (
        <span className="shrink-0 font-mono text-[9px] leading-none text-fg-mute">{detail}</span>
      ) : null}
    </span>
  );
}

/**
 * The cell editor: point this variable at another one, or type a value.
 *
 * Both halves are here because both are legal — Figma calls them "alias" and
 * "raw value" — and hiding either behind a mode switch is what makes token
 * editors feel like they're fighting you.
 */
function CellEditor({
  node,
  mode,
  graph,
  onClose,
}: {
  node: VarNode;
  /** null on a component property, whose binding is mode-independent. */
  mode: PreviewMode | null;
  graph: VariableGraph;
  onClose: () => void;
}) {
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);
  const setSemantic = useDesignSystem((s) => s.setSemantic);
  const setComponentBinding = useDesignSystem((s) => s.setComponentBinding);
  const clearComponentBinding = useDesignSystem((s) => s.clearComponentBinding);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const token = nodeTokenName(node.id);
  const current = mode ? (node.raw?.[mode] ?? "") : node.ref;
  const [draft, setDraft] = useState(current);
  useEffect(() => setDraft(current), [current]);

  const candidates = useMemo(
    () =>
      graph.order
        .map((id) => graph.nodes[id])
        .filter(
          (n) =>
            n.id !== node.id &&
            n.tier !== "usage" &&
            acceptsKind(node.kind, n.kind) &&
            (node.tier === "usage" || !wouldCycle(graph, node.id, n.id))
        ),
    [graph, node]
  );

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? candidates.filter((c) => c.path.toLowerCase().includes(q)) : candidates),
    [candidates, q]
  );

  const pick = (provider: VarNode) => {
    const radiusNames = primitives.radiusNames ?? [...RADII_NAMES];
    if (node.tier === "usage" && node.usage) {
      const binding = bindingFor(provider, radiusNames);
      if (binding) setComponentBinding(node.usage.componentId, node.usage.storageKey, binding);
    } else if (token && mode) {
      const value = tokenValueFor(provider, radiusNames);
      if (value) setSemantic(mode, token, value);
    }
    onClose();
  };

  const commitRaw = () => {
    if (!token || !mode) return;
    const t = draft.trim();
    if (t !== current) setSemantic(mode, token, t);
    onClose();
  };

  const isColor = node.kind === "color";
  const resolved =
    mode && isColor ? resolveTokenValue({ primitives, semantics }, mode, current) : undefined;

  return (
    <div
      ref={wrapRef}
      className="absolute left-0 top-full z-40 mt-1 w-[280px] overflow-hidden rounded-lg border border-line-strong bg-ink-raised shadow-2xl"
    >
      {/* raw value — the colour well only where a colour is what's being held */}
      {token && mode && !isColor ? (
        <div className="border-b border-line p-2">
          <input
            autoFocus
            value={draft}
            spellCheck={false}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRaw}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRaw();
              if (e.key === "Escape") setDraft(current);
            }}
            placeholder={`${node.kind === "size" ? "text:sm" : `${node.kind}:…`}, @token…`}
            className="h-6 w-full min-w-0 rounded border border-line bg-ink px-1.5 font-mono text-[11px] text-fg placeholder:text-fg-mute focus:border-line-strong focus:outline-none"
          />
        </div>
      ) : null}
      {token && mode && isColor ? (
        <div className="flex items-center gap-1.5 border-b border-line p-2">
          <label
            className="relative h-6 w-6 shrink-0 cursor-pointer overflow-hidden rounded border border-line-strong"
            title="Pick a raw colour"
          >
            <span className="absolute inset-0" style={{ background: resolved }} />
            <input
              type="color"
              aria-label={`${token} ${mode} colour`}
              value={resolved && isValidHex(resolved) ? stripAlpha(resolved) : "#000000"}
              onChange={(e) => {
                const { alpha } = splitAlpha(current.trim());
                setSemantic(mode, token, withAlpha(e.target.value, alpha ?? 100));
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <input
            autoFocus
            value={draft}
            spellCheck={false}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRaw}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRaw();
              if (e.key === "Escape") setDraft(current);
            }}
            placeholder="brand-600, @text-primary, #0af…"
            className="h-6 min-w-0 flex-1 rounded border border-line bg-ink px-1.5 font-mono text-[11px] text-fg placeholder:text-fg-mute focus:border-line-strong focus:outline-none"
          />
        </div>
      ) : null}
      {/* Opacity, in the picker rather than on the row. It writes a `/NN` suffix,
          so a variable keeps whatever it points at and only changes how much of
          it shows — and the contrast audit measures the blend that results. */}
      {token && mode && isColor ? (
        <div className="flex items-center gap-2 border-b border-line px-2 py-1.5">
          <span className="shrink-0 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-mute">
            Opacity
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={alphaOfValue(current)}
            aria-label={`${token} ${mode} opacity`}
            onChange={(e) => setSemantic(mode, token, applyAlphaToValue(current, Number(e.target.value)))}
            className="h-1 min-w-0 flex-1 cursor-pointer accent-fg"
          />
          <span className="w-8 shrink-0 text-right font-mono text-[10px] tabular-nums text-fg-mute">
            {alphaOfValue(current)}%
          </span>
        </div>
      ) : null}

      {/* alias — everything this variable may legally follow */}
      <div className="flex h-7 items-center gap-1.5 border-b border-line px-2">
        <Search size={10} className="shrink-0 text-fg-mute" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Point at a variable…"
          className="h-full min-w-0 flex-1 bg-transparent text-[11px] text-fg placeholder:text-fg-mute focus:outline-none"
        />
      </div>

      <div className="max-h-[240px] overflow-y-auto py-0.5">
        {matches.length === 0 ? (
          <p className="px-2 py-2.5 text-[10.5px] leading-relaxed text-fg-mute">
            Nothing here can feed this one — a {KIND_LABEL[node.kind].toLowerCase()} takes a{" "}
            {KIND_LABEL[node.kind].toLowerCase()}, and a link can&apos;t loop back on itself.
          </p>
        ) : (
          (["primitive", "semantic", "component"] as VarTier[]).map((tier) => {
            const group = matches.filter((c) => c.tier === tier);
            if (group.length === 0) return null;
            return (
              <div key={tier}>
                <p className="flex items-center gap-1.5 px-2 pb-0.5 pt-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-fg-mute">
                  <TierBadge tier={tier} size={10} />
                  {TIER_META[tier].plural}
                </p>
                {group.slice(0, 150).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pick(c)}
                    className="flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors hover:bg-ink-hover"
                  >
                    {c.kind === "color" ? (
                      <Swatch hex={c.swatch?.[mode ?? "light"]} size={11} />
                    ) : (
                      <KindIcon kind={c.kind} size={11} />
                    )}
                    <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-fg-dim">
                      {c.path}
                    </span>
                    {c.detail ? (
                      <span className="shrink-0 font-mono text-[9px] text-fg-mute">{c.detail}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Only where there's something stored to drop. A property still on the
          binding it ships with has nothing to clear, and the way to change it
          is to pick a source above. */}
      {node.tier === "usage" && node.usage?.overridden ? (
        <button
          type="button"
          onClick={() => {
            clearComponentBinding(node.usage!.componentId, node.usage!.storageKey);
            onClose();
          }}
          className="flex w-full items-center justify-center gap-1.5 border-t border-line px-2 py-1.5 text-[10.5px] text-fg-mute transition-colors hover:bg-ink-hover hover:text-fg"
        >
          <Unlink size={10} />
          Back to default
        </button>
      ) : null}
    </div>
  );
}

/** One editable cell. Closed it's a chip; open it's the editor above. */
function ValueCell({
  node,
  mode,
  graph,
}: {
  node: VarNode;
  mode: PreviewMode | null;
  graph: VariableGraph;
}) {
  const [open, setOpen] = useState(false);
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);

  const value = mode ? (node.raw?.[mode] ?? "") : node.ref;
  const isColor = node.kind === "color";
  const resolved = !isColor
    ? undefined
    : mode
      ? resolveTokenValue({ primitives, semantics }, mode, value)
      : graph.nodes[graph.incoming[node.id]?.[0] ?? ""]?.swatch?.light;
  // What the value actually works out to right now — the thing a radius or a
  // spacing token is really being asked.
  const detail = isColor || !mode ? undefined : describeTokenValue(primitives, value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Point this at a variable, or type a value"
        className={`flex w-full items-center rounded px-1 py-0.5 text-left transition-colors hover:bg-ink-hover ${
          open ? "bg-ink-hover" : ""
        }`}
      >
        <ValueChip value={value} resolved={resolved} detail={detail} kind={node.kind} />
      </button>
      {open ? (
        <CellEditor node={node} mode={mode} graph={graph} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

/* ──────────────────── where a primitive is really edited ──────────────────── */

/**
 * A primitive scale isn't a list you type into — it's generated. A ramp comes
 * from a seed, spacing from a base × multipliers, type from a base × a ratio.
 * So Variables doesn't try to be a second editor for them; it names the two
 * places the real editing happens and takes you to either in one click.
 *
 * Both destinations already exist and always have. What was missing was any way
 * to get to them from here, which is what made the primitive sets feel read-only.
 */
export function PrimitiveActions({ collection }: { collection: VarCollection }) {
  const setPendingFocus = useDesignSystem((s) => s.setPendingFocus);
  const goToStep = useDesignSystem((s) => s.goToStep);
  const focusTokenSection = useDesignSystem((s) => s.focusTokenSection);

  const home = primitiveHome(collection);
  if (!home) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
      <p className="min-w-0 flex-1 text-[10.5px] leading-snug text-fg-mute">
        Primitives are generated scales, so they&apos;re tuned where they&apos;re generated —
        everything aliased to them follows whatever you set there.
      </p>

      {home.section ? (
        <button
          type="button"
          onClick={() => focusTokenSection(home.section!)}
          title={`Open the Tokens panel at ${home.sectionLabel} — where steps are added and removed`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[10.5px] font-semibold text-fg-dim transition-colors hover:border-line-strong hover:bg-ink-hover hover:text-fg"
        >
          <Plus size={11} />
          Add or remove steps
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (home.anchor) setPendingFocus({ step: home.step, anchor: home.anchor });
          goToStep(home.step);
        }}
        title={`Tune these values on the ${home.stepLabel} step`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[10.5px] font-semibold text-fg-dim transition-colors hover:border-line-strong hover:bg-ink-hover hover:text-fg"
      >
        <SlidersHorizontal size={11} />
        Edit in {home.stepLabel}
      </button>
    </div>
  );
}

/* ────────────────────────── the sets list ────────────────────────── */

function SetsList({
  graph,
  activeId,
  onPick,
  onNew,
}: {
  graph: VariableGraph;
  activeId: string | null;
  onPick: (id: string) => void;
  /** Opens the create panel, on the tier that asked for it. */
  onNew: (kind?: "semantic" | "component") => void;
}) {
  return (
    <div className="flex h-full w-[212px] shrink-0 flex-col border-r border-line bg-ink-panel">
      <div className="flex h-[38px] shrink-0 items-center justify-between border-b border-line px-3">
        <span className="text-[11.5px] font-bold text-fg">Sets</span>
        <button
          type="button"
          onClick={() => onNew()}
          title="Create a new set of variables"
          className="inline-flex items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-mute transition-colors hover:border-line-strong hover:bg-ink-hover hover:text-fg"
        >
          <Plus size={10} />
          New
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1.5">
        {TIER_ORDER.map((tier) => {
          const inTier = graph.collections.filter((c) => c.tier === tier);
          if (inTier.length === 0) return null;
          // Primitives are generated scales and usage is the wiring you've
          // already done — neither is a place a set can be *added*.
          const canAdd = tier === "semantic" || tier === "component";
          return (
            <div key={tier} className="mb-2">
              <div
                className="flex items-center gap-1.5 px-3 pb-1 pt-1 text-[9px] font-bold uppercase tracking-[0.08em]"
                style={{ color: tierColor(tier) }}
              >
                <TierBadge tier={tier} size={11} />
                <span className="min-w-0 flex-1 truncate">{TIER_META[tier].plural}</span>
                {canAdd ? (
                  <button
                    type="button"
                    onClick={() => onNew(tier as "semantic" | "component")}
                    title={`New set of ${TIER_META[tier].plural.toLowerCase()}`}
                    aria-label={`New set of ${TIER_META[tier].plural.toLowerCase()}`}
                    className="shrink-0 rounded p-0.5 transition-colors hover:bg-ink-hover"
                    style={{ color: tierColor(tier) }}
                  >
                    <Plus size={12} />
                  </button>
                ) : null}
              </div>
              {inTier.map((c, i) => {
                const active = activeId === c.id;
                // Fifty-three components in one flat list is a wall of names.
                // They already come in the library's own four lanes, so the
                // list says which one it's in each time that changes.
                const lane = c.source?.laneLabel;
                const newLane = !!lane && lane !== inTier[i - 1]?.source?.laneLabel;
                return (
                  <div key={c.id}>
                    {newLane ? (
                      <p className="px-3 pb-0.5 pt-1.5 text-[8.5px] font-bold uppercase tracking-[0.09em] text-fg-mute">
                        {lane}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onPick(c.id)}
                      className={`flex w-full items-center gap-2 px-3 py-[5px] text-left transition-colors ${
                        active ? "bg-ink-raised" : "hover:bg-ink-hover"
                      }`}
                      style={active ? { boxShadow: `inset 2px 0 0 ${tierColor(tier)}` } : undefined}
                    >
                      <span
                        className={`min-w-0 flex-1 truncate text-[11.5px] ${
                          active ? "font-semibold text-fg" : "text-fg-dim"
                        }`}
                      >
                        {c.label}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-fg-mute">
                        {c.nodes.length}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────── the table ────────────────────────── */

/** Inline rename, shared by the set header and every token row. */
function EditableName({
  value,
  onCommit,
  className,
  title,
}: {
  value: string;
  onCommit: (next: string) => void;
  className: string;
  title: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      value={draft}
      spellCheck={false}
      title={title}
      onChange={(e) => setDraft(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => {
        if (draft.trim() && draft.trim() !== value) onCommit(draft.trim());
        else setDraft(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
}

export function VariableTable({
  graph,
  onNewSet,
}: {
  graph: VariableGraph;
  /** Opens the create panel, which the workspace owns so the map shares it. */
  onNewSet: (kind?: "semantic" | "component") => void;
}) {
  const ui = useDesignSystem((s) => s.variablesUI);
  const selectVariable = useDesignSystem((s) => s.selectVariable);
  const setActiveVariableCollection = useDesignSystem((s) => s.setActiveVariableCollection);
  const addRole = useDesignSystem((s) => s.addRole);
  const removeRole = useDesignSystem((s) => s.removeRole);
  const renameRole = useDesignSystem((s) => s.renameRole);
  const renameGroup = useDesignSystem((s) => s.renameGroup);
  const removeGroup = useDesignSystem((s) => s.removeGroup);
  const setPendingFocus = useDesignSystem((s) => s.setPendingFocus);
  const goToStep = useDesignSystem((s) => s.goToStep);
  const semantics = useDesignSystem((s) => s.semantics);

  const modeDefs = useMemo(() => modeDefsOf(semantics), [semantics]);

  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  /** What the next new variable will hold. Sticky, since a run of additions to
   *  one set is usually a run of the same type. */
  const [newKind, setNewKind] = useState<TokenKind>("color");
  const [confirmDeleteSet, setConfirmDeleteSet] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Land on a set rather than an empty pane — the first semantic one, since
  // that's where a file's own vocabulary lives.
  const active = useMemo(() => {
    const byId = graph.collections.find((c) => c.id === ui.activeCollection);
    if (byId) return byId;
    return (
      graph.collections.find((c) => c.tier === "semantic") ??
      graph.collections[0] ??
      null
    );
  }, [graph.collections, ui.activeCollection]);

  useEffect(() => {
    if (active && active.id !== ui.activeCollection) setActiveVariableCollection(active.id);
  }, [active, ui.activeCollection, setActiveVariableCollection]);

  // "Show me this one" — from the rail's search, or the inspector's links. On
  // the map that's a camera move; here it's opening the set the variable is in.
  const focusTick = ui.focus?.tick;
  useEffect(() => {
    const id = ui.focus?.id;
    const collectionId = id ? graph.nodes[id]?.collectionId : undefined;
    if (collectionId) setActiveVariableCollection(collectionId);
    // Keyed on the tick alone: the same request shouldn't re-fire when the
    // graph is rebuilt by an unrelated edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTick]);

  const q = query.trim().toLowerCase();
  const visibleNodes = useMemo(
    () =>
      q
        ? (active?.nodes ?? []).filter(
            (n) => n.label.toLowerCase().includes(q) || n.path.toLowerCase().includes(q)
          )
        : (active?.nodes ?? []),
    [active, q]
  );
  const blocks = useMemo(() => blockRows(visibleNodes), [visibleNodes]);

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    window.setTimeout(() => setCopied((c) => (c === text ? null : c)), 1400);
  };

  const isTokenSet = active?.tier === "semantic" || active?.tier === "component";
  const isPrimitive = active?.tier === "primitive";
  // One column per mode on a token set; a single value column everywhere else
  // (primitives hold one raw value, and a component binding is mode-independent).
  const columns: Array<ModeDef | null> = isTokenSet ? modeDefs : [null];
  // Enough width that no column collapses to a swatch and an ellipsis; past
  // three or four modes the table scrolls sideways rather than crushing itself.
  const gridTemplate = `minmax(180px, 1.1fr) repeat(${columns.length}, minmax(150px, 1fr))`;
  const gridMinWidth = 180 + columns.length * 150 + (columns.length + 1) * 12 + 24;

  return (
    <div className="relative flex min-h-0 flex-1 bg-ink">
      <SetsList
        graph={graph}
        activeId={active?.id ?? null}
        onPick={(id) => {
          setActiveVariableCollection(id);
          setQuery("");
          setConfirmDeleteSet(false);
        }}
        onNew={onNewSet}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* set header */}
        <div className="flex h-[38px] shrink-0 items-center gap-2 border-b border-line px-3">
          {active ? (
            <>
              <TierBadge tier={active.tier} size={13} />
              {isTokenSet && active.source?.groupLabel ? (
                <EditableName
                  value={active.label}
                  title="Rename this set"
                  onCommit={(next) => renameGroup(active.source!.groupLabel!, next)}
                  className="min-w-0 max-w-[220px] flex-none rounded border border-transparent bg-transparent px-1 py-0.5 text-[12.5px] font-bold text-fg transition-colors hover:border-line focus:border-line-strong focus:outline-none"
                />
              ) : (
                <span className="text-[12.5px] font-bold text-fg">{active.label}</span>
              )}
              <span className="shrink-0 font-mono text-[10px] text-fg-mute">
                {active.nodes.length}
              </span>
              <span className="hidden truncate text-[10.5px] text-fg-mute xl:block">
                {TIER_META[active.tier].blurb}
              </span>
            </>
          ) : (
            <span className="text-[12.5px] font-bold text-fg">Variables</span>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <div className="flex h-7 w-[168px] items-center gap-1.5 rounded-md border border-line bg-ink-panel px-2">
              <Search size={10} className="shrink-0 text-fg-mute" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setQuery("");
                }}
                placeholder="Filter this set…"
                className="h-full min-w-0 flex-1 bg-transparent text-[11px] text-fg placeholder:text-fg-mute focus:outline-none"
              />
            </div>
            {isTokenSet && active?.addTo ? (
              <button
                type="button"
                onClick={() => setAdding(true)}
                title="Add a variable to this set — a colour, a radius, a spacing step…"
                className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg-mute transition-colors hover:border-line-strong hover:bg-ink-hover hover:text-fg"
              >
                <Plus size={11} />
                Variable
              </button>
            ) : null}
            {isTokenSet ? <AddModeButton /> : null}
            {isTokenSet && active?.source?.groupLabel ? (
              <button
                type="button"
                title="Delete this set and every variable in it"
                onClick={() => {
                  if (!confirmDeleteSet) {
                    setConfirmDeleteSet(true);
                    window.setTimeout(() => setConfirmDeleteSet(false), 4000);
                    return;
                  }
                  removeGroup(active.source!.groupLabel!);
                  setActiveVariableCollection(null);
                  setConfirmDeleteSet(false);
                }}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors ${
                  confirmDeleteSet
                    ? "border-red-500/60 bg-red-500/10 text-red-400"
                    : "border-line text-fg-mute hover:border-red-500/50 hover:text-red-400"
                }`}
              >
                <Trash2 size={11} />
                {confirmDeleteSet ? "Really?" : ""}
              </button>
            ) : null}
          </div>
        </div>

        {/* Head and body scroll together, sideways as well as down — a file
            with five modes is a wide table, not five crushed columns. */}
        <div className="min-h-0 flex-1 overflow-auto">
          <div style={{ minWidth: isTokenSet ? gridMinWidth : undefined }}>
        {/* column head */}
        <div
          className="sticky top-0 z-20 grid shrink-0 items-center gap-3 border-b border-line bg-ink-panel px-3 py-2"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <span className="text-[10.5px] font-semibold text-fg-mute">Name</span>
          {columns.map((c, i) =>
            c ? (
              <ModeHeader key={c.id} def={c} canDelete={!isBuiltInMode(c.id)} />
            ) : (
              <span key={i} className="text-[10.5px] font-semibold text-fg-mute">
                {isPrimitive ? "Value" : "Bound to"}
              </span>
            )
          )}
        </div>

        {/* rows */}
        <div>
          {blocks.length === 0 ? (
            <p className="p-6 text-center text-[11.5px] leading-relaxed text-fg-mute">
              {q
                ? `Nothing in ${active?.label ?? "this set"} matches “${query}”.`
                : "This set is empty. Add a variable to start it off."}
            </p>
          ) : (
            blocks.map((block, bi) => (
              <div key={block.heading ?? block.rows[0].node.id}>
                {block.heading ? (
                  <p
                    className={`px-3 pb-1 pt-3 font-mono text-[10px] tracking-wide text-fg-mute ${
                      bi === 0 ? "pt-2" : ""
                    }`}
                  >
                    {block.heading.split(" / ").map((seg, i, all) => (
                      <span key={seg + i} className={i === all.length - 1 ? "font-bold text-fg-dim" : ""}>
                        {seg}
                        {i < all.length - 1 ? <span className="px-1 opacity-50">/</span> : null}
                      </span>
                    ))}
                  </p>
                ) : null}

                {block.rows.map(({ node, leaf }) => {
                  const selected = ui.selected === node.id;
                  const issue = graph.issues.find((i) => i.nodeId === node.id);
                  const token = nodeTokenName(node.id);
                  return (
                    <div
                      key={node.id}
                      onClick={() => selectVariable(node.id)}
                      style={{ gridTemplateColumns: gridTemplate }}
                      className={`group/row grid cursor-pointer items-center gap-3 border-b border-line px-3 py-1.5 transition-colors ${
                        selected ? "bg-ink-raised" : "hover:bg-ink-panel/60"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <KindIcon kind={node.kind} size={12} />
                        {token ? (
                          <EditableName
                            value={leaf}
                            title="Rename — references and component bindings follow"
                            onCommit={(next) => {
                              // The heading is part of the name: renaming the
                              // leaf has to put the prefix back on.
                              const prefix = node.label.slice(0, node.label.length - leaf.length);
                              renameRole(node.label, `${prefix}${next}`);
                            }}
                            className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-mono text-[11px] text-fg-dim transition-colors hover:border-line focus:border-line-strong focus:text-fg focus:outline-none"
                          />
                        ) : (
                          <span
                            className="min-w-0 flex-1 truncate px-1 font-mono text-[11px] text-fg-dim"
                            title={node.path}
                          >
                            {leaf}
                          </span>
                        )}
                        {issue ? (
                          <span title={issue.message} className="shrink-0 text-red-400">
                            <TriangleAlert size={10} />
                          </span>
                        ) : null}
                        <button
                          type="button"
                          title={`Copy ${node.ref}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            copyRef(node.ref);
                          }}
                          className="shrink-0 rounded p-0.5 text-fg-mute opacity-0 transition-opacity hover:text-fg group-hover/row:opacity-100"
                        >
                          {copied === node.ref ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                        {token ? (
                          <button
                            type="button"
                            title="Delete this variable"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeRole(token);
                              if (ui.selected === node.id) selectVariable(null);
                            }}
                            className="shrink-0 rounded p-0.5 text-fg-mute opacity-0 transition-opacity hover:text-red-400 group-hover/row:opacity-100"
                          >
                            <Trash2 size={10} />
                          </button>
                        ) : null}
                      </div>

                      {columns.map((mode, i) =>
                        isPrimitive ? (
                          <div key={i} className="flex min-w-0 items-center gap-1.5 px-1">
                            <Swatch hex={node.swatch?.light} size={11} />
                            <span className="min-w-0 truncate font-mono text-[10.5px] text-fg-mute">
                              {node.detail ?? "—"}
                            </span>
                          </div>
                        ) : (
                          <ValueCell key={mode?.id ?? i} node={node} mode={mode?.id ?? null} graph={graph} />
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {/* add a variable to this set */}
          {isTokenSet && active?.addTo ? (
            <div className="px-3 py-2">
              {adding ? (
                <div className="flex items-center gap-1.5">
                  {/* What it holds is picked before it's named, because the
                      type decides what the new row can be pointed at. */}
                  <div className="flex shrink-0 rounded-md border border-line bg-ink-panel p-0.5">
                    {NEW_VARIABLE_KINDS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        // mousedown, not click: the name field's blur would
                        // close the whole row before a click ever landed.
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setNewKind(k);
                        }}
                        title={KIND_LABEL[k]}
                        aria-label={KIND_LABEL[k]}
                        aria-pressed={newKind === k}
                        className={`rounded p-1 transition-colors ${
                          newKind === k ? "bg-fg text-ink" : "text-fg-mute hover:text-fg"
                        }`}
                      >
                        <KindIcon
                          kind={k}
                          size={11}
                          className={newKind === k ? "!text-ink" : ""}
                        />
                      </button>
                    ))}
                  </div>
                  <input
                    autoFocus
                    placeholder={`new ${KIND_LABEL[newKind].toLowerCase()} variable…`}
                    onBlur={() => setAdding(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setAdding(false);
                      if (e.key === "Enter") {
                        const v = (e.target as HTMLInputElement).value.trim();
                        if (v && active.addTo) addRole(active.addTo.groupLabel, v, newKind);
                        setAdding(false);
                      }
                    }}
                    className="h-7 w-[260px] rounded-md border border-line-strong bg-ink-panel px-2 font-mono text-[11px] text-fg placeholder:text-fg-mute focus:outline-none"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-fg-mute transition-colors hover:bg-ink-panel hover:text-fg"
                >
                  <Plus size={11} />
                  New variable in {active.label}
                </button>
              )}
            </div>
          ) : null}

          {isPrimitive && active ? <PrimitiveActions collection={active} /> : null}

          {active?.tier === "usage" ? (
            <p className="flex items-start gap-1.5 px-3 py-2.5 text-[10.5px] leading-snug text-fg-mute">
              <Link2 size={11} className="mt-px shrink-0" />
              Every property this component styles, on the binding it renders from — its
              default until you point it somewhere else.
            </p>
          ) : null}
        </div>
          </div>
        </div>
      </div>

    </div>
  );
}
