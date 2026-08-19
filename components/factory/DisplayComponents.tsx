"use client";

/**
 * Display & feedback components: Badge, Tag, Avatar, Tooltip, Progress,
 * Skeleton loader, Toast. Variant colours resolve from the primitive ramps
 * (mode-aware wash/border/text like Alert); structure from spacing/radius.
 */
import { AlertTriangle, Bell, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { PreviewMode, modeBase, useDesignSystem } from "@/store/useDesignSystem";
import { rv, sv, tv } from "@/lib/tokens";
import { NO_BINDINGS, Resolver, useComponentBindings, createChildResolver, resolveOptions } from "@/lib/componentSchema";
import { pxNum, TokenButton } from "./CoreComponents";
import { TokenIconButton } from "./FormControls";
import {
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
  tplShadow,
  tplIsSquare,
} from "./templateKit";

export type ToneVariant = "neutral" | "brand" | "info" | "success" | "warning" | "error";

const TONE_SLOT: Record<Exclude<ToneVariant, "neutral">, "brand" | "secondary" | "success" | "warning" | "error"> = {
  brand: "brand",
  info: "secondary",
  success: "success",
  warning: "warning",
  error: "error",
};

/** Mode-aware wash/border/text triple from a ramp. */
export function useTone(variant: ToneVariant, mode: PreviewMode) {
  const colors = useDesignSystem((s) => s.primitives.colors);
  const semantics = useDesignSystem((s) => s.semantics);
  // Which end of the ramp is the wash and which is the ink is a question about
  // how the mode *looks*, not what it's called — a custom mode answers it with
  // the appearance it declared.
  const base = modeBase(semantics, mode);
  if (variant === "neutral") {
    return {
      bg: tv("surface-subtle"),
      border: tv("border-default"),
      text: tv("text-secondary"),
      accent: tv("text-muted"),
    };
  }
  const ramp = colors[TONE_SLOT[variant]];
  return base === "light"
    ? { bg: ramp[0], border: ramp[2], text: ramp[8], accent: ramp[5] }
    : { bg: ramp[9], border: ramp[7], text: ramp[1], accent: ramp[5] };
}

/* ── Badge ── */

export function TokenBadge({
  variant = "neutral",
  mode,
  radiusStep = 7,
  style = "subtle",
  size = "sm",
  dot = true,
  children,
  resolve = NO_BINDINGS,
}: {
  variant?: ToneVariant;
  mode: PreviewMode;
  radiusStep?: number;
  style?: "subtle" | "solid" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
  children?: React.ReactNode;
  resolve?: Resolver;
}) {
  const tone = useTone(variant, mode);
  const r = resolve;
  // Corner and border weight are the whole of a badge: Fluent's capsule,
  // Atlassian's 3px lozenge, Carbon's square. The `style` option still owns the
  // fill, so subtle/solid/outline keep working under every template.
  const tpl = useTemplate("badge");
  const bg =
    style === "solid" ? tone.accent : style === "outline" ? "transparent" : tone.bg;
  const text = style === "solid" ? "#fff" : tone.text;
  const dotColor = style === "solid" ? "rgba(255,255,255,0.85)" : tone.accent;
  const fs = size === "md" ? "sm" : "xs";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: `${size === "md" ? 3 : 2}px ${r("container.padX") ?? tplPad(tpl, sv(2))}`,
        borderRadius: r("container.radius") ?? tplRadius(tpl, "chip") ?? rv(radiusStep),
        background: bg,
        // An outline badge must keep its outline whatever the template says —
        // borderless systems only drop the border where the fill carries it.
        border: `${style === "outline" ? 1 : tpl.border ?? 1}px solid ${tone.border}`,
        color: text,
        fontSize: `var(--ark-text-${fs})`,
        fontWeight: tplWeight(tpl) ?? 600,
        fontFamily: r("text.font") ?? "var(--ark-font-sans)",
        lineHeight: 1.4,
      }}
    >
      {dot ? (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: dotColor,
          }}
        />
      ) : null}
      {children ?? variant}
    </span>
  );
}

/* ── Tag / Chip ── */

