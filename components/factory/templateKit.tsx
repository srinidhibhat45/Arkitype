"use client";

/**
 * Shared presentational recipes for the three built-in component Templates
 * (see `lib/componentTemplates.ts`) — kept in one place so "what does a
 * Material 3 surface look like" is answered once and composed by every
 * `Token*` component's `material3`/`apple`/`carbon` branch, rather than
 * thirty independent guesses drifting apart.
 *
 * These are pure style helpers and small dumb components — no store reads,
 * no `resolve()` calls. Every caller is expected to prefer its own
 * `resolve("part.key")` override first and only fall back to these, exactly
 * like the existing default layout falls back to its own hardcoded value —
 * that's what keeps a user's per-part binding overrides working no matter
 * which template is active.
 *
 * Colour always comes in from the caller (a resolved tone, or a plain
 * surface/text role for the toneless components — menus, cards, list rows)
 * — a template changes structure, never introduces its own literal colour.
 */
import type { CSSProperties } from "react";
import { ArrowRight, ChevronRight, X } from "lucide-react";
import { tv } from "@/lib/tokens";

export interface ToneColors {
  bg: string;
  border: string;
  text: string;
  accent: string;
}

/* ── Material 3: tonal fill, no border, generous rounding ──
 *
 * Radius is deliberately NOT part of these style objects — every call site
 * sets `borderRadius: r("container.radius") ?? \`${MATERIAL_RADIUS.md}px\``
 * itself, the same `resolve() ?? fallback` idiom the rest of the codebase
 * uses everywhere else, so a user's own radius override still wins no matter
 * which template is active. */

export const MATERIAL_RADIUS = { sm: 14, md: 20, lg: 26 } as const;

export function materialSurface(tone: ToneColors): CSSProperties {
  return {
    background: tone.bg,
    border: "none",
    color: tone.text,
  };
}

/* ── Apple / HIG: neutral elevated card, soft shadow, big continuous radius ── */

export const APPLE_RADIUS = { sm: 12, md: 18, lg: 22 } as const;

export function appleSurface(): CSSProperties {
  return {
    background: tv("surface-elevated"),
    border: "none",
    boxShadow: "var(--ark-shadow-low)",
    color: tv("text-primary"),
  };
}

/** A small rounded-square glyph badge, tinted with the tone — reads as an
 *  "app icon" rather than the default's circular roundel, so Apple templates
 *  stay visually distinct from Arkitype/Toast's own icon treatment. */
export function appleIconBadge(tone: ToneColors, size = 34): CSSProperties {
  return {
    width: size,
    height: size,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Math.round(size * 0.32),
    background: tone.bg,
    border: `1px solid ${tone.border}`,
    color: tone.accent,
  };
}

/* ── IBM Carbon: square corners, thick accent bar, flat tonal fill ──
 *
 * Zero radius is the point of this template, but it's still only the
 * *fallback* — a call site should still write
 * `borderRadius: r("container.radius") ?? 0` rather than hardcoding 0
 * outright, so an explicit user override survives switching templates. */

export function carbonSurface(
  tone: ToneColors,
  opts: { side?: "left" | "top"; barWidth?: number } = {}
): CSSProperties {
  const side = opts.side ?? "left";
  const width = opts.barWidth ?? 4;
  const base: CSSProperties = {
    background: tone.bg,
    color: tone.text,
  };
  return side === "left"
    ? { ...base, borderLeft: `${width}px solid ${tone.accent}` }
    : { ...base, borderTop: `${width}px solid ${tone.accent}` };
}

/* ── shared text-only action affordances (no boxed button in these systems) ── */

/**
 * Material's borderless semibold text action, or Carbon's underlined text
 * link with a trailing arrow — the same small control, styled by `variant`.
 * Demo-only by default (no `onClick`), matching how the default layout's own
 * action/dismiss controls are non-functional in the preview.
 */
export function TemplateTextAction({
  label,
  color,
  variant = "material",
  onClick,
}: {
  label: string;
  color: string;
  variant?: "material" | "carbon";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        margin: 0,
        cursor: onClick ? "pointer" : "default",
        color,
        fontFamily: "var(--ark-font-sans)",
        fontSize: "var(--ark-text-xs)",
        fontWeight: 700,
        textDecoration: variant === "carbon" ? "underline" : "none",
        textUnderlineOffset: 2,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {variant === "carbon" ? <ArrowRight size={12} /> : null}
    </button>
  );
}

/** Apple's "the whole row is tappable" trailing chevron affordance, paired
 *  with the action's own label so it stays informative rather than mysterious. */
export function AppleTrailingAction({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, flexShrink: 0, color }}>
      <span style={{ fontSize: "var(--ark-text-xs)", fontWeight: 600, whiteSpace: "nowrap" }}>{label}</span>
      <ChevronRight size={14} />
    </span>
  );
}

/** iOS notification's small muted "×" dismiss — a filled circle, not a plain
 *  glyph, so it reads distinct from the default layout's bare icon-button. */
export function AppleDismiss({ onClick, label = "Dismiss" }: { onClick?: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        width: 20,
        height: 20,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        border: "none",
        padding: 0,
        cursor: onClick ? "pointer" : "default",
        background: tv("surface-subtle"),
        color: tv("text-muted"),
      }}
    >
      <X size={11} />
    </button>
  );
}

/** Carbon's close control, pinned top-right. The caller's surface needs
 *  `position: relative` for this to anchor correctly. */
export function CarbonCloseButton({
  color,
  onClick,
  label = "Dismiss",
}: {
  color: string;
  onClick?: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        background: "none",
        border: "none",
        padding: 4,
        margin: 0,
        cursor: onClick ? "pointer" : "default",
        color,
        display: "inline-flex",
        lineHeight: 0,
      }}
    >
      <X size={14} />
    </button>
  );
}

