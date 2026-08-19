"use client";

/**
 * Shared presentational recipes for component Templates (see
 * `lib/componentTemplates.ts`) — kept in one place so "what does a Material 3
 * surface look like" is answered once and composed by every `Token*`
 * component, rather than fifty independent guesses drifting apart.
 *
 * Two halves, in this order:
 *
 *  - **Structure recipes** (first) — the hand-built Material 3 / Apple /
 *    Carbon layouts used by the ten compound components that swap their whole
 *    arrangement, one `material3`/`apple`/`carbon` branch each.
 *  - **Shape grammar** (second, `tpl*`) — radius, density, edge, elevation and
 *    typography, driven by a `TemplateProfile` and applied to all 53
 *    components including those ten.
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
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, ChevronRight, X } from "lucide-react";
import { tv } from "@/lib/tokens";
import { useDesignSystem } from "@/store/useDesignSystem";
import {
  type RadiusRole,
  type TemplateProfile,
  templateProfile,
} from "@/lib/componentTemplates";

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


/* ══════════════════════════════════════════════════════════════════════════
   Shape grammar — the part of a template that applies to all 53 components
   ══════════════════════════════════════════════════════════════════════════

   Everything below turns a `TemplateProfile` (lib/componentTemplates.ts) into
   concrete CSS. Two rules hold everywhere, and they're what make templates
   safe to switch:

   1. **Every helper returns `undefined` for the Arkitype profile.** There is no
      "arkitype" branch anywhere — its profile simply supplies nothing, so the
      component's own fallback runs and the output is byte-identical to what it
      was before templates existed.
   2. **Every helper is a fallback, never an override.** Call sites read
      `r("container.radius") ?? tplRadius(tpl, "control") ?? rv(radiusStep)` —
      a user's binding wins over the template, which wins over the built-in
      default. Same idiom the codebase already uses for every other default.
*/

/**
 * Renders a subtree as if a given template were active, without writing it to
 * the store — that's how the picker's cards show six live previews of a
 * component that still has only one saved choice.
 */
const TemplateOverrideContext = createContext<string | undefined>(undefined);

export function TemplatePreviewScope({
  template,
  children,
}: {
  template: string;
  children: ReactNode;
}) {
  return (
    <TemplateOverrideContext.Provider value={template}>{children}</TemplateOverrideContext.Provider>
  );
}

/**
 * The active shape grammar for a component: an explicit prop wins (a few
 * compound components take one), then a preview scope, then the stored
 * `properties.template`, then Arkitype's no-opinion profile.
 */
export function useTemplate(componentId: string, override?: string): TemplateProfile {
  const scoped = useContext(TemplateOverrideContext);
  const stored = useDesignSystem((s) => s.components[componentId]?.properties?.template);
  const id = override ?? scoped ?? (typeof stored === "string" ? stored : undefined);
  return templateProfile(id);
}

/** Corner radius for a shape role, as a CSS length. `undefined` = no opinion. */
export function tplRadius(p: TemplateProfile, role: RadiusRole): string | undefined {
  if (!p.radius) return undefined;
  return `${p.radius[role]}px`;
}

/**
 * Density-scaled padding. `base` is whatever the component already used — a
 * spacing var, a calc, a px string — so the file's own spacing scale still
 * drives the value and the template only stretches or tightens it.
 */
export function tplPad(p: TemplateProfile, base: string): string {
  if (p.density === 1) return base;
  return `calc(${base} * ${p.density})`;
}

/** Label typography (weight / tracking / case). `{}` for Arkitype, so it can be
 *  spread unconditionally. Spread it *before* any `r()`-resolved values. */
export function tplType(p: TemplateProfile): CSSProperties {
  if (!p.type) return {};
  return {
    fontWeight: p.type.weight,
    letterSpacing: p.type.tracking,
    ...(p.type.caps ? { textTransform: "uppercase" as const } : {}),
  };
}

