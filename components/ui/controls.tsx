"use client";

/**
 * Arkitype chrome controls. Quiet by design: monochrome, sentence case,
 * soft radii, hairline borders. Mono type is reserved for values only.
 */
import * as RadixSlider from "@radix-ui/react-slider";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { isValidHex } from "@/lib/color";

/* ── Field wrapper ── */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[13.5px] font-semibold text-fg-dim">{label}</span>
        {hint ? (
          <span className="font-mono text-[12px] text-fg-mute">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function AsideNote({ children }: { children: ReactNode }) {
  return (
    <p className="mb-6 text-[13.5px] leading-relaxed text-fg-mute">{children}</p>
  );
}

export function AsideDivider() {
  return <div className="mb-6 h-px bg-line" />;
}

/* ── Buttons ── */

export function PrimaryButton({
  children,
  onClick,
  disabled,
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-fg px-4 text-[13px] font-medium text-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 ${
        full ? "w-full" : ""
      }`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  full?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line px-3.5 text-[13px] font-medium text-fg-dim transition-colors hover:border-line-strong hover:text-fg ${
        full ? "w-full" : ""
      }`}
    >
      {children}
    </button>
  );
}

/* ── Segmented control ── */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-line bg-ink-panel p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-[13.5px] font-bold transition-colors ${
            value === o.value
              ? "bg-ink-hover text-fg shadow-[inset_0_0_0_1px_#2e2e33]"
              : "text-fg-mute hover:text-fg-dim"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Slider ── */

export function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label} hint={`${value}${unit}`}>
      <RadixSlider.Root
        className="relative flex h-5 w-full touch-none select-none items-center"
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
          aria-label={label}
          className="block h-3.5 w-3.5 rounded-full bg-fg shadow transition-transform hover:scale-110 focus:outline-none focus-visible:outline-2"
        />
      </RadixSlider.Root>
    </Field>
  );
}

/* ── Select ── */

export interface SelectOption {
  label: string;
  value: string;
}

export function SelectControl({
  label,
  value,
  options,
  onChange,
  compact = false,
}: {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const trigger = (
    <RadixSelect.Root value={value} onValueChange={onChange}>
      <RadixSelect.Trigger
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-ink-panel text-left text-fg transition-colors hover:border-line-strong focus:outline-none data-[state=open]:border-line-strong ${
          compact ? "px-2.5 h-8 text-[12.5px] font-medium" : "px-3 py-2 text-[13.5px] font-bold"
        }`}
      >
        <RadixSelect.Value />
        <RadixSelect.Icon>
          <ChevronDown size={13} className="shrink-0 text-fg-mute" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line-strong bg-ink-raised shadow-2xl"
        >
          <RadixSelect.Viewport className="p-1">
            {options.map((o) => (
              <RadixSelect.Item
                key={o.value}
                value={o.value}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-[13px] text-fg-dim outline-none data-[highlighted]:bg-ink-hover data-[highlighted]:text-fg"
              >
                <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={12} className="text-fg" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );

  return label ? <Field label={label}>{trigger}</Field> : trigger;
}

/* ── Hex input ── */

export function HexInput({
  value,
  onChange,
  size = "md",
}: {
  value: string;
  onChange: (hex: string) => void;
  size?: "sm" | "md";
}) {
  const valid = isValidHex(value);
  return (
    <div className="flex items-center gap-2">
      <label
        className={`relative shrink-0 cursor-pointer overflow-hidden rounded-lg border border-line ${
          size === "md" ? "h-9 w-9" : "h-7 w-7"
        }`}
        style={{ background: valid ? value : "#333" }}
      >
        <input
          type="color"
          aria-label="Colour picker"
          value={valid ? value : "#4f46e5"}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <input
        type="text"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border bg-ink-panel font-mono uppercase tracking-wide transition-colors focus:outline-none ${
          size === "md" ? "h-9 px-3 text-[13.5px]" : "h-7 px-2 text-[12px]"
        } ${
          valid
            ? "border-line text-fg focus:border-line-strong"
            : "border-red-500/50 text-red-400"
        }`}
      />
    </div>
  );
}

/* ── WCAG badge ── */

export function WcagBadge({
  tier,
  pass,
}: {
  tier: "AA" | "AAA";
  pass: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold leading-none ${
        pass
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-red-500/10 text-red-400"
      }`}
    >
      {tier} {pass ? "Pass" : "Fail"}
    </span>
  );
}

/* ── Canvas section heading ── */

export function CanvasSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[16px] font-bold text-fg">{title}</h2>
        {hint ? <span className="text-[13px] text-fg-mute">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}
