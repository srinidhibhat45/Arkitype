"use client";

/**
 * The build order, made visible. Seven ordered stages with completion state
 * and a progress meter — the rail teaches how a design system comes together.
 */
import { Check } from "lucide-react";
import {
  STEP_META,
  STEP_ORDER,
  useDesignSystem,
} from "@/store/useDesignSystem";

export function StageRail() {
  const activeStep = useDesignSystem((s) => s.journey.activeStep);
  const done = useDesignSystem((s) => s.journey.done);
  const goToStep = useDesignSystem((s) => s.goToStep);

  const doneCount = STEP_ORDER.filter((id) => done[id]).length;

  return (
    <nav className="flex w-60 shrink-0 flex-col border-r border-line bg-ink">
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-3 text-[11px] font-medium uppercase tracking-[0.1em] text-fg-mute">
          Build order
        </p>
        <div className="space-y-0.5">
          {STEP_ORDER.map((id) => {
            const m = STEP_META[id];
            const active = activeStep === id;
            const isDone = !!done[id];
            return (
              <button
                key={id}
                type="button"
                title={m.blurb}
                onClick={() => goToStep(id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                  active ? "bg-ink-raised" : "hover:bg-ink-panel"
                }`}
              >
                <span
                  className={`w-5 shrink-0 font-mono text-[11px] ${
                    active ? "text-fg" : "text-fg-mute"
                  }`}
                >
                  {m.n}
                </span>
                <span
                  className={`flex-1 text-[13px] ${
                    active
                      ? "font-medium text-fg"
                      : isDone
                        ? "text-fg-dim"
                        : "text-fg-mute"
                  }`}
                >
                  {m.label}
                </span>
                {isDone ? (
                  <Check size={13} className="shrink-0 text-fg-dim" />
                ) : active ? (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-fg" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

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
    </nav>
  );
}
