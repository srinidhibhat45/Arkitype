/**
 * Arkitype Agent Contract Generator.
 *
 * Compiles the live system state into one self-contained Markdown file meant
 * to be attached as project context to an AI coding tool — Claude Projects,
 * Cursor, Antigravity, Windsurf, or similar — so code it generates draws from
 * this system's actual tokens and components instead of improvising its own.
 *
 * Different job from generateHandoffDocs (lib/docs.ts): that file is written
 * for an engineer doing a manual review (audit tables, a dependency graph, a
 * Figma plugin snippet). This one is written to be *followed*: an imperative
 * rules section up top, every value already resolved so nothing has to be
 * looked up, and a component contract detailed enough to implement from
 * cold. Both compile from the same token pipeline, so neither can drift from
 * what the other says the system is.
 */
import {
  ArkitypeState,
  RADII_NAMES,
  SEMANTIC_GROUPS,
  countTokens,
  elevationOf,
  modeBase,
  modeDefsOf,
  shadowToCss,
} from "@/store/useDesignSystem";
import { A11Y_PAIRS } from "@/lib/docs";
import { wcagVerdict, rampStepLabels } from "@/lib/color";
import { resolveToken } from "@/lib/tokens";
import { generateTypeScale, scaleFactorLabel, STEP_DEFS } from "@/lib/typography";
import { componentOptions, COMPONENT_SPECS, WIRED_COMPONENTS } from "@/lib/componentSchema";
import { COMPONENT_DOCS } from "@/lib/componentDocs";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import { activeTemplateId, getTemplate, templateProfile } from "@/lib/componentTemplates";
import {
  buildGoogleFontUrl,
  customFontRoles,
  isGoogleFont,
  primaryFamilyName,
} from "@/lib/googleFonts";
import { compileCssVariables } from "@/lib/adapters";
import { collectUsedIcons, iconSectionMarkdown } from "@/lib/icons";
import { SITE_NAME, SITE_URL } from "@/lib/site";

function weightValueOf(weights: ArkitypeState["primitives"]["typography"]["weights"], name: string): number {
  return weights.find((w) => w.name === name)?.value ?? 400;
}

