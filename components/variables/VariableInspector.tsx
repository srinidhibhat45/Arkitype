"use client";

/**
 * The Variables map's inspector — everything you can do to the selected
 * variable that isn't a drag: rename it, retype its value, point it somewhere
 * else, detach it, duplicate it, delete it, or copy any of its three names
 * (reference, custom property, resolved value).
 *
 * The connection is stated as a sentence before it's offered as a control —
 * "action-primary follows brand-600 in both modes" — and the chain below it
 * runs in the direction value actually travels (source first, this variable
 * last), matching the left-to-right read of the map itself.
 *
 * The per-mode value editor is the *same component* the Colour step's token
 * tiers use, not a second one that looks like it — the map is a different view
 * of those tokens, not a different editor for them.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Copy,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Unlink,
} from "lucide-react";
import { PreviewMode, RADII_NAMES, useDesignSystem } from "@/store/useDesignSystem";
import {
  TIER_META,
  VarNode,
  VarTier,
  VariableGraph,
  acceptsKind,
  bindingFor,
  nodeTokenName,
  resolutionChain,
  tierColor,
  wouldCycle,
} from "@/lib/variableGraph";
import { resolveTokenValue } from "@/lib/tokens";
import { ModeValueEditor } from "@/components/steps/TokenTiers";

const PICKER_TIERS: VarTier[] = ["primitive", "semantic", "component"];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-[62px] shrink-0 text-[10px] uppercase tracking-[0.07em] text-fg-mute">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function CopyLine({ value, title }: { value: string; title: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      title={`Copy ${title}`}
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
      className="group flex w-full items-center gap-1.5 rounded border border-transparent px-1 py-0.5 text-left transition-colors hover:border-line hover:bg-ink"
    >
      <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-fg-dim">{value}</span>
      <span className="shrink-0 text-fg-mute opacity-0 transition-opacity group-hover:opacity-100">
        {copied ? <Check size={10} /> : <Copy size={10} />}
      </span>
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 border-b border-line pb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-fg-mute">
      {children}
    </p>
  );
}

/** The tier's ordinal — the same badge the map draws, at inspector scale. */
function TierBadge({ tier, size = 13 }: { tier: VarTier; size?: number }) {
  return (
    <span
      title={TIER_META[tier].label}
      className="flex shrink-0 items-center justify-center rounded-[3px] font-mono font-bold leading-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.62,
        background: tierColor(tier),
        color: "rgb(var(--c-ink-raised))",
      }}
    >
      {TIER_META[tier].step}
    </span>
  );
}

function Swatch({ hex }: { hex?: string }) {
  if (!hex) return null;
  return (
    <span
      className="h-3 w-3 shrink-0 rounded-[3px] border border-line"
      style={{ background: hex }}
    />
  );
}

/* ────────────────────────── the source picker ────────────────────────── */

/**
 * Pick what this variable follows. A search field over the legal targets only,
 * grouped by tier — the whole "can this point at that?" question is answered by
 * what's in the list, so the control never has to explain itself or reject a
 * choice after the fact.
 */
