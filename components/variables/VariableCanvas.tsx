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
 * Reading the wiring: **All** is the default, and what makes that survivable is
 * what it declines to draw. Three quarters of a stock file's aliases are
 * component properties sitting on the binding their schema shipped with — four
 * hundred wires nobody authored, every one of them crossing the whole canvas to
 * land on a folded card. Those are off at rest (`showDefaultWires`) and come
 * back the instant you point at the card, select a role that feeds them, or
 * press the toggle in the band's own header. Every row stays either way: the
 * inventory is never the thing being hidden, only the ink.
 *
 * What's left is contrast rather than subtraction — pick a variable and its
 * chain goes opaque and thick while everything else drops to a twelfth, so one
 * chain is legible *through* a hundred others. **Summary** trades the
 * individual wires for one ribbon per pair of sets, openable into its list;
 * **Selected** draws nothing at all until you pick something.
 *
 * Picking is sticky, and there are three things to pick. A click pins a row, a
 * whole card, or a single wire, and *nothing* takes that away — not crossing
 * forty rows on your way to the scroll bar, not pointing at a card to compare.
 * Hover only previews while nothing is pinned, and the pill at the top of the
 * canvas says what's held and lets go of it.
 *
 * A held wire is the narrowest of the three on purpose: it lights its own two
 * variables and drops everything else back, including the cards those two sit
 * on. That's the question a link is picked to answer — *which two rows does
 * this one join* — and it's what makes its Detach button findable, which is
 * the other half of why you'd pick it. It stays put where the hover version
 * lasted as long as a pointer could hold a 14px band.
 *
 * Wires route curved by default and elbow on request — see `VarWireStyle`.
 * Neither is right for every file, which is why it's a control.
 *
 * Wiring it: grab a row's handle and either drag onto a target or let go and
 * click one — both work, and while you're connecting every row that *can*
 * legally take the link stays lit while the rest fade, so a drop is never a
 * guess. Every edit lands in the store the Colour and Components steps write to
 * (`setSemantic`, `setComponentBinding`), is undoable (⌘Z), and Reset returns
 * the file to how it stood when you opened Variables.
 *
 * The canvas holds no token state of its own. It owns exactly two things:
 * how far each card has been nudged off its slot (per project *and*
 * arrangement, in localStorage — a view preference, not part of the design
 * system) and where the viewport is.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  CornerDownRight,
  Eye,
  EyeOff,
  Focus,
  FoldVertical,
  Maximize,
  Minus,
  Pin,
  Plus,
  Redo2,
  RotateCcw,
  SlidersHorizontal,
  Spline,
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
  LaneSpan,
  Point,
  ROW_H,
  TIER_META,
  TIER_ORDER,
  VarCollection,
  VarEdge,
  VarNode,
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
  /** Sitting off its slot because someone dragged it there. */
  nudged: boolean;
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

/** What the map is holding, for the pill that names it and lets go of it. */
type Held =
  | { kind: "variable"; label: string }
  | { kind: "set"; label: string }
  | { kind: "link"; edge: VarEdge; from: VarNode; to: VarNode };

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
 * A control in a band's own header, in the band's own colour.
 *
 * Every one of these says what its lane is currently *not* showing you and
 * undoes it in a press. That's the whole contract behind a map calm enough to
 * read: nothing is quietly left out — it's left out, named, and one click from
 * coming back, where you're already looking when you notice it's missing.
 */
