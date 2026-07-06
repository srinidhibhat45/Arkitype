"use client";

/**
 * Every step shares one narrative shape: a numbered kicker, a title, a
 * principle line explaining WHY this step exists, quiet controls on the left,
 * the live canvas as the hero, and a Continue footer that advances the build.
 */
import type { ReactNode } from "react";
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
}: {
  step: StepId;
  title: string;
  lede: string;
  aside: ReactNode;
  children: ReactNode;
  footerNote?: ReactNode;
}) {
  const goToStep = useDesignSystem((s) => s.goToStep);
  const completeStep = useDesignSystem((s) => s.completeStep);
  const done = useDesignSystem((s) => s.journey.done);

  const meta = STEP_META[step];
  const next = nextStep(step);
  const prev = prevStep(step);
  const finished = step === "ship" && !!done.ship;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 overflow-x-auto">
        <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-line px-6 py-8">
          {aside}
        </aside>

        <div className="min-w-[560px] flex-1 overflow-y-auto">
          <header className="px-10 pb-2 pt-9">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-fg-mute">
              Step {meta.n} — {meta.label}
            </p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-fg">
              {title}
            </h1>
            <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-fg-dim">
              {lede}
            </p>
          </header>
          <div className="px-10 pb-14 pt-6">{children}</div>
        </div>
      </div>

      <footer className="flex h-16 shrink-0 items-center gap-4 border-t border-line bg-ink px-6">
        {prev ? (
          <button
            type="button"
            onClick={() => goToStep(prev)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-fg-mute transition-colors hover:text-fg"
          >
            <ArrowLeft size={14} />
            {STEP_META[prev].label}
          </button>
        ) : (
          <span />
        )}

        <div className="flex-1 text-center text-[12px] text-fg-mute">
          {footerNote ?? ""}
        </div>

        <button
          type="button"
          onClick={() => completeStep(step)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-fg px-4 text-[13px] font-medium text-ink transition-colors hover:bg-neutral-300"
        >
          {finished ? (
            <>
              Shipped
              <Check size={14} />
            </>
          ) : next ? (
            <>
              Continue — {STEP_META[next].label}
              <ArrowRight size={14} />
            </>
          ) : (
            <>
              Finish system
              <Check size={14} />
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
