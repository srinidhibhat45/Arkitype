"use client";

/**
 * Arkitype — a guided design-system builder.
 * Welcome moment → seven ordered steps. The rail is the process; each step
 * is one focused decision with its live canvas.
 */
import { useEffect, useState } from "react";
import { useDesignSystem } from "@/store/useDesignSystem";
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
import { GateKeeper } from "@/components/ui/GateKeeper";
import { FontLoader } from "@/components/ui/FontLoader";

export default function WorkspacePage() {
  // Gate on client mount so the persisted store hydrates before first paint
  // (avoids SSR/localStorage mismatch).
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const started = useDesignSystem((s) => s.meta.started);
  const activeStep = useDesignSystem((s) => s.journey.activeStep);
  const chromeTheme = useDesignSystem((s) => s.chromeTheme);

  // Reflect the chrome theme onto <html> so the CSS-var flip in globals.css
  // (`:root` light ⇆ `.dark`) applies to the whole app, Welcome included.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", chromeTheme === "dark");
  }, [chromeTheme]);

  if (!ready) return <div className="h-screen bg-ink" />;

  return (
    <GateKeeper>
      <FontLoader />
      {!started ? (
        <Welcome />
      ) : (
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
      )}
    </GateKeeper>
  );
}

