"use client";

/**
 * Step 04 — Shape & elevation. Corner language sets the personality; elevation
 * is how surfaces claim depth. Both are now fully editable:
 *  • Radius: scale the whole array with one slider, or pin any step's px.
 *  • Elevation: structured shadow definitions (offset / blur / spread / colour /
 *    opacity), per mode, add/remove levels — and, crucially, previewed in BOTH
 *    light and dark simultaneously inside real surfaces, so dark-mode depth is
 *    visible even though the tool chrome stays dark.
 */
import { useState } from "react";
import type { PreviewMode, ShadowDef, ShadowField } from "@/store/useDesignSystem";
import {
  RADII_NAMES,
  shadowToCss,
  useDesignSystem,
} from "@/store/useDesignSystem";
import {
  AsideNote,
  CanvasSection,
  HexInput,
  Segmented,
  SliderControl,
} from "@/components/ui/controls";
import { StepScaffold } from "@/components/shell/StepScaffold";
import { ThemeFrame } from "@/components/ui/ThemeFrame";
import { TokenButton } from "@/components/factory/CoreComponents";
import { rv, sv, tv } from "@/lib/tokens";
import { Plus, Trash2 } from "lucide-react";

/* ── elevation preview: every level on a real surface, both modes at once ── */

function ElevationPreview({ mode, levels }: { mode: PreviewMode; levels: ShadowDef[] }) {
  return (
    <ThemeFrame mode={mode} label={mode === "light" ? "Light" : "Dark"}>
      <div className="flex flex-wrap gap-5 p-6" style={{ background: tv("surface-base") }}>
        {levels.map((def, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <div
              style={{
                width: 92,
                height: 60,
                borderRadius: rv(3),
                background: tv("surface-elevated"),
                border: `1px solid ${tv("border-muted")}`,
                boxShadow: shadowToCss(def),
              }}
            />
            <span style={{ color: tv("text-muted"), fontSize: 11 }}>{def.name}</span>
          </div>
        ))}
      </div>
    </ThemeFrame>
  );
}

const NUM_FIELDS: Array<{ key: ShadowField; label: string; min: number; max: number; step: number }> = [
  { key: "x", label: "X", min: -40, max: 40, step: 1 },
  { key: "y", label: "Y", min: -40, max: 40, step: 1 },
  { key: "blur", label: "Blur", min: 0, max: 120, step: 1 },
  { key: "spread", label: "Spread", min: -40, max: 40, step: 1 },
];

