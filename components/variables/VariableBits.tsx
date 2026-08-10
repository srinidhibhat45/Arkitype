"use client";

/**
 * The small pieces every Variables surface draws: the tier ordinal, the type
 * icon, the swatch, and the chip that states a value.
 *
 * They live here rather than in each surface because a variable has to be
 * recognisable as *the same variable* in the rail, the table, the map and the
 * inspector — four places that would otherwise each invent their own badge.
 */
import {
  Blend,
  Bold,
  CaseSensitive,
  Layers,
  MoveHorizontal,
  Palette,
  Ruler,
  Spline,
  Squircle,
  Timer,
  Type,
} from "lucide-react";
import { PreviewMode } from "@/store/useDesignSystem";
import { TIER_META, VarKind, VarNode, VarTier, tierColor } from "@/lib/variableGraph";

/** The ordinal that travels with every tier — colour is never the only cue. */
export function TierBadge({ tier, size = 13 }: { tier: VarTier; size?: number }) {
  return (
    <span
      title={TIER_META[tier].label}
      className="flex shrink-0 items-center justify-center rounded-[3px] font-mono font-bold leading-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.62,
        background: tierColor(tier),
        color: "rgb(var(--c-ink-raised))",
      }}
    >
      {TIER_META[tier].step}
    </span>
  );
}

const KIND_ICON: Record<VarKind, typeof Palette> = {
  color: Palette,
  space: MoveHorizontal,
  radius: Squircle,
  size: Type,
  weight: Bold,
  font: CaseSensitive,
  shadow: Layers,
  duration: Timer,
  ease: Spline,
  dimension: Ruler,
};

export const KIND_LABEL: Record<VarKind, string> = {
  color: "Colour",
  space: "Spacing",
  radius: "Radius",
  size: "Type size",
  weight: "Font weight",
  font: "Font family",
  shadow: "Elevation",
  duration: "Duration",
  ease: "Easing",
  dimension: "Dimension",
};

/** What this variable *carries*, as a mark you can read before the label. */
export function KindIcon({
  kind,
  size = 11,
  className = "",
}: {
  kind: VarKind;
  size?: number;
  className?: string;
}) {
  const Icon = KIND_ICON[kind] ?? Blend;
  return (
    <Icon size={size} className={`shrink-0 text-fg-mute ${className}`} aria-hidden />
  );
}

/**
 * A colour chip. Checkerboarded underneath, so a token at 40% alpha looks
 * translucent rather than just pale.
 */
export function Swatch({ hex, size = 12 }: { hex?: string; size?: number }) {
  if (!hex) return null;
  return (
    <span
      className="shrink-0 rounded-[3px] border border-line"
      style={{
        width: size,
        height: size,
        backgroundImage:
          "linear-gradient(45deg,#8883 25%,transparent 25%,transparent 75%,#8883 75%),linear-gradient(45deg,#8883 25%,transparent 25%,transparent 75%,#8883 75%)",
        backgroundSize: "6px 6px",
        backgroundPosition: "0 0,3px 3px",
      }}
    >
      <span className="block h-full w-full rounded-[2px]" style={{ background: hex }} />
    </span>
  );
}

/**
 * The mark on a map row: a swatch for colours (the value *is* the picture), the
 * type icon for everything else.
 */
export function RowMark({ node, mode }: { node: VarNode; mode: PreviewMode }) {
  const hex = node.kind === "color" ? node.swatch?.[mode] : undefined;
  if (hex) return <Swatch hex={hex} />;
  // A colour that resolves to no colour — a border bound to `raw:transparent`,
  // a property whose source has gone — takes the type icon. A black chip would
  // be a confident statement of the one thing we don't know.
  return <KindIcon kind={node.kind} size={11} />;
}
