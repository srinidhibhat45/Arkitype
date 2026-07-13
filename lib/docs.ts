/**
 * Arkitype Handoff Docs Generator.
 * Compiles the live system state into engineer-facing Markdown: usage
 * instructions, accessibility audit, token dependency graph, and clean
 * implementation snippets (Figma plugin + CSS variables).
 */
import {
  ArkitypeState,
  RADII_NAMES,
  SEMANTIC_GROUPS,
  countTokens,
  shadowToCss,
} from "@/store/useDesignSystem";
import { wcagVerdict } from "@/lib/color";
import { resolveToken } from "@/lib/tokens";
import { generateTypeScale, scaleFactorLabel } from "@/lib/typography";
import { componentOptions, optionValue } from "@/lib/componentSchema";
import { collectUsedIcons, iconSectionMarkdown } from "@/lib/icons";

const A11Y_PAIRS: Array<[bg: string, fg: string, context: string]> = [
  ["surface-base", "text-primary", "Body copy on app background"],
  ["surface-base", "text-secondary", "Secondary copy on app background"],
  ["surface-base", "text-muted", "Muted metadata on app background"],
  ["surface-elevated", "text-primary", "Body copy on cards / panels"],
  ["action-primary-default", "text-on-action", "Primary button label"],
  ["action-primary-hover", "text-on-action", "Primary button label (hover)"],
];

function badge(pass: boolean): string {
  return pass ? "PASS" : "FAIL";
}