function ElevationEditor() {
  const elevation = useDesignSystem((s) => s.primitives.elevation);
  const currentMode = useDesignSystem((s) => s.currentPreviewMode);
  const setShadowField = useDesignSystem((s) => s.setShadowField);
  const setShadowColor = useDesignSystem((s) => s.setShadowColor);
  const renameLevel = useDesignSystem((s) => s.renameLevel);
  const addLevel = useDesignSystem((s) => s.addLevel);
  const removeLevel = useDesignSystem((s) => s.removeLevel);

  const [editMode, setEditMode] = useState<PreviewMode>(currentMode);
  const [sel, setSel] = useState(0);

  const levels = elevation[editMode];
  const idx = Math.min(sel, levels.length - 1);
  const level = levels[idx];

  return (
    <div className="rounded-xl border border-line p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-fg-mute">Editing</span>
          <Segmented
            options={[
              { label: "Light", value: "light" as PreviewMode },
              { label: "Dark", value: "dark" as PreviewMode },
            ]}
            value={editMode}
            onChange={setEditMode}
          />
        </div>
        <button
          type="button"
          onClick={addLevel}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[11px] text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
        >
          <Plus size={12} />
          Add level
        </button>
      </div>

      {/* level selector */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {levels.map((lv, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSel(i)}
            className={`rounded-md border px-2.5 py-1 text-[11px] transition-colors ${
              i === idx
                ? "border-line-strong bg-ink-raised text-fg"
                : "border-line text-fg-mute hover:border-line-strong hover:text-fg-dim"
            }`}
          >
            {lv.name}
          </button>
        ))}
      </div>

      {/* fields for the selected level */}
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3">
        <label className="col-span-2 flex items-center gap-2 sm:col-span-1">
          <span className="w-12 text-[11px] text-fg-mute">Name</span>
          <input
            type="text"
            value={level.name}
            onChange={(e) => renameLevel(idx, e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md border border-line bg-ink-panel px-2 text-[12px] text-fg focus:border-line-strong focus:outline-none"
          />
        </label>

        {NUM_FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-2">
            <span className="w-12 text-[11px] text-fg-mute">{f.label}</span>
            <input
              type="number"
              min={f.min}
              max={f.max}
              step={f.step}
              value={level[f.key]}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setShadowField(editMode, idx, f.key, v);
              }}
              className="h-8 w-full rounded-md border border-line bg-ink-panel px-2 font-mono text-[12px] text-fg focus:border-line-strong focus:outline-none"
            />
          </label>
        ))}

        <label className="flex items-center gap-2">
          <span className="w-12 text-[11px] text-fg-mute">Opacity</span>
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={level.opacity}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) setShadowField(editMode, idx, "opacity", v);
            }}
            className="h-8 w-full rounded-md border border-line bg-ink-panel px-2 font-mono text-[12px] text-fg focus:border-line-strong focus:outline-none"
          />
        </label>

        <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
          <span className="w-12 shrink-0 text-[11px] text-fg-mute">Colour</span>
          <div className="min-w-0 flex-1">
            <HexInput
              size="sm"
              value={level.color}
              onChange={(hex) => setShadowColor(editMode, idx, hex)}
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-[10px] text-fg-mute">{shadowToCss(level)}</span>
        {levels.length > 1 ? (
          <button
            type="button"
            onClick={() => {
              removeLevel(idx);
              setSel((s) => Math.max(0, s - 1));
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[11px] text-fg-mute transition-colors hover:border-line-strong hover:text-red-400"
          >
            <Trash2 size={12} />
            Remove level
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ShapeStep() {
  const radii = useDesignSystem((s) => s.primitives.radii);
  const radiusScale = useDesignSystem((s) => s.primitives.radiusScale);
  const radiusOverrides = useDesignSystem((s) => s.primitives.radiusOverrides);
  const setRadiusScale = useDesignSystem((s) => s.setRadiusScale);
  const setRadiusOverride = useDesignSystem((s) => s.setRadiusOverride);
  const clearRadiusOverride = useDesignSystem((s) => s.clearRadiusOverride);
  const mode = useDesignSystem((s) => s.currentPreviewMode);
  const elevation = useDesignSystem((s) => s.primitives.elevation);

  return (
    <StepScaffold
      step="shape"
      title="Personality lives in the corners"
      lede="Radius is one of the strongest brand signals a system carries — architectural at 0×, balanced at 1×, friendly past 1.5×. Elevation gives surfaces depth, and it reads differently in light and dark — so both modes are shown side by side while you edit, no matter which mode the app is in."
      aside={
        <>
          <SliderControl
            label="Radius scale"
            value={radiusScale}
            min={0}
            max={2.5}
            step={0.05}
            unit="×"
            onChange={setRadiusScale}
          />
          <AsideNote>
            One slider scales the whole radius array; the extremes (none, full)
            never move. Type an exact px under any swatch to pin it.
          </AsideNote>
          <AsideNote>
            Elevation is structured — offset, blur, spread, colour and opacity —
            and stored per mode. Edit one mode while watching both previews.
          </AsideNote>
        </>
      }
    >
      <CanvasSection title="Radius" hint={`${radiusScale}× scale · editable`}>
        <div className="flex flex-wrap items-start gap-4 rounded-xl border border-line p-5">
          {radii.map((r, i) => {
            const isFull = r === 9999;
            const overridden = radiusOverrides[i] !== undefined;
            return (
              <div key={i} className="flex w-16 flex-col items-center gap-2">
                <div
                  className="h-14 w-14 border border-line-strong bg-ink-raised"
                  style={{ borderRadius: `${Math.min(r, 28)}px` }}
                />
                <span className="text-[11px] text-fg-mute">{RADII_NAMES[i]}</span>
                {isFull ? (
                  <span className="font-mono text-[10px] text-fg-dim">full</span>
                ) : (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={r}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= 0) setRadiusOverride(i, v);
                    }}
                    className={`h-6 w-14 rounded-md border bg-ink-panel px-1.5 text-center font-mono text-[10px] focus:outline-none ${
                      overridden
                        ? "border-line-strong text-fg"
                        : "border-line text-fg-dim focus:border-line-strong"
                    }`}
                  />
                )}
                {overridden ? (
                  <button
                    type="button"
                    title="Reset to generated"
                    onClick={() => clearRadiusOverride(i)}
                    className="text-[10px] text-fg-mute underline-offset-2 hover:text-fg hover:underline"
                  >
                    reset
                  </button>
                ) : (
                  <span className="h-[14px]" />
                )}
              </div>
            );
          })}
        </div>
      </CanvasSection>

      <CanvasSection title="Elevation" hint="light and dark, simultaneously">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            <ElevationPreview mode="light" levels={elevation.light} />
            <ElevationPreview mode="dark" levels={elevation.dark} />
          </div>
          <ElevationEditor />
        </div>
      </CanvasSection>

      <CanvasSection title="Composed" hint="radius + elevation + spacing, live">
        <ThemeFrame mode={mode}>
          <div style={{ padding: sv(5) }}>
            <div
              style={{
                background: tv("surface-elevated"),
                border: `1px solid ${tv("border-muted")}`,
                borderRadius: rv(3),
                boxShadow: "var(--ark-shadow-medium)",
                padding: sv(4),
                display: "flex",
                flexDirection: "column",
                gap: sv(2),
              }}
            >
              <span style={{ color: tv("text-muted"), fontSize: "var(--ark-text-xs)" }}>
                Invoice #1042
              </span>
              <span
                style={{
                  color: tv("text-primary"),
                  fontSize: "var(--ark-text-lg)",
                  fontWeight: 700,
                }}
              >
                $12,400.00 due Friday
              </span>
              <span style={{ color: tv("text-secondary"), fontSize: "var(--ark-text-sm)" }}>
                Padding, corner radius and shadow on this card all resolve from
                your scales.
              </span>
              <div style={{ marginTop: sv(2) }}>
                <TokenButton size="md" radiusStep={2}>
                  Approve payment
                </TokenButton>
              </div>
            </div>
          </div>
        </ThemeFrame>
      </CanvasSection>
    </StepScaffold>
  );
}
