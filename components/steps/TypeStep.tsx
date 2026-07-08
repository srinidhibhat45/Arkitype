"use client";

/**
 * Step 02 — Typography. The scale is still generated from one base size and one
 * ratio, but now every value is controllable:
 *  • Rounding kills awkward decimals (48.83 → 48) — or keep them if you want.
 *  • Any single step can be pinned to an exact size (4xl → 50) without moving
 *    the rest of the scale.
 *  • Fonts vary by role (Display / Heading / Body / Mono) and every step picks a
 *    weight from a named weight scale — because real systems don't ship one
 *    family at one weight.
 */
import { useState } from "react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { RoundingMode, FontRoleId } from "@/lib/typography";
import { SCALE_FACTORS, generateTypeScale, STEP_DEFS } from "@/lib/typography";
import {
  AsideDivider,
  AsideNote,
  CanvasSection,
  Field,
  Segmented,
  SelectControl,
  SliderControl,
} from "@/components/ui/controls";
import { StepScaffold } from "@/components/shell/StepScaffold";
import { RotateCcw, Trash2, Plus, Sparkles, ChevronDown } from "lucide-react";
import { FontPicker } from "@/components/ui/FontPicker";
import { FONT_PAIRINGS } from "@/lib/googleFonts";

const ROUNDING_OPTIONS: Array<{ label: string; value: RoundingMode }> = [
  { label: "0.00", value: "none" },
  { label: "0.5", value: "half" },
  { label: "Whole", value: "integer" },
];

const ROLE_OPTIONS: Array<{ label: string; value: FontRoleId }> = [
  { label: "Display", value: "display" },
  { label: "Heading", value: "heading" },
  { label: "Body", value: "body" },
  { label: "Mono", value: "mono" },
];

const ROLE_LABEL: Record<FontRoleId, string> = {
  display: "Display",
  heading: "Heading",
  body: "Body",
  mono: "Mono",
};