export function TokenTag({
  mode,
  tone = "neutral",
  radiusStep = 2,
  removable = true,
  leadingIcon = false,
  style = "subtle",
  size = "md",
  children = "Q3 budget",
  resolve = NO_BINDINGS,
}: {
  mode: PreviewMode;
  tone?: ToneVariant;
  radiusStep?: number;
  removable?: boolean;
  leadingIcon?: boolean;
  style?: "subtle" | "outline";
  size?: "sm" | "md";
  children?: React.ReactNode;
  resolve?: Resolver;
}) {
  const r = resolve;
  const t = useTone(tone, mode);
  const tpl = useTemplate("tag");
  const toned = tone !== "neutral";
  const outline = style === "outline";
  const bg = outline ? "transparent" : r("container.bg") ?? (toned ? t.bg : tv("surface-subtle"));
  const text = r("text.color") ?? (toned ? t.text : tv("text-secondary"));
  const dot = toned ? t.accent : tv("text-muted");
  const borderColor = outline
    ? toned
      ? t.accent
      : tv("border-strong")
    : toned
      ? t.border
      : "transparent";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: sv(1),
        padding: size === "sm" ? `2px ${sv(1)}` : `${tplPad(tpl, sv(1))} ${tplPad(tpl, sv(2))}`,
        borderRadius: r("container.radius") ?? tplRadius(tpl, "chip") ?? rv(radiusStep),
        background: outline ? "transparent" : bg,
        border: `${outline ? 1 : tpl.border ?? 1}px solid ${borderColor}`,
        color: text,
        fontSize: "var(--ark-text-xs)",
        fontWeight: tplWeight(tpl) ?? 500,
        fontFamily: r("text.font") ?? "var(--ark-font-sans)",
      }}
    >
      {leadingIcon ? (
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      ) : null}
      {children}
      {removable ? (
        <X
          size={pxNum(r("removeIcon.size"), 11)}
          style={{ color: r("removeIcon.color") ?? (toned ? t.text : tv("text-muted")), cursor: "pointer" }}
          aria-label="Remove tag"
        />
      ) : null}
    </span>
  );
}

/* ── Avatar ── */

