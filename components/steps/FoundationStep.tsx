"use client";

/**
 * Colour & roles — one section, two tabs. Colour (primitive ramps) and Roles
 * (the semantic layer mapped onto those ramps) are the same colour concern, so
 * they share one build stop; the tab switches which half you're editing. A
 * "jump to role" from a component binding (pendingFocus.step === "roles")
 * auto-selects the Roles tab and scrolls to the token.
 */
import { useEffect, useState } from "react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { StepScaffold } from "@/components/shell/StepScaffold";
import { ColourAside, ColourCanvas } from "@/components/steps/ColourStep";
import {
  RolesAside,
  RolesCanvas,
  RolesFooterNote,
} from "@/components/steps/RolesStep";

export type FoundationTab = "colour" | "roles";

const COLOUR_LEDE =
  "Enter one hex per family and the engine solves the rest against fixed luminance targets, so a 600 always carries the same visual weight. Add as many families as you need, tune each ramp's shade count, and pin any single swatch by hand — the override sits on top of the generated ramp without disturbing its siblings.";

function FoundationTabs({
  tab,
  onChange,
}: {
  tab: FoundationTab;
  onChange: (t: FoundationTab) => void;
}) {
  const tabs: Array<{ id: FoundationTab; label: string }> = [
    { id: "colour", label: "Colours" },
    { id: "roles", label: "Roles" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-line bg-ink-panel p-0.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          aria-pressed={tab === t.id}
          className={`rounded-md px-4 py-1.5 text-[13px] font-medium transition-colors ${
            tab === t.id ? "bg-fg text-ink" : "text-fg-mute hover:text-fg-dim"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function FoundationStep({
  initialTab = "colour",
}: {
  initialTab?: FoundationTab;
}) {
  const [tab, setTab] = useState<FoundationTab>(initialTab);

  // A component-binding "jump to role/colour" targets this section — switch tab.
  const pendingFocus = useDesignSystem((s) => s.pendingFocus);
  useEffect(() => {
    if (pendingFocus?.step === "roles") setTab("roles");
    else if (pendingFocus?.step === "colour") setTab("colour");
  }, [pendingFocus]);

  // Roles lede carries live counts.
  const groups = useDesignSystem((s) => s.semantics.groups);
  const roleCount = groups.reduce((n, g) => n + g.tokens.length, 0);
  const rolesLede = `Components never touch raw colours — they ask for roles like surface-base or feedback-success-text, and each role points at a primitive step (or a literal hex) per mode. ${roleCount} roles across ${groups.length} groups, all editable. Remap anything and every component follows; the audit re-checks contrast on every change.`;

  const isColour = tab === "colour";

  return (
    <StepScaffold
      step="colour"
      title={
        isColour ? "Seeds, shades and precise overrides" : "Meaning, mapped onto values"
      }
      lede={isColour ? COLOUR_LEDE : rolesLede}
      tabs={<FoundationTabs tab={tab} onChange={setTab} />}
      footerNote={isColour ? undefined : <RolesFooterNote />}
      aside={isColour ? <ColourAside /> : <RolesAside />}
    >
      {isColour ? <ColourCanvas /> : <RolesCanvas />}
    </StepScaffold>
  );
}
