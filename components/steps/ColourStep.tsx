"use client";

/**
 * Step 01 — Colour. Entry-first, now fully controllable:
 *  • Families are a dynamic list — add, remove and rename them freely, so a
 *    second neutral or an extra accent is one click, not a code change.
 *  • Each family's shade count is adjustable (3–12), for teams that want
 *    50–950 density rather than the default 50–900.
 *  • Any single swatch can be hand-edited without regenerating the ramp; the
 *    override carries a marker and a one-click reset back to the generated value.
 * Suggestions (harmony / tinted neutral / status hues) are still derived from
 * the brand colour and offered as chips — never imposed.
 */
import { useEffect, useState } from "react";
import {
  ColorFamily,
  useDesignSystem,
} from "@/store/useDesignSystem";
import {
  alphaOf,
  bestTextOn,
  contrastRatio,
  harmonySuggestions,
  isValidHex,
  rampStepLabels,
  statusSuggestion,
  tintedNeutral,
  withAlpha,
} from "@/lib/color";
import {
  AsideDivider,
  AsideNote,
  CanvasSection,
  Field,
  HexInput,
} from "@/components/ui/controls";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

/* ── suggestion chips (unchanged behaviour, now per dynamic family) ── */

function SuggestionChips({
  suggestions,
  onPick,
}: {
  suggestions: Array<{ name: string; hex: string }>;
  onPick: (hex: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {suggestions.map((s) => (
        <button
          key={`${s.name}-${s.hex}`}
          type="button"
          title={`${s.name} — ${s.hex.toUpperCase()} (click to use)`}
          onClick={() => onPick(s.hex)}
          className="group flex items-center gap-1.5 rounded-md border border-line py-1 pl-1 pr-2 transition-colors hover:border-line-strong"
        >
          <span className="h-4 w-4 rounded-[4px]" style={{ background: s.hex }} />
          <span className="text-[10px] text-fg-mute transition-colors group-hover:text-fg-dim">
            {s.name}
          </span>
        </button>
      ))}
    </div>
  );
}

function chipsFor(family: ColorFamily, brandSeed: string): Array<{ name: string; hex: string }> {
  if (family.id === "brand" || !isValidHex(brandSeed)) return [];
  if (family.id === "success" || family.id === "warning" || family.id === "error") {
    return [{ name: "Match brand saturation", hex: statusSuggestion(brandSeed, family.id) }];
  }
  if (family.id.includes("neutral")) {
    return [
      { name: "Tinted neutral", hex: tintedNeutral(brandSeed) },
      { name: "Pure grey", hex: "#71717a" },
    ];
  }
  return harmonySuggestions(brandSeed);
}

/* ── aside: one editable block per family ── */

function FamilyAside({ family, brandSeed }: { family: ColorFamily; brandSeed: string }) {
  const setSeed = useDesignSystem((s) => s.setSeed);
  const setFamilySteps = useDesignSystem((s) => s.setFamilySteps);
  const renameFamily = useDesignSystem((s) => s.renameFamily);
  const removeFamily = useDesignSystem((s) => s.removeFamily);
  const familyCount = useDesignSystem((s) => s.primitives.colorFamilies.length);
  const chips = chipsFor(family, brandSeed);

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <input
          type="text"
          value={family.name}
          onChange={(e) => renameFamily(family.id, e.target.value)}
          aria-label={`${family.id} name`}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[12px] font-medium text-fg-dim transition-colors hover:border-line focus:border-line-strong focus:text-fg focus:outline-none"
        />
        <span className="shrink-0 font-mono text-[10px] text-fg-mute">{family.id}</span>
        {familyCount > 1 ? (
          <button
            type="button"
            title="Remove family"
            onClick={() => removeFamily(family.id)}
            className="shrink-0 rounded-md p-1 text-fg-mute transition-colors hover:bg-ink-hover hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        ) : null}
      </div>

      <HexInput value={family.seed} onChange={(hex) => setSeed(family.id, hex)} />

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-fg-mute">Shades</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Fewer shades"
            onClick={() => setFamilySteps(family.id, family.steps - 1)}
            className="h-6 w-6 rounded-md border border-line text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
          >
            −
          </button>
          <span className="w-8 text-center font-mono text-[12px] text-fg-dim">
            {family.steps}
          </span>
          <button
            type="button"
            aria-label="More shades"
            onClick={() => setFamilySteps(family.id, family.steps + 1)}
            className="h-6 w-6 rounded-md border border-line text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
          >
            +
          </button>
        </div>
      </div>

      {chips.length ? <SuggestionChips suggestions={chips} onPick={(hex) => setSeed(family.id, hex)} /> : null}
    </div>
  );
}

/* ── canvas: ramp with per-swatch override editor ── */

function RampRow({ family }: { family: ColorFamily }) {
  const ramp = useDesignSystem((s) => s.primitives.colors[family.id]) ?? [];
  const setFamilyOverride = useDesignSystem((s) => s.setFamilyOverride);
  const clearFamilyOverride = useDesignSystem((s) => s.clearFamilyOverride);
  const pendingFocus = useDesignSystem((s) => s.pendingFocus);
  const setPendingFocus = useDesignSystem((s) => s.setPendingFocus);
  const [selected, setSelected] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (pendingFocus?.step !== "colour" || pendingFocus.anchor !== family.id) return;
    document
      .getElementById(`family-${family.id}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
    setFlash(true);
    setPendingFocus(null);
    const t = setTimeout(() => setFlash(false), 1500);
    return () => clearTimeout(t);
  }, [pendingFocus, setPendingFocus, family.id]);

  const labels = rampStepLabels(family.steps);
  const selectedIdx = selected === null ? -1 : labels.indexOf(selected);
  const selectedHex = selectedIdx >= 0 ? ramp[selectedIdx] : "";
  const selectedOverridden = selected !== null && family.overrides[selected] !== undefined;

  return (
    <div
      id={`family-${family.id}`}
      className={`rounded-xl transition-shadow ${flash ? "ring-1 ring-inset ring-fg" : ""}`}
    >
      <CanvasSection title={family.name} hint={family.seed.toUpperCase()}>
        <p className="-mt-1.5 mb-2.5 text-[12px] text-fg-mute">
          {family.steps} shades · click a swatch to pin its exact value
        </p>
        <div
          className="grid gap-px overflow-hidden rounded-xl border border-line bg-line"
          style={{ gridTemplateColumns: `repeat(${family.steps}, minmax(0, 1fr))` }}
        >
          {ramp.map((hexValue, i) => {
          const label = labels[i];
          const text = bestTextOn(hexValue);
          const cr = Math.round(contrastRatio(hexValue, text) * 10) / 10;
          const overridden = family.overrides[label] !== undefined;
          const isSel = selected === label;
          return (
            <button
              type="button"
              key={label}
              onClick={() => setSelected(isSel ? null : label)}
              className="group relative flex h-16 flex-col justify-between p-1.5 text-left transition-[outline] focus:outline-none"
              style={{
                background: hexValue,
                outline: isSel ? `2px solid ${text}` : "none",
                outlineOffset: "-2px",
              }}
              title={`${family.id}-${label} · ${hexValue} · ${cr}:1 against ${text}`}
            >
              {overridden ? (
                <span
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full"
                  style={{ background: text }}
                  title="Hand-edited"
                />
              ) : null}
              <span
                className="font-mono text-[9px] leading-none opacity-0 transition-opacity group-hover:opacity-80"
                style={{ color: text }}
              >
                {hexValue.toUpperCase()}
              </span>
              <span
                className="font-mono text-[10px] font-medium leading-none opacity-55 transition-opacity group-hover:opacity-100"
                style={{ color: text }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {selected !== null && selectedIdx >= 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-ink-panel px-3 py-2">
          <span className="font-mono text-[11px] text-fg-dim">
            {family.id}-{selected}
          </span>
          <div className="w-44">
            <HexInput
              size="sm"
              value={selectedHex}
              onChange={(hex) => {
                if (isValidHex(hex)) setFamilyOverride(family.id, selected, hex);
              }}
            />
          </div>
          <div className="flex items-center gap-1.5" title="Opacity">
            <span className="text-[11px] text-fg-mute">Alpha</span>
            <input
              type="range"
              min={0}
              max={100}
              value={alphaOf(selectedHex)}
              aria-label={`${family.id}-${selected} opacity`}
              onChange={(e) =>
                setFamilyOverride(family.id, selected, withAlpha(selectedHex, Number(e.target.value)))
              }
              className="h-1 w-16 cursor-pointer accent-fg"
            />
            <span className="w-7 text-right font-mono text-[10px] tabular-nums text-fg-mute">
              {alphaOf(selectedHex)}%
            </span>
          </div>
          {selectedOverridden ? (
            <button
              type="button"
              onClick={() => clearFamilyOverride(family.id, selected)}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[11px] text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
            >
              <RotateCcw size={11} />
              Reset to generated
            </button>
          ) : (
            <span className="text-[11px] text-fg-mute">Generated — edit to pin an override</span>
          )}
        </div>
      ) : null}
      </CanvasSection>
    </div>
  );
}

/** The Colour tab's aside (family editors + add-family + note). */
export function ColourAside() {
  const families = useDesignSystem((s) => s.primitives.colorFamilies);
  const addFamily = useDesignSystem((s) => s.addFamily);
  const brandSeed = families.find((f) => f.id === "brand")?.seed ?? families[0]?.seed ?? "";

  return (
    <>
      {families.map((family) => (
        <FamilyAside key={family.id} family={family} brandSeed={brandSeed} />
      ))}

      <button
        type="button"
        onClick={addFamily}
        className="mb-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line py-2 text-[12px] font-medium text-fg-mute transition-colors hover:border-line-strong hover:text-fg-dim"
      >
        <Plus size={13} />
        Add family
      </button>

      <AsideDivider />

      <AsideNote>
        Suggestions are colour theory applied to <em>your</em> brand hex.
        Every swatch is editable — a dot marks the ones you've pinned by hand.
      </AsideNote>

      <AsideNote>
        <strong>Caspian Strategy:</strong> You can merge Text and Icons into a single <code>FG</code> foreground role to reduce tokens by ~30% and ensure hover synchronization.
      </AsideNote>

      <AsideNote>
        <strong>Formulaic Ramps:</strong> Arkitype generates primitive steps by binary-searching the HSL lightness channel to match exact relative WCAG luminance targets, creating perceptually uniform gradients.
      </AsideNote>
    </>
  );
}

/** The Colour tab's canvas (one editable ramp per family). */
export function ColourCanvas() {
  const families = useDesignSystem((s) => s.primitives.colorFamilies);
  return (
    <>
      {families.map((family) => (
        <RampRow key={family.id} family={family} />
      ))}
    </>
  );
}
