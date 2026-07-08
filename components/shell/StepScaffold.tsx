"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  STEP_META,
  StepId,
  nextStep,
  prevStep,
  useDesignSystem,
} from "@/store/useDesignSystem";

export function StepScaffold({
  step,
  title,
  lede,
  aside,
  children,
  footerNote,
  tabs,
  hideHeader,
}: {
  step: StepId;
  title: string;
  lede: string;
  aside: ReactNode;
  children: ReactNode;
  footerNote?: ReactNode;
  tabs?: ReactNode;
  hideHeader?: boolean;
}) {
  const [inspectorWidth, setInspectorWidth] = useState(360);

  useEffect(() => {
    const saved = localStorage.getItem("arkitype-inspector-width");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 280 && parsed <= 600) {
        setInspectorWidth(parsed);
      }
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = inspectorWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = startWidth - (moveEvent.clientX - startX);
      if (newWidth >= 280 && newWidth <= 600) {
        setInspectorWidth(newWidth);
        localStorage.setItem("arkitype-inspector-width", String(newWidth));
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const goToStep = useDesignSystem((s) => s.goToStep);
  const completeStep = useDesignSystem((s) => s.completeStep);
  const done = useDesignSystem((s) => s.journey.done);

  const meta = STEP_META[step];
  const next = nextStep(step);
  const prev = prevStep(step);
  const finished = step === "ship" && !!done.ship;

  // Global Keyboard Shortcuts (⌘/Ctrl + ArrowRight/ArrowLeft)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof window !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      if (modifier) {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          if (next) {
            completeStep(step);
          } else if (step === "ship") {
            completeStep("ship");
          }
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          if (prev) {
            goToStep(prev);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [step, next, prev, completeStep, goToStep]);

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* Center Canvas */}
      <div className="flex-1 min-w-0 canvas-dotted overflow-y-auto relative flex justify-center p-12">
        <div id="workspace-preview-canvas" className="w-full max-w-5xl my-auto rounded-xl border border-line bg-ink-panel shadow-2xl p-8 min-h-[500px] flex flex-col justify-between">
          <div className="w-full h-full flex-1">
            {children}
          </div>
        </div>
      </div>

      {/* Right Property Inspector */}
      <aside
        id="workspace-right-inspector"
        style={{ width: `${inspectorWidth}px` }}
        className="relative shrink-0 border-l border-line bg-ink-panel flex flex-col h-full overflow-y-auto select-none"
      >
        {/* Resizer Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 bottom-0 left-0 w-1 cursor-col-resize hover:bg-line-strong/50 active:bg-focus transition-colors z-30"
          style={{ transform: "translateX(-50%)" }}
        />
        <div className="flex-1 overflow-y-auto px-5 py-6">
          {!hideHeader && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-fg-mute">
                Step {meta.n} — {meta.label}
              </p>
              <h1 className="mt-2 text-[22px] font-extrabold leading-tight tracking-tight text-fg">
                {title}
              </h1>
              <p className="mt-2.5 text-[14px] leading-relaxed text-fg-dim">
                {lede}
              </p>
            </>
          )}

          {tabs ? <div className="mt-4 border-b border-line pb-2">{tabs}</div> : null}

          <div className={`${hideHeader ? "" : "mt-5"} space-y-4`}>
            {aside}
          </div>
        </div>

        {/* Inspector Bottom Wizard Navigation */}
        <div className="mt-auto border-t border-line bg-ink p-4 flex flex-col gap-3">
          {footerNote ? (
            <div className="text-[11px] text-fg-mute text-center leading-normal">
              {footerNote}
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2">
            {prev ? (
              <button
                type="button"
                onClick={() => goToStep(prev)}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-ink px-2.5 py-1.5 text-[12px] font-medium text-fg-mute transition-colors hover:text-fg hover:bg-ink-hover"
              >
                <ArrowLeft size={13} />
                Back
              </button>
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={() => completeStep(step)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-fg px-3 text-[12px] font-medium text-ink transition hover:opacity-90 ml-auto"
            >
              {finished ? (
                <>
                  Shipped
                  <Check size={13} />
                </>
              ) : next ? (
                <>
                  Continue
                  <ArrowRight size={13} />
                </>
              ) : (
                <>
                  Finish system
                  <Check size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
