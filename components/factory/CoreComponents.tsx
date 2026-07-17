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
import { resolveRef, resolveToken, rv, sv, tv } from "@/lib/tokens";
import { bestTextOn, contrastRatio } from "@/lib/color";
import { CState, NO_BINDINGS, Resolver, createChildResolver, resolveOptions, useComponentBindings, useVariantComponentBindings } from "@/lib/componentSchema";
import { TokenIconButton } from "./FormControls";

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

export type SizeToken = "sm" | "md" | "lg" | "xl";

/** size → [paddingY step, paddingX step, type step] against system scales */
export const SIZE_MAP: Record<SizeToken, { py: number; px: number; text: string }> = {
  sm: { py: 1, px: 2, text: "xs" },
  md: { py: 1, px: 3, text: "sm" },
  lg: { py: 2, px: 4, text: "base" },
  xl: { py: 3, px: 5, text: "lg" },
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
  variant = "filled",
  state = "default",
  size = "md",
  radiusStep = 2,
  children = "Commit Action",
  fullWidth = false,
  onClick,
  resolve = NO_BINDINGS,
  prefixIcon,
  suffixIcon,
}: {
  variant?: "filled" | "tonal" | "elevated" | "outlined" | "text" | "error" | "warning" | "success";
  state?: InteractionState;
  size?: SizeToken;
  radiusStep?: number;
  children?: ReactNode;
  fullWidth?: boolean;
  onClick?: () => void;
  resolve?: Resolver;
  prefixIcon?: string | ReactNode;
  suffixIcon?: string | ReactNode;
}) {
  const s = SIZE_MAP[size];
  const disabled = state === "disabled";
  const cst = bindState(state);
  // Use variant-scoped resolver for color keys so each variant (text, outlined,
  // tonal…) has independent color overrides that don't bleed into other variants.
  const variantResolve = useVariantComponentBindings("button", variant);
  // For structural props (padding, radius, font) still use the passed-in resolver
  // which falls back through the shared filled-scope bindings.
  const r = (key: string, st?: CState) => variantResolve(key, st) ?? resolve(key, st);
  const mode = useDesignSystem((s) => s.currentPreviewMode);
  const semantics = useDesignSystem((s) => s.semantics);
  const primitives = useDesignSystem((s) => s.primitives);
  // Resolve a token (semantic role OR a raw ramp step like "error-500") to its
  // concrete hex for the active preview mode, so a fill can guarantee readable text.
  const hexOf = (token: string): string =>
    semantics.modes[mode][token] !== undefined
      ? resolveToken({ primitives, semantics }, mode, token)
      : resolveRef(primitives, token);
  // A fill's label: keep the intended on-action colour when it clears AA against
  // that exact background, else fall back to the most readable ink/paper. Guards
  // dark-mode lightened states and pale brand colours from unreadable labels.
  const readableOn = (bgToken: string, preferred = "text-on-action"): string =>
    contrastRatio(hexOf(bgToken), hexOf(preferred)) >= 4.5 ? tv(preferred) : bestTextOn(hexOf(bgToken));

  let defBg = "transparent";
  let defBorder = "transparent";
  let defColor = tv("action-primary-default");
  let defShadow = "none";

  if (disabled) {
    if (variant === "filled" || variant === "error" || variant === "warning" || variant === "success") {
      defBg = mode === "dark" ? tv("neutral-700") : tv("neutral-300");
      defColor = tv("text-muted");
    } else if (variant === "tonal" || variant === "elevated") {
      defBg = tv("surface-subtle");
      defColor = tv("text-muted");
    } else {
      defBg = "transparent";
      defBorder = tv("border-default");
      defColor = tv("text-muted");
    }
  } else {
    // Normal states
    if (variant === "filled") {
      const bgTok = state === "hover" ? "action-primary-hover" : state === "active" ? "action-primary-active" : "action-primary-default";
      defBg = tv(bgTok);
      defColor = readableOn(bgTok);
    } else if (variant === "tonal") {
      // Tonal is a neutral/secondary button — drive it from the action-secondary
      // roles (defined in both light & dark) so hover/active deepen correctly.
      // (Previously leaked the chrome tokens ink-panel/ink-hover and text-dim,
      // which are never emitted as --ark-* vars → undefined → text fell to an
      // inherited near-black. See the semantic maps in useDesignSystem.ts.)
      defBg = state === "hover" ? tv("action-secondary-hover") : state === "active" ? tv("action-secondary-active") : tv("action-secondary-default");
      defColor = tv("text-primary");
    } else if (variant === "elevated") {
      defBg = state === "hover" ? tv("surface-subtle") : state === "active" ? tv("action-secondary-hover") : tv("surface-elevated");
      // Brand-coloured text on a surface must use the mode-tuned link role
      // (brand-600 in light, the lighter brand-400 in dark). action-primary is a
      // fill shade and reads far too dark as text on a dark surface.
      defColor = tv("text-link");
      defShadow = state === "hover" ? "var(--ark-shadow-medium)" : "var(--ark-shadow-low)";
    } else if (variant === "outlined") {
      defBg = state === "hover" ? tv("surface-subtle") : "transparent";
      defBorder = tv("border-default");
      defColor = tv("text-link");
    } else if (variant === "text") {
      defBg = state === "hover" ? tv("surface-subtle") : "transparent";
      defColor = tv("text-link");
    } else if (variant === "error") {
      const bgTok = state === "hover" ? (mode === "dark" ? "error-400" : "error-700") : state === "active" ? (mode === "dark" ? "error-300" : "error-800") : (mode === "dark" ? "error-500" : "error-600");
      defBg = tv(bgTok);
      defColor = readableOn(bgTok);
    } else if (variant === "warning") {
      const bgTok = state === "hover" ? (mode === "dark" ? "warning-400" : "warning-700") : state === "active" ? (mode === "dark" ? "warning-300" : "warning-800") : (mode === "dark" ? "warning-500" : "warning-600");
      defBg = tv(bgTok);
      defColor = readableOn(bgTok);
    } else if (variant === "success") {
      const bgTok = state === "hover" ? (mode === "dark" ? "success-400" : "success-700") : state === "active" ? (mode === "dark" ? "success-300" : "success-800") : (mode === "dark" ? "success-500" : "success-600");
      defBg = tv(bgTok);
      defColor = readableOn(bgTok);
    }
  }

  const isFeedbackVariant = variant === "error" || variant === "warning" || variant === "success";

  const prefixColor = isFeedbackVariant ? defColor : (r("prefixIcon.color", cst) ?? defColor);
  const suffixColor = isFeedbackVariant ? defColor : (r("suffixIcon.color", cst) ?? defColor);
  const prefixIconSize = r("prefixIcon.size") ?? "16px";
  const suffixIconSize = r("suffixIcon.size") ?? "16px";

  const style: CSSProperties = {
    background: isFeedbackVariant ? defBg : (r("container.bg", cst) ?? defBg),
    color: isFeedbackVariant ? defColor : (r("label.color", cst) ?? defColor),
    padding: `${r("container.padY") ?? sv(s.py)} ${r("container.padX") ?? sv(s.px)}`,
    borderRadius: r("container.radius") ?? rv(radiusStep),
    fontSize: r("label.size") ?? `var(--ark-text-${s.text})`,
    fontFamily: r("label.font") ?? "var(--ark-font-sans)",
    fontWeight: r("label.weight") ?? 600,
    border: `${r("container.borderWidth") ?? "1px"} solid ${
      isFeedbackVariant ? defBorder : (r("container.border", cst) ?? defBorder)
    }`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: sv(1.5),
    // A button label must never wrap to a second line — under a tight parent or
    // heavy horizontal padding the icon+label would otherwise stack vertically.
    whiteSpace: "nowrap",
    cursor: disabled ? "not-allowed" : "pointer",
    width: fullWidth ? "100%" : undefined,
    boxShadow: defShadow,
    transition:
      "background var(--ark-duration-fast) var(--ark-ease-out), box-shadow var(--ark-duration-fast) var(--ark-ease-out)",
    ...(state === "focus" ? focusRing() : {}),
  };

  return (
    <button type="button" data-ark-part="container" style={style} disabled={disabled} onClick={onClick}>
      {state === "loading" ? (
        <Loader2 data-ark-part="prefixIcon" size={pxNum(r("prefixIcon.size"), 14)} className="ark-spin" style={{ color: prefixColor }} />
      ) : prefixIcon ? (
        typeof prefixIcon === "string" ? (
          <span className="material-symbols-outlined select-none shrink-0" style={{ fontSize: prefixIconSize, color: prefixColor }}>
            {prefixIcon}
          </span>
        ) : (
          prefixIcon
        )
      ) : null}
      <span data-ark-part="label">{children}</span>
      {suffixIcon ? (
        typeof suffixIcon === "string" ? (
          <span className="material-symbols-outlined select-none shrink-0" style={{ fontSize: suffixIconSize, color: suffixColor }}>
            {suffixIcon}
          </span>
        ) : (
          suffixIcon
        )
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
  value,
  resolve = NO_BINDINGS,
}: {
  state?: InteractionState;
  size?: SizeToken;
  radiusStep?: number;
  placeholder?: string;
  value?: string;
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
      value={value !== undefined ? value : (state === "active" || state === "loading" ? "1,240.00" : "")}
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
    <div data-ark-part="container" style={style} role="combobox" aria-expanded={state === "active"} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}>
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
  icon = true,
  dismissible = false,
  action = false,
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
  action?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  const colors = useDesignSystem((s) => s.primitives.colors);
  const cfg = useDesignSystem((s) => s.components.alert);
  const instances = cfg?.instances;

  const actionOpts = instances?.action ?? {};
  const actionLabel = (actionOpts.label as string) ?? "Learn more";
  const actionVariant = (actionOpts.variant as any) ?? "outlined";
  const actionSize = (actionOpts.size as any) ?? "sm";
  const actionPrefix = (actionOpts.prefixIcon as string) ?? "";
  const actionSuffix = (actionOpts.suffixIcon as string) ?? "";

  const dismissOpts = instances?.dismiss ?? {};
  const dismissVariant = (dismissOpts.variant as any) ?? "ghost";
  const dismissSize = (dismissOpts.size as any) ?? "sm";

  const buttonResolve = useComponentBindings("button");
  const iconButtonResolve = useComponentBindings("iconButton");
  const childButtonResolve = createChildResolver("button", resolve, buttonResolve);
  const childIconButtonResolve = createChildResolver("iconButton", resolve, iconButtonResolve);

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

  const opts = resolveOptions("alert", cfg?.properties);
  const alertTitle = (opts.title || title) as string;
  const alertBody = (opts.body || body) as string;
  // Scale Step is a raw property, not a declared OptionSpec — resolveOptions()
  // only surfaces declared keys, so read it straight off the properties bag.
  const titleSize = (cfg?.properties?.["title.size"] ?? "sm") as string;
  const bodySize = (cfg?.properties?.["body.size"] ?? "xs") as string;

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
        alignItems: "center",
        gap: sv(2),
        width: "100%",
      }}
    >
      {icon ? (
        <Icon size={16} style={{ color: glyph, flexShrink: 0 }} />
      ) : null}
      <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: sv(0.5) }}>
        <span
          style={{
            fontSize: `var(--ark-text-${titleSize})`,
            lineHeight: `var(--ark-leading-${titleSize})`,
            fontWeight: `var(--ark-weight-${titleSize})`,
            fontFamily: `var(--ark-font-role-${titleSize})`,
          }}
        >
          {alertTitle || `${variant.charAt(0).toUpperCase()}${variant.slice(1)} signal`}
        </span>
        <span
          style={{
            fontSize: `var(--ark-text-${bodySize})`,
            lineHeight: `var(--ark-leading-${bodySize})`,
            fontWeight: `var(--ark-weight-${bodySize})`,
            fontFamily: `var(--ark-font-role-${bodySize})`,
            opacity: 0.85,
          }}
        >
          {alertBody || "Token-mapped alert surface. Wash, border and accent resolve from the primitive ramp per mode."}
        </span>
      </span>
      {action ? (
        <div style={{ flexShrink: 0, marginLeft: "4px" }}>
          <TokenButton
            variant={actionVariant}
            size={actionSize}
            prefixIcon={actionPrefix}
            suffixIcon={actionSuffix}
            resolve={childButtonResolve}
          >
            {actionLabel}
          </TokenButton>
        </div>
      ) : null}
      {dismissible ? (
        <div style={{ flexShrink: 0, marginLeft: "4px" }}>
          <TokenIconButton
            variant={dismissVariant}
            size={dismissSize}
            resolve={childIconButtonResolve}
            aria-label="Dismiss alert"
            onClick={() => {}}
          >
            <X size={14} />
          </TokenIconButton>
        </div>
      ) : null}
    </div>
  );
}