export function TokenAvatar({
  size = "md",
  radiusStep = 7,
  initials = "AK",
  presence,
  shape = "circle",
  showRing = false,
  group = 1,
  display = "initials",
  imageUrl,
  resolve = NO_BINDINGS,
}: {
  size?: "sm" | "md" | "lg";
  radiusStep?: number;
  initials?: string;
  presence?: "online" | "away";
  shape?: "circle" | "rounded" | "square";
  showRing?: boolean;
  group?: number;
  display?: "initials" | "image";
  imageUrl?: string;
  resolve?: Resolver;
}) {
  const px = size === "sm" ? 26 : size === "md" ? 36 : 48;
  const r = resolve;
  // `shape` is a declared option, so a template never overrides it — circle
  // stays a circle and square stays square. What the template does own is how
  // round "rounded" is, which is where the systems actually differ.
  const tpl = useTemplate("avatar");
  const shapeRadius =
    shape === "circle" ? rv(7) : shape === "square" ? rv(1) : tplRadius(tpl, "toggle") ?? rv(3);
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = display === "image" && !!imageUrl && !imageFailed;

  const single = (label: string, withPresence: boolean, stacked: boolean, useImage = false) => (
    <span key={label} style={{ position: "relative", display: "inline-flex", marginLeft: stacked ? -px * 0.28 : 0 }}>
      <span
        style={{
          width: px,
          height: px,
          borderRadius: r("container.radius") ?? shapeRadius,
          background: useImage ? undefined : (r("container.bg") ?? tv("action-primary-default")),
          color: r("text.color") ?? tv("text-on-action"),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          fontWeight: 700,
          fontSize: px * 0.36,
          fontFamily: r("text.font") ?? "var(--ark-font-sans)",
          boxShadow: showRing || stacked ? `0 0 0 2px ${tv("surface-base")}` : undefined,
        }}
      >
        {useImage ? (
          <img
            src={imageUrl}
            alt=""
            onError={() => setImageFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          label
        )}
      </span>
      {withPresence && presence ? (
        <span
          style={{
            position: "absolute",
            right: -1,
            bottom: -1,
            width: px * 0.3,
            height: px * 0.3,
            borderRadius: "50%",
            background:
              presence === "online"
                ? r("presence.online") ?? tv("border-focus")
                : r("presence.away") ?? tv("text-muted"),
            border: `2px solid ${tv("surface-base")}`,
          }}
        />
      ) : null}
    </span>
  );

  const count = Math.min(Math.max(Math.round(group), 1), 4);
  if (count === 1) return single(initials, true, false, showImage);

  // Stacked avatar group: the bound initials/image lead, generic teammates follow.
  const others = ["LM", "TS", "+5"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {single(initials, false, false, showImage)}
      {others.slice(0, count - 1).map((o) => single(o, false, true))}
    </span>
  );
}

/* ── Tooltip (static, opened) ── */

export function TokenTooltip({
  radiusStep = 2,
  label = "Cleared 2 days ago",
  placement = "top",
  showArrow = true,
  size = "sm",
  multiline = false,
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  label?: string;
  placement?: "top" | "bottom" | "left" | "right";
  showArrow?: boolean;
  size?: "sm" | "md";
  multiline?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  const tpl = useTemplate("tooltip");
  const bg = r("container.bg") ?? tv("text-primary");

  const bubble = (
    <span
      style={{
        background: bg,
        color: r("text.color") ?? tv("surface-base"),
        padding:
          size === "md"
            ? `${tplPad(tpl, sv(2))} ${tplPad(tpl, sv(3))}`
            : `${tplPad(tpl, sv(1))} ${tplPad(tpl, sv(2))}`,
        borderRadius: r("container.radius") ?? tplRadius(tpl, "overlay") ?? rv(radiusStep),
        fontSize: size === "md" ? "var(--ark-text-sm)" : "var(--ark-text-xs)",
        fontFamily: r("text.font") ?? "var(--ark-font-sans)",
        fontWeight: tplWeight(tpl) ?? 500,
        boxShadow: tplShadow(tpl, "overlay") ?? "var(--ark-shadow-medium)",
        whiteSpace: multiline ? "normal" : "nowrap",
        maxWidth: multiline ? 200 : undefined,
        lineHeight: multiline ? 1.5 : undefined,
        textAlign: multiline ? "left" : undefined,
      }}
      role="tooltip"
    >
      {label}
    </span>
  );

  // The arrow points from the bubble toward the (implied) trigger — i.e. the
  // opposite side of the bubble's placement.
  const arrowBase = { width: 0, height: 0 } as const;
  const arrow: CSSProperties =
    placement === "top"
      ? { ...arrowBase, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: `5px solid ${bg}` }
      : placement === "bottom"
        ? { ...arrowBase, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: `5px solid ${bg}` }
        : placement === "left"
          ? { ...arrowBase, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: `5px solid ${bg}` }
          : { ...arrowBase, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: `5px solid ${bg}` };

  const vertical = placement === "top" || placement === "bottom";
  const arrowFirst = placement === "bottom" || placement === "right";

  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: vertical ? "column" : "row",
        alignItems: "center",
        gap: 0,
      }}
    >
      {showArrow && arrowFirst ? <span style={arrow} /> : null}
      {bubble}
      {showArrow && !arrowFirst ? <span style={arrow} /> : null}
    </span>
  );
}

/* ── Progress ── */