export function TypeStep() {
  const [showPairings, setShowPairings] = useState(false);
  const typography = useDesignSystem((s) => s.primitives.typography);
  const setTypographyBase = useDesignSystem((s) => s.setTypographyBase);
  const setScaleFactor = useDesignSystem((s) => s.setScaleFactor);
  const setRounding = useDesignSystem((s) => s.setRounding);
  const setFontRole = useDesignSystem((s) => s.setFontRole);
  const addWeight = useDesignSystem((s) => s.addWeight);
  const setWeight = useDesignSystem((s) => s.setWeight);
  const removeWeight = useDesignSystem((s) => s.removeWeight);
  const setTypeSizeOverride = useDesignSystem((s) => s.setTypeSizeOverride);
  const clearTypeSizeOverride = useDesignSystem((s) => s.clearTypeSizeOverride);
  const setStepAssign = useDesignSystem((s) => s.setStepAssign);

  function applyPairing(p: typeof FONT_PAIRINGS[0]) {
    setFontRole("display", { family: p.display });
    setFontRole("heading", { family: p.heading });
    setFontRole("body", { family: p.body });
    setFontRole("mono", { family: p.mono });
  }

  const steps = generateTypeScale(typography.baseSize, typography.scaleFactor, {
    rounding: typography.rounding,
    sizeOverrides: typography.sizeOverrides,
    leadingOverrides: typography.leadingOverrides,
    stepAssign: typography.stepAssign,
  }, typography.stepDefs ?? STEP_DEFS);
  const specimen = [...steps].reverse();

  const weightOptions = typography.weights.map((w) => ({
    label: `${w.name} · ${w.value}`,
    value: w.name,
  }));
  const weightValue = (name: string) =>
    typography.weights.find((w) => w.name === name)?.value ?? 400;

  return (
    <StepScaffold
      step="type"
      title="One base, one ratio — every value yours to tune"
      lede="The scale is a geometric progression from a single body size, so changing the base or ratio re-tunes the whole hierarchy at once. Rounding keeps sizes clean; pin any individual step to an exact value; and assign a font role and weight per step, because headings, body and display rarely share one style."
      aside={
        <>
          <SliderControl
            label="Base size"
            value={typography.baseSize}
            min={12}
            max={22}
            step={1}
            unit="px"
            onChange={setTypographyBase}
          />

          <Field label="Scale ratio" hint="enter any value">
            <input
              type="number"
              min={1.05}
              max={2}
              step={0.001}
              value={typography.scaleFactor}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v > 1 && v <= 2.5) setScaleFactor(v);
              }}
              className="h-9 w-full rounded-lg border border-line bg-ink-panel px-3 font-mono text-[13px] text-fg focus:border-line-strong focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SCALE_FACTORS.map((f) => {
                const active = Math.abs(f.value - typography.scaleFactor) < 0.0001;
                const [ratioName] = f.label.split(" — ");
                return (
                  <button
                    key={f.value}
                    type="button"
                    title={`${ratioName} — ${f.value}`}
                    onClick={() => setScaleFactor(f.value)}
                    className={`rounded-md border px-2 py-1 text-[10px] transition-colors ${
                      active
                        ? "border-line-strong bg-ink-raised text-fg"
                        : "border-line text-fg-mute hover:border-line-strong hover:text-fg-dim"
                    }`}
                  >
                    {ratioName} · {f.value}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Rounding" hint="applied to generated sizes">
            <Segmented options={ROUNDING_OPTIONS} value={typography.rounding} onChange={setRounding} />
          </Field>

          <AsideDivider />

          {/* Font pairings toggle */}
          <button
            type="button"
            onClick={() => setShowPairings((v) => !v)}
            className="mb-3 flex w-full items-center justify-between rounded-lg border border-line px-2.5 py-2 text-[11px] text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} />
              Pairing presets
            </span>
            <ChevronDown size={12} className={`transition-transform ${showPairings ? "rotate-180" : ""}`} />
          </button>

          {showPairings && (
            <div className="mb-3 space-y-1.5">
              {FONT_PAIRINGS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPairing(p)}
                  className="w-full rounded-lg border border-line px-3 py-2.5 text-left transition-all hover:border-line-strong hover:bg-ink-hover"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="text-[15px] text-fg"
                      style={{ fontFamily: `"${p.display}", sans-serif`, fontWeight: 700 }}
                    >
                      {p.label}
                    </span>
                    <span className="shrink-0 text-[9px] uppercase tracking-wide text-fg-mute">
                      {p.display}
                    </span>
                  </div>
                  <p
                    className="mt-0.5 text-[11px] text-fg-mute"
                    style={{ fontFamily: `"${p.body}", sans-serif` }}
                  >
                    {p.description}
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="mb-2 text-[12px] font-medium text-fg-dim">Font roles</div>
          {(Object.keys(ROLE_LABEL) as FontRoleId[]).map((role) => (
            <div key={role} className="mb-3">
              <div className="mb-1 text-[11px] text-fg-mute">{ROLE_LABEL[role]}</div>
              <FontPicker
                value={typography.fontRoles[role].family}
                onChange={(family) => setFontRole(role, { family })}
              />
            </div>
          ))}

          <AsideDivider />

          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-medium text-fg-dim">Weight scale</span>
            <button
              type="button"
              onClick={addWeight}
              title="Add weight"
              className="rounded-md p-1 text-fg-mute transition-colors hover:bg-ink-hover hover:text-fg"
            >
              <Plus size={13} />
            </button>
          </div>
          <div className="space-y-1.5">
            {typography.weights.map((w, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={w.name}
                  onChange={(e) => setWeight(i, { name: e.target.value })}
                  className="h-7 min-w-0 flex-1 rounded-md border border-line bg-ink-panel px-2 text-[11px] text-fg focus:border-line-strong focus:outline-none"
                />
                <input
                  type="number"
                  min={100}
                  max={900}
                  step={100}
                  value={w.value}
                  onChange={(e) => setWeight(i, { value: Number(e.target.value) })}
                  className="h-7 w-16 rounded-md border border-line bg-ink-panel px-2 font-mono text-[11px] text-fg focus:border-line-strong focus:outline-none"
                />
                {typography.weights.length > 1 ? (
                  <button
                    type="button"
                    title="Remove weight"
                    onClick={() => removeWeight(i)}
                    className="rounded-md p-1 text-fg-mute transition-colors hover:bg-ink-hover hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <AsideNote>
            Line-height still tightens automatically as sizes grow — override it
            per step only when you need to.
          </AsideNote>
        </>
      }
    >
      <CanvasSection
        title="Specimen"
        hint={`base ${typography.baseSize}px × ${typography.scaleFactor} · ${typography.rounding}`}
      >
        <div className="rounded-xl border border-line">
          {specimen.map((step, i) => (
            <div
              key={step.name}
              className={`px-6 py-4 ${i > 0 ? "border-t border-line" : ""}`}
            >
              <div className="flex items-baseline gap-6">
                <span className="w-10 shrink-0 font-mono text-[11px] text-fg-mute">
                  {step.name}
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-fg"
                  style={{
                    fontSize: `${Math.min(step.size, 56)}px`,
                    lineHeight: step.lineHeight,
                    fontFamily: typography.fontRoles[step.role].family,
                    fontWeight: weightValue(step.weight),
                  }}
                >
                  Systems age well when ratios do
                </span>
                <span className="hidden shrink-0 text-right text-[11px] text-fg-mute lg:block">
                  {step.assignment}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3.5 pl-16">
                <label className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-fg-mute">size</span>
                  <input
                    type="number"
                    min={6}
                    max={200}
                    step={1}
                    value={step.size}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v > 0) setTypeSizeOverride(step.name, v);
                    }}
                    className={`h-8 w-20 rounded-lg border bg-ink-panel px-2.5 font-mono text-[12.5px] font-bold focus:outline-none ${
                      step.overridden
                        ? "border-line-strong text-fg"
                        : "border-line text-fg-dim focus:border-line-strong"
                    }`}
                  />
                  <span className="font-mono text-[11px] text-fg-mute">
                    {step.overridden ? `gen ${step.generatedSize}` : "px"}
                  </span>
                </label>

                <div className="w-40">
                  <SelectControl
                    compact
                    value={step.weight}
                    options={weightOptions}
                    onChange={(v) => setStepAssign(step.name, { weight: v })}
                  />
                </div>

                <div className="w-32">
                  <SelectControl
                    compact
                    value={step.role}
                    options={ROLE_OPTIONS}
                    onChange={(v) => setStepAssign(step.name, { role: v as FontRoleId })}
                  />
                </div>

                {step.overridden ? (
                  <button
                    type="button"
                    title="Reset to generated size"
                    onClick={() => clearTypeSizeOverride(step.name)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-[11px] font-semibold text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
                  >
                    <RotateCcw size={11} />
                    reset
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </CanvasSection>

      <CanvasSection title="In context" hint="how the scale reads together">
        <div className="max-w-2xl rounded-xl border border-line px-8 py-7">
          <p
            className="text-fg-mute"
            style={{
              fontSize: steps[1].size,
              lineHeight: steps[1].lineHeight,
              fontFamily: typography.fontRoles[steps[1].role].family,
              fontWeight: weightValue(steps[1].weight),
            }}
          >
            Release notes
          </p>
          <h2
            className="mt-1 text-fg"
            style={{
              fontSize: Math.min(steps[6].size, 44),
              lineHeight: steps[6].lineHeight,
              fontFamily: typography.fontRoles[steps[6].role].family,
              fontWeight: weightValue(steps[6].weight),
            }}
          >
            Typography that scales itself
          </h2>
          <p
            className="mt-3 text-fg-dim"
            style={{
              fontSize: steps[2].size,
              lineHeight: steps[2].lineHeight,
              fontFamily: typography.fontRoles[steps[2].role].family,
              fontWeight: weightValue(steps[2].weight),
            }}
          >
            Because every size derives from the same base and ratio, changing
            either re-tunes the entire hierarchy at once. Pin a single step when
            you need a specific value, and let roles and weights carry the
            difference between body, headings and display.
          </p>
        </div>
      </CanvasSection>
    </StepScaffold>
  );
}
