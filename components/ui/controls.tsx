"use client";

/**
 * Arkitype chrome controls. Quiet by design: monochrome, sentence case,
 * soft radii, hairline borders. Mono type is reserved for values only.
 */
import * as RadixSlider from "@radix-ui/react-slider";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown, Info } from "lucide-react";
import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { isValidHex } from "@/lib/color";

/* ── Tooltip ── */

type TooltipSide = "top" | "bottom" | "left" | "right";

/**
 * Hover/focus tooltip rendered into a portal, so it escapes the inspector's
 * `overflow-y-auto` instead of being clipped by it. Explanatory prose lives
 * here rather than on the surface: the panel stays scannable, and the words are
 * one hover away when someone actually wants them.
 */
export function Tooltip({
  content,
  side = "left",
  children,
  className = "",
}: {
  content: ReactNode;
  side?: TooltipSide;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);

  const GAP = 10;
  const WIDTH = 260;

  const show = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Keep the card on screen: clamp along the cross axis, and flip the main
    // axis when the preferred side has no room.
    const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
    let top: number;
    let left: number;
    if (side === "left" || side === "right") {
      const wantLeft = side === "left" ? r.left - WIDTH - GAP : r.right + GAP;
      const flipped = side === "left" ? r.right + GAP : r.left - WIDTH - GAP;
      left = wantLeft < 8 || wantLeft + WIDTH > window.innerWidth - 8 ? flipped : wantLeft;
      top = r.top + r.height / 2;
    } else {
      left = r.left + r.width / 2 - WIDTH / 2;
      top = side === "top" ? r.top - GAP : r.bottom + GAP;
    }
    setBox({
      top: clamp(top, 12, window.innerHeight - 12),
      left: clamp(left, 8, Math.max(8, window.innerWidth - WIDTH - 8)),
    });
  }, [side]);

  const hide = useCallback(() => setBox(null), []);

  const transform =
    side === "left" || side === "right"
      ? "translateY(-50%)"
      : side === "top"
        ? "translate(0, -100%)"
        : "none";

  return (
    <>
      <span
        ref={anchorRef}
        className={`inline-flex ${className}`}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={box ? id : undefined}
      >
        {children}
      </span>
      {box && typeof document !== "undefined"
        ? createPortal(
            <span
              id={id}
              role="tooltip"
              style={{ top: box.top, left: box.left, width: WIDTH, transform }}
              className="pointer-events-none fixed z-[300] rounded-lg border border-line-strong bg-ink-raised px-3 py-2 text-[11.5px] leading-snug text-fg-dim shadow-2xl"
            >
              {content}
            </span>,
            document.body
          )
        : null}
    </>
  );
}

/** The hover target for a tooltip: a quiet ⓘ that costs one line-height. */
export function InfoTip({
  children,
  side = "left",
  label = "More information",
}: {
  children: ReactNode;
  side?: TooltipSide;
  label?: string;
}) {
  return (
    <Tooltip content={children} side={side} className="shrink-0 align-middle">
      <button
        type="button"
        aria-label={label}
        onClick={(e) => e.preventDefault()}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-fg-mute transition-colors hover:text-fg focus-visible:text-fg focus-visible:outline-none"
      >
        <Info size={12} />
      </button>
    </Tooltip>
  );
}

/* ── Field wrapper ── */

export function Field({
  label,
  hint,
  info,
  children,
}: {
  label: string;
  hint?: string;
  /** Explanatory prose — shown on hover from an ⓘ rather than eating the panel. */
  info?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-fg-dim">
          {label}
          {info ? <InfoTip label={`About ${label}`}>{info}</InfoTip> : null}
        </span>
        {hint ? (
          <span className="font-mono text-[12px] text-fg-mute">{hint}</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/**
 * A standalone aside note. Kept for notes with no control to hang off, but it
 * now renders as a single hoverable line instead of a paragraph — same words,
 * a fraction of the vertical budget.
 */
export function AsideNote({
  children,
  label = "Note",
}: {
  children: ReactNode;
  /** Two or three words naming what the note is about. */
  label?: string;
}) {
  return (
    <Tooltip content={children} side="left">
      <span className="mb-3 flex cursor-help items-center gap-1.5 text-[11.5px] text-fg-mute transition-colors hover:text-fg-dim">
        <Info size={11} className="shrink-0" />
        <span className="truncate underline decoration-dotted underline-offset-2">{label}</span>
      </span>
    </Tooltip>
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
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-line px-3.5 text-[13px] font-medium text-fg-dim transition-colors hover:border-line-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 ${
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
  info,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  info?: ReactNode;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label} hint={`${value}${unit}`} info={info}>
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
  const safeValue = value || "__empty__";
  const safeOptions = options.map((o) => ({
    label: o.label || "(empty)",
    value: o.value || "__empty__",
  }));

  const trigger = (
    <RadixSelect.Root value={safeValue} onValueChange={(val) => onChange(val === "__empty__" ? "" : val)}>
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
            {safeOptions.map((o) => (
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
  compact = false,
}: {
  tier: "AA" | "AAA";
  /** `null` = the tier is not defined for this kind of pairing (non-text AAA). */
  pass: boolean | null;
  compact?: boolean;
}) {
  const tone =
    pass === null
      ? "bg-fg/5 text-fg-mute"
      : pass
        ? "bg-emerald-500/10 text-emerald-400"
        : "bg-red-500/10 text-red-400";
  return (
    <span
      className={`inline-flex items-center rounded-md font-bold leading-none ${tone} ${
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]"
      }`}
      title={pass === null ? `${tier} is not defined for non-text contrast` : undefined}
    >
      {tier}
      {pass === null ? " —" : compact ? "" : pass ? " Pass" : " Fail"}
      {compact && pass !== null ? (pass ? " ✓" : " ✕") : ""}
    </span>
  );
}

/* ── Canvas section heading ── */

export function CanvasSection({
  title,
  hint,
  info,
  actions,
  children,
}: {
  title: string;
  hint?: string;
  /** Longer explanation, moved off the canvas and onto an ⓘ. */
  info?: ReactNode;
  /** Controls docked to the section heading (filters, toggles). */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-6 xl:mb-8">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-[16px] font-bold text-fg">
          {title}
          {info ? <InfoTip side="bottom" label={`About ${title}`}>{info}</InfoTip> : null}
        </h2>
        <div className="flex items-baseline gap-3">
          {hint ? <span className="hidden text-[13px] text-fg-mute lg:inline">{hint}</span> : null}
          {actions}
        </div>
      </div>
      {children}
    </section>
  );
}