/** Just the weight, for call sites that already own letter-spacing. */
export function tplWeight(p: TemplateProfile): number | undefined {
  return p.type?.weight;
}

/** Elevation token for a raised surface or an overlay. */
export function tplShadow(p: TemplateProfile, level: "raised" | "overlay"): string | undefined {
  return p.elevation?.[level];
}

/** Border width for a container ("0px" where a system is borderless). */
export function tplBorderWidth(p: TemplateProfile): string | undefined {
  return p.border == null ? undefined : `${p.border}px`;
}

/** Border width for a form field — Atlassian draws a heavier one than it does
 *  anywhere else, which is most of why its inputs read as Atlassian's. */
export function tplFieldBorderWidth(p: TemplateProfile): string | undefined {
  return p.fieldBorder == null ? undefined : `${p.fieldBorder}px`;
}

/** The fill a system reaches for on a container: tonal, elevated or flat. */
export function tplSurfaceBg(p: TemplateProfile): string | undefined {
  switch (p.surface) {
    case "tonal":
      return tv("surface-subtle");
    case "flat":
      return tv("surface-subtle");
    case "elevated":
    case "outlined":
      return tv("surface-elevated");
    default:
      return undefined;
  }
}

/**
 * A container's whole edge, in longhand. Always returns all four sides (never
 * the `border` shorthand) so a template switch can't hand React a shorthand on
 * one render and a longhand on the next — which it warns about.
 *
 * Pass the colour and width the component already resolved (binding first);
 * the template only decides *which sides are drawn*, so a bound border colour
 * still paints the underline in a filled-underline system.
 */
export function tplEdge(
  p: TemplateProfile,
  opts: {
    color: string;
    width: string;
    /** Field edges vary by system; container edges don't. */
    kind?: "container" | "field";
    /** The colour a focused field's emphasis stroke uses. */
    accent?: string;
    focused?: boolean;
  }
): CSSProperties {
  const { color, width, kind = "container", accent, focused } = opts;
  const none = "0px";
  const all = (w: string, c: string): CSSProperties => ({
    borderStyle: "solid",
    borderTopWidth: w,
    borderRightWidth: w,
    borderBottomWidth: w,
    borderLeftWidth: w,
    borderTopColor: c,
    borderRightColor: c,
    borderBottomColor: c,
    borderLeftColor: c,
  });

  if (kind === "field" && p.field) {
    const emphasis = focused && accent ? accent : color;
    switch (p.field) {
      // Material 3 / Carbon: one rule along the bottom, nothing elsewhere.
      case "filled-underline":
      case "underline":
        return {
          ...all(none, color),
          borderBottomWidth: focused ? "2px" : width === none ? "1px" : width,
          borderBottomColor: emphasis,
        };
      // Apple: no edge at all — the fill is the field.
      case "filled":
        return all(none, color);
      // Fluent: hairline box, heavier accent stroke along the bottom.
      case "accent-underline":
        return {
          ...all(width, color),
          borderBottomWidth: focused ? "2px" : width,
          borderBottomColor: emphasis,
        };
      // Atlassian: a heavy box that lights up on focus.
      case "sunken":
        return all(width, emphasis);
      case "outline":
      default:
        return all(width, color);
    }
  }

  return all(width, color);
}

/** The fill behind a field, for the systems that use one. */
export function tplFieldBg(p: TemplateProfile): string | undefined {
  switch (p.field) {
    case "filled-underline":
    case "filled":
    case "underline":
    case "sunken":
      return tv("surface-subtle");
    default:
      return undefined;
  }
}

/**
 * The decoration behind an *active* nav item — a filled pill, a tint, or
 * nothing (for the systems that mark the active item with a bar instead, see
 * `tplActiveBar`). `accent` is the colour the component already resolved.
 */
