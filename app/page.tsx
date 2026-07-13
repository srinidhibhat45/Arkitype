"use client";

/**
 * Arkitype entry. A single view-machine drives the whole app:
 *   landing → login → survey → dashboard → workspace
 * AuthProvider resolves the Supabase session first, then `view` (from the store)
 * decides which surface renders. The workspace itself is the guided builder:
 * Welcome (name a system) → seven ordered steps, each with its live canvas.
 */
import { useEffect, useState } from "react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { AuthProvider } from "@/components/ui/AuthProvider";
import { LandingPage } from "@/components/marketing/LandingPage";
import { AuthAndSurvey } from "@/components/marketing/AuthAndSurvey";
import { ProjectDashboard } from "@/components/dashboard/ProjectDashboard";
import { Welcome } from "@/components/steps/Welcome";
import { TopBar } from "@/components/shell/TopBar";
import { StageRail } from "@/components/shell/StageRail";
import { FoundationStep } from "@/components/steps/FoundationStep";
import { TypeStep } from "@/components/steps/TypeStep";
import { SpaceStep } from "@/components/steps/SpaceStep";
import { ShapeStep } from "@/components/steps/ShapeStep";
import { MotionStep } from "@/components/steps/MotionStep";
import { ComponentsStep } from "@/components/steps/ComponentsStep";
import { PreviewStep } from "@/components/steps/PreviewStep";
import { ShipStep } from "@/components/steps/ShipStep";
import { FontLoader } from "@/components/ui/FontLoader";

/** The guided builder — shown once a file is open (view === "workspace"). */
function Workspace() {
  const started = useDesignSystem((s) => s.meta.started);
  const activeStep = useDesignSystem((s) => s.journey.activeStep);

  if (!started) return <Welcome />;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <StageRail />
        <main className="min-h-0 min-w-0 flex-1">
          {activeStep === "colour" || activeStep === "roles" ? (
            <FoundationStep initialTab={activeStep === "roles" ? "roles" : "colour"} />
          ) : activeStep === "type" ? (
            <TypeStep />
          ) : activeStep === "space" ? (
            <SpaceStep />
          ) : activeStep === "shape" ? (
            <ShapeStep />
          ) : activeStep === "motion" ? (
            <MotionStep />
          ) : activeStep === "components" ? (
            <ComponentsStep />
          ) : activeStep === "preview" ? (
            <PreviewStep />
          ) : (
            <ShipStep />
          )}
        </main>
      </div>
    </div>
  );
}

/**
 * Small-screen gate: Arkitype is a workspace tool and simply doesn't fit a
 * phone. Below md (768px) an opaque overlay blocks the whole app — CSS-only,
 * so it needs no resize listeners and can't flash on SSR.
 */
function MobileGate() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink px-8 text-center md:hidden">
      <div>
        <p className="font-serif text-2xl tracking-tight text-fg">Arkitype</p>
        <p className="mt-6 font-serif text-3xl leading-snug text-fg">
          This needs a bigger canvas.
        </p>
        <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-fg-dim">
          Arkitype is a design-system builder — there isn&apos;t room for it on a
          phone. Please open it on a desktop or a larger screen.
        </p>
      </div>
    </div>
  );
}

export default function ArkitypePage() {
  // Gate on client mount so the persisted chrome prefs hydrate before first
  // paint (avoids an SSR/localStorage class mismatch on <html>).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const view = useDesignSystem((s) => s.view);
  const recovery = useDesignSystem((s) => s.recovery);
  const chromeTheme = useDesignSystem((s) => s.chromeTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", chromeTheme === "dark");
  }, [chromeTheme]);

  if (!mounted) return <div className="h-screen bg-ink" />;

  return (
    <AuthProvider>
      <MobileGate />
      <FontLoader />
      {recovery ? (
        <AuthAndSurvey />
      ) : view === "landing" ? (
        <LandingPage />
      ) : view === "login" || view === "survey" ? (
        <AuthAndSurvey />
      ) : view === "dashboard" ? (
        <ProjectDashboard />
      ) : (
        <Workspace />
      )}
    </AuthProvider>
  );
}
