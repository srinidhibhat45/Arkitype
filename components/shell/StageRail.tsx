"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Plus,
  Trash2,
  Copy,
  Layers,
  Database,
  Search,
  X,
  Waypoints,
  Eye,
  EyeOff,
  TriangleAlert,
} from "lucide-react";
import { rampStepLabels } from "@/lib/color";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import {
  STEP_META,
  STEP_ORDER,
  useDesignSystem,
  BASE_RADII,
  RADII_NAMES,
  StepId,
  VarTierKey,
  componentStatus,
  modeDefsOf,
} from "@/store/useDesignSystem";
import { TIER_META, buildVariableGraph, tierColor } from "@/lib/variableGraph";
import { TierBadge } from "@/components/variables/VariableBits";
import { generateTypeScale, STEP_DEFS } from "@/lib/typography";

/**
 * A Tokens-panel section header. The add control is a labelled pill rather than
 * a bare 12px glyph: every section here can be added to, and the affordance has
 * to say so as plainly as the delete does.
 */
function TokenSection({
  id,
  title,
  addLabel,
  onAdd,
  expanded,
  flash,
  children,
}: {
  /** Names this section as a jump target — see `focusTokenSection`. */
  id?: string;
  title: string;
  addLabel?: string;
  onAdd?: () => void;
  /** Renders the button in its "form open" state. */
  expanded?: boolean;
  /** Briefly rings the section that was just jumped to. */
  flash?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id ? `token-section-${id}` : undefined}
      className={`space-y-2 scroll-mt-2 rounded-md transition-shadow duration-300 ${
        flash ? "shadow-[0_0_0_2px_rgb(var(--c-focus))]" : ""
      }`}
    >
      <div className="flex items-center justify-between border-b border-line pb-1.5">
        <span className="text-[12px] font-bold text-fg">{title}</span>
        {onAdd && addLabel ? (
          <button
            type="button"
            onClick={onAdd}
            title={addLabel}
            aria-label={addLabel}
            aria-expanded={expanded}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
              expanded
                ? "border-line-strong bg-ink-hover text-fg"
                : "border-line bg-ink-panel text-fg-mute hover:border-line-strong hover:bg-ink-hover hover:text-fg"
            }`}
          >
            {expanded ? <X size={10} /> : <Plus size={10} />}
            {expanded ? "Cancel" : "Add"}
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** Shared chrome for the inline "new token" forms. */
function AddForm({
  onSubmit,
  onCancel,
  children,
}: {
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  children: React.ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-md border border-line-strong bg-ink-panel p-2">
      {children}
      <div className="flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-1.5 py-0.5 text-[10px] text-fg-mute hover:bg-ink hover:text-fg"
        >
          Cancel
        </button>
        <button type="submit" className="rounded bg-fg px-2 py-0.5 text-[10px] font-semibold text-ink">
          Add
        </button>
      </div>
    </form>
  );
}

/**
 * The Variables tab's rail — the navigator for whichever surface is showing.
 * Search finds any variable in the file and goes to it, in either view.
 *
 * What sits below the search depends on the view, because most of it only means
 * something on the map: which tiers are drawn, which collections are hidden,
 * which mode a dragged wire writes. The table answers all three by having a
 * sets list and two named columns, so the rail doesn't repeat it.
 *
 * The tier colours and ordinals here are the map's, deliberately: the rail is a
 * table of contents, so a row has to be recognisable as the same thing wherever
 * you meet it.
 */
function VariablesPanel() {
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);
  const components = useDesignSystem((s) => s.components);
  const ui = useDesignSystem((s) => s.variablesUI);
  const focusVariable = useDesignSystem((s) => s.focusVariable);
  const toggleVariableCollection = useDesignSystem((s) => s.toggleVariableCollection);
  const toggleVariableTier = useDesignSystem((s) => s.toggleVariableTier);
  const setVariableEditMode = useDesignSystem((s) => s.setVariableEditMode);
  const setVariablesConnectedOnly = useDesignSystem((s) => s.setVariablesConnectedOnly);
  const setActiveVariableCollection = useDesignSystem((s) => s.setActiveVariableCollection);
  const setVariablesCreating = useDesignSystem((s) => s.setVariablesCreating);
  const isMap = ui.view === "map";

  const graph = useMemo(
    () => buildVariableGraph({ primitives, semantics, components }),
    [primitives, semantics, components]
  );

  const modeDefs = useMemo(() => modeDefsOf(semantics), [semantics]);
  /** Which column a search result's swatch is read in. */
  const railMode = ui.editMode === "all" ? (modeDefs[0]?.id ?? "light") : ui.editMode;

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return [];
    return graph.order
      .map((id) => graph.nodes[id])
      .filter((n) => n.path.toLowerCase().includes(q) || n.label.toLowerCase().includes(q))
      .slice(0, 60);
  }, [q, graph]);

  const tierCounts = useMemo(() => {
    const counts: Record<VarTierKey, number> = { primitive: 0, semantic: 0, component: 0, usage: 0 };
    for (const c of graph.collections) counts[c.tier] += c.nodes.length;
    return counts;
  }, [graph]);

  const TIERS: VarTierKey[] = ["primitive", "semantic", "component", "usage"];

  return (
    <div className="space-y-4 px-3 py-3">
      {/* start something new — the same panel the table and the map open */}
      <button
        type="button"
        onClick={() => setVariablesCreating(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-line bg-ink-panel py-1.5 text-[11.5px] font-semibold text-fg-dim transition-colors hover:border-line-strong hover:bg-ink-hover hover:text-fg"
      >
        <Plus size={11} />
        New set of variables
      </button>

      {/* search */}
      <div className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-ink-panel px-2">
        <Search size={11} className="shrink-0 text-fg-mute" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setQuery("");
            if (e.key === "Enter" && matches[0]) focusVariable(matches[0].id);
          }}
          placeholder="Find a variable…"
          className="h-full min-w-0 flex-1 bg-transparent text-[12px] text-fg placeholder:text-fg-mute focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="shrink-0 rounded p-0.5 text-fg-mute hover:text-fg"
          >
            <X size={11} />
          </button>
        ) : null}
      </div>

      {q ? (
        <div className="space-y-0.5">
          <p className="px-1 text-[10px] uppercase tracking-[0.07em] text-fg-mute">
            {matches.length === 0 ? "No matches" : `${matches.length} match${matches.length === 1 ? "" : "es"}`}
          </p>
          {matches.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => focusVariable(n.id)}
              className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors hover:bg-ink-panel ${
                ui.selected === n.id ? "bg-ink-raised" : ""
              }`}
            >
              <TierBadge tier={n.tier} size={12} />
              {n.swatch ? (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[2px] border border-line"
                  style={{ background: n.swatch[railMode] ?? n.swatch.light }}
                />
              ) : null}
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-dim">{n.path}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          {/* Says where the controls went, rather than leaving a bare panel. */}
          {!isMap ? (
            <p className="text-[10.5px] leading-relaxed text-fg-mute">
              Your sets are listed beside the table, and each column is a mode. Switch to Map for
              the wiring — what feeds what, and what depends on it.
            </p>
          ) : null}

          {/* which mode a link edit writes — a map question only: the table
              writes to the column you typed in */}
          <div className={isMap ? "" : "hidden"}>
            <span className="mb-1 block text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-mute">
              Editing
            </span>
            {/* A list rather than a row of buttons: a file can carry as many
                modes as it likes, and a segmented control can't. */}
            <select
              value={ui.editMode}
              onChange={(e) => setVariableEditMode(e.target.value)}
              className="h-7 w-full rounded border border-line bg-ink px-1.5 text-[11px] font-semibold text-fg-dim focus:border-line-strong focus:outline-none"
            >
              <option value="all">All modes</option>
              {modeDefs.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {/* One control, two jobs — worth saying, because "All" draws a
                separate link for every mode a token disagrees in. */}
            <p className="mt-1 text-[10px] leading-snug text-fg-mute">
              {ui.editMode === "all"
                ? `Every link is drawn; a new one lands in all ${modeDefs.length} modes.`
                : `Only ${modeDefs.find((m) => m.id === ui.editMode)?.name ?? ui.editMode} links are drawn; a new one lands there alone.`}
            </p>
          </div>

          {/* tiers — what the map draws */}
          <div className={`space-y-1 ${isMap ? "" : "hidden"}`}>
            <span className="block text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-mute">
              Tiers
            </span>
            {TIERS.map((t) => {
              const on = ui.tiers[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleVariableTier(t)}
                  title={TIER_META[t].blurb}
                  className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition-colors hover:bg-ink-panel"
                >
                  <span className={on ? "" : "opacity-35 grayscale"}>
                    <TierBadge tier={t} />
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-[11.5px] ${
                      on ? "text-fg-dim" : "text-fg-mute line-through"
                    }`}
                  >
                    {TIER_META[t].plural}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-fg-mute">{tierCounts[t]}</span>
                  {on ? (
                    <Eye size={11} className="shrink-0 text-fg-mute" />
                  ) : (
                    <EyeOff size={11} className="shrink-0 text-fg-mute" />
                  )}
                </button>
              );
            })}
            <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 transition-colors hover:bg-ink-panel">
              <input
                type="checkbox"
                checked={ui.connectedOnly}
                onChange={(e) => setVariablesConnectedOnly(e.target.checked)}
                className="h-3 w-3 accent-fg"
              />
              <span className="text-[11.5px] text-fg-dim">Hide unused primitives</span>
            </label>
          </div>

          {/* The file's sets, grouped into the same four lanes the map draws.
              The table carries this list itself, immediately left of the
              columns — so in that view the rail stays out of its way rather
              than showing the same thing twice. */}
          <div className={`space-y-2.5 ${isMap ? "" : "hidden"}`}>
            <span className="block text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-mute">
              Sets
            </span>
            {TIERS.map((t) => {
              const inTier = graph.collections.filter((c) => c.tier === t);
              if (inTier.length === 0) return null;
              return (
                <div key={t} className="space-y-0.5">
                  <div
                    className="flex items-center gap-1.5 border-l-2 pl-1.5"
                    style={{ borderColor: tierColor(t) }}
                  >
                    <span className="text-[10px] font-bold" style={{ color: tierColor(t) }}>
                      {TIER_META[t].plural}
                    </span>
                  </div>
                  {inTier.map((c, i) => {
                    const hidden = ui.hiddenCollections.includes(c.id);
                    const open = !isMap && ui.activeCollection === c.id;
                    // The component lane is the whole library — fifty-three
                    // names run together unless the list keeps the four groups
                    // the Components step already sorts them into.
                    const lane = c.source?.laneLabel;
                    const newLane = !!lane && lane !== inTier[i - 1]?.source?.laneLabel;
                    return (
                      <div key={c.id}>
                        {newLane ? (
                          <p className="px-1.5 pb-0.5 pt-1.5 text-[9px] font-bold uppercase tracking-[0.08em] text-fg-mute">
                            {lane}
                          </p>
                        ) : null}
                        <div
                          className={`group/coll flex items-center gap-1.5 rounded px-1.5 py-0.5 transition-colors ${
                            open ? "bg-ink-raised" : "hover:bg-ink-panel"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              // One row, two views: on the map it flies the
                              // canvas there; in the table it opens the set.
                              setActiveVariableCollection(c.id);
                              if (isMap && c.nodes[0]) focusVariable(c.nodes[0].id);
                            }}
                            className={`min-w-0 flex-1 truncate text-left text-[11.5px] hover:text-fg ${
                              hidden && isMap
                                ? "text-fg-mute line-through"
                                : open
                                  ? "font-semibold text-fg"
                                  : "text-fg-dim"
                            }`}
                            title={isMap ? `Jump to ${c.label}` : `Open ${c.label}`}
                          >
                            {c.label}
                          </button>
                          <span className="shrink-0 font-mono text-[10px] text-fg-mute">
                            {c.nodes.length}
                          </span>
                          {isMap ? (
                            <button
                              type="button"
                              onClick={() => toggleVariableCollection(c.id)}
                              title={hidden ? "Show on the map" : "Hide from the map"}
                              className="shrink-0 rounded p-0.5 text-fg-mute transition-colors hover:text-fg"
                            >
                              {hidden ? <EyeOff size={10} /> : <Eye size={10} />}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* health */}
          {graph.issues.length > 0 ? (
            <div className="space-y-1">
              <span className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-red-400">
                <TriangleAlert size={10} />
                {graph.issues.length} broken link{graph.issues.length === 1 ? "" : "s"}
              </span>
              {graph.issues.slice(0, 12).map((i) => (
                <button
                  key={`${i.nodeId}-${i.mode}-${i.type}`}
                  type="button"
                  onClick={() => focusVariable(i.nodeId)}
                  className="w-full rounded px-1.5 py-1 text-left text-[10.5px] leading-snug text-fg-mute transition-colors hover:bg-ink-panel hover:text-fg-dim"
                >
                  {i.message}
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function StageRail() {
  const [width, setWidth] = useState(260);

  useEffect(() => {
    const saved = localStorage.getItem("arkitype-stage-rail-width");
    const parsed = saved ? parseInt(saved, 10) : NaN;
    // Same reasoning as the inspector: a 13" laptop can't spare 260px of rail
    // plus 360px of inspector and still show a component gallery in one screen.
    const fallback = window.innerWidth >= 1600 ? 260 : window.innerWidth >= 1400 ? 232 : 210;
    const cap = Math.max(200, Math.round(window.innerWidth * 0.22));
    setWidth(
      !isNaN(parsed) && parsed >= 200 && parsed <= 450 ? Math.min(parsed, cap) : fallback
    );
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      if (newWidth >= 200 && newWidth <= 450) {
        setWidth(newWidth);
        localStorage.setItem("arkitype-stage-rail-width", String(newWidth));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const showRail = useDesignSystem((s) => s.panels.left);
  const activeStep = useDesignSystem((s) => s.journey.activeStep);
  const done = useDesignSystem((s) => s.journey.done);
  const visited = useDesignSystem((s) => s.journey.visited ?? {});
  const goToStep = useDesignSystem((s) => s.goToStep);

  const primitives = useDesignSystem((s) => s.primitives);
  const components = useDesignSystem((s) => s.components);
  const activeLeftTab = useDesignSystem((s) => s.activeLeftTab);
  const setActiveLeftTab = useDesignSystem((s) => s.setActiveLeftTab);
  const activeComponentId = useDesignSystem((s) => s.activeComponentId);
  const setActiveComponentId = useDesignSystem((s) => s.setActiveComponentId);
  const spacingBase = useDesignSystem((s) => s.primitives.spacingBase);
  const setSpacingBase = useDesignSystem((s) => s.setSpacingBase);

  // Store Actions
  const addFamily = useDesignSystem((s) => s.addFamily);
  const removeFamily = useDesignSystem((s) => s.removeFamily);
  const addSpacingStep = useDesignSystem((s) => s.addSpacingStep);
  const removeSpacingStep = useDesignSystem((s) => s.removeSpacingStep);
  const addRadiusStep = useDesignSystem((s) => s.addRadiusStep);
  const removeRadiusStep = useDesignSystem((s) => s.removeRadiusStep);
  const addFontRole = useDesignSystem((s) => s.addFontRole);
  const removeFontRole = useDesignSystem((s) => s.removeFontRole);
  const addTypeStep = useDesignSystem((s) => s.addTypeStep);
  const removeTypeStep = useDesignSystem((s) => s.removeTypeStep);
  const addLevel = useDesignSystem((s) => s.addLevel);
  const removeLevel = useDesignSystem((s) => s.removeLevel);

  // Copy state feedback
  const [copiedText, setCopiedText] = useState<string | null>(null);

  /**
   * "Take me to where I can add or remove these" — arriving from a primitive
   * set in Variables. The tab and the panel have already been switched on by
   * `focusTokenSection`; what's left is to put the section under the eye, and
   * to say which one it is, since a panel that merely scrolled would leave you
   * guessing what it scrolled to.
   */
  const tokensFocus = useDesignSystem((s) => s.tokensFocus);
  const tokensFocusTick = tokensFocus?.tick;
  const [flashSection, setFlashSection] = useState<string | null>(null);
  useEffect(() => {
    const section = tokensFocus?.section;
    if (!section) return;
    // A frame late: the Tokens tab may only be mounting on this same tick.
    const raf = requestAnimationFrame(() => {
      document
        .getElementById(`token-section-${section}`)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    setFlashSection(section);
    const clear = window.setTimeout(() => setFlashSection(null), 1600);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(clear);
    };
    // Keyed on the tick alone, so asking twice for the same section works.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokensFocusTick]);

  // Inline forms toggles
  const [addingSpacing, setAddingSpacing] = useState(false);
  const [spaceMultiplier, setSpaceMultiplier] = useState(20);

  const [addingRadius, setAddingRadius] = useState(false);
  const [radName, setRadName] = useState("");
  const [radValue, setRadValue] = useState(8);

  const [addingFont, setAddingFont] = useState(false);
  const [fontRole, setFontRole] = useState("");
  const [fontFamily, setFontFamilyName] = useState("Inter, sans-serif");

  const [addingScaleStep, setAddingScaleStep] = useState(false);
  const [scaleName, setScaleName] = useState("");
  const [scaleExp, setScaleExp] = useState(6);
  const [scaleAssign, setScaleAssign] = useState("H1 Display Extra");

  /**
   * A new token appended to the bottom of a long, scrolling list is easy to
   * miss — which reads as "the add button does nothing". Scroll it into view
   * and flash it so every add is visibly acknowledged.
   */
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const announce = (key: string) => {
    setFlashKey(key);
    requestAnimationFrame(() => {
      document.getElementById(`token-row-${key}`)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
    window.setTimeout(() => setFlashKey((k) => (k === key ? null : k)), 1600);
  };
  const flashClass = (key: string) =>
    flashKey === key ? "border-line-strong bg-ink-hover" : "border-transparent";

  const doneCount = STEP_ORDER.filter((id) => done[id]).length;

  // Filter — a Figma-style search toggle over the panel header rather than a
  // permanently-docked field, so the default state stays exactly as tight as
  // Figma's own Layers panel. Matches step labels, and (on the Components
  // step) the 53 part names nested underneath.
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const filterInputRef = useRef<HTMLInputElement>(null);
  const q = filterQuery.trim().toLowerCase();

  const closeFilter = () => {
    setFilterOpen(false);
    setFilterQuery("");
  };

  const filteredLanes = useMemo(() => {
    if (!q) return COMPONENT_LANES;
    return COMPONENT_LANES.map((lane) => ({
      ...lane,
      items: lane.items.filter((item) => item.label.toLowerCase().includes(q)),
    })).filter((lane) => lane.items.length > 0);
  }, [q]);

  // A part match (e.g. "button") keeps the Components row visible and its
  // tree forced open even though the word "Components" itself doesn't match —
  // otherwise the very thing you searched for would be the thing that hides.
  const hasComponentMatches = q !== "" && filteredLanes.some((l) => l.items.length > 0);

  const filteredSteps = useMemo(
    () =>
      q
        ? STEP_ORDER.filter((id) => STEP_META[id].label.toLowerCase().includes(q) || (id === "components" && hasComponentMatches))
        : STEP_ORDER,
    [q, hasComponentMatches]
  );

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => {
      setCopiedText(null);
    }, 1500);
  };

  const handleAddSpacing = (e: React.FormEvent) => {
    e.preventDefault();
    const next = Number(spaceMultiplier);
    if (!Number.isFinite(next) || next <= 0) return;
    addSpacingStep(next);
    setAddingSpacing(false);
    announce(`spacing-${useDesignSystem.getState().primitives.spacing.length}`);
  };

  const handleAddRadius = (e: React.FormEvent) => {
    e.preventDefault();
    if (!radName) return;
    addRadiusStep(radName, Number(radValue));
    setRadName("");
    setAddingRadius(false);
    announce(`radius-${radName}`);
  };

  const handleAddFont = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fontRole || !fontFamily) return;
    addFontRole(fontRole, fontFamily);
    setAddingFont(false);
    announce(`font-${fontRole}`);
    setFontRole("");
  };

  const handleAddScaleStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scaleName) return;
    addTypeStep(scaleName, scaleAssign, Number(scaleExp));
    setAddingScaleStep(false);
    announce(`scale-${scaleName}`);
    setScaleName("");
  };

  // Put away entirely — not narrowed to a strip of icons. A half-rail is the
  // worst of both: it still costs the canvas 48px and it can no longer say what
  // anything is. The switch that brings it back lives in the top bar, which is
  // always on screen (see PanelToggles).
  if (!showRail) return null;

  return (
    <nav
      style={{ width: `${width}px` }}
      className="relative flex shrink-0 flex-col border-r border-line bg-ink select-none"
    >
      {/* Top Figma Tab Switcher — three panels now, so on a narrow rail only the
          active tab keeps its label and the other two fall back to their icon. */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-line px-2.5 bg-ink">
        <div className="flex min-w-0 items-center gap-1">
          {(
            [
              { id: "layers" as const, label: "Layers", icon: Layers, domId: undefined },
              { id: "tokens" as const, label: "Tokens", icon: Database, domId: "stage-rail-tokens-tab" },
              { id: "variables" as const, label: "Variables", icon: Waypoints, domId: "stage-rail-variables-tab" },
            ]
          ).map((tab) => {
            const active = activeLeftTab === tab.id;
            const Icon = tab.icon;
            const showLabel = active || width >= 252;
            return (
              <button
                key={tab.id}
                type="button"
                id={tab.domId}
                onClick={() => setActiveLeftTab(tab.id)}
                title={tab.label}
                aria-label={tab.label}
                aria-pressed={active}
                className={`flex items-center gap-1.5 rounded px-2 py-1 text-[12px] font-bold tracking-wide transition-colors ${
                  active ? "bg-ink-hover text-fg" : "text-fg-mute hover:text-fg-dim"
                }`}
              >
                <Icon size={11} />
                {showLabel ? tab.label : null}
              </button>
            );
          })}
        </div>

        {activeLeftTab === "layers" ? (
          <button
            type="button"
            onClick={() => {
              if (filterOpen) closeFilter();
              else {
                setFilterOpen(true);
                requestAnimationFrame(() => filterInputRef.current?.focus());
              }
            }}
            title="Filter layers"
            aria-label="Filter layers"
            aria-pressed={filterOpen}
            className={`rounded p-1 transition-colors ${
              filterOpen ? "text-fg bg-ink-hover" : "text-fg-mute hover:text-fg-dim"
            }`}
          >
            <Search size={12} />
          </button>
        ) : null}
      </div>

      {/* Inline filter — Figma-pattern toggle, not a permanently docked field */}
      {activeLeftTab === "layers" && filterOpen ? (
        <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-line px-2.5 bg-ink">
          <Search size={11} className="shrink-0 text-fg-mute" />
          <input
            ref={filterInputRef}
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeFilter();
            }}
            placeholder="Filter layers…"
            className="h-full min-w-0 flex-1 bg-transparent text-[12px] text-fg placeholder:text-fg-mute focus:outline-none"
          />
          <button
            type="button"
            onClick={closeFilter}
            title="Clear filter"
            aria-label="Clear filter"
            className="shrink-0 rounded p-0.5 text-fg-mute hover:text-fg transition-colors"
          >
            <X size={11} />
          </button>
        </div>
      ) : null}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeLeftTab === "layers" ? (
          /* Layers View (step stages & components hierarchical tree) */
          <div className="px-3 py-3">
            {q && filteredSteps.length === 0 && filteredLanes.every((l) => l.items.length === 0) ? (
              <p className="px-3 py-2 text-[12px] text-fg-mute">No matches for &ldquo;{filterQuery}&rdquo;</p>
            ) : null}
            <div className="space-y-1">
              {filteredSteps.map((id) => {
                const m = STEP_META[id];
                const active = activeStep === id;
                const isDone = !!done[id];
                const isVisited = !!visited[id];
                const isComponentsStep = id === "components";

                return (
                  <div key={id} className="flex flex-col">
                    <button
                      type="button"
                      title={m.blurb}
                      onClick={() => goToStep(id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left transition-colors ${
                        active ? "bg-ink-raised" : "hover:bg-ink-panel"
                      }`}
                    >
                      <span className={`w-5 shrink-0 font-mono text-[11.5px] ${active ? "text-fg" : "text-fg-mute"}`}>
                        {m.n}
                      </span>
                      <span
                        className={`flex-1 text-[13.5px] ${
                          active
                            ? "font-medium text-fg"
                            : isDone || isVisited
                              ? "text-fg-dim"
                              : "text-fg-mute"
                        }`}
                      >
                        {m.label}
                      </span>
                      {isDone ? (
                        <Check size={12} className="shrink-0 text-fg-dim" />
                      ) : null}
                    </button>

                    {/* Hierarchical sub-tree list of component layers grouped by Lane */}
                    {isComponentsStep &&
                      (activeStep === "components" || activeStep === "ship" || activeStep === "preview" || hasComponentMatches) && (
                      <div className="mt-1.5 border-l border-line ml-[21px] pl-3.5 space-y-3 py-1">
                        {filteredLanes.map((lane) => (
                          <div key={lane.label} className="space-y-1">
                            <span className="block px-2 text-[9px] font-bold uppercase tracking-[0.08em] text-fg-mute">
                              {lane.label}
                            </span>
                            <div className="space-y-0.5 border-l border-line/30 ml-2 pl-2">
                              {lane.items.map((item) => {
                                const compActive = activeComponentId === item.id && activeStep === "components";
                                const status = componentStatus(components[item.id]);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                      goToStep("components");
                                      setActiveComponentId(item.id);
                                    }}
                                    className={`flex w-full items-center gap-1.5 rounded px-2 py-0.5 text-left text-[12px] transition-colors ${
                                      compActive ? "bg-ink-raised text-fg font-semibold" : "text-fg-mute hover:text-fg hover:bg-ink-panel"
                                    }`}
                                  >
                                    <span className="opacity-40 font-mono text-[9px]">◇</span>
                                    <span className="truncate">{item.label}</span>
                                    {status !== "ready" ? (
                                      <span
                                        title={status === "beta" ? "Beta" : "Deprecated"}
                                        className={`ml-auto shrink-0 rounded px-1 py-px font-mono text-[8px] uppercase tracking-wider ${
                                          status === "beta"
                                            ? "bg-ink-raised text-fg-dim"
                                            : "bg-ink-raised text-fg-mute line-through"
                                        }`}
                                      >
                                        {status === "beta" ? "β" : "dep"}
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeLeftTab === "variables" ? (
          /* Variables View (navigator for the token map on the canvas) */
          <VariablesPanel />
        ) : (
          /* Tokens Studio View (defined primitives & semantics) */
          <div className="px-4 py-3 space-y-6">
            <div>
              {/* Density Switcher */}
              <div className="mb-2 rounded-lg bg-ink-panel p-2 border border-line">
                <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-mute block mb-1.5">
                  Density
                </span>
                <div className="grid grid-cols-3 gap-1 bg-ink border border-line rounded p-0.5">
                  {(["compact", "comfortable", "loose"] as const).map((d) => {
                    const isSelected = 
                      d === "compact" ? spacingBase === 3 :
                      d === "comfortable" ? spacingBase === 4 :
                      spacingBase === 6;
                    const label = d.charAt(0).toUpperCase() + d.slice(1);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          if (d === "compact") setSpacingBase(3);
                          else if (d === "comfortable") setSpacingBase(4);
                          else setSpacingBase(6);
                        }}
                        className={`rounded py-1 text-[10px] font-bold capitalize transition-colors ${
                          isSelected ? "bg-fg text-ink" : "text-fg-mute hover:text-fg-dim"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Colors Section */}
            <TokenSection
              id="colors"
              flash={flashSection === "colors"}
              title="Colors"
              addLabel="Add colour family"
              onAdd={() => {
                addFamily();
                const fams = useDesignSystem.getState().primitives.colorFamilies;
                announce(`family-${fams[fams.length - 1]?.id ?? ""}`);
              }}
            >
              <div className="space-y-3 pt-1">
                {primitives.colorFamilies.map((fam) => {
                  const labels = rampStepLabels(fam.steps);
                  const flashId = `family-${fam.id}`;
                  return (
                    <div
                      key={fam.id}
                      id={`token-row-${flashId}`}
                      className={`space-y-1 rounded-md border p-1 transition-colors ${flashClass(flashId)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: fam.seed }}
                          />
                          <span className="text-[12px] font-medium text-fg-dim capitalize">{fam.name}</span>
                        </div>
                        {primitives.colorFamilies.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFamily(fam.id)}
                            className="text-fg-mute hover:text-red-500 rounded p-0.5 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>

                      {/* shades */}
                      <div className="grid grid-cols-2 gap-1 pl-3.5">
                        {labels.map((step: number, index: number) => {
                          const ramp = primitives.colors[fam.id] ?? [];
                          const refName = `{colors.${fam.id}-${step}}`;
                          const value = ramp[index] || "#ffffff";
                          const isCopied = copiedText === refName;

                          return (
                            <button
                              key={step}
                              type="button"
                              onClick={() => handleCopy(refName)}
                              className="group flex items-center gap-1.5 rounded p-0.5 hover:bg-ink-panel text-left transition-colors border border-transparent hover:border-line"
                              title={`Click to copy: ${refName}`}
                            >
                              <span
                                className="h-3 w-3 shrink-0 rounded border border-line"
                                style={{ backgroundColor: value }}
                              />
                              <div className="min-w-0 flex-1 flex flex-col">
                                <span className="text-[10.5px] font-mono text-fg leading-none">{step}</span>
                                <span className="text-[9px] font-mono text-fg-mute leading-none mt-0.5 truncate">{value}</span>
                              </div>
                              <span className="opacity-0 group-hover:opacity-100 text-[8px] text-fg-mute mr-0.5">
                                {isCopied ? <Check size={8} /> : <Copy size={8} />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TokenSection>

            {/* Spacing Section */}
            <TokenSection
              id="spacing"
              flash={flashSection === "spacing"}
              title="Spacing"
              addLabel="Add spacing step"
              expanded={addingSpacing}
              onAdd={() => {
                const next = primitives.spacingMultipliers;
                const last = next[next.length - 1] ?? 16;
                const prev = next[next.length - 2] ?? 12;
                setSpaceMultiplier(last + (last - prev));
                setAddingSpacing((v) => !v);
              }}
            >
              {addingSpacing && (
                <AddForm onSubmit={handleAddSpacing} onCancel={() => setAddingSpacing(false)}>
                  <label className="flex items-center gap-2">
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-fg-mute">
                      Multiplier
                    </span>
                    <input
                      type="number"
                      min={0.25}
                      step={0.25}
                      value={spaceMultiplier}
                      onChange={(e) => setSpaceMultiplier(Number(e.target.value))}
                      className="w-0 flex-1 rounded border border-line bg-ink px-1.5 py-0.5 font-mono text-[11.5px] text-fg"
                      required
                      autoFocus
                    />
                    <span className="shrink-0 font-mono text-[10px] text-fg-mute">
                      ×{spacingBase} = {Math.round(spaceMultiplier * spacingBase)}px
                    </span>
                  </label>
                </AddForm>
              )}

              <div className="space-y-1 pt-1 pl-1">
                {primitives.spacing.map((px, i) => {
                  const stepIndex = i + 1;
                  const refName = `{spacing.${stepIndex}}`;
                  const isCopied = copiedText === refName;

                  return (
                    <div
                      key={i}
                      id={`token-row-spacing-${stepIndex}`}
                      className={`group flex items-center justify-between rounded border px-1.5 py-0.5 transition-colors hover:border-line hover:bg-ink-panel ${flashClass(`spacing-${stepIndex}`)}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(refName)}
                        className="flex-1 flex items-center justify-between text-left min-w-0"
                        title={`Click to copy: ${refName}`}
                      >
                        <span className="text-[12px] font-mono text-fg-dim">space-{stepIndex}</span>
                        <span className="text-[11px] font-mono text-fg-mute mr-2">{px}px</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity"
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                        {primitives.spacingMultipliers.length > 8 && i >= 8 && (
                          <button
                            type="button"
                            onClick={() => removeSpacingStep(i)}
                            className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-red-500 transition-opacity"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TokenSection>

            {/* Radius Section */}
            <TokenSection
              id="radius"
              flash={flashSection === "radius"}
              title="Radius"
              addLabel="Add radius token"
              expanded={addingRadius}
              onAdd={() => setAddingRadius((v) => !v)}
            >
              {addingRadius && (
                <AddForm onSubmit={handleAddRadius} onCancel={() => setAddingRadius(false)}>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Name (e.g. 3xl)"
                      value={radName}
                      onChange={(e) => setRadName(e.target.value)}
                      className="w-0 flex-1 bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                      required
                      autoFocus
                    />
                    <input
                      type="number"
                      placeholder="px"
                      value={radValue}
                      onChange={(e) => setRadValue(Number(e.target.value))}
                      className="w-16 bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                      required
                    />
                  </div>
                </AddForm>
              )}

              <div className="space-y-1 pt-1 pl-1">
                {(primitives.radiusNames ?? RADII_NAMES).map((name, i) => {
                  const px = primitives.radii[i] ?? 0;
                  const refName = `{radius.${name}}`;
                  const isCopied = copiedText === refName;

                  return (
                    <div
                      key={i}
                      id={`token-row-radius-${name}`}
                      className={`group flex items-center justify-between rounded border px-1.5 py-0.5 transition-colors hover:border-line hover:bg-ink-panel ${flashClass(`radius-${name}`)}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(refName)}
                        className="flex-1 flex items-center justify-between text-left min-w-0"
                        title={`Click to copy: ${refName}`}
                      >
                        <span className="text-[12px] font-mono text-fg-dim">{name}</span>
                        <span className="text-[11px] font-mono text-fg-mute mr-2">{px}px</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity"
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                        {name !== "none" && name !== "full" && (
                          <button
                            type="button"
                            onClick={() => removeRadiusStep(i)}
                            className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-red-500 transition-opacity"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TokenSection>

            {/* Typography Families Section */}
            <TokenSection
              id="fonts"
              flash={flashSection === "fonts"}
              title="Font Families"
              addLabel="Add font role"
              expanded={addingFont}
              onAdd={() => setAddingFont((v) => !v)}
            >
              {addingFont && (
                <AddForm onSubmit={handleAddFont} onCancel={() => setAddingFont(false)}>
                  <input
                    type="text"
                    placeholder="Role (e.g. quote)"
                    value={fontRole}
                    onChange={(e) => setFontRole(e.target.value)}
                    className="w-full bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                    required
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="Font family (e.g. Inter, sans-serif)"
                    value={fontFamily}
                    onChange={(e) => setFontFamilyName(e.target.value)}
                    className="w-full bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                    required
                  />
                </AddForm>
              )}

              <div className="space-y-1.5 pt-1 pl-1">
                {Object.entries(primitives.typography.fontRoles).map(([role, r]) => {
                  const refName = `{fonts.${role}}`;
                  const isCopied = copiedText === refName;

                  return (
                    <div
                      key={role}
                      id={`token-row-font-${role}`}
                      className={`group flex flex-col gap-0.5 rounded border px-1.5 py-1 transition-colors hover:border-line hover:bg-ink-panel ${flashClass(`font-${role}`)}`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="text-[12px] font-bold text-fg-dim capitalize"
                          title={`Click to copy: ${refName}`}
                        >
                          {role}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(refName)}
                            className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity"
                          >
                            {isCopied ? <Check size={10} /> : <Copy size={10} />}
                          </button>
                          {role !== "body" && role !== "mono" && role !== "heading" && role !== "display" && (
                            <button
                              type="button"
                              onClick={() => removeFontRole(role)}
                              className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-red-500 transition-opacity"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-fg-mute truncate">{r.family}</span>
                    </div>
                  );
                })}
              </div>
            </TokenSection>

            {/* Typography Scale Steps Section */}
            <TokenSection
              id="type-steps"
              flash={flashSection === "type-steps"}
              title="Font Scale Steps"
              addLabel="Add font scale step"
              expanded={addingScaleStep}
              onAdd={() => setAddingScaleStep((v) => !v)}
            >
              {addingScaleStep && (
                <AddForm onSubmit={handleAddScaleStep} onCancel={() => setAddingScaleStep(false)}>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Name (e.g. 5xl)"
                      value={scaleName}
                      onChange={(e) => setScaleName(e.target.value)}
                      className="w-0 flex-1 bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                      required
                      autoFocus
                    />
                    <input
                      type="number"
                      placeholder="Exp"
                      value={scaleExp}
                      onChange={(e) => setScaleExp(Number(e.target.value))}
                      className="w-16 bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Assignment (e.g. Hero)"
                    value={scaleAssign}
                    onChange={(e) => setScaleAssign(e.target.value)}
                    className="w-full bg-ink border border-line text-[11.5px] px-1.5 py-0.5 rounded text-fg"
                    required
                  />
                </AddForm>
              )}

              <div className="space-y-1 pt-1 pl-1">
                {generateTypeScale(
                  primitives.typography.baseSize,
                  primitives.typography.scaleFactor,
                  {
                    rounding: primitives.typography.rounding,
                    sizeOverrides: primitives.typography.sizeOverrides,
                  },
                  primitives.typography.stepDefs ?? STEP_DEFS
                ).map((s) => {
                  const refSize = `{fontSize.${s.name}}`;
                  const isCopied = copiedText === refSize;

                  return (
                    <div
                      key={s.name}
                      id={`token-row-scale-${s.name}`}
                      className={`group flex items-center justify-between rounded border px-1.5 py-0.5 transition-colors hover:border-line hover:bg-ink-panel ${flashClass(`scale-${s.name}`)}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(refSize)}
                        className="flex-1 flex items-center justify-between text-left min-w-0"
                        title={`Click to copy: ${refSize}`}
                      >
                        <span className="text-[12px] font-mono text-fg-dim">{s.name}</span>
                        <span className="text-[11px] font-mono text-fg-mute mr-2">{s.size}px</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(refSize)}
                          className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity"
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                        {!["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"].includes(s.name) && (
                          <button
                            type="button"
                            onClick={() => removeTypeStep(s.name)}
                            className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-red-500 transition-opacity"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TokenSection>

            {/* Elevation Section */}
            <TokenSection
              id="elevation"
              flash={flashSection === "elevation"}
              title="Elevation (Shadows)"
              addLabel="Add elevation level"
              onAdd={() => {
                addLevel();
                const levels = useDesignSystem.getState().primitives.elevation.light;
                announce(`shadow-${levels[levels.length - 1]?.name ?? ""}`);
              }}
            >
              <div className="space-y-1 pt-1 pl-1">
                {primitives.elevation.light.map((level, i) => {
                  const refName = `{shadows.${level.name}}`;
                  const isCopied = copiedText === refName;

                  return (
                    <div
                      key={level.name}
                      id={`token-row-shadow-${level.name}`}
                      className={`group flex items-center justify-between rounded border px-1.5 py-0.5 transition-colors hover:border-line hover:bg-ink-panel ${flashClass(`shadow-${level.name}`)}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleCopy(refName)}
                        className="flex-1 flex items-center justify-between text-left min-w-0"
                        title={`Click to copy: ${refName}`}
                      >
                        <span className="text-[12px] font-mono text-fg-dim truncate">{level.name}</span>
                        <span className="text-[11px] font-mono text-fg-mute mr-2 truncate">y: {level.y}px</span>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity"
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                        {primitives.elevation.light.length > 1 && (
                          <button
                            type="button"
                            title="Remove level"
                            onClick={() => removeLevel(i)}
                            className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-red-500 transition-opacity"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TokenSection>

            {/* Motion Section — durations and easings are a fixed vocabulary
                (fast/base/slow, four curves); their values are edited on the
                Motion step, so there is nothing to add here. */}
            <TokenSection id="motion" flash={flashSection === "motion"} title="Motion">
              <div className="space-y-2 pt-1 pl-1">
                <div>
                  <span className="text-[10px] font-bold text-fg-mute uppercase tracking-wide">Durations</span>
                  {Object.entries(primitives.motion.durations).map(([name, ms]) => {
                    const refName = `{motion.duration-${name}}`;
                    const isCopied = copiedText === refName;
                    return (
                      <div
                        key={name}
                        className="group flex items-center justify-between rounded px-1.5 py-0.5 hover:bg-ink-panel border border-transparent hover:border-line"
                      >
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="flex-1 flex items-center justify-between text-left min-w-0"
                          title={`Click to copy: ${refName}`}
                        >
                          <span className="text-[12px] font-mono text-fg-dim">{name}</span>
                          <span className="text-[11px] font-mono text-fg-mute mr-2">{ms}ms</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity"
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-fg-mute uppercase tracking-wide">Easings</span>
                  {primitives.motion.easings.map((ease) => {
                    const refName = `{motion.ease-${ease.name}}`;
                    const isCopied = copiedText === refName;
                    return (
                      <div
                        key={ease.name}
                        className="group flex items-center justify-between rounded px-1.5 py-0.5 hover:bg-ink-panel border border-transparent hover:border-line"
                      >
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="flex-1 flex items-center justify-between text-left min-w-0"
                          title={`Click to copy: ${refName}`}
                        >
                          <span className="text-[12px] font-mono text-fg-dim truncate">{ease.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(refName)}
                          className="opacity-0 group-hover:opacity-100 text-fg-mute p-0.5 rounded hover:text-fg transition-opacity shrink-0"
                        >
                          {isCopied ? <Check size={10} /> : <Copy size={10} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TokenSection>
          </div>
        )}
      </div>

      {/* Progress Footer (only visible when in Layers tab) */}
      {activeLeftTab === "layers" && (
        <div className="border-t border-line px-6 py-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[11px] text-fg-mute">Progress</span>
            <span className="font-mono text-[11px] text-fg-dim">
              {doneCount} / {STEP_ORDER.length}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-fg transition-all duration-300"
              style={{ width: `${(doneCount / STEP_ORDER.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      {/* Resizer Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 bottom-0 right-0 w-1 cursor-col-resize hover:bg-line-strong/50 active:bg-focus transition-colors z-30"
        style={{ transform: "translateX(50%)" }}
      />
    </nav>
  );
}
