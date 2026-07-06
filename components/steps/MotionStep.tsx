"use client";

/**
 * Step 05 — Motion. Durations and easing curves as first-class foundation
 * tokens. Every value is entered directly; the canvas replays each curve on
 * demand so the choice is felt, not imagined. Components consume these via
 * --ark-duration-* / --ark-ease-* — nothing animates ad hoc.
 */
import { useState } from "react";
import { Play } from "lucide-react";
import {
  DURATION_NAMES,
  DurationName,
  useDesignSystem,
} from "@/store/useDesignSystem";
import {
  AsideDivider,
  AsideNote,
  CanvasSection,
  Field,
} from "@/components/ui/controls";
import { StepScaffold } from "@/components/shell/StepScaffold";

const DURATION_BLURB: Record<DurationName, string> = {
  fast: "Hovers, toggles, colour shifts",
  base: "Reveals, dropdowns, accordions",
  slow: "Modals, page-level transitions",
};

function EasingDemo({
  name,
  curve,
  durationMs,
}: {
  name: string;
  curve: string;
  durationMs: number;
}) {
  const [gone, setGone] = useState(false);
  return (
    <div className="flex items-center gap-4 border-t border-line px-5 py-4 first:border-t-0">
      <button
        type="button"
        onClick={() => setGone((g) => !g)}
        aria-label={`Replay ${name} easing`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
      >
        <Play size={12} />
      </button>
      <div className="w-24 shrink-0">
        <div className="text-[13px] font-medium text-fg">{name}</div>
        <div className="truncate font-mono text-[9px] text-fg-mute" title={curve}>
          {curve}
        </div>
      </div>
      <div className="relative h-8 min-w-0 flex-1 rounded-lg bg-ink-panel">
        <div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-fg"
          style={{
            left: gone ? "calc(100% - 24px)" : "8px",
            transition: `left ${durationMs}ms ${curve}`,
          }}
        />
      </div>
    </div>
  );
}

export function MotionStep() {
  const motion = useDesignSystem((s) => s.primitives.motion);
  const setMotionDuration = useDesignSystem((s) => s.setMotionDuration);
  const setEasing = useDesignSystem((s) => s.setEasing);
  const [demoDuration, setDemoDuration] = useState<DurationName>("base");

  return (
    <StepScaffold
      step="motion"
      title="Fast enough to trust, slow enough to see"
      lede="Motion is a foundation, not a garnish — three durations and four curves cover almost every interaction. Buttons and inputs across the whole system already animate with these tokens, so tuning a value here re-times everything at once."
      aside={
        <>
          <Field label="Durations" hint="ms, enter any values">
            <div className="space-y-2.5">
              {DURATION_NAMES.map((name) => (
                <div key={name}>
                  <div className="flex items-center gap-2">
                    <span className="w-10 font-mono text-[11px] text-fg-mute">
                      {name}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={2000}
                      step={10}
                      value={motion.durations[name]}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v) && v >= 0) {
                          setMotionDuration(name, v);
                        }
                      }}
                      className="h-8 w-full rounded-lg border border-line bg-ink-panel px-2.5 font-mono text-[12px] text-fg focus:border-line-strong focus:outline-none"
                    />
                  </div>
                  <p className="ml-12 mt-1 text-[10px] text-fg-mute">
                    {DURATION_BLURB[name]}
                  </p>
                </div>
              ))}
            </div>
          </Field>

          <AsideDivider />

          <Field label="Easing curves" hint="any CSS timing function">
            <div className="space-y-2">
              {motion.easings.map((e, i) => (
                <div key={e.name} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 font-mono text-[10px] text-fg-mute">
                    {e.name}
                  </span>
                  <input
                    type="text"
                    spellCheck={false}
                    value={e.value}
                    onChange={(ev) => setEasing(i, ev.target.value)}
                    className="h-8 w-full rounded-lg border border-line bg-ink-panel px-2.5 font-mono text-[10px] text-fg focus:border-line-strong focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </Field>

          <AsideNote>
            A quick heuristic: exits faster than entrances, colour faster than
            position, and nothing users wait on past ~400ms.
          </AsideNote>
        </>
      }
    >
      <CanvasSection
        title="Curve playground"
        hint="press play — each ball animates with your tokens"
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[12px] text-fg-mute">Demo duration:</span>
          {DURATION_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setDemoDuration(name)}
              className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                demoDuration === name
                  ? "border-line-strong bg-ink-raised text-fg"
                  : "border-line text-fg-mute hover:text-fg-dim"
              }`}
            >
              {name} · {motion.durations[name]}ms
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-line">
          {motion.easings.map((e) => (
            <EasingDemo
              key={e.name}
              name={e.name}
              curve={e.value}
              durationMs={motion.durations[demoDuration]}
            />
          ))}
        </div>
      </CanvasSection>

      <CanvasSection
        title="Durations compared"
        hint="relative length at a glance"
      >
        <div className="rounded-xl border border-line p-5">
          {DURATION_NAMES.map((name) => {
            const max = Math.max(
              ...DURATION_NAMES.map((n) => motion.durations[n]),
              1
            );
            return (
              <div key={name} className="flex items-center gap-3 py-1.5">
                <span className="w-12 shrink-0 font-mono text-[11px] text-fg-mute">
                  {name}
                </span>
                <div className="h-2.5 min-w-0 flex-1 rounded-full bg-ink-panel">
                  <div
                    className="h-full rounded-full bg-fg/30"
                    style={{
                      width: `${(motion.durations[name] / max) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right font-mono text-[11px] tabular-nums text-fg-dim">
                  {motion.durations[name]}ms
                </span>
              </div>
            );
          })}
        </div>
      </CanvasSection>
    </StepScaffold>
  );
}
