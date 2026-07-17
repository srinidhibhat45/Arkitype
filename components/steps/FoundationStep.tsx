"use client";

/**
 * Colour — one continuous surface. Primitives (the generated ramps), the
 * semantic roles mapped onto them, and the component tokens mapped onto those
 * roles all live and edit here, in place: no tab hop, no modal. This is the
 * "edit colours where they are" surface — rename any token, retarget it to a
 * ramp step / another role / a hex, and dial its opacity, all inline. A
 * component-binding "jump to role/colour" scrolls straight to the token.
 */
import { useEffect } from "react";
import { PreviewMode, useDesignSystem } from "@/store/useDesignSystem";
import { StepScaffold } from "@/components/shell/StepScaffold";
import { ColourAside, ColourCanvas } from "@/components/steps/ColourStep";
import {
  RolesFooterNote,
  RolesInContext,
  useRolesAudit,
} from "@/components/steps/RolesStep";
import { TokenTier } from "@/components/steps/TokenTiers";
import { AsideDivider, AsideNote, CanvasSection, WcagBadge } from "@/components/ui/controls";

export type FoundationTab = "colour" | "roles";

const LEDE =
  "One surface, three tiers. Primitives are the generated ramps; semantic roles give them meaning per mode; component tokens bind to those roles. Rename any token, point it at a ramp step, another role (@role) or a raw hex, and set its opacity — every edit is inline and the whole system follows.";

/** Compact contrast summary for the aside. */
function ContrastSummary() {
  const { verdicts, aaPass, aaaPass } = useRolesAudit();
  return (
    <div className="mb-6 rounded-xl border border-line p-4">
      <p className="mb-3 text-[12px] font-medium text-fg-dim">Contrast audit</p>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-fg-mute">AA · 4.5:1</span>
          <span
            className={`font-mono text-[12px] ${
              aaPass === verdicts.length ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {aaPass} / {verdicts.length}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[12px] text-fg-mute">AAA · 7:1</span>
          <span className="font-mono text-[12px] text-fg-dim">
            {aaaPass} / {verdicts.length}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Full per-pairing contrast audit, both modes. */
function ContrastAudit() {
  const { verdicts } = useRolesAudit();
  return (
    <CanvasSection title="Contrast audit" hint="every text-on-surface pairing, both modes">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {(["light", "dark"] as PreviewMode[]).map((mode) => (
          <div key={mode} className="rounded-xl border border-line p-4">
            <p className="mb-3 text-[12px] font-medium capitalize text-fg-dim">{mode} mode</p>
            <div className="space-y-1.5">
              {verdicts
                .filter((v) => v.mode === mode)
                .map((v) => (
                  <div
                    key={`${v.mode}-${v.bg}-${v.fg}`}
                    className="flex items-center gap-3 rounded-lg border border-line/70 px-2.5 py-2"
                  >
                    <div
                      className="flex h-8 w-12 shrink-0 items-center justify-center rounded-md border border-line-strong text-[11px] font-semibold"
                      style={{ background: v.bgHex, color: v.fgHex }}
                    >
                      Aa
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] text-fg-dim">{v.context}</div>
                      <div className="font-mono text-[10px] tabular-nums text-fg-mute">
                        {v.verdict.ratio}:1
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <WcagBadge tier="AA" pass={v.verdict.aa} />
                      <WcagBadge tier="AAA" pass={v.verdict.aaa} />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </CanvasSection>
  );
}

export function FoundationStep({
  initialTab,
}: {
  // Kept for call-site compatibility (StageRail passes "roles"/"colour"); the
  // surface is now unified, so it just decides where we scroll on entry.
  initialTab?: FoundationTab;
}) {
  const pendingFocus = useDesignSystem((s) => s.pendingFocus);
  const setPendingFocus = useDesignSystem((s) => s.setPendingFocus);

  // Jump-to-token from a component binding, or an initial "roles" entry.
  useEffect(() => {
    const anchor =
      pendingFocus?.step === "roles"
        ? `role-${pendingFocus.anchor}`
        : pendingFocus?.step === "colour"
          ? `family-${pendingFocus.anchor}`
          : initialTab === "roles"
            ? "tier-semantic"
            : null;
    if (!anchor) return;
    const el = document.getElementById(anchor);
    if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
    if (pendingFocus) setPendingFocus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFocus]);

  return (
    <StepScaffold
      step="colour"
      title="Colour — primitives, roles and component tokens"
      lede={LEDE}
      footerNote={<RolesFooterNote />}
      aside={
        <>
          <ColourAside />
          <AsideDivider />
          <ContrastSummary />
          <AsideNote>
            Roles and component tokens edit inline on the right — rename a token and
            every reference and component binding follows it.
          </AsideNote>
        </>
      }
    >
      <ColourCanvas />

      <CanvasSection title="Roles in context" hint="the system, live in both modes">
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <RolesInContext mode="light" />
          <RolesInContext mode="dark" />
        </div>
      </CanvasSection>

      <div id="tier-semantic">
        <TokenTier kind="semantic" />
      </div>
      <div id="tier-component">
        <TokenTier kind="component" />
      </div>

      <ContrastAudit />
    </StepScaffold>
  );
}
