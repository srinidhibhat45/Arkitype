"use client";

/**
 * Step 07 — Components. Forty-plus parts in four lanes (Controls, Display,
 * Navigation, Patterns), mirroring how component libraries are organised in
 * practice. Everything consumes roles + scales + motion tokens exclusively.
 * Modal / Tabs / Table keep the strict 4-skeleton structural rule.
 *
 * Layout: the center canvas shows an enlarged live preview; the right inspector
 * pane hosts all configurable options, token bindings and skeleton pickers.
 */
import { useState } from "react";
import {
  RADII_NAMES,
  useDesignSystem,
} from "@/store/useDesignSystem";
import {
  AsideDivider,
  AsideNote,
  CanvasSection,
  Field,
  Segmented,
  SelectControl,
} from "@/components/ui/controls";
import { StepScaffold } from "@/components/shell/StepScaffold";
import { ThemeFrame } from "@/components/ui/ThemeFrame";
import { MODAL_SKELETONS, ModalScene } from "@/components/factory/ModalSkeletons";
import { TABS_SKELETONS, TabsSkeleton } from "@/components/factory/TabsSkeletons";
import { TABLE_SKELETONS, TableSkeleton } from "@/components/factory/TableSkeletons";
import { ComponentStudioPreview, ComponentStudioControls } from "@/components/factory/ComponentStudio";
import { WIRED_COMPONENTS } from "@/lib/componentSchema";

/* ── lanes & inventory ── */

type LaneId = "controls" | "display" | "navigation" | "patterns";

const LANES: Array<{
  id: LaneId;
  label: string;
  note: string;
  items: Array<{ id: string; label: string }>;
}> = [
  {
    id: "controls",
    label: "Controls",
    note: "Sizes map to your spacing steps, radius to your radius scale, transitions to your motion tokens — nothing here is a magic number.",
    items: [
      { id: "button", label: "Button" },
      { id: "iconButton", label: "Icon button" },
      { id: "buttonGroup", label: "Button group" },
      { id: "input", label: "Input" },
      { id: "textarea", label: "Textarea" },
      { id: "select", label: "Select" },
      { id: "searchField", label: "Search" },
      { id: "checkbox", label: "Checkbox" },
      { id: "radio", label: "Radio" },
      { id: "switch", label: "Switch" },
      { id: "slider", label: "Slider" },
      { id: "stepper", label: "Stepper" },
    ],
  },
  {
    id: "display",
    label: "Display",
    note: "Feedback and status surfaces. Tone variants resolve from your primitive ramps per mode — the same wash/border/text recipe as alerts.",
    items: [
      { id: "badge", label: "Badge" },
      { id: "tag", label: "Tag" },
      { id: "avatar", label: "Avatar" },
      { id: "tooltip", label: "Tooltip" },
      { id: "progress", label: "Progress" },
      { id: "spinner", label: "Spinner" },
      { id: "skeleton", label: "Skeleton" },
      { id: "alert", label: "Alert" },
      { id: "toast", label: "Toast" },
      { id: "stat", label: "Stat" },
      { id: "divider", label: "Divider" },
      { id: "kbd", label: "Keyboard" },
      { id: "emptyState", label: "Empty state" },
      { id: "codeBlock", label: "Code block" },
    ],
  },
  {
    id: "navigation",
    label: "Navigation",
    note: "Wayfinding parts. Tabs carries four structural skeletons; the active one is what the preview dashboard renders.",
    items: [
      { id: "tabs", label: "Tabs" },
      { id: "navbar", label: "Navbar" },
      { id: "sidebar", label: "Sidebar" },
      { id: "breadcrumbs", label: "Breadcrumbs" },
      { id: "steps", label: "Steps" },
      { id: "pagination", label: "Pagination" },
      { id: "dropdown", label: "Dropdown" },
      { id: "link", label: "Link" },
    ],
  },
  {
    id: "patterns",
    label: "Patterns",
    note: "Composition patterns built from the parts above. Modal and Table obey the strict 4-skeleton rule — click a card to switch structure.",
    items: [
      { id: "modal", label: "Modal" },
      { id: "table", label: "Table" },
      { id: "card", label: "Card" },
      { id: "listItem", label: "List item" },
      { id: "feedItem", label: "Feed item" },
      { id: "accordion", label: "Accordion" },
      { id: "banner", label: "Banner" },
      { id: "field", label: "Field" },
      { id: "statGrid", label: "Stat grid" },
    ],
  },
];

const SIZABLE = new Set([
  "button",
  "input",
  "textarea",
  "select",
  "iconButton",
  "searchField",
  "stepper",
]);
const NO_RADIUS = new Set([
  "radio",
  "switch",
  "breadcrumbs",
  "spinner",
  "divider",
  "kbd",
  "stat",
  "steps",
  "link",
]);
const SKELETAL = new Set<string>(["modal", "tabs", "table"]);

const SKELETON_META: Record<
  string,
  ReadonlyArray<{ id: string; name: string; desc: string }>
> = {
  modal: MODAL_SKELETONS,
  tabs: TABS_SKELETONS,
  table: TABLE_SKELETONS,
};

const SIZE_OPTIONS = [
  { label: "Small", value: "sm" },
  { label: "Medium", value: "md" },
  { label: "Large", value: "lg" },
];

const RADIUS_OPTIONS = RADII_NAMES.map((name, i) => ({
  label: `radius-${name}`,
  value: String(i),
}));

