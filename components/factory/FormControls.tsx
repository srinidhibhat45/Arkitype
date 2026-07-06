"use client";

/**
 * Extended form controls: Icon button, Button group (segmented), Slider,
 * Stepper (number input) and Search field. Same discipline as the core
 * controls — colours from roles, radius from the radius scale, padding/gap
 * from the spacing scale, type/motion from CSS vars. Nothing hardcoded but
 * small structural dimensions (icon glyphs, track/thumb sizes), matching the
 * Avatar/Switch precedent.
 */
import type { CSSProperties } from "react";
import { Minus, Plus, Search, X } from "lucide-react";
import { rv, sv, tv } from "@/lib/tokens";
import { CState, NO_BINDINGS, Resolver } from "@/lib/componentSchema";
import {
  InteractionState,
  SizeToken,
  SIZE_MAP,
  bindState,
  focusRing,
  pxNum,
} from "./CoreComponents";

/* ── Icon button ── */

export type IconButtonVariant = "solid" | "outline" | "ghost";

const ICON_BOX: Record<SizeToken, number> = { sm: 28, md: 34, lg: 40 };

export function TokenIconButton({
  state = "default",
  variant = "solid",
  size = "md",
  radiusStep = 2,
  resolve = NO_BINDINGS,
}: {
  state?: InteractionState;
  variant?: IconButtonVariant;
  size?: SizeToken;
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const disabled = state === "disabled";
  const box = ICON_BOX[size];
  const cst = bindState(state);
  const r = resolve;

  const defSolidBg =
    state === "hover"
      ? tv("action-primary-hover")
      : state === "active"
        ? tv("action-primary-active")
        : disabled
          ? tv("action-primary-disabled")
          : tv("action-primary-default");
  const defSubtleBg =
    state === "hover" || state === "active" ? tv("surface-subtle") : "transparent";

  const bg =
    variant === "solid"
      ? r("solid.bg", cst) ?? defSolidBg
      : variant === "outline"
        ? r("outline.bg", cst) ?? defSubtleBg
        : r("ghost.bg", cst) ?? defSubtleBg;

  const defIconColor =
    variant === "solid"
      ? disabled
        ? tv("text-muted")
        : tv("text-on-action")
      : disabled
        ? tv("text-muted")
        : tv("text-secondary");

  const style: CSSProperties = {
    width: box,
    height: box,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: r("container.radius") ?? rv(radiusStep),
    cursor: disabled ? "not-allowed" : "pointer",
    background: bg,
    color: r("icon.color", cst) ?? defIconColor,
    border:
      variant === "outline"
        ? `1px solid ${r("outline.border", cst) ?? (disabled ? tv("border-muted") : tv("border-default"))}`
        : "1px solid transparent",
    transition:
      "background var(--ark-duration-fast) var(--ark-ease-out), border-color var(--ark-duration-fast) var(--ark-ease-out)",
    ...(state === "focus" ? focusRing() : {}),
  };

  return (
    <button type="button" style={style} disabled={disabled} aria-label="Add">
      <Plus size={pxNum(r("icon.size"), Math.round(box * 0.42))} strokeWidth={2.2} />
    </button>
  );
}

/* ── Button group (segmented control) ── */

export function TokenButtonGroup({
  radiusStep = 2,
  options = ["Day", "Week", "Month"],
  active = 1,
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  options?: string[];
  active?: number;
  resolve?: Resolver;
}) {
  const r = resolve;
  return (
    <div
      role="group"
      style={{
        display: "inline-flex",
        borderRadius: r("container.radius") ?? rv(radiusStep),
        border: `1px solid ${r("container.border") ?? tv("border-default")}`,
        background: r("container.bg") ?? tv("surface-elevated"),
        overflow: "hidden",
      }}
    >
      {options.map((opt, i) => {
        const on = i === active;
        const seg: CState = on ? "active" : "default";
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={on}
            style={{
              padding: `${sv(1)} ${sv(3)}`,
              fontSize: r("segment.size") ?? "var(--ark-text-sm)",
              fontFamily: r("segment.font") ?? "var(--ark-font-sans)",
              fontWeight: on ? 600 : 500,
              cursor: "pointer",
              border: "none",
              borderLeft: i > 0 ? `1px solid ${r("segment.divider") ?? tv("border-muted")}` : "none",
              background: r("segment.bg", seg) ?? (on ? tv("action-primary-default") : "transparent"),
              color: r("segment.text", seg) ?? (on ? tv("text-on-action") : tv("text-secondary")),
              transition: "background var(--ark-duration-fast) var(--ark-ease-out)",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/* ── Slider (range) ── */

export function TokenSlider({
  state = "default",
  value = 62,
  radiusStep = 7,
  resolve = NO_BINDINGS,
}: {
  state?: InteractionState;
  value?: number;
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const disabled = state === "disabled";
  const pct = Math.min(Math.max(value, 0), 100);
  const cst = bindState(state);
  const r = resolve;
  const trackRadius = r("track.radius") ?? rv(radiusStep);
  const thumb: CSSProperties = {
    position: "absolute",
    top: "50%",
    left: `${pct}%`,
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: r("thumb.bg") ?? tv("surface-base"),
    border: `2px solid ${
      r("thumb.border", cst) ?? (disabled ? tv("action-primary-disabled") : tv("action-primary-default"))
    }`,
    boxShadow: "var(--ark-shadow-low)",
    transform: "translate(-50%, -50%)",
    transition: "left var(--ark-duration-fast) var(--ark-ease-out)",
    ...(state === "focus"
      ? { outline: `2px solid ${tv("border-focus")}`, outlineOffset: "2px" }
      : {}),
  };
  return (
    <div style={{ width: "100%", padding: `${sv(2)} 0`, opacity: disabled ? 0.6 : 1 }}>
      <div
        role="slider"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-disabled={disabled}
        style={{
          position: "relative",
          height: 6,
          borderRadius: trackRadius,
          background: r("track.bg") ?? tv("surface-subtle"),
        }}
      >
        <div
          style={{
            position: "absolute",
            insetBlock: 0,
            left: 0,
            width: `${pct}%`,
            borderRadius: trackRadius,
            background:
              r("fill.bg", cst) ??
              (disabled
                ? tv("action-primary-disabled")
                : state === "hover"
                  ? tv("action-primary-hover")
                  : tv("action-primary-default")),
            transition: "width var(--ark-duration-fast) var(--ark-ease-out)",
          }}
        />
        <span style={thumb} />
      </div>
    </div>
  );
}

/* ── Stepper (number input) ── */

export function TokenStepper({
  state = "default",
  size = "md",
  radiusStep = 2,
  value = 12,
  resolve = NO_BINDINGS,
}: {
  state?: InteractionState;
  size?: SizeToken;
  radiusStep?: number;
  value?: number;
  resolve?: Resolver;
}) {
  const s = SIZE_MAP[size];
  const disabled = state === "disabled";
  const cst = bindState(state);
  const r = resolve;
  const defBorder =
    state === "focus"
      ? tv("border-focus")
      : state === "hover"
        ? tv("text-muted")
        : tv("border-default");
  const divider = r("buttons.divider") ?? tv("border-muted");

  const btn: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    alignSelf: "stretch",
    background: r("buttons.bg") ?? tv("surface-subtle"),
    color: r("buttons.color", cst) ?? (disabled ? tv("text-muted") : tv("text-secondary")),
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none",
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        borderRadius: r("container.radius") ?? rv(radiusStep),
        border: `1px solid ${r("container.border", cst) ?? defBorder}`,
        overflow: "hidden",
        background:
          r("container.bg", cst) ?? (disabled ? tv("surface-subtle") : tv("surface-elevated")),
        boxShadow:
          state === "focus"
            ? `0 0 0 3px color-mix(in srgb, ${tv("border-focus")} 25%, transparent)`
            : "none",
        transition:
          "border-color var(--ark-duration-fast) var(--ark-ease-out), box-shadow var(--ark-duration-fast) var(--ark-ease-out)",
      }}
    >
      <button type="button" style={{ ...btn, borderRight: `1px solid ${divider}` }} disabled={disabled} aria-label="Decrement">
        <Minus size={13} strokeWidth={2.5} />
      </button>
      <span
        style={{
          minWidth: 44,
          padding: `${sv(s.py)} ${sv(2)}`,
          textAlign: "center",
          fontSize: r("value.size") ?? `var(--ark-text-${s.text})`,
          fontFamily: r("value.font") ?? "var(--ark-font-mono)",
          color: r("value.color", cst) ?? (disabled ? tv("text-muted") : tv("text-primary")),
          fontVariantNumeric: "tabular-nums",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {value}
      </span>
      <button type="button" style={{ ...btn, borderLeft: `1px solid ${divider}` }} disabled={disabled} aria-label="Increment">
        <Plus size={13} strokeWidth={2.5} />
      </button>
    </div>
  );
}

/* ── Search field ── */

export function TokenSearchField({
  state = "default",
  size = "md",
  radiusStep = 2,
  placeholder = "Search transactions…",
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
  const filled = state === "active" || state === "loading";
  const cst = bindState(state);
  const r = resolve;
  const defBorder =
    state === "focus"
      ? tv("border-focus")
      : state === "hover"
        ? tv("text-muted")
        : tv("border-default");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: sv(2),
        padding: `${r("container.padY") ?? sv(s.py)} ${r("container.padX") ?? sv(s.px)}`,
        borderRadius: r("container.radius") ?? rv(radiusStep),
        border: `${r("container.borderWidth") ?? "1px"} solid ${r("container.border", cst) ?? defBorder}`,
        background:
          r("container.bg", cst) ?? (disabled ? tv("surface-subtle") : tv("surface-elevated")),
        width: "100%",
        boxShadow:
          state === "focus"
            ? `0 0 0 3px color-mix(in srgb, ${tv("border-focus")} 25%, transparent)`
            : "none",
        transition:
          "border-color var(--ark-duration-fast) var(--ark-ease-out), box-shadow var(--ark-duration-fast) var(--ark-ease-out)",
      }}
    >
      <Search size={pxNum(r("prefixIcon.size"), 14)} style={{ color: r("prefixIcon.color") ?? tv("text-muted"), flexShrink: 0 }} />
      <span
        style={{
          flex: 1,
          fontSize: r("text.size") ?? `var(--ark-text-${s.text})`,
          fontFamily: r("text.font") ?? "var(--ark-font-sans)",
          color: r("text.color", cst) ?? (filled ? tv("text-primary") : tv("text-muted")),
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {filled ? "TXN-0459" : placeholder}
      </span>
      {filled ? (
        <X size={pxNum(r("clearIcon.size"), 13)} style={{ color: r("clearIcon.color") ?? tv("text-muted"), cursor: "pointer", flexShrink: 0 }} aria-label="Clear" />
      ) : null}
    </div>
  );
}