export function TokenProgress({
  value = 64,
  radiusStep = 7,
  showLabel = true,
  label = "Budget used",
  variant = "bar",
  thickness = "regular",
  indeterminate = false,
  resolve = NO_BINDINGS,
}: {
  value?: number;
  radiusStep?: number;
  showLabel?: boolean;
  label?: string;
  variant?: "bar" | "circle";
  thickness?: "thin" | "regular" | "thick";
  indeterminate?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  // Carbon is the one system that squares a progress track; the rest keep the
  // capsule, so this is the only thing the template has to say here.
  const tpl = useTemplate("progress");
  const trackRadius = r("track.radius") ?? (tplIsSquare(tpl) ? 0 : undefined) ?? rv(radiusStep);
  const clamped = Math.min(Math.max(value, 0), 100);
  const barHeight = thickness === "thin" ? 4 : thickness === "thick" ? 12 : 8;

  if (variant === "circle") {
    const size = 56;
    const stroke = thickness === "thin" ? 3 : thickness === "thick" ? 7 : 5;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    return (
      <div
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: sv(1),
          fontFamily: "var(--ark-font-sans)",
        }}
      >
        <div
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          className={indeterminate ? "ark-spin" : undefined}
          style={{ width: size, height: size, position: "relative" }}
        >
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={r("track.bg") ?? tv("surface-subtle")}
              strokeWidth={stroke}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={r("fill.bg") ?? tv("action-primary-default")}
              strokeWidth={stroke}
              strokeLinecap={tplIsSquare(tpl) ? "butt" : "round"}
              strokeDasharray={circumference}
              strokeDashoffset={
                indeterminate ? circumference * 0.72 : circumference * (1 - clamped / 100)
              }
              style={{
                transition: "stroke-dashoffset var(--ark-duration-slow) var(--ark-ease-out)",
              }}
            />
          </svg>
          {!indeterminate && showLabel ? (
            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--ark-text-xs)",
                fontFamily: "var(--ark-font-mono)",
                fontWeight: 600,
                color: r("label.value") ?? tv("text-muted"),
              }}
            >
              {clamped}%
            </span>
          ) : null}
        </div>
        {showLabel ? (
          <span style={{ fontSize: "var(--ark-text-xs)", color: r("label.title") ?? tv("text-secondary") }}>
            {label}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      {showLabel ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: sv(1),
            fontSize: "var(--ark-text-xs)",
            fontFamily: "var(--ark-font-sans)",
          }}
        >
          <span style={{ color: r("label.title") ?? tv("text-secondary") }}>{label}</span>
          {!indeterminate ? (
            <span
              style={{ color: r("label.value") ?? tv("text-muted"), fontFamily: "var(--ark-font-mono)" }}
            >
              {clamped}%
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: barHeight,
          borderRadius: trackRadius,
          background: r("track.bg") ?? tv("surface-subtle"),
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          className={indeterminate ? "ark-slide" : undefined}
          style={{
            width: indeterminate ? "25%" : `${clamped}%`,
            height: "100%",
            borderRadius: trackRadius,
            background: r("fill.bg") ?? tv("action-primary-default"),
            transition: indeterminate
              ? undefined
              : "width var(--ark-duration-slow) var(--ark-ease-out)",
          }}
        />
      </div>
    </div>
  );
}

/* ── Skeleton loader ── */

export function TokenSkeletonLoader({
  radiusStep = 2,
  shape = "media",
  lines = 3,
  animated = false,
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  shape?: "media" | "text" | "card";
  lines?: number;
  animated?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  const tpl = useTemplate("skeleton");
  const bar = (w: string, h = 10): CSSProperties => ({
    width: w,
    height: h,
    borderRadius: r("container.radius") ?? tplRadius(tpl, "toggle") ?? rv(radiusStep),
    background: r("container.bg") ?? tv("surface-subtle"),
  });
  const lineCount = Math.min(Math.max(Math.round(lines), 1), 5);
  // Vary widths so multi-line blocks read as text, first line short like a title.
  const lineWidths = ["45%", "90%", "70%", "85%", "60%"].slice(0, lineCount);
  const textColumn = (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: sv(1) }}>
      {lineWidths.map((w, i) => (
        <div key={i} style={bar(w)} />
      ))}
    </div>
  );
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className={animated ? "ark-pulse" : undefined}
      style={
        shape === "card"
          ? { display: "flex", flexDirection: "column", gap: sv(2), width: "100%" }
          : { display: "flex", gap: sv(2), alignItems: "flex-start", width: "100%" }
      }
    >
      {shape === "media" ? (
        <div style={{ ...bar("36px", 36), borderRadius: rv(7), flexShrink: 0 }} />
      ) : null}
      {shape === "card" ? <div style={bar("100%", 96)} /> : null}
      {textColumn}
    </div>
  );
}

/* ── Toast ── */

/** Tone → status glyph (neutral/brand fall back to the bell). */
function toastGlyph(variant: ToneVariant) {
  return variant === "success"
    ? CheckCircle2
    : variant === "warning"
      ? AlertTriangle
      : variant === "error"
        ? XCircle
        : variant === "info"
          ? Info
          : Bell;
}

