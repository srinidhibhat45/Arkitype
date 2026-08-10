"use client";

/**
 * The Variables workspace — two views of one graph, plus the inspector they
 * share, laid out on the same canvas/aside rhythm as every step surface (see
 * StepScaffold) so switching into it doesn't feel like leaving the tool.
 *
 * The table is where the work happens: sets down the left, modes across the
 * top, the shape a designer already knows. The map answers the question a table
 * can't — what feeds this, and what breaks if I change it. Neither owns any
 * token state; both write to the same store the Colour and Components steps do.
 *
 * It replaces the step canvas rather than sitting inside one: Variables spans
 * all eight steps' worth of tokens at once, so it has no single step to belong
 * to. The rail, the top bar, and the step you were on are all untouched — click
 * Layers or Tokens and you're back exactly where you were.
 */
import { useEffect, useMemo, useState } from "react";
import { Network, Table2 } from "lucide-react";
import { VarView, useDesignSystem } from "@/store/useDesignSystem";
import { buildVariableGraph } from "@/lib/variableGraph";
import { VariableCanvas } from "@/components/variables/VariableCanvas";
import { VariableTable } from "@/components/variables/VariableTable";
import { VariableInspector } from "@/components/variables/VariableInspector";
import { NewSetPanel } from "@/components/variables/NewVariableSet";

const MIN_INSPECTOR_WIDTH = 300;

const VIEWS: Array<{ id: VarView; label: string; icon: typeof Table2; hint: string }> = [
  {
    id: "table",
    label: "Table",
    icon: Table2,
    hint: "Sets down the left, modes across the top — the everyday editing view",
  },
  {
    id: "map",
    label: "Map",
    icon: Network,
    hint: "The same variables as a graph — what feeds what, and what depends on it",
  },
];

export function VariablesView() {
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);
  const components = useDesignSystem((s) => s.components);
  const activeProjectId = useDesignSystem((s) => s.activeProjectId);
  const markCheckpoint = useDesignSystem((s) => s.markCheckpoint);
  const view = useDesignSystem((s) => s.variablesUI.view);
  const setView = useDesignSystem((s) => s.setVariableView);
  const setActiveVariableCollection = useDesignSystem((s) => s.setActiveVariableCollection);
  // The create panel is opened from three places — the table's sets list, the
  // map, and the rail — so which of them is showing is the store's business.
  const creating = useDesignSystem((s) => s.variablesUI.creating);
  const setCreating = useDesignSystem((s) => s.setVariablesCreating);
  const showInspector = useDesignSystem((s) => s.panels.right);

  const graph = useMemo(
    () => buildVariableGraph({ primitives, semantics, components }),
    [primitives, semantics, components]
  );

  // Pin where the file stood on arrival, so Reset has somewhere to go back to.
  // Re-pinned on every entry (and on switching files): "since you opened
  // Variables" is the promise, and leaving and returning starts a new sitting.
  useEffect(() => {
    markCheckpoint();
  }, [markCheckpoint, activeProjectId]);

  // Same width contract as the step inspector, and the same stored preference —
  // one aside width across the whole workspace, however you got there.
  const [inspectorWidth, setInspectorWidth] = useState(360);
  useEffect(() => {
    const saved = localStorage.getItem("arkitype-inspector-width");
    const parsed = saved ? parseInt(saved, 10) : NaN;
    const cap = Math.max(MIN_INSPECTOR_WIDTH, Math.round(window.innerWidth * 0.32));
    setInspectorWidth(
      !isNaN(parsed) && parsed >= MIN_INSPECTOR_WIDTH && parsed <= 600
        ? Math.min(parsed, cap)
        : window.innerWidth >= 1600
          ? 380
          : 340
    );
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = inspectorWidth;
    const move = (ev: MouseEvent) => {
      const next = startWidth - (ev.clientX - startX);
      if (next >= MIN_INSPECTOR_WIDTH && next <= 600) {
        setInspectorWidth(next);
        localStorage.setItem("arkitype-inspector-width", String(next));
      }
    };
    const up = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  };

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {/* which of the two views is showing — the only chrome they share */}
        <div className="flex h-[38px] shrink-0 items-center gap-2 border-b border-line bg-ink-panel px-3">
          <div className="flex rounded-md border border-line bg-ink p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                title={v.hint}
                aria-pressed={view === v.id}
                className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                  view === v.id ? "bg-fg text-ink" : "text-fg-mute hover:text-fg"
                }`}
              >
                <v.icon size={12} />
                {v.label}
              </button>
            ))}
          </div>
          <p className="truncate text-[10.5px] text-fg-mute">
            {view === "table"
              ? "Every variable in the file, by set — click a value to point it somewhere else."
              : "Click a variable, a card, or a single wire to hold it forward until you press Esc. Click a row's + for a list of everything it can join, or drag it onto one."}
          </p>
        </div>

        {view === "table" ? (
          <VariableTable graph={graph} onNewSet={(kind) => setCreating(true, kind)} />
        ) : (
          <VariableCanvas graph={graph} onNewSet={(kind) => setCreating(true, kind)} />
        )}


        {creating ? (
          <NewSetPanel
            onClose={(createdId) => {
              setCreating(false);
              // Land on what was just made. The graph this render was built
              // from predates the write, so the id is all we can go on — the
              // table resolves it against the rebuilt one.
              if (createdId) setActiveVariableCollection(createdId);
            }}
          />
        ) : null}
      </div>

      {/* Put away with the same switch every other inspector answers to. The
          map and the table lose nothing by it — everything the inspector does
          can also be done in place, on the row itself. */}
      {showInspector ? (
        <aside
          style={{ width: `${inspectorWidth}px` }}
          className="relative flex h-full shrink-0 flex-col border-l border-line bg-ink-panel"
        >
          <div
            onMouseDown={handleMouseDown}
            className="absolute bottom-0 left-0 top-0 z-30 w-1 cursor-col-resize transition-colors hover:bg-line-strong/50 active:bg-focus"
            style={{ transform: "translateX(-50%)" }}
          />
          <VariableInspector graph={graph} />
        </aside>
      ) : null}
    </div>
  );
}
