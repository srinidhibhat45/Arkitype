/**
 * Arkitype → Figma Variables Schema Compiler.
 * Flattens the Zustand system tree into the structural format consumed by the
 * Figma Plugin API (figma.variables.createVariableCollection /
 * figma.variables.createVariable): named collections with explicit modes,
 * slash-namespaced variable paths, resolvedType, and valuesByMode keyed by
 * modeId — semantic tokens carry VARIABLE_ALIAS bindings to primitives plus
 * pre-resolved hex values for plugin-side fallbacks.
 */
import {
  ArkitypeState,
  RADII_NAMES,
  countTokens,
  shadowToCss,
} from "@/store/useDesignSystem";
import { hexToFigmaRgba, isValidHex, rampStepLabels } from "@/lib/color";
import { resolveToken } from "@/lib/tokens";
import { generateTypeScale } from "@/lib/typography";

export interface FigmaRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface FigmaAlias {
  type: "VARIABLE_ALIAS";
  id: string;
}

export type FigmaVariableValue = FigmaRgba | FigmaAlias | number | string;

export interface FigmaVariable {
  name: string;
  resolvedType: "COLOR" | "FLOAT" | "STRING";
  scopes: string[];
  valuesByMode: Record<string, FigmaVariableValue>;
  resolvedValuesByMode?: Record<string, string>;
}

export interface FigmaCollection {
  name: string;
  id: string;
  modes: Array<{ modeId: string; name: string }>;
  variables: FigmaVariable[];
}

export interface FigmaBundle {
  meta: {
    generator: string;
    version: string;
    generatedAt: string;
    tokenCount: number;
  };
  collections: FigmaCollection[];
}

const VALUE_MODE = "mode:value";
const LIGHT_MODE = "mode:light";
const DARK_MODE = "mode:dark";

