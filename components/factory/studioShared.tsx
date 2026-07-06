"use client";

/**
 * Shared building blocks for the component-customization surfaces — the token
 * data hook, the swatch chip, and the Roles/Primitives/Custom colour picker.
 *
 * These were originally local to the Inspector; they now live here so both the
 * (legacy) Inspector and the new floating-card ComponentStudio render an
 * identical picker and read the same live option lists off the design system.
 */
import { useMemo, useState } from "react";
import { Check, Pipette, X } from "lucide-react";
import { PreviewMode, RADII_NAMES, useDesignSystem } from "@/store/useDesignSystem";
import { rampStepLabels } from "@/lib/color";
import { generateTypeScale } from "@/lib/typography";
import { resolveRef, resolveToken } from "@/lib/tokens";
import { bindingSwatch, describeBinding } from "@/lib/binding";

/* ── shared option data pulled from the live system ── */

export function useInspectorData() {
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);
  const mode = useDesignSystem((s) => s.currentPreviewMode);
  const slice = { primitives, semantics };

  const roleGroups = useMemo(
    () =>
      semantics.groups.map((g) => ({
        label: g.label,
        tokens: g.tokens.map((tok) => ({
          token: tok,
          hex: resolveToken(slice, mode, tok),
        })),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [semantics, primitives, mode]
  );

  const families = useMemo(
    () =>
      primitives.colorFamilies.map((f) => ({
        id: f.id,
        name: f.name,
        swatches: rampStepLabels(f.steps).map((label) => ({
          label,
          ref: `${f.id}-${label}`,
          hex: resolveRef(primitives, `${f.id}-${label}`),
        })),
      })),
    [primitives]
  );

  const spaceOptions = primitives.spacing.map((px, i) => ({
    label: `space-${i + 1} · ${px}px`,
    value: `space:${i + 1}`,
  }));
  const radiusOptions = RADII_NAMES.map((n, i) => ({
    label: `radius-${n} · ${primitives.radii[i]}px`,
    value: `radius:${i}`,
  }));
  const textSteps = generateTypeScale(
    primitives.typography.baseSize,
    primitives.typography.scaleFactor,
    {
      rounding: primitives.typography.rounding,
      sizeOverrides: primitives.typography.sizeOverrides,
    }
  );
  const textOptions = textSteps.map((s) => ({
    label: `text-${s.name} · ${s.size}px`,
    value: `text:${s.name}`,
  }));
  const weightOptions = primitives.typography.weights.map((w) => ({
    label: `${w.name} · ${w.value}`,
    value: `weight:${w.name}`,
  }));
  const fontOptions = [
    { label: "Display", value: "font:display" },
    { label: "Heading", value: "font:heading" },
    { label: "Body", value: "font:body" },
    { label: "Mono", value: "font:mono" },
  ];

  const swatch = (binding: string) => bindingSwatch(slice, mode, binding);

  return {
    mode,
    roleGroups,
    families,
    spaceOptions,
    radiusOptions,
    textOptions,
    weightOptions,
    fontOptions,
    swatch,
  };
}

export type InspectorData = ReturnType<typeof useInspectorData>;

/* ── a swatch chip ── */

export function Swatch({ hex, size = 20 }: { hex: string; size?: number }) {
  if (!hex) {
    return (
      <span
        className="inline-block shrink-0 rounded-md border border-line"
        style={{
          width: size,
          height: size,
          backgroundImage:
            "linear-gradient(45deg,#3a3a40 25%,transparent 25%,transparent 75%,#3a3a40 75%),linear-gradient(45deg,#3a3a40 25%,transparent 25%,transparent 75%,#3a3a40 75%)",
          backgroundSize: "8px 8px",
          backgroundPosition: "0 0,4px 4px",
        }}
        title="transparent / none"
      />
    );
  }
  return (
    <span
      className="inline-block shrink-0 rounded-md border border-line-strong"
      style={{ width: size, height: size, background: hex }}
    />
  );
}

/* ── a selectable swatch button (check on the active one) ── */

function SwatchButton({
  hex,
  selected,
  title,
  onClick,
}: {
  hex: string;
  selected: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`relative rounded-md border p-0.5 transition-colors ${
        selected ? "border-fg ring-1 ring-fg" : "border-line hover:border-line-strong"
      }`}
    >
      <Swatch hex={hex} size={20} />
      {selected ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-fg shadow">
            <Check size={10} strokeWidth={3} className="text-ink" />
          </span>
        </span>
      ) : null}
    </button>
  );
}

