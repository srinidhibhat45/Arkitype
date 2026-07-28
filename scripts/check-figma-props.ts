/**
 * Audit: every Figma component property must point at a layer the plugin
 * actually draws.
 *
 * `applyComponentProperties` in figma-plugin/src/code.ts binds a property to
 * `variant.findAll(n => n.name === p.layer)`. When that finds nothing it fails
 * *silently* — the property still appears in Figma's properties panel, it just
 * controls nothing. A designer types into it and nothing happens.
 *
 * So this cross-references FIGMA_PROP_DEFS against the layer names the plugin
 * source can produce, and exits non-zero on a mismatch. Per the repo's
 * convention, it imports the shipped constant rather than restating it.
 *
 *   npx tsx scripts/check-figma-props.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FIGMA_PROP_DEFS } from "@/lib/figma";
import { WIRED_COMPONENTS } from "@/lib/componentSchema";

const PLUGIN_SRC = join(process.cwd(), "figma-plugin/src/code.ts");
const src = readFileSync(PLUGIN_SRC, "utf8");

/** All capture-group-1 matches, without relying on iterator downlevelling. */
function captures(text: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  while ((m = rx.exec(text)) !== null) out.push(m[1]);
  return out;
}

/* Literal layer names: `x.name = "foo"` and the name argument of the node
   factories (including renderIconSlot, which names its node after the slot). */
const literals = new Set<string>();
const addAll = (names: string[]) => names.forEach((n) => literals.add(n));
addAll(captures(src, /\.name\s*=\s*"([^"]+)"/g));
addAll(captures(src, /createTextHelper\(\s*[\w.[\]]+\s*,\s*"([^"]+)"/g));
addAll(captures(src, /createFrameHelper\(\s*[\w.[\]]+\s*,\s*"([^"]+)"/g));
addAll(captures(src, /renderIconSlot\(\s*[\w.[\]]+\s*,\s*"([^"]+)"/g));

/* Generated names: `` `item${i + 1}` `` produces item1, item2, … — record the
   prefix so "item3" counts as drawn. */
const prefixes = new Set<string>();
captures(src, /`([a-zA-Z]+)\$\{[^}]+\}`/g).forEach((p) => prefixes.add(p));

/* Names built from a lookup table, e.g. pagination's pageLayerNames array. */
for (const block of captures(src, /const \w*LayerNames\s*=\s*\[([^\]]+)\]/g)) {
  addAll(captures(block, /"([^"]+)"/g));
}

const isDrawn = (layer: string): boolean => {
  if (literals.has(layer)) return true;
  const stem = layer.replace(/\d+$/, "");
  return stem !== layer && prefixes.has(stem);
};

/* Every wired component needs a `case "<id>":` in drawComponentNode's switch.
   Without one it falls through to drawFallback and exports as a grey
   placeholder box — which is exactly how Jumplist shipped. */
const switchStart = src.indexOf("switch (componentId)");
const switchEnd = src.indexOf("default:\n      await drawFallback");
if (switchStart < 0 || switchEnd <= switchStart) {
  // An audit that can't find what it audits must not report success.
  throw new Error(
    "Could not locate drawComponentNode's dispatch switch in figma-plugin/src/code.ts — " +
      "this audit would silently pass. Fix the parser before trusting the result."
  );
}
const dispatch = new Set<string>();
captures(src.slice(switchStart, switchEnd), /case "([^"]+)":/g).forEach((c) => dispatch.add(c));

const problems: string[] = [];
let checked = 0;

for (const id of Array.from(WIRED_COMPONENTS)) {
  if (!dispatch.has(id)) {
    problems.push(`${id}: no renderer case in drawComponentNode — exports as a drawFallback placeholder`);
  }
}

for (const [cid, defs] of Object.entries(FIGMA_PROP_DEFS)) {
  if (!WIRED_COMPONENTS.has(cid)) {
    problems.push(`${cid}: has properties but is not in WIRED_COMPONENTS`);
    continue;
  }
  const seen = new Set<string>();
  for (const d of defs) {
    checked++;
    if (seen.has(d.name)) problems.push(`${cid}: duplicate property name "${d.name}"`);
    seen.add(d.name);
    if (!isDrawn(d.layer)) {
      problems.push(`${cid}: property "${d.name}" → layer "${d.layer}" is never drawn by the plugin`);
    }
  }
}

console.log(`Checked ${checked} Figma component properties across ${Object.keys(FIGMA_PROP_DEFS).length} components.\n`);

const withProps = Object.keys(FIGMA_PROP_DEFS).length;
const without = Array.from(WIRED_COMPONENTS).filter((id) => !FIGMA_PROP_DEFS[id]);
console.log(`Coverage: ${withProps}/${WIRED_COMPONENTS.size} wired components expose properties.`);
if (without.length) console.log(`No properties (nothing text-bearing to expose): ${without.join(", ")}`);

if (problems.length) {
  console.error(`\n❌ ${problems.length} problem(s):`);
  for (const p of problems) console.error(`   - ${p}`);
  process.exit(1);
}

console.log("\n✨ Every Figma component property binds to a layer the plugin draws.");
