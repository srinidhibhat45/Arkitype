"use client";

/**
 * Step 07 — Components. Forty-plus parts in four lanes (Controls, Display,
 * Navigation, Patterns), mirroring how component libraries are organised in
 * practice. Everything consumes roles + scales + motion tokens exclusively.
 * Modal / Tabs / Table keep the strict 4-skeleton structural rule.
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
import { ComponentStudio } from "@/components/factory/ComponentStudio";
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
const SKELETAL = new Set(["modal", "tabs", "table"]);

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

function SkeletonGrid({ pattern }: { pattern: string }) {
  const mode = useDesignSystem((s) => s.currentPreviewMode);
  const cfg = useDesignSystem((s) => s.components[pattern]);
  const setComponentSkeleton = useDesignSystem((s) => s.setComponentSkeleton);
  const radiusStep = Number(cfg?.properties.radiusStep ?? 3);

  return (
    <div className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
      {(SKELETON_META[pattern] ?? []).map((sk) => {
        const active = cfg?.skeletonId === sk.id;
        return (
          // div[role=button]: previews contain real interactive buttons.
          <div
            key={sk.id}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            onClick={() => setComponentSkeleton(pattern, sk.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setComponentSkeleton(pattern, sk.id);
              }
            }}
            className={`group cursor-pointer rounded-xl border p-3 transition-colors ${
              active
                ? "border-line-strong bg-ink-panel"
                : "border-line hover:border-line-strong"
            }`}
          >
            <div className="mb-2.5 flex items-center gap-2.5">
              <span className="font-mono text-[11px] text-fg-mute">{sk.id}</span>
              <span className="text-[13px] font-medium text-fg">{sk.name}</span>
              {active ? (
                <span className="ml-auto rounded-md bg-fg px-1.5 py-0.5 text-[10px] font-semibold text-ink">
                  In use
                </span>
              ) : (
                <span className="ml-auto text-[11px] text-fg-mute opacity-0 transition-opacity group-hover:opacity-100">
                  Click to use
                </span>
              )}
            </div>
            <p className="mb-3 text-[11px] text-fg-mute">{sk.desc}</p>
            <ThemeFrame mode={mode}>
              {pattern === "modal" ? (
                <div className="relative h-64">
                  <ModalScene skeletonId={sk.id} radiusStep={radiusStep} />
                </div>
              ) : pattern === "tabs" ? (
                <div className="min-h-[150px]">
                  <TabsSkeleton skeletonId={sk.id} radiusStep={radiusStep} />
                </div>
              ) : (
                <TableSkeleton skeletonId={sk.id} radiusStep={radiusStep} maxRows={4} />
              )}
            </ThemeFrame>
          </div>
        );
      })}
    </div>
  );
}

/* ── the step ── */

export function ComponentsStep() {
  const [laneId, setLaneId] = useState<LaneId>("controls");
  const [selected, setSelected] = useState<Record<LaneId, string>>({
    controls: "button",
    display: "badge",
    navigation: "tabs",
    patterns: "modal",
  });

  const lane = LANES.find((l) => l.id === laneId) ?? LANES[0];
  const itemId = selected[laneId];
  const itemLabel = lane.items.find((i) => i.id === itemId)?.label ?? itemId;

  const cfg = useDesignSystem((s) => s.components[itemId]);
  const setComponentProperty = useDesignSystem((s) => s.setComponentProperty);

  const totalCount = LANES.reduce((sum, l) => sum + l.items.length, 0);

  return (
    <StepScaffold
      step="components"
      title="Assembled from roles, never from values"
      lede={`${totalCount} components in four lanes, every one reading roles, scales and motion tokens exclusively — change a mapping in Roles and all of them follow. Controls and display parts render light and dark simultaneously; structural patterns keep the four-skeleton rule.`}
      aside={
        <>
          <Field label="Lane">
            <Segmented
              options={LANES.map((l) => ({ label: l.label, value: l.id }))}
              value={laneId}
              onChange={setLaneId}
            />
          </Field>

          <Field label={`${lane.label} — ${lane.items.length} parts`}>
            <ChipRow
              items={lane.items}
              value={itemId}
              onChange={(id) => setSelected((s) => ({ ...s, [laneId]: id }))}
            />
          </Field>

          {SIZABLE.has(itemId) && !WIRED_COMPONENTS.has(itemId) ? (
            <SelectControl
              label="Size"
              value={String(cfg?.properties.size ?? "md")}
              options={SIZE_OPTIONS}
              onChange={(v) => setComponentProperty(itemId, "size", v)}
            />
          ) : null}

          {!NO_RADIUS.has(itemId) && !WIRED_COMPONENTS.has(itemId) ? (
            <SelectControl
              label="Corner radius"
              value={String(cfg?.properties.radiusStep ?? 2)}
              options={RADIUS_OPTIONS}
              onChange={(v) => setComponentProperty(itemId, "radiusStep", Number(v))}
            />
          ) : null}

          {WIRED_COMPONENTS.has(itemId) ? (
            <AsideNote>
              Pick a variant and state from the toolbar, then tune each property
              in the clusters around the preview — hover a cluster to highlight
              the part it controls. Colours bind to a role or primitive;
              everything else snaps to your scales. Click any tile in the strip
              to preview or edit it.
            </AsideNote>
          ) : null}

          <AsideDivider />
          <AsideNote>{lane.note}</AsideNote>
        </>
      }
    >
      {SKELETAL.has(itemId) ? (
        <CanvasSection
          title={`${itemLabel} skeletons`}
          hint="four structural variants — pick one"
        >
          <SkeletonGrid pattern={itemId} />
        </CanvasSection>
      ) : (
        <CanvasSection title={itemLabel} hint="every parameter binds to a token">
          <ComponentStudio id={itemId} />
        </CanvasSection>
      )}
    </StepScaffold>
  );
}
