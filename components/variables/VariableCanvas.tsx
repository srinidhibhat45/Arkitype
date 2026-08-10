"use client";

/**
 * The Variables map — every variable in the file as a row, every alias as a
 * connection, both editable by hand.
 *
 * Reading it: value flows left to right through four banded lanes — primitives
 * → semantic roles → component tokens → the component properties that consume
 * them. Each lane is one column of cards in a fixed order, so a set is always
 * where you last saw it, and each carries its tier's accent and ordinal (1–4).
 *
 * Reading the wiring: a full system is several hundred aliases, and one
 * hairline per alias is a weave rather than a map. So at rest the map draws one
 * **ribbon per pair of sets** — coloured by the tier the values come from,
 * thick in proportion to how many run along it, and *openable*: click a ribbon
 * and it lists its links by name, each one a jump to that variable or a button
 * to cut it. Point at a card or a row and the ribbons step back so the actual
 * wires of that one chain can be drawn on top. (All draws the whole weave at
 * once, for when that's what you want.)
 *
 * Wiring it: grab a row's handle and either drag onto a target or let go and
 * click one — both work, and while you're connecting every row that *can*
 * legally take the link stays lit while the rest fade, so a drop is never a
 * guess. Every edit lands in the store the Colour and Components steps write to
 * (`setSemantic`, `setComponentBinding`), is undoable (⌘Z), and Reset returns
 * the file to how it stood when you opened Variables.
 *
 * The canvas holds no token state of its own. It owns exactly two things:
 * where the cards sit (per project, in localStorage — a view preference, not
 * part of the design system) and where the viewport is.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Focus,
  FoldVertical,
  Maximize,
  Minus,
  Plus,
  Redo2,
  RotateCcw,
  SlidersHorizontal,
  Undo2,
  Unlink,
  UnfoldVertical,
  X,
} from "lucide-react";
import {
  PreviewMode,
  docChanged,
  modeDefsOf,
  useDesignSystem,
} from "@/store/useDesignSystem";
import { Columns3, Rows3 } from "lucide-react";
import {
  BAND_HEAD_H,
  BAND_PAD,
  CARD_HEAD_H,
  CARD_W,
  Point,
  ROW_H,
  TIER_META,
  TIER_ORDER,
  VarCollection,
  VarEdge,
  VarTier,
  VariableGraph,
  autoLayout,
  bundleWidth,
  bundleWires,
  hasCardFooter,
  isEveryMode,
  nodeTokenName,
  planConnection,
  primitiveHome,
  relatedNodes,
  tierColor,
  wireMid,
  wirePath,
  wireSamples,
} from "@/lib/variableGraph";
import { freezeTokenValue } from "@/lib/tokens";
import { RowMark, TierBadge } from "@/components/variables/VariableBits";

// Low enough that "fit" really fits: a full system is a tall single column per
// lane, and a canvas sharing the screen with two panels is a fraction of that.
// Labels are lost down here — the tier plates and their colours are what you
// navigate by.
const MIN_SCALE = 0.1;
const MAX_SCALE = 2.2;
const FOOT_H = 24;

/** A card's laid-out box, after user drags are applied over the auto-layout. */
interface Placed extends Point {
  collection: VarCollection;
  h: number;
  collapsed: boolean;
}

/** A connection in progress — dragged from a handle, or armed by a click. */
interface Connecting {
  from: string;
  side: "in" | "out";
  /** Where the loose end currently is, in graph coordinates. */
  at: Point;
  /** True once the button is up and the next click is the drop. */
  armed: boolean;
}

/* ────────────────────────── geometry helpers ────────────────────────── */

/**
 * Left ("in") or right ("out") anchor of a row, in graph coordinates. Every row
 * of a collapsed card shares the header's anchor — which is the whole point:
 * forty wires arrive as one bundle instead of forty.
 */
function anchorOf(placed: Placed, rowIdx: number, side: "in" | "out"): Point {
  return {
    x: side === "out" ? placed.x + CARD_W : placed.x,
    y: placed.collapsed
      ? placed.y + CARD_HEAD_H / 2
      : placed.y + CARD_HEAD_H + rowIdx * ROW_H + ROW_H / 2,
  };
}

/* ────────────────────────── canvas chrome ────────────────────────── */

