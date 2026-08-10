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
import { Layout, Monitor, Smartphone } from "lucide-react";
import { useDesignSystem, type Density } from "@/store/useDesignSystem";
import {
  AsideDivider,
  Field,
  InfoTip,
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

// Icons so the form-factor switch reads instantly as "device types" rather
// than three more abstract labels in a list — it's the control this whole
// step exists for, so it lives on the canvas itself, not buried in the aside.
const FORM_FACTOR_ICONS: Record<FormFactor, typeof Monitor> = {
  saas: Monitor,
  mobile: Smartphone,
  marketing: Layout,
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
          <Field
            label="Industry"
            hint="content only"
            info={
              <>
                Swaps the copy and data, never the layout or the tokens — the point
                is to see whether the same system survives a different domain.
                {formFactor === "mobile"
                  ? " On mobile, touch targets hold a 44pt floor regardless of density: if Compact makes the rest of the screen feel cramped against them, that's the spacing scale telling you something."
                  : formFactor === "marketing"
                    ? " This form factor is the display end of the type scale under real load — a ratio that reads fine in a console can shout here, or disappear."
                    : " Use the Preview switch in the top bar to walk the product through every mode your file carries; it should feel equally considered in each."}
              </>
            }
          >
            <Segmented options={INDUSTRIES} value={industry} onChange={setIndustry} />
          </Field>

          <AsideDivider />

          <Field
            label="Density"
            hint="base unit + radius"
            info="Rescales the base spacing unit and corner radius together, so you can feel a denser or roomier system without editing either scale by hand."
          >
            <Segmented options={DENSITY_OPTIONS} value={density} onChange={setDensity} />
          </Field>

          <Field label="States" hint="side by side">
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

          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[13.5px] font-semibold text-fg-dim">Structures</span>
            <InfoTip label="About structures">
              Swap the structural patterns without leaving the preview — the same
              choice applies everywhere that pattern appears in the product.
            </InfoTip>
          </div>

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
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-strong bg-ink-panel px-4 py-3 shadow-sm">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-fg-mute">
            Previewing as
          </div>
          <div className="mt-0.5 text-[12px] text-fg-dim">{factorHint}</div>
        </div>
        <div className="inline-flex shrink-0 gap-0.5 rounded-lg border border-line bg-ink p-1">
          {FORM_FACTORS.map(({ label, value }) => {
            const Icon = FORM_FACTOR_ICONS[value];
            const active = value === formFactor;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFormFactor(value)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-semibold transition-colors ${
                  active ? "bg-fg text-ink shadow-sm" : "text-fg-mute hover:bg-ink-hover hover:text-fg-dim"
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <ZoomBox scale={zoom} fill>
        <ThemeFrame mode={mode}>
          <Surface pack={pack} />
          {showStates ? <StatesStrip /> : null}
        </ThemeFrame>
      </ZoomBox>
    </StepScaffold>
  );
}