export function TokenToast({
  variant = "success",
  mode,
  radiusStep = 3,
  title,
  body,
  icon = true,
  dismissible = true,
  action = false,
  elevation = "high",
  resolve = NO_BINDINGS,
  template,
}: {
  variant?: ToneVariant;
  mode: PreviewMode;
  radiusStep?: number;
  title?: string;
  body?: string;
  icon?: boolean;
  dismissible?: boolean;
  action?: boolean;
  elevation?: string;
  resolve?: Resolver;
  /** Template id — see lib/componentTemplates.ts. */
  template?: string;
}) {
  const tone = useTone(variant, mode);
  const r = resolve;
  const Glyph = toastGlyph(variant);

  const cfg = useDesignSystem((s) => s.components.toast);
  const instances = cfg?.instances;

  const buttonResolve = useComponentBindings("button");
  const iconButtonResolve = useComponentBindings("iconButton");
  const childButtonResolve = createChildResolver("button", resolve, buttonResolve);
  const childIconButtonResolve = createChildResolver("iconButton", resolve, iconButtonResolve);

  const actionOpts = instances?.action ?? {};
  const actionLabel = (actionOpts.label as string) ?? "Undo";
  const actionVariant = (actionOpts.variant as any) ?? "outlined";
  const actionSize = (actionOpts.size as any) ?? "sm";
  const actionPrefix = (actionOpts.prefixIcon as string) ?? "";
  const actionSuffix = (actionOpts.suffixIcon as string) ?? "";

  const dismissOpts = instances?.dismiss ?? {};
  const dismissVariant = (dismissOpts.variant as any) ?? "ghost";
  const dismissSize = (dismissOpts.size as any) ?? "sm";

  const opts = resolveOptions("toast", cfg?.properties);
  const toastTitle = (opts.title || title) as string;
  const toastBody = (opts.body || body) as string;
  // Scale Step is a raw property, not a declared OptionSpec — resolveOptions()
  // only surfaces declared keys, so read it straight off the properties bag.
  const titleSize = (cfg?.properties?.["title.size"] ?? "sm") as string;
  const bodySize = (cfg?.properties?.["body.size"] ?? "xs") as string;

  // ── Templates (lib/componentTemplates.ts) — structure only; the tone,
  // copy and option flags above are reused verbatim by every branch.
  // One source of truth for "which template is active" (see TokenAlert): the
  // hook resolves an explicit prop, then a preview scope, then the stored
  // choice, and its profile is what dresses the default layout for the systems
  // that restyle rather than rebuild it.
  const tpl = useTemplate("toast", template);
  const activeTemplate = tpl.id;
  const heading = toastTitle || "Transaction saved";
  const message = toastBody || "TXN-0459 posted to the operating ledger.";

  if (activeTemplate === "material3") {
    return (
      <div
        role="status"
        style={{
          ...materialSurface(tone),
          borderRadius: r("container.radius") ?? `${MATERIAL_RADIUS.md}px`,
          padding: `${sv(2)} ${sv(3)}`,
          boxShadow: `var(--ark-shadow-${elevation})`,
          fontFamily: "var(--ark-font-sans)",
          display: "flex",
          alignItems: "center",
          gap: sv(2),
          maxWidth: 360,
          width: "100%",
        }}
      >
        {icon ? <Glyph size={17} style={{ color: tone.accent, flexShrink: 0 }} /> : null}
        <span style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: "block",
              color: r("text.title") ?? tone.text,
              fontSize: `var(--ark-text-${titleSize})`,
              lineHeight: `var(--ark-leading-${titleSize})`,
              fontWeight: `var(--ark-weight-${titleSize})`,
              fontFamily: `var(--ark-font-role-${titleSize})`,
            }}
          >
            {heading}
          </span>
          <span
            style={{
              display: "block",
              color: r("text.body") ?? tone.text,
              opacity: 0.8,
              fontSize: `var(--ark-text-${bodySize})`,
              lineHeight: `var(--ark-leading-${bodySize})`,
              fontWeight: `var(--ark-weight-${bodySize})`,
              fontFamily: `var(--ark-font-role-${bodySize})`,
            }}
          >
            {message}
          </span>
        </span>
        {action ? (
          <span style={{ flexShrink: 0, marginLeft: 4 }}>
            <TemplateTextAction label={actionLabel} color={tone.accent} variant="material" />
          </span>
        ) : null}
        {dismissible ? (
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => {}}
            style={{
              background: "none",
              border: "none",
              padding: 2,
              marginLeft: 4,
              cursor: "pointer",
              color: tone.text,
              opacity: 0.6,
              flexShrink: 0,
              display: "inline-flex",
            }}
          >
            <X size={15} />
          </button>
        ) : null}
      </div>
    );
  }

  if (activeTemplate === "apple") {
    return (
      <div
        role="status"
        style={{
          ...appleSurface(),
          borderRadius: r("container.radius") ?? `${APPLE_RADIUS.md}px`,
          padding: `${sv(2)} ${sv(2)}`,
          boxShadow: `var(--ark-shadow-${elevation})`,
          fontFamily: "var(--ark-font-sans)",
          display: "flex",
          alignItems: "center",
          gap: sv(2),
          maxWidth: 360,
          width: "100%",
        }}
      >
        {icon ? (
          <span style={appleIconBadge(tone, 34)}>
            <Glyph size={17} />
          </span>
        ) : null}
        <span style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: "block",
              color: r("text.title") ?? tv("text-primary"),
              fontSize: `var(--ark-text-${titleSize})`,
              lineHeight: `var(--ark-leading-${titleSize})`,
              fontWeight: "var(--ark-font-weight-bold)",
              fontFamily: `var(--ark-font-role-${titleSize})`,
            }}
          >
            {heading}
          </span>
          <span
            style={{
              display: "block",
              color: r("text.body") ?? tv("text-secondary"),
              fontSize: `var(--ark-text-${bodySize})`,
              lineHeight: `var(--ark-leading-${bodySize})`,
              fontWeight: `var(--ark-weight-${bodySize})`,
              fontFamily: `var(--ark-font-role-${bodySize})`,
            }}
          >
            {message}
          </span>
        </span>
        {action ? <AppleTrailingAction label={actionLabel} color={tone.accent} /> : null}
        {dismissible ? <AppleDismiss onClick={() => {}} label="Dismiss notification" /> : null}
      </div>
    );
  }

  if (activeTemplate === "carbon") {
    return (
      <div
        role="status"
        style={{
          position: "relative",
          ...carbonSurface(tone),
          borderRadius: r("container.radius") ?? 0,
          // Longhand, never the `padding` shorthand alongside a paddingRight
          // override — mixing the two makes React warn on rerender.
          paddingTop: sv(2),
          paddingBottom: sv(2),
          paddingLeft: sv(3),
          paddingRight: dismissible ? 28 : sv(3),
          boxShadow: `var(--ark-shadow-${elevation})`,
          fontFamily: "var(--ark-font-sans)",
          display: "flex",
          alignItems: "flex-start",
          gap: sv(2),
          maxWidth: 360,
          width: "100%",
        }}
      >
        {icon ? <Glyph size={15} style={{ color: tone.accent, flexShrink: 0, marginTop: 2 }} /> : null}
        <span style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: "block",
              color: r("text.title") ?? tone.text,
              fontSize: `var(--ark-text-${titleSize})`,
              lineHeight: `var(--ark-leading-${titleSize})`,
              fontWeight: "var(--ark-font-weight-bold)",
              fontFamily: `var(--ark-font-role-${titleSize})`,
            }}
          >
            {heading}
          </span>
          <span
            style={{
              display: "block",
              color: r("text.body") ?? tone.text,
              opacity: 0.9,
              fontSize: `var(--ark-text-${bodySize})`,
              lineHeight: `var(--ark-leading-${bodySize})`,
              fontWeight: `var(--ark-weight-${bodySize})`,
              fontFamily: `var(--ark-font-role-${bodySize})`,
            }}
          >
            {message}
          </span>
          {action ? (
            <span style={{ display: "block", marginTop: 6 }}>
              <TemplateTextAction label={actionLabel} color={tone.accent} variant="carbon" />
            </span>
          ) : null}
        </span>
        {dismissible ? (
          <CarbonCloseButton color={tone.text} onClick={() => {}} label="Dismiss notification" />
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: sv(2),
        padding: `${tplPad(tpl, sv(2))} ${tplPad(tpl, sv(3))}`,
        borderRadius: r("container.radius") ?? tplRadius(tpl, "overlay") ?? rv(radiusStep),
        background: r("container.bg") ?? tv("surface-elevated"),
        border: `${tpl.border ?? 1}px solid ${r("container.border") ?? tv("border-default")}`,
        // `elevation` is a declared option, so it still wins — the template only
        // supplies the shadow for a toast that never had one set.
        boxShadow: `var(--ark-shadow-${elevation})`,
        fontFamily: "var(--ark-font-sans)",
        maxWidth: 360,
        width: "100%",
      }}
    >
      {icon ? (
        <span
          style={{
            width: 26,
            height: 26,
            flexShrink: 0,
            borderRadius: rv(7),
            background: tone.bg,
            border: `1px solid ${tone.border}`,
            color: tone.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Glyph size={13} />
        </span>
      ) : null}
      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: "block",
            color: r("text.title") ?? tv("text-primary"),
            fontSize: `var(--ark-text-${titleSize})`,
            lineHeight: `var(--ark-leading-${titleSize})`,
            fontWeight: `var(--ark-weight-${titleSize})`,
            fontFamily: `var(--ark-font-role-${titleSize})`,
          }}
        >
          {toastTitle || "Transaction saved"}
        </span>
        <span
          style={{
            display: "block",
            color: r("text.body") ?? tv("text-muted"),
            fontSize: `var(--ark-text-${bodySize})`,
            lineHeight: `var(--ark-leading-${bodySize})`,
            fontWeight: `var(--ark-weight-${bodySize})`,
            fontFamily: `var(--ark-font-role-${bodySize})`,
          }}
        >
          {toastBody || "TXN-0459 posted to the operating ledger."}
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
            aria-label="Dismiss notification"
            onClick={() => {}}
          >
            <X size={13} />
          </TokenIconButton>
        </div>
      ) : null}
    </div>
  );
}

