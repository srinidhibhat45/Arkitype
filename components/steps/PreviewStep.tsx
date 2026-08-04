"use client";

/**
 * Step 06 — Preview. The reward moment: a real product rendered 100% from the
 * system. Nothing in the frame is hardcoded — swap a skeleton or reseed a
 * colour and the product morphs live.
 *
 * Two independent axes (see lib/proofingTemplates.ts): the **form factor**
 * decides the layout the system has to survive (dense console / 390px touch /
 * editorial marketing page), the **industry** decides only the words and
 * numbers. Any combination renders from one set of token decisions, which is
 * what makes this proofing rather than a template gallery.
 *
 * Density and the all-states strip live here too: a system that only ever gets
 * looked at in Standard density, in one mode, in the default state is a system
 * whose failures are still ahead of it.
 */
import { useState } from "react";
import { useDesignSystem, type Density } from "@/store/useDesignSystem";
import {
  AsideDivider,
  AsideNote,
  Field,
  Segmented,
  SelectControl,
  SliderControl,
} from "@/components/ui/controls";
import { StepScaffold } from "@/components/shell/StepScaffold";
import { ThemeFrame } from "@/components/ui/ThemeFrame";
import { ZoomBox } from "@/components/factory/ZoomBox";
import { MODAL_SKELETONS } from "@/components/factory/ModalSkeletons";
import { TABS_SKELETONS } from "@/components/factory/TabsSkeletons";
import { TABLE_SKELETONS } from "@/components/factory/TableSkeletons";
import {
  MarketingSurface,
  MobileSurface,
  SaasSurface,
  StatesStrip,
} from "@/components/factory/ProofingSurfaces";
import {
  FORM_FACTORS,
  INDUSTRIES,
  INDUSTRY_PACKS,
  type FormFactor,
  type Industry,
} from "@/lib/proofingTemplates";

const DENSITY_OPTIONS: Array<{ label: string; value: Density }> = [
  { label: "Compact", value: "compact" },
  { label: "Standard", value: "standard" },
  { label: "Spacious", value: "spacious" },
];

const skeletonOptions = (meta: ReadonlyArray<{ id: string; name: string }>) =>
  meta.map((m) => ({ label: `${m.id} · ${m.name}`, value: m.id }));

const SURFACES: Record<FormFactor, (props: { pack: ReturnType<typeof packFor> }) => JSX.Element> = {
  saas: SaasSurface,
  mobile: MobileSurface,
  marketing: MarketingSurface,
};

const packFor = (industry: Industry) => INDUSTRY_PACKS[industry];

export function PreviewStep() {
  // canvasZoom is shared with the Component Studio, whose slider goes to 2.5×;
  // this screen's own range is 0.5–1.25, so clamp at read.
  const zoom = useDesignSystem((s) => Math.min(Math.max(s.canvasZoom, 0.5), 1.25));
  const setCanvasZoom = useDesignSystem((s) => s.setCanvasZoom);
  const mode = useDesignSystem((s) => s.currentPreviewMode);
  const components = useDesignSystem((s) => s.components);
  const setComponentSkeleton = useDesignSystem((s) => s.setComponentSkeleton);
  const density = useDesignSystem((s) => s.primitives.density ?? "standard");
  const setDensity = useDesignSystem((s) => s.setDensity);

  const [formFactor, setFormFactor] = useState<FormFactor>("saas");
  const [industry, setIndustry] = useState<Industry>("fintech");
  const [showStates, setShowStates] = useState(false);

  const pack = packFor(industry);
  const Surface = SURFACES[formFactor];
  const factorHint = FORM_FACTORS.find((f) => f.value === formFactor)?.hint ?? "";

  return (
    <StepScaffold
      step="preview"
      title="Your system, under real load"
      lede="A real product built entirely from your tokens — no hardcoded styles anywhere in the frame. Switch the form factor to see the same system as a dense console, a phone app, and a marketing page; switch the industry to change only the content. If it holds up across all of them, it ships."
      aside={
        <>
          <Field label="Form factor" hint={factorHint}>
            <Segmented
              options={FORM_FACTORS.map(({ label, value }) => ({ label, value }))}
              value={formFactor}
              onChange={setFormFactor}
            />
          </Field>

          <Field label="Industry" hint="content only — layout and tokens are unchanged">
            <Segmented options={INDUSTRIES} value={industry} onChange={setIndustry} />
          </Field>

          <AsideDivider />

          <Field label="Density" hint="rescales base unit + corner radius together">
            <Segmented options={DENSITY_OPTIONS} value={density} onChange={setDensity} />
          </Field>

          <Field label="States" hint="every interaction state, side by side">
            <Segmented
              options={[
                { label: "Product only", value: "off" },
                { label: "Show all states", value: "on" },
              ]}
              value={showStates ? "on" : "off"}
              onChange={(v) => setShowStates(v === "on")}
            />
          </Field>

          <SliderControl
            label="Canvas zoom"
            value={zoom}
            min={0.5}
            max={1.25}
            step={0.05}
            unit="×"
            onChange={setCanvasZoom}
          />

          <AsideDivider />

          <AsideNote>Swap structures without leaving the preview:</AsideNote>

          <SelectControl
            label="Table skeleton"
            value={components.table?.skeletonId ?? "1"}
            options={skeletonOptions(TABLE_SKELETONS)}
            onChange={(v) => setComponentSkeleton("table", v)}
          />
          <SelectControl
            label="Tabs skeleton"
            value={components.tabs?.skeletonId ?? "1"}
            options={skeletonOptions(TABS_SKELETONS)}
            onChange={(v) => setComponentSkeleton("tabs", v)}
          />
          <SelectControl
            label="Modal skeleton"
            value={components.modal?.skeletonId ?? "1"}
            options={skeletonOptions(MODAL_SKELETONS)}
            onChange={(v) => setComponentSkeleton("modal", v)}
          />

          <AsideDivider />

          <AsideNote>
            {formFactor === "mobile"
              ? "Touch targets hold a 44pt floor here regardless of density — if Compact makes the rest of the screen feel cramped against them, that's the spacing scale telling you something."
              : formFactor === "marketing"
                ? "This is the display end of the type scale under real load. A ratio that reads fine in the console can shout here — or disappear."
                : "Use the Light / Dark toggle in the top bar to check both modes — the product should feel equally considered in each."}
          </AsideNote>
        </>
      }
    >
      <ZoomBox scale={zoom} fill>
        <ThemeFrame mode={mode}>
          <Surface pack={pack} />
          {showStates ? <StatesStrip /> : null}
        </ThemeFrame>
      </ZoomBox>
    </StepScaffold>
  );
}
