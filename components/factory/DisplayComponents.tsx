"use client";

/**
 * Display & feedback components: Badge, Tag, Avatar, Tooltip, Progress,
 * Skeleton loader, Toast. Variant colours resolve from the primitive ramps
 * (mode-aware wash/border/text like Alert); structure from spacing/radius.
 */
import { AlertTriangle, Bell, CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { CSSProperties } from "react";
import { PreviewMode, useDesignSystem } from "@/store/useDesignSystem";
import { rv, sv, tv } from "@/lib/tokens";
import { NO_BINDINGS, Resolver } from "@/lib/componentSchema";
import { pxNum } from "./CoreComponents";

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
  if (variant === "neutral") {
    return {
      bg: tv("surface-subtle"),
      border: tv("border-default"),
      text: tv("text-secondary"),
      accent: tv("text-muted"),
    };
  }
  const ramp = colors[TONE_SLOT[variant]];
  return mode === "light"
    ? { bg: ramp[0], border: ramp[2], text: ramp[8], accent: ramp[5] }
    : { bg: ramp[9], border: ramp[7], text: ramp[1], accent: ramp[5] };
}

/* ── Badge ── */

export function TokenBadge({
  variant = "neutral",
  mode,
  radiusStep = 7,
  style = "subtle",
  dot = true,
  children,
  resolve = NO_BINDINGS,
}: {
  variant?: ToneVariant;
  mode: PreviewMode;
  radiusStep?: number;
  style?: "subtle" | "solid" | "outline";
  dot?: boolean;
  children?: React.ReactNode;
  resolve?: Resolver;
}) {
  const tone = useTone(variant, mode);
  const r = resolve;
  const bg =
    style === "solid" ? tone.accent : style === "outline" ? "transparent" : tone.bg;
  const text = style === "solid" ? "#fff" : tone.text;
  const dotColor = style === "solid" ? "rgba(255,255,255,0.85)" : tone.accent;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: `2px ${r("container.padX") ?? sv(2)}`,
        borderRadius: r("container.radius") ?? rv(radiusStep),
        background: bg,
        border: `1px solid ${tone.border}`,
        color: text,
        fontSize: "var(--ark-text-xs)",
        fontWeight: 600,
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
  radiusStep = 2,
  removable = true,
  children = "Q3 budget",
  resolve = NO_BINDINGS,
}: {
  mode: PreviewMode;
  radiusStep?: number;
  removable?: boolean;
  children?: React.ReactNode;
  resolve?: Resolver;
}) {
  const r = resolve;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: sv(1),
        padding: `${sv(1)} ${sv(2)}`,
        borderRadius: r("container.radius") ?? rv(radiusStep),
        background: r("container.bg") ?? tv("surface-subtle"),
        color: r("text.color") ?? tv("text-secondary"),
        fontSize: "var(--ark-text-xs)",
        fontWeight: 500,
        fontFamily: r("text.font") ?? "var(--ark-font-sans)",
      }}
    >
      {children}
      {removable ? (
        <X
          size={pxNum(r("removeIcon.size"), 11)}
          style={{ color: r("removeIcon.color") ?? tv("text-muted"), cursor: "pointer" }}
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
  resolve = NO_BINDINGS,
}: {
  size?: "sm" | "md" | "lg";
  radiusStep?: number;
  initials?: string;
  presence?: "online" | "away";
  resolve?: Resolver;
}) {
  const px = size === "sm" ? 26 : size === "md" ? 36 : 48;
  const r = resolve;
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <span
        style={{
          width: px,
          height: px,
          borderRadius: r("container.radius") ?? rv(radiusStep),
          background: r("container.bg") ?? tv("action-primary-default"),
          color: r("text.color") ?? tv("text-on-action"),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 700,
          fontSize: px * 0.36,
          fontFamily: r("text.font") ?? "var(--ark-font-sans)",
        }}
      >
        {initials}
      </span>
      {presence ? (
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
}

/* ── Tooltip (static, opened) ── */

export function TokenTooltip({
  radiusStep = 2,
  label = "Cleared 2 days ago",
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  label?: string;
  resolve?: Resolver;
}) {
  const r = resolve;
  const bg = r("container.bg") ?? tv("text-primary");
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <span
        style={{
          background: bg,
          color: r("text.color") ?? tv("surface-base"),
          padding: `${sv(1)} ${sv(2)}`,
          borderRadius: r("container.radius") ?? rv(radiusStep),
          fontSize: "var(--ark-text-xs)",
          fontFamily: r("text.font") ?? "var(--ark-font-sans)",
          fontWeight: 500,
          boxShadow: "var(--ark-shadow-medium)",
          whiteSpace: "nowrap",
        }}
        role="tooltip"
      >
        {label}
      </span>
      <span
        style={{
          width: 0,
          height: 0,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: `5px solid ${bg}`,
        }}
      />
    </span>
  );
}

/* ── Progress ── */

export function TokenProgress({
  value = 64,
  radiusStep = 7,
  showLabel = true,
  resolve = NO_BINDINGS,
}: {
  value?: number;
  radiusStep?: number;
  showLabel?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  const trackRadius = r("track.radius") ?? rv(radiusStep);
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
          <span style={{ color: r("label.title") ?? tv("text-secondary") }}>Budget used</span>
          <span
            style={{ color: r("label.value") ?? tv("text-muted"), fontFamily: "var(--ark-font-mono)" }}
          >
            {value}%
          </span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: 8,
          borderRadius: trackRadius,
          background: r("track.bg") ?? tv("surface-subtle"),
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(Math.max(value, 0), 100)}%`,
            height: "100%",
            borderRadius: trackRadius,
            background: r("fill.bg") ?? tv("action-primary-default"),
            transition:
              "width var(--ark-duration-slow) var(--ark-ease-out)",
          }}
        />
      </div>
    </div>
  );
}

/* ── Skeleton loader ── */

export function TokenSkeletonLoader({
  radiusStep = 2,
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const r = resolve;
  const bar = (w: string, h = 10): CSSProperties => ({
    width: w,
    height: h,
    borderRadius: r("container.radius") ?? rv(radiusStep),
    background: r("container.bg") ?? tv("surface-subtle"),
  });
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      style={{ display: "flex", gap: sv(2), alignItems: "flex-start", width: "100%" }}
    >
      <div style={{ ...bar("36px", 36), borderRadius: rv(7), flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: sv(1) }}>
        <div style={bar("45%")} />
        <div style={bar("90%")} />
        <div style={bar("70%")} />
      </div>
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
}) {
  const tone = useTone(variant, mode);
  const r = resolve;
  const Glyph = toastGlyph(variant);
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: sv(2),
        padding: `${sv(2)} ${sv(3)}`,
        borderRadius: r("container.radius") ?? rv(radiusStep),
        background: r("container.bg") ?? tv("surface-elevated"),
        border: `1px solid ${r("container.border") ?? tv("border-default")}`,
        boxShadow: `var(--ark-shadow-${elevation})`,
        fontFamily: "var(--ark-font-sans)",
        maxWidth: 360,
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
            fontSize: "var(--ark-text-sm)",
            fontWeight: 600,
          }}
        >
          {title ?? "Transaction saved"}
        </span>
        <span
          style={{
            display: "block",
            color: r("text.body") ?? tv("text-muted"),
            fontSize: "var(--ark-text-xs)",
          }}
        >
          {body ?? "TXN-0459 posted to the operating ledger."}
        </span>
      </span>
      {action ? (
        <span
          style={{
            flexShrink: 0,
            alignSelf: "center",
            padding: `${sv(1)} ${sv(2)}`,
            borderRadius: rv(Math.max(radiusStep - 1, 0)),
            border: `1px solid ${tone.border}`,
            color: tone.accent,
            fontSize: "var(--ark-text-xs)",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Undo
        </span>
      ) : null}
      {dismissible ? (
        <X size={13} style={{ color: tv("text-muted"), cursor: "pointer", flexShrink: 0 }} />
      ) : null}
    </div>
  );
}
