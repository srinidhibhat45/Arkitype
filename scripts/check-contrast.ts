// scripts/check-contrast.ts
//
// Audits the *shipped* default role mapping against WCAG AA.
//
// The families and light/dark role maps are imported from the store rather
// than restated here (same reasoning as app/docs/page.tsx) so the audit can't
// drift from the product. It previously kept its own copies and they did
// drift: it still mapped the mid foregrounds to the "-400" tier and the
// feedback surfaces to "-950" long after the product moved to "-300"/"-900",
// so it reported failures the product had already fixed.
import { rampStepLabels } from "../lib/color";
import { checkContrast } from "../lib/a11y";
import { ROLE_CONTRAST_PAIRS } from "../lib/a11yPairs";
import {
  DEFAULT_FAMILIES,
  DEFAULT_LIGHT,
  DEFAULT_DARK,
  familyRamp,
} from "../store/useDesignSystem";

/** Each default family's resolved ramp plus the step labels that index it. */
const RAMPS = new Map(
  DEFAULT_FAMILIES.map((fam) => [
    fam.id,
    { ramp: familyRamp(fam), labels: rampStepLabels(fam.steps) },
  ])
);

/**
 * "neutral-800" -> "#39393d". Split on the last hyphen: family ids may contain
 * one themselves ("neutral-warm-800").
 *
 * Throws rather than falling back to a placeholder colour. The old version
 * returned "#000000" for an unknown step, which silently turned every stale
 * "-950" reference into a black swatch that then *passed* the audit against
 * light text — the staleness stayed invisible precisely where it mattered.
 */
const resolveToken = (val: string): string => {
  if (val.startsWith("#")) return val;
  const cut = val.lastIndexOf("-");
  if (cut === -1) throw new Error(`Malformed token reference: "${val}"`);

  const familyId = val.slice(0, cut);
  const step = Number(val.slice(cut + 1));
  const entry = RAMPS.get(familyId);
  if (!entry) throw new Error(`Token "${val}" names unknown family "${familyId}"`);

  const idx = entry.labels.indexOf(step);
  if (idx === -1) {
    throw new Error(
      `Token "${val}" names step ${step}, which "${familyId}" does not have ` +
        `(steps: ${entry.labels.join(", ")})`
    );
  }
  return entry.ramp[idx];
};

const runAudit = () => {
  let failed = false;

  console.log("=== Running Automated WCAG Contrast Verification ===\n");

  const runMode = (mode: "light" | "dark", semanticMap: Record<string, string>) => {
    console.log(`Checking ${mode.toUpperCase()} mode pairings...`);

    for (const pair of ROLE_CONTRAST_PAIRS) {
      const bgVal = semanticMap[pair.bg];
      const fgVal = semanticMap[pair.fg];

      if (!bgVal || !fgVal) {
        console.error(`Error: Missing token map for bg (${pair.bg}) or fg (${pair.fg})`);
        failed = true;
        continue;
      }

      const bgHex = resolveToken(bgVal);
      const fgHex = resolveToken(fgVal);
      const check = checkContrast(fgHex, bgHex, pair.context);

      if (check.level === "fail") {
        console.log(
          `  ❌ [FAIL] ${pair.label}: ${check.ratio}:1 (Required: ${pair.context === "text-normal" ? "4.5:1" : "3.0:1"})`
        );
        console.log(`     - Foreground (${pair.fg}): ${fgVal} -> ${fgHex}`);
        console.log(`     - Background (${pair.bg}): ${bgVal} -> ${bgHex}`);
        failed = true;
      } else {
        console.log(`  ... [PASS] ${pair.label}: ${check.ratio}:1 (${check.level})`);
      }
    }
    console.log("");
  };

  runMode("light", DEFAULT_LIGHT);
  runMode("dark", DEFAULT_DARK);

  if (failed) {
    console.log("❌ Contrast audit failed. One or more pairings do not meet WCAG AA standards.");
    process.exit(1);
  }
  console.log("✨ All default pairings pass WCAG AA contrast checks successfully!");
  process.exit(0);
};

runAudit();
