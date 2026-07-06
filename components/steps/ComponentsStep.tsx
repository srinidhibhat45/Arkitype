"use client";

/**
 * Step 07 — Components. Forty-plus parts in four lanes (Controls, Display,
 * Navigation, Patterns), mirroring how component libraries are organised in
 * practice. Everything consumes roles + scales + motion tokens exclusively.
 * Modal / Tabs / Table keep the strict 4-skeleton structural rule.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import {
  PreviewMode,
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
import {
  INTERACTION_STATES,
  InteractionState,
  SizeToken,
  TokenAlert,
  TokenButton,
  TokenInput,
  TokenSelect,
  TokenTextarea,
} from "@/components/factory/CoreComponents";
import {
  TokenCheckbox,
  TokenRadio,
  TokenSwitch,
} from "@/components/factory/SelectionControls";
import {
  ToneVariant,
  TokenAvatar,
  TokenBadge,
  TokenProgress,
  TokenSkeletonLoader,
  TokenTag,
  TokenToast,
  TokenTooltip,
} from "@/components/factory/DisplayComponents";
import {
  TokenAccordion,
  TokenBreadcrumbs,
  TokenCard,
  TokenDropdownMenu,
  TokenPagination,
} from "@/components/factory/NavPatternComponents";
import {
  IconButtonVariant,
  TokenButtonGroup,
  TokenIconButton,
  TokenSearchField,
  TokenSlider,
  TokenStepper,
} from "@/components/factory/FormControls";
import {
  TokenCodeBlock,
  TokenDivider,
  TokenEmptyState,
  TokenKbd,
  TokenSpinner,
  TokenStat,
} from "@/components/factory/FeedbackComponents";
import {
  TokenLink,
  TokenNavbar,
  TokenSidebar,
  TokenSteps,
} from "@/components/factory/NavigationComponents";
import {
  TokenBanner,
  TokenFeedItem,
  TokenField,
  TokenListItem,
  TokenStatGrid,
} from "@/components/factory/PatternComponents";
import { MODAL_SKELETONS, ModalScene } from "@/components/factory/ModalSkeletons";
import { TABS_SKELETONS, TabsSkeleton } from "@/components/factory/TabsSkeletons";
import { TABLE_SKELETONS, TableSkeleton } from "@/components/factory/TableSkeletons";
import { ComponentInspector } from "@/components/factory/Inspector";
import { ComponentStudio } from "@/components/factory/ComponentStudio";
import { useComponentBindings, WIRED_COMPONENTS } from "@/lib/componentSchema";

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

const TONES: ToneVariant[] = ["neutral", "brand", "info", "success", "warning", "error"];

/* ── shared canvas helpers ── */

function DualFrames({
  children,
}: {
  children: (mode: PreviewMode) => ReactNode;
}) {
  return (
    <div className="space-y-6">
      {(["light", "dark"] as PreviewMode[]).map((mode) => (
        <ThemeFrame key={mode} mode={mode} label={mode === "light" ? "Light" : "Dark"}>
          {children(mode)}
        </ThemeFrame>
      ))}
    </div>
  );
}

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] capitalize opacity-50">{label}</span>
      {children}
    </div>
  );
}

const GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
} as const;

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

/* ── per-component canvases ── */