function ToolButton({
  title,
  onClick,
  disabled,
  active,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  /** Renders the button as the chosen one in a set. */
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={`rounded p-1 transition-colors disabled:opacity-30 ${
        active
          ? "bg-fg text-ink"
          : "text-fg-mute enabled:hover:bg-ink-hover enabled:hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * The footer on a primitive card: the way out to where that scale is really
 * edited. It sits where the token cards' "New variable" sits, because it
 * answers the same question in the only way a generated scale can — a ramp
 * gains a step on the Colour step, spacing on its own step, and neither has
 * ever been editable anywhere else.
 */
function PrimitiveCardFooter({
  collection,
  accent,
  tier,
}: {
  collection: VarCollection;
  accent: string;
  tier: VarTier;
}) {
  const focusTokenSection = useDesignSystem((s) => s.focusTokenSection);
  const setPendingFocus = useDesignSystem((s) => s.setPendingFocus);
  const goToStep = useDesignSystem((s) => s.goToStep);

  const home = primitiveHome(collection);
  if (!home) return null;

  return (
    <div className="rounded-b-lg border-t border-line px-1.5 py-1">
      <button
        type="button"
        onClick={() => {
          if (home.section) {
            focusTokenSection(home.section);
            return;
          }
          if (home.anchor) setPendingFocus({ step: home.step, anchor: home.anchor });
          goToStep(home.step);
        }}
        title={
          home.section
            ? `Add or remove steps in the Tokens panel (${home.sectionLabel}) — or tune the values on the ${home.stepLabel} step`
            : `Edit this scale on the ${home.stepLabel} step`
        }
        className="flex h-[20px] w-full items-center justify-center gap-1 rounded text-[10px] font-bold transition-colors"
        style={{ color: accent, background: tierColor(tier, 0.12) }}
      >
        <SlidersHorizontal size={10} />
        {home.section ? "Add / remove steps" : `Edit in ${home.stepLabel}`}
      </button>
    </div>
  );
}

/* ────────────────────────── the canvas ────────────────────────── */

export function VariableCanvas({
  graph,
  onNewSet,
}: {
  graph: VariableGraph;
  /** Opens the create panel — shared with the table, and owned above both. */
  onNewSet: (kind?: "semantic" | "component") => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeProjectId = useDesignSystem((s) => s.activeProjectId);
  const ui = useDesignSystem((s) => s.variablesUI);
  const selectVariable = useDesignSystem((s) => s.selectVariable);
  const setSemantic = useDesignSystem((s) => s.setSemantic);
  const setComponentBinding = useDesignSystem((s) => s.setComponentBinding);
  const clearComponentBinding = useDesignSystem((s) => s.clearComponentBinding);
  const addRole = useDesignSystem((s) => s.addRole);
  const setLinkView = useDesignSystem((s) => s.setVariableLinkView);
  const setLayout = useDesignSystem((s) => s.setVariableLayout);
  const setEditMode = useDesignSystem((s) => s.setVariableEditMode);
  const setCollapsed = useDesignSystem((s) => s.setVariableCollapsed);
  const setCollapsedAll = useDesignSystem((s) => s.setVariableCollapsedAll);
  const undo = useDesignSystem((s) => s.undo);
  const redo = useDesignSystem((s) => s.redo);
  const revertToCheckpoint = useDesignSystem((s) => s.revertToCheckpoint);
  const canUndo = useDesignSystem((s) => s.history.past.length > 0);
  const canRedo = useDesignSystem((s) => s.history.future.length > 0);
  const dirty = useDesignSystem((s) => docChanged(s, s.history.checkpoint));
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);
  const components = useDesignSystem((s) => s.components);

  const [view, setView] = useState({ x: 40, y: 32, scale: 0.85 });
  const [drag, setDrag] = useState<Record<string, Point>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  /** Pointing at a card lights everything it touches — the collapsed-card case. */
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  /** Pointing at a ribbon previews the wires it stands for. */
  const [hoveredBundle, setHoveredBundle] = useState<string | null>(null);
  /** Clicking one opens it: the ribbon stays lit and lists its links. */
  const [openBundle, setOpenBundle] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<Connecting | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; ok: boolean } | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  // Open by default — it's what teaches the colour system — but the choice to
  // close it sticks, since it sits over the map.
  const [legendOpen, setLegendOpen] = useState(true);
  useEffect(() => {
    setLegendOpen(localStorage.getItem("arkitype-varmap-legend") !== "closed");
  }, []);
  const toggleLegend = () =>
    setLegendOpen((open) => {
      localStorage.setItem("arkitype-varmap-legend", open ? "closed" : "open");
      return !open;
    });

  const flash = useCallback((text: string, ok: boolean) => {
    setToast({ text, ok });
    window.setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 2600);
  }, []);

  const linkView = ui.links;

  /**
   * Hit areas are in graph coordinates, so a fixed 14px band is 14px of
   * *canvas* — 5px of screen at the zoom you actually read the whole map at,
   * which is not something a pointer can be expected to find. Widening them as
   * the view shrinks keeps the target roughly constant on screen; the floor
   * stops a 10% zoom-out from inflating them into each other.
   */
  const grabScale = 1 / Math.max(0.45, view.scale);

  /**
   * Which cards are folded right now. A set's own default decides it (every
   * component starts folded; everything else starts open) and the two exception
   * lists in the store override that per card — see `VariablesUI.collapsed`.
   */
  const collapsed = useMemo(() => {
    const folded = new Set(ui.collapsed);
    const opened = new Set(ui.expanded);
    for (const c of graph.collections) {
      if (c.defaultCollapsed && !opened.has(c.id)) folded.add(c.id);
    }
    return folded;
  }, [ui.collapsed, ui.expanded, graph.collections]);

  /* ── which mode(s) an edit writes ── */

  const modeDefs = useMemo(() => modeDefsOf(semantics), [semantics]);
  const editModes: PreviewMode[] = useMemo(
    () => (ui.editMode === "all" ? modeDefs.map((d) => d.id) : [ui.editMode]),
    [ui.editMode, modeDefs]
  );
  /** Which column the row swatches show. */
  const displayMode: PreviewMode =
    ui.editMode === "all" ? (modeDefs[0]?.id ?? "light") : ui.editMode;

  /* ── visible slice of the graph ── */

  const visible = useMemo(() => {
    const referenced = new Set(graph.edges.map((e) => e.from));
    const collections = graph.collections
      .filter((c) => ui.tiers[c.tier] && !ui.hiddenCollections.includes(c.id))
      .map((c) => ({
        ...c,
        nodes:
          ui.connectedOnly && c.tier === "primitive"
            ? c.nodes.filter((n) => referenced.has(n.id))
            : c.nodes,
      }))
      .filter((c) => c.nodes.length > 0);

    const rowOf: Record<string, { collectionId: string; index: number }> = {};
    collections.forEach((c) =>
      c.nodes.forEach((n, i) => {
        rowOf[n.id] = { collectionId: c.id, index: i };
      })
    );
    return { collections, rowOf };
  }, [graph, ui.tiers, ui.hiddenCollections, ui.connectedOnly]);

  /* ── card placement: auto-layout, then user drags on top ── */

  const auto = useMemo(
    () => autoLayout(visible.collections, collapsed, ui.layout),
    [visible.collections, collapsed, ui.layout]
  );

  const placed = useMemo(() => {
    const out: Record<string, Placed> = {};
    for (const c of visible.collections) {
      const box = auto[c.id];
      if (!box) continue;
      const moved = drag[c.id];
      const isCollapsed = collapsed.has(c.id);
      out[c.id] = {
        collection: c,
        x: moved?.x ?? box.x,
        y: moved?.y ?? box.y,
        h: isCollapsed
          ? CARD_HEAD_H
          : CARD_HEAD_H + c.nodes.length * ROW_H + (hasCardFooter(c) ? FOOT_H : 6),
        collapsed: isCollapsed,
      };
    }
    return out;
  }, [visible.collections, auto, drag, collapsed]);

  /**
   * The four plates, measured from where the cards actually are — so a band
   * still wraps its cards after they've been dragged.
   *
   * Each one stops at its own last card rather than running to the deepest
   * lane's floor. Squaring them off looked tidier in a mockup and reads as a
   * mistake in practice: a lane with eleven cards in it drew a thousand pixels
   * of empty tinted nothing under them because an unrelated lane happened to be
   * longer, which says "something belongs here and is missing" about a lane
   * that is in fact complete.
   */
  const bands = useMemo(() => {
    const out: Array<{ tier: VarTier; x: number; y: number; w: number; h: number; count: number }> = [];
    for (const tier of TIER_ORDER) {
      const cards = Object.values(placed).filter((p) => p.collection.tier === tier);
      if (cards.length === 0) continue;
      const x = Math.min(...cards.map((p) => p.x)) - BAND_PAD;
      const y = Math.min(...cards.map((p) => p.y)) - BAND_HEAD_H;
      const right = Math.max(...cards.map((p) => p.x + CARD_W)) + BAND_PAD;
      const bottom = Math.max(...cards.map((p) => p.y + p.h)) + BAND_PAD;
      out.push({
        tier,
        x,
        y,
        w: right - x,
        h: bottom - y,
        count: cards.reduce((s, p) => s + p.collection.nodes.length, 0),
      });
    }
    return out;
  }, [placed]);

  /** Drives the fold-all toggle: it only offers "unfold" once nothing is open. */
  const allFolded = useMemo(() => {
    const ids = Object.keys(placed);
    return ids.length > 0 && ids.every((id) => collapsed.has(id));
  }, [placed, collapsed]);

  const bounds = useMemo(() => {
    let w = 600;
    let h = 400;
    for (const p of Object.values(placed)) {
      w = Math.max(w, p.x + CARD_W + 80);
      h = Math.max(h, p.y + p.h + 80);
    }
    return { w, h };
  }, [placed]);

  /* ── card positions persist per project (a view preference, not file data) ── */

  // Keyed by layout as well as project: a card dragged somewhere sensible in
  // one arrangement is nowhere in particular in the other, and carrying the
  // positions across would make switching look like a bug.
  const storageKey = activeProjectId ? `arkitype-varmap-${activeProjectId}-${ui.layout}` : null;
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      setDrag(raw ? (JSON.parse(raw) as Record<string, Point>) : {});
    } catch {
      setDrag({});
    }
  }, [storageKey]);

  const persistDrag = useCallback(
    (next: Record<string, Point>) => {
      setDrag(next);
      if (storageKey) localStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey]
  );

  /* ── anchors ── */

  const anchor = useCallback(
    (nodeId: string, side: "in" | "out"): Point | null => {
      const row = visible.rowOf[nodeId];
      if (!row) return null;
      const p = placed[row.collectionId];
      if (!p) return null;
      return anchorOf(p, row.index, side);
    },
    [visible.rowOf, placed]
  );

  /* ── viewport: pan, zoom, fit, focus ── */

  const toGraph = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - view.x) / view.scale,
        y: (clientY - rect.top - view.y) / view.scale,
      };
    },
    [view]
  );

  // Native listener so the wheel can be pre-empted — React's synthetic handler
  // is passive, and a passive handler can't stop the page from scrolling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        setView((v) => {
          const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * Math.exp(-e.deltaY / 260)));
          const k = scale / v.scale;
          return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
        });
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (factor: number) =>
    setView((v) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const px = (rect?.width ?? 800) / 2;
      const py = (rect?.height ?? 600) / 2;
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const k = scale / v.scale;
      return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });

  /**
   * The opening view: every lane on screen across, parked at the top.
   *
   * Fitting the *height* too would be honest and useless — one column per lane
   * makes the map several thousand pixels deep, and a true fit renders it at 8%,
   * where nothing has a name. Width is the dimension that has to fit (it's how
   * many lanes there are); depth is the one you scroll.
   */
  const fitWidth = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const byWidth = (rect.width - 56) / bounds.w;
    // Packed exists to put the whole system on one screen, so it fits both
    // dimensions. Lanes is deliberately deeper than any screen, so fitting its
    // height would render it at 8% — width is the only honest fit there.
    const byHeight = (rect.height - 150) / bounds.h;
    const raw = ui.layout === "packed" ? Math.min(byWidth, byHeight) : byWidth;
    const scale = Math.min(1, Math.max(0.3, raw));
    // Clear the floating toolbars as well as the band headers — a lane whose
    // name is parked behind the undo button may as well not have one.
    setView({ scale, x: 28, y: Math.max(92, (BAND_HEAD_H + 26) * scale) });
  }, [bounds, ui.layout]);

  // Frame it once, as soon as there's something to frame — and again whenever
  // the arrangement changes shape underneath the viewport.
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current || Object.keys(placed).length === 0) return;
    didFit.current = true;
    fitWidth();
  }, [placed, fitWidth]);

  const firstLayout = useRef(ui.layout);
  useEffect(() => {
    if (firstLayout.current === ui.layout) return;
    firstLayout.current = ui.layout;
    window.setTimeout(fitWidth, 0);
  }, [ui.layout, fitWidth]);

  // "Show me this one" — from the rail's search, or the inspector's links.
  const focusTick = ui.focus?.tick;
  useEffect(() => {
    if (!ui.focus) return;
    const a = anchor(ui.focus.id, "in");
    const rect = containerRef.current?.getBoundingClientRect();
    if (!a || !rect) return;
    setView((v) => ({
      ...v,
      x: rect.width / 2 - (a.x + CARD_W / 2) * v.scale,
      y: rect.height / 2 - a.y * v.scale,
    }));
    // `anchor` changes identity whenever the layout does; keying the effect on
    // the focus tick alone is what makes this fire once per request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTick]);

  /* ── background pan ── */

  const startPan = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    const start = { x: e.clientX, y: e.clientY };
    const origin = { x: view.x, y: view.y };
    let moved = false;
    const move = (ev: MouseEvent) => {
      if (Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) > 3) moved = true;
      setView((v) => ({ ...v, x: origin.x + (ev.clientX - start.x), y: origin.y + (ev.clientY - start.y) }));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      // A click on bare canvas lets go of everything — otherwise the last row
      // or ribbon you touched keeps the whole map dimmed around it, with no
      // obvious way out.
      if (!moved) {
        selectVariable(null);
        setOpenBundle(null);
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  /* ── card drag ── */

  const startCardDrag = (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const p = placed[collectionId];
    if (!p) return;
    const start = { x: e.clientX, y: e.clientY };
    const origin = { x: p.x, y: p.y };
    let next = drag;
    const move = (ev: MouseEvent) => {
      next = {
        ...next,
        [collectionId]: {
          x: origin.x + (ev.clientX - start.x) / view.scale,
          y: origin.y + (ev.clientY - start.y) / view.scale,
        },
      };
      setDrag(next);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      persistDrag(next);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  /* ── connecting ── */

  const applyPlan = useCallback(
    (providerId: string, consumerId: string) => {
      const plan = planConnection(
        graph,
        { primitives, semantics, components },
        providerId,
        consumerId,
        editModes
      );
      if (!plan.ok) {
        flash(plan.reason, false);
        return;
      }
      if (plan.kind === "token") {
        for (const m of plan.modes) setSemantic(m, plan.token, plan.value);
      } else {
        setComponentBinding(plan.componentId, plan.storageKey, plan.binding);
      }
      selectVariable(consumerId);
      flash(`Linked ${plan.label}`, true);
    },
    [graph, primitives, semantics, components, editModes, setSemantic, setComponentBinding, selectVariable, flash]
  );

  /**
   * Every row this connection could legally land on, worked out the moment it
   * starts rather than one row at a time under the cursor.
   *
   * Telling someone a drop was illegal *after* they've made it is the least
   * useful moment to tell them: the rule (a colour takes a colour, a primitive
   * holds literals, a link can't loop) is knowable up front, so the map lights
   * what will work and fades what won't while there's still time to aim.
   */
  const validTargets = useMemo(() => {
    if (!connecting) return null;
    const out = new Set<string>();
    for (const c of visible.collections) {
      for (const n of c.nodes) {
        if (n.id === connecting.from) continue;
        const provider = connecting.side === "out" ? connecting.from : n.id;
        const consumer = connecting.side === "out" ? n.id : connecting.from;
        if (planConnection(graph, { primitives, semantics, components }, provider, consumer, editModes).ok) {
          out.add(n.id);
        }
      }
    }
    return out;
  }, [connecting, visible.collections, graph, primitives, semantics, components, editModes]);

  /** The row under a pointer position, if any. */
  const nodeAt = (clientX: number, clientY: number): string | null => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    return el?.closest<HTMLElement>("[data-var-node]")?.dataset.varNode ?? null;
  };

  const finishConnect = useCallback(
    (from: string, side: "in" | "out", target: string | null) => {
      setConnecting(null);
      setDropTarget(null);
      if (!target || target === from) return;
      if (side === "out") applyPlan(from, target);
      else applyPlan(target, from);
    },
    [applyPlan]
  );

  /**
   * Start a link. Drag it onto a target, or simply let go — the wire stays on
   * the cursor and the next click drops it. Both gestures exist because both
   * get used: dragging is quicker between neighbours, and clicking is the only
   * one that survives having to scroll halfway down a lane on the way.
   */
  const startConnect = (e: React.MouseEvent, nodeId: string, side: "in" | "out") => {
    e.stopPropagation();
    e.preventDefault();
    setConnecting({ from: nodeId, side, at: toGraph(e.clientX, e.clientY), armed: false });
    setOpenBundle(null);

    const start = { x: e.clientX, y: e.clientY };
    let moved = false;

    // Checked per hovered row rather than against `validTargets`: that memo is
    // derived from `connecting`, which is still null in this render, so the
    // closure would capture an empty set and paint every legal drop red.
    const okFor = (target: string): boolean =>
      planConnection(
        graph,
        { primitives, semantics, components },
        side === "out" ? nodeId : target,
        side === "out" ? target : nodeId,
        editModes
      ).ok;

    const move = (ev: MouseEvent) => {
      if (Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) > 4) moved = true;
      setConnecting((c) => (c ? { ...c, at: toGraph(ev.clientX, ev.clientY) } : c));
      const target = nodeAt(ev.clientX, ev.clientY);
      setDropTarget(!target || target === nodeId ? null : { id: target, ok: okFor(target) });
    };

    const up = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      const target = nodeAt(ev.clientX, ev.clientY);
      // A click that never moved arms the link instead of cancelling it. The
      // handle sits inside its own row, so "still on the source" is the normal
      // reading of a plain click — not a self-link to be rejected.
      if (!moved && (!target || target === nodeId)) {
        setConnecting((c) => (c ? { ...c, armed: true } : c));
        return;
      }
      finishConnect(nodeId, side, target);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  // The armed half of the gesture: the wire follows the cursor until a click
  // lands it (or misses, which cancels — a click on nothing means "never mind").
  useEffect(() => {
    if (!connecting?.armed) return;
    const { from, side } = connecting;
    const move = (ev: MouseEvent) => {
      setConnecting((c) => (c && c.armed ? { ...c, at: toGraph(ev.clientX, ev.clientY) } : c));
      const target = nodeAt(ev.clientX, ev.clientY);
      setDropTarget(
        !target || target === from ? null : { id: target, ok: !!validTargets?.has(target) }
      );
    };
    const down = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      finishConnect(from, side, nodeAt(ev.clientX, ev.clientY));
    };
    window.addEventListener("mousemove", move);
    // Capture, so the click lands the link rather than starting a pan.
    window.addEventListener("mousedown", down, true);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down, true);
    };
  }, [connecting, validTargets, toGraph, finishConnect]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setConnecting(null);
      setDropTarget(null);
      setOpenBundle(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── unlink an edge ── */

  /**
   * Whether there's anything to cut. Every component property is wired to
   * something — most of them to the binding their schema ships with — and a
   * default has no stored value to remove, so offering to cut it would be a
   * button that does nothing. Those wires get moved, not cut.
   */
  const canUnlink = useCallback(
    (edge: VarEdge): boolean => {
      const consumer = graph.nodes[edge.to];
      if (!consumer) return false;
      return consumer.tier !== "usage" || !!consumer.usage?.overridden;
    },
    [graph.nodes]
  );

  const unlink = (edge: VarEdge) => {
    const consumer = graph.nodes[edge.to];
    if (!consumer) return;
    if (consumer.tier === "usage" && consumer.usage) {
      if (!consumer.usage.overridden) {
        flash(`${consumer.path} is on its default — point it somewhere else instead`, false);
        return;
      }
      clearComponentBinding(consumer.usage.componentId, consumer.usage.storageKey);
      flash(`${consumer.path} back on its default`, true);
      return;
    }
    const token = nodeTokenName(edge.to);
    if (!token) return;
    // Detach, don't blank: freeze the value it currently resolves to so the
    // system looks identical the instant after the link is cut. A kind with no
    // literal form (a weight, a family) has nothing to freeze to, so the link
    // stays rather than being replaced with a broken value.
    let frozen = false;
    for (const m of edge.modes) {
      const value = freezeTokenValue({ primitives, semantics }, m, token);
      if (value === null) continue;
      setSemantic(m, token, value);
      frozen = true;
    }
    flash(
      frozen
        ? `Detached ${token} — value kept as a literal`
        : `${token} has no literal form — point it somewhere else instead`,
      frozen
    );
  };

  const focusId = hovered ?? ui.selected;

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    window.setTimeout(() => setCopied((c) => (c === text ? null : c)), 1400);
  };

  /* ── edges, resolved to concrete geometry ── */

  const wires = useMemo(() => {
    const resolved = graph.edges
      .filter((e) => e.binding || ui.editMode === "all" || e.modes.includes(ui.editMode))
      .map((e) => {
        const a = anchor(e.from, "out");
        const b = anchor(e.to, "in");
        return a && b ? { e, a, b } : null;
      })
      .filter(Boolean) as Array<{ e: VarEdge; a: Point; b: Point }>;

    // A token whose modes point at different primitives has more than one wire
    // arriving at one row. Landing them on the same pixel turns both into
    // noise, so they're fanned a couple of pixels apart and arrive as a group.
    const arrivals: Record<string, number> = {};
    for (const r of resolved) arrivals[r.e.to] = (arrivals[r.e.to] ?? 0) + 1;
    const seen: Record<string, number> = {};

    return resolved.map(({ e, a, b: raw }) => {
      const n = arrivals[e.to];
      const i = (seen[e.to] = (seen[e.to] ?? -1) + 1);
      const b = n > 1 ? { x: raw.x, y: raw.y + (i - (n - 1) / 2) * 5 } : raw;
      return {
        edge: e,
        a,
        b,
        d: wirePath(a, b),
        mid: wireMid(a, b),
        // The tier of what this wire *carries* — a chain you trace changes
        // colour as it crosses lanes.
        tier: (graph.nodes[e.from]?.tier ?? "primitive") as VarTier,
      };
    });
  }, [graph.edges, graph.nodes, anchor, ui.editMode]);

  const wireById = useMemo(() => {
    const out: Record<string, (typeof wires)[number]> = {};
    for (const w of wires) out[w.edge.id] = w;
    return out;
  }, [wires]);

  /* ── the same edges, gathered into one ribbon per pair of sets ── */

  const bundles = useMemo(() => {
    const ribbons = bundleWires(
      wires.map((w) => ({ id: w.edge.id, from: w.edge.from, to: w.edge.to, a: w.a, b: w.b })),
      (nodeId) => visible.rowOf[nodeId]?.collectionId ?? null
    );
    const max = ribbons.reduce((m, r) => Math.max(m, r.count), 1);

    // Park the label where the ribbon is in the open. It's opaque, so one
    // sitting over a card would hide a row of real tokens to report a number
    // about the wires behind it — the worse of the two trades.
    const cards = Object.values(placed);
    const covered = (p: Point) =>
      cards.some((c) => p.x > c.x - 9 && p.x < c.x + CARD_W + 9 && p.y > c.y - 9 && p.y < c.y + c.h + 9);

    return ribbons.map((r) => {
      const clear = wireSamples(r.a, r.b).find((p) => !covered(p));
      return {
        ...r,
        width: bundleWidth(r.count, max),
        chip: clear ?? r.mid,
        chipClear: !!clear,
        // A ribbon wears the colour of the tier its values *come from*, which
        // is the one fact a summary can carry without being read.
        tier: (graph.collections.find((c) => c.id === r.from)?.tier ?? "primitive") as VarTier,
        fromLabel: graph.collections.find((c) => c.id === r.from)?.label ?? r.from,
        toLabel: graph.collections.find((c) => c.id === r.to)?.label ?? r.to,
      };
    });
  }, [wires, visible.rowOf, placed, graph.collections]);

  const bundleById = useMemo(() => {
    const out: Record<string, (typeof bundles)[number]> = {};
    for (const b of bundles) out[b.id] = b;
    return out;
  }, [bundles]);

  // A ribbon whose cards have been hidden (or whose links were all cut) has
  // nothing left to show — let go of it rather than leaving a stale popover.
  useEffect(() => {
    if (openBundle && !bundleById[openBundle]) setOpenBundle(null);
  }, [openBundle, bundleById]);

  /** The ribbon being read right now: opened by a click, or under the cursor. */
  const activeBundleId = openBundle ?? hoveredBundle;

  /* ── highlight ── */

  /**
   * What's currently "lit". A hovered row (or the selection) lights its whole
   * chain; a hovered card lights the union of its rows' chains, which is how a
   * collapsed card stays useful — you can still ask what it feeds without
   * expanding it. Taking a ribbon lights everything it carries, which is how a
   * summary opens back up into the wires it stands for.
   */
  const related = useMemo(() => {
    if (focusId && graph.nodes[focusId]) return relatedNodes(graph, focusId);
    if (activeBundleId && bundleById[activeBundleId]) {
      const { from, to } = bundleById[activeBundleId];
      const out = new Set<string>();
      for (const c of graph.collections) {
        if (c.id !== from && c.id !== to) continue;
        for (const n of c.nodes) out.add(n.id);
      }
      return out;
    }
    if (hoveredCard) {
      const card = graph.collections.find((c) => c.id === hoveredCard);
      if (!card) return null;
      const out = new Set<string>();
      for (const n of card.nodes) relatedNodes(graph, n.id).forEach((id) => out.add(id));
      return out;
    }
    return null;
  }, [focusId, activeBundleId, bundleById, hoveredCard, graph]);

  /** Wires the ribbon under the pointer stands for — drawn on top of it. */
  const bundleMembers = useMemo(
    () => new Set(activeBundleId ? (bundleById[activeBundleId]?.members ?? []) : []),
    [activeBundleId, bundleById]
  );

  const liveAnchor = connecting ? anchor(connecting.from, connecting.side === "out" ? "out" : "in") : null;
  const connectingNode = connecting ? graph.nodes[connecting.from] : undefined;

  const resetSession = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      window.setTimeout(() => setConfirmReset(false), 5000);
      return;
    }
    revertToCheckpoint();
    setConfirmReset(false);
    flash("Reset to how the file stood when you opened Variables — ⌘Z to bring it back", true);
  };

  const openRibbon = bundleById[openBundle ?? ""] ?? null;

  return (
    <div
      ref={containerRef}
      onMouseDown={startPan}
      className="canvas-dotted relative min-h-0 flex-1 overflow-hidden"
      style={{ cursor: connecting ? "crosshair" : "grab" }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
      >
        {/* ── tier plates, behind everything ── */}
        {bands.map((b) => {
          const meta = TIER_META[b.tier];
          // A set can be added to the two tiers you author. Primitives are
          // generated scales (the Colour and Shape steps own those) and the
          // usage lane is wiring you've already done elsewhere.
          const addKind =
            b.tier === "semantic" ? "semantic" : b.tier === "component" ? "component" : null;
          return (
            <div
              key={`band-${b.tier}`}
              className="pointer-events-none absolute rounded-2xl"
              style={{
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                background: tierColor(b.tier, 0.05),
                border: `1px solid ${tierColor(b.tier, 0.24)}`,
              }}
            >
              <div className="flex items-center gap-1.5 px-3.5 pt-2.5">
                <TierBadge tier={b.tier} size={15} />
                <span
                  className="text-[13px] font-extrabold leading-none tracking-tight"
                  style={{ color: tierColor(b.tier) }}
                >
                  {meta.plural}
                </span>
                <span className="font-mono text-[10px] leading-none text-fg-mute">{b.count}</span>
                {addKind ? (
                  // In the band's own header, in the band's own colour: the
                  // place you're already looking when you decide you want
                  // another set of this kind.
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => onNewSet(addKind)}
                    title={`Add a set of ${meta.plural.toLowerCase()}`}
                    className="pointer-events-auto ml-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold leading-none transition-colors"
                    style={{
                      color: tierColor(b.tier),
                      background: tierColor(b.tier, 0.14),
                      border: `1px solid ${tierColor(b.tier, 0.4)}`,
                    }}
                  >
                    <Plus size={11} />
                    New set
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}

        <svg
          width={bounds.w}
          height={bounds.h}
          className="absolute left-0 top-0"
          style={{ overflow: "visible" }}
        >
          {/* ── ribbons: one per pair of sets, under the wires they stand for ──
              This is what the map draws at rest. A ribbon's colour is the tier
              its values come from, its thickness is how many there are, its
              arrow is which way they travel, and clicking it opens the list. */}
          {linkView === "summary"
            ? bundles.map((r) => {
                const isOpen = openBundle === r.id;
                const isHovered = hoveredBundle === r.id;
                const isActive = isOpen || isHovered;
                // Once something else is lit, the ribbons step back — the chain
                // you're reading is drawn over them, out of them.
                const opacity = isActive ? 1 : related !== null ? 0.14 : 0.62;
                const stroke = isActive ? "rgb(var(--c-focus))" : tierColor(r.tier);
                const head = r.width * 0.9 + 2.4;
                return (
                  <g key={`bundle-${r.id}`}>
                    <path
                      d={r.d}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={isActive ? r.width + 1.4 : r.width}
                      strokeOpacity={opacity}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={`M ${r.b.x} ${r.b.y} L ${r.b.x - head * 1.5} ${r.b.y - head} L ${r.b.x - head * 1.5} ${r.b.y + head} Z`}
                      fill={stroke}
                      fillOpacity={opacity}
                    />
                    {/* Hit area, so the whole ribbon is grabbable at any width. */}
                    <path
                      d={r.d}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={Math.max(16, r.width + 10) * grabScale}
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onMouseEnter={() => setHoveredBundle(r.id)}
                      onMouseLeave={() => setHoveredBundle((h) => (h === r.id ? null : h))}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenBundle((o) => (o === r.id ? null : r.id));
                        selectVariable(null);
                      }}
                    />
                  </g>
                );
              })
            : null}

          {wires.map(({ edge, a, b, d, tier }) => {
            const inActiveBundle = bundleMembers.has(edge.id);
            const dim = related !== null && !(related.has(edge.from) && related.has(edge.to));
            const lit = inActiveBundle || (related !== null && !dim);
            const isHovered = hoveredEdge === edge.id;

            // In Summary, a wire that isn't part of what you're reading isn't
            // drawn at all — that's the whole bargain the ribbons buy.
            const hidden = !lit && !isHovered && linkView === "summary";

            // Its hit area normally stays anyway, so the map never becomes a
            // surface you can't grab a wire on. Summary is the exception twice
            // over. At rest, three hundred invisible hit areas blanketing the
            // canvas would flash single wires at every mouse movement and fight
            // the ribbons for the pointer — so the ribbons own the empty canvas
            // and a wire becomes grabbable once a card or row opens it.
            //
            // And a wire opened by pointing at the *ribbon* must stay ungrabbable
            // while the pointer is still on that ribbon: its hit area is drawn
            // over the ribbon's, so handing it the pointer would end the hover
            // that revealed it, which would take the wire away, which would give
            // the ribbon the pointer back — a loop that pins a core at 2fps.
            const grabbable =
              !connecting && (linkView === "all" || (!hidden && !hoveredBundle));

            const stroke = isHovered ? "rgb(var(--c-focus))" : tierColor(tier);
            const opacity = isHovered || lit ? 1 : related !== null ? 0.2 : 0.5;
            const width = isHovered || lit ? 2.2 : 1.2;

            // Dashes carry real information — that this alias doesn't hold in
            // every mode — but at rest they read as buzz rather than as a
            // legend. So they're spelled out where you can act on them: on the
            // lit chain, on hover, and whenever you've asked for All.
            const partial = !isEveryMode(edge, modeDefs.length);
            const dash = partial && (isHovered || lit || linkView === "all") ? "5 4" : undefined;

            return (
              <g key={edge.id}>
                {!hidden ? (
                  <>
                    {lit ? (
                      <path
                        d={d}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={7}
                        strokeOpacity={0.16}
                        strokeLinecap="round"
                      />
                    ) : null}
                    <path
                      d={d}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={width}
                      strokeOpacity={opacity}
                      strokeDasharray={dash}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Terminals. At rest a wire ends in a dot at each end —
                        enough to find where it lands without the visual weight
                        of three hundred arrowheads. Direction is already in the
                        layout; the arrow appears once the wire is the one
                        you're reading. */}
                    {isHovered || lit ? (
                      <path
                        d={`M ${b.x} ${b.y} L ${b.x - 6} ${b.y - 3.4} L ${b.x - 6} ${b.y + 3.4} Z`}
                        fill={stroke}
                        fillOpacity={opacity}
                      />
                    ) : (
                      <>
                        <circle cx={a.x} cy={a.y} r={1.7} fill={stroke} fillOpacity={opacity} />
                        <circle cx={b.x} cy={b.y} r={1.7} fill={stroke} fillOpacity={opacity} />
                      </>
                    )}
                  </>
                ) : null}
                {/* Fat invisible stroke: the actual hover target for unlinking. */}
                {grabbable ? (
                  <path
                    d={d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14 * grabScale}
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onMouseEnter={() => setHoveredEdge(edge.id)}
                    onMouseLeave={() => setHoveredEdge((h) => (h === edge.id ? null : h))}
                  />
                ) : null}
              </g>
            );
          })}

          {connecting && liveAnchor ? (
            <path
              d={
                connecting.side === "out"
                  ? wirePath(liveAnchor, connecting.at)
                  : wirePath(connecting.at, liveAnchor)
              }
              fill="none"
              stroke="rgb(var(--c-focus))"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          ) : null}
        </svg>

        {/* Ribbon labels. Counter-scaled against the viewport so they stay
            readable at 12% as well as at 200% — at a full zoom-out these are
            the whole map in twenty numbers. Each one is a button: it says which
            two sets it joins and how many links run between them, and opens
            the list of those links. */}
        {linkView === "summary"
          ? bundles
              // A ribbon with nowhere clear to sit keeps its label to itself
              // rather than stamping it over someone's tokens.
              .filter((r) => r.chipClear)
              .map((r) => {
                const isActive = openBundle === r.id || hoveredBundle === r.id;
                return (
                  <button
                    key={`count-${r.id}`}
                    type="button"
                    title={`${r.fromLabel} → ${r.toLabel} · ${r.count} ${r.count === 1 ? "link" : "links"} — click to list them`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseEnter={() => setHoveredBundle(r.id)}
                    onMouseLeave={() => setHoveredBundle((h) => (h === r.id ? null : h))}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenBundle((o) => (o === r.id ? null : r.id));
                      selectVariable(null);
                    }}
                    className={`absolute z-10 flex h-[17px] items-center gap-1 rounded-full border px-1.5 font-mono text-[9px] font-semibold leading-none tabular-nums shadow-sm transition-colors ${
                      isActive
                        ? "border-focus bg-focus text-white"
                        : "border-line bg-ink-raised text-fg-dim hover:border-line-strong hover:text-fg"
                    }`}
                    style={{
                      left: r.chip.x,
                      top: r.chip.y,
                      transform: `translate(-50%, -50%) scale(${Math.min(3, Math.max(0.7, 1 / view.scale))})`,
                      opacity: related !== null && !isActive ? 0.25 : 1,
                    }}
                  >
                    {!isActive ? (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: tierColor(r.tier) }}
                      />
                    ) : null}
                    {r.count}
                  </button>
                );
              })
          : null}

        {/* The opened ribbon, link by link. This is the answer to "it tells me
            there are five and then I can't find them" — every one is named,
            jumps to the variable, and can be cut from here. */}
        {openRibbon ? (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute z-30 w-[264px] overflow-hidden rounded-lg border border-line-strong bg-ink-raised shadow-2xl"
            style={{
              left: openRibbon.chip.x,
              top: openRibbon.chip.y + 12,
              transform: `translateX(-50%) scale(${Math.min(2.4, Math.max(0.7, 1 / view.scale))})`,
              transformOrigin: "top center",
            }}
          >
            <div className="flex items-center gap-1.5 border-b border-line px-2.5 py-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: tierColor(openRibbon.tier) }}
              />
              <p className="min-w-0 flex-1 truncate text-[11px] font-bold text-fg">
                {openRibbon.fromLabel} <span className="text-fg-mute">→</span> {openRibbon.toLabel}
              </p>
              <span className="shrink-0 font-mono text-[10px] text-fg-mute">
                {openRibbon.count}
              </span>
              <button
                type="button"
                onClick={() => setOpenBundle(null)}
                aria-label="Close"
                className="shrink-0 rounded p-0.5 text-fg-mute transition-colors hover:text-fg"
              >
                <X size={11} />
              </button>
            </div>
            <div className="max-h-[220px] overflow-y-auto py-0.5">
              {openRibbon.members.map((edgeId) => {
                const w = wireById[edgeId];
                if (!w) return null;
                const from = graph.nodes[w.edge.from];
                const to = graph.nodes[w.edge.to];
                if (!from || !to) return null;
                const partial = !isEveryMode(w.edge, modeDefs.length);
                return (
                  <div
                    key={edgeId}
                    onMouseEnter={() => setHoveredEdge(edgeId)}
                    onMouseLeave={() => setHoveredEdge((h) => (h === edgeId ? null : h))}
                    className="group/link flex items-center gap-1 px-1.5 py-1 transition-colors hover:bg-ink-hover"
                  >
                    <button
                      type="button"
                      onClick={() => selectVariable(to.id)}
                      title={`${to.path} follows ${from.path}`}
                      className="flex min-w-0 flex-1 items-center gap-1 text-left"
                    >
                      {/* Full paths, not row labels: "50 → surface-base" only
                          reads inside its own card, and this list is read
                          floating over the canvas. */}
                      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-fg-mute">
                        {from.path}
                      </span>
                      <span className="shrink-0 text-[9px] text-fg-mute">→</span>
                      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-fg-dim">
                        {to.path}
                      </span>
                    </button>
                    {partial ? (
                      <span
                        title={`Only in ${w.edge.modes
                          .map((m) => modeDefs.find((d) => d.id === m)?.name ?? m)
                          .join(", ")}`}
                        className="shrink-0 rounded border border-line px-1 font-mono text-[8px] leading-[13px] text-fg-mute"
                      >
                        {w.edge.modes.length}/{modeDefs.length}
                      </span>
                    ) : null}
                    {canUnlink(w.edge) ? (
                      <button
                        type="button"
                        title={`Detach ${to.path} from ${from.path}`}
                        onClick={() => unlink(w.edge)}
                        className="shrink-0 rounded p-0.5 text-fg-mute opacity-0 transition-opacity hover:text-red-400 group-hover/link:opacity-100"
                      >
                        <Unlink size={10} />
                      </button>
                    ) : (
                      // A property still on its schema default. Naming it says
                      // why there's no cut button here without leaving a dead
                      // one to click.
                      <span
                        title={`${to.path} is on the binding it ships with`}
                        className="shrink-0 px-0.5 text-[8px] font-semibold uppercase tracking-[0.06em] text-fg-mute opacity-0 transition-opacity group-hover/link:opacity-100"
                      >
                        default
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Unlink control, parked on the hovered wire's midpoint. */}
        {!connecting
          ? wires
              .filter((w) => w.edge.id === hoveredEdge && !openBundle && canUnlink(w.edge))
              .map(({ edge, mid }) => (
                <button
                  key={`cut-${edge.id}`}
                  type="button"
                  title={`Detach ${graph.nodes[edge.to]?.path ?? ""} from ${graph.nodes[edge.from]?.path ?? ""}`}
                  onMouseEnter={() => setHoveredEdge(edge.id)}
                  onMouseLeave={() => setHoveredEdge((h) => (h === edge.id ? null : h))}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => unlink(edge)}
                  className="absolute z-20 flex h-5 w-5 items-center justify-center rounded-full border border-line-strong bg-ink-raised text-fg-mute shadow transition-colors hover:border-red-500/60 hover:text-red-400"
                  style={{ left: mid.x - 10, top: mid.y - 10 }}
                >
                  <Unlink size={10} />
                </button>
              ))
          : null}

        {/* Cards */}
        {Object.values(placed).map((p) => {
          const c = p.collection;
          const accent = tierColor(c.tier);
          return (
            <div
              key={c.id}
              className={`group/card absolute rounded-lg bg-ink-raised shadow-xl ${p.collapsed ? "" : "pb-px"}`}
              style={{
                left: p.x,
                top: p.y,
                width: CARD_W,
                border: `1px solid ${tierColor(c.tier, 0.42)}`,
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseEnter={() => setHoveredCard(c.id)}
              onMouseLeave={() => setHoveredCard((h) => (h === c.id ? null : h))}
            >
              <header
                onMouseDown={(e) => startCardDrag(e, c.id)}
                onDoubleClick={() => setCollapsed(c.id, !p.collapsed)}
                title="Drag to move · double-click to fold"
                className={`flex h-[34px] cursor-grab items-center gap-1.5 px-2 active:cursor-grabbing ${
                  p.collapsed ? "rounded-lg" : "rounded-t-lg"
                }`}
                style={{
                  background: tierColor(c.tier, 0.12),
                  borderBottom: p.collapsed ? undefined : `1px solid ${tierColor(c.tier, 0.3)}`,
                }}
              >
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setCollapsed(c.id, !p.collapsed)}
                  title={
                    p.collapsed
                      ? `Unfold ${c.label}`
                      : `Fold ${c.label} — its connections gather onto the header`
                  }
                  aria-label={p.collapsed ? `Unfold ${c.label}` : `Fold ${c.label}`}
                  aria-expanded={!p.collapsed}
                  className="-ml-0.5 shrink-0 rounded p-0.5 text-fg-mute transition-colors hover:bg-ink-hover hover:text-fg"
                >
                  {p.collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                </button>
                <TierBadge tier={c.tier} size={14} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold leading-none text-fg">{c.label}</p>
                  {c.note && !p.collapsed ? (
                    <p
                      className="mt-0.5 truncate text-[8.5px] font-semibold uppercase tracking-[0.07em]"
                      style={{ color: accent }}
                    >
                      {c.note}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 font-mono text-[9px] text-fg-mute">{c.nodes.length}</span>
              </header>

              {(p.collapsed ? [] : c.nodes).map((node) => {
                const isSelected = ui.selected === node.id;
                const isDrop = dropTarget?.id === node.id;
                // While a link is in flight, the map answers "can this take it?"
                // for every row at once rather than one at a time under the
                // cursor: legal targets stay lit, the rest step out of the way.
                const illegal = !!validTargets && !validTargets.has(node.id) && node.id !== connecting?.from;
                const dim = illegal || (related !== null && !related.has(node.id));
                const issue = graph.issues.find((i) => i.nodeId === node.id);
                // A component property nobody has moved yet. It's a real wire —
                // it's what the component renders from — but it's the one the
                // schema chose, so it reads a shade back from the ones you did.
                const onDefault = node.tier === "usage" && node.usage?.overridden === false;
                return (
                  <div
                    key={node.id}
                    data-var-node={node.id}
                    onMouseEnter={() => setHovered(node.id)}
                    onMouseLeave={() => setHovered((h) => (h === node.id ? null : h))}
                    onClick={() => {
                      if (connecting) return; // the armed click lands the link
                      selectVariable(node.id);
                      setOpenBundle(null);
                    }}
                    style={{
                      height: ROW_H,
                      ...(isSelected && !isDrop
                        ? { background: tierColor(c.tier, 0.18), boxShadow: `inset 2px 0 0 ${accent}` }
                        : null),
                      ...(validTargets && !illegal && !isDrop
                        ? { boxShadow: `inset 2px 0 0 rgb(var(--c-focus) / 0.5)` }
                        : null),
                    }}
                    className={`group/row relative flex cursor-pointer items-center gap-1.5 border-b border-line/60 px-2 transition-colors last:border-b-0 ${
                      isDrop
                        ? dropTarget.ok
                          ? "bg-focus/25 ring-1 ring-inset ring-focus"
                          : "bg-red-500/15 ring-1 ring-inset ring-red-500/60"
                        : isSelected
                          ? ""
                          : "hover:bg-ink-hover"
                    } ${dim ? (illegal ? "opacity-20" : "opacity-30") : ""}`}
                  >
                    <RowMark node={node} mode={displayMode} />
                    <span
                      className={`min-w-0 flex-1 truncate font-mono text-[10px] leading-none ${
                        isSelected ? "text-fg" : onDefault ? "text-fg-mute" : "text-fg-dim"
                      }`}
                      title={onDefault ? `${node.path} — on its default binding` : node.path}
                    >
                      {node.label}
                    </span>
                    {issue ? (
                      <span
                        title={issue.message}
                        className="shrink-0 font-mono text-[9px] leading-none text-red-400"
                      >
                        !
                      </span>
                    ) : node.detail ? (
                      <span className="shrink-0 truncate font-mono text-[8.5px] leading-none text-fg-mute opacity-70 group-hover/row:opacity-0">
                        {node.detail}
                      </span>
                    ) : null}

                    <button
                      type="button"
                      title={`Copy ${node.ref}`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyRef(node.ref);
                      }}
                      className="absolute right-1.5 hidden rounded p-0.5 text-fg-mute hover:text-fg group-hover/row:block"
                    >
                      {copied === node.ref ? <Check size={9} /> : <Copy size={9} />}
                    </button>

                    {/* Link handles. The "in" handle only exists where an alias
                        can legally land — primitives hold literals. They show
                        for the whole card on hover, not just the one row under
                        the cursor, so you can see where a link starts before
                        you go looking for it. */}
                    {node.tier !== "primitive" ? (
                      <span
                        onMouseDown={(e) => startConnect(e, node.id, "in")}
                        title="Drag (or click, then click again) onto the variable this should follow"
                        className="absolute -left-[6px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 cursor-crosshair rounded-full border border-line-strong bg-ink opacity-0 transition-all hover:scale-125 hover:border-focus hover:bg-focus group-hover/card:opacity-60 group-hover/row:opacity-100"
                      />
                    ) : null}
                    {node.tier !== "usage" ? (
                      <span
                        onMouseDown={(e) => startConnect(e, node.id, "out")}
                        title="Drag (or click, then click again) onto a role, token or component property to point it here"
                        className="absolute -right-[6px] top-1/2 h-[11px] w-[11px] -translate-y-1/2 cursor-crosshair rounded-full border border-line-strong bg-ink opacity-0 transition-all hover:scale-125 hover:border-focus hover:bg-focus group-hover/card:opacity-60 group-hover/row:opacity-100"
                      />
                    ) : null}
                  </div>
                );
              })}

              {c.addTo && !p.collapsed ? (
                <div className="rounded-b-lg border-t border-line px-1.5 py-1">
                  {addingIn === c.id ? (
                    <input
                      autoFocus
                      placeholder="new token name…"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setAddingIn(null);
                        if (e.key === "Enter") {
                          const v = (e.target as HTMLInputElement).value.trim();
                          if (v && c.addTo) {
                            addRole(c.addTo.groupLabel, v);
                            flash(`Added ${v} to ${c.label}`, true);
                          }
                          setAddingIn(null);
                        }
                      }}
                      onBlur={() => setAddingIn(null)}
                      className="h-[18px] w-full rounded border border-line-strong bg-ink px-1.5 font-mono text-[9.5px] text-fg focus:outline-none"
                    />
                  ) : (
                    // Carries the card's own accent rather than sitting at the
                    // bottom in the same grey as the hairline above it — the
                    // one control on a card that *adds* something shouldn't be
                    // the hardest thing on it to see.
                    <button
                      type="button"
                      onClick={() => setAddingIn(c.id)}
                      title={`Add a variable to ${c.label}`}
                      className="flex h-[20px] w-full items-center justify-center gap-1 rounded text-[10px] font-bold transition-colors"
                      style={{ color: accent, background: tierColor(c.tier, 0.12) }}
                    >
                      <Plus size={10} />
                      New variable
                    </button>
                  )}
                </div>
              ) : c.tier === "primitive" && !p.collapsed ? (
                // The primitive tier's equivalent. A generated scale can't gain
                // a step from here — it gains one where it's generated — so the
                // card offers the trip rather than a control that would have to
                // lie about what it does.
                <PrimitiveCardFooter collection={c} accent={accent} tier={c.tier} />
              ) : null}
            </div>
          );
        })}
      </div>

      {/* ── history: undo, redo, and one way back to where you started ── */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute left-3 top-3 flex items-center gap-0.5 rounded-lg border border-line bg-ink-raised/95 p-1 shadow-lg backdrop-blur"
      >
        <ToolButton title="Undo (⌘Z)" onClick={undo} disabled={!canUndo}>
          <Undo2 size={13} />
        </ToolButton>
        <ToolButton title="Redo (⇧⌘Z)" onClick={redo} disabled={!canRedo}>
          <Redo2 size={13} />
        </ToolButton>
        <span className="mx-0.5 h-4 w-px bg-line" />
        <button
          type="button"
          onClick={resetSession}
          disabled={!dirty}
          title={
            dirty
              ? "Put every token back to how it stood when you opened Variables"
              : "Nothing to reset — the file is as you found it"
          }
          // The armed label is wider than the resting one; a fixed width keeps
          // the second click landing where the first one did.
          style={{ minWidth: 116 }}
          className={`inline-flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-30 ${
            confirmReset
              ? "bg-red-500/15 text-red-400"
              : "text-fg-mute enabled:hover:bg-ink-hover enabled:hover:text-fg"
          }`}
        >
          <RotateCcw size={12} />
          {confirmReset ? "Reset everything?" : "Reset this sitting"}
        </button>
      </div>

      {/* ── which mode is being edited, and how much wiring is drawn ── */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-line bg-ink-raised/95 p-1 shadow-lg backdrop-blur"
      >
        <label className="flex items-center gap-1 pl-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-fg-mute">
            Editing
          </span>
          <select
            value={ui.editMode}
            onChange={(e) => setEditMode(e.target.value)}
            title="Which mode a new link writes to — and which links the map draws"
            className="h-6 rounded border border-line bg-ink px-1 text-[10.5px] font-semibold text-fg-dim focus:border-line-strong focus:outline-none"
          >
            <option value="all">All modes</option>
            {modeDefs.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <span className="mx-0.5 h-4 w-px bg-line" />

        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-fg-mute">Links</span>
        {(
          [
            {
              id: "summary",
              label: "Summary",
              hint: "One ribbon per pair of sets, coloured by where its values come from and thick with how many there are. Click a ribbon to list its links; point at a card or row to see its own wires",
            },
            { id: "all", label: "All", hint: "Every link drawn separately — the whole weave at once" },
          ] as const
        ).map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setLinkView(d.id)}
            title={d.hint}
            className={`rounded px-1.5 py-1 text-[10.5px] font-semibold transition-colors ${
              linkView === d.id ? "bg-fg text-ink" : "text-fg-mute hover:bg-ink-hover hover:text-fg"
            }`}
          >
            {d.label}
          </button>
        ))}

        <span className="mx-0.5 h-4 w-px bg-line" />

        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-fg-mute">Layout</span>
        {(
          [
            {
              id: "lanes",
              label: "Lanes",
              Icon: Rows3,
              hint: "One column per tier — every set at a fixed place in a single list you scroll",
            },
            {
              id: "packed",
              label: "Packed",
              Icon: Columns3,
              hint: "Each tier wrapped into as many columns as it needs, so the whole system fits on screen without scrolling",
            },
          ] as const
        ).map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setLayout(d.id)}
            title={d.hint}
            aria-pressed={ui.layout === d.id}
            className={`inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10.5px] font-semibold transition-colors ${
              ui.layout === d.id ? "bg-fg text-ink" : "text-fg-mute hover:bg-ink-hover hover:text-fg"
            }`}
          >
            <d.Icon size={11} />
            {d.label}
          </button>
        ))}

        <span className="mx-0.5 h-4 w-px bg-line" />

        <ToolButton
          title={
            allFolded
              ? "Unfold every card"
              : "Fold every card to its header — the fastest way to see the shape of the system"
          }
          onClick={() => setCollapsedAll(Object.keys(placed), !allFolded)}
        >
          {allFolded ? <UnfoldVertical size={12} /> : <FoldVertical size={12} />}
        </ToolButton>
      </div>

      {/* ── create, from the map itself ── */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute bottom-3 left-1/2 -translate-x-1/2"
      >
        <button
          type="button"
          onClick={() => onNewSet()}
          title="Add a new set of variables — empty, or one of the ready-made ones"
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-raised/95 px-2.5 py-1.5 text-[11px] font-semibold text-fg-dim shadow-lg backdrop-blur transition-colors hover:border-line-strong hover:text-fg"
        >
          <Plus size={12} />
          New set of variables
        </button>
      </div>

      {/* ── viewport controls ── */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute bottom-3 left-3 flex items-center gap-0.5 rounded-lg border border-line bg-ink-raised/95 p-1 shadow-lg backdrop-blur"
      >
        <ToolButton title="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
          <Minus size={12} />
        </ToolButton>
        <span className="w-9 text-center font-mono text-[10px] tabular-nums text-fg-dim">
          {Math.round(view.scale * 100)}%
        </span>
        <ToolButton title="Zoom in" onClick={() => zoomBy(1.2)}>
          <Plus size={12} />
        </ToolButton>
        <span className="mx-0.5 h-4 w-px bg-line" />
        <ToolButton title="Fit every lane across the screen, from the top" onClick={fitWidth}>
          <Maximize size={12} />
        </ToolButton>
        <ToolButton
          title="Reset card layout — puts the cards back in their lanes (no tokens change)"
          onClick={() => {
            persistDrag({});
            window.setTimeout(fitWidth, 0);
          }}
        >
          <Focus size={12} />
        </ToolButton>
      </div>

      {/* ── legend: the tiers, and what a ribbon is ── */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute bottom-3 right-3 hidden max-w-[248px] rounded-lg border border-line bg-ink-raised/95 shadow-lg backdrop-blur lg:block"
      >
        <button
          type="button"
          onClick={toggleLegend}
          className="flex w-full items-center justify-between gap-3 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-fg-mute transition-colors hover:text-fg"
        >
          Key
          <span className="font-mono text-[10px] leading-none">{legendOpen ? "–" : "+"}</span>
        </button>
        {legendOpen ? (
          <div className="space-y-2 border-t border-line px-2.5 py-2">
            <div className="space-y-1">
              {TIER_ORDER.map((tier) => (
                <div key={tier} className="flex items-center gap-1.5">
                  <TierBadge tier={tier} size={12} />
                  <span className="text-[9.5px] text-fg-dim">{TIER_META[tier].plural}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 border-t border-line pt-1.5">
              {[
                { label: "A few links", w: 2.4 },
                { label: "Many links", w: 7 },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <svg width="24" height="10" className="shrink-0">
                    <line
                      x1="0"
                      y1="5"
                      x2="17"
                      y2="5"
                      stroke={tierColor("primitive")}
                      strokeWidth={l.w}
                      strokeLinecap="round"
                    />
                    <path d="M 24 5 L 17.5 1.9 L 17.5 8.1 Z" fill={tierColor("primitive")} />
                  </svg>
                  <span className="text-[9.5px] text-fg-mute">{l.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <svg width="24" height="10" className="shrink-0">
                  <line
                    x1="0"
                    y1="5"
                    x2="18"
                    y2="5"
                    stroke="rgb(var(--c-fg-dim))"
                    strokeWidth="1.6"
                    strokeDasharray="5 4"
                    strokeLinecap="round"
                  />
                  <path d="M 24 5 L 18 2.2 L 18 7.8 Z" fill="rgb(var(--c-fg-dim))" />
                </svg>
                <span className="text-[9.5px] text-fg-mute">Not in every mode</span>
              </div>
              <p className="pt-0.5 text-[9.5px] leading-snug text-fg-mute">
                A ribbon carries every link between two sets, in the colour of the tier those values
                come from. Click one to list them. Point at a card or a row to draw its own wires.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── a link in flight: what's happening, and how to stop ── */}
      {connecting ? (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-focus bg-ink-raised/95 px-3 py-1.5 text-[11px] shadow-lg backdrop-blur">
            <span className="text-fg">
              {connecting.side === "out" ? "Point something at " : "Point "}
              {/* The full path, not the row label: "400" only means something
                  while you're looking at the ramp it came from. */}
              <span className="font-mono font-semibold">{connectingNode?.path ?? ""}</span>
              {connecting.side === "out" ? "" : " at something"}
            </span>
            <span className="text-fg-mute">
              · {validTargets?.size ?? 0} can take it, the rest are faded ·
            </span>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                setConnecting(null);
                setDropTarget(null);
              }}
              className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-mute transition-colors hover:text-fg"
            >
              Esc
            </button>
          </div>
        </div>
      ) : null}

      {/* ── result of the last connection attempt ── */}
      {toast && !connecting ? (
        <div
          className={`absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-lg border px-3 py-1.5 text-[11px] shadow-lg backdrop-blur ${
            toast.ok
              ? "border-line-strong bg-ink-raised/95 text-fg"
              : "border-red-500/50 bg-ink-raised/95 text-red-400"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {toast.ok ? <Check size={11} /> : <X size={11} />}
            {toast.text}
          </span>
        </div>
      ) : null}

      {Object.keys(placed).length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="max-w-xs text-center text-[12px] leading-relaxed text-fg-mute">
            Every collection is hidden. Turn one back on in the Variables panel to the left.
          </p>
        </div>
      ) : null}
    </div>
  );
}
