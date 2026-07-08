/**
 * Arkitype Binding Grammar.
 *
 * A *binding* is a typed string that says where a component's visual attribute
 * gets its value from. It resolves to a CSS value string, so the whole
 * --ark-* cascade (and automatic per-mode theming inside a ThemeFrame) keeps
 * working — a bound attribute is still just a `var()` most of the time.
 *
 *   role:<token>          → var(--ark-<token>)          a semantic role (recommended)
 *   prim:<family>-<label> → var(--ark-<family>-<label>) a raw primitive swatch
 *   hex:#rrggbb           → the literal hex             a one-off custom colour
 *   space:<n>             → var(--ark-space-<n>)        a spacing step (1-indexed)
 *   radius:<i>            → var(--ark-radius-<name>)    a radius step (0-indexed)
 *   text:<name>           → var(--ark-text-<name>)      a type size step
 *   leading:<name>        → var(--ark-leading-<name>)   a line-height step
 *   weight:<name>         → var(--ark-font-weight-<n>)  a weight token
 *   font:<role>           → var(--ark-font-<role>)      display/heading/body/mono
 *   px:<n>                → "<n>px"                      a raw dimension
 *   raw:<value>           → "<value>"                   a literal passthrough
 *
 * The store only ever holds *overrides* — a binding the user set by hand. When
 * nothing is stored a component renders from its own hardcoded fallback, so the
 * default output is pixel-identical to before this system existed.
 */
import {
  ArkitypeState,
  PreviewMode,
  RADII_NAMES,
} from "@/store/useDesignSystem";
import { resolveRef, resolveToken } from "@/lib/tokens";
import { isValidHex } from "@/lib/color";

export type BindingKind =
  | "role"
  | "prim"
  | "hex"
  | "space"
  | "radius"
  | "text"
  | "leading"
  | "weight"
  | "font"
  | "px"
  | "raw";

export interface ParsedBinding {
  kind: BindingKind | "unknown";
  value: string;
}

export function parseBinding(binding: string): ParsedBinding {
  const cut = binding.indexOf(":");
  if (cut === -1) return { kind: "raw", value: binding };
  const kind = binding.slice(0, cut) as BindingKind;
  return { kind, value: binding.slice(cut + 1) };
}

/** Resolve a binding string to a CSS value (a var() reference or a literal). */
export function resolveBinding(binding: string, radiusNames?: string[]): string {
  if (!binding) return "transparent";
  const { kind, value } = parseBinding(binding);
  switch (kind) {
    case "role":
    case "prim":
      return `var(--ark-${value})`;
    case "hex":
      return value;
    case "space":
      return `var(--ark-space-${value})`;
    case "radius": {
      const names = radiusNames ?? RADII_NAMES;
      const i = Math.min(Math.max(Number(value) || 0, 0), names.length - 1);
      return `var(--ark-radius-${names[i]})`;
    }
    case "text":
      return `var(--ark-text-${value})`;
    case "leading":
      return `var(--ark-leading-${value})`;
    case "weight":
      return `var(--ark-font-weight-${value})`;
    case "font":
      return `var(--ark-font-${value})`;
    case "px":
      return `${value}px`;
    case "raw":
    default:
      return value;
  }
}

/**
 * Resolve a *colour* binding to a concrete hex for swatch previews in the
 * inspector (the cascade isn't available there). Non-colour bindings return "".
 */
export function bindingSwatch(
  state: Pick<ArkitypeState, "primitives" | "semantics">,
  mode: PreviewMode,
  binding: string
): string {
  const { kind, value } = parseBinding(binding);
  switch (kind) {
    case "role":
      return resolveToken(state, mode, value);
    case "prim":
      return resolveRef(state.primitives, value);
    case "hex":
      return isValidHex(value) ? value : "#000000";
    default:
      return "";
  }
}

/** Where a binding's value is defined, so the inspector can link back to it. */
export type BindingSource =
  | { step: "roles"; anchor: string }
  | { step: "colour"; anchor: string }
  | null;

export function bindingSource(binding: string): BindingSource {
  const { kind, value } = parseBinding(binding);
  if (kind === "role") return { step: "roles", anchor: value };
  if (kind === "prim") {
    const cut = value.lastIndexOf("-");
    return { step: "colour", anchor: cut === -1 ? value : value.slice(0, cut) };
  }
  return null; // hex/space/radius/text/leading/weight/font/px/raw have no defining step
}

/** A short human label for a binding, for the "currently bound to…" chip. */
export function describeBinding(binding: string, radiusNames?: string[]): { kind: string; label: string } {
  const { kind, value } = parseBinding(binding);
  switch (kind) {
    case "role":
      return { kind: "role", label: value };
    case "prim":
      return { kind: "primitive", label: value };
    case "hex":
      return { kind: "custom", label: value.toUpperCase() };
    case "space":
      return { kind: "space", label: `space-${value}` };
    case "radius": {
      const names = radiusNames ?? RADII_NAMES;
      return { kind: "radius", label: `radius-${names[Number(value)] ?? value}` };
    }
    case "text":
      return { kind: "size", label: `text-${value}` };
    case "leading":
      return { kind: "leading", label: `leading-${value}` };
    case "weight":
      return { kind: "weight", label: value };
    case "font":
      return { kind: "font", label: value };
    case "px":
      return { kind: "size", label: `${value}px` };
    default:
      return { kind: "raw", label: value };
  }
}
