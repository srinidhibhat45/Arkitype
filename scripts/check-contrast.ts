// scripts/check-contrast.ts
import { generateRamp } from "../lib/color";
import { checkContrast } from "../lib/a11y";
import { ROLE_CONTRAST_PAIRS } from "../lib/a11yPairs";

const DEFAULT_FAMILIES = [
  { id: "brand", seed: "#4f46e5" },
  { id: "secondary", seed: "#06b6d4" },
  { id: "neutral", seed: "#71717a" },
  { id: "success", seed: "#22c55e" },
  { id: "warning", seed: "#f59e0b" },
  { id: "error", seed: "#ef4444" },
];

const DEFAULT_LIGHT: Record<string, string> = {
  "surface-base": "neutral-50",
  "surface-elevated": "neutral-100",
  "surface-subtle": "neutral-200",
  "surface-sunken": "neutral-200",
  "surface-overlay": "neutral-900",
  "text-primary": "neutral-900",
  "text-secondary": "neutral-700",
  "text-muted": "neutral-600",
  "text-on-action": "neutral-50",
  "text-link": "brand-600",
  "text-link-hover": "brand-700",
  "action-primary-default": "brand-600",
  "action-primary-hover": "brand-700",
  "action-primary-active": "brand-800",
  "action-primary-disabled": "neutral-300",
  "action-secondary-default": "neutral-200",
  "action-secondary-hover": "neutral-300",
  "action-secondary-active": "neutral-400",
  "border-default": "neutral-300",
  "border-muted": "neutral-200",
  "border-strong": "neutral-400",
  "border-focus": "brand-500",
  "feedback-info-surface": "secondary-50",
  "feedback-info-text": "secondary-800",
  "feedback-info-border": "secondary-200",
  "feedback-success-surface": "success-50",
  "feedback-success-text": "success-800",
  "feedback-success-border": "success-200",
  "feedback-warning-surface": "warning-50",
  "feedback-warning-text": "warning-800",
  "feedback-warning-border": "warning-200",
  "feedback-error-surface": "error-50",
  "feedback-error-text": "error-800",
  "feedback-error-border": "error-200",
};

const DEFAULT_DARK: Record<string, string> = {
  "surface-base": "neutral-900",
  "surface-elevated": "neutral-800",
  "surface-subtle": "neutral-700",
  "surface-sunken": "neutral-900",
  "surface-overlay": "neutral-50",
  "text-primary": "neutral-50",
  "text-secondary": "neutral-200",
  "text-muted": "neutral-400",
  "text-on-action": "neutral-50",
  "text-link": "brand-400",
  "text-link-hover": "brand-300",
  "action-primary-default": "brand-600",
  "action-primary-hover": "brand-500",
  "action-primary-active": "brand-400",
  "action-primary-disabled": "neutral-700",
  "action-secondary-default": "neutral-800",
  "action-secondary-hover": "neutral-700",
  "action-secondary-active": "neutral-600",
  "border-default": "neutral-700",
  "border-muted": "neutral-800",
  "border-strong": "neutral-600",
  "border-focus": "brand-500",
  "feedback-info-surface": "secondary-950",
  "feedback-info-text": "secondary-200",
  "feedback-info-border": "secondary-800",
  "feedback-success-surface": "success-950",
  "feedback-success-text": "success-200",
  "feedback-success-border": "success-800",
  "feedback-warning-surface": "warning-950",
  "feedback-warning-text": "warning-200",
  "feedback-warning-border": "warning-800",
  "feedback-error-surface": "error-950",
  "feedback-error-text": "error-200",
  "feedback-error-border": "error-800",
};

const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

const resolveRamps = () => {
  const ramps: Record<string, string[]> = {};
  for (const fam of DEFAULT_FAMILIES) {
    ramps[fam.id] = generateRamp(fam.seed);
  }
  return ramps;
};

const resolveToken = (val: string, ramps: Record<string, string[]>) => {
  if (val.startsWith("#")) return val;
  const parts = val.split("-");
  const familyId = parts[0];
  const step = Number(parts[1]);
  const idx = STEPS.indexOf(step);
  if (idx === -1) return "#000000";
  return ramps[familyId][idx];
};

const runAudit = () => {
  const ramps = resolveRamps();
  let failed = false;

  console.log("=== Running Automated WCAG Contrast Verification ===\n");

  const runMode = (mode: "light" | "dark", semanticMap: Record<string, string>) => {
    console.log(`Checking ${mode.toUpperCase()} mode pairings...`);
    let modeFailed = false;

    for (const pair of ROLE_CONTRAST_PAIRS) {
      const bgVal = semanticMap[pair.bg];
      const fgVal = semanticMap[pair.fg];

      if (!bgVal || !fgVal) {
        console.error(`Error: Missing token map for bg (${pair.bg}) or fg (${pair.fg})`);
        failed = true;
        modeFailed = true;
        continue;
      }

      const bgHex = resolveToken(bgVal, ramps);
      const fgHex = resolveToken(fgVal, ramps);

      const check = checkContrast(fgHex, bgHex, pair.context);

      if (check.level === "fail") {
        console.log(`  ❌ [FAIL] ${pair.label}: ${check.ratio}:1 (Required: ${pair.context === "text-normal" ? "4.5:1" : "3.0:1"})`);
        console.log(`     - Foreground (${pair.fg}): ${fgVal} -> ${fgHex}`);
        console.log(`     - Background (${pair.bg}): ${bgVal} -> ${bgHex}`);
        failed = true;
        modeFailed = true;
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
  } else {
    console.log("✨ All default pairings pass WCAG AA contrast checks successfully!");
    process.exit(0);
  }
};

runAudit();
