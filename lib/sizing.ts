/**
 * The one definition of what a component "size" means.
 *
 * A size is not a magic number — it names a step on the user's own spacing and
 * type scales. `SIZE_MAP` is that mapping, and it is shared by three consumers
 * that must never disagree:
 *
 *   1. the live factory components (padding/font-size in the preview),
 *   2. the Component Studio's Size control, and
 *   3. the Figma exporter, which turns it into a real `size` variant property.
 *
 * Before this lived here, the studio let a designer pick a size that the Figma
 * bundle then ignored entirely — every exported Input came out medium.
 */

export type SizeToken = "sm" | "md" | "lg" | "xl";

/** size → [paddingY step, paddingX step, type step] against the system scales. */
export const SIZE_MAP: Record<SizeToken, { py: number; px: number; text: string }> = {
  sm: { py: 1, px: 2, text: "xs" },
  md: { py: 1, px: 3, text: "sm" },
  lg: { py: 2, px: 4, text: "base" },
  xl: { py: 3, px: 5, text: "lg" },
};

/** Display order for size controls and the exported Figma variant axis. */
export const SIZE_ORDER: SizeToken[] = ["sm", "md", "lg", "xl"];

/**
 * Components whose Studio exposes a Size control.
 *
 * Only the subset in `SIZE_VARIANT_COMPONENTS` also expands into a Figma `size`
 * variant axis — see the note there.
 */
export const SIZABLE_COMPONENTS = new Set<string>([
  "button",
  "input",
  "textarea",
  "select",
  "iconButton",
  "searchField",
  "stepper",
]);

/**
 * Components that export a `size` axis in their Figma component set.
 *
 * Deliberately narrower than `SIZABLE_COMPONENTS`: these four had *no* variant
 * axis at all (5 state variants each), so a size axis is pure gain. Button is
 * held back on purpose — it already ships 40 variants (8 styles × 5 states), and
 * multiplying that by four sizes would put 160 variants in one set, which is
 * slow to generate and unpleasant to scroll. Button's chosen size still travels
 * in the bundle's options; it just isn't a variant dimension yet.
 */
export const SIZE_VARIANT_COMPONENTS = new Set<string>([
  "input",
  "textarea",
  "select",
  "searchField",
]);

/** The size-derived binding for a property, or null when size doesn't drive it. */
export function sizeBindingFor(propKey: string, size: string): string | null {
  const s = SIZE_MAP[size as SizeToken];
  if (!s) return null;
  if (propKey === "container.padX") return `space:${s.px}`;
  if (propKey === "container.padY") return `space:${s.py}`;
  if (propKey === "text.size" || propKey === "label.size") return `text:${s.text}`;
  return null;
}
