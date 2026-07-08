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
  const [previewText, setPreviewText] = useState("Systems age well when ratios do");
  const [contextPreset, setContextPreset] = useState<"article" | "columns" | "card">("article");
  const [bodyStepName, setBodyStepName] = useState("base");
  const [measureWidth, setMeasureWidth] = useState(600); // px
  const [paraSpacing, setParaSpacing] = useState(16); // px

  const [showAddStep, setShowAddStep] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAssignment, setNewAssignment] = useState("");
  const [newExp, setNewExp] = useState(0);

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
  const setTypeLeadingOverride = useDesignSystem((s) => s.setTypeLeadingOverride);
  const clearTypeLeadingOverride = useDesignSystem((s) => s.clearTypeLeadingOverride);
  const setStepAssign = useDesignSystem((s) => s.setStepAssign);
  const addTypeStep = useDesignSystem((s) => s.addTypeStep);
  const removeTypeStep = useDesignSystem((s) => s.removeTypeStep);

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

          {/* Scale steps management */}
          <div className="mb-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-medium text-fg-dim">Scale steps</span>
              <button
                type="button"
                onClick={() => setShowAddStep((v) => !v)}
                className="rounded-md p-1 text-fg-mute transition-colors hover:bg-ink-hover hover:text-fg"
                title="Add scale step"
              >
                <Plus size={13} />
              </button>
            </div>
            
            <div className="space-y-1.5 mb-3">
              {steps.map((st) => (
                <div key={st.name} className="flex items-center justify-between rounded-lg border border-line bg-ink-panel/40 px-2.5 py-1.5 text-[11px]">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono font-bold text-fg">{st.name}</span>
                    <span className="text-fg-mute font-mono text-[10px]">(exp: {st.exp})</span>
                    <span className="text-fg-dim text-[10px] truncate max-w-[100px]">{st.assignment}</span>
                  </div>
                  {st.name !== "base" ? (
                    <button
                      type="button"
                      onClick={() => removeTypeStep(st.name)}
                      className="text-fg-mute hover:text-red-400 transition-colors"
                      title={`Delete ${st.name}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            
            {showAddStep && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newName.trim() && newAssignment.trim()) {
                    addTypeStep(newName.trim().toLowerCase(), newAssignment.trim(), newExp);
                    setNewName("");
                    setNewAssignment("");
                    setNewExp(0);
                    setShowAddStep(false);
                  }
                }}
                className="rounded-lg border border-line bg-ink-panel p-3 space-y-2 mt-2"
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-fg-mute">New Scale Step</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9.5px] text-fg-mute block mb-0.5">Name</label>
                    <input
                      type="text"
                      placeholder="e.g. 5xl"
                      value={newName}
                      required
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-7 w-full rounded-md border border-line bg-ink px-2 text-[11px] text-fg focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] text-fg-mute block mb-0.5">Exponent</label>
                    <input
                      type="number"
                      placeholder="e.g. 6"
                      value={newExp || ""}
                      required
                      onChange={(e) => setNewExp(Number(e.target.value))}
                      className="h-7 w-full rounded-md border border-line bg-ink px-2 font-mono text-[11px] text-fg focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9.5px] text-fg-mute block mb-0.5">Assignment (label)</label>
                  <input
                    type="text"
                    placeholder="e.g. H1 Hero Display"
                    value={newAssignment}
                    required
                    onChange={(e) => setNewAssignment(e.target.value)}
                    className="h-7 w-full rounded-md border border-line bg-ink px-2 text-[11px] text-fg focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddStep(false);
                      setNewName("");
                      setNewAssignment("");
                      setNewExp(0);
                    }}
                    className="px-2 py-1 text-[10px] text-fg-mute hover:text-fg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-[10px] bg-fg text-ink rounded font-semibold transition-opacity hover:opacity-90"
                  >
                    Add Step
                  </button>
                </div>
              </form>
            )}
          </div>

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
        <div className="mb-4 flex items-center gap-3 px-6 py-2.5 bg-ink-panel rounded-xl border border-line">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-mute">Preview Text</span>
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Type something to test the scale..."
            className="flex-1 bg-transparent border-none text-[13px] text-fg focus:outline-none placeholder:text-fg-mute"
          />
          {previewText !== "Systems age well when ratios do" && (
            <button
              type="button"
              onClick={() => setPreviewText("Systems age well when ratios do")}
              className="text-[11px] text-fg-mute hover:text-fg transition-colors font-medium"
            >
              Reset
            </button>
          )}
        </div>

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
                  {previewText || " "}
                </span>
                <span className="hidden shrink-0 text-right text-[11px] text-fg-mute lg:block">
                  {step.assignment}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 pl-16">
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

                <label className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-fg-mute">leading</span>
                  <input
                    type="number"
                    min={1}
                    max={3}
                    step={0.05}
                    value={step.lineHeight}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v > 0) setTypeLeadingOverride(step.name, v);
                    }}
                    className={`h-8 w-16 rounded-lg border bg-ink-panel px-2.5 font-mono text-[12.5px] font-bold focus:outline-none ${
                      typography.leadingOverrides?.[step.name] !== undefined
                        ? "border-line-strong text-fg"
                        : "border-line text-fg-dim focus:border-line-strong"
                    }`}
                  />
                  <span className="font-mono text-[11px] text-fg-mute">lh</span>
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

                {(step.overridden || typography.leadingOverrides?.[step.name] !== undefined) && (
                  <button
                    type="button"
                    title="Reset overrides"
                    onClick={() => {
                      if (step.overridden) clearTypeSizeOverride(step.name);
                      if (typography.leadingOverrides?.[step.name] !== undefined) clearTypeLeadingOverride(step.name);
                    }}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-line px-2.5 text-[11px] font-semibold text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
                  >
                    <RotateCcw size={11} />
                    reset
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CanvasSection>

      <CanvasSection title="In context" hint="how the scale reads together">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-ink-panel p-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-mute">Layout:</span>
            <div className="flex rounded-lg border border-line bg-ink p-0.5">
              {(["article", "columns", "card"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setContextPreset(mode)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                    contextPreset === mode ? "bg-ink-raised text-fg shadow-sm border border-line" : "text-fg-mute hover:text-fg border border-transparent"
                  }`}
                >
                  {mode === "article" ? "Article" : mode === "columns" ? "Split Columns" : "UI Card"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-fg-mute">Body step:</span>
              <div className="w-20">
                <SelectControl
                  compact
                  value={bodyStepName}
                  options={steps.map((s) => ({ label: s.name, value: s.name }))}
                  onChange={setBodyStepName}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-fg-mute">Measure:</span>
              <input
                type="range"
                min={320}
                max={900}
                step={20}
                value={measureWidth}
                onChange={(e) => setMeasureWidth(Number(e.target.value))}
                className="w-24 accent-fg"
              />
              <span className="font-mono text-[10px] text-fg-mute">{measureWidth}px</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-fg-mute">Spacing:</span>
              <input
                type="range"
                min={8}
                max={36}
                step={4}
                value={paraSpacing}
                onChange={(e) => setParaSpacing(Number(e.target.value))}
                className="w-20 accent-fg"
              />
              <span className="font-mono text-[10px] text-fg-mute">{paraSpacing}px</span>
            </div>
          </div>
        </div>

        {/* Content rendering block based on contextPreset */}
        {(() => {
          const bodyStep = steps.find((s) => s.name === bodyStepName) ?? steps[2]; // fallback to base
          const h1Step = steps.find((s) => s.name === "4xl") ?? steps[7];
          const h2Step = steps.find((s) => s.name === "3xl") ?? steps[6];
          const h3Step = steps.find((s) => s.name === "2xl") ?? steps[5];
          const metaStep = steps.find((s) => s.name === "xs") ?? steps[0];
          const buttonTextStep = steps.find((s) => s.name === "sm") ?? steps[1];

          if (contextPreset === "article") {
            return (
              <div className="rounded-xl border border-line bg-ink-panel p-8">
                <div style={{ maxWidth: `${measureWidth}px`, margin: "0 auto" }}>
                  <span
                    className="text-fg-mute uppercase tracking-wider block mb-2"
                    style={{
                      fontSize: `${metaStep.size}px`,
                      lineHeight: metaStep.lineHeight,
                      fontFamily: typography.fontRoles[metaStep.role].family,
                      fontWeight: weightValue(metaStep.weight),
                    }}
                  >
                    Design systems &middot; July 2026
                  </span>
                  <h1
                    className="text-fg font-bold tracking-tight mb-4"
                    style={{
                      fontSize: `${Math.min(h1Step.size, 52)}px`,
                      lineHeight: h1Step.lineHeight,
                      fontFamily: typography.fontRoles[h1Step.role].family,
                      fontWeight: weightValue(h1Step.weight),
                    }}
                  >
                    Typography that scales itself
                  </h1>
                  <p
                    className="text-fg-dim font-medium"
                    style={{
                      fontSize: `${bodyStep.size * 1.15}px`,
                      lineHeight: bodyStep.lineHeight * 1.05,
                      fontFamily: typography.fontRoles[bodyStep.role].family,
                      fontWeight: weightValue(bodyStep.weight),
                      marginBottom: `${paraSpacing * 1.2}px`,
                    }}
                  >
                    Because every size derives from the same base and ratio, changing either re-tunes the entire hierarchy at once. Pin a single step when you need a specific value.
                  </p>
                  <p
                    className="text-fg-mute"
                    style={{
                      fontSize: `${bodyStep.size}px`,
                      lineHeight: bodyStep.lineHeight,
                      fontFamily: typography.fontRoles[bodyStep.role].family,
                      fontWeight: weightValue(bodyStep.weight),
                      marginBottom: `${paraSpacing}px`,
                    }}
                  >
                    In design, typography is not just about choosing pretty letters. It is about establishing a readable structure, a mathematical harmony that guides the reader’s eye across the page. Setting ratios allows you to scale displays, headers, body, and micro-text relative to each other automatically.
                  </p>
                  <p
                    className="text-fg-mute"
                    style={{
                      fontSize: `${bodyStep.size}px`,
                      lineHeight: bodyStep.lineHeight,
                      fontFamily: typography.fontRoles[bodyStep.role].family,
                      fontWeight: weightValue(bodyStep.weight),
                    }}
                  >
                    Try changing the base font size, scale factor, or the line height (leading) of the &quot;{bodyStep.name}&quot; step in the table above. You will see how this preview adapts instantly to test the readability and measure of your choice.
                  </p>
                </div>
              </div>
            );
          }

          if (contextPreset === "columns") {
            return (
              <div className="rounded-xl border border-line bg-ink-panel p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ maxWidth: `${measureWidth}px`, margin: "0 auto" }}>
                  <div>
                    <h2
                      className="text-fg font-semibold mb-3"
                      style={{
                        fontSize: `${h3Step.size}px`,
                        lineHeight: h3Step.lineHeight,
                        fontFamily: typography.fontRoles[h3Step.role].family,
                        fontWeight: weightValue(h3Step.weight),
                      }}
                    >
                      Left Column Heading
                    </h2>
                    <p
                      className="text-fg-mute"
                      style={{
                        fontSize: `${bodyStep.size}px`,
                        lineHeight: bodyStep.lineHeight,
                        fontFamily: typography.fontRoles[bodyStep.role].family,
                        fontWeight: weightValue(bodyStep.weight),
                        marginBottom: `${paraSpacing}px`,
                      }}
                    >
                      A two-column layout is excellent for checking how line wrap and measure (the number of characters per line) feel. When columns are too narrow, the eye jumps too frequently, causing fatigue.
                    </p>
                    <p
                      className="text-fg-mute"
                      style={{
                        fontSize: `${bodyStep.size}px`,
                        lineHeight: bodyStep.lineHeight,
                        fontFamily: typography.fontRoles[bodyStep.role].family,
                        fontWeight: weightValue(bodyStep.weight),
                      }}
                    >
                      Use the Max-width slider to adjust the boundaries and see where the lines break. Optimal measure is typically between 45 and 75 characters per line.
                    </p>
                  </div>
                  <div>
                    <h2
                      className="text-fg font-semibold mb-3"
                      style={{
                        fontSize: `${h3Step.size}px`,
                        lineHeight: h3Step.lineHeight,
                        fontFamily: typography.fontRoles[h3Step.role].family,
                        fontWeight: weightValue(h3Step.weight),
                      }}
                    >
                      Right Column Heading
                    </h2>
                    <p
                      className="text-fg-mute"
                      style={{
                        fontSize: `${bodyStep.size}px`,
                        lineHeight: bodyStep.lineHeight,
                        fontFamily: typography.fontRoles[bodyStep.role].family,
                        fontWeight: weightValue(bodyStep.weight),
                        marginBottom: `${paraSpacing}px`,
                      }}
                    >
                      Notice how serif fonts excel in long-form paragraphs whereas sans-serif fonts remain clean and legible in small widgets and user interface items.
                    </p>
                    <p
                      className="text-fg-mute"
                      style={{
                        fontSize: `${bodyStep.size}px`,
                        lineHeight: bodyStep.lineHeight,
                        fontFamily: typography.fontRoles[bodyStep.role].family,
                        fontWeight: weightValue(bodyStep.weight),
                      }}
                    >
                      By isolating font roles, you can assign Serifs to Display/Heading and clean Sans-serifs or Monospaces to Body/Code.
                    </p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className="rounded-xl border border-line bg-ink p-8 flex justify-center">
              <div
                className="rounded-xl border border-line bg-ink-panel p-6 shadow-md w-full"
                style={{ maxWidth: `${Math.min(measureWidth, 420)}px` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="text-fg-mute uppercase tracking-wide"
                    style={{
                      fontSize: `${metaStep.size}px`,
                      lineHeight: metaStep.lineHeight,
                      fontFamily: typography.fontRoles[metaStep.role].family,
                      fontWeight: weightValue(metaStep.weight),
                    }}
                  >
                    Billing Analytics
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                
                <div className="mb-2">
                  <span
                    className="text-fg-mute block text-[11px]"
                    style={{
                      fontFamily: typography.fontRoles[bodyStep.role].family,
                    }}
                  >
                    Monthly Active Usage
                  </span>
                  <h3
                    className="text-fg font-bold tracking-tight mt-1"
                    style={{
                      fontSize: `${h2Step.size}px`,
                      lineHeight: h2Step.lineHeight,
                      fontFamily: typography.fontRoles[h2Step.role].family,
                      fontWeight: weightValue(h2Step.weight),
                    }}
                  >
                    14,892,102
                  </h3>
                </div>

                <p
                  className="text-fg-dim"
                  style={{
                    fontSize: `${bodyStep.size * 0.95}px`,
                    lineHeight: bodyStep.lineHeight,
                    fontFamily: typography.fontRoles[bodyStep.role].family,
                    fontWeight: weightValue(bodyStep.weight),
                    marginBottom: `${paraSpacing}px`,
                  }}
                >
                  Your API request volume grew by 12.4% over the last 30 days. Most of the traffic was consumed by the token synthesis endpoint.
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 rounded-lg bg-fg px-4 py-2 text-center text-ink font-semibold transition-opacity hover:opacity-90"
                    style={{
                      fontSize: `${buttonTextStep.size}px`,
                      fontFamily: typography.fontRoles[buttonTextStep.role].family,
                    }}
                  >
                    View invoice
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-lg border border-line px-4 py-2 text-center text-fg font-semibold transition-colors hover:bg-ink-hover"
                    style={{
                      fontSize: `${buttonTextStep.size}px`,
                      fontFamily: typography.fontRoles[buttonTextStep.role].family,
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </CanvasSection>
    </StepScaffold>
  );
}