function ComponentCanvas({ id }: { id: string }) {
  const cfg = useDesignSystem((s) => s.components[id]);
  const size = (cfg?.properties.size as SizeToken) ?? "md";
  const radiusStep = Number(cfg?.properties.radiusStep ?? 2);
  const resolve = useComponentBindings(id);

  switch (id) {
    case "button":
    case "input":
    case "textarea":
    case "select":
      return (
        <DualFrames>
          {() => (
            <div className="items-start gap-x-6 gap-y-4 p-4" style={GRID}>
              {INTERACTION_STATES.map((state) => (
                <Cell key={state} label={state}>
                  {id === "button" ? (
                    <TokenButton state={state} size={size} radiusStep={radiusStep} resolve={resolve} prefixIcon suffixIcon />
                  ) : id === "input" ? (
                    <TokenInput state={state} size={size} radiusStep={radiusStep} resolve={resolve} />
                  ) : id === "textarea" ? (
                    <TokenTextarea state={state} size={size} radiusStep={radiusStep} resolve={resolve} />
                  ) : (
                    <TokenSelect state={state} size={size} radiusStep={radiusStep} resolve={resolve} />
                  )}
                </Cell>
              ))}
            </div>
          )}
        </DualFrames>
      );

    case "checkbox":
      return (
        <DualFrames>
          {() => (
            <div className="items-start gap-x-6 gap-y-4 p-4" style={GRID}>
              <Cell label="unchecked"><TokenCheckbox radiusStep={radiusStep} resolve={resolve} /></Cell>
              <Cell label="checked"><TokenCheckbox checked radiusStep={radiusStep} resolve={resolve} /></Cell>
              <Cell label="indeterminate"><TokenCheckbox indeterminate radiusStep={radiusStep} resolve={resolve} /></Cell>
              <Cell label="hover · checked"><TokenCheckbox checked state="hover" radiusStep={radiusStep} resolve={resolve} /></Cell>
              <Cell label="focus"><TokenCheckbox state="focus" radiusStep={radiusStep} resolve={resolve} /></Cell>
              <Cell label="disabled · checked"><TokenCheckbox checked state="disabled" radiusStep={radiusStep} resolve={resolve} /></Cell>
            </div>
          )}
        </DualFrames>
      );

    case "radio":
      return (
        <DualFrames>
          {() => (
            <div className="items-start gap-x-6 gap-y-4 p-4" style={GRID}>
              <Cell label="unchecked"><TokenRadio resolve={resolve} /></Cell>
              <Cell label="checked"><TokenRadio checked resolve={resolve} /></Cell>
              <Cell label="hover"><TokenRadio state="hover" resolve={resolve} /></Cell>
              <Cell label="focus"><TokenRadio state="focus" checked resolve={resolve} /></Cell>
              <Cell label="disabled"><TokenRadio state="disabled" resolve={resolve} /></Cell>
              <Cell label="disabled · checked"><TokenRadio state="disabled" checked resolve={resolve} /></Cell>
            </div>
          )}
        </DualFrames>
      );

    case "switch":
      return (
        <DualFrames>
          {() => (
            <div className="items-start gap-x-6 gap-y-4 p-4" style={GRID}>
              <Cell label="off"><TokenSwitch resolve={resolve} /></Cell>
              <Cell label="on"><TokenSwitch checked resolve={resolve} /></Cell>
              <Cell label="hover · on"><TokenSwitch checked state="hover" resolve={resolve} /></Cell>
              <Cell label="focus"><TokenSwitch state="focus" resolve={resolve} /></Cell>
              <Cell label="disabled · off"><TokenSwitch state="disabled" resolve={resolve} /></Cell>
              <Cell label="disabled · on"><TokenSwitch state="disabled" checked resolve={resolve} /></Cell>
            </div>
          )}
        </DualFrames>
      );

    case "badge":
      return (
        <DualFrames>
          {(mode) => (
            <div className="flex flex-wrap items-center gap-3 p-4">
              {TONES.map((tone) => (
                <TokenBadge key={tone} variant={tone} mode={mode} radiusStep={radiusStep} resolve={resolve} />
              ))}
            </div>
          )}
        </DualFrames>
      );

    case "tag":
      return (
        <DualFrames>
          {(mode) => (
            <div className="flex flex-wrap items-center gap-3 p-4">
              <TokenTag mode={mode} radiusStep={radiusStep} resolve={resolve}>Q3 budget</TokenTag>
              <TokenTag mode={mode} radiusStep={radiusStep} resolve={resolve}>engineering</TokenTag>
              <TokenTag mode={mode} radiusStep={radiusStep} removable={false} resolve={resolve}>read-only</TokenTag>
            </div>
          )}
        </DualFrames>
      );

    case "avatar":
      return (
        <DualFrames>
          {() => (
            <div className="flex flex-wrap items-end gap-5 p-4">
              <Cell label="sm"><TokenAvatar size="sm" radiusStep={radiusStep} resolve={resolve} /></Cell>
              <Cell label="md"><TokenAvatar size="md" radiusStep={radiusStep} resolve={resolve} /></Cell>
              <Cell label="lg"><TokenAvatar size="lg" radiusStep={radiusStep} resolve={resolve} /></Cell>
              <Cell label="online"><TokenAvatar size="md" radiusStep={radiusStep} presence="online" resolve={resolve} /></Cell>
              <Cell label="away"><TokenAvatar size="md" radiusStep={radiusStep} presence="away" resolve={resolve} /></Cell>
            </div>
          )}
        </DualFrames>
      );

    case "tooltip":
      return (
        <DualFrames>
          {() => (
            <div className="flex items-center justify-center p-8">
              <TokenTooltip radiusStep={radiusStep} resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "progress":
      return (
        <DualFrames>
          {() => (
            <div className="flex flex-col gap-5 p-5">
              <TokenProgress value={24} radiusStep={radiusStep} resolve={resolve} />
              <TokenProgress value={64} radiusStep={radiusStep} resolve={resolve} />
              <TokenProgress value={92} radiusStep={radiusStep} resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "skeleton":
      return (
        <DualFrames>
          {() => (
            <div className="max-w-md p-5">
              <TokenSkeletonLoader radiusStep={radiusStep} resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "alert":
      return (
        <DualFrames>
          {(mode) => (
            <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-2">
              {(["info", "success", "warning", "error"] as const).map((v) => (
                <TokenAlert key={v} variant={v} mode={mode} radiusStep={radiusStep} resolve={resolve} />
              ))}
            </div>
          )}
        </DualFrames>
      );

    case "toast":
      return (
        <DualFrames>
          {(mode) => (
            <div className="flex flex-col items-start gap-3 p-4">
              <TokenToast variant="success" mode={mode} radiusStep={radiusStep} resolve={resolve} />
              <TokenToast
                variant="error"
                mode={mode}
                radiusStep={radiusStep}
                title="Export failed"
                body="The ledger export timed out. Retry or reduce the range."
                resolve={resolve}
              />
            </div>
          )}
        </DualFrames>
      );

    case "breadcrumbs":
      return (
        <DualFrames>
          {() => (
            <div className="p-5">
              <TokenBreadcrumbs resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "pagination":
      return (
        <DualFrames>
          {() => (
            <div className="p-5">
              <TokenPagination radiusStep={radiusStep} resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "dropdown":
      return (
        <DualFrames>
          {() => (
            <div className="flex justify-center p-6">
              <TokenDropdownMenu radiusStep={radiusStep} resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "card":
      return (
        <DualFrames>
          {(mode) => (
            <div className="p-5">
              <TokenCard mode={mode} radiusStep={radiusStep} resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "accordion":
      return (
        <DualFrames>
          {() => (
            <div className="p-5">
              <TokenAccordion radiusStep={radiusStep} resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    /* ── controls (extended) ── */

    case "iconButton":
      return (
        <DualFrames>
          {() => (
            <div className="flex flex-col gap-5 p-4">
              {(["solid", "outline", "ghost"] as IconButtonVariant[]).map((variant) => (
                <div key={variant} className="flex flex-col gap-2">
                  <span className="text-[10px] capitalize opacity-50">{variant}</span>
                  <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
                    {INTERACTION_STATES.filter((s) => s !== "loading").map((state) => (
                      <Cell key={state} label={state}>
                        <TokenIconButton
                          variant={variant}
                          state={state}
                          size={size}
                          radiusStep={radiusStep}
                          resolve={resolve}
                        />
                      </Cell>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DualFrames>
      );

    case "buttonGroup":
      return (
        <DualFrames>
          {() => (
            <div className="flex flex-wrap items-center gap-5 p-5">
              <TokenButtonGroup radiusStep={radiusStep} resolve={resolve} />
              <TokenButtonGroup
                radiusStep={radiusStep}
                options={["List", "Board", "Timeline", "Calendar"]}
                active={0}
                resolve={resolve}
              />
            </div>
          )}
        </DualFrames>
      );

    case "slider":
      return (
        <DualFrames>
          {() => (
            <div className="flex max-w-md flex-col gap-3 p-5">
              {(["default", "hover", "focus", "disabled"] as InteractionState[]).map(
                (state, i) => (
                  <Cell key={state} label={state}>
                    <TokenSlider
                      state={state}
                      value={[62, 38, 80, 20][i]}
                      radiusStep={radiusStep}
                      resolve={resolve}
                    />
                  </Cell>
                )
              )}
            </div>
          )}
        </DualFrames>
      );

    case "stepper":
      return (
        <DualFrames>
          {() => (
            <div className="items-start gap-x-6 gap-y-4 p-4" style={GRID}>
              {(["default", "hover", "focus", "disabled"] as InteractionState[]).map(
                (state) => (
                  <Cell key={state} label={state}>
                    <TokenStepper state={state} size={size} radiusStep={radiusStep} resolve={resolve} />
                  </Cell>
                )
              )}
            </div>
          )}
        </DualFrames>
      );

    case "searchField":
      return (
        <DualFrames>
          {() => (
            <div className="flex max-w-md flex-col gap-4 p-5">
              {(
                ["default", "hover", "focus", "active", "disabled"] as InteractionState[]
              ).map((state) => (
                <Cell key={state} label={state}>
                  <TokenSearchField state={state} size={size} radiusStep={radiusStep} resolve={resolve} />
                </Cell>
              ))}
            </div>
          )}
        </DualFrames>
      );

    /* ── display (extended) ── */

    case "spinner":
      return (
        <DualFrames>
          {() => (
            <div className="flex items-center gap-8 p-8">
              <Cell label="sm"><TokenSpinner size={18} resolve={resolve} /></Cell>
              <Cell label="md"><TokenSpinner size={26} resolve={resolve} /></Cell>
              <Cell label="lg"><TokenSpinner size={34} resolve={resolve} /></Cell>
              <Cell label="muted"><TokenSpinner size={26} tone="muted" resolve={resolve} /></Cell>
            </div>
          )}
        </DualFrames>
      );

    case "divider":
      return (
        <DualFrames>
          {() => (
            <div className="flex flex-col gap-6 p-5">
              <TokenDivider resolve={resolve} />
              <TokenDivider label="Yesterday" resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "kbd":
      return (
        <DualFrames>
          {() => (
            <div className="flex flex-wrap items-center gap-2 p-8">
              <TokenKbd resolve={resolve}>⌘</TokenKbd>
              <TokenKbd resolve={resolve}>K</TokenKbd>
              <span style={{ fontSize: "var(--ark-text-sm)", opacity: 0.6 }}>then</span>
              <TokenKbd resolve={resolve}>⇧</TokenKbd>
              <TokenKbd resolve={resolve}>Enter</TokenKbd>
            </div>
          )}
        </DualFrames>
      );

    case "stat":
      return (
        <DualFrames>
          {(mode) => (
            <div className="flex flex-wrap gap-x-12 gap-y-6 p-5">
              <TokenStat mode={mode} resolve={resolve} />
              <TokenStat
                mode={mode}
                label="Expenses"
                value="$54,120"
                delta="-3.1%"
                trend="down"
                resolve={resolve}
              />
            </div>
          )}
        </DualFrames>
      );

    case "emptyState":
      return (
        <DualFrames>
          {() => (
            <div className="p-4">
              <TokenEmptyState radiusStep={radiusStep} resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "codeBlock":
      return (
        <DualFrames>
          {() => (
            <div className="p-5">
              <TokenCodeBlock radiusStep={radiusStep} resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    /* ── navigation (extended) ── */

    case "navbar":
      return <DualFrames>{() => <TokenNavbar radiusStep={radiusStep} resolve={resolve} />}</DualFrames>;

    case "sidebar":
      return (
        <DualFrames>
          {() => (
            <div className="flex">
              <TokenSidebar radiusStep={radiusStep} resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "steps":
      return (
        <DualFrames>
          {() => (
            <div className="p-6">
              <TokenSteps resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "link":
      return (
        <DualFrames>
          {() => (
            <div className="p-5">
              <TokenLink resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    /* ── patterns (extended) ── */

    case "listItem":
      return (
        <DualFrames>
          {(mode) => (
            <div className="p-5">
              <TokenListItem mode={mode} radiusStep={radiusStep} resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "feedItem":
      return (
        <DualFrames>
          {() => (
            <div className="p-5">
              <TokenFeedItem radiusStep={radiusStep} resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "banner":
      return (
        <DualFrames>
          {(mode) => (
            <div className="flex flex-col gap-3 p-5">
              <TokenBanner mode={mode} radiusStep={radiusStep} variant="brand" resolve={resolve} />
              <TokenBanner mode={mode} radiusStep={radiusStep} variant="warning" resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "field":
      return (
        <DualFrames>
          {(mode) => (
            <div className="flex flex-wrap gap-8 p-5">
              <TokenField mode={mode} radiusStep={radiusStep} resolve={resolve} />
              <TokenField mode={mode} radiusStep={radiusStep} invalid resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    case "statGrid":
      return (
        <DualFrames>
          {(mode) => (
            <div className="p-5">
              <TokenStatGrid mode={mode} radiusStep={radiusStep} resolve={resolve} />
            </div>
          )}
        </DualFrames>
      );

    default:
      return null;
  }
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
              Pick a variant and state from the toolbar, then tune every property
              in the docked inspector on the right — Options first (icon, style,
              dismissible…), then colour, radius, size and spacing per part.
              Colours bind to a role or primitive; everything else snaps to your
              scales. Click any tile in the strip to preview or edit it.
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
      ) : WIRED_COMPONENTS.has(itemId) ? (
        <CanvasSection title={itemLabel} hint="every parameter binds to a token">
          <ComponentStudio id={itemId} />
        </CanvasSection>
      ) : (
        <div className="flex items-start gap-6">
          <div className="min-w-0 flex-1">
            <CanvasSection title={itemLabel} hint="light and dark, simultaneously">
              <ComponentCanvas id={itemId} />
            </CanvasSection>
          </div>
          <div className="w-[300px] shrink-0">
            <div className="sticky top-4 rounded-xl border border-line bg-ink-panel/40 p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-[13px] font-semibold text-fg">Inspector</h3>
                <span className="text-[11px] text-fg-mute">{itemLabel}</span>
              </div>
              <ComponentInspector id={itemId} />
            </div>
          </div>
        </div>
      )}
    </StepScaffold>
  );
}