function ChipRow({
  items,
  value,
  onChange,
}: {
  items: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
            value === item.id
              ? "border-line-strong bg-ink-raised text-fg"
              : "border-line text-fg-mute hover:text-fg-dim"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/* ── skeleton picker for the aside (compact version) ── */

function SkeletonPicker({ pattern }: { pattern: string }) {
  const cfg = useDesignSystem((s) => s.components[pattern]);
  const setComponentSkeleton = useDesignSystem((s) => s.setComponentSkeleton);

  return (
    <div className="space-y-1.5">
      {(SKELETON_META[pattern] ?? []).map((sk) => {
        const active = cfg?.skeletonId === sk.id;
        return (
          <button
            key={sk.id}
            type="button"
            onClick={() => setComponentSkeleton(pattern, sk.id)}
            className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
              active
                ? "border-line-strong bg-ink-raised"
                : "border-line hover:border-line-strong"
            }`}
          >
            <span className="font-mono text-[10px] text-fg-mute pt-0.5">{sk.id}</span>
            <div className="min-w-0 flex-1">
              <span className={`block text-[12px] font-medium ${active ? "text-fg" : "text-fg-dim"}`}>
                {sk.name}
              </span>
              <span className="block text-[10px] text-fg-mute mt-0.5">{sk.desc}</span>
            </div>
            {active ? (
              <span className="shrink-0 rounded-md bg-fg px-1.5 py-0.5 text-[9px] font-semibold text-ink mt-0.5">
                Active
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ── skeleton preview for the center canvas (single enlarged preview) ── */

function SkeletonPreview({ pattern }: { pattern: string }) {
  const mode = useDesignSystem((s) => s.currentPreviewMode);
  const cfg = useDesignSystem((s) => s.components[pattern]);
  const skeletonId = cfg?.skeletonId ?? "1";
  const radiusStep = Number(cfg?.properties.radiusStep ?? 3);
  const skeletonName = (SKELETON_META[pattern] ?? []).find((sk) => sk.id === skeletonId)?.name ?? "Preview";

  return (
    <div>
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-fg-mute">
        {skeletonName}
      </div>
      <ThemeFrame mode={mode}>
        {pattern === "modal" ? (
          <div className="relative h-[420px]">
            <ModalScene skeletonId={skeletonId} radiusStep={radiusStep} />
          </div>
        ) : pattern === "tabs" ? (
          <div className="min-h-[280px]">
            <TabsSkeleton skeletonId={skeletonId} radiusStep={radiusStep} />
          </div>
        ) : (
          <div className="min-h-[280px]">
            <TableSkeleton skeletonId={skeletonId} radiusStep={radiusStep} maxRows={6} />
          </div>
        )}
      </ThemeFrame>
    </div>
  );
}

/* ── the step ── */

export function ComponentsStep() {
  const activeComponentId = useDesignSystem((s) => s.activeComponentId) || "button";
  const setActiveComponentId = useDesignSystem((s) => s.setActiveComponentId);

  const lane = LANES.find((l) => l.items.some((i) => i.id === activeComponentId)) ?? LANES[0];
  const laneId = lane.id;
  const itemId = activeComponentId;
  const itemLabel = lane.items.find((i) => i.id === itemId)?.label ?? itemId;

  const cfg = useDesignSystem((s) => s.components[itemId]);
  const setComponentProperty = useDesignSystem((s) => s.setComponentProperty);

  const totalCount = LANES.reduce((sum, l) => sum + l.items.length, 0);

  // Shared hover-highlight state between preview (center) and controls (aside)
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  const isSkeletal = SKELETAL.has(itemId);
  const isWired = WIRED_COMPONENTS.has(itemId);

  return (
    <StepScaffold
      step="components"
      title="Assembled from roles, never from values"
      lede={`${totalCount} components in four lanes, every one reading roles, scales and motion tokens exclusively — change a mapping in Roles and all of them follow. Controls and display parts render light and dark simultaneously; structural patterns keep the four-skeleton rule.`}
      hideHeader={true}
      aside={
        <>
          {/* Skeleton picker for modal/tabs/table */}
          {isSkeletal ? (
            <Field label="Structure / Layout">
              <SkeletonPicker pattern={itemId} />
            </Field>
          ) : null}

          {/* Size & radius for non-wired sizable components */}
          {SIZABLE.has(itemId) && !isWired ? (
            <SelectControl
              label="Size"
              value={String(cfg?.properties.size ?? "md")}
              options={SIZE_OPTIONS}
              onChange={(v) => setComponentProperty(itemId, "size", v)}
            />
          ) : null}

          {!NO_RADIUS.has(itemId) && !isWired ? (
            <SelectControl
              label="Corner radius"
              value={String(cfg?.properties.radiusStep ?? 2)}
              options={RADIUS_OPTIONS}
              onChange={(v) => setComponentProperty(itemId, "radiusStep", Number(v))}
            />
          ) : null}

          {/* Options + token binding controls for wired components */}
          {isWired ? (
            <>
              <ComponentStudioControls
                id={itemId}
                hoveredPart={hoveredPart}
                setHoveredPart={setHoveredPart}
              />
            </>
          ) : null}

          <AsideDivider />
          <AsideNote>{lane.note}</AsideNote>
        </>
      }
    >
      {isSkeletal ? (
        <CanvasSection
          title={`${itemLabel}`}
          hint="every parameter binds to a token"
        >
          <SkeletonPreview pattern={itemId} />
        </CanvasSection>
      ) : isWired ? (
        <CanvasSection title={itemLabel} hint="every parameter binds to a token">
          <ComponentStudioPreview
            id={itemId}
            hoveredPart={hoveredPart}
            setHoveredPart={setHoveredPart}
          />
        </CanvasSection>
      ) : (
        <CanvasSection title={itemLabel} hint="every parameter binds to a token">
          <ComponentStudioPreview
            id={itemId}
            hoveredPart={hoveredPart}
            setHoveredPart={setHoveredPart}
          />
        </CanvasSection>
      )}
    </StepScaffold>
  );
}