export function compileAgentGuide(state: ArkitypeState): string {
  const { primitives, semantics } = state;
  const modes = modeDefsOf(semantics);
  const fontRoles = primitives.typography.fontRoles;
  const steps = generateTypeScale(
    primitives.typography.baseSize,
    primitives.typography.scaleFactor,
    {
      rounding: primitives.typography.rounding,
      sizeOverrides: primitives.typography.sizeOverrides,
      leadingOverrides: primitives.typography.leadingOverrides,
      stepAssign: primitives.typography.stepAssign,
    },
    primitives.typography.stepDefs ?? STEP_DEFS
  );

  const lines: string[] = [];
  const push = (s = ""): number => lines.push(s);

  /* ── Header ── */
  push(`# ${state.meta.name} — AI Agent Design System Contract`);
  push();
  push(
    `> Generated ${new Date().toISOString()} by ${SITE_NAME} (${SITE_URL}) · ${countTokens(
      state
    )} tokens · ${Object.keys(state.components).length} components`
  );
  push(">");
  push(
    "> Attach this file as project context in Claude Projects, Cursor (`.cursor/rules` or an " +
      "`@`-mention), Antigravity, Windsurf, or any other AI coding assistant before asking it to " +
      "build or touch UI. It is self-contained: every value below is already resolved to " +
      "something that can be pasted straight into code — nothing here needs to be looked up " +
      "anywhere else."
  );
  push();

  /* ── Rules ── */
  push("## Rules for whatever builds from this file");
  push();
  push("1. Never hardcode a colour. Use the semantic tokens in §2 — a raw hex in generated code is a bug, not a shortcut.");
  push("2. Never invent a spacing value. Use only the scale in §3 — no arbitrary `mt-[13px]`, no `padding: 11px`.");
  push("3. Never invent a font size, weight, or line-height. Use only the type scale in §1.");
  push("4. Never invent a border radius or a shadow. Use only the scales in §3.");
  push("5. Load the fonts in §1 exactly as shown before using them. Don't substitute a system font \"for simplicity\" — that silently breaks the one thing this file exists to keep consistent.");
  push("6. When a component in §5 already exists, use its contract (variants, states, tokens) instead of building a one-off that duplicates it.");
  push("7. Keep every text/background pairing at or above what §4 requires. If a pairing isn't listed there, check it against the same 4.5:1 (body) / 3:1 (large text, non-text) bar before shipping it.");
  push("8. Prefer the semantic layer (§2) over the primitive ramps — primitives are the implementation detail semantics are built from, not a second way to pick a colour.");
  push("9. If asked for something this file doesn't cover — a new component, a new token — extend the pattern already established here rather than improvising a different one.");
  push();

  /* ── §0 Identity ── */
  push("## 0. System identity");
  push();
  push(`- **Name**: ${state.meta.name}`);
  push(
    `- **Modes**: ${modes.map((m) => `${m.name} (reads as ${modeBase(semantics, m.id, primitives)})`).join(" · ")}`
  );
  push(`- **Tokens**: ${countTokens(state)} active · **Components**: ${Object.keys(state.components).length} configured, ${WIRED_COMPONENTS.size} available`);
  push();

  /* ── §1 Fonts & type ── */
  push("## 1. Fonts & type scale");
  push();
  push(
    Object.entries(fontRoles)
      .map(([role, r]) => {
        const name = primaryFamilyName(r.family);
        return `\`${role}\` = **${name}**${isGoogleFont(r.family) ? " (Google Fonts)" : ""}`;
      })
      .join(" · ")
  );
  push();
  const loadUrl = buildGoogleFontUrl(Object.values(fontRoles).map((r) => r.family));
  if (loadUrl) {
    push("Load before rendering anything that uses them:");
    push();
    push("```html");
    push(`<link rel="preconnect" href="https://fonts.googleapis.com">`);
    push(`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`);
    push(`<link rel="stylesheet" href="${loadUrl}">`);
    push("```");
    push();
  }
  const selfHost = customFontRoles(fontRoles);
  if (selfHost.length) {
    const list = selfHost.map((r) => `\`${r.role}\` (**${r.name}**)`).join(", ");
    push(
      `${list} ${selfHost.length === 1 ? "isn't" : "aren't"} on Google Fonts — the link above ` +
        `doesn't cover ${selfHost.length === 1 ? "it" : "them"}. Self-host with an \`@font-face\` ` +
        `rule (§7's CSS block scaffolds one per family) or ${selfHost.length === 1 ? "it" : "they"} ` +
        `will only render on a machine that already has ${selfHost.length === 1 ? "it" : "them"} installed.`
    );
    push();
  }
  push(`Base **${primitives.typography.baseSize}px**, ratio **${scaleFactorLabel(primitives.typography.scaleFactor)}**, rounding \`${primitives.typography.rounding}\`.`);
  push();
  push("| Step | Size | Line-height | Weight | Font role | Used for |");
  push("| --- | --- | --- | --- | --- | --- |");
  steps.forEach((s) => {
    push(
      `| \`${s.name}\` | ${s.size}px | ${s.lineHeight} | ${s.weight} (${weightValueOf(primitives.typography.weights, s.weight)}) | \`${s.role}\` | ${s.assignment} |`
    );
  });
  push();

  /* ── §2 Colour ── */
  push("## 2. Colour");
  push();
  push("### Semantic tokens — reach for these first");
  push();
  push(`| Token | ${modes.map((m) => m.name).join(" | ")} |`);
  push(`| --- | ${modes.map(() => "---").join(" | ")} |`);
  SEMANTIC_GROUPS.forEach((group) => {
    push(`| **${group.label}** | ${modes.map(() => "").join(" | ")} |`);
    group.tokens.forEach((token) => {
      push(`| \`${token}\` | ${modes.map((m) => `\`${resolveToken(state, m.id, token)}\``).join(" | ")} |`);
    });
  });
  push();
  push("### Primitive ramps — the implementation detail semantics are built from");
  push();
  push("| Family | Seed | Ramp |");
  push("| --- | --- | --- |");
  primitives.colorFamilies.forEach((fam) => {
    const ramp = primitives.colors[fam.id] ?? [];
    const labels = rampStepLabels(fam.steps);
    push(
      `| \`${fam.id}\` | \`${fam.seed}\` | ${labels.map((l, i) => `${l} \`${ramp[i] ?? ""}\``).join(" · ")} |`
    );
  });
  push();
  push(
    "Ramps are luminance-anchored: each step targets a fixed WCAG relative-luminance value, so " +
      "the same step number across different hues carries equivalent visual weight."
  );
  push();

  /* ── §3 Scales ── */
  push("## 3. Spacing, radius, elevation, motion");
  push();
  push(
    `- **Spacing** (base ${primitives.spacingBase}px): ${primitives.spacing
      .map((s, i) => `\`space-${i + 1}\`=${s}px`)
      .join(" · ")}`
  );
  const radiusNames = primitives.radiusNames ?? RADII_NAMES;
  push(
    `- **Radius**: ${primitives.radii
      .map((r, i) => `\`radius-${radiusNames[i]}\`=${r >= 9999 ? "full" : `${r}px`}`)
      .join(" · ")}`
  );
  push(
    `- **Elevation** (light): ${elevationOf(primitives, semantics, "light")
      .map((s) => `\`shadow-${s.name}\`=\`${shadowToCss(s)}\``)
      .join(" · ")}`
  );
  push(
    `- **Elevation** (dark): ${elevationOf(primitives, semantics, "dark")
      .map((s) => `\`shadow-${s.name}\`=\`${shadowToCss(s)}\``)
      .join(" · ")}`
  );
  push(
    `- **Motion durations**: ${Object.entries(primitives.motion.durations)
      .map(([n, ms]) => `\`duration-${n}\`=${ms}ms`)
      .join(" · ")}`
  );
  push(
    `- **Motion easings**: ${primitives.motion.easings.map((e) => `\`${e.name}\`=\`${e.value}\``).join(" · ")}`
  );
  push(
    `- **Breakpoints**: ${Object.entries(primitives.layout.breakpoints)
      .map(([n, px]) => `\`${n}\`=${px}px`)
      .join(" · ")}`
  );
  push();

  /* ── §4 Accessibility ── */
  push("## 4. Accessibility contract");
  push();
  push(`| Context | Pair | ${modes.map((m) => m.name).join(" | ")} | AA (4.5:1) |`);
  push(`| --- | --- | ${modes.map(() => "---").join(" | ")} | --- |`);
  A11Y_PAIRS.forEach(([bg, fg, context]) => {
    const verdicts = modes.map((m) => wcagVerdict(resolveToken(state, m.id, bg), resolveToken(state, m.id, fg)));
    push(
      `| ${context} | \`${fg}\` on \`${bg}\` | ${verdicts.map((v) => `${v.ratio}:1`).join(" | ")} | ${
        verdicts.every((v) => v.aa) ? "PASS" : "FAIL"
      } |`
    );
  });
  push();
  push(
    "Every pairing above already clears AA in every mode this system carries. Match a pairing to " +
      "an existing row rather than introducing a new background/text combination that hasn't been audited."
  );
  push();

  /* ── §5 Components ── */
  push("## 5. Components");
  push();
  push(
    `${WIRED_COMPONENTS.size} components ship with this system, grouped the same way the app groups them. Each consumes roles and scales only — no raw values.`
  );
  push();
  COMPONENT_LANES.forEach((lane) => {
    const items = lane.items.filter((i) => WIRED_COMPONENTS.has(i.id));
    if (!items.length) return;
    push(`### ${lane.label}`);
    push();
    items.forEach((item) => {
      const doc = COMPONENT_DOCS[item.id];
      const spec = COMPONENT_SPECS[item.id];
      push(`#### ${item.label} — \`${item.id}\``);
      push();
      if (doc) {
        push(doc.description);
        push();
        if (doc.whenToUse.length) {
          push("_When to use:_ " + doc.whenToUse.join(" "));
          push();
        }
        if (doc.dos.length) {
          push("_Do:_ " + doc.dos.join(" "));
        }
        if (doc.donts.length) {
          push("_Don't:_ " + doc.donts.join(" "));
        }
        push();
        push(`_Accessibility:_ ${doc.a11y}`);
        push();
      }
      if (spec?.states?.length) {
        push(`_States:_ ${spec.states.join(", ")}`);
        push();
      }
      // A component built from a template is shaped by that system's grammar,
      // not by this file's radius scale alone — an agent writing the code needs
      // the actual numbers, so spell them out rather than naming the system and
      // leaving it to guess. Silent for "arkitype", which supplies nothing.
      const templateId = activeTemplateId(item.id, state.components[item.id]?.properties);
      if (templateId !== "arkitype") {
        const template = getTemplate(item.id, templateId);
        const profile = templateProfile(templateId);
        push(`_Template:_ **${template.name}** (${template.source}) — ${template.description}`);
        push();
        const shape: string[] = [];
        if (profile.radius) {
          shape.push(
            `corners: control ${profile.radius.control}px, field ${profile.radius.field}px, ` +
              `surface ${profile.radius.surface}px, chip ${profile.radius.chip}px`
          );
        }
        if (profile.density !== 1) shape.push(`padding ×${profile.density}`);
        if (profile.border != null) shape.push(`container border ${profile.border}px`);
        if (profile.fieldBorder != null) shape.push(`field border ${profile.fieldBorder}px`);
        if (profile.field) shape.push(`field edge: ${profile.field}`);
        if (profile.indicator) shape.push(`active item: ${profile.indicator}`);
        if (profile.type) shape.push(`labels ${profile.type.weight}/${profile.type.tracking}`);
        if (shape.length) {
          push(`_Shape grammar:_ ${shape.join(" · ")}.`);
          push();
        }
      }
      const options = componentOptions(item.id);
      if (options.length) {
        push("| Option | Type | Values | Default |");
        push("| --- | --- | --- | --- |");
        options.forEach((o) => {
          const values =
            o.type === "enum"
              ? (o.options ?? []).map((c) => (c.value === o.def ? `**${c.value}**` : c.value)).join(", ")
              : o.type === "boolean"
                ? "true, false"
                : "—";
          push(`| ${o.label} | ${o.type} | ${values} | \`${o.def}\` |`);
        });
        push();
      }
    });
  });

  /* ── Icons ── */
  iconSectionMarkdown(collectUsedIcons(state), "## 6. Icons").forEach((l) => push(l));

  /* ── §7 Ready-to-use CSS ── */
  push("## 7. Ready-to-use CSS");
  push();
  push(
    "Every token and scale above, compiled to `--ark-*` custom properties — identical to the " +
      "dedicated CSS export. Paste as-is into a stylesheet loaded on every page; nothing needs re-deriving."
  );
  push();
  push("```css");
  push(compileCssVariables(state));
  push("```");
  push();

  /* ── Appendix: machine-readable tokens ── */
  push("## Appendix — resolved semantic tokens (JSON)");
  push();
  push(
    "The same values as §2, flattened to one object per mode — for a token pipeline that wants " +
      "JSON instead of parsing the tables above."
  );
  push();
  const tokensByMode: Record<string, Record<string, string>> = {};
  modes.forEach((m) => {
    const out: Record<string, string> = {};
    Object.keys(semantics.modes[m.id] ?? {}).forEach((token) => {
      out[token] = resolveToken(state, m.id, token);
    });
    tokensByMode[m.id] = out;
  });
  push("```json");
  push(JSON.stringify(tokensByMode, null, 2));
  push("```");
  push();

  return lines.join("\n");
}