/* ── colour picker (inline, expanding) ── */

export function ColorPicker({
  data,
  value,
  onPick,
  onClose,
}: {
  data: InspectorData;
  value: string;
  onPick: (binding: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"roles" | "primitives" | "custom">("roles");
  const [hex, setHex] = useState(value.startsWith("hex:") ? value.slice(4) : "#4f46e5");
  const desc = describeBinding(value);
  const currentSwatch = data.swatch(value);

  return (
    <div className="mt-2 rounded-lg border border-line-strong bg-ink-panel p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex rounded-md border border-line bg-ink p-0.5">
          {(["roles", "primitives", "custom"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-2 py-0.5 text-[10.5px] font-medium capitalize transition-colors ${
                tab === t ? "bg-ink-hover text-fg" : "text-fg-mute hover:text-fg-dim"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-fg-mute hover:text-fg"
          aria-label="Close picker"
        >
          <X size={13} />
        </button>
      </div>

      <div className="mb-2 flex items-center gap-2 rounded-md border border-line bg-ink px-2 py-1.5">
        <Swatch hex={currentSwatch} size={16} />
        <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-fg">
          {desc.label}
        </span>
        <span className="shrink-0 text-[9px] uppercase tracking-wide text-fg-mute">
          {desc.kind}
        </span>
      </div>

      {tab === "roles" ? (
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {data.roleGroups.map((g) => (
            <div key={g.label}>
              <div className="mb-1 text-[9.5px] font-medium uppercase tracking-wide text-fg-mute">
                {g.label}
              </div>
              <div className="flex flex-wrap gap-1">
                {g.tokens.map((tk) => (
                  <SwatchButton
                    key={tk.token}
                    hex={tk.hex}
                    title={tk.token}
                    selected={value === `role:${tk.token}`}
                    onClick={() => onPick(`role:${tk.token}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : tab === "primitives" ? (
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {data.families.map((f) => (
            <div key={f.id}>
              <div className="mb-1 text-[9.5px] font-medium uppercase tracking-wide text-fg-mute">
                {f.name}
              </div>
              <div className="flex flex-wrap gap-1">
                {f.swatches.map((sw) => (
                  <SwatchButton
                    key={sw.ref}
                    hex={sw.hex}
                    title={sw.ref}
                    selected={value === `prim:${sw.ref}`}
                    onClick={() => onPick(`prim:${sw.ref}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label
              className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-line"
              style={{ background: hex }}
            >
              <input
                type="color"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
            <input
              type="text"
              value={hex}
              spellCheck={false}
              onChange={(e) => setHex(e.target.value)}
              className="h-9 w-full rounded-lg border border-line bg-ink px-2.5 font-mono text-[12px] uppercase text-fg focus:border-line-strong focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => onPick(`hex:${hex}`)}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-fg py-1.5 text-[12px] font-medium text-ink hover:bg-neutral-300"
          >
            <Pipette size={12} /> Use this colour
          </button>
          <button
            type="button"
            onClick={() => onPick("raw:transparent")}
            className="w-full rounded-lg border border-line py-1.5 text-[11px] text-fg-mute hover:border-line-strong hover:text-fg"
          >
            Transparent
          </button>
        </div>
      )}
    </div>
  );
}
