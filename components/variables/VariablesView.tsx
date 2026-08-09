"use client";

/**
 * The Variables workspace — the map plus its inspector, laid out on the same
 * canvas/aside rhythm as every step surface (see StepScaffold) so switching
 * into it doesn't feel like leaving the tool.
 *
 * It replaces the step canvas rather than sitting inside one: the map spans all
 * eight steps' worth of tokens at once, so it has no single step to belong to.
 * The rail, the top bar, and the step you were on are all untouched — click
 * Layers or Tokens and you're back exactly where you were.
 */
import { useEffect, useMemo, useState } from "react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { buildVariableGraph } from "@/lib/variableGraph";
import { VariableCanvas } from "@/components/variables/VariableCanvas";
import { VariableInspector } from "@/components/variables/VariableInspector";

const MIN_INSPECTOR_WIDTH = 300;

export function VariablesView() {
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);
  const components = useDesignSystem((s) => s.components);
  const activeProjectId = useDesignSystem((s) => s.activeProjectId);
  const markCheckpoint = useDesignSystem((s) => s.markCheckpoint);

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
      <VariableCanvas graph={graph} />
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
    </div>
  );
}