export function compileFigmaBundle(state: ArkitypeState): FigmaBundle {
  const { primitives, semantics } = state;

  /* ── Collection 1: Primitives (single "Value" mode) ── */
  const primitiveVars: FigmaVariable[] = [];

  primitives.colorFamilies.forEach((fam) => {
    const labels = rampStepLabels(fam.steps);
    (primitives.colors[fam.id] ?? []).forEach((hex, i) => {
      primitiveVars.push({
        name: `color/${fam.id}/${labels[i]}`,
        resolvedType: "COLOR",
        scopes: ["ALL_SCOPES"],
        valuesByMode: { [VALUE_MODE]: hexToFigmaRgba(hex) },
        resolvedValuesByMode: { [VALUE_MODE]: hex },
      });
    });
  });

  primitives.spacing.forEach((px, i) => {
    primitiveVars.push({
      name: `space/${i + 1}`,
      resolvedType: "FLOAT",
      scopes: ["GAP", "WIDTH_HEIGHT"],
      valuesByMode: { [VALUE_MODE]: px },
    });
  });

  primitives.radii.forEach((px, i) => {
    primitiveVars.push({
      name: `radius/${RADII_NAMES[i]}`,
      resolvedType: "FLOAT",
      scopes: ["CORNER_RADIUS"],
      valuesByMode: { [VALUE_MODE]: px },
    });
  });

  const t = primitives.typography;
  const typeSteps = generateTypeScale(t.baseSize, t.scaleFactor, {
    rounding: t.rounding,
    sizeOverrides: t.sizeOverrides,
    leadingOverrides: t.leadingOverrides,
    stepAssign: t.stepAssign,
  });
  const weightValue = (name: string): number =>
    t.weights.find((w) => w.name === name)?.value ?? 400;
  typeSteps.forEach((s) => {
    primitiveVars.push({
      name: `type/size/${s.name}`,
      resolvedType: "FLOAT",
      scopes: ["FONT_SIZE"],
      valuesByMode: { [VALUE_MODE]: s.size },
    });
    primitiveVars.push({
      name: `type/leading/${s.name}`,
      resolvedType: "FLOAT",
      scopes: ["LINE_HEIGHT"],
      valuesByMode: { [VALUE_MODE]: s.lineHeight },
    });
    primitiveVars.push({
      name: `type/weight/${s.name}`,
      resolvedType: "FLOAT",
      scopes: ["FONT_WEIGHT"],
      valuesByMode: { [VALUE_MODE]: weightValue(s.weight) },
    });
  });

  t.weights.forEach((w) => {
    primitiveVars.push({
      name: `font/weight/${w.name}`,
      resolvedType: "FLOAT",
      scopes: ["FONT_WEIGHT"],
      valuesByMode: { [VALUE_MODE]: w.value },
    });
  });

  (["display", "heading", "body", "mono"] as const).forEach((role) => {
    primitiveVars.push({
      name: `font/${role}`,
      resolvedType: "STRING",
      scopes: ["FONT_FAMILY"],
      valuesByMode: { [VALUE_MODE]: t.fontRoles[role].family },
    });
  });

  // Elevation — per-mode shadow strings (light + dark).
  (["light", "dark"] as const).forEach((elevMode) => {
    primitives.elevation[elevMode].forEach((def) => {
      primitiveVars.push({
        name: `shadow/${elevMode}/${def.name}`,
        resolvedType: "STRING",
        scopes: ["EFFECT_COLOR"],
        valuesByMode: { [VALUE_MODE]: shadowToCss(def) },
      });
    });
  });

  Object.entries(primitives.motion.durations).forEach(([name, ms]) => {
    primitiveVars.push({
      name: `motion/duration/${name}`,
      resolvedType: "FLOAT",
      scopes: ["ALL_SCOPES"],
      valuesByMode: { [VALUE_MODE]: ms },
    });
  });
  primitives.motion.easings.forEach((e) => {
    primitiveVars.push({
      name: `motion/easing/${e.name}`,
      resolvedType: "STRING",
      scopes: ["ALL_SCOPES"],
      valuesByMode: { [VALUE_MODE]: e.value },
    });
  });

  Object.entries(primitives.layout.breakpoints).forEach(([name, px]) => {
    primitiveVars.push({
      name: `layout/breakpoint/${name}`,
      resolvedType: "FLOAT",
      scopes: ["WIDTH_HEIGHT"],
      valuesByMode: { [VALUE_MODE]: px },
    });
  });

  /* ── Collection 2: Semantics (Light + Dark modes) ── */
  // A value is either a "slot-step" ref (alias-bound to a primitive) or a raw
  // hex literal (bound directly to its resolved colour, no alias).
  const semanticVars: FigmaVariable[] = Object.keys(semantics.modes.light).map(
    (token) => {
      const lightRef = semantics.modes.light[token];
      const darkRef = semantics.modes.dark[token];
      const bind = (ref: string): FigmaVariableValue =>
        ref && ref.startsWith("#") && isValidHex(ref)
          ? hexToFigmaRgba(ref)
          : { type: "VARIABLE_ALIAS", id: `color/${ref.slice(0, ref.lastIndexOf("-"))}/${ref.slice(ref.lastIndexOf("-") + 1)}` };
      return {
        name: token.replace(/-/g, "/"),
        resolvedType: "COLOR",
        scopes: ["ALL_SCOPES"],
        valuesByMode: {
          [LIGHT_MODE]: bind(lightRef),
          [DARK_MODE]: bind(darkRef),
        },
        resolvedValuesByMode: {
          [LIGHT_MODE]: resolveToken(state, "light", token),
          [DARK_MODE]: resolveToken(state, "dark", token),
        },
      };
    }
  );

  return {
    meta: {
      generator: "Arkitype",
      version: "0.1.0-alpha",
      generatedAt: new Date().toISOString(),
      tokenCount: countTokens(state),
    },
    collections: [
      {
        name: "Arkitype / Primitives",
        id: "collection:primitives",
        modes: [{ modeId: VALUE_MODE, name: "Value" }],
        variables: primitiveVars,
      },
      {
        name: "Arkitype / Semantics",
        id: "collection:semantics",
        modes: [
          { modeId: LIGHT_MODE, name: "Light" },
          { modeId: DARK_MODE, name: "Dark" },
        ],
        variables: semanticVars,
      },
    ],
  };
}
