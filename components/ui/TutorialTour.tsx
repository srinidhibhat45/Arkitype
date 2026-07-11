"use client";

import { useDesignSystem } from "@/store/useDesignSystem";
import { useState, useEffect, useRef } from "react";
import { Layers, HelpCircle, ArrowRight, ArrowLeft, X } from "lucide-react";

interface TourStep {
  targetId: string;
  title: string;
  content: string;
  placement: "bottom" | "right" | "left" | "top" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "stage-rail-tokens-tab",
    title: "Left Sidebar: Tokens Studio",
    content: "This is your design token registry. Edit primitives, define semantic roles, adjust base density settings, and copy variables to your clipboard instantly.",
    placement: "right"
  },
  {
    targetId: "workspace-preview-canvas",
    title: "Center Stage: Interactive Artboard",
    content: "See your design tokens render in real time on functional UI elements. Toggle variants, change states (hover, focus, disabled), and inspect sizes.",
    placement: "bottom"
  },
  {
    targetId: "workspace-right-inspector",
    title: "Right Sidebar: Property Inspector",
    content: "Fine-tune individual component layouts, spacing overrides, and bind properties directly to your semantic variables here.",
    placement: "left"
  },
  {
    targetId: "workspace-topbar-actions",
    title: "Top Navigation Controls",
    content: "Track your design journey, flip theme previews (light / dark mode), reset database states, or copy generated CSS code variables output.",
    placement: "bottom"
  }
];

export function TutorialTour() {
  const tutorialStep = useDesignSystem((s) => s.tutorialStep);
  const setTutorialStep = useDesignSystem((s) => s.setTutorialStep);

  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const resizeRef = useRef<number | null>(null);

  const activeStepIdx = tutorialStep ?? 0;
  const activeStep = TOUR_STEPS[activeStepIdx];

  // Calculate target element coordinates dynamically
  const updateCoords = () => {
    if (tutorialStep === null) return;
    const step = TOUR_STEPS[tutorialStep];
    const el = document.getElementById(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
    } else {
      setCoords(null);
    }
  };

  useEffect(() => {
    updateCoords();
    const handleResize = () => {
      if (resizeRef.current) window.cancelAnimationFrame(resizeRef.current);
      resizeRef.current = window.requestAnimationFrame(updateCoords);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize);
    };
  }, [tutorialStep]);

  if (tutorialStep === null) return null;

  // Position popover relative to target coordinate
  let popoverStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 99999,
  };

  if (coords) {
    const gap = 16;
    if (activeStep.placement === "right") {
      popoverStyle.top = coords.top + coords.height / 2 - 100;
      popoverStyle.left = coords.left + coords.width + gap;
    } else if (activeStep.placement === "left") {
      popoverStyle.top = coords.top + coords.height / 2 - 100;
      popoverStyle.left = coords.left - 300 - gap; // 300 is card width
    } else if (activeStep.placement === "top") {
      popoverStyle.top = coords.top - 200 - gap;
      popoverStyle.left = coords.left + coords.width / 2 - 150;
    } else if (activeStep.placement === "bottom") {
      popoverStyle.top = coords.top + coords.height + gap;
      popoverStyle.left = coords.left + coords.width / 2 - 150;
    } else {
      // center fallback
      popoverStyle.top = "50%";
      popoverStyle.left = "50%";
      popoverStyle.transform = "translate(-50%, -50%)";
    }
  } else {
    // Default center center
    popoverStyle.top = "50%";
    popoverStyle.left = "50%";
    popoverStyle.transform = "translate(-50%, -50%)";
  }

  const handleNext = () => {
    if (activeStepIdx < TOUR_STEPS.length - 1) {
      setTutorialStep(activeStepIdx + 1);
    } else {
      setTutorialStep(null); // Finish
    }
  };

  const handleBack = () => {
    if (activeStepIdx > 0) {
      setTutorialStep(activeStepIdx - 1);
    }
  };

  return (
    <>
      {/* Background Mask Highlight Overlay */}
      <div 
        className="fixed inset-0 z-[9999] pointer-events-none transition-all duration-300"
        style={{
          background: coords 
            ? `radial-gradient(circle 120px at ${coords.left + coords.width / 2}px ${coords.top + coords.height / 2}px, rgba(9, 9, 11, 0.4) 100%, rgba(9, 9, 11, 0.75) 100%)`
            : "rgba(9, 9, 11, 0.7)"
        }}
      />

      {/* Target Circular Hotspot Rings */}
      {coords && (
        <div 
          className="absolute z-[99990] pointer-events-none transition-all duration-300"
          style={{
            top: coords.top + coords.height / 2 - 40,
            left: coords.left + coords.width / 2 - 40,
            width: 80,
            height: 80,
          }}
        >
          {/* Animated double-pulse ring */}
          <span className="absolute inset-0 rounded-full border-2 border-indigo-500 animate-ping opacity-60" />
          <span className="absolute inset-2 rounded-full border border-pink-400 opacity-80" />
        </div>
      )}

      {/* Popover Card */}
      <div 
        style={popoverStyle}
        className="w-[310px] rounded-2xl border border-indigo-500/40 bg-ink-raised p-5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Floating sparkles title header */}
        <div className="flex items-center justify-between mb-3 border-b border-line/40 pb-2">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <Layers size={13} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Guided Tour ({activeStepIdx + 1}/4)</span>
          </div>
          <button 
            onClick={() => setTutorialStep(null)}
            className="text-fg-mute hover:text-fg transition-colors"
          >
            <X size={13} />
          </button>
        </div>

        {/* Title & Body */}
        <h4 className="text-[13px] font-extrabold text-fg mb-1.5">{activeStep.title}</h4>
        <p className="text-[11.5px] text-fg-dim leading-relaxed mb-4">{activeStep.content}</p>

        {/* Buttons Controls */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-line/30">
          <button
            onClick={() => setTutorialStep(null)}
            className="text-[10.5px] text-fg-mute hover:text-fg transition-colors"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            <button
              disabled={activeStepIdx === 0}
              onClick={handleBack}
              className="p-1 rounded border border-line hover:border-line-strong disabled:opacity-30 text-fg-mute hover:text-fg transition-all"
            >
              <ArrowLeft size={11} />
            </button>
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-md transition-all active:scale-95"
            >
              <span>{activeStepIdx === TOUR_STEPS.length - 1 ? "Finish" : "Next"}</span>
              <ArrowRight size={11} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
