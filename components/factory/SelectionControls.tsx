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
import {
  useTemplate,
  tplToggleRadius,
  tplToggleStroke,
  tplSwitchMetrics,
} from "./templateKit";

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
  // Template shape grammar: a checkbox is a circle in Apple's systems, a hard
  // square in Carbon, and a softly-rounded box everywhere else — the corner is
  // the whole tell. Stroke weight follows the same profile.
  const tpl = useTemplate("checkbox");
  const stroke = tplToggleStroke(tpl) ?? "1.5px";
  const box: CSSProperties = {
    width: 18,
    height: 18,
    flexShrink: 0,
    borderRadius: r("box.radius") ?? tplToggleRadius(tpl) ?? rv(radiusStep),
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
    border: `${stroke} solid ${
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
      <span data-ark-part="box" style={box} role="checkbox" aria-checked={indeterminate ? "mixed" : checked} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}>
        {indeterminate ? (
          <Minus data-ark-part="check" size={checkSize} strokeWidth={3} />
        ) : checked ? (
          <Check data-ark-part="check" size={checkSize} strokeWidth={3} />
        ) : null}
      </span>
      {label ? <span style={labelStyle(disabled)}>{label}</span> : null}
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
  const tpl = useTemplate("radio");
  // Every one of the five systems draws a radio as a circle — what differs is
  // the ring weight, so that's the only thing the template touches here.
  const stroke = tplToggleStroke(tpl) ?? "1.5px";
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
    border: `${stroke} solid ${
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
      <span data-ark-part="dot" style={outer} role="radio" aria-checked={checked} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}>
        <span style={dot} />
      </span>
      {label ? <span style={labelStyle(disabled)}>{label}</span> : null}
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
  // Each system's switch has a signature size: Apple's tall capsule with a knob
  // that nearly fills it, Material's wide track, Carbon's square-cornered
  // rectangle, and the compact pills Atlassian and Fluent use. `m` is
  // undefined for Arkitype, which keeps its own 34×20.
  const tpl = useTemplate("switch");
  const m = tplSwitchMetrics(tpl);
  const trackW = m?.w ?? 34;
  const trackH = m?.h ?? 20;
  const knob = m?.knob ?? 14;
  const pad = m?.pad ?? 2;
  // 1px of border on each side, which the track always draws (transparent when
  // on) — so the thumb's travel is the track minus its border, padding and knob.
  const travel = trackW - 2 - pad * 2 - knob;
  const track: CSSProperties = {
    width: trackW,
    height: trackH,
    flexShrink: 0,
    borderRadius: m?.trackRadius ?? 9999,
    padding: pad,
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
    width: knob,
    height: knob,
    borderRadius: m ? m.knobRadius : "50%",
    background: r("switchThumb.bg") ?? tv("surface-base"),
    boxShadow: "var(--ark-shadow-low)",
    transform: checked ? `translateX(${travel}px)` : "translateX(0)",
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
      <span data-ark-part="switchTrack" style={track} role="switch" aria-checked={checked} aria-disabled={disabled} tabIndex={disabled ? -1 : 0}>
        <span data-ark-part="switchThumb" style={{ display: "block", ...thumb }} />
      </span>
      {label ? <span style={labelStyle(disabled)}>{label}</span> : null}
    </label>
  );
}
