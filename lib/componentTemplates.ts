/**
 * Component Templates — alternate, hand-built *structures* for a handful of
 * compound components, modeled on real, widely-used design systems (Material
 * 3, Apple's Human Interface Guidelines, IBM Carbon) instead of Arkitype's
 * own default layout.
 *
 * A template only ever changes JSX structure — spacing, corner treatment,
 * where the icon/action sit. It never introduces its own colour: every
 * template renders through the exact same `resolve()` binding chain and the
 * same tone/token lookups the default layout already uses, so switching
 * templates keeps the file's own colours (and any per-part overrides the
 * user has already set) automatically. See `components/factory/templateKit.tsx`
 * for the shared style recipes and ATOMIC_DESIGN_PLAN-adjacent notes inline
 * in each `Token*` component for how a template branch is wired.
 *
 * Storage: the active template id lives at `ComponentConfig.properties.template`
 * — a plain, undeclared property (same convention as `radiusStep`/`title.size`),
 * never a schema `OptionSpec`, so it never appears in the generic Options list
 * and needs no store/migration changes. Absent = "arkitype" (today's exact
 * output, unchanged) for every project that never opens the picker.
 */

export interface ComponentTemplate {
  id: string;
  name: string;
  /** Short attribution line — a name only, never a literal asset/logo. */
  source: string;
  /** One sentence on what's structurally different from the default. */
  description: string;
}

const ARKITYPE_ORIGINAL = (description: string): ComponentTemplate => ({
  id: "arkitype",
  name: "Arkitype (Original)",
  source: "This design system",
  description,
});

const MATERIAL = (description: string): ComponentTemplate => ({
  id: "material3",
  name: "Material 3",
  source: "Google · Material Design",
  description,
});

const APPLE = (description: string): ComponentTemplate => ({
  id: "apple",
  name: "Apple (HIG)",
  source: "Apple · Human Interface Guidelines",
  description,
});

const CARBON = (description: string): ComponentTemplate => ({
  id: "carbon",
  name: "IBM Carbon",
  source: "IBM · Carbon Design System",
  description,
});

/**
 * Registry, keyed by component id (must match `COMPONENT_SPECS`). A component
 * absent here — or present with only the "arkitype" entry — has no template
 * picker: `getTemplates` still returns the one-item list, and `TemplateButton`
 * renders nothing when there's nothing to switch between.
 */
export const COMPONENT_TEMPLATES: Record<string, ComponentTemplate[]> = {
  alert: [
    ARKITYPE_ORIGINAL("Icon, stacked title and body, accent bar on one edge."),
    MATERIAL("Tonal filled surface, no border, generous corners, text-only action."),
    APPLE("Elevated neutral card with a tinted icon badge, like an iOS in-app notification."),
    CARBON("Square corners, bold left bar, top-right close, underlined text action."),
  ],
  toast: [
    ARKITYPE_ORIGINAL("Elevated card, circular icon badge, inline title and body."),
    MATERIAL("Tonal filled surface, no border, pill-leaning corners, text-only action."),
    APPLE("Compact elevated card with a tinted app-icon-style badge, iOS notification banner style."),
    CARBON("Square corners, bold left bar, flat fill, underlined text action."),
  ],
  banner: [
    ARKITYPE_ORIGINAL("Full-width tone wash with a hairline border and inline action."),
    MATERIAL("Tonal filled bar, no border, pill action button trailing."),
    APPLE("Neutral elevated bar with a tinted icon badge and a plain trailing link."),
    CARBON("Square corners, bold left bar, flat fill, underlined text action."),
  ],
  card: [
    ARKITYPE_ORIGINAL("Bordered surface, ruled header/footer, filled button."),
    MATERIAL("Borderless tonal-elevated surface, generous corners, text-only action."),
    APPLE("Grouped-list style card — neutral surface, soft shadow, chevron affordance."),
    CARBON("Square corners, ruled dividers, underlined text action."),
  ],
  emptyState: [
    ARKITYPE_ORIGINAL("Bordered icon roundel, centered stack, filled button."),
    MATERIAL("Tonal icon roundel, generous corners, filled button."),
    APPLE("Large glyph, bold title, secondary body, plain text action link."),
    CARBON("Square icon frame, left-aligned copy, underlined text action."),
  ],
  accordion: [
    ARKITYPE_ORIGINAL("Bordered container, chevron rotates open, ruled rows."),
    MATERIAL("Tonal-filled row when open, no outer border, generous corners."),
    APPLE("Inset grouped rows with hairline dividers, iOS Settings list style."),
    CARBON("Square corners, ruled dividers, bold header row, plus/minus glyph."),
  ],
  dropdown: [
    ARKITYPE_ORIGINAL("Bordered menu, subtle highlight on the active row."),
    MATERIAL("Borderless tonal surface, filled pill highlight, larger row height."),
    APPLE("Elevated rounded menu with dividers and trailing checkmarks, macOS context-menu style."),
    CARBON("Square corners, compact rows, left accent bar on the active row."),
  ],
  listItem: [
    ARKITYPE_ORIGINAL("Bordered container, ruled rows, trailing chevron."),
    MATERIAL("Borderless surface, rounded tonal highlight on rows, larger avatar."),
    APPLE("Inset grouped rows with hairline dividers and chevrons, iOS Settings style."),
    CARBON("Square corners, ruled rows, compact structured-list density."),
  ],
  feedItem: [
    ARKITYPE_ORIGINAL("Bordered card, avatar-led header, inline reaction row."),
    MATERIAL("Borderless tonal-elevated card, generous corners, text-only reply link."),
    APPLE("Neutral elevated card, bold author line, plain trailing chevron."),
    CARBON("Square corners, ruled divider under the header, underlined reply link."),
  ],
  popover: [
    ARKITYPE_ORIGINAL("Bordered elevated card, inline close and action."),
    MATERIAL("Borderless tonal-elevated surface, generous corners, text-only action."),
    APPLE("Neutral elevated card, soft shadow, plain trailing text action."),
    CARBON("Square corners, ruled divider above the action, underlined text action."),
  ],
};

/** Every registered template for a component, "Arkitype" first. Never empty —
 *  a component missing from the registry still gets a synthetic one-item list
 *  so callers don't need a null-check before reading `[0]`. */
export function getTemplates(componentId: string): ComponentTemplate[] {
  return COMPONENT_TEMPLATES[componentId] ?? [ARKITYPE_ORIGINAL("The default layout.")];
}

/** Whether a component has more than the default to choose from — gates the
 *  picker button so components with no registered alternates show nothing. */
export function hasTemplates(componentId: string): boolean {
  return getTemplates(componentId).length > 1;
}

/** The effective template id for a component: a stored `properties.template`
 *  if present and still valid, else "arkitype". Centralizing this (rather than
 *  repeating `(properties?.template as string) ?? "arkitype"` at every call
 *  site) keeps a future "unknown/removed template id" case handled in one place. */
export function activeTemplateId(
  componentId: string,
  properties: Record<string, string | number | boolean> | undefined
): string {
  const stored = properties?.template;
  if (typeof stored !== "string" || !stored) return "arkitype";
  const known = getTemplates(componentId).some((t) => t.id === stored);
  return known ? stored : "arkitype";
}

export function getTemplate(componentId: string, templateId: string): ComponentTemplate {
  return (
    getTemplates(componentId).find((t) => t.id === templateId) ?? getTemplates(componentId)[0]
  );
}