export function generateHandoffDocs(state: ArkitypeState): string {
  const { primitives, semantics } = state;
  const typeSteps = generateTypeScale(
    primitives.typography.baseSize,
    primitives.typography.scaleFactor
  );

  const lines: string[] = [];
  const push = (s = ""): number => lines.push(s);

  push("# Arkitype Design System — Engineering Handoff");
  push();
  push(`> Generated ${new Date().toISOString()} · ${countTokens(state)} active tokens`);
  push();
  push("## 1. Consumption Model");
  push();
  push("Two variable collections ship in the JSON bundle:");
  push();
  push("- **Arkitype / Primitives** — raw values (color ramps, spacing, radii, type, shadows). One `Value` mode.");
  push("- **Arkitype / Semantics** — role tokens aliased to primitives. Two modes: `Light` and `Dark`. UI code must only reference semantic tokens; primitives are an implementation detail.");
  push();
  push("Import the bundle with the companion Figma plugin, or map it to CSS custom properties (snippet in §6).");
  push();

  push("## 2. Color Primitives");
  push();
  push("| Ramp | Seed | 50 | 500 | 900 |");
  push("| --- | --- | --- | --- | --- |");
  primitives.colorFamilies.forEach((fam) => {
    const ramp = primitives.colors[fam.id] ?? [];
    const mid = Math.floor(ramp.length / 2);
    const last = ramp.length - 1;
    push(
      `| \`${fam.id}\` | \`${fam.seed}\` | \`${ramp[0] ?? ""}\` | \`${ramp[mid] ?? ""}\` | \`${ramp[last] ?? ""}\` |`
    );
  });
  push();
  push(
    "Ramps are luminance-anchored: each step (50–900) targets a fixed WCAG relative-luminance value, so cross-hue steps are perceptually aligned (e.g. `brand-600` and `error-600` have equivalent visual weight)."
  );
  push();

  push("## 3. Scales");
  push();
  push(
    `- **Spacing** (base ${primitives.spacingBase}px): ${primitives.spacing
      .map((s, i) => `\`space-${i + 1}=${s}px\``)
      .join(" · ")}`
  );
  const overviewRadiusNames = primitives.radiusNames ?? RADII_NAMES;
  push(
    `- **Radii**: ${primitives.radii
      .map((r, i) => `\`radius-${overviewRadiusNames[i]}=${r}px\``)
      .join(" · ")}`
  );
  push(
    `- **Type scale** (base ${primitives.typography.baseSize}px, ${scaleFactorLabel(
      primitives.typography.scaleFactor
    )}): ${typeSteps.map((t) => `\`${t.name}=${t.size}px/${t.lineHeight}\``).join(" · ")}`
  );
  push(
    `- **Elevation** (per mode): ${primitives.elevation.light
      .map((s) => `\`shadow-${s.name}\``)
      .join(" · ")} — light: ${primitives.elevation.light
      .map((s) => `\`${shadowToCss(s)}\``)
      .join(", ")}; dark: ${primitives.elevation.dark
      .map((s) => `\`${shadowToCss(s)}\``)
      .join(", ")}`
  );
  push(
    `- **Motion**: ${Object.entries(primitives.motion.durations)
      .map(([n, ms]) => `\`duration-${n}=${ms}ms\``)
      .join(" · ")} · easings: ${primitives.motion.easings
      .map((e) => `\`${e.name}\``)
      .join(", ")}`
  );
  push(
    `- **Breakpoints**: ${Object.entries(primitives.layout.breakpoints)
      .map(([n, px]) => `\`${n}=${px}px\``)
      .join(" · ")}`
  );
  push();
  push("### Naming convention (token tiers)");
  push();
  push(
    "Tokens follow the three-tier model: **primitive** (`color/brand/600`, raw values) → **semantic** (`action/primary/default`, meaning per mode) → **component** (a component's size/radius properties reference the scales). UI code should consume the highest tier available; primitives are an implementation detail."
  );
  push();

  push("## 4. Accessibility Audit (WCAG 2.1)");
  push();
  push("| Context | Pair | Light | Dark | AA (4.5:1) | AAA (7:1) |");
  push("| --- | --- | --- | --- | --- | --- |");
  A11Y_PAIRS.forEach(([bg, fg, context]) => {
    const light = wcagVerdict(
      resolveToken(state, "light", bg),
      resolveToken(state, "light", fg)
    );
    const dark = wcagVerdict(
      resolveToken(state, "dark", bg),
      resolveToken(state, "dark", fg)
    );
    const aa = light.aa && dark.aa;
    const aaa = light.aaa && dark.aaa;
    push(
      `| ${context} | \`${fg}\` on \`${bg}\` | ${light.ratio}:1 | ${dark.ratio}:1 | ${badge(
        aa
      )} | ${badge(aaa)} |`
    );
  });
  push();

  push("## 5. Token Dependency Graph");
  push();
  SEMANTIC_GROUPS.forEach((group) => {
    push(`### ${group.label}`);
    push();
    group.tokens.forEach((token) => {
      const lightRef = semantics.modes.light[token];
      const darkRef = semantics.modes.dark[token];
      push(
        `- \`${token}\` → light: \`${lightRef}\` (${resolveToken(
          state,
          "light",
          token
        )}) · dark: \`${darkRef}\` (${resolveToken(state, "dark", token)})`
      );
    });
    push();
  });

  push("## 6. Component Inventory");
  push();
  push(
    `${Object.keys(state.components).length} components ship with the system, every one consuming roles and scales only — no raw values. Structural patterns record their active skeleton:`
  );
  push();
  const skeletal = ["modal", "tabs", "table"];
  push(
    Object.keys(state.components)
      .map((id) =>
        skeletal.includes(id)
          ? `\`${id}\` (skeleton ${state.components[id].skeletonId})`
          : `\`${id}\``
      )
      .join(" · ")
  );
  push();

  // Configured components: functional options (persist with the system) plus any
  // colour/scale overrides layered on the role/scale defaults.
  const configured = Object.keys(state.components).filter((id) => {
    const cfg = state.components[id];
    const overrides = cfg.bindings ? Object.keys(cfg.bindings).length : 0;
    return componentOptions(id).length > 0 || overrides > 0;
  });
  if (configured.length) {
    push("### Configured components");
    push();
    push(
      "Options are part of the generated system (they define the component's default variant, icon, style, elevation…); colour and scale overrides are applied on top of the role/scale defaults."
    );
    push();
    configured.forEach((id) => {
      const cfg = state.components[id];
      const details: string[] = [];
      for (const o of componentOptions(id)) {
        const v = optionValue(cfg.properties, o);
        details.push(o.type === "boolean" ? `${o.label}: ${v ? "on" : "off"}` : `${o.label}: ${v}`);
      }
      const overrides = cfg.bindings ? Object.keys(cfg.bindings).length : 0;
      if (overrides > 0) details.push(`${overrides} colour/scale override${overrides === 1 ? "" : "s"}`);
      push(`- \`${id}\` — ${details.join(" · ")}`);
    });
    push();
  }

  // Icon library — Material Symbols setup + the inventory this system uses.
  iconSectionMarkdown(collectUsedIcons(state), "## 7. Icons").forEach((l) => push(l));

  push("## 8. Implementation Snippets");
  push();
  push("### Figma Plugin (variables import)");
  push();
  push("```ts");
  push("async function importBundle(bundle: FigmaBundle) {");
  push("  for (const col of bundle.collections) {");
  push("    const collection = figma.variables.createVariableCollection(col.name);");
  push("    const modeIds = new Map<string, string>();");
  push("    col.modes.forEach((mode, i) => {");
  push("      const id = i === 0");
  push("        ? collection.modes[0].modeId");
  push("        : collection.addMode(mode.name);");
  push("      if (i === 0) collection.renameMode(id, mode.name);");
  push("      modeIds.set(mode.modeId, id);");
  push("    });");
  push("    for (const v of col.variables) {");
  push("      const variable = figma.variables.createVariable(");
  push("        v.name, collection, v.resolvedType");
  push("      );");
  push("      for (const [modeKey, value] of Object.entries(v.valuesByMode)) {");
  push("        variable.setValueForMode(modeIds.get(modeKey)!, value);");
  push("      }");
  push("    }");
  push("  }");
  push("}");
  push("```");
  push();
  push("### CSS Custom Properties (light mode)");
  push();
  push("```css");
  push(":root {");
  Object.keys(semantics.modes.light).forEach((token) => {
    push(`  --ark-${token}: ${resolveToken(state, "light", token)};`);
  });
  primitives.spacing.forEach((px, i) => push(`  --ark-space-${i + 1}: ${px}px;`));
  const cssRadiusNames = primitives.radiusNames ?? RADII_NAMES;
  primitives.radii.forEach((px, i) =>
    push(`  --ark-radius-${cssRadiusNames[i]}: ${px}px;`)
  );
  push("}");
  push("```");
  push();
  push("### Dark mode override");
  push();
  push("```css");
  push('[data-theme="dark"] {');
  Object.keys(semantics.modes.dark).forEach((token) => {
    push(`  --ark-${token}: ${resolveToken(state, "dark", token)};`);
  });
  push("}");
  push("```");
  push();
  push("---");
  push();
  push(
    "Component skeleton selections (modal/tabs/table structural variants) are recorded in the bundle's source state and rendered live in the Arkitype Component Factory. Consult the Factory view for interaction-state specs (Default / Hover / Focus / Active / Loading / Disabled)."
  );
  push();

  return lines.join("\n");
}