/* ── Avatar group (stacked people with an overflow count) ── */

const AVATAR_GROUP_INITIALS = ["AR", "MK", "JD", "SB", "TL", "PN", "CV", "RS", "EO", "DW", "FH", "GK"];

/**
 * A set of overlapping avatars capped at `max`, with a "+N" chip for the rest.
 * Draws its own circles rather than nesting TokenAvatar, because the group owns
 * the separator ring (`avatar.ring`) that makes the stack legible — that ring
 * is a property of the *group*, not of a lone avatar.
 */
export function TokenAvatarGroup({
  shape = "circle",
  count = 5,
  max = 4,
  size = 32,
  overlap = 8,
  showOverflow = true,
  radiusStep = 7,
  resolve = NO_BINDINGS,
}: {
  shape?: "circle" | "rounded";
  count?: number;
  max?: number;
  size?: number;
  overlap?: number;
  showOverflow?: boolean;
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const r = resolve;
  const total = Math.max(1, Math.min(count, AVATAR_GROUP_INITIALS.length));
  const cap = Math.max(1, Math.min(max, total));
  const shown = AVATAR_GROUP_INITIALS.slice(0, cap);
  const remainder = total - cap;

  const tpl = useTemplate("avatarGroup");
  const radius =
    shape === "circle" ? "50%" : (r("avatar.radius") ?? tplRadius(tpl, "toggle") ?? rv(radiusStep));
  const ringWidth = r("avatar.ringWidth") ?? "2px";
  const ring = r("avatar.ring") ?? tv("surface-base");

  const cell = (bg: string, color: string, label: string, key: string, z: number) => (
    <span
      key={key}
      data-ark-part="avatar"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        marginLeft: key === "a0" ? 0 : -overlap,
        borderRadius: radius,
        background: bg,
        color,
        border: `${ringWidth} solid ${ring}`,
        boxSizing: "border-box",
        fontFamily: "var(--ark-font-sans)",
        fontSize: Math.max(9, Math.round(size * 0.36)),
        fontWeight: tplWeight(tpl) ?? 600,
        letterSpacing: "0.01em",
        position: "relative",
        zIndex: z,
      }}
    >
      {label}
    </span>
  );

  return (
    <div style={{ display: "inline-flex", alignItems: "center" }}>
      {shown.map((initials, i) =>
        cell(
          r("avatar.bg") ?? tv("surface-subtle"),
          r("avatar.text") ?? tv("text-secondary"),
          initials,
          `a${i}`,
          shown.length - i
        )
      )}
      {showOverflow && remainder > 0
        ? cell(
            r("overflow.bg") ?? tv("surface-sunken"),
            r("overflow.text") ?? tv("text-secondary"),
            `+${remainder}`,
            "overflow",
            0
          )
        : null}
    </div>
  );
}
