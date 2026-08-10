"use client";

/**
 * Colour — one continuous surface. Primitives (the generated ramps), the
 * semantic roles mapped onto them, and the component tokens mapped onto those
 * roles all live and edit here, in place: no tab hop, no modal. This is the
 * "edit colours where they are" surface — rename any token, retarget it to a
 * ramp step / another role / a hex, and dial its opacity, all inline. A
 * component-binding "jump to role/colour" scrolls straight to the token.
 *
 * The one thing that is *not* editing is the contrast audit, and it used to
 * open the step: a full-width report standing between you and the palette every
 * time you came to change a colour. It now has its own tab. The aside still
 * carries the score in both, because health is the thing you want visible while
 * you work, not the thing you want in the way of it.
 */
import { useEffect, useMemo } from "react";
import { FoundationView, modeDefsOf, useDesignSystem } from "@/store/useDesignSystem";
import { StepScaffold } from "@/components/shell/StepScaffold";
import { ColourAside, ColourCanvas } from "@/components/steps/ColourStep";
import { RolesInContext } from "@/components/steps/RolesStep";
import {
  ContrastFooterNote,
  ContrastPanel,
  ContrastSummary,
  useContrastAudit,
} from "@/components/steps/ContrastPanel";
import { TokenTier } from "@/components/steps/TokenTiers";
import { AsideDivider, CanvasSection } from "@/components/ui/controls";
import { Palette, ShieldCheck, TriangleAlert } from "lucide-react";

export type FoundationTab = "colour" | "roles";

const LEDE =
  "One surface, three tiers. Primitives are the generated ramps; semantic roles give them meaning per mode; component tokens bind to those roles. Rename any token, point it at a ramp step, another role (@role) or a raw hex, and set its opacity — every edit is inline and the whole system follows.";

/**
 * The canvas's own tab strip. Two views, so it stays a switch rather than a
 * navigation problem — and the audit's tab carries its failure count, because
 * a tab you have to open to find out whether you need to open it is a tab
 * nobody opens.
 */
function ViewTabs({ failures }: { failures: number }) {
  const view = useDesignSystem((s) => s.foundationView);
  const setView = useDesignSystem((s) => s.setFoundationView);

  const tabs: Array<{
    id: FoundationView;
    label: string;
    icon: typeof Palette;
    badge?: number;
  }> = [
    { id: "colour", label: "Palette & tokens", icon: Palette },
    {
      id: "contrast",
      label: "Contrast audit",
      icon: failures > 0 ? TriangleAlert : ShieldCheck,
      badge: failures,
    },
  ];

  return (
    <div className="mb-4 flex items-center gap-1 border-b border-line pb-2">
      {tabs.map((tab) => {
        const active = view === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              active ? "bg-ink-hover text-fg" : "text-fg-mute hover:text-fg-dim"
            }`}
          >
            <Icon
              size={12}
              className={tab.badge ? "text-amber-400" : active ? "" : "opacity-70"}
            />
            {tab.label}
            {tab.badge ? (
              <span className="rounded bg-amber-500/15 px-1 py-px font-mono text-[10px] font-bold text-amber-400">
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
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
  const setFoundationView = useDesignSystem((s) => s.setFoundationView);
  const view = useDesignSystem((s) => s.foundationView);
  const semantics = useDesignSystem((s) => s.semantics);
  const modeDefs = useMemo(() => modeDefsOf(semantics), [semantics]);

  // Jump-to-token from a component binding, or an initial "roles" entry. The
  // targets all live on the palette tab, so the jump switches to it first —
  // including the audit's own "take me to this token", which is the one route
  // that starts on the other tab.
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
    setFoundationView("colour");
    // A frame late: the palette may only be mounting on this same tick.
    const raf = requestAnimationFrame(() => {
      document.getElementById(anchor)?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    if (pendingFocus) setPendingFocus(null);
    return () => cancelAnimationFrame(raf);
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
              ship, so it sits above the editors rather than under them. The
              full breakdown is a tab away, and this is what points at it. */}
          <ContrastSummary />
          <AsideDivider />
          <ColourAside />
        </>
      }
    >
      <FoundationTabs />

      {view === "contrast" ? (
        <ContrastPanel />
      ) : (
        <>
          <ColourCanvas />

          <CanvasSection
            title="Roles in context"
            hint={modeDefs.length === 2 ? "the system, live in both modes" : `the system, live in all ${modeDefs.length} modes`}
            info="A composed card exercising surfaces, text, links, feedback and actions at once — the fastest way to feel a role change rather than read it. One card per mode the file carries, so a mode you added is a mode you can judge."
          >
            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
              {modeDefs.map((m) => (
                <RolesInContext key={m.id} mode={m.id} />
              ))}
            </div>
          </CanvasSection>

          <div id="tier-semantic">
            <TokenTier kind="semantic" />
          </div>
          <div id="tier-component">
            <TokenTier kind="component" />
          </div>
        </>
      )}
    </StepScaffold>
  );
}

/** The strip, wired to the live failure count. Split out so subscribing to the
 *  audit doesn't re-run the whole step's render on every colour edit. */
function FoundationTabs() {
  const { failures } = useContrastAudit();
  return <ViewTabs failures={failures} />;
}
