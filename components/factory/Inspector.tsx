"use client";

/**
 * Component Inspector — the deep-customization surface. Reads a component's
 * schema (lib/componentSchema) and renders one control per styleable property,
 * grouped by part. Colours bind to a role, a raw primitive swatch or a literal
 * hex; scales bind to the system's spacing/radius/type/weight steps; dimensions
 * take a raw pixel value. Stateful properties expose a per-state selector so a
 * button's icon colour (say) can differ across default/hover/focus/active/…
 *
 * Every change writes an *override* into the store; nothing here re-implements
 * a component's default — it only pins values on top of it.
 */
import { useState } from "react";
import { ChevronRight, RotateCcw } from "lucide-react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { describeBinding } from "@/lib/binding";
import {
  COMPONENT_SPECS,
  CState,
  PartSpec,
  PropSpec,
  STATE_LABEL,
  WIRED_COMPONENTS,
  currentBinding,
} from "@/lib/componentSchema";
import { SelectControl } from "@/components/ui/controls";
import {
  ColorPicker,
  InspectorData,
  Swatch,
  useInspectorData,
} from "@/components/factory/studioShared";

/* ── one colour property (with optional per-state selector) ── */

function ColorRow({
  id,
  prop,
  data,
}: {
  id: string;
  prop: PropSpec;
  data: InspectorData;
}) {
  const spec = COMPONENT_SPECS[id];
  const bindings = useDesignSystem((s) => s.components[id]?.bindings);
  const setBinding = useDesignSystem((s) => s.setComponentBinding);
  const clearBinding = useDesignSystem((s) => s.clearComponentBinding);
  const states = prop.states ?? spec.states;
  const [active, setActive] = useState<CState>(states[0] ?? "default");
  const [open, setOpen] = useState(false);

  const st = prop.stateful ? active : undefined;
  const { binding, overridden } = currentBinding(bindings, prop, active);
  const desc = describeBinding(binding);
  const key = prop.stateful ? `${prop.key}@${st}` : prop.key;

  const pick = (b: string) => {
    setBinding(id, key, b);
    setOpen(false);
  };

  const applyAll = () => {
    for (const s of states) setBinding(id, `${prop.key}@${s}`, binding);
  };

  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-fg-dim">{prop.label}</span>
        {overridden ? (
          <button
            type="button"
            title="Reset to default"
            onClick={() => clearBinding(id, key)}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-fg-mute hover:text-fg"
          >
            <RotateCcw size={10} /> reset
          </button>
        ) : (
          <span className="text-[9.5px] uppercase tracking-wide text-fg-mute opacity-50">
            default
          </span>
        )}
      </div>

      {prop.stateful && states.length > 1 ? (
        <div className="mb-1.5 flex flex-wrap gap-0.5">
          {states.map((s) => {
            const cb = currentBinding(bindings, prop, s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setActive(s);
                  setOpen(false);
                }}
                className={`flex items-center gap-1 rounded border px-1 py-0.5 text-[9.5px] transition-colors ${
                  active === s
                    ? "border-line-strong bg-ink-raised text-fg"
                    : "border-line text-fg-mute hover:text-fg-dim"
                }`}
                title={STATE_LABEL[s]}
              >
                <Swatch hex={data.swatch(cb.binding)} size={10} />
                {STATE_LABEL[s]}
              </button>
            );
          })}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-ink-panel px-2 py-1.5 text-left transition-colors hover:border-line-strong"
      >
        <Swatch hex={data.swatch(binding)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[11px] text-fg">{desc.label}</span>
          <span className="block text-[9.5px] text-fg-mute">{desc.kind}</span>
        </span>
        <ChevronRight
          size={13}
          className={`shrink-0 text-fg-mute transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>

      {prop.stateful && states.length > 1 ? (
        <button
          type="button"
          onClick={applyAll}
          className="mt-1 text-[10px] text-fg-mute underline decoration-dotted underline-offset-2 hover:text-fg-dim"
        >
          apply to all states
        </button>
      ) : null}

      {open ? (
        <ColorPicker data={data} value={binding} onPick={pick} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

/* ── scale property (space / radius / type / weight / font role) ── */

function ScaleRow({
  id,
  prop,
  data,
}: {
  id: string;
  prop: PropSpec;
  data: InspectorData;
}) {
  const bindings = useDesignSystem((s) => s.components[id]?.bindings);
  const setBinding = useDesignSystem((s) => s.setComponentBinding);
  const clearBinding = useDesignSystem((s) => s.clearComponentBinding);
  const { binding, overridden } = currentBinding(bindings, prop);
  const options =
    prop.type === "space"
      ? data.spaceOptions
      : prop.type === "radius"
        ? data.radiusOptions
        : prop.type === "textSize"
          ? data.textOptions
          : prop.type === "weight"
            ? data.weightOptions
            : data.fontOptions;

  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-fg-dim">{prop.label}</span>
        {overridden ? (
          <button
            type="button"
            onClick={() => clearBinding(id, prop.key)}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-fg-mute hover:text-fg"
          >
            <RotateCcw size={10} /> reset
          </button>
        ) : (
          <span className="text-[9.5px] uppercase tracking-wide text-fg-mute opacity-50">
            default
          </span>
        )}
      </div>
      <SelectControl
        compact
        value={binding}
        options={options}
        onChange={(v) => setBinding(id, prop.key, v)}
      />
    </div>
  );
}

/* ── dimension (raw px) ── */

function DimensionRow({ id, prop }: { id: string; prop: PropSpec }) {
  const bindings = useDesignSystem((s) => s.components[id]?.bindings);
  const setBinding = useDesignSystem((s) => s.setComponentBinding);
  const clearBinding = useDesignSystem((s) => s.clearComponentBinding);
  const { binding, overridden } = currentBinding(bindings, prop);
  const n = binding.startsWith("px:") ? Number(binding.slice(3)) : Number(binding) || 0;

  return (
    <div className="py-1.5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-fg-dim">{prop.label}</span>
        {overridden ? (
          <button
            type="button"
            onClick={() => clearBinding(id, prop.key)}
            className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] text-fg-mute hover:text-fg"
          >
            <RotateCcw size={10} /> reset
          </button>
        ) : (
          <span className="text-[9.5px] uppercase tracking-wide text-fg-mute opacity-50">
            default
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={prop.min ?? 0}
          max={prop.max ?? 64}
          value={n}
          onChange={(e) => setBinding(id, prop.key, `px:${Number(e.target.value)}`)}
          className="h-8 w-full rounded-lg border border-line bg-ink-panel px-2.5 font-mono text-[12px] text-fg focus:border-line-strong focus:outline-none"
        />
        <span className="text-[11px] text-fg-mute">px</span>
      </div>
    </div>
  );
}

function PropRow({ id, prop, data }: { id: string; prop: PropSpec; data: InspectorData }) {
  if (prop.type === "color") return <ColorRow id={id} prop={prop} data={data} />;
  if (prop.type === "dimension") return <DimensionRow id={id} prop={prop} />;
  return <ScaleRow id={id} prop={prop} data={data} />;
}

function PartSection({
  id,
  part,
  data,
}: {
  id: string;
  part: PartSpec;
  data: InspectorData;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-line py-2 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 py-1 text-left"
      >
        <ChevronRight
          size={13}
          className={`text-fg-mute transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="text-[12px] font-semibold text-fg">{part.label}</span>
        <span className="ml-auto text-[10px] text-fg-mute">{part.props.length}</span>
      </button>
      {open ? (
        <div className="pl-0.5">
          {part.props.map((p) => (
            <PropRow key={p.key} id={id} prop={p} data={data} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ComponentInspector({ id }: { id: string }) {
  const spec = COMPONENT_SPECS[id];
  const bindings = useDesignSystem((s) => s.components[id]?.bindings);
  const resetAll = useDesignSystem((s) => s.resetComponentBindings);
  const data = useInspectorData();
  const overrideCount = bindings ? Object.keys(bindings).length : 0;

  if (!spec || !WIRED_COMPONENTS.has(id)) {
    return (
      <p className="text-[12px] leading-relaxed text-fg-mute">
        Corner radius and size for this part are in the left rail. Deep
        per-part, per-state bindings are rolling out lane by lane — the Controls
        lane is fully wired; this one is next.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-fg">Parameters</span>
        {overrideCount > 0 ? (
          <button
            type="button"
            onClick={() => resetAll(id)}
            className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-0.5 text-[10.5px] text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
          >
            <RotateCcw size={10} /> Reset all · {overrideCount}
          </button>
        ) : null}
      </div>
      {spec.parts.map((part) => (
        <PartSection key={part.id} id={id} part={part} data={data} />
      ))}
    </div>
  );
}
