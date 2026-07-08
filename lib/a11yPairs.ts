import { A11yContext } from "./a11y";

export interface RoleContrastPair {
  fg: string;   // semantic role id used as text/foreground
  bg: string;   // semantic role id used as the surface it sits on
  context: A11yContext;
  label: string; // shown in the UI, e.g. "Primary text on base surface"
}

export const ROLE_CONTRAST_PAIRS: RoleContrastPair[] = [
  { fg: "text-primary", bg: "surface-base", context: "text-normal", label: "Primary text on base surface" },
  { fg: "text-primary", bg: "surface-elevated", context: "text-normal", label: "Primary text on elevated surface" },
  { fg: "text-secondary", bg: "surface-base", context: "text-normal", label: "Secondary text on base surface" },
  { fg: "text-muted", bg: "surface-base", context: "text-normal", label: "Muted text on base surface" },
  { fg: "text-on-action", bg: "action-primary-default", context: "text-normal", label: "Button label on primary action" },
  { fg: "text-link", bg: "surface-base", context: "text-normal", label: "Link on base surface" },
  { fg: "border-focus", bg: "surface-base", context: "ui-component", label: "Focus ring on base surface" },
  { fg: "feedback-info-text", bg: "feedback-info-surface", context: "text-normal", label: "Info text on info surface" },
  { fg: "feedback-success-text", bg: "feedback-success-surface", context: "text-normal", label: "Success text on success surface" },
  { fg: "feedback-warning-text", bg: "feedback-warning-surface", context: "text-normal", label: "Warning text on warning surface" },
  { fg: "feedback-error-text", bg: "feedback-error-surface", context: "text-normal", label: "Error text on error surface" },
];

/** Every pair a given role participates in (as fg or bg), for the picker's live badge. */
export function pairsInvolving(roleId: string): RoleContrastPair[] {
  return ROLE_CONTRAST_PAIRS.filter((p) => p.fg === roleId || p.bg === roleId);
}
