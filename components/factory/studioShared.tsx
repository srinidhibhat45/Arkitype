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
import { ArrowUpRight, Check, Pipette, X } from "lucide-react";
import { PreviewMode, RADII_NAMES, useDesignSystem } from "@/store/useDesignSystem";
import { rampStepLabels } from "@/lib/color";
import { generateTypeScale, STEP_DEFS } from "@/lib/typography";
import { resolveRef, resolveToken } from "@/lib/tokens";
import { bindingSource, bindingSwatch, describeBinding } from "@/lib/binding";

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
  const radiusNames = primitives.radiusNames ?? RADII_NAMES;
  const radiusOptions = radiusNames.map((n, i) => ({
    label: `radius-${n} · ${primitives.radii[i]}px`,
    value: `radius:${i}`,
  }));
  const textSteps = generateTypeScale(
    primitives.typography.baseSize,
    primitives.typography.scaleFactor,
    {
      rounding: primitives.typography.rounding,
      sizeOverrides: primitives.typography.sizeOverrides,
    },
    primitives.typography.stepDefs ?? STEP_DEFS
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
    radiusNames: primitives.radiusNames,
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
  const [search, setSearch] = useState("");
  const [hex, setHex] = useState(value.startsWith("hex:") ? value.slice(4) : "#4f46e5");
  const desc = describeBinding(value, data.radiusNames);
  const currentSwatch = data.swatch(value);
  const source = bindingSource(value);
  const goToStep = useDesignSystem((s) => s.goToStep);
  const setPendingFocus = useDesignSystem((s) => s.setPendingFocus);

  // Filter Roles by search query
  const filteredRoleGroups = data.roleGroups
    .map((g) => {
      const tokens = g.tokens.filter(
        (tk) =>
          tk.token.toLowerCase().includes(search.toLowerCase()) ||
          g.label.toLowerCase().includes(search.toLowerCase())
      );
      return { ...g, tokens };
    })
    .filter((g) => g.tokens.length > 0);

  // Filter Primitives by search query
  const filteredFamilies = data.families
    .map((f) => {
      const swatches = f.swatches.filter(
        (sw) =>
          sw.ref.toLowerCase().includes(search.toLowerCase()) ||
          f.name.toLowerCase().includes(search.toLowerCase())
      );
      return { ...f, swatches };
    })
    .filter((f) => f.swatches.length > 0);

  return (
    <div className="mt-2 rounded-lg border border-line-strong bg-ink-panel p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex rounded-md border border-line bg-ink p-0.5">
          {(["roles", "primitives", "custom"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setSearch(""); // reset search on tab change
              }}
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

      {/* Search Bar for Tokens */}
      {(tab === "roles" || tab === "primitives") && (
        <div className="mb-2">
          <input
            type="text"
            placeholder="Search tokens..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-7 rounded-md border border-line bg-ink px-2 text-[11px] text-fg placeholder-fg-mute focus:border-focus focus:outline-none"
            autoFocus
          />
        </div>
      )}

      <div className="mb-2 flex flex-col gap-1.5 rounded-md border border-line bg-ink px-2.5 py-2">
        <div className="flex items-center gap-2">
          <Swatch hex={currentSwatch} size={16} />
          <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-fg">
            {desc.label}
          </span>
          {source ? (
            <button
              type="button"
              title={`Open ${source.step === "roles" ? "Roles" : "Colour"} step`}
              onClick={() => {
                setPendingFocus({ step: source.step, anchor: source.anchor });
                goToStep(source.step);
                onClose();
              }}
              className="shrink-0 rounded p-0.5 text-fg-mute transition-colors hover:text-fg"
            >
              <ArrowUpRight size={11} />
            </button>
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-line/40 pt-1.5">
          <span className="text-[9px] uppercase tracking-wide text-fg-mute">
            Source: {desc.kind}
          </span>
          {desc.kind === "role" && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold uppercase tracking-wider">
              Semantic (OK)
            </span>
          )}
          {desc.kind === "primitive" && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[9px] font-bold uppercase tracking-wider animate-pulse" title="Direct primitive bindings bypass semantic rules. Bind to a role instead.">
              Primitive (Direct)
            </span>
          )}
          {desc.kind === "custom" && (
            <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[9px] font-bold uppercase tracking-wider" title="Static raw HEX values break system overrides.">
              Static Value
            </span>
          )}
        </div>
      </div>

      {tab === "roles" ? (
        <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
          {filteredRoleGroups.map((g) => (
            <div key={g.label} className="space-y-1">
              <div className="text-[9px] font-bold uppercase tracking-wider text-fg-mute px-1">
                {g.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {g.tokens.map((tk) => (
                  <button
                    type="button"
                    key={tk.token}
                    onClick={() => onPick(`role:${tk.token}`)}
                    className={`flex items-center gap-2 w-full px-1.5 py-1 rounded-md text-left transition-colors ${
                      value === `role:${tk.token}`
                        ? "bg-ink-hover text-fg font-semibold border border-line/80"
                        : "text-fg-mute hover:text-fg-dim hover:bg-ink/30 border border-transparent"
                    }`}
                  >
                    <Swatch hex={tk.hex} size={12} />
                    <span className="text-[11px] font-mono truncate flex-1">{tk.token}</span>
                    {value === `role:${tk.token}` && (
                      <Check size={11} className="text-fg-dim shrink-0" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredRoleGroups.length === 0 && (
            <div className="py-4 text-center text-xs text-fg-mute">
              No matching roles found
            </div>
          )}
        </div>
      ) : tab === "primitives" ? (
        <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
          {filteredFamilies.map((f) => (
            <div key={f.id} className="space-y-1">
              <div className="text-[9px] font-bold uppercase tracking-wider text-fg-mute px-1">
                {f.name}
              </div>
              <div className="flex flex-col gap-0.5">
                {f.swatches.map((sw) => (
                  <button
                    type="button"
                    key={sw.ref}
                    onClick={() => onPick(`prim:${sw.ref}`)}
                    className={`flex items-center gap-2 w-full px-1.5 py-1 rounded-md text-left transition-colors ${
                      value === `prim:${sw.ref}`
                        ? "bg-ink-hover text-fg font-semibold border border-line/80"
                        : "text-fg-mute hover:text-fg-dim hover:bg-ink/30 border border-transparent"
                    }`}
                  >
                    <Swatch hex={sw.hex} size={12} />
                    <span className="text-[11px] font-mono truncate flex-1">{sw.ref}</span>
                    {value === `prim:${sw.ref}` && (
                      <Check size={11} className="text-fg-dim shrink-0" strokeWidth={3} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {filteredFamilies.length === 0 && (
            <div className="py-4 text-center text-xs text-fg-mute">
              No matching primitives found
            </div>
          )}
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
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-fg py-1.5 text-[12px] font-medium text-ink transition hover:opacity-90"
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

export function InlineEditableText({
  componentId,
  propKey,
  value,
  style,
  className,
}: {
  componentId: string;
  propKey: string;
  value: string;
  style?: import("react").CSSProperties;
  className?: string;
}) {
  const setProperty = useDesignSystem((s) => s.setComponentProperty);
  
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        setProperty(componentId, propKey, e.currentTarget.textContent || "");
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      style={{ 
        outline: "none", 
        cursor: "text", 
        borderBottom: "1px dashed transparent",
        ...style 
      }}
      className={`hover:border-fg-dim/40 hover:bg-fg/5 px-0.5 rounded transition-all ${className || ""}`}
    >
      {value}
    </span>
  );
}