function SourcePicker({
  candidates,
  mode,
  scopeNote,
  onPick,
}: {
  candidates: VarNode[];
  mode: PreviewMode;
  /** What the write will affect — "both modes", "light mode only"… */
  scopeNote: string;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? candidates.filter((c) => c.path.toLowerCase().includes(q)) : candidates),
    [candidates, q]
  );

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setQuery("");
        }}
        className="flex h-8 w-full items-center justify-between gap-1.5 rounded-md border border-line bg-ink px-2 text-[11.5px] font-semibold text-fg transition-colors hover:border-line-strong"
      >
        Choose what it follows
        <ChevronDown size={12} className="shrink-0 text-fg-mute" />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-9 z-30 overflow-hidden rounded-md border border-line-strong bg-ink-raised shadow-2xl">
          <div className="flex h-8 items-center gap-1.5 border-b border-line px-2">
            <Search size={11} className="shrink-0 text-fg-mute" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search variables…"
              className="h-full min-w-0 flex-1 bg-transparent text-[11.5px] text-fg placeholder:text-fg-mute focus:outline-none"
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto py-1">
            {matches.length === 0 ? (
              <p className="px-2.5 py-3 text-[11px] leading-relaxed text-fg-mute">
                Nothing here can feed this variable — a colour role only takes a colour, and a link
                can&apos;t loop back on itself.
              </p>
            ) : (
              PICKER_TIERS.map((tier) => {
                const group = matches.filter((c) => c.tier === tier);
                if (group.length === 0) return null;
                return (
                  <div key={tier}>
                    <p className="flex items-center gap-1.5 px-2 pb-0.5 pt-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-fg-mute">
                      <TierBadge tier={tier} size={11} />
                      {TIER_META[tier].plural}
                    </p>
                    {group.slice(0, 200).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onPick(c.id);
                          setOpen(false);
                        }}
                        className="flex w-full items-center gap-1.5 px-2 py-1 text-left transition-colors hover:bg-ink-hover"
                      >
                        <Swatch hex={c.swatch?.[mode]} />
                        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-dim">
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
          <p className="border-t border-line px-2 py-1 text-[9.5px] text-fg-mute">
            Writes to {scopeNote}.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ────────────────────────── the inspector ────────────────────────── */

export function VariableInspector({ graph }: { graph: VariableGraph }) {
  const ui = useDesignSystem((s) => s.variablesUI);
  const focusVariable = useDesignSystem((s) => s.focusVariable);
  const selectVariable = useDesignSystem((s) => s.selectVariable);
  const setSemantic = useDesignSystem((s) => s.setSemantic);
  const renameRole = useDesignSystem((s) => s.renameRole);
  const removeRole = useDesignSystem((s) => s.removeRole);
  const addRole = useDesignSystem((s) => s.addRole);
  const clearComponentBinding = useDesignSystem((s) => s.clearComponentBinding);
  const setPendingFocus = useDesignSystem((s) => s.setPendingFocus);
  const goToStep = useDesignSystem((s) => s.goToStep);
  const setActiveComponentId = useDesignSystem((s) => s.setActiveComponentId);
  const setComponentBinding = useDesignSystem((s) => s.setComponentBinding);
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);
  const components = useDesignSystem((s) => s.components);

  const [renaming, setRenaming] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const node = ui.selected ? graph.nodes[ui.selected] : undefined;
  const collection = node ? graph.collections.find((c) => c.id === node.collectionId) : undefined;
  const editModes: PreviewMode[] = ui.editMode === "both" ? ["light", "dark"] : [ui.editMode];
  const displayMode: PreviewMode = ui.editMode === "dark" ? "dark" : "light";
  const token = node ? nodeTokenName(node.id) : null;

  const consumers = useMemo(
    () => (node ? (graph.outgoing[node.id] ?? []).map((id) => graph.nodes[id]).filter(Boolean) : []),
    [graph, node]
  );

  /** What currently feeds this variable, and on which mode(s). */
  const sources = useMemo(
    () =>
      node
        ? graph.edges
            .filter((e) => e.to === node.id)
            .map((e) => ({ node: graph.nodes[e.from], mode: e.mode }))
            .filter((s) => s.node)
        : [],
    [graph, node]
  );

  /** Everything this variable could legally be pointed at. */
  const candidates = useMemo(() => {
    if (!node || node.tier === "primitive") return [];
    return graph.order
      .map((id) => graph.nodes[id])
      .filter(
        (n) =>
          n.id !== node.id &&
          n.tier !== "usage" &&
          acceptsKind(node.kind, n.kind) &&
          (node.tier === "usage" || !wouldCycle(graph, node.id, n.id))
      );
  }, [graph, node]);

  const issues = node ? graph.issues.filter((i) => i.nodeId === node.id) : [];

  if (!node) {
    return (
      <div className="flex h-full flex-col justify-between p-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-mute">Variables</p>
          <h2 className="mt-1.5 text-[17px] font-extrabold leading-tight tracking-tight text-fg">
            The map of everything, and what it points at
          </h2>
          <p className="mt-3 text-[12px] leading-relaxed text-fg-dim">
            Value flows left to right through four lanes. Each lane has a colour and a number, and
            every wire is painted in the lane its value came from.
          </p>

          <div className="mt-3 space-y-1.5 rounded-lg border border-line bg-ink p-3">
            {(["primitive", "semantic", "component", "usage"] as VarTier[]).map((tier) => (
              <div key={tier} className="flex items-start gap-2">
                <TierBadge tier={tier} />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold leading-tight" style={{ color: tierColor(tier) }}>
                    {TIER_META[tier].plural}
                  </p>
                  <p className="text-[10.5px] leading-snug text-fg-mute">{TIER_META[tier].blurb}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2 rounded-lg border border-line bg-ink p-3">
            {[
              ["Click any row", "to edit it here — value, source, name"],
              ["Drag a handle", "from one row onto a row to its right to link them"],
              ["Hover a wire", "to detach it — the colour is kept, the link isn't"],
              ["⌘Z / ⇧⌘Z", "to undo and redo · Reset returns to how you found it"],
              ["⌘ + scroll", "to zoom · drag the background to pan"],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2 text-[11px] leading-snug">
                <span className="shrink-0 font-semibold text-fg-dim">{k}</span>
                <span className="text-fg-mute">{v}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="pt-3 text-[11px] leading-relaxed text-fg-mute">
          Nothing here is a separate copy of your tokens — every edit lands in the same place the
          Colour and Components steps write to.
        </p>
      </div>
    );
  }

  const applyAlias = (providerId: string) => {
    const provider = graph.nodes[providerId];
    if (!provider) return;
    if (node.tier === "usage" && node.usage) {
      const binding = bindingFor(provider, primitives.radiusNames ?? [...RADII_NAMES]);
      if (binding) setComponentBinding(node.usage.componentId, node.usage.storageKey, binding);
      return;
    }
    if (!token) return;
    const value = provider.tier === "primitive" ? provider.path : `@${provider.path}`;
    for (const m of editModes) setSemantic(m, token, value);
  };

  const detach = () => {
    if (node.tier === "usage" && node.usage) {
      clearComponentBinding(node.usage.componentId, node.usage.storageKey);
      return;
    }
    if (!token) return;
    for (const m of editModes) {
      setSemantic(m, token, resolveTokenValue({ primitives, semantics }, m, semantics.modes[m][token] ?? ""));
    }
  };

  const duplicate = () => {
    if (!token || !collection?.addTo) return;
    const name = `${token}-copy`;
    addRole(collection.addTo.groupLabel, name);
    // addRole slugifies and seeds a default; copy the original's real values on top.
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    for (const m of ["light", "dark"] as PreviewMode[]) {
      const v = semantics.modes[m][token];
      if (v !== undefined) setSemantic(m, slug, v);
    }
    selectVariable(`tok:${slug}`);
  };

  const modeWord = (mode: string) =>
    mode === "both" ? "in both modes" : mode === "binding" ? "" : `in ${mode} mode only`;

  const scopeNote =
    node.tier === "usage"
      ? "this component property"
      : ui.editMode === "both"
        ? "both light and dark"
        : `${ui.editMode} mode only`;

  // Source first, this variable last — the direction value actually travels.
  const chain = resolutionChain(graph, { primitives, semantics, components }, node.id, displayMode)
    .slice()
    .reverse();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* ── identity ── */}
        <div>
          <div className="flex items-center gap-1.5">
            <TierBadge tier={node.tier} />
            <span
              className="rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.07em]"
              style={{ color: tierColor(node.tier), borderColor: tierColor(node.tier, 0.45) }}
            >
              {TIER_META[node.tier].label}
            </span>
            {collection ? (
              <span className="truncate text-[10px] text-fg-mute">{collection.label}</span>
            ) : null}
          </div>

          {token ? (
            <input
              value={renaming || node.label}
              onChange={(e) => setRenaming(e.target.value)}
              onBlur={() => {
                if (renaming.trim() && renaming.trim() !== token) renameRole(token, renaming.trim());
                setRenaming("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setRenaming("");
              }}
              title="Rename — references and component bindings follow"
              className="mt-2 w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 font-mono text-[14px] font-bold text-fg transition-colors hover:border-line focus:border-line-strong focus:outline-none"
            />
          ) : (
            <p className="mt-2 px-1.5 font-mono text-[14px] font-bold text-fg">{node.path}</p>
          )}
        </div>

        {issues.length > 0 ? (
          <div className="space-y-1 rounded-lg border border-red-500/40 bg-red-500/5 p-2.5">
            {issues.map((i) => (
              <p key={`${i.mode}-${i.message}`} className="flex gap-1.5 text-[11px] leading-snug text-red-400">
                <TriangleAlert size={11} className="mt-px shrink-0" />
                {i.message}
              </p>
            ))}
          </div>
        ) : null}

        {/* ── the connection, stated before it's offered ── */}
        {node.tier !== "primitive" ? (
          <div>
            <SectionTitle>Where this gets its value</SectionTitle>

            <div className="rounded-lg border border-line bg-ink p-2.5">
              {sources.length === 0 ? (
                <p className="text-[11.5px] leading-relaxed text-fg-dim">
                  <span className="font-mono font-semibold text-fg">{node.label}</span>{" "}
                  {node.tier === "usage"
                    ? "isn't bound to anything — it falls back to the component's default."
                    : "holds a fixed value. Nothing feeds it, so nothing upstream can change it."}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {sources.map((s) => (
                    <button
                      key={`${s.node.id}-${s.mode}`}
                      type="button"
                      onClick={() => focusVariable(s.node.id)}
                      title={`Go to ${s.node.path}`}
                      className="flex w-full items-center gap-1.5 rounded text-left transition-colors hover:bg-ink-hover"
                    >
                      <span className="shrink-0 text-[11.5px] text-fg-mute">follows</span>
                      <TierBadge tier={s.node.tier} size={12} />
                      <Swatch hex={s.node.swatch?.[displayMode]} />
                      <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] font-semibold text-fg">
                        {s.node.path}
                      </span>
                      <span className="shrink-0 text-[10px] text-fg-mute">{modeWord(s.mode)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 space-y-1.5">
              <SourcePicker
                candidates={candidates}
                mode={displayMode}
                scopeNote={scopeNote}
                onPick={applyAlias}
              />
              {sources.length > 0 ? (
                <button
                  type="button"
                  onClick={detach}
                  title={
                    node.tier === "usage"
                      ? "Remove the binding — the property returns to its default"
                      : "Cut the link and freeze the colour it resolves to right now"
                  }
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-line bg-ink px-2 py-1.5 text-[11px] text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
                >
                  <Unlink size={11} />
                  {node.tier === "usage" ? "Clear binding" : "Unlink — keep the current colour"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* ── value ── */}
        {token ? (
          <div>
            <SectionTitle>Value</SectionTitle>
            <div className="space-y-2">
              {(["light", "dark"] as PreviewMode[]).map((m) => (
                <div key={m}>
                  <p className="mb-1 text-[10px] uppercase tracking-[0.07em] text-fg-mute">{m}</p>
                  <ModeValueEditor mode={m} token={token} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <SectionTitle>Value</SectionTitle>
            <div className="space-y-1">
              <Row label="Current">
                <span className="font-mono text-[11px] text-fg-dim">{node.detail || "—"}</span>
              </Row>
              {node.tier === "primitive" ? (
                <p className="pt-1 text-[11px] leading-relaxed text-fg-mute">
                  Primitives hold raw values — edit this one on its own step, and everything aliased
                  to it follows.
                </p>
              ) : null}
            </div>
          </div>
        )}

        {/* ── the full chain, in the direction value travels ── */}
        {chain.length > 1 ? (
          <div>
            <SectionTitle>The whole chain ({displayMode})</SectionTitle>
            <div className="space-y-0.5">
              {chain.map((link, i) => {
                const linkNode = link.nodeId ? graph.nodes[link.nodeId] : undefined;
                const isThis = link.nodeId === node.id;
                return (
                  <div key={`${link.nodeId ?? "lit"}-${i}`}>
                    {i > 0 ? (
                      <div className="pl-[6px] text-[9px] leading-[10px] text-fg-mute">↓</div>
                    ) : null}
                    <button
                      type="button"
                      disabled={!link.nodeId || isThis}
                      onClick={() => link.nodeId && focusVariable(link.nodeId)}
                      className={`flex w-full items-center gap-1.5 rounded px-1 py-1 text-left transition-colors enabled:hover:bg-ink ${
                        isThis ? "bg-ink" : ""
                      }`}
                    >
                      {linkNode ? (
                        <TierBadge tier={linkNode.tier} size={12} />
                      ) : (
                        <span className="h-3 w-3 shrink-0" />
                      )}
                      <Swatch hex={link.swatch} />
                      <span
                        className={`min-w-0 flex-1 truncate font-mono text-[10.5px] ${
                          isThis ? "font-bold text-fg" : "text-fg-dim"
                        }`}
                      >
                        {link.label}
                      </span>
                      <span className="shrink-0 truncate font-mono text-[9.5px] text-fg-mute">
                        {link.value}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* ── consumers ── */}
        <div>
          <SectionTitle>What depends on this {consumers.length > 0 ? `(${consumers.length})` : ""}</SectionTitle>
          {consumers.length === 0 ? (
            <p className="text-[11px] leading-relaxed text-fg-mute">
              Nothing points here yet. Drag this row&apos;s right handle onto a role or a component
              property to wire it up.
            </p>
          ) : (
            <div className="space-y-0.5">
              {consumers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => focusVariable(c.id)}
                  className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left transition-colors hover:bg-ink"
                >
                  <TierBadge tier={c.tier} size={12} />
                  <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-fg-dim">
                    {c.path}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── names ── */}
        <div>
          <SectionTitle>Copy</SectionTitle>
          <div className="space-y-0.5">
            <CopyLine value={node.ref} title="reference" />
            {node.cssVar ? <CopyLine value={`var(${node.cssVar})`} title="custom property" /> : null}
            {node.swatch ? <CopyLine value={node.swatch[displayMode]} title="resolved value" /> : null}
          </div>
        </div>
      </div>

      {/* ── destructive + jump-out actions ── */}
      <div className="shrink-0 space-y-1.5 border-t border-line bg-ink p-3">
        {node.tier === "usage" && node.usage ? (
          <button
            type="button"
            onClick={() => {
              setActiveComponentId(node.usage!.componentId);
              goToStep("components"); // also restores the step canvas over the map
            }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-line px-2 py-1.5 text-[11px] text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
          >
            <ArrowUpRight size={11} />
            Open in the Components step
          </button>
        ) : null}

        {node.tier === "primitive" && node.kind === "color" ? (
          <button
            type="button"
            onClick={() => {
              setPendingFocus({ step: "colour", anchor: node.path.split("-").slice(0, -1).join("-") });
              goToStep("colour");
            }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-line px-2 py-1.5 text-[11px] text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
          >
            <ArrowUpRight size={11} />
            Edit this ramp in the Colour step
          </button>
        ) : null}

        {token ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={duplicate}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line px-2 py-1.5 text-[11px] text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
            >
              <Plus size={11} />
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  window.setTimeout(() => setConfirmDelete(false), 3000);
                  return;
                }
                removeRole(token);
                selectVariable(null);
                setConfirmDelete(false);
              }}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${
                confirmDelete
                  ? "border-red-500/60 bg-red-500/10 text-red-400"
                  : "border-line text-fg-mute hover:border-red-500/50 hover:text-red-400"
              }`}
            >
              <Trash2 size={11} />
              {confirmDelete ? "Really delete?" : "Delete"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
