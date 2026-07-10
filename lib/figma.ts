import {
  ArkitypeState,
  RADII_NAMES,
  countTokens,
  shadowToCss,
} from "@/store/useDesignSystem";
import { hexToFigmaRgba, isValidHex, rampStepLabels } from "@/lib/color";
import { resolveToken } from "@/lib/tokens";
import { generateTypeScale, STEP_DEFS } from "@/lib/typography";
import {
  COMPONENT_SPECS,
  ComponentSpec,
  defBinding,
  optionValue,
  WIRED_COMPONENTS,
} from "@/lib/componentSchema";

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

export interface FigmaStyleBinding {
  type: "ALIAS" | "LITERAL";
  collection?: "Primitives" | "Semantics";
  path?: string;
  value?: string | number;
}

export interface FigmaComponentVariant {
  properties: Record<string, string>;
  styles: Record<string, FigmaStyleBinding>;
  options: Record<string, any>;
}

export interface FigmaComponent {
  id: string;
  name: string;
  tier: number;
  description: string;
  variants: FigmaComponentVariant[];
}

export interface FigmaBundle {
  meta: {
    generator: string;
    version: string;
    generatedAt: string;
    tokenCount: number;
  };
  collections: FigmaCollection[];
  components: FigmaComponent[];
}

const VALUE_MODE = "mode:value";
const LIGHT_MODE = "mode:light";
const DARK_MODE = "mode:dark";

function getVariantDimensions(spec: ComponentSpec): Record<string, string[]> {
  const dims: Record<string, string[]> = {};
  
  if (spec.states && spec.states.length > 0) {
    dims["state"] = spec.states.map(s => s.toString());
  } else {
    dims["state"] = ["default"];
  }
  
  const pAxis = spec.options?.find(o => o.previewAxis && o.type === "enum");
  if (pAxis && pAxis.options) {
    dims[pAxis.key] = pAxis.options.map(o => o.value);
  } else if (spec.id === "checkbox" || spec.id === "radio" || spec.id === "switch") {
    dims["checked"] = ["true", "false"];
  } else if (spec.id === "badge") {
    const toneOpt = spec.options?.find(o => o.key === "tone");
    const styleOpt = spec.options?.find(o => o.key === "style");
    if (toneOpt?.options) dims["tone"] = toneOpt.options.map(o => o.value);
    if (styleOpt?.options) dims["style"] = styleOpt.options.map(o => o.value);
  } else if (spec.id === "tag") {
    dims["removable"] = ["true", "false"];
  } else if (spec.id === "avatar") {
    const sizeOpt = spec.options?.find(o => o.key === "size");
    const presenceOpt = spec.options?.find(o => o.key === "presence");
    if (sizeOpt?.options) dims["size"] = sizeOpt.options.map(o => o.value);
    if (presenceOpt?.options) dims["presence"] = presenceOpt.options.map(o => o.value);
  } else if (spec.id === "alert" || spec.id === "toast") {
    const toneOpt = spec.options?.find(o => o.key === "tone");
    if (toneOpt?.options) dims["tone"] = toneOpt.options.map(o => o.value);
  } else if (spec.id === "card") {
    const elevOpt = spec.options?.find(o => o.key === "elevation");
    if (elevOpt?.options) dims["elevation"] = elevOpt.options.map(o => o.value);
  }
  
  return dims;
}

function cartesianProduct(dimensions: Record<string, string[]>): Record<string, string>[] {
  const keys = Object.keys(dimensions);
  if (keys.length === 0) return [{}];
  
  let results: Record<string, string>[] = [{}];
  for (const key of keys) {
    const values = dimensions[key];
    const nextResults: Record<string, string>[] = [];
    for (const res of results) {
      for (const val of values) {
        nextResults.push({ ...res, [key]: val });
      }
    }
    results = nextResults;
  }
  return results;
}

