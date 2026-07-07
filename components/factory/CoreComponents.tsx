"use client";

/**
 * Core token-driven components: Button, Input, Select, Alert.
 * Every visual attribute is consumed from --ark-* variables (set by a
 * ThemeFrame ancestor) or the live store — zero hardcoded styles.
 * Each component accepts a forced interaction state so the factory can render
 * Default / Hover / Focus / Active / Loading / Disabled side-by-side.
 */
import type { CSSProperties, ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Info,
  Loader2,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { PreviewMode, useDesignSystem } from "@/store/useDesignSystem";
import { rv, sv, tv } from "@/lib/tokens";
import { CState, NO_BINDINGS, Resolver } from "@/lib/componentSchema";

export type InteractionState =
  | "default"
  | "hover"
  | "focus"
  | "active"
  | "loading"
  | "disabled";

export const INTERACTION_STATES: InteractionState[] = [
  "default",
  "hover",
  "focus",
  "active",
  "loading",
  "disabled",
];

export type SizeToken = "sm" | "md" | "lg";

/** size → [paddingY step, paddingX step, type step] against system scales */
export const SIZE_MAP: Record<SizeToken, { py: number; px: number; text: string }> = {
  sm: { py: 1, px: 2, text: "xs" },
  md: { py: 1, px: 3, text: "sm" },
  lg: { py: 2, px: 4, text: "base" },
};

export function focusRing(): CSSProperties {
  return {
    outline: `2px solid ${tv("border-focus")}`,
    outlineOffset: "2px",
  };
}

/** Map a rendering interaction-state to a schema binding state. */
export const bindState = (state: InteractionState): CState =>
  state === "loading" ? "default" : state;

/** Parse a resolved dimension binding ("14px") back to a number for icon size. */
export function pxNum(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

/* ── Button ── */

export function TokenButton({
  state = "default",
  size = "md",
  radiusStep = 2,
  children = "Commit Action",
  fullWidth = false,
  onClick,
  resolve = NO_BINDINGS,
  prefixIcon = false,
  suffixIcon = false,
}: {
  state?: InteractionState;
  size?: SizeToken;
  radiusStep?: number;
  children?: ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
  resolve?: Resolver;
  prefixIcon?: boolean;
  suffixIcon?: boolean;
}) {
  const s = SIZE_MAP[size];
  const disabled = state === "disabled";
  const cst = bindState(state);
  const r = resolve;

  const defBg =
    state === "hover"
      ? tv("action-primary-hover")
      : state === "active"
        ? tv("action-primary-active")
        : disabled
          ? tv("action-primary-disabled")
          : tv("action-primary-default");
  const onAction = disabled ? tv("text-muted") : tv("text-on-action");
  const prefixColor = r("prefixIcon.color", cst) ?? onAction;
  const suffixColor = r("suffixIcon.color", cst) ?? onAction;

  const style: CSSProperties = {
    background: r("container.bg", cst) ?? defBg,
    color: r("label.color", cst) ?? onAction,
    padding: `${r("container.padY") ?? sv(s.py)} ${r("container.padX") ?? sv(s.px)}`,
    borderRadius: r("container.radius") ?? rv(radiusStep),
    fontSize: r("label.size") ?? `var(--ark-text-${s.text})`,
    fontFamily: r("label.font") ?? "var(--ark-font-sans)",
    fontWeight: r("label.weight") ?? 600,
    border: `${r("container.borderWidth") ?? "1px"} solid ${
      r("container.border", cst) ?? "transparent"
    }`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: sv(1),
    cursor: disabled ? "not-allowed" : "pointer",
    width: fullWidth ? "100%" : undefined,
    boxShadow: state === "hover" ? "var(--ark-shadow-low)" : "none",
    transition:
      "background var(--ark-duration-fast) var(--ark-ease-out), box-shadow var(--ark-duration-fast) var(--ark-ease-out)",
    ...(state === "focus" ? focusRing() : {}),
  };

  return (
    <button type="button" data-ark-part="container" style={style} disabled={disabled} onClick={onClick}>
      {state === "loading" ? (
        <Loader2 data-ark-part="prefixIcon" size={pxNum(r("prefixIcon.size"), 14)} className="ark-spin" style={{ color: prefixColor }} />
      ) : prefixIcon ? (
        <Sparkles data-ark-part="prefixIcon" size={pxNum(r("prefixIcon.size"), 14)} style={{ color: prefixColor }} />
      ) : null}
      <span data-ark-part="label">{children}</span>
      {suffixIcon ? (
        <ArrowRight data-ark-part="suffixIcon" size={pxNum(r("suffixIcon.size"), 14)} style={{ color: suffixColor }} />
      ) : null}
    </button>
  );
}

/* ── Input ── */

export function TokenInput({
  state = "default",
  size = "md",
  radiusStep = 2,
  placeholder = "Amount, e.g. 1,240.00",
  resolve = NO_BINDINGS,
}: {
  state?: InteractionState;
  size?: SizeToken;
  radiusStep?: number;
  placeholder?: string;
  resolve?: Resolver;
}) {
  const s = SIZE_MAP[size];
  const disabled = state === "disabled";
  const cst = bindState(state);
  const r = resolve;
  const defBorder =
    state === "focus"
      ? tv("border-focus")
      : state === "hover" || state === "active"
        ? tv("text-muted")
        : tv("border-default");

  const style: CSSProperties = {
    background:
      r("container.bg", cst) ?? (disabled ? tv("surface-subtle") : tv("surface-elevated")),
    color: r("text.color", cst) ?? (disabled ? tv("text-muted") : tv("text-primary")),
    padding: `${r("container.padY") ?? sv(s.py)} ${r("container.padX") ?? sv(s.px)}`,
    borderRadius: r("container.radius") ?? rv(radiusStep),
    fontSize: r("text.size") ?? `var(--ark-text-${s.text})`,
    fontFamily: r("text.font") ?? "var(--ark-font-sans)",
    border: `${r("container.borderWidth") ?? "1px"} solid ${r("container.border", cst) ?? defBorder}`,
    width: "100%",
    cursor: disabled ? "not-allowed" : "text",
    boxShadow:
      state === "focus" ? `0 0 0 3px color-mix(in srgb, ${tv("border-focus")} 25%, transparent)` : "none",
    transition:
      "border-color var(--ark-duration-fast) var(--ark-ease-out), box-shadow var(--ark-duration-fast) var(--ark-ease-out)",
  };

  return (
    <input
      type="text"
      data-ark-part="container text"
      readOnly
      disabled={disabled}
      style={style}
      placeholder={placeholder}
      value={state === "active" || state === "loading" ? "1,240.00" : ""}
      aria-busy={state === "loading"}
    />
  );
}

/* ── Textarea ── */

export function TokenTextarea({
  state = "default",
  size = "md",
  radiusStep = 2,
  placeholder = "Add a memo for this transaction…",
  resolve = NO_BINDINGS,
}: {
  state?: InteractionState;
  size?: SizeToken;
  radiusStep?: number;
  placeholder?: string;
  resolve?: Resolver;
}) {
  const s = SIZE_MAP[size];
  const disabled = state === "disabled";
  const cst = bindState(state);
  const r = resolve;
  const defBorder =
    state === "focus"
      ? tv("border-focus")
      : state === "hover" || state === "active"
        ? tv("text-muted")
        : tv("border-default");

  return (
    <textarea
      data-ark-part="container text"
      readOnly
      disabled={disabled}
      rows={3}
      placeholder={placeholder}
      value={
        state === "active" || state === "loading"
          ? "Quarterly retainer, net-30 terms agreed on the June call."
          : ""
      }
      aria-busy={state === "loading"}
      style={{
        background:
          r("container.bg", cst) ?? (disabled ? tv("surface-subtle") : tv("surface-elevated")),
        color: r("text.color", cst) ?? (disabled ? tv("text-muted") : tv("text-primary")),
        padding: `${r("container.padY") ?? sv(s.py)} ${r("container.padX") ?? sv(s.px)}`,
        borderRadius: r("container.radius") ?? rv(radiusStep),
        fontSize: r("text.size") ?? `var(--ark-text-${s.text})`,
        fontFamily: r("text.font") ?? "var(--ark-font-sans)",
        border: `${r("container.borderWidth") ?? "1px"} solid ${r("container.border", cst) ?? defBorder}`,
        width: "100%",
        resize: "none",
        cursor: disabled ? "not-allowed" : "text",
        boxShadow:
          state === "focus"
            ? `0 0 0 3px color-mix(in srgb, ${tv("border-focus")} 25%, transparent)`
            : "none",
        transition:
          "border-color var(--ark-duration-fast) var(--ark-ease-out), box-shadow var(--ark-duration-fast) var(--ark-ease-out)",
      }}
    />
  );
}

/* ── Select ── */

export function TokenSelect({
  state = "default",
  size = "md",
  radiusStep = 2,
  value = "Operating Budget",
  resolve = NO_BINDINGS,
}: {
  state?: InteractionState;
  size?: SizeToken;
  radiusStep?: number;
  value?: string;
  resolve?: Resolver;
}) {
  const s = SIZE_MAP[size];
  const disabled = state === "disabled";
  const cst = bindState(state);
  const r = resolve;
  const defBorder =
    state === "focus" || state === "active"
      ? tv("border-focus")
      : state === "hover"
        ? tv("text-muted")
        : tv("border-default");
  const chevronColor = r("chevron.color", cst) ?? tv("text-muted");

  const style: CSSProperties = {
    background:
      r("container.bg", cst) ?? (disabled ? tv("surface-subtle") : tv("surface-elevated")),
    color: r("text.color", cst) ?? (disabled ? tv("text-muted") : tv("text-primary")),
    padding: `${r("container.padY") ?? sv(s.py)} ${r("container.padX") ?? sv(s.px)}`,
    borderRadius: r("container.radius") ?? rv(radiusStep),
    fontSize: r("text.size") ?? `var(--ark-text-${s.text})`,
    fontFamily: r("text.font") ?? "var(--ark-font-sans)",
    border: `${r("container.borderWidth") ?? "1px"} solid ${r("container.border", cst) ?? defBorder}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: sv(2),
    width: "100%",
    cursor: disabled ? "not-allowed" : "pointer",
    ...(state === "focus" ? focusRing() : {}),
  };

  return (
    <div data-ark-part="container" style={style} role="combobox" aria-expanded={state === "active"} aria-disabled={disabled}>
      <span data-ark-part="text">{state === "loading" ? "Loading options…" : value}</span>
      {state === "loading" ? (
        <Loader2 data-ark-part="chevron" size={pxNum(r("chevron.size"), 13)} className="ark-spin" style={{ color: chevronColor }} />
      ) : (
        <ChevronDown
          data-ark-part="chevron"
          size={pxNum(r("chevron.size"), 13)}
          style={{
            color: chevronColor,
            transform: state === "active" ? "rotate(180deg)" : "none",
            transition: "transform var(--ark-duration-fast) var(--ark-ease-out)",
          }}
        />
      )}
    </div>
  );
}

/* ── Alert ── */

export type AlertVariant = "info" | "success" | "warning" | "error";

/** Alert visual style + emphasis-bar placement (see componentSchema options). */
export type AlertStyle = "subtle" | "solid" | "outline";
export type AlertAccent = "left" | "top" | "none";

const ALERT_ICON = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
} as const;

export function TokenAlert({
  variant = "info",
  mode,
  radiusStep = 3,
  title,
  body,
  style = "subtle",
  accent = "left",
  icon = false,
  dismissible = false,
  resolve = NO_BINDINGS,
}: {
  variant?: AlertVariant;
  mode: PreviewMode;
  radiusStep?: number;
  title?: string;
  body?: string;
  style?: AlertStyle;
  accent?: AlertAccent;
  icon?: boolean;
  dismissible?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  const colors = useDesignSystem((s) => s.primitives.colors);
  const slot =
    variant === "info"
      ? "secondary"
      : variant === "success"
        ? "success"
        : variant === "warning"
          ? "warning"
          : "error";
  const ramp = colors[slot];
  // Mode-aware primitive steps: pale wash + strong text in light, inverse in dark.
  const wash = mode === "light" ? ramp[0] : ramp[9];
  const washBorder = mode === "light" ? ramp[2] : ramp[7];
  const washText = mode === "light" ? ramp[8] : ramp[1];
  const accentC = ramp[5];

  // Style resolves the surface/border/text triple; solid inverts to a filled tone.
  const surface =
    style === "solid" ? ramp[6] : style === "outline" ? "transparent" : wash;
  const borderC =
    style === "solid" ? ramp[6] : style === "outline" ? accentC : washBorder;
  const text = style === "solid" ? ramp[0] : washText;
  const glyph = style === "solid" ? ramp[0] : accentC;

  // Longhand border sides (not the `border` shorthand) so the accent bar never
  // mixes shorthand + non-shorthand — which React warns about on rerender.
  const Icon = ALERT_ICON[variant];

  return (
    <div
      role="alert"
      style={{
        background: surface,
        borderStyle: "solid",
        borderTopWidth: accent === "top" ? 3 : 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: accent === "left" ? 3 : 1,
        borderTopColor: accent === "top" ? accentC : borderC,
        borderRightColor: borderC,
        borderBottomColor: borderC,
        borderLeftColor: accent === "left" ? accentC : borderC,
        borderRadius: r("container.radius") ?? rv(radiusStep),
        padding: `${r("container.padY") ?? sv(2)} ${r("container.padX") ?? sv(3)}`,
        color: text,
        fontFamily: r("text.font") ?? "var(--ark-font-sans)",
        display: "flex",
        alignItems: "flex-start",
        gap: sv(2),
      }}
    >
      {icon ? (
        <Icon size={16} style={{ color: glyph, flexShrink: 0, marginTop: 1 }} />
      ) : null}
      <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: sv(1) }}>
        <span style={{ fontSize: "var(--ark-text-sm)", fontWeight: 700 }}>
          {title ?? `${variant.charAt(0).toUpperCase()}${variant.slice(1)} signal`}
        </span>
        <span style={{ fontSize: "var(--ark-text-xs)", opacity: 0.85 }}>
          {body ??
            "Token-mapped alert surface. Wash, border and accent resolve from the primitive ramp per mode."}
        </span>
      </span>
      {dismissible ? (
        <X
          size={14}
          style={{ color: text, opacity: 0.6, cursor: "pointer", flexShrink: 0 }}
          aria-label="Dismiss"
        />
      ) : null}
    </div>
  );
}
