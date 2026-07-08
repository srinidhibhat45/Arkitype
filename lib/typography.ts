/**
 * Arkitype Typography Engine — modular scale generation.
 * Sizes grow geometrically from the base; line-height tightens as size grows.
 * A generated value is the *default*; a per-step override always wins, and a
 * rounding mode keeps computed sizes free of awkward decimals.
 */

export interface ScaleFactorOption {
  label: string;
  value: number;
}

export const SCALE_FACTORS: ScaleFactorOption[] = [
  { label: "Minor Third — 1.200", value: 1.2 },
  { label: "Major Third — 1.250", value: 1.25 },
  { label: "Perfect Fourth — 1.333", value: 1.333 },
  { label: "Golden Ratio — 1.618", value: 1.618 },
];

export type RoundingMode = "none" | "integer" | "half";

export type FontRoleId = "display" | "heading" | "body" | "mono";

export interface TypeStep {
  name: string;
  assignment: string;
  exp: number;
  size: number; // px — override ?? rounded(generated)
  lineHeight: number; // unitless — override ?? generated
  generatedSize: number; // rounded generated value (before override)
  overridden: boolean; // true when size is pinned by an override
  role: string; // which font-role family this step uses (widened to string)
  weight: string; // weight-token name
}

export const STEP_DEFS: ReadonlyArray<{
  name: string;
  assignment: string;
  exp: number;
  role: string;
  weight: string;
}> = [
  { name: "xs", assignment: "Caption / Meta", exp: -2, role: "body", weight: "regular" },
  { name: "sm", assignment: "Labels / Secondary", exp: -1, role: "body", weight: "medium" },
  { name: "base", assignment: "Body Copy", exp: 0, role: "body", weight: "regular" },
  { name: "lg", assignment: "Lead Paragraph", exp: 1, role: "body", weight: "regular" },
  { name: "xl", assignment: "H4 Heading", exp: 2, role: "heading", weight: "semibold" },
  { name: "2xl", assignment: "H3 Heading", exp: 3, role: "heading", weight: "semibold" },
  { name: "3xl", assignment: "H2 Heading", exp: 4, role: "heading", weight: "bold" },
  { name: "4xl", assignment: "H1 Display", exp: 5, role: "display", weight: "bold" },
];

const round2 = (v: number): number => Math.round(v * 100) / 100;

function applyRounding(v: number, mode: RoundingMode): number {
  if (mode === "integer") return Math.round(v);
  if (mode === "half") return Math.round(v * 2) / 2;
  return round2(v);
}

export interface TypeScaleOptions {
  rounding?: RoundingMode;
  sizeOverrides?: Record<string, number>;
  leadingOverrides?: Record<string, number>;
  stepAssign?: Record<string, { role: string; weight: string }>;
}

export function generateTypeScale(
  baseSize: number,
  factor: number,
  opts: TypeScaleOptions = {},
  stepDefs: ReadonlyArray<{ name: string; assignment: string; exp: number; role: string; weight: string }> = STEP_DEFS
): TypeStep[] {
  const { rounding = "integer", sizeOverrides = {}, leadingOverrides = {}, stepAssign = {} } = opts;
  return stepDefs.map((d) => {
    const generatedSize = applyRounding(baseSize * Math.pow(factor, d.exp), rounding);
    const override = sizeOverrides[d.name];
    const size = typeof override === "number" ? override : generatedSize;
    // Line height constraint: bodies breathe (~1.55), display tightens (→1.1).
    const genLeading = round2(Math.min(1.7, Math.max(1.1, 1.15 + (baseSize / size) * 0.4)));
    const leadOverride = leadingOverrides[d.name];
    const lineHeight = typeof leadOverride === "number" ? leadOverride : genLeading;
    const assign = stepAssign[d.name];
    return {
      name: d.name,
      assignment: d.assignment,
      exp: d.exp,
      size,
      lineHeight,
      generatedSize,
      overridden: typeof override === "number",
      role: assign?.role ?? d.role,
      weight: assign?.weight ?? d.weight,
    };
  });
}

export function scaleFactorLabel(value: number): string {
  const hit = SCALE_FACTORS.find((f) => Math.abs(f.value - value) < 0.0001);
  return hit ? hit.label : `Custom — ${value}`;
}
