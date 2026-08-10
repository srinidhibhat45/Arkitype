"use client";

/**
 * Arkitype chrome controls. Quiet by design: monochrome, sentence case,
 * soft radii, hairline borders. Mono type is reserved for values only.
 */
import * as RadixSlider from "@radix-ui/react-slider";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown, Info } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
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
  disabled = false,
  title,
}: {
  options: Array<{ label: string; value: T }>;
  value: T;
  onChange: (value: T) => void;
  /**
   * Inert, and visibly so. For a switch that belongs on this surface but has
   * nothing to act on here — the honest state is a dimmed control that says
   * why (pass `title`), not a live one that does nothing when pressed.
   */
  disabled?: boolean;
  title?: string;
}) {
  return (
    <div
      title={title}
      aria-disabled={disabled || undefined}
      className={`inline-flex flex-wrap rounded-lg border border-line bg-ink-panel p-0.5 transition-opacity ${
        disabled ? "cursor-not-allowed opacity-40" : ""
      }`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-2.5 py-1 text-[13.5px] font-bold transition-colors ${
            disabled ? "pointer-events-none" : ""
          } ${
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
  hideSwatch = false,
}: {
  value: string;
  onChange: (hex: string) => void;
  size?: "sm" | "md";
  /** Drop the built-in swatch where a `ColorWell` is already standing beside it,
   *  so the same colour isn't offered by two controls an inch apart. */
  hideSwatch?: boolean;
}) {
  const valid = isValidHex(value);
  return (
    <div className="flex items-center gap-2">
      {hideSwatch ? null : (
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
      )}
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

/* ── Colour well (swatch → picker popover with opacity) ── */

const CHECKER: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg,#8883 25%,transparent 25%,transparent 75%,#8883 75%),linear-gradient(45deg,#8883 25%,transparent 25%,transparent 75%,#8883 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0,4px 4px",
};

/**
 * The colour swatch, and everything you can do to a colour in one place.
 *
 * Opacity used to be a slider parked on the row itself — one per token per
 * mode, mostly sitting at 100% and costing the row the width it needed for a
 * name and a value. Taking it away made the rows breathe and made opacity
 * undiscoverable, which is a worse trade. So it lives here, in the picker,
 * which is where you go when you want to change what a colour *is*: hue in the
 * top half, opacity in the bottom, and the row keeps only a chip that appears
 * when there is something to say.
 *
 * The popover is portalled and positioned in viewport coordinates, so a scroll
 * container can't clip it — the same reason `Tooltip` does it.
 */
export function ColorWell({
  resolved,
  alpha,
  onPickColor,
  onAlphaChange,
  label,
  size = "md",
}: {
  /** The colour to paint, alpha included — an 8-digit hex shows the checkerboard. */
  resolved: string;
  /** 0–100. */
  alpha: number;
  /** A new opaque hex was picked. */
  onPickColor: (hex: string) => void;
  /** A new opacity was set. */
  onAlphaChange: (pct: number) => void;
  /** Names the control for screen readers, e.g. "surface-base light". */
  label: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const WIDTH = 216;

  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setBox({
      top: Math.min(r.bottom + 6, window.innerHeight - 132),
      left: Math.max(8, Math.min(r.left, window.innerWidth - WIDTH - 8)),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // Reposition rather than close: the canvas scrolls under this constantly,
    // and a picker that vanishes when the page moves is a picker you fight.
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  const opaque = stripAlphaHex(resolved);
  const box7 = size === "md" ? "h-7 w-7" : "h-6 w-6";

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${label} colour and opacity`}
        aria-expanded={open}
        title={`${resolved} — click to pick a colour and set opacity`}
        className={`relative shrink-0 cursor-pointer overflow-hidden rounded-md border transition-colors ${box7} ${
          open ? "border-focus" : "border-line-strong hover:border-fg-mute"
        }`}
        style={CHECKER}
      >
        <span className="absolute inset-0" style={{ background: resolved }} />
      </button>

      {open && box
        ? createPortal(
            <div
              ref={popRef}
              style={{ top: box.top, left: box.left, width: WIDTH }}
              className="fixed z-[120] rounded-lg border border-line-strong bg-ink-raised p-2.5 shadow-2xl"
            >
              <p className="mb-2 truncate font-mono text-[10px] text-fg-mute">{label}</p>

              <div className="mb-2.5 flex items-center gap-2">
                <label
                  className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-md border border-line-strong"
                  style={CHECKER}
                >
                  <span className="absolute inset-0" style={{ background: resolved }} />
                  <input
                    type="color"
                    aria-label={`${label} colour`}
                    value={isValidHex(opaque) ? opaque : "#000000"}
                    onChange={(e) => onPickColor(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] uppercase text-fg-dim">
                  {opaque}
                </span>
              </div>

              <div className="flex items-center gap-2 border-t border-line pt-2">
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-mute">
                  Opacity
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={alpha}
                  aria-label={`${label} opacity`}
                  onChange={(e) => onAlphaChange(Number(e.target.value))}
                  className="h-1 min-w-0 flex-1 cursor-pointer accent-fg"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={alpha}
                  aria-label={`${label} opacity percent`}
                  onChange={(e) => onAlphaChange(Number(e.target.value))}
                  className="w-11 shrink-0 rounded border border-line bg-ink px-1 py-0.5 text-right font-mono text-[10px] tabular-nums text-fg-dim focus:border-line-strong focus:outline-none"
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

/** Drop any alpha channel for the native picker, which only speaks #RRGGBB. */
function stripAlphaHex(hex: string): string {
  const raw = (hex ?? "").trim().replace(/^#/, "");
  if (raw.length === 8) return `#${raw.slice(0, 6)}`;
  if (raw.length === 4) return `#${raw.slice(0, 3)}`;
  return hex;
}

/* ── Alpha chip ── */

/**
 * A token's opacity, stated only when there is something to state.
 *
 * This replaced a slider that sat on every colour row in every mode column — a
 * hundred-odd of them on the semantic tier alone, each costing ~80px of a row
 * that also has to hold a name, a value and a verdict, and almost all of them
 * parked at 100%. Opacity is still fully editable: it is part of the value
 * grammar the field next door already takes (`brand-600/40`, `#3B82F666`), so
 * the control was duplicating a control. What was worth keeping is the *signal*
 * — that this one token is not opaque — which is what this is.
 */
export function AlphaChip({
  alpha,
  label,
  onClear,
}: {
  /** 0–100. At 100 this renders nothing at all. */
  alpha: number;
  /** What the chip is describing, for the accessible name. */
  label: string;
  onClear: () => void;
}) {
  if (alpha >= 100) return null;
  return (
    <Tooltip
      side="left"
      content={
        <>
          <span className="font-mono text-fg">{label}</span> is at {alpha}% opacity, so
          it renders as a blend with whatever sits behind it — which is how the
          contrast audit measures it. Type a different <span className="font-mono text-fg">/NN</span>{" "}
          in the value field to change it, or click here to make it opaque.
        </>
      }
    >
      <button
        type="button"
        onClick={onClear}
        aria-label={`${label} opacity ${alpha}% — click to make opaque`}
        className="inline-flex shrink-0 items-center rounded border border-line px-1 py-px font-mono text-[9px] font-bold leading-none tabular-nums text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
      >
        {alpha}%
      </button>
    </Tooltip>
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