export function tplActiveChip(
  p: TemplateProfile,
  accent: string
): CSSProperties | undefined {
  switch (p.indicator) {
    case "pill":
      return {
        background: `color-mix(in srgb, ${accent} 18%, transparent)`,
        borderRadius: 999,
      };
    case "tint":
      return {
        background: `color-mix(in srgb, ${accent} 12%, transparent)`,
        borderRadius: 8,
      };
    default:
      return undefined;
  }
}

/**
 * The bar a system draws along the active edge — square (Carbon), hairline
 * (Atlassian) or rounded-capped (Fluent). `undefined` where the system marks
 * the active item with a chip instead.
 */
export function tplActiveBar(
  p: TemplateProfile,
  accent: string
): { thickness: number; radius: number; color: string; inset: number } | undefined {
  switch (p.indicator) {
    case "bar":
      return { thickness: 3, radius: 0, color: accent, inset: 0 };
    case "underline":
      return { thickness: 2, radius: 0, color: accent, inset: 0 };
    case "rounded-bar":
      return { thickness: 3, radius: 999, color: accent, inset: 6 };
    default:
      return undefined;
  }
}

/**
 * Fold a template's shape grammar into a component's own *declared* scalar
 * options (Modal/Tabs/Table's `radius`, `borderWidth`, `padding`…).
 *
 * `raw` is the unresolved properties bag, and a key present in it means the
 * user actually set that value — `resolveOptions()` has already substituted the
 * schema default by the time you see it, so the raw bag is the only way to tell
 * "the user chose 12" from "12 is the default". A template supplies the
 * default; it never overrules a choice, or the inspector control would go dead.
 */
export function tplScalar<T>(
  raw: Record<string, unknown> | undefined,
  key: string,
  resolved: T,
  templated: T | undefined | null
): T {
  if (raw?.[key] !== undefined) return resolved;
  return templated ?? resolved;
}

/** True where a system squares every corner it draws — Carbon, and only
 *  Carbon, among the five. Cheaper than threading a radius through a bar, a
 *  track or an SVG cap that has no `borderRadius` to override. */
export function tplIsSquare(p: TemplateProfile): boolean {
  return p.radius?.control === 0;
}

/** Checkbox corner treatment — a circle for the systems that use one. */
export function tplToggleRadius(p: TemplateProfile): string | undefined {
  if (!p.toggle || !p.radius) return undefined;
  return p.toggle === "round" ? "50%" : `${p.radius.toggle}px`;
}

/**
 * Stroke weight for a checkbox/radio outline. Distinct from `border` (which is
 * about containers): Material draws a heavy 2px box while its surfaces have no
 * border at all, so one number can't serve both.
 */
export function tplToggleStroke(p: TemplateProfile): string | undefined {
  switch (p.id) {
    case "material3":
      return "2px";
    case "apple":
      return "1.5px";
    case "carbon":
      return "1px";
    case "atlassian":
      return "2px";
    case "fluent":
      return "1px";
    default:
      return undefined;
  }
}

/**
 * Switch geometry. Every system has a signature track: Apple's tall capsule,
 * Material's wide track with an oversized knob, Carbon's rectangle with a
 * square knob, and the compact pills used by Atlassian and Fluent.
 */
export function tplSwitchMetrics(
  p: TemplateProfile
): { w: number; h: number; knob: number; trackRadius: number; knobRadius: number; pad: number } | undefined {
  switch (p.id) {
    case "material3":
      return { w: 44, h: 26, knob: 18, trackRadius: 999, knobRadius: 999, pad: 3 };
    case "apple":
      return { w: 42, h: 26, knob: 22, trackRadius: 999, knobRadius: 999, pad: 2 };
    case "carbon":
      return { w: 42, h: 22, knob: 16, trackRadius: 0, knobRadius: 0, pad: 3 };
    case "atlassian":
      return { w: 32, h: 18, knob: 12, trackRadius: 999, knobRadius: 999, pad: 3 };
    case "fluent":
      return { w: 38, h: 20, knob: 12, trackRadius: 999, knobRadius: 999, pad: 4 };
    default:
      return undefined;
  }
}
