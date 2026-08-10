import { A11yContext } from "./a11y";

export interface RoleContrastPair {
  fg: string;   // semantic role id used as text/foreground
  bg: string;   // semantic role id used as the surface it sits on
  context: A11yContext;
  label: string; // shown in the UI, e.g. "Primary text on base surface"
  /**
   * When set, `bg` is a stored *value* — a hex, a ramp ref, an "@token" — and
   * not the name of a token in the file. That is the difference between "text
   * on our elevated surface" and "text on pure white": the second is a fixed
   * given the designer has declared, so nothing may repair it by moving it.
   */
  bgIsValue?: boolean;
  /** Group the pairing belongs to in the audit UI (a token group label, or
   *  "Foundation" for the curated cross-group text-on-surface set). */
  section?: string;
  /**
   * Reported but not gated. WCAG 1.4.11 only requires 3:1 of non-text that
   * *carries meaning* — a focus ring, an input boundary, a state dot. A card's
   * hairline or a tinted callout's edge is decoration, and counting it as a
   * failure would bury the real ones. Advisory rows still show their ratio and
   * still offer a fix, they just don't move the AA score.
   */
  advisory?: boolean;
}

// The gate enumerates the *intended, guaranteed* text-on-surface pairings so a
// user's system is flagged the moment a role stops meeting AA on a surface it
// actually renders on. Text roles are guaranteed on the two reading surfaces
// (base + elevated); on tint fills (subtle/sunken) supplementary text steps up
// to `text-secondary`, so those surfaces gate against secondary rather than
// muted. Fills gate their on-action label at rest *and* hover.
export const ROLE_CONTRAST_PAIRS: RoleContrastPair[] = [
  { fg: "text-primary", bg: "surface-base", context: "text-normal", label: "Primary text on base surface" },
  { fg: "text-primary", bg: "surface-elevated", context: "text-normal", label: "Primary text on elevated surface" },
  { fg: "text-primary", bg: "surface-subtle", context: "text-normal", label: "Primary text on subtle surface" },
  { fg: "text-secondary", bg: "surface-base", context: "text-normal", label: "Secondary text on base surface" },
  { fg: "text-secondary", bg: "surface-elevated", context: "text-normal", label: "Secondary text on elevated surface" },
  { fg: "text-secondary", bg: "surface-subtle", context: "text-normal", label: "Secondary text on subtle surface" },
  { fg: "text-secondary", bg: "surface-sunken", context: "text-normal", label: "Secondary text on sunken surface" },
  { fg: "text-muted", bg: "surface-base", context: "text-normal", label: "Muted text on base surface" },
  { fg: "text-muted", bg: "surface-elevated", context: "text-normal", label: "Muted text on elevated surface" },
  { fg: "text-on-action", bg: "action-primary-default", context: "text-normal", label: "Button label on primary action" },
  { fg: "text-link", bg: "surface-base", context: "text-normal", label: "Link on base surface" },
  { fg: "text-link", bg: "surface-elevated", context: "text-normal", label: "Link on elevated surface" },
  { fg: "border-focus", bg: "surface-base", context: "ui-component", label: "Focus ring on base surface" },
  { fg: "feedback-info-text", bg: "feedback-info-surface", context: "text-normal", label: "Info text on info surface" },
  { fg: "feedback-success-text", bg: "feedback-success-surface", context: "text-normal", label: "Success text on success surface" },
  { fg: "feedback-warning-text", bg: "feedback-warning-surface", context: "text-normal", label: "Warning text on warning surface" },
  { fg: "feedback-error-text", bg: "feedback-error-surface", context: "text-normal", label: "Error text on error surface" },
];

/**
 * Extra curated pairings that only apply when the tokens involved exist. These
 * cover the interaction states and chrome that the base list skips, so editing
 * `action-primary-hover` or `border-default` moves the audit instead of leaving
 * it frozen on the seventeen shipped defaults.
 */
const OPTIONAL_PAIRS: RoleContrastPair[] = [
  { fg: "text-on-action", bg: "action-primary-hover", context: "text-normal", label: "Button label on primary action · hover" },
  { fg: "text-on-action", bg: "action-primary-active", context: "text-normal", label: "Button label on primary action · pressed" },
  { fg: "text-primary", bg: "action-secondary-default", context: "text-normal", label: "Label on secondary action" },
  { fg: "text-primary", bg: "action-secondary-hover", context: "text-normal", label: "Label on secondary action · hover" },
  { fg: "text-link-hover", bg: "surface-base", context: "text-normal", label: "Link on base surface · hover" },
  // No `text-muted` on the tint fills: the system's contract is that
  // supplementary text steps up to `text-secondary` there (see the note above
  // the base list), so gating muted on those surfaces flags a pairing the
  // product never renders.
  { fg: "border-focus", bg: "surface-elevated", context: "ui-component", label: "Focus ring on elevated surface" },
  { fg: "border-strong", bg: "surface-base", context: "ui-component", label: "Strong border on base surface", advisory: true },
  { fg: "border-default", bg: "surface-base", context: "ui-component", label: "Default border on base surface", advisory: true },
  { fg: "feedback-info-border", bg: "feedback-info-surface", context: "ui-component", label: "Info border on info surface", advisory: true },
  { fg: "feedback-success-border", bg: "feedback-success-surface", context: "ui-component", label: "Success border on success surface", advisory: true },
  { fg: "feedback-warning-border", bg: "feedback-warning-surface", context: "ui-component", label: "Warning border on warning surface", advisory: true },
  { fg: "feedback-error-border", bg: "feedback-error-surface", context: "ui-component", label: "Error border on error surface", advisory: true },
];

/* ────────────────────────── derived pairings ────────────────────────── */

