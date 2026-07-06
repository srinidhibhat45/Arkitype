"use client";

/**
 * Step 03 — Spacing & layout. One base unit still generates the scale, but the
 * ladder itself is now editable: change any multiplier, pin a step's exact px,
 * or add/remove steps. Breakpoints define where layouts reflow. Per Figma's
 * foundations guidance, spacing and grids are their own foundation.
 */
import {
  BREAKPOINT_NAMES,
  BreakpointName,
  useDesignSystem,
} from "@/store/useDesignSystem";
import {
  AsideDivider,
  AsideNote,
  CanvasSection,
  Field,
  SliderControl,
} from "@/components/ui/controls";
import { StepScaffold } from "@/components/shell/StepScaffold";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

const BP_BLURB: Record<BreakpointName, string> = {
  sm: "Large phones, small tablets",
  md: "Tablets, split views",
  lg: "Laptops, small desktops",
  xl: "Desktops and wider",
};

function SpacingRow({ index }: { index: number }) {
  const px = useDesignSystem((s) => s.primitives.spacing[index]);
  const multiplier = useDesignSystem((s) => s.primitives.spacingMultipliers[index]);
  const base = useDesignSystem((s) => s.primitives.spacingBase);
  const overridden = useDesignSystem(
    (s) => s.primitives.spacingOverrides[index] !== undefined
  );
  const setSpacingMultiplier = useDesignSystem((s) => s.setSpacingMultiplier);
  const setSpacingOverride = useDesignSystem((s) => s.setSpacingOverride);
  const clearSpacingOverride = useDesignSystem((s) => s.clearSpacingOverride);
  const removeSpacingStep = useDesignSystem((s) => s.removeSpacingStep);

  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className="w-16 shrink-0 font-mono text-[11px] text-fg-mute">
        space-{index + 1}
      </span>
      <label className="flex items-center gap-1" title="Multiplier of the base unit">
        <input
          type="number"
          min={0}
          step={0.5}
          value={multiplier}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v)) setSpacingMultiplier(index, v);
          }}
          className="h-7 w-12 rounded-md border border-line bg-ink-panel px-1.5 font-mono text-[11px] text-fg-dim focus:border-line-strong focus:outline-none"
        />
        <span className="font-mono text-[10px] text-fg-mute">×{base}</span>
      </label>
      <div
        className="h-2.5 min-w-[6px] rounded-full bg-fg/25"
        style={{ width: `${Math.min(px * 3, 260)}px` }}
      />
      <label className="ml-auto flex items-center gap-1" title="Pin an exact px value">
        <input
          type="number"
          min={0}
          step={1}
          value={px}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v >= 0) setSpacingOverride(index, v);
          }}
          className={`h-7 w-16 rounded-md border bg-ink-panel px-2 text-right font-mono text-[11px] focus:outline-none ${
            overridden ? "border-line-strong text-fg" : "border-line text-fg-dim focus:border-line-strong"
          }`}
        />
        <span className="font-mono text-[10px] text-fg-mute">px</span>
      </label>
      {overridden ? (
        <button
          type="button"
          title="Reset to generated"
          onClick={() => clearSpacingOverride(index)}
          className="rounded-md border border-line p-1 text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
        >
          <RotateCcw size={11} />
        </button>
      ) : (
        <span className="w-[26px]" />
      )}
      {index >= 8 ? (
        <button
          type="button"
          title="Remove step"
          onClick={() => removeSpacingStep(index)}
          className="rounded-md p-1 text-fg-mute transition-colors hover:bg-ink-hover hover:text-red-400"
        >
          <Trash2 size={12} />
        </button>
      ) : (
        <span className="w-[26px]" />
      )}
    </div>
  );
}

export function SpaceStep() {
  const spacing = useDesignSystem((s) => s.primitives.spacing);
  const spacingBase = useDesignSystem((s) => s.primitives.spacingBase);
  const breakpoints = useDesignSystem((s) => s.primitives.layout.breakpoints);
  const setSpacingBase = useDesignSystem((s) => s.setSpacingBase);
  const setBreakpoint = useDesignSystem((s) => s.setBreakpoint);
  const addSpacingStep = useDesignSystem((s) => s.addSpacingStep);

  const maxBp = Math.max(...Object.values(breakpoints), 1);

  return (
    <StepScaffold
      step="space"
      title="One unit sets the beat — the ladder is yours"
      lede="Every gap, inset and gutter should be a multiple of one base unit — that's what makes layouts feel deliberate. Tune the base to shift everything at once, edit any rung's multiplier, pin a step to an exact px, or add rungs when a dense UI needs them."
      aside={
        <>
          <SliderControl
            label="Base unit"
            value={spacingBase}
            min={2}
            max={12}
            step={1}
            unit="px"
            onChange={setSpacingBase}
          />
          <AsideNote>
            Steps are multiples of the base. The first eight are always present
            (components rely on space-1…8); add more for dense layouts.
          </AsideNote>

          <AsideDivider />

          <Field label="Breakpoints" hint="px, enter any values">
            <div className="space-y-2">
              {BREAKPOINT_NAMES.map((name) => (
                <div key={name} className="flex items-center gap-2">
                  <span className="w-8 font-mono text-[11px] text-fg-mute">{name}</span>
                  <input
                    type="number"
                    min={320}
                    max={3840}
                    step={1}
                    value={breakpoints[name]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v > 0) setBreakpoint(name, v);
                    }}
                    className="h-8 w-full rounded-lg border border-line bg-ink-panel px-2.5 font-mono text-[12px] text-fg focus:border-line-strong focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </Field>

          <AsideNote>
            Breakpoints export as layout variables so design and code reflow at
            the same widths.
          </AsideNote>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CanvasSection title="Spacing scale" hint={`${spacingBase}px base · editable`}>
          <div className="rounded-xl border border-line p-5">
            {spacing.map((_, i) => (
              <SpacingRow key={i} index={i} />
            ))}
            <button
              type="button"
              onClick={addSpacingStep}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line py-2 text-[12px] font-medium text-fg-mute transition-colors hover:border-line-strong hover:text-fg-dim"
            >
              <Plus size={13} />
              Add step
            </button>
          </div>
        </CanvasSection>

        <CanvasSection title="Rhythm in practice" hint="gaps from the scale">
          <div className="rounded-xl border border-line p-5">
            {[2, 3, 4].map((step) => (
              <div key={step} className="mb-4 last:mb-0">
                <span className="mb-1.5 block font-mono text-[10px] text-fg-mute">
                  gap: space-{step} ({spacing[step - 1]}px)
                </span>
                <div className="flex" style={{ gap: `${spacing[step - 1]}px` }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-10 flex-1 rounded-md border border-line-strong bg-ink-raised"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CanvasSection>

        <CanvasSection title="Breakpoints" hint="where layouts reflow">
          <div className="rounded-xl border border-line p-5 xl:col-span-1">
            <div className="space-y-3">
              {BREAKPOINT_NAMES.map((name) => (
                <div key={name}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-[12px] text-fg-dim">
                      <span className="font-mono text-fg">{name}</span>
                      <span className="ml-2 text-fg-mute">{BP_BLURB[name]}</span>
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-fg-dim">
                      ≥ {breakpoints[name]}px
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-md bg-ink-panel">
                    <div
                      className="h-full rounded-md border border-line-strong bg-ink-raised"
                      style={{ width: `${(breakpoints[name] / maxBp) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CanvasSection>
      </div>
    </StepScaffold>
  );
}
