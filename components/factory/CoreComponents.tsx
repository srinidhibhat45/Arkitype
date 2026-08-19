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
import { PreviewMode, modeBase, useDesignSystem } from "@/store/useDesignSystem";
import { resolveRef, resolveToken, rv, sv, tv } from "@/lib/tokens";
import { bestTextOn, contrastRatio } from "@/lib/color";
import { CState, NO_BINDINGS, Resolver, createChildResolver, resolveOptions, useComponentBindings, useVariantComponentBindings } from "@/lib/componentSchema";
import { TokenIconButton } from "./FormControls";
import {
  ToneColors,
  materialSurface,
  appleSurface,
  appleIconBadge,
  carbonSurface,
  TemplateTextAction,
  AppleTrailingAction,
  AppleDismiss,
  CarbonCloseButton,
  MATERIAL_RADIUS,
  APPLE_RADIUS,
  useTemplate,
  tplRadius,
  tplPad,
  tplType,
  tplWeight,
  tplEdge,
  tplFieldBg,
  tplFieldBorderWidth,
  tplShadow,
} from "./templateKit";

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

// The size scale lives in lib/sizing.ts so the Figma exporter reads the exact
// same mapping the preview renders from. Re-exported here for existing imports.
import { SIZE_MAP as SHARED_SIZE_MAP, type SizeToken as SharedSizeToken } from "@/lib/sizing";