function BandToggle({
  tier,
  onClick,
  title,
  icon,
  label,
  active,
}: {
  tier: VarTier;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className="pointer-events-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none transition-colors"
      style={{
        color: tierColor(tier),
        background: tierColor(tier, active ? 0.2 : 0.1),
        border: `1px solid ${tierColor(tier, active ? 0.5 : 0.26)}`,
      }}
    >
      {icon}
      {label}
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
  const setWireStyle = useDesignSystem((s) => s.setVariableWireStyle);
  const setLayout = useDesignSystem((s) => s.setVariableLayout);
  const setEditMode = useDesignSystem((s) => s.setVariableEditMode);
  const setShowDefaultWires = useDesignSystem((s) => s.setVariablesShowDefaultWires);
  const setConnectedOnly = useDesignSystem((s) => s.setVariablesConnectedOnly);
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
  const sceneRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  /**
   * How far each card has been nudged *off its own slot* — never where it sits.
   *
   * Storing the absolute point is what made switching arrangements ugly: a card
   * parked at (2144, 291) because that was a sensible spot among the lanes is
   * nowhere in particular once the same band is wrapped into five columns, and
   * it would sit there anyway, on top of whatever the packer had put there. An
   * offset travels with its slot, so a nudge means the same thing in both
   * arrangements and a card can only ever collide with something you dragged it
   * onto yourself.
   */
  const [nudge, setNudge] = useState<Record<string, Point>>({});
  const [hovered, setHovered] = useState<string | null>(null);
  /** Pointing at a card lights everything it touches — the collapsed-card case. */
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  /**
   * A whole card, held. The row-level equivalent is `ui.selected`, which is
   * shared with the rail, the table and the inspector; this one is the map's
   * own, because "show me everything Button touches" is a question only the map
   * can answer and only the map has a place to put the answer.
   */
  const [pinnedCard, setPinnedCard] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  /**
   * One wire, held — the same bargain as a pinned row or card, made for the
   * thing between them.
   *
   * A wire was the one object on the map you could only ever *hover*: its two
   * ends and its cut button existed for exactly as long as the pointer stayed
   * inside a 14px band, which on a canvas carrying three hundred of them meant
   * the answer moved every time you did. Holding one keeps the wire lit, keeps
   * the two variables it joins lit, and keeps its Detach button where you can
   * reach it — and drops everything else back, because a link is the one
   * selection where "which two rows" is the entire question.
   */
  const [pinnedEdge, setPinnedEdge] = useState<string | null>(null);
  /** Pointing at a ribbon previews the wires it stands for. */
  const [hoveredBundle, setHoveredBundle] = useState<string | null>(null);
  /** Clicking one opens it: the ribbon stays lit and lists its links. */
  const [openBundle, setOpenBundle] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<Connecting | null>(null);
  // Read by the Escape handler, which is bound once and must not be re-bound
  // sixty times a second as the loose end of a link follows the cursor.
  const connectingRef = useRef<Connecting | null>(null);
  connectingRef.current = connecting;
  const [dropTarget, setDropTarget] = useState<{ id: string; ok: boolean } | null>(null);
  const [toast, setToast] = useState<{
    text: string;
    ok: boolean;
    /** An offer attached to the result — "…and in the other modes too". */
    action?: { label: string; run: () => void };
  } | null>(null);
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

  const flash = useCallback(
    (text: string, ok: boolean, action?: { label: string; run: () => void }) => {
      setToast({ text, ok, action });
      // An offer needs long enough to be read and taken; a bare result doesn't.
      window.setTimeout(
        () => setToast((t) => (t?.text === text ? null : t)),
        action ? 6000 : 2600
      );
    },
    []
  );

  const linkView = ui.links;
  const wireStyle = ui.wireStyle;

  /**
   * Whether pointing at something previews its chain. Summary and All are
   * already drawing every wire, so lighting one costs a re-render and nothing
   * else. Selected view is built on drawing none, and a preview that fires per
   * 22px row would put the cost straight back — so there, the selection is the
   * only thing that draws.
   */
  const previews = linkView !== "selected";

  // Leaving a view behind means letting go of what only that view could have
  // set — otherwise a ribbon opened in Summary keeps a popover floating over
  // a canvas that no longer draws ribbons.
  useEffect(() => {
    if (previews) return;
    setHovered(null);
    setHoveredCard(null);
    setHoveredBundle(null);
    setOpenBundle(null);
  }, [previews]);

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
    // "Referenced" is read off the whole graph, not off the wires currently
    // drawn: a ramp step is in use whether or not this view happens to be
    // showing the wire that uses it.
    const referenced = new Set(graph.edges.map((e) => e.from));
    let hiddenPrimitives = 0;
    const collections = graph.collections
      .filter((c) => ui.tiers[c.tier] && !ui.hiddenCollections.includes(c.id))
      .map((c) => {
        if (!ui.connectedOnly || c.tier !== "primitive") return c;
        const nodes = c.nodes.filter((n) => referenced.has(n.id));
        hiddenPrimitives += c.nodes.length - nodes.length;
        // A scale with nothing pointing at it yet keeps its card and folds to
        // its name. Dropping it outright is how "hide the unused ramp steps"
        // quietly became "your file has no Motion scale" — a tidy-up that
        // removes a whole scale from the inventory has overstepped.
        if (nodes.length === 0) return { ...c, defaultCollapsed: true, unreferenced: true };
        return { ...c, nodes };
      })
      .filter((c) => c.nodes.length > 0);

    const rowOf: Record<string, { collectionId: string; index: number }> = {};
    collections.forEach((c) =>
      c.nodes.forEach((n, i) => {
        rowOf[n.id] = { collectionId: c.id, index: i };
      })
    );
    return { collections, rowOf, hiddenPrimitives };
  }, [graph, ui.tiers, ui.hiddenCollections, ui.connectedOnly]);

  /**
   * How much of the component-properties lane is your own work. The band header
   * reports both numbers, because "376 properties, 2 of them wired by you" is
   * the sentence that explains why the lane is quiet — a lane that just *looked*
   * unwired would be a lie about a file with four hundred live bindings in it.
   */
  const usageStats = useMemo(() => {
    let total = 0;
    let authored = 0;
    for (const c of visible.collections) {
      if (c.tier !== "usage") continue;
      for (const n of c.nodes) {
        total += 1;
        if (n.usage?.overridden) authored += 1;
      }
    }
    return { total, authored };
  }, [visible.collections]);

  /* ── card placement: auto-layout, then user drags on top ── */

  /**
   * The canvas's own shape, for Packed to fold itself to — quantised to
   * quarters so that dragging the inspector a few pixels wider can't re-flow
   * every card on the map while you're looking at it.
   */
  const [aspect, setAspect] = useState(1.6);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      setAspect(Math.round((r.width / r.height) * 4) / 4);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const auto = useMemo(
    () => autoLayout(visible.collections, collapsed, ui.layout, aspect),
    [visible.collections, collapsed, ui.layout, aspect]
  );

  const placed = useMemo(() => {
    const out: Record<string, Placed> = {};
    for (const c of visible.collections) {
      const box = auto.boxes[c.id];
      if (!box) continue;
      const off = nudge[c.id];
      const isCollapsed = collapsed.has(c.id);
      out[c.id] = {
        collection: c,
        x: box.x + (off?.x ?? 0),
        y: box.y + (off?.y ?? 0),
        h: isCollapsed
          ? CARD_HEAD_H
          : CARD_HEAD_H + c.nodes.length * ROW_H + (hasCardFooter(c) ? FOOT_H : 6),
        collapsed: isCollapsed,
        // A pixel isn't a move. Anything smaller than this is either rounding
        // or a stored offset from before drags had a threshold.
        nudged: !!off && Math.abs(off.x) + Math.abs(off.y) > 2,
      };
    }
    return out;
  }, [visible.collections, auto, nudge, collapsed]);

  /**
   * The four plates.
   *
   * Across, a plate is its lane's own territory — decided by the arrangement,
   * so two bands can never grow into each other. They used to be measured from
   * live card positions, which meant one card dragged a lane to the left slid
   * a whole tinted plate under its neighbour and the map stopped having four
   * readable columns. A card dragged clear of its plate now simply sits clear
   * of it, which says what actually happened.
   *
   * Down, a plate follows its cards and stops at its own last one rather than
   * running to the deepest lane's floor. Squaring them off looked tidier in a
   * mockup and reads as a mistake in practice: a lane with eleven cards in it
   * drew a thousand pixels of empty tinted nothing under them because an
   * unrelated lane happened to be longer, which says "something belongs here
   * and is missing" about a lane that is in fact complete.
   */
  const bands = useMemo(() => {
    const out: Array<{
      tier: VarTier;
      lane: LaneSpan;
      x: number;
      y: number;
      w: number;
      h: number;
      count: number;
    }> = [];
    for (const lane of auto.lanes) {
      const cards = Object.values(placed).filter((p) => p.collection.tier === lane.tier);
      if (cards.length === 0) continue;
      const slots = Object.values(auto.boxes).filter(
        (b) => placed[b.id]?.collection.tier === lane.tier
      );
      // Top from the slots, not the cards: a card nudged upwards shouldn't drag
      // its band's title up out of alignment with the other three.
      const y = Math.min(...slots.map((b) => b.y)) - BAND_HEAD_H;
      const bottom = Math.max(...cards.map((p) => p.y + p.h)) + BAND_PAD;
      out.push({
        tier: lane.tier,
        lane,
        x: lane.x - BAND_PAD,
        y,
        w: lane.w + BAND_PAD * 2,
        h: bottom - y,
        count: cards.reduce((s, p) => s + p.collection.nodes.length, 0),
      });
    }
    return out;
  }, [placed, auto]);

  /** Greys out whichever of expand-all / collapse-all has nothing left to do. */
  const allFolded = useMemo(() => {
    const ids = Object.keys(placed);
    return ids.length > 0 && ids.every((id) => collapsed.has(id));
  }, [placed, collapsed]);
  const noneFolded = useMemo(() => {
    const ids = Object.keys(placed);
    return ids.length > 0 && ids.every((id) => !collapsed.has(id));
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

  // Keyed by layout as well as project. An offset means much the same thing in
  // either arrangement, but "I pulled this one out to the side" is still a
  // statement about the arrangement it was made in.
  //
  // `nudge` rather than `varmap` in the key: the entries under the old name are
  // absolute points, which this reads as offsets, so they're a different format
  // rather than an older one. A stale key would silently fling every card it
  // named a couple of thousand pixels off its slot.
  const storageKey = activeProjectId ? `arkitype-varnudge-${activeProjectId}-${ui.layout}` : null;
  useEffect(() => {
    // A file with no id yet still gets a clean slate per arrangement — the
    // early return that used to sit here is exactly what let one layout's drags
    // leak into the other and pile cards on top of each other.
    if (!storageKey) {
      setNudge({});
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      setNudge(raw ? (JSON.parse(raw) as Record<string, Point>) : {});
    } catch {
      setNudge({});
    }
  }, [storageKey]);

  // One sweep for the absolute-position keys this replaced. They're view
  // preferences, they can't be read any more, and leaving them would keep the
  // old shape of the bug one refactor away.
  useEffect(() => {
    if (!activeProjectId) return;
    for (const suffix of ["", "-lanes", "-packed"]) {
      localStorage.removeItem(`arkitype-varmap-${activeProjectId}${suffix}`);
    }
  }, [activeProjectId]);

  const persistNudge = useCallback(
    (next: Record<string, Point>) => {
      setNudge(next);
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

  /**
   * Move the viewport without going through React.
   *
   * Pan and zoom are gestures: sixty events a second, each asking for a new
   * transform on one wrapper div. Routed through state, every one of them
   * re-reconciles every card, every row and every wire on the canvas in order
   * to move that wrapper two pixels — which is most of what made this surface
   * feel slow, and it got worse the more of a system you had.
   *
   * So the ref is the truth and the transform is written straight onto the
   * node. React is told when the gesture *ends* (`commitView`), which is soon
   * enough for the handful of things that really do re-render on zoom: the
   * percentage readout, the counter-scaled ribbon labels, and the hit-area
   * widths that compensate for scale.
   */
  const applyView = useCallback((next: { x: number; y: number; scale: number }) => {
    viewRef.current = next;
    const el = sceneRef.current;
    if (el) el.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
  }, []);

  const commitView = useCallback(() => setView(viewRef.current), []);

  const toGraph = useCallback((clientX: number, clientY: number): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const v = viewRef.current;
    return { x: (clientX - rect.left - v.x) / v.scale, y: (clientY - rect.top - v.y) / v.scale };
  }, []);

  // Native listener so the wheel can be pre-empted — React's synthetic handler
  // is passive, and a passive handler can't stop the page from scrolling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // A wheel has no "up": the gesture is over when the events stop. A short
    // idle is what stands in for the mouseup, so the readout catches up the
    // moment you let go of the trackpad rather than on every notch.
    let idle = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * Math.exp(-e.deltaY / 260)));
        const k = scale / v.scale;
        applyView({ scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
      } else {
        applyView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
      }
      window.clearTimeout(idle);
      idle = window.setTimeout(commitView, 90);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.clearTimeout(idle);
      el.removeEventListener("wheel", onWheel);
    };
  }, [applyView, commitView]);

  const zoomBy = (factor: number) => {
    const v = viewRef.current;
    const rect = containerRef.current?.getBoundingClientRect();
    const px = (rect?.width ?? 800) / 2;
    const py = (rect?.height ?? 600) / 2;
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
    const k = scale / v.scale;
    applyView({ scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
    commitView();
  };

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
    applyView({ scale, x: 28, y: Math.max(92, (BAND_HEAD_H + 26) * scale) });
    commitView();
  }, [bounds, ui.layout, applyView, commitView]);

  // Frame it once, as soon as there's something to frame — and again whenever
  // the arrangement changes shape underneath the viewport.
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current || Object.keys(placed).length === 0) return;
    didFit.current = true;
    fitWidth();
  }, [placed, fitWidth]);

  /**
   * Switching arrangement is a cross-fade, not a jump.
   *
   * Not decoration: every card lands somewhere new and the viewport re-frames
   * underneath them, and both happening at full opacity in one frame is what
   * read as the map falling apart. Fading is the honest transition for it —
   * *animating* the cards would be worse, because the wires can't animate with
   * them and you'd spend a third of a second watching a hundred connections
   * detached from both their ends.
   */
  const [reflowing, setReflowing] = useState(false);
  const firstLayout = useRef(ui.layout);
  // Through a ref, and the effect keyed on the layout alone. `fitWidth` closes
  // over `bounds`, which changes the moment the new arrangement is measured —
  // naming it as a dependency re-ran this effect one tick later, the cleanup
  // cancelled the timer that was going to fade the scene back in, and the
  // guard above then returned early. The map stayed invisible.
  const fitRef = useRef(fitWidth);
  fitRef.current = fitWidth;
  useEffect(() => {
    if (firstLayout.current === ui.layout) return;
    firstLayout.current = ui.layout;
    setReflowing(true);
    const settle = window.setTimeout(() => {
      fitRef.current();
      setReflowing(false);
    }, 130);
    return () => {
      window.clearTimeout(settle);
      setReflowing(false);
    };
  }, [ui.layout]);

  // "Show me this one" — from the rail's search, or the inspector's links.
  const focusTick = ui.focus?.tick;
  useEffect(() => {
    if (!ui.focus) return;
    const a = anchor(ui.focus.id, "in");
    const rect = containerRef.current?.getBoundingClientRect();
    if (!a || !rect) return;
    const v = viewRef.current;
    applyView({
      ...v,
      x: rect.width / 2 - (a.x + CARD_W / 2) * v.scale,
      y: rect.height / 2 - a.y * v.scale,
    });
    commitView();
    // `anchor` changes identity whenever the layout does; keying the effect on
    // the focus tick alone is what makes this fire once per request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTick]);

  /* ── background pan ── */

  const startPan = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    // A wire's hit area is a transparent stroke lying on the canvas, so its
    // mousedown is the canvas's mousedown — which is what makes dragging the
    // background still work when the drag happens to start on top of a link.
    // The click at the end of that gesture is the one that has to tell them
    // apart: on bare canvas it lets go of everything, on a wire it takes hold
    // of that wire. (Swallowing the mousedown instead would have been simpler
    // and would have made most of an All-view canvas unpannable — at a
    // zoomed-out scale the hit areas are 30px wide and there are hundreds.)
    const wireId =
      (e.target as Element | null)?.closest?.<HTMLElement>("[data-var-wire]")?.dataset.varWire ??
      null;
    const start = { x: e.clientX, y: e.clientY };
    const origin = { x: viewRef.current.x, y: viewRef.current.y };
    let moved = false;
    const move = (ev: MouseEvent) => {
      if (Math.abs(ev.clientX - start.x) + Math.abs(ev.clientY - start.y) > 3) moved = true;
      applyView({
        ...viewRef.current,
        x: origin.x + (ev.clientX - start.x),
        y: origin.y + (ev.clientY - start.y),
      });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (moved) commitView();
      // A click on bare canvas lets go of everything — otherwise the last row
      // or ribbon you touched keeps the whole map dimmed around it, with no
      // obvious way out. A click that landed on a wire takes hold of it.
      if (!moved) {
        if (wireId) holdEdge(wireId);
        else release();
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  /* ── card drag ── */

  /**
   * Set while a card is being dragged, so the mouseup that ends the drag isn't
   * also read as the click that pins the card.
   */
  const draggedRef = useRef(false);

  const startCardDrag = (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const p = placed[collectionId];
    if (!p) return;
    const slot = auto.boxes[collectionId];
    if (!slot) return;
    const start = { x: e.clientX, y: e.clientY };
    const origin = { x: p.x - slot.x, y: p.y - slot.y };
    let next = nudge;
    draggedRef.current = false;
    const move = (ev: MouseEvent) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      // Nothing is recorded until this is unmistakably a drag. A mouse moves a
      // pixel or two during any real click, and writing that pixel down gave
      // every card you had merely *clicked* a permanent one-pixel offset — with
      // a "put it back" button to match, and a slot it no longer sat on.
      if (!draggedRef.current) {
        if (Math.abs(dx) + Math.abs(dy) <= 3) return;
        draggedRef.current = true;
      }
      const scale = viewRef.current.scale;
      next = {
        ...next,
        [collectionId]: { x: origin.x + dx / scale, y: origin.y + dy / scale },
      };
      setNudge(next);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (draggedRef.current) persistNudge(next);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  /** Put one card back on its slot, without disturbing anyone else's nudge. */
  const resetCard = (collectionId: string) => {
    const next = { ...nudge };
    delete next[collectionId];
    persistNudge(next);
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
      if (plan.kind === "binding") {
        // A binding resolves to a var(), which flips per mode on its own —
        // there's no other mode for it to also land in.
        setComponentBinding(plan.componentId, plan.storageKey, plan.binding);
        selectVariable(consumerId);
        flash(`Linked ${plan.label}`, true);
        return;
      }

      for (const m of plan.modes) setSemantic(m, plan.token, plan.value);
      selectVariable(consumerId);

      // The map reads one mode at a time, so a link made on it lands in one
      // mode — which is right, and is also exactly the thing you'd want to
      // undo-by-widening a second later. The offer sits in the confirmation
      // rather than in a preference, so it costs nothing until it's the answer.
      const others = modeDefs.map((d) => d.id).filter((id) => !plan.modes.includes(id));
      const only = modeDefs.find((d) => d.id === plan.modes[0])?.name;
      if (others.length === 0) {
        flash(`Linked ${plan.label}`, true);
        return;
      }
      flash(`Linked ${plan.label} in ${only ?? plan.modes[0]}`, true, {
        label: `Every mode (${modeDefs.length})`,
        run: () => {
          for (const m of others) setSemantic(m, plan.token, plan.value);
          flash(`${plan.label} — in all ${modeDefs.length} modes`, true);
        },
      });
    },
    [
      graph,
      primitives,
      semantics,
      components,
      editModes,
      modeDefs,
      setSemantic,
      setComponentBinding,
      selectVariable,
      flash,
    ]
  );

  /**
   * Every row this connection could legally land on, worked out the moment it
   * starts rather than one row at a time under the cursor.
   *
   * Telling someone a drop was illegal *after* they've made it is the least
   * useful moment to tell them: the rule (a colour takes a colour, a primitive
   * holds literals, a link can't loop) is knowable up front, so the map lights
   * what will work and fades what won't while there's still time to aim.
   *
   * Keyed on the *source* of the link rather than on `connecting` itself: the
   * loose end moves with the cursor, so the whole object is a new one sixty
   * times a second, and depending on it re-planned every variable in the file
   * per frame to answer a question whose answer hadn't changed.
   */
  const connectFrom = connecting?.from ?? null;
  const connectSide = connecting?.side ?? null;
  const validTargets = useMemo(() => {
    if (!connectFrom || !connectSide) return null;
    const out = new Set<string>();
    for (const c of visible.collections) {
      for (const n of c.nodes) {
        if (n.id === connectFrom) continue;
        const provider = connectSide === "out" ? connectFrom : n.id;
        const consumer = connectSide === "out" ? n.id : connectFrom;
        if (planConnection(graph, { primitives, semantics, components }, provider, consumer, editModes).ok) {
          out.add(n.id);
        }
      }
    }
    return out;
  }, [connectFrom, connectSide, visible.collections, graph, primitives, semantics, components, editModes]);

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
    // A held wire dims every row that isn't one of its two ends, which is the
    // opposite of what a link in flight needs: there, the map's job is to
    // light every row that could legally take the drop.
    setPinnedEdge(null);

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
  //
  // Keyed on what's being connected rather than on `connecting`, whose loose
  // end moves with the cursor: depending on the object tore down and re-bound
  // both window listeners on every mouse move for the length of the gesture.
  // `validTargets` is read through a ref for the same reason — it's only
  // consulted inside the handler, and naming it as a dependency would put the
  // re-binding straight back.
  const armed = connecting?.armed ?? false;
  const validTargetsRef = useRef(validTargets);
  validTargetsRef.current = validTargets;
  useEffect(() => {
    if (!armed || !connectFrom || !connectSide) return;
    const move = (ev: MouseEvent) => {
      setConnecting((c) => (c && c.armed ? { ...c, at: toGraph(ev.clientX, ev.clientY) } : c));
      const target = nodeAt(ev.clientX, ev.clientY);
      setDropTarget(
        !target || target === connectFrom
          ? null
          : { id: target, ok: !!validTargetsRef.current?.has(target) }
      );
    };
    const down = (ev: MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      finishConnect(connectFrom, connectSide, nodeAt(ev.clientX, ev.clientY));
    };
    window.addEventListener("mousemove", move);
    // Capture, so the click lands the link rather than starting a pan.
    window.addEventListener("mousedown", down, true);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down, true);
    };
  }, [armed, connectFrom, connectSide, toGraph, finishConnect]);

  /** Let go of everything the map is holding — one gesture, four sources. */
  const release = useCallback(() => {
    selectVariable(null);
    setPinnedCard(null);
    setPinnedEdge(null);
    setOpenBundle(null);
  }, [selectVariable]);

  /**
   * Hold a wire — or let go of the one already held by clicking it again, the
   * same toggle a row has. The three pins are exclusive on purpose: they answer
   * different questions ("what does this variable reach", "what does this set
   * touch", "what does this one link join") and lighting two answers at once
   * is how you end up unable to read either.
   */
  const holdEdge = useCallback(
    (edgeId: string) => {
      setPinnedEdge((cur) => (cur === edgeId ? null : edgeId));
      selectVariable(null);
      setPinnedCard(null);
      setOpenBundle(null);
    },
    [selectVariable]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // A link in flight is the nearer thing to cancel; the selection survives
      // it, so escaping a mis-started drag doesn't also lose your place.
      if (connectingRef.current) {
        setConnecting(null);
        setDropTarget(null);
        return;
      }
      release();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [release]);

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

  /**
   * The row whose chain is lit — and the rule that makes the map usable:
   * **what you picked wins.**
   *
   * Hover used to take precedence, which meant a selection survived exactly
   * until the pointer crossed anything else. Reading a chain that runs the
   * width of the canvas involves crossing a great deal of anything else, so in
   * practice the answer you asked for vanished on the way to looking at it. Now
   * hover only previews while nothing is held, and letting go is a deliberate
   * act: Escape, the pill at the top, or a click on bare canvas.
   *
   * Preview itself stays out of Selected view, where a chain rebuilt for every
   * twenty-two-pixel row you happen to cross is the whole cost that view exists
   * to avoid.
   */
  const holding = ui.selected ?? pinnedCard ?? pinnedEdge;
  const focusId = ui.selected ?? (holding ? null : previews ? hovered : null);

  const copyRef = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    window.setTimeout(() => setCopied((c) => (c === text ? null : c)), 1400);
  };

  /* ── highlight, worked out before the wires that depend on it ── */

  /**
   * The chain a row (or a whole card) lights: everything upstream and
   * downstream of it. A hovered card lights the union of its rows' chains,
   * which is how a folded card stays useful — you can ask what it feeds
   * without unfolding it.
   *
   * This is computed *ahead* of the wires, because in Selected view it's the
   * only thing that decides which wires exist at all.
   */
  const chain = useMemo(() => {
    if (focusId && graph.nodes[focusId]) return relatedNodes(graph, focusId);
    // A held wire lights two rows and no more: its own ends. Deliberately not
    // the chain those rows sit in and not the cards they live on — a link is
    // picked precisely when you want it separated from everything around it,
    // and answering with its whole neighbourhood puts it straight back in the
    // crowd it was picked out of.
    if (pinnedEdge) {
      const edge = graph.edges.find((e) => e.id === pinnedEdge);
      if (edge) return new Set([edge.from, edge.to]);
    }
    // A pinned card outranks a hovered one for the same reason a pinned row
    // outranks a hovered row: you said so.
    const cardId = pinnedCard ?? (ui.selected || pinnedEdge ? null : hoveredCard);
    if (cardId) {
      const card = graph.collections.find((c) => c.id === cardId);
      if (!card) return null;
      const out = new Set<string>();
      for (const n of card.nodes) relatedNodes(graph, n.id).forEach((id) => out.add(id));
      return out;
    }
    return null;
  }, [focusId, pinnedCard, pinnedEdge, ui.selected, hoveredCard, graph]);

  /**
   * The wire being read right now — the held one, or the one under the pointer.
   *
   * Hover still previews (it's how you find the wire you're about to take hold
   * of), and both states light the same two rows; only the held one dims the
   * rest of the map, because only the held one is going to stay.
   */
  const activeWire = useMemo(() => {
    const id = pinnedEdge ?? hoveredEdge;
    if (!id) return null;
    const edge = graph.edges.find((e) => e.id === id);
    if (!edge) return null;
    const from = graph.nodes[edge.from];
    const to = graph.nodes[edge.to];
    return from && to ? { edge, from, to, held: id === pinnedEdge } : null;
  }, [pinnedEdge, hoveredEdge, graph]);

  /* ── edges, resolved to concrete geometry ── */

  /**
   * A wire nobody chose: a component property still on the binding its schema
   * ships with. Real wiring — it's what the component renders from — but it's
   * the same wiring every file starts with, and there are hundreds of them.
   */
  const isDefaultWire = useCallback(
    (e: VarEdge): boolean => {
      const to = graph.nodes[e.to];
      return to?.tier === "usage" && to.usage?.overridden === false;
    },
    [graph.nodes]
  );

  /**
   * Which edges get geometry built for them at all.
   *
   * Two jobs. The first is the performance story of the map: every edge used to
   * be resolved to a path, a midpoint and an SVG group on every render — several
   * hundred of them — even in Summary, where at rest they were drawn as empty
   * groups nobody could see. Selected view narrows this to one chain, which is
   * usually a dozen wires and often none, and the cost stops scaling with the
   * size of the system.
   *
   * The second is the readability story. On a stock file, three quarters of
   * every wire on the canvas is an untouched schema default running the full
   * width of the picture into a folded card — a weave that says nothing about
   * *this* system, drawn over everything that does. Those sit out at rest.
   * They aren't gone: anything in the lit chain draws regardless, so pointing
   * at a component, or at the role that feeds it, brings its real wiring back
   * immediately, and the band header turns them all on with one press.
   */
  const drawnEdges = useMemo(() => {
    const inMode = (e: VarEdge) =>
      e.binding || ui.editMode === "all" || e.modes.includes(ui.editMode);
    const lit = (e: VarEdge) => !!chain && chain.has(e.from) && chain.has(e.to);
    const wanted = (e: VarEdge) =>
      inMode(e) && (ui.showDefaultWires || !isDefaultWire(e) || lit(e));

    if (linkView !== "selected") return graph.edges.filter(wanted);
    if (!chain) return [];
    return graph.edges.filter((e) => wanted(e) && lit(e));
  }, [graph.edges, ui.editMode, ui.showDefaultWires, isDefaultWire, linkView, chain]);

  const wires = useMemo(() => {
    const resolved = drawnEdges
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
        d: wirePath(a, b, wireStyle),
        mid: wireMid(a, b, wireStyle),
        // The tier of what this wire *carries* — a chain you trace changes
        // colour as it crosses lanes.
        tier: (graph.nodes[e.from]?.tier ?? "primitive") as VarTier,
      };
    });
  }, [drawnEdges, graph.nodes, anchor, wireStyle]);

  const wireById = useMemo(() => {
    const out: Record<string, (typeof wires)[number]> = {};
    for (const w of wires) out[w.edge.id] = w;
    return out;
  }, [wires]);

  /* ── the same edges, gathered into one ribbon per pair of sets ── */

  // Only Summary draws ribbons, and only Summary should pay for them: bundling
  // walks every wire, and placing each label walks thirteen points along a
  // ribbon against every card on the canvas looking for clear air.
  const bundles = useMemo(() => {
    if (linkView !== "summary") return [];
    const ribbons = bundleWires(
      wires.map((w) => ({ id: w.edge.id, from: w.edge.from, to: w.edge.to, a: w.a, b: w.b })),
      (nodeId) => visible.rowOf[nodeId]?.collectionId ?? null,
      wireStyle
    );
    const max = ribbons.reduce((m, r) => Math.max(m, r.count), 1);

    // Park the label where the ribbon is in the open. It's opaque, so one
    // sitting over a card would hide a row of real tokens to report a number
    // about the wires behind it — the worse of the two trades.
    const cards = Object.values(placed);
    const covered = (p: Point) =>
      cards.some((c) => p.x > c.x - 9 && p.x < c.x + CARD_W + 9 && p.y > c.y - 9 && p.y < c.y + c.h + 9);

    return ribbons.map((r) => {
      const clear = wireSamples(r.a, r.b, 13, wireStyle).find((p) => !covered(p));
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
  }, [linkView, wires, visible.rowOf, placed, graph.collections, wireStyle]);

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

  /**
   * What's currently "lit" — the chain above, or everything a taken ribbon
   * carries, which is how a summary opens back up into the wires it stands for.
   */
  const related = useMemo(() => {
    if (focusId && graph.nodes[focusId]) return chain;
    if (activeBundleId && bundleById[activeBundleId]) {
      const { from, to } = bundleById[activeBundleId];
      const out = new Set<string>();
      for (const c of graph.collections) {
        if (c.id !== from && c.id !== to) continue;
        for (const n of c.nodes) out.add(n.id);
      }
      return out;
    }
    return chain;
  }, [chain, focusId, activeBundleId, bundleById, graph]);

  /** Wires the ribbon under the pointer stands for — drawn on top of it. */
  const bundleMembers = useMemo(
    () => new Set(activeBundleId ? (bundleById[activeBundleId]?.members ?? []) : []),
    [activeBundleId, bundleById]
  );

  const liveAnchor = connecting ? anchor(connecting.from, connecting.side === "out" ? "out" : "in") : null;
  const connectingNode = connecting ? graph.nodes[connecting.from] : undefined;

  /**
   * What the map is holding, named — and how much of the file it reaches.
   *
   * A pinned selection changes what every other row on the canvas looks like,
   * so it has to be legible as a *state* rather than only as a highlight
   * somewhere off-screen. The count is the useful half: "Action · 41 variables
   * in its chain" is the blast radius, which is the question the map exists to
   * answer.
   */
  const held = useMemo((): Held | null => {
    if (ui.selected && graph.nodes[ui.selected]) {
      return { kind: "variable", label: graph.nodes[ui.selected].path };
    }
    if (pinnedCard) {
      const c = graph.collections.find((x) => x.id === pinnedCard);
      if (c) return { kind: "set", label: c.label };
    }
    // A link says both its ends rather than a count: "41 in its chain" is the
    // useful half of holding a variable and the useless half of holding a
    // wire, whose chain is two by construction.
    if (pinnedEdge && activeWire?.held) {
      return { kind: "link", edge: activeWire.edge, from: activeWire.from, to: activeWire.to };
    }
    return null;
  }, [ui.selected, pinnedCard, pinnedEdge, activeWire, graph]);

  /**
   * The held wire's ends that are currently folded away inside a card. Offering
   * to open them is the honest fix for the one case this selection can't show
   * you: a link whose variable is on a card collapsed to its header.
   */
  const foldedEnds = useMemo(() => {
    if (held?.kind !== "link") return [];
    const ids: string[] = [];
    for (const nodeId of [held.edge.from, held.edge.to]) {
      const cid = visible.rowOf[nodeId]?.collectionId;
      // Both ends can live on the same folded card — one entry, one unfold.
      if (cid && collapsed.has(cid) && !ids.includes(cid)) ids.push(cid);
    }
    return ids;
  }, [held, visible.rowOf, collapsed]);

  // A wire whose link was cut (or whose cards have been hidden) has nothing
  // left to hold — let go rather than dimming the map around a wire that
  // isn't there.
  useEffect(() => {
    if (pinnedEdge && !wireById[pinnedEdge]) setPinnedEdge(null);
  }, [pinnedEdge, wireById]);

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
        ref={sceneRef}
        className="absolute left-0 top-0 origin-top-left"
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          // Hand the pan to the compositor. Without this the browser re-rasters
          // the cards (and, in Summary, a thousand-odd SVG nodes) on every
          // frame of a drag; with it, panning is a matrix on a layer that's
          // already drawn, and every link view sits at the refresh rate
          // instead of a third of it.
          willChange: "transform",
          // Blank instantly on a re-arrangement, fade back once the cards have
          // landed and the viewport has re-framed around them.
          opacity: reflowing ? 0 : 1,
          transition: reflowing ? "none" : "opacity 220ms ease-out",
        }}
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

                {/* What this band is leaving out, and the way back. Both of
                    these are the price of a readable map, and a price nobody
                    is told about is just a missing feature. */}
                {b.tier === "primitive" && ui.connectedOnly && visible.hiddenPrimitives > 0 ? (
                  <BandToggle
                    tier={b.tier}
                    onClick={() => setConnectedOnly(false)}
                    title={`${visible.hiddenPrimitives} generated steps aren't referenced by anything yet — show them anyway`}
                    icon={<EyeOff size={10} />}
                    label={`${visible.hiddenPrimitives} unused hidden`}
                  />
                ) : null}
                {b.tier === "primitive" && !ui.connectedOnly ? (
                  <BandToggle
                    tier={b.tier}
                    onClick={() => setConnectedOnly(true)}
                    title="Hide the generated steps nothing points at yet"
                    icon={<Eye size={10} />}
                    label="Showing unused"
                  />
                ) : null}
                {b.tier === "usage" ? (
                  <BandToggle
                    tier={b.tier}
                    onClick={() => setShowDefaultWires(!ui.showDefaultWires)}
                    active={ui.showDefaultWires}
                    title={
                      ui.showDefaultWires
                        ? "Stop drawing the properties still on the binding their schema ships with — point at any card to see its own wiring"
                        : `${usageStats.total - usageStats.authored} of these properties are on the binding they ship with. Their wires are off so the ones you chose can be seen; point at a card to see any of them`
                    }
                    icon={ui.showDefaultWires ? <Eye size={10} /> : <EyeOff size={10} />}
                    label={
                      ui.showDefaultWires
                        ? "Default wiring shown"
                        : `${usageStats.authored} wired by you`
                    }
                  />
                ) : null}

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
                        setPinnedEdge(null);
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
            const isHeld = pinnedEdge === edge.id;
            // A parallel alias — the same two rows joined again in another mode
            // — passes the `related` test on a held wire's two-node chain and
            // would light identically. It's a different link with its own cut
            // button, so it stays a shade back: one wire is held, not two.
            const isHovered = hoveredEdge === edge.id;
            const isActive = isHeld || isHovered;

            // In Summary, a wire that isn't part of what you're reading isn't
            // drawn at all — that's the whole bargain the ribbons buy.
            const hidden = !lit && !isActive && linkView === "summary";

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

            const stroke = isActive ? "rgb(var(--c-focus))" : tierColor(tier);
            // Three states, and the gap between them is the point. A wire at
            // rest has to be followable on its own — 1.2px at half opacity was
            // a suggestion of a wire — while the one you've asked for has to
            // win against three hundred of them, which it does by going opaque
            // and thick rather than by everything else going invisible.
            const opacity = isActive || lit ? 1 : related !== null ? 0.12 : 0.72;
            // The held one takes another notch on top of that, so it stays the
            // wire you picked even where a parallel alias runs the same route.
            const width = isHeld ? 3.4 : isActive || lit ? 2.6 : 1.5;

            // Dashes carry real information — that this alias doesn't hold in
            // every mode — but at rest they read as buzz rather than as a
            // legend. So they're spelled out where you can act on them: on the
            // lit chain, on hover, and at rest only when the map is showing
            // every mode at once.
            //
            // Keyed on the *mode* selector, not the links one. Reading a single
            // mode, "doesn't hold in all of them" is true of most of the wires
            // on screen and describes modes you aren't looking at — so at rest
            // it dashed nearly the whole canvas to say nothing about it.
            const partial = !isEveryMode(edge, modeDefs.length);
            const dash =
              partial && (isActive || lit || ui.editMode === "all") ? "5 4" : undefined;

            return (
              <g key={edge.id}>
                {!hidden ? (
                  <>
                    {/* A halo under the lit wire, so a chain stays traceable
                        where it crosses the ones it isn't part of. */}
                    {lit || isActive ? (
                      <path
                        d={d}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={isHeld ? 11 : 8}
                        strokeOpacity={isHeld ? 0.28 : 0.2}
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
                    {/* Terminals. On a wire you're actually reading, the two
                        things worth finding at a glance are where it leaves
                        and where it lands — so it gets a plug at the source
                        and an arrow at the consumer, which is direction and
                        both endpoints in two marks. At rest (All view, nothing
                        selected) a dot at each end does the same job without
                        three hundred arrowheads' worth of weight. */}
                    {isActive || lit ? (
                      <>
                        <rect
                          x={a.x - 3.4}
                          y={a.y - 3.4}
                          width={6.8}
                          height={6.8}
                          rx={2.2}
                          fill={stroke}
                          fillOpacity={opacity}
                        />
                        <path
                          d={`M ${b.x} ${b.y} L ${b.x - 6} ${b.y - 3.4} L ${b.x - 6} ${b.y + 3.4} Z`}
                          fill={stroke}
                          fillOpacity={opacity}
                        />
                      </>
                    ) : (
                      <>
                        <circle cx={a.x} cy={a.y} r={2.1} fill={stroke} fillOpacity={opacity} />
                        <circle cx={b.x} cy={b.y} r={2.1} fill={stroke} fillOpacity={opacity} />
                      </>
                    )}
                  </>
                ) : null}
                {/* Fat invisible stroke: the hover target, and the thing a
                    click lands on to take hold of the wire. The pointer-down
                    is deliberately left to the canvas — see `startPan`. */}
                {grabbable ? (
                  <path
                    d={d}
                    data-var-wire={edge.id}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14 * grabScale}
                    style={{ pointerEvents: "stroke", cursor: "pointer" }}
                    onMouseEnter={() => setHoveredEdge(edge.id)}
                    onMouseLeave={() => setHoveredEdge((h) => (h === edge.id ? null : h))}
                  >
                    <title>
                      {`${graph.nodes[edge.from]?.path ?? edge.from} → ${
                        graph.nodes[edge.to]?.path ?? edge.to
                      } — click to hold this link`}
                    </title>
                  </path>
                ) : null}
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
                      setPinnedEdge(null);
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

        {/* Unlink control, parked on the wire's midpoint — for the one under
            the pointer, and for the one being held.

            Held, it spells itself out. The compact circle is right for a
            hover, where it's already under the cursor that summoned it; it's
            wrong for the thing you deliberately picked out of three hundred
            wires *in order to* cut it, where a 20px unlabelled dot on a canvas
            you may have panned since is the button going missing again. */}
        {!connecting
          ? wires
              .filter(
                (w) =>
                  (w.edge.id === pinnedEdge || w.edge.id === hoveredEdge) &&
                  !openBundle &&
                  canUnlink(w.edge)
              )
              .map(({ edge, mid }) => {
                const isHeld = edge.id === pinnedEdge;
                return (
                  <button
                    key={`cut-${edge.id}`}
                    type="button"
                    title={`Detach ${graph.nodes[edge.to]?.path ?? ""} from ${graph.nodes[edge.from]?.path ?? ""}`}
                    onMouseEnter={() => setHoveredEdge(edge.id)}
                    onMouseLeave={() => setHoveredEdge((h) => (h === edge.id ? null : h))}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => {
                      unlink(edge);
                      setPinnedEdge((cur) => (cur === edge.id ? null : cur));
                    }}
                    className={
                      isHeld
                        ? "absolute z-20 flex items-center gap-1 rounded-full border border-focus bg-ink-raised px-2 py-1 text-[10px] font-bold text-fg shadow-lg transition-colors hover:border-red-500/70 hover:text-red-400"
                        : "absolute z-20 flex h-5 w-5 items-center justify-center rounded-full border border-line-strong bg-ink-raised text-fg-mute shadow transition-colors hover:border-red-500/60 hover:text-red-400"
                    }
                    style={
                      isHeld
                        ? {
                            left: mid.x,
                            top: mid.y,
                            // Counter-scaled like the ribbon chips: the point of
                            // this button is to be reachable at the zoom you were
                            // already reading the map at.
                            transform: `translate(-50%, -50%) scale(${Math.min(2.4, Math.max(0.8, 1 / view.scale))})`,
                          }
                        : { left: mid.x - 10, top: mid.y - 10 }
                    }
                  >
                    <Unlink size={isHeld ? 11 : 10} />
                    {isHeld ? "Detach" : null}
                  </button>
                );
              })
          : null}

        {/* Cards */}
        {Object.values(placed).map((p) => {
          const c = p.collection;
          const accent = tierColor(c.tier);
          const isPinned = pinnedCard === c.id;
          // One end of the wire being read lives in here, and the card is
          // folded — so the row that would have shown it isn't drawn. Marking
          // the header is the least that can be said instead: a wire landing on
          // a folded card otherwise arrives at forty variables at once.
          const holdsWireEnd =
            !!activeWire &&
            p.collapsed &&
            c.nodes.some((n) => n.id === activeWire.edge.from || n.id === activeWire.edge.to);
          return (
            <div
              key={c.id}
              className={`group/card absolute rounded-lg bg-ink-raised ${
                isPinned ? "shadow-2xl" : "shadow-xl"
              } ${p.collapsed ? "" : "pb-px"}`}
              style={{
                left: p.x,
                top: p.y,
                width: CARD_W,
                // A held card is outlined in its own tier's colour rather than
                // in the focus blue: which set you're holding is the fact worth
                // carrying, and it's the same colour it wears everywhere else.
                border: `1px solid ${
                  holdsWireEnd ? "rgb(var(--c-focus))" : tierColor(c.tier, isPinned ? 1 : 0.42)
                }`,
                ...(isPinned ? { outline: `2px solid ${tierColor(c.tier, 0.3)}` } : null),
              }}
              onMouseDown={(e) => e.stopPropagation()}
              // Nothing to preview in Selected view, so nothing to record —
              // and a state write here re-renders every card on the canvas.
              onMouseEnter={previews ? () => setHoveredCard(c.id) : undefined}
              onMouseLeave={previews ? () => setHoveredCard((h) => (h === c.id ? null : h)) : undefined}
            >
              <header
                onMouseDown={(e) => startCardDrag(e, c.id)}
                // A click on the header holds the whole set: every wire in and
                // out of it, lit and staying lit. The drag that just ended
                // isn't one (`draggedRef`), and neither is the second half of
                // the double-click that folds it (`detail`).
                onClick={(e) => {
                  if (draggedRef.current || e.detail > 1) return;
                  selectVariable(null);
                  setPinnedEdge(null);
                  setOpenBundle(null);
                  setPinnedCard((cur) => (cur === c.id ? null : c.id));
                }}
                onDoubleClick={() => setCollapsed(c.id, !p.collapsed)}
                title={`${c.label} — click to hold its wiring · drag to move · double-click to fold`}
                className={`flex h-[34px] cursor-grab items-center gap-1.5 px-2 active:cursor-grabbing ${
                  p.collapsed ? "rounded-lg" : "rounded-t-lg"
                }`}
                style={{
                  background: tierColor(c.tier, isPinned ? 0.26 : 0.12),
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
                  <p
                    className={`truncate text-[11px] font-bold leading-none ${
                      c.unreferenced ? "text-fg-mute" : "text-fg"
                    }`}
                    title={
                      c.unreferenced
                        ? `${c.label} — nothing in the file points at this scale yet`
                        : undefined
                    }
                  >
                    {c.label}
                  </p>
                  {c.note && !p.collapsed ? (
                    <p
                      className="mt-0.5 truncate text-[8.5px] font-semibold uppercase tracking-[0.07em]"
                      style={{ color: accent }}
                    >
                      {c.note}
                    </p>
                  ) : null}
                </div>
                {/* Off its slot, and the way back onto it. A card you moved
                    yourself is the only card that can now be anywhere awkward,
                    so it's the only one that needs this. */}
                {p.nudged ? (
                  <button
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      resetCard(c.id);
                    }}
                    title={`Put ${c.label} back in its lane`}
                    aria-label={`Put ${c.label} back in its lane`}
                    className="shrink-0 rounded p-0.5 text-fg-mute opacity-0 transition-colors hover:bg-ink-hover hover:text-fg group-hover/card:opacity-100"
                  >
                    <Focus size={10} />
                  </button>
                ) : null}
                {isPinned ? (
                  <Pin size={10} className="shrink-0" style={{ color: accent }} aria-hidden />
                ) : null}
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
                // One end of the wire being read. Which end matters and is
                // free to show: the marker sits on the side the wire actually
                // touches — right for the variable being followed, left for
                // the one doing the following — so a link reads as a direction
                // without having to trace it across the canvas.
                const wireEnd = !activeWire
                  ? null
                  : activeWire.edge.from === node.id
                    ? "from"
                    : activeWire.edge.to === node.id
                      ? "to"
                      : null;
                return (
                  <div
                    key={node.id}
                    data-var-node={node.id}
                    onMouseEnter={previews ? () => setHovered(node.id) : undefined}
                    onMouseLeave={previews ? () => setHovered((h) => (h === node.id ? null : h)) : undefined}
                    onClick={() => {
                      if (connecting) return; // the armed click lands the link
                      // Clicking the same row twice lets go of it, so the
                      // gesture that holds a chain is also the one that
                      // releases it — no hunting for bare canvas.
                      selectVariable(isSelected ? null : node.id);
                      setPinnedCard(null);
                      setPinnedEdge(null);
                      setOpenBundle(null);
                    }}
                    role="button"
                    aria-pressed={isSelected}
                    aria-label={`${node.path}${node.detail ? ` — ${node.detail}` : ""}`}
                    style={{
                      height: ROW_H,
                      ...(isSelected && !isDrop
                        ? { background: tierColor(c.tier, 0.18), boxShadow: `inset 2px 0 0 ${accent}` }
                        : null),
                      ...(wireEnd && !isDrop
                        ? {
                            background: "rgb(var(--c-focus) / 0.16)",
                            boxShadow:
                              wireEnd === "from"
                                ? "inset -2px 0 0 rgb(var(--c-focus))"
                                : "inset 2px 0 0 rgb(var(--c-focus))",
                          }
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
                        isSelected || wireEnd
                          ? "text-fg"
                          : onDefault
                            ? "text-fg-mute"
                            : "text-fg-dim"
                      }`}
                      title={
                        wireEnd === "from"
                          ? `${node.path} — followed by ${activeWire?.to.path}`
                          : wireEnd === "to"
                            ? `${node.path} — follows ${activeWire?.from.path}`
                            : onDefault
                              ? `${node.path} — on its default binding`
                              : node.path
                      }
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
        className="absolute right-3 top-3 flex max-w-[calc(100%-24px)] flex-wrap items-center justify-end gap-1 rounded-lg border border-line bg-ink-raised/95 p-1 shadow-lg backdrop-blur"
      >
        <label className="flex items-center gap-1 pl-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-fg-mute">
            Mode
          </span>
          <select
            value={ui.editMode}
            onChange={(e) => setEditMode(e.target.value)}
            title="Which mode's wiring the map draws — and where a new link lands. One mode is the clearer picture: a token whose modes disagree draws one wire instead of two. A single-mode link offers to spread to the others the moment it's made"
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
              id: "selected",
              label: "Selected",
              hint: "Nothing drawn until you pick a variable — then its whole chain, upstream and down, with the rest of the map faded behind it. The fastest of the three by a wide margin",
            },
            {
              id: "summary",
              label: "Summary",
              hint: "One ribbon per pair of sets, coloured by where its values come from and thick with how many there are. Click a ribbon to list its links; point at a card or row to see its own wires",
            },
            {
              id: "all",
              label: "All",
              hint: "Every link drawn separately — the whole weave at once, and the slowest on a big system",
            },
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

        {/* Wires and Layout are two pairs of icons rather than four labelled
            buttons. Both are settings you pick once and leave, and spelling
            them out cost more than a third of the toolbar's width — enough
            that on a laptop with the inspector open the Links control, which
            you *do* keep reaching for, was the thing being squeezed. Each
            still names itself in full on hover and to a screen reader. */}
        {(
          [
            {
              id: "curved",
              label: "Curved wires",
              Icon: Spline,
              hint: "Curved wires — they leave and land flat, so which row each end belongs to is unambiguous, and a dense band fans out instead of stacking into one trunk",
            },
            {
              id: "elbow",
              label: "Elbow wires",
              Icon: CornerDownRight,
              hint: "Elbow wires — out, down a shared vertical trunk, and in, with rounded corners. Easiest to trace when there are a handful between two cards",
            },
          ] as const
        ).map((d) => (
          <ToolButton
            key={d.id}
            title={d.hint}
            onClick={() => setWireStyle(d.id)}
            active={wireStyle === d.id}
          >
            <d.Icon size={13} />
          </ToolButton>
        ))}

        <span className="mx-0.5 h-4 w-px bg-line" />

        {(
          [
            {
              id: "lanes",
              Icon: Rows3,
              hint: "Lanes — one column per tier, every set at a fixed place in a single list you scroll",
            },
            {
              id: "packed",
              Icon: Columns3,
              hint: "Packed — each tier wrapped into as many columns as it needs, so the whole system fits on screen without scrolling",
            },
          ] as const
        ).map((d) => (
          <ToolButton
            key={d.id}
            title={d.hint}
            onClick={() => setLayout(d.id)}
            active={ui.layout === d.id}
          >
            <d.Icon size={13} />
          </ToolButton>
        ))}

        <span className="mx-0.5 h-4 w-px bg-line" />

        {/* Two buttons rather than one that changes meaning. A single toggle
            had to guess which way you meant from whether *everything* happened
            to be folded, so with one card open it offered "fold all" and there
            was no way to ask for the opposite without folding first. */}
        <ToolButton
          title="Expand every card — every variable in the file, on screen"
          onClick={() => setCollapsedAll(Object.keys(placed), false)}
          disabled={noneFolded}
        >
          <UnfoldVertical size={12} />
        </ToolButton>
        <ToolButton
          title="Collapse every card to its header — the fastest way to see the shape of the system"
          onClick={() => setCollapsedAll(Object.keys(placed), true)}
          disabled={allFolded}
        >
          <FoldVertical size={12} />
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
          title="Tidy up — every card back on its own slot, and the view re-framed (no tokens change)"
          onClick={() => {
            persistNudge({});
            window.setTimeout(fitWidth, 0);
          }}
          disabled={Object.keys(nudge).length === 0}
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
              {(linkView === "selected"
                ? [{ label: "The chain you picked", w: 2.4 }]
                : [
                    { label: "A few links", w: 2.4 },
                    { label: "Many links", w: 7 },
                  ]
              ).map((l) => (
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
                {linkView === "selected"
                  ? "Click any row to draw its chain — everything it follows, and everything that follows it. It stays until you press Esc."
                  : linkView === "summary"
                    ? "A ribbon carries every link between two sets, in the colour of the tier those values come from. Click one to list them. Point at a card or a row to draw its own wires."
                    : "Click a row or a card header and its chain comes forward while the rest drops back — and stays there. Esc lets go."}
              </p>
              {/* The wire gesture is the one that isn't guessable from the
                  others: rows and cards look clickable, a 1.5px line doesn't. */}
              <p className="text-[9.5px] leading-snug text-fg-mute">
                Click a <span className="text-fg-dim">wire</span> to hold that one link — its two
                variables light up and its Detach button stays put.
              </p>
              {!ui.showDefaultWires ? (
                <p className="text-[9.5px] leading-snug text-fg-mute">
                  Component properties on their shipped binding aren&apos;t drawn at rest — point
                  at one, or turn them on in the{" "}
                  <span style={{ color: tierColor("usage") }}>{TIER_META.usage.plural}</span> header.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── a link in flight: what's happening, and how to stop ── */}
      {connecting ? (
        // Below the two toolbars, not across them. Centred at top-3 these
        // banners sat straight on top of the Links and Wires controls on any
        // laptop-width canvas — covering the switches at exactly the moment
        // something was happening you might want to switch away from.
        <div className="pointer-events-none absolute inset-x-0 top-[52px] z-30 flex justify-center">
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
          onMouseDown={(e) => e.stopPropagation()}
          className={`absolute left-1/2 top-[52px] z-30 flex -translate-x-1/2 items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] shadow-lg backdrop-blur ${
            toast.ok
              ? "border-line-strong bg-ink-raised/95 text-fg"
              : "border-red-500/50 bg-ink-raised/95 text-red-400"
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {toast.ok ? <Check size={11} /> : <X size={11} />}
            {toast.text}
          </span>
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                const run = toast.action?.run;
                setToast(null);
                run?.();
              }}
              className="rounded border border-focus/60 bg-focus/15 px-1.5 py-0.5 text-[10px] font-semibold text-fg transition-colors hover:bg-focus/30"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* ── what the map is holding ──
          A pinned chain changes how every other row on the canvas reads, so it
          has to be visible as a state and not only as a highlight that may well
          be off-screen. This is also the answer to "how do I get out of this". */}
      {held && !connecting && !toast ? (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-[52px] z-20 flex max-w-[min(560px,calc(100%-24px))] -translate-x-1/2 items-center gap-2 rounded-lg border border-line-strong bg-ink-raised/95 py-1.5 pl-2.5 pr-1.5 shadow-lg backdrop-blur"
        >
          <Pin size={11} className="shrink-0 text-fg-mute" />
          {held.kind === "link" ? (
            <span className="min-w-0 truncate text-[11px] text-fg-mute">
              Holding the link{" "}
              <span className="font-mono font-semibold text-fg">{held.from.path}</span>{" "}
              <span className="text-fg-mute">→</span>{" "}
              <span className="font-mono font-semibold text-fg">{held.to.path}</span>
              {!isEveryMode(held.edge, modeDefs.length) ? (
                <span className="text-fg-mute">
                  {" "}
                  · only in{" "}
                  {held.edge.modes
                    .map((m) => modeDefs.find((d) => d.id === m)?.name ?? m)
                    .join(", ")}
                </span>
              ) : null}
            </span>
          ) : (
            <span className="min-w-0 truncate text-[11px] text-fg-mute">
              Holding {held.kind === "set" ? "the set" : ""}{" "}
              <span className="font-mono font-semibold text-fg">{held.label}</span>
              {related ? (
                <span className="text-fg-mute">
                  {" "}
                  · {related.size} in its chain
                </span>
              ) : null}
            </span>
          )}
          {/* The two ways out of a held link, in the one place that's certain
              to be on screen: open the card that's hiding an end of it, or cut
              it. Both were previously only reachable by finding the wire again
              on a canvas dimmed around it. */}
          {held.kind === "link" && foldedEnds.length > 0 ? (
            <button
              type="button"
              onClick={() => foldedEnds.forEach((id) => setCollapsed(id, false))}
              title={
                foldedEnds.length > 1
                  ? "Both ends of this link are on folded cards — unfold them"
                  : "One end of this link is on a folded card — unfold it"
              }
              className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
            >
              <UnfoldVertical size={10} className="mr-0.5 inline" />
              Unfold {foldedEnds.length > 1 ? "both ends" : "the end"}
            </button>
          ) : null}
          {held.kind === "link" && canUnlink(held.edge) ? (
            <button
              type="button"
              onClick={() => {
                unlink(held.edge);
                setPinnedEdge(null);
              }}
              title={`Detach ${held.to.path} from ${held.from.path}`}
              className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-mute transition-colors hover:border-red-500/60 hover:text-red-400"
            >
              <Unlink size={10} className="mr-0.5 inline" />
              Detach
            </button>
          ) : held.kind === "link" ? (
            // Nothing to cut: every component property is wired to something,
            // and one still on its shipped binding has no stored value to
            // remove. Saying so beats a dead button.
            <span className="shrink-0 text-[10px] font-semibold text-fg-mute">
              on its default
            </span>
          ) : null}
          <button
            type="button"
            onClick={release}
            title="Let go (Esc)"
            className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
          >
            Esc
          </button>
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
