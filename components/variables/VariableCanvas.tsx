"use client";

/**
 * The Variables map — an infinite canvas where every variable in the file is a
 * row, every alias is a wire, and both can be edited by hand.
 *
 * Reading it: value flows left to right through four banded lanes — primitives
 * → semantic roles → component tokens → the component properties that consume
 * them. Each lane is a plate with its own accent colour and its ordinal (1–4),
 * and every card and wire carries that accent, so "which tier is this" and
 * "where did this value come from" are answered before you read a label.
 *
 * Keeping it readable: a full system is several hundred aliases, and drawn at
 * full strength they are a hairball rather than a map. Two things fix that, and
 * both are the user's to set. Wires rest quietly and only light up along the
 * chain you point at (Wires: Calm — or All to see the whole weave, Focus to see
 * nothing else); and any card can be collapsed to its header, which gathers
 * every wire into or out of forty rows onto a single point.
 *
 * Wiring it: drag from a row's right-hand handle onto any row to its right and
 * the alias is written into the store (`setSemantic` for tokens,
 * `setComponentBinding` for component properties) — the same edits the Colour
 * step and the inspector make, so nothing here is a parallel source of truth.
 * Every one of those edits is undoable (⌘Z), and Reset returns the whole file
 * to how it stood when you opened the map.
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
  Spline,
  Undo2,
  Unlink,
  UnfoldVertical,
  Waypoints,
  X,
} from "lucide-react";
import {
  PreviewMode,
  VarWireDensity,
  docChanged,
  useDesignSystem,
} from "@/store/useDesignSystem";
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
  WireStyle,
  autoLayout,
  nodeTokenName,
  planConnection,
  relatedNodes,
  tierColor,
  wireMid,
  wirePath,
} from "@/lib/variableGraph";
import { resolveTokenValue } from "@/lib/tokens";
import { RowMark, TierBadge } from "@/components/variables/VariableBits";

// Low enough that "fit" really fits: a full system is ~2,400px of graph, and a
// canvas sharing the screen with two panels is a fifth of that. Labels are lost
// down here — the tier plates and their colours are what you navigate by.
const MIN_SCALE = 0.12;
const MAX_SCALE = 2.2;
const FOOT_H = 24;

/** A card's laid-out box, after user drags are applied over the auto-layout. */
interface Placed extends Point {
  collection: VarCollection;
  h: number;
  collapsed: boolean;
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

/* ────────────────────────── wire weights ────────────────────────── */

/**
 * How loud a wire is at rest, per density setting. "Calm" is the default and
 * the answer to the crowding: every wire is still drawn — nothing is hidden
 * from you — but quietly enough that the cards, the lanes and whatever you're
 * pointing at stay on top of it.
 */
const WIRE_REST: Record<VarWireDensity, { opacity: number; width: number } | null> = {
  full: { opacity: 0.8, width: 1.5 },
  calm: { opacity: 0.26, width: 1.1 },
  // Nothing at rest — only the chain under the cursor is drawn at all.
  focus: null,
};

/** How far an unrelated wire drops once something *is* focused. */
const WIRE_DIMMED: Record<VarWireDensity, number> = { full: 0.3, calm: 0.09, focus: 0 };

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
  /** Renders the button as the chosen one in a set — routing, mode, and so on. */
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

/* ────────────────────────── the canvas ────────────────────────── */

export function VariableCanvas({
  graph,
  onNewSet,
}: {
  graph: VariableGraph;
  /** Opens the create panel — shared with the table, and owned above both. */
  onNewSet: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeProjectId = useDesignSystem((s) => s.activeProjectId);
  const ui = useDesignSystem((s) => s.variablesUI);
  const selectVariable = useDesignSystem((s) => s.selectVariable);
  const setSemantic = useDesignSystem((s) => s.setSemantic);
  const setComponentBinding = useDesignSystem((s) => s.setComponentBinding);
  const clearComponentBinding = useDesignSystem((s) => s.clearComponentBinding);
  const addRole = useDesignSystem((s) => s.addRole);
  const setWireStyle = useDesignSystem((s) => s.setVariableWireStyle);
  const setWireDensity = useDesignSystem((s) => s.setVariableWireDensity);
  const toggleCollapsed = useDesignSystem((s) => s.toggleVariableCollapsed);
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
  const [connecting, setConnecting] = useState<{
    from: string;
    side: "in" | "out";
    at: Point;
  } | null>(null);
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

  const wireStyle: WireStyle = ui.wireStyle;
  const density = ui.wireDensity;
  const collapsed = useMemo(() => new Set(ui.collapsed), [ui.collapsed]);

  /* ── which mode(s) an edit writes ── */
  const editModes: PreviewMode[] = ui.editMode === "both" ? ["light", "dark"] : [ui.editMode];
  const displayMode: PreviewMode = ui.editMode === "dark" ? "dark" : "light";

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
    () => autoLayout(visible.collections, collapsed),
    [visible.collections, collapsed]
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
        h: isCollapsed ? CARD_HEAD_H : CARD_HEAD_H + c.nodes.length * ROW_H + (c.addTo ? FOOT_H : 6),
        collapsed: isCollapsed,
      };
    }
    return out;
  }, [visible.collections, auto, drag, collapsed]);

  /**
   * The four plates, measured from where the cards actually are — so a band
   * still wraps its cards after they've been dragged, and all four run to the
   * same depth like lanes of one diagram.
   */
  const bands = useMemo(() => {
    const out: Array<{ tier: VarTier; x: number; y: number; w: number; h: number; count: number }> = [];
    let floor = 0;
    for (const tier of TIER_ORDER) {
      const cards = Object.values(placed).filter((p) => p.collection.tier === tier);
      if (cards.length === 0) continue;
      const x = Math.min(...cards.map((p) => p.x)) - BAND_PAD;
      const y = Math.min(...cards.map((p) => p.y)) - BAND_HEAD_H;
      const right = Math.max(...cards.map((p) => p.x + CARD_W)) + BAND_PAD;
      const bottom = Math.max(...cards.map((p) => p.y + p.h)) + BAND_PAD;
      floor = Math.max(floor, bottom);
      out.push({
        tier,
        x,
        y,
        w: right - x,
        h: bottom - y,
        count: cards.reduce((s, p) => s + p.collection.nodes.length, 0),
      });
    }
    for (const b of out) b.h = Math.max(b.h, floor - b.y);
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

  const storageKey = activeProjectId ? `arkitype-varmap-${activeProjectId}` : null;
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

  const fit = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // The band headers live above y = 0, so the fit has to allow for them.
    const top = BAND_HEAD_H + 12;
    const scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, Math.min((rect.width - 64) / bounds.w, (rect.height - 96) / (bounds.h + top)))
    );
    setView({
      scale,
      x: (rect.width - bounds.w * scale) / 2,
      y: Math.max(24, (rect.height - bounds.h * scale) / 2) + top * scale,
    });
  }, [bounds]);

  // Fit once, as soon as there's something to fit to.
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current || Object.keys(placed).length === 0) return;
    didFit.current = true;
    fit();
  }, [placed, fit]);

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
      // A click on bare canvas clears the selection — otherwise the last row
      // you touched keeps the whole map dimmed around its chain, with no
      // obvious way to let go of it.
      if (!moved) selectVariable(null);
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

  /* ── drag to connect ── */

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
    // editModes is derived from ui.editMode each render; listing that is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph, primitives, semantics, components, ui.editMode, setSemantic, setComponentBinding, selectVariable, flash]
  );

  const startConnect = (e: React.MouseEvent, nodeId: string, side: "in" | "out") => {
    e.stopPropagation();
    e.preventDefault();
    setConnecting({ from: nodeId, side, at: toGraph(e.clientX, e.clientY) });

    const move = (ev: MouseEvent) => {
      setConnecting((c) => (c ? { ...c, at: toGraph(ev.clientX, ev.clientY) } : c));
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const target = el?.closest<HTMLElement>("[data-var-node]")?.dataset.varNode ?? null;
      if (!target || target === nodeId) {
        setDropTarget(null);
        return;
      }
      const provider = side === "out" ? nodeId : target;
      const consumer = side === "out" ? target : nodeId;
      const plan = planConnection(graph, { primitives, semantics, components }, provider, consumer, editModes);
      setDropTarget({ id: target, ok: plan.ok });
    };

    const up = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      const el = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null;
      const target = el?.closest<HTMLElement>("[data-var-node]")?.dataset.varNode ?? null;
      setConnecting(null);
      setDropTarget(null);
      if (!target || target === nodeId) return;
      if (side === "out") applyPlan(nodeId, target);
      else applyPlan(target, nodeId);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConnecting(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── unlink an edge ── */

  const unlink = (edge: VarEdge) => {
    const consumer = graph.nodes[edge.to];
    if (!consumer) return;
    if (consumer.tier === "usage" && consumer.usage) {
      clearComponentBinding(consumer.usage.componentId, consumer.usage.storageKey);
      flash(`Unbound ${consumer.path}`, true);
      return;
    }
    const token = nodeTokenName(edge.to);
    if (!token) return;
    // Detach, don't blank: freeze the colour it currently resolves to so the
    // system looks identical the instant after the wire is cut.
    const modes: PreviewMode[] = edge.mode === "both" ? ["light", "dark"] : [edge.mode as PreviewMode];
    for (const m of modes) {
      setSemantic(m, token, resolveTokenValue({ primitives, semantics }, m, semantics.modes[m][token] ?? ""));
    }
    flash(`Detached ${token} — value kept as a literal`, true);
  };

  /* ── highlight ── */

  const focusId = hovered ?? ui.selected;

  /**
   * What's currently "lit". A hovered row (or the selection) lights its whole
   * chain; a hovered card lights the union of its rows' chains, which is how a
   * collapsed card stays useful — you can still ask what it feeds without
   * expanding it.
   */
  const related = useMemo(() => {
    if (focusId && graph.nodes[focusId]) return relatedNodes(graph, focusId);
    if (hoveredCard) {
      const card = graph.collections.find((c) => c.id === hoveredCard);
      if (!card) return null;
      const out = new Set<string>();
      for (const n of card.nodes) relatedNodes(graph, n.id).forEach((id) => out.add(id));
      return out;
    }
    return null;
  }, [focusId, hoveredCard, graph]);

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    window.setTimeout(() => setCopied((c) => (c === text ? null : c)), 1400);
  };

  /* ── edges, resolved to concrete geometry ── */

  const wires = useMemo(() => {
    const resolved = graph.edges
      .filter((e) => {
        if (e.mode === "binding") return true;
        if (ui.editMode === "both") return true;
        return e.mode === "both" || e.mode === ui.editMode;
      })
      .map((e) => {
        const a = anchor(e.from, "out");
        const b = anchor(e.to, "in");
        return a && b ? { e, a, b } : null;
      })
      .filter(Boolean) as Array<{ e: VarEdge; a: Point; b: Point }>;

    // A token whose light and dark values point at different primitives has two
    // wires arriving at one row. Landing them on the same pixel turns both into
    // noise, so they're fanned a couple of pixels apart and arrive as a pair.
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
        d: wirePath(a, b, wireStyle),
        mid: wireMid(a, b, wireStyle),
        // A wire is painted in the tier of what it *carries*, so a glance at
        // its colour says where the value came from.
        tier: (graph.nodes[e.from]?.tier ?? "primitive") as VarTier,
      };
    });
  }, [graph.edges, graph.nodes, anchor, ui.editMode, wireStyle]);

  const liveAnchor = connecting ? anchor(connecting.from, connecting.side === "out" ? "out" : "in") : null;

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
                <span className="ml-1 truncate text-[10px] leading-none text-fg-mute">{meta.blurb}</span>
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
          {wires.map(({ edge, a, b, d, tier }) => {
            const dim = related !== null && !(related.has(edge.from) && related.has(edge.to));
            const lit = related !== null && !dim;
            const isHovered = hoveredEdge === edge.id;
            const rest = WIRE_REST[density];

            // In Focus, a wire that isn't part of what you're pointing at isn't
            // drawn at all — but its hit area stays below, so the map never
            // becomes a surface you can't grab a wire on.
            const hidden = !lit && !isHovered && rest === null;

            const stroke = isHovered ? "rgb(var(--c-focus))" : tierColor(tier);
            const opacity = isHovered
              ? 1
              : lit
                ? 1
                : related !== null
                  ? WIRE_DIMMED[density]
                  : (rest?.opacity ?? 0);
            const width = isHovered || lit ? 2.2 : (rest?.width ?? 1.1);

            // Dashes carry real information — which mode this alias applies to —
            // but at rest, at this density, they read as buzz rather than as a
            // legend. So they're spelled out exactly where you can act on them:
            // on the lit chain, on hover, and whenever you've asked for All.
            const spellOutMode = isHovered || lit || density === "full";
            const dash = !spellOutMode
              ? undefined
              : edge.mode === "light"
                ? "9 5"
                : edge.mode === "dark"
                  ? "2 4"
                  : edge.mode === "binding"
                    ? "1 4"
                    : undefined;

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
                        layout; the arrow only appears once the wire is the one
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
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ pointerEvents: "stroke", cursor: "pointer" }}
                  onMouseEnter={() => setHoveredEdge(edge.id)}
                  onMouseLeave={() => setHoveredEdge((h) => (h === edge.id ? null : h))}
                />
              </g>
            );
          })}

          {connecting && liveAnchor ? (
            <path
              d={
                connecting.side === "out"
                  ? wirePath(liveAnchor, connecting.at, wireStyle)
                  : wirePath(connecting.at, liveAnchor, wireStyle)
              }
              fill="none"
              stroke="rgb(var(--c-focus))"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
          ) : null}
        </svg>

        {/* Unlink control, parked on the hovered wire's midpoint. */}
        {wires
          .filter((w) => w.edge.id === hoveredEdge)
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
          ))}

        {/* Cards */}
        {Object.values(placed).map((p) => {
          const c = p.collection;
          const accent = tierColor(c.tier);
          return (
            <div
              key={c.id}
              className={`absolute rounded-lg bg-ink-raised shadow-xl ${p.collapsed ? "" : "pb-px"}`}
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
                onDoubleClick={() => toggleCollapsed(c.id)}
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
                  onClick={() => toggleCollapsed(c.id)}
                  title={
                    p.collapsed
                      ? `Unfold ${c.label}`
                      : `Fold ${c.label} — its wires gather onto the header`
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
                const dim = related !== null && !related.has(node.id);
                const issue = graph.issues.find((i) => i.nodeId === node.id);
                return (
                  <div
                    key={node.id}
                    data-var-node={node.id}
                    onMouseEnter={() => setHovered(node.id)}
                    onMouseLeave={() => setHovered((h) => (h === node.id ? null : h))}
                    onClick={() => selectVariable(node.id)}
                    style={{
                      height: ROW_H,
                      ...(isSelected && !isDrop
                        ? { background: tierColor(c.tier, 0.18), boxShadow: `inset 2px 0 0 ${accent}` }
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
                    } ${dim ? "opacity-30" : ""}`}
                  >
                    <RowMark node={node} mode={displayMode} />
                    <span
                      className={`min-w-0 flex-1 truncate font-mono text-[10px] leading-none ${
                        isSelected ? "text-fg" : "text-fg-dim"
                      }`}
                      title={node.path}
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

                    {/* Wire handles. The "in" handle only exists where an alias
                        can legally land — primitives hold literals. */}
                    {node.tier !== "primitive" ? (
                      <span
                        onMouseDown={(e) => startConnect(e, node.id, "in")}
                        title="Drag to the variable this should follow"
                        className="absolute -left-[5px] top-1/2 h-[9px] w-[9px] -translate-y-1/2 cursor-crosshair rounded-full border border-line-strong bg-ink opacity-0 transition-opacity hover:border-focus hover:bg-focus group-hover/row:opacity-100"
                      />
                    ) : null}
                    {node.tier !== "usage" ? (
                      <span
                        onMouseDown={(e) => startConnect(e, node.id, "out")}
                        title="Drag onto a role, token or component property to alias it here"
                        className="absolute -right-[5px] top-1/2 h-[9px] w-[9px] -translate-y-1/2 cursor-crosshair rounded-full border border-line-strong bg-ink opacity-0 transition-opacity hover:border-focus hover:bg-focus group-hover/row:opacity-100"
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
                    <button
                      type="button"
                      onClick={() => setAddingIn(c.id)}
                      className="flex h-[18px] w-full items-center justify-center gap-1 rounded text-[9.5px] text-fg-mute transition-colors hover:bg-ink-hover hover:text-fg"
                    >
                      <Plus size={9} />
                      New variable
                    </button>
                  )}
                </div>
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

      {/* ── how much wiring is drawn, and how it's routed ── */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute right-3 top-3 flex items-center gap-1 rounded-lg border border-line bg-ink-raised/95 p-1 shadow-lg backdrop-blur"
      >
        <span className="pl-1 text-[9px] font-bold uppercase tracking-[0.08em] text-fg-mute">
          Wires
        </span>
        {(
          [
            { id: "full", label: "All", hint: "Every wire at full strength — the whole weave at once" },
            { id: "calm", label: "Calm", hint: "Every wire, hushed — chains light up as you point at them" },
            { id: "focus", label: "Focus", hint: "Only the chain you're pointing at is drawn" },
          ] as const
        ).map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setWireDensity(d.id)}
            title={d.hint}
            className={`rounded px-1.5 py-1 text-[10.5px] font-semibold transition-colors ${
              density === d.id ? "bg-fg text-ink" : "text-fg-mute hover:bg-ink-hover hover:text-fg"
            }`}
          >
            {d.label}
          </button>
        ))}

        <span className="mx-0.5 h-4 w-px bg-line" />

        {(
          [
            { id: "stepped", label: "Elbow", icon: Waypoints, hint: "Right-angle wires that share a trunk — easiest to trace" },
            { id: "curved", label: "Curve", icon: Spline, hint: "Free curves — easier when two cards nearly overlap" },
          ] as const
        ).map((s) => (
          <ToolButton key={s.id} title={s.hint} onClick={() => setWireStyle(s.id)} active={wireStyle === s.id}>
            <s.icon size={12} />
          </ToolButton>
        ))}

        <span className="mx-0.5 h-4 w-px bg-line" />

        <ToolButton
          title={
            allFolded
              ? "Unfold every card"
              : "Fold every card to its header — the fastest way to see the shape of the system"
          }
          onClick={() => setCollapsedAll(allFolded ? [] : Object.keys(placed))}
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
          onClick={onNewSet}
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
        <ToolButton title="Fit to view" onClick={fit}>
          <Maximize size={12} />
        </ToolButton>
        <ToolButton
          title="Reset card layout — puts the cards back on their lanes (no tokens change)"
          onClick={() => {
            persistDrag({});
            window.setTimeout(fit, 0);
          }}
        >
          <Focus size={12} />
        </ToolButton>
      </div>

      {/* ── legend: the tiers, then what a wire's dashes mean ── */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute bottom-3 right-3 hidden max-w-[240px] rounded-lg border border-line bg-ink-raised/95 shadow-lg backdrop-blur lg:block"
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
                { label: "Both modes", dash: undefined },
                { label: "Light only", dash: "9 5" },
                { label: "Dark only", dash: "2 4" },
                { label: "Component binding", dash: "1 4" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <svg width="24" height="8" className="shrink-0">
                    <line
                      x1="0"
                      y1="4"
                      x2="18"
                      y2="4"
                      stroke="rgb(var(--c-fg-dim))"
                      strokeWidth="1.5"
                      strokeDasharray={l.dash}
                      strokeLinecap="round"
                    />
                    <path d="M 24 4 L 18 1.4 L 18 6.6 Z" fill="rgb(var(--c-fg-dim))" />
                  </svg>
                  <span className="text-[9.5px] text-fg-mute">{l.label}</span>
                </div>
              ))}
              <p className="pt-0.5 text-[9.5px] leading-snug text-fg-mute">
                A wire is painted in the tier of the value it carries. Point at a row or a card and
                its chain lights up — that&apos;s when the arrow and the dashes above appear.
              </p>
              <p className="text-[9.5px] leading-snug text-fg-mute">
                Too busy? Fold a card with its chevron, or drop Wires to Focus.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── result of the last connection attempt ── */}
      {toast ? (
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