export type SizeToken = SharedSizeToken;
export const SIZE_MAP = SHARED_SIZE_MAP;

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
  // Shape grammar for the active template (lib/componentTemplates.ts). A button
  // takes corner, density and label weight from it — but never its border
  // width: the `outlined` variant is a declared option, and a borderless
  // system zeroing it would leave that option doing nothing.
  const tpl = useTemplate("button");
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
    semantics.modes[mode]?.[token] !== undefined
      ? resolveToken({ primitives, semantics }, mode, token)
      : resolveRef(primitives, token);
  // A fill's label: keep the intended on-action colour when it clears AA against
  // that exact background, else fall back to the most readable ink/paper. Guards
  // dark-mode lightened states and pale brand colours from unreadable labels.
  const readableOn = (bgToken: string, preferred = "text-on-action"): string =>
    contrastRatio(hexOf(bgToken), hexOf(preferred)) >= 4.5 ? tv(preferred) : bestTextOn(hexOf(bgToken));

  // Fallbacks that aren't tokens (a disabled fill, a wash off a raw ramp) ask
  // how the mode *looks*, not what it's called.
  const base = modeBase(semantics, mode);

  let defBg = "transparent";
  let defBorder = "transparent";
  let defColor = tv("action-primary-default");
  let defShadow = "none";

  if (disabled) {
    if (variant === "filled" || variant === "error" || variant === "warning" || variant === "success") {
      defBg = base === "dark" ? tv("neutral-700") : tv("neutral-300");
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
      const bgTok = state === "hover" ? (base === "dark" ? "error-400" : "error-700") : state === "active" ? (base === "dark" ? "error-300" : "error-800") : (base === "dark" ? "error-500" : "error-600");
      defBg = tv(bgTok);
      defColor = readableOn(bgTok);
    } else if (variant === "warning") {
      const bgTok = state === "hover" ? (base === "dark" ? "warning-400" : "warning-700") : state === "active" ? (base === "dark" ? "warning-300" : "warning-800") : (base === "dark" ? "warning-500" : "warning-600");
      defBg = tv(bgTok);
      defColor = readableOn(bgTok);
    } else if (variant === "success") {
      const bgTok = state === "hover" ? (base === "dark" ? "success-400" : "success-700") : state === "active" ? (base === "dark" ? "success-300" : "success-800") : (base === "dark" ? "success-500" : "success-600");
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
    ...tplType(tpl),
    background: isFeedbackVariant ? defBg : (r("container.bg", cst) ?? defBg),
    color: isFeedbackVariant ? defColor : (r("label.color", cst) ?? defColor),
    padding: `${r("container.padY") ?? tplPad(tpl, sv(s.py))} ${r("container.padX") ?? tplPad(tpl, sv(s.px))}`,
    borderRadius: r("container.radius") ?? tplRadius(tpl, "control") ?? rv(radiusStep),
    fontSize: r("label.size") ?? `var(--ark-text-${s.text})`,
    fontFamily: r("label.font") ?? "var(--ark-font-sans)",
    fontWeight: r("label.weight") ?? tplWeight(tpl) ?? 600,
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
  const tpl = useTemplate("input");
  const defBorder =
    state === "focus"
      ? tv("border-focus")
      : state === "hover" || state === "active"
        ? tv("text-muted")
        : tv("border-default");

  // Field edge grammar: each system draws a text field's edge differently —
  // Material's single underline, Apple's borderless fill, Carbon's bottom rule,
  // Atlassian's heavy box, Fluent's accent stroke. `tplEdge` returns longhand
  // sides so a bound border colour still paints whichever edge survives.
  const style: CSSProperties = {
    background:
      r("container.bg", cst) ??
      (disabled ? tv("surface-subtle") : tplFieldBg(tpl) ?? tv("surface-elevated")),
    color: r("text.color", cst) ?? (disabled ? tv("text-muted") : tv("text-primary")),
    padding: `${r("container.padY") ?? tplPad(tpl, sv(s.py))} ${r("container.padX") ?? tplPad(tpl, sv(s.px))}`,
    borderRadius: r("container.radius") ?? tplRadius(tpl, "field") ?? rv(radiusStep),
    fontSize: r("text.size") ?? `var(--ark-text-${s.text})`,
    fontFamily: r("text.font") ?? "var(--ark-font-sans)",
    ...tplEdge(tpl, {
      color: r("container.border", cst) ?? defBorder,
      width: r("container.borderWidth") ?? tplFieldBorderWidth(tpl) ?? "1px",
      kind: "field",
      accent: tv("border-focus"),
      focused: state === "focus",
    }),
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
  const tpl = useTemplate("textarea");
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
          r("container.bg", cst) ??
          (disabled ? tv("surface-subtle") : tplFieldBg(tpl) ?? tv("surface-elevated")),
        color: r("text.color", cst) ?? (disabled ? tv("text-muted") : tv("text-primary")),
        padding: `${r("container.padY") ?? tplPad(tpl, sv(s.py))} ${r("container.padX") ?? tplPad(tpl, sv(s.px))}`,
        borderRadius: r("container.radius") ?? tplRadius(tpl, "field") ?? rv(radiusStep),
        fontSize: r("text.size") ?? `var(--ark-text-${s.text})`,
        fontFamily: r("text.font") ?? "var(--ark-font-sans)",
        ...tplEdge(tpl, {
          color: r("container.border", cst) ?? defBorder,
          width: r("container.borderWidth") ?? tplFieldBorderWidth(tpl) ?? "1px",
          kind: "field",
          accent: tv("border-focus"),
          focused: state === "focus",
        }),
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
  const tpl = useTemplate("select");
  const defBorder =
    state === "focus" || state === "active"
      ? tv("border-focus")
      : state === "hover"
        ? tv("text-muted")
        : tv("border-default");
  const chevronColor = r("chevron.color", cst) ?? tv("text-muted");

  const style: CSSProperties = {
    background:
      r("container.bg", cst) ??
      (disabled ? tv("surface-subtle") : tplFieldBg(tpl) ?? tv("surface-elevated")),
    color: r("text.color", cst) ?? (disabled ? tv("text-muted") : tv("text-primary")),
    padding: `${r("container.padY") ?? tplPad(tpl, sv(s.py))} ${r("container.padX") ?? tplPad(tpl, sv(s.px))}`,
    borderRadius: r("container.radius") ?? tplRadius(tpl, "field") ?? rv(radiusStep),
    fontSize: r("text.size") ?? `var(--ark-text-${s.text})`,
    fontFamily: r("text.font") ?? "var(--ark-font-sans)",
    ...tplEdge(tpl, {
      color: r("container.border", cst) ?? defBorder,
      width: r("container.borderWidth") ?? tplFieldBorderWidth(tpl) ?? "1px",
      kind: "field",
      accent: tv("border-focus"),
      focused: state === "focus" || state === "active",
    }),
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
  template,
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
  /** Template id (see lib/componentTemplates.ts). Falls back to the stored
   *  choice when omitted, so callers that don't know about templates (or a
   *  hypothetical preview overriding it) both work unchanged. */
  template?: string;
}) {
  const r = resolve;
  const colors = useDesignSystem((s) => s.primitives.colors);
  const alertSemantics = useDesignSystem((s) => s.semantics);
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
  // Appearance-aware primitive steps: pale wash + strong text on a light frame,
  // inverse on a dark one — whatever the mode happens to be called.
  const alertBase = modeBase(alertSemantics, mode);
  const wash = alertBase === "light" ? ramp[0] : ramp[9];
  const washBorder = alertBase === "light" ? ramp[2] : ramp[7];
  const washText = alertBase === "light" ? ramp[8] : ramp[1];
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

  // ── Templates (lib/componentTemplates.ts) — structure only. Every branch
  // below reuses the exact tone/title/body/icon/action/dismiss values already
  // resolved above, through the same `resolve()` chain, so a user's own part
  // overrides and their brand colours both carry over automatically. The
  // default branch at the bottom of this function is untouched — anyone who
  // never opens the picker gets pixel-identical output to before.
  // One source of truth for "which template is active": the hook resolves an
  // explicit prop, then a preview scope, then the stored choice, so the
  // structural branch and the shape grammar can never disagree. The three
  // structural branches below (Material/Apple/Carbon) carry their own tuned
  // geometry; the profile is what dresses the *default* layout for the systems
  // that restyle rather than rebuild it — Atlassian's 8px borderless card,
  // Fluent's stroked one.
  const tpl = useTemplate("alert", template);
  const activeTemplate = tpl.id;
  // The tone handed to the template kit is the *style-aware* triple computed
  // above, not the raw wash — so the Style option (subtle / solid / outline)
  // keeps working in every template rather than silently doing nothing once a
  // template is picked. `accent` (bar placement) is the one option a template
  // legitimately overrides: each system has its own fixed emphasis treatment.
  const tone: ToneColors = { bg: surface, border: borderC, text, accent: accentC };
  const outlined = style === "outline";

  if (activeTemplate === "material3") {
    return (
      <div
        role="alert"
        style={{
          ...materialSurface(tone),
          border: outlined ? `1px solid ${borderC}` : "none",
          borderRadius: r("container.radius") ?? `${MATERIAL_RADIUS.md}px`,
          padding: `${r("container.padY") ?? sv(3)} ${r("container.padX") ?? sv(4)}`,
          fontFamily: r("text.font") ?? "var(--ark-font-sans)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: sv(2) }}>
          {icon ? <Icon size={18} style={{ color: glyph, flexShrink: 0, marginTop: 1 }} /> : null}
          <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
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
          {dismissible ? (
            <button
              type="button"
              aria-label="Dismiss alert"
              onClick={() => {}}
              style={{
                background: "none",
                border: "none",
                padding: 2,
                margin: 0,
                cursor: "pointer",
                color: tone.text,
                opacity: 0.6,
                flexShrink: 0,
                display: "inline-flex",
              }}
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
        {action ? (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            {/* `glyph`, not the raw accent: on a solid fill the accent is a
                mid-ramp tone sitting on its own darker sibling, which fails
                contrast. `glyph` already tracks the Style option. */}
            <TemplateTextAction label={actionLabel} color={glyph} variant="material" />
          </div>
        ) : null}
      </div>
    );
  }

  if (activeTemplate === "apple") {
    return (
      <div
        role="alert"
        style={{
          ...appleSurface(),
          borderRadius: r("container.radius") ?? `${APPLE_RADIUS.md}px`,
          padding: `${r("container.padY") ?? sv(2)} ${r("container.padX") ?? sv(3)}`,
          fontFamily: r("text.font") ?? "var(--ark-font-sans)",
          display: "flex",
          alignItems: "flex-start",
          gap: sv(2),
          width: "100%",
        }}
      >
        {/* The Apple card is neutral by design — the tone lives in the badge,
            so Style drives the badge fill here rather than the surface. */}
        {icon ? (
          <span
            style={{
              ...appleIconBadge({ bg: wash, border: washBorder, text: washText, accent: accentC }, 32),
              ...(style === "solid"
                ? { background: accentC, border: `1px solid ${accentC}`, color: ramp[0] }
                : outlined
                  ? { background: "transparent", border: `1px solid ${accentC}`, color: accentC }
                  : null),
            }}
          >
            <Icon size={16} />
          </span>
        ) : null}
        <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontSize: `var(--ark-text-${titleSize})`,
              lineHeight: `var(--ark-leading-${titleSize})`,
              fontWeight: "var(--ark-font-weight-bold)",
              fontFamily: `var(--ark-font-role-${titleSize})`,
              color: tv("text-primary"),
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
              color: tv("text-secondary"),
            }}
          >
            {alertBody || "Token-mapped alert surface. Wash, border and accent resolve from the primitive ramp per mode."}
          </span>
        </span>
        {action ? <AppleTrailingAction label={actionLabel} color={accentC} /> : null}
        {dismissible ? <AppleDismiss onClick={() => {}} label="Dismiss alert" /> : null}
      </div>
    );
  }

  if (activeTemplate === "carbon") {
    return (
      <div
        role="alert"
        style={{
          position: "relative",
          ...carbonSurface(tone),
          borderRadius: r("container.radius") ?? 0,
          // Longhand, never the `padding` shorthand alongside a paddingRight
          // override — mixing the two makes React warn on rerender (same
          // reason the border sides above are written out longhand).
          paddingTop: r("container.padY") ?? sv(3),
          paddingBottom: r("container.padY") ?? sv(3),
          paddingLeft: r("container.padX") ?? sv(3),
          paddingRight: dismissible ? 28 : r("container.padX") ?? sv(3),
          fontFamily: r("text.font") ?? "var(--ark-font-sans)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {icon ? <Icon size={15} style={{ color: glyph, flexShrink: 0 }} /> : null}
          <span
            style={{
              fontSize: `var(--ark-text-${titleSize})`,
              lineHeight: `var(--ark-leading-${titleSize})`,
              fontWeight: "var(--ark-font-weight-bold)",
              fontFamily: `var(--ark-font-role-${titleSize})`,
            }}
          >
            {alertTitle || `${variant.charAt(0).toUpperCase()}${variant.slice(1)} signal`}
          </span>
        </div>
        <span
          style={{
            fontSize: `var(--ark-text-${bodySize})`,
            lineHeight: `var(--ark-leading-${bodySize})`,
            fontWeight: `var(--ark-weight-${bodySize})`,
            fontFamily: `var(--ark-font-role-${bodySize})`,
            opacity: 0.9,
          }}
        >
          {alertBody || "Token-mapped alert surface. Wash, border and accent resolve from the primitive ramp per mode."}
        </span>
        {action ? (
          <div style={{ marginTop: 2 }}>
            <TemplateTextAction label={actionLabel} color={glyph} variant="carbon" />
          </div>
        ) : null}
        {dismissible ? <CarbonCloseButton color={tone.text} onClick={() => {}} label="Dismiss alert" /> : null}
      </div>
    );
  }

  // The hairline weight the surrounding sides are drawn at — a borderless
  // system (Atlassian, Material) sets 0 here, while the accent bar keeps its
  // own weight so the `accent` option never stops doing anything.
  const hair = tpl.border ?? 1;
  return (
    <div
      role="alert"
      style={{
        background: surface,
        borderStyle: "solid",
        borderTopWidth: accent === "top" ? 3 : hair,
        borderRightWidth: hair,
        borderBottomWidth: hair,
        borderLeftWidth: accent === "left" ? 3 : hair,
        borderTopColor: accent === "top" ? accentC : borderC,
        borderRightColor: borderC,
        borderBottomColor: borderC,
        borderLeftColor: accent === "left" ? accentC : borderC,
        borderRadius: r("container.radius") ?? tplRadius(tpl, "surface") ?? rv(radiusStep),
        padding: `${r("container.padY") ?? tplPad(tpl, sv(2))} ${r("container.padX") ?? tplPad(tpl, sv(3))}`,
        boxShadow: tplShadow(tpl, "raised") ?? undefined,
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
