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
import { useDesignSystem } from "@/store/useDesignSystem";
import { StepScaffold } from "@/components/shell/StepScaffold";
import { ColourAside, ColourCanvas } from "@/components/steps/ColourStep";
import { RolesInContext } from "@/components/steps/RolesStep";
import {
  ContrastFooterNote,
  ContrastPanel,
  ContrastSummary,
} from "@/components/steps/ContrastPanel";
import { TokenTier } from "@/components/steps/TokenTiers";
import { AsideDivider, CanvasSection } from "@/components/ui/controls";

export type FoundationTab = "colour" | "roles";

const LEDE =
  "One surface, three tiers. Primitives are the generated ramps; semantic roles give them meaning per mode; component tokens bind to those roles. Rename any token, point it at a ramp step, another role (@role) or a raw hex, and set its opacity — every edit is inline and the whole system follows.";

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
      footerNote={<ContrastFooterNote />}
      aside={
        <>
          {/* Health first: the audit is the one thing here that can block a
              ship, so it sits above the editors rather than under them. */}
          <ContrastSummary />
          <AsideDivider />
          <ColourAside />
        </>
      }
    >
      <ContrastPanel />

      <ColourCanvas />

      <CanvasSection
        title="Roles in context"
        hint="the system, live in both modes"
        info="A composed card exercising surfaces, text, links, feedback and actions at once — the fastest way to feel a role change rather than read it."
      >
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
    </StepScaffold>
  );
}