function getBindingForVariant(
  state: ArkitypeState,
  componentId: string,
  propKey: string,
  combo: Record<string, string>,
  isStateful?: boolean
): string | null {
  const bindings = state.components[componentId]?.bindings;
  if (!bindings) return null;
  
  const componentState = combo["state"];
  const variantKeys = Object.keys(combo).filter(k => k !== "state");
  
  if (variantKeys.length > 0) {
    for (const vKey of variantKeys) {
      const vVal = combo[vKey];
      if (isStateful && componentState) {
        const keyWithState = `${vVal}.${propKey}@${componentState}`;
        if (bindings[keyWithState] !== undefined) return bindings[keyWithState];
      } else {
        const keyWithoutState = `${vVal}.${propKey}`;
        if (bindings[keyWithoutState] !== undefined) return bindings[keyWithoutState];
      }
    }
  }
  
  if (isStateful && componentState) {
    const keyWithState = `${propKey}@${componentState}`;
    if (bindings[keyWithState] !== undefined) return bindings[keyWithState];
  } else {
    if (bindings[propKey] !== undefined) return bindings[propKey];
  }
  
  return null;
}

function resolveBindingToFigma(bindingString: string, radiusNames: readonly string[]): FigmaStyleBinding | null {
  if (!bindingString) return null;
  const cut = bindingString.indexOf(":");
  if (cut === -1) {
    return { type: "LITERAL", value: bindingString };
  }
  const kind = bindingString.slice(0, cut);
  const value = bindingString.slice(cut + 1);
  
  switch (kind) {
    case "role":
      return {
        type: "ALIAS",
        collection: "Semantics",
        path: value.replace(/-/g, "/"),
      };
    case "prim":
      const separatorIndex = value.lastIndexOf("-");
      if (separatorIndex === -1) {
        return {
          type: "ALIAS",
          collection: "Primitives",
          path: `color/${value}`,
        };
      }
      const famId = value.slice(0, separatorIndex);
      const step = value.slice(separatorIndex + 1);
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `color/${famId}/${step}`,
      };
    case "space":
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `space/${value}`,
      };
    case "radius": {
      const names = radiusNames ?? RADII_NAMES;
      const i = Math.min(Math.max(Number(value) || 0, 0), names.length - 1);
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `radius/${names[i]}`,
      };
    }
    case "text":
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `type/size/${value}`,
      };
    case "leading":
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `type/leading/${value}`,
      };
    case "weight":
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `font/weight/${value}`,
      };
    case "font":
      return {
        type: "ALIAS",
        collection: "Primitives",
        path: `font/${value}`,
      };
    case "px": {
      const num = Number(value);
      return {
        type: "LITERAL",
        value: isNaN(num) ? value : num,
      };
    }
    case "hex":
      return {
        type: "LITERAL",
        value,
      };
    case "raw":
    default:
      const numVal = Number(value);
      return {
        type: "LITERAL",
        value: isNaN(numVal) ? value : numVal,
      };
  }
}

export function compileFigmaBundle(state: ArkitypeState): FigmaBundle {
  const { primitives, semantics } = state;
  const radiusNames = primitives.radiusNames ?? RADII_NAMES;

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
      name: `radius/${radiusNames[i]}`,
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
  }, t.stepDefs ?? STEP_DEFS);
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

  const componentsList = Array.from(WIRED_COMPONENTS).map((cid) => {
    const spec = COMPONENT_SPECS[cid];
    if (!spec) return null;
    
    const dims = getVariantDimensions(spec);
    const combos = cartesianProduct(dims);
    
    const variants: FigmaComponentVariant[] = combos.map((combo) => {
      const styles: Record<string, FigmaStyleBinding> = {};
      const options: Record<string, any> = {};
      
      // Resolve styles for all part properties
      for (const part of spec.parts) {
        for (const prop of part.props) {
          const override = getBindingForVariant(state, cid, prop.key, combo, prop.stateful);
          const bindingString = override !== null ? override : defBinding(prop, combo["state"] as any);
          const resolved = resolveBindingToFigma(bindingString, radiusNames);
          if (resolved) {
            styles[prop.key] = resolved;
          }
        }
      }
      
      // Resolve options
      for (const opt of spec.options ?? []) {
        if (combo[opt.key] !== undefined) {
          options[opt.key] = combo[opt.key];
        } else {
          const stored = state.components[cid]?.properties;
          options[opt.key] = optionValue(stored, opt);
        }
      }
      
      return {
        properties: combo,
        styles,
        options,
      };
    });
    
    return {
      id: spec.id,
      name: spec.id.charAt(0).toUpperCase() + spec.id.slice(1),
      tier: spec.tier,
      description: `Arkitype Component Studio - ${spec.id.charAt(0).toUpperCase() + spec.id.slice(1)} component.`,
      variants,
    };
  }).filter((c) => c !== null) as FigmaComponent[];

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
    components: componentsList,
  };
}
