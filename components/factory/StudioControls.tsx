"use client";

/**
 * Studio controls — the floating "parameter card" and its typed inner controls,
 * styled after the Figma "Component Studio" reference but in Arkitype's dark
 * chrome. Every control writes a *token* binding except the free px slider:
 *   • colour     → TokenSwatchCard (Roles / Primitives / Custom picker)
 *   • radius/type/weight/font/size → TokenSegmented (pills over token steps)
 *   • space      → TokenSlider snapping across the spacing scale (space:n)
 *   • dimension  → TokenSlider, free px (px:n)  ← the "padding can be custom" lane
 */
import { useState } from "react";
import * as RadixSlider from "@radix-ui/react-slider";
import { ChevronRight, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { describeBinding } from "@/lib/binding";
import {
  ColorPicker,
  InspectorData,
  Swatch,
} from "@/components/factory/studioShared";

/* ── the card shell ── */

export function ParamCard({
  label,
  overridden,
  onReset,
  children,
}: {
  label: string;
  overridden?: boolean;
  onReset?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-ink-panel/70 px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.25)] backdrop-blur-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-mute">
          {label}
        </span>
        {overridden && onReset ? (
          <button
            type="button"
            title="Reset to default"
            onClick={onReset}
            className="rounded p-0.5 text-fg-mute transition-colors hover:text-fg"
          >
            <RotateCcw size={10} />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/* ── a collapsible inspector section (Figma-style property group) ── */

export function InspectorSection({
  title,
  count,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-1 py-2 text-left"
      >
        <ChevronRight
          size={12}
          className={`shrink-0 text-fg-mute transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-dim">
          {title}
        </span>
        {count != null ? (
          <span className="font-mono text-[10px] text-fg-mute">{count}</span>
        ) : null}
      </button>
      {open ? <div className="space-y-2 px-1 pb-3">{children}</div> : null}
    </div>
  );
}

/* ── an inline option row (label left, control right) ── */

export function OptionRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-[11px] text-fg-dim">{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ── a boolean toggle switch ── */

export function OptionToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative h-5 w-9 rounded-full border transition-colors ${
        value ? "border-fg bg-fg" : "border-line bg-ink"
      }`}
    >
      <span
        className={`absolute top-[3px] h-3 w-3 rounded-full transition-all ${
          value ? "left-[19px] bg-ink" : "left-[3px] bg-fg-mute"
        }`}
      />
    </button>
  );
}

/* ── segmented pills over a token option list ── */

type Option = { label: string; value: string };

/** Short pill label: the head before " · ", minus the redundant type prefix. */
function shorten(opt: Option): string {
  return opt.label.split(" · ")[0].replace(/^(radius|text)-/, "");
}

export function TokenSegmented({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            title={o.label}
            onClick={() => onChange(o.value)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors ${
              on
                ? "bg-fg text-ink"
                : "bg-ink text-fg-mute hover:text-fg-dim"
            }`}
          >
            {shorten(o)}
          </button>
        );
      })}
    </div>
  );
}

/* ── slider (space snaps to scale · dimension is free px) ── */

export function TokenSlider({
  value,
  min,
  max,
  step = 1,
  valueLabel,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  valueLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <RadixSlider.Root
        className="relative flex h-4 flex-1 touch-none select-none items-center"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? value)}
      >
        <RadixSlider.Track className="relative h-[3px] grow rounded-full bg-line">
          <RadixSlider.Range className="absolute h-full rounded-full bg-fg-dim" />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          aria-label={valueLabel}
          className="block h-3.5 w-3.5 rounded-full border-2 border-fg bg-ink shadow transition-transform hover:scale-110 focus:outline-none focus-visible:outline-2"
        />
      </RadixSlider.Root>
      <span className="shrink-0 whitespace-nowrap text-right font-mono text-[10.5px] text-fg-mute">
        {valueLabel}
      </span>
    </div>
  );
}

/* ── colour: swatch button that opens the shared token picker ── */

export function TokenSwatchCard({
  data,
  binding,
  onPick,
}: {
  data: InspectorData;
  binding: string;
  onPick: (binding: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const desc = describeBinding(binding);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-ink px-2 py-1.5 text-left transition-colors hover:border-line-strong"
      >
        <Swatch hex={data.swatch(binding)} size={18} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-[10.5px] text-fg">{desc.label}</span>
          <span className="block text-[9px] uppercase tracking-wide text-fg-mute">{desc.kind}</span>
        </span>
      </button>
      {open ? (
        <ColorPicker
          data={data}
          value={binding}
          onPick={(b) => {
            onPick(b);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