/** Structural shape of a token group — restated so this module stays free of
 *  a store import (the store is what ultimately renders the audit). */
export interface TokenGroupShape {
  label: string;
  tokens: string[];
  kind?: "semantic" | "component";
}

const SURFACE_SUFFIX = ["-bg", "-background", "-surface", "-fill", "-container"];
const TEXT_SUFFIX = ["-text", "-label", "-fg", "-foreground", "-icon", "-title"];
const BORDER_SUFFIX = ["-border", "-outline", "-ring", "-stroke", "-divider"];

const endsWithAny = (token: string, suffixes: string[]): boolean =>
  suffixes.some((s) => token.endsWith(s));

/** "button-bg" → "Button bg"; used to label auto-derived pairings readably. */
function humanise(token: string): string {
  const words = token.split("-").filter(Boolean);
  if (words.length === 0) return token;
  return words.join(" ");
}

/**
 * Every pairing a *group* implies on its own: each text-ish token against each
 * surface-ish token declared beside it, and each border-ish token against those
 * same surfaces as a non-text (3:1) check.
 *
 * This is what makes the audit track the system rather than a frozen list — add
 * a "Chart" group with `chart-bg` / `chart-label` and it is audited from the
 * next render, in both modes, with no code change.
 */
function pairsWithinGroup(group: TokenGroupShape): RoleContrastPair[] {
  const surfaces = group.tokens.filter((t) => endsWithAny(t, SURFACE_SUFFIX));
  if (surfaces.length === 0) return [];
  const texts = group.tokens.filter((t) => endsWithAny(t, TEXT_SUFFIX));
  const borders = group.tokens.filter((t) => endsWithAny(t, BORDER_SUFFIX));

  const out: RoleContrastPair[] = [];
  for (const bg of surfaces) {
    for (const fg of texts) {
      out.push({
        fg,
        bg,
        context: "text-normal",
        label: `${humanise(fg)} on ${humanise(bg)}`,
        section: group.label,
      });
    }
    for (const fg of borders) {
      out.push({
        fg,
        bg,
        context: "ui-component",
        label: `${humanise(fg)} on ${humanise(bg)}`,
        section: group.label,
        // A component's own boundary only has to clear 3:1 when it is the thing
        // communicating the control — we can't know that from a token name, so
        // report it and leave the judgement to the designer.
        advisory: true,
      });
    }
  }
  return out;
}

/**
 * The live pairing set for a system: the curated cross-group text-on-surface
 * contracts (dropped when a token has been renamed or deleted out from under
 * them) plus everything each token group implies about itself.
 */
export function derivePairs(groups: TokenGroupShape[]): RoleContrastPair[] {
  const exists = new Set(groups.flatMap((g) => g.tokens));
  const seen = new Set<string>();
  const out: RoleContrastPair[] = [];

  const push = (pair: RoleContrastPair) => {
    if (pair.fg === pair.bg) return;
    if (!exists.has(pair.fg) || !exists.has(pair.bg)) return;
    const key = `${pair.fg}|${pair.bg}|${pair.context}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(pair);
  };

  for (const pair of ROLE_CONTRAST_PAIRS) push({ ...pair, section: pair.section ?? "Foundation" });
  for (const pair of OPTIONAL_PAIRS) push({ ...pair, section: pair.section ?? "Foundation" });
  for (const group of groups) for (const pair of pairsWithinGroup(group)) push(pair);

  return out;
}

/* ──────────────────── backgrounds the designer declares ─────────────────── */

/**
 * A background the audit checks against on top of the file's own surfaces.
 *
 * The derived set above can only find surfaces that *are* tokens, named with a
 * surface suffix. That leaves out the backgrounds a design most often has to
 * survive and least often owns: pure white, pure black, a marketing page's
 * photo wash, a partner's brand fill. This is how one gets declared.
 *
 * `value` is written in the same grammar a token's value uses — "#ffffff",
 * "brand-600", "@surface-base" — so a backdrop can track the system if you want
 * it to, or stay pinned if you don't.
 */
export interface A11yBackdrop {
  id: string;
  label: string;
  value: string;
}

/**
 * Every text and border token in the file, checked against one declared
 * background. Text is gated at the full bar; borders are advisory for the same
 * reason they are everywhere else — a name can't say whether an edge is what
 * identifies the control.
 *
 * `isColorToken` lets the caller drop tokens that hold a size or a weight; the
 * suffix lists rarely catch one, but "add a background" is the one place a
 * user's own naming meets this code, so the door is there.
 */
export function pairsAgainstBackdrop(
  groups: TokenGroupShape[],
  backdrop: A11yBackdrop,
  isColorToken?: (token: string) => boolean
): RoleContrastPair[] {
  const seen = new Set<string>();
  const out: RoleContrastPair[] = [];

  for (const group of groups) {
    for (const token of group.tokens) {
      if (seen.has(token)) continue;
      if (isColorToken && !isColorToken(token)) continue;
      const isText = endsWithAny(token, TEXT_SUFFIX);
      const isBorder = !isText && endsWithAny(token, BORDER_SUFFIX);
      if (!isText && !isBorder) continue;
      seen.add(token);
      out.push({
        fg: token,
        bg: backdrop.value,
        bgIsValue: true,
        context: isText ? "text-normal" : "ui-component",
        label: `${humanise(token)} on ${backdrop.label}`,
        section: backdrop.label,
        advisory: isBorder,
      });
    }
  }

  return out;
}

/** Every pair a given role participates in (as fg or bg), for the picker's live badge. */
export function pairsInvolving(
  roleId: string,
  pairs: RoleContrastPair[] = ROLE_CONTRAST_PAIRS
): RoleContrastPair[] {
  return pairs.filter((p) => p.fg === roleId || p.bg === roleId);
}
