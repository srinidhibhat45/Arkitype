"use client";

/**
 * Selection controls: Checkbox, Radio, Switch.
 * Token-driven like everything else — action colours for the checked state,
 * border roles for rest, motion tokens for the transitions. Each accepts a
 * forced interaction state + checked flag so the factory can show the full
 * matrix side by side.
 */
import { Check, Minus } from "lucide-react";
import type { CSSProperties } from "react";
import { rv, sv, tv } from "@/lib/tokens";
import { NO_BINDINGS, Resolver } from "@/lib/componentSchema";
import type { InteractionState } from "./CoreComponents";
import { pxNum } from "./CoreComponents";

const t = (props: string[]): string =>
  props
    .map((p) => `${p} var(--ark-duration-fast) var(--ark-ease-out)`)
    .join(", ");

function ringStyle(on: boolean): CSSProperties {
  return on
    ? { outline: `2px solid ${tv("border-focus")}`, outlineOffset: "2px" }
    : {};
}

function labelStyle(disabled: boolean): CSSProperties {
  return {
    color: disabled ? tv("text-muted") : tv("text-primary"),
    fontSize: "var(--ark-text-sm)",
    fontFamily: "var(--ark-font-sans)",
  };
}

/* ── Checkbox ── */

export function TokenCheckbox({
  state = "default",
  checked = false,
  indeterminate = false,
  radiusStep = 1,
  label = "Email receipts",
  resolve = NO_BINDINGS,
}: {
  state?: InteractionState;
  checked?: boolean;
  indeterminate?: boolean;
  radiusStep?: number;
  label?: string;
  resolve?: Resolver;
}) {
  const disabled = state === "disabled";
  const on = checked || indeterminate;
  const r = resolve;
  const box: CSSProperties = {
    width: 18,
    height: 18,
    flexShrink: 0,
    borderRadius: r("box.radius") ?? rv(radiusStep),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: disabled
      ? tv("action-primary-disabled")
      : on
        ? state === "hover"
          ? tv("action-primary-hover")
          : r("box.bgOn") ?? tv("action-primary-default")
        : r("box.bgOff") ?? tv("surface-elevated"),
    border: `1.5px solid ${
      disabled
        ? tv("action-primary-disabled")
        : on
          ? "transparent"
          : state === "hover"
            ? tv("text-muted")
            : r("box.borderOff") ?? tv("border-default")
    }`,
    color: r("check.color") ?? tv("text-on-action"),
    transition: t(["background", "border-color"]),
    ...ringStyle(state === "focus"),
  };
  const checkSize = pxNum(r("check.size"), 12);

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: sv(2),
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span style={box} role="checkbox" aria-checked={indeterminate ? "mixed" : checked} aria-disabled={disabled}>
        {indeterminate ? (
          <Minus size={checkSize} strokeWidth={3} />
        ) : checked ? (
          <Check size={checkSize} strokeWidth={3} />
        ) : null}
      </span>
      <span style={labelStyle(disabled)}>{label}</span>
    </label>
  );
}

/* ── Radio ── */

export function TokenRadio({
  state = "default",
  checked = false,
  label = "Monthly billing",
  resolve = NO_BINDINGS,
}: {
  state?: InteractionState;
  checked?: boolean;
  label?: string;
  resolve?: Resolver;
}) {
  const disabled = state === "disabled";
  const r = resolve;
  const fill = r("dot.fill") ?? tv("action-primary-default");
  const outer: CSSProperties = {
    width: 18,
    height: 18,
    flexShrink: 0,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: r("dot.bg") ?? tv("surface-elevated"),
    border: `1.5px solid ${
      disabled
        ? tv("action-primary-disabled")
        : checked
          ? fill
          : state === "hover"
            ? tv("text-muted")
            : r("dot.border") ?? tv("border-default")
    }`,
    transition: t(["border-color"]),
    ...ringStyle(state === "focus"),
  };
  const dot: CSSProperties = {
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: disabled ? tv("action-primary-disabled") : fill,
    transform: checked ? "scale(1)" : "scale(0)",
    transition: t(["transform"]),
  };

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: sv(2),
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span style={outer} role="radio" aria-checked={checked} aria-disabled={disabled}>
        <span style={dot} />
      </span>
      <span style={labelStyle(disabled)}>{label}</span>
    </label>
  );
}

/* ── Switch ── */

export function TokenSwitch({
  state = "default",
  checked = false,
  label = "Auto-approve under $100",
  resolve = NO_BINDINGS,
}: {
  state?: InteractionState;
  checked?: boolean;
  label?: string;
  resolve?: Resolver;
}) {
  const disabled = state === "disabled";
  const r = resolve;
  const track: CSSProperties = {
    width: 34,
    height: 20,
    flexShrink: 0,
    borderRadius: 9999,
    padding: 2,
    boxSizing: "border-box",
    background: disabled
      ? tv("action-primary-disabled")
      : checked
        ? state === "hover"
          ? tv("action-primary-hover")
          : r("switchTrack.on") ?? tv("action-primary-default")
        : state === "hover"
          ? tv("text-muted")
          : r("switchTrack.off") ?? tv("surface-subtle"),
    border: `1px solid ${checked || disabled ? "transparent" : tv("border-default")}`,
    transition: t(["background"]),
    ...ringStyle(state === "focus"),
  };
  const thumb: CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: r("switchThumb.bg") ?? tv("surface-base"),
    boxShadow: "var(--ark-shadow-low)",
    transform: checked ? "translateX(14px)" : "translateX(0)",
    transition: t(["transform"]),
  };

  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: sv(2),
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <span style={track} role="switch" aria-checked={checked} aria-disabled={disabled}>
        <span style={{ display: "block", ...thumb }} />
      </span>
      <span style={labelStyle(disabled)}>{label}</span>
    </label>
  );
}
