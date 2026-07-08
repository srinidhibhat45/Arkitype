"use client";

/**
 * ComponentStudio — a Figma-style customization workspace for one component.
 *
 * Three zones, mirroring how design tools lay out an editor:
 *   • a sticky TOP TOOLBAR — the component name, a Variant selector (the schema's
 *     "preview axis": tone for alert/toast/badge, variant for icon button…), a
 *     State selector with an explicit "Editing: <state>" label, the Light/Dark
 *     toggle and Reset-all;
 *   • a CENTER CANVAS — the live hero on a dotted surface, with a clickable strip
 *     below that lets you *view and select* every state (controls) or variant
 *     (display) at a glance;
 *   • a docked RIGHT INSPECTOR — an Options section (functional choices: icon,
 *     dismissible, style, accent, elevation…) plus one collapsible section per
 *     schema part (Container, Label, Prefix icon…), each row binding to a role,
 *     primitive, scale step or free px — the same store path as before.
 *
 * Options persist to `ComponentConfig.properties` (exported in the docs bundle);
 * colour/scale bindings persist to `ComponentConfig.bindings`.
 */
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Moon,
  RotateCcw,
  Sun,
  AlignLeft,
  AlignCenter,
  ArrowUpToLine,
  ArrowDownToLine,
  CornerUpRight,
  Square,
  ArrowLeftRight,
  ArrowUpDown,
  Flame,
  Sparkles,
  ArrowRight,
  Lock,
  Eye,
  Sliders,
  Paintbrush,
  Type,
  PaintBucket,
} from "lucide-react";
import { PreviewMode, useDesignSystem } from "@/store/useDesignSystem";
import { ThemeFrame } from "@/components/ui/ThemeFrame";
import {
  COMPONENT_SPECS,
  CState,
  OptionSpec,
  PropSpec,
  Resolver,
  STATE_LABEL,
  bindingKey,
  componentOptions,
  currentBinding,
  defBinding,
  previewAxis,
  resolveOptions,
  useComponentBindings,
} from "@/lib/componentSchema";
import { useInspectorData } from "@/components/factory/studioShared";
import { usePartBox } from "@/components/factory/useHighlight";
import { HexInput } from "@/components/ui/controls";
import {
  OptionRow,
  OptionToggle,
  ParamCard,
  TokenSegmented,
  TokenSlider,
  TokenSwatchCard,
} from "@/components/factory/StudioControls";

/* ── factory components (one representative instance each) ── */
import type {
  AlertAccent,
  AlertStyle,
  AlertVariant,
} from "@/components/factory/CoreComponents";
import {
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
import type { ToneVariant } from "@/components/factory/DisplayComponents";
import {
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
import type { IconButtonVariant } from "@/components/factory/FormControls";
import {
  TokenButtonGroup,
  TokenIconButton,
  TokenSearchField,
  TokenSlider as TokenSliderComponent,
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
import { ModalScene } from "@/components/factory/ModalSkeletons";
import { TabsSkeleton } from "@/components/factory/TabsSkeletons";
import { TableSkeleton } from "@/components/factory/TableSkeletons";

/* ── which controls expose a Size card ── */

const SIZABLE = new Set([
  "button",
  "input",
  "textarea",
  "select",
  "iconButton",
  "searchField",
  "stepper",
]);

const SIZE_OPTIONS = [
  { label: "Sm", value: "sm" },
  { label: "Md", value: "md" },
  { label: "Lg", value: "lg" },
  { label: "Xl", value: "xl" },
];

/* ── one representative instance of a component, in one state/variant ── */

type HeroCtx = {
  state: CState;
  size: SizeToken;
  radiusStep: number;
  resolve: Resolver;
  mode: PreviewMode;
  opts: Record<string, string | boolean | number>;
};

function renderHero(id: string, ctx: HeroCtx): ReactNode {
  const { state, size, radiusStep, resolve, mode, opts } = ctx;
  const os = (k: string) => opts[k] as string;
  const ob = (k: string) => opts[k] as boolean;
  switch (id) {
    /* controls */
    case "button":
      return (
        <TokenButton
          state={state}
          size={size}
          variant={os("variant") as any}
          radiusStep={radiusStep}
          resolve={resolve}
          prefixIcon={os("prefixIcon")}
          suffixIcon={os("suffixIcon")}
        />
      );
    case "input":
      return <TokenInput state={state} size={size} radiusStep={radiusStep} resolve={resolve} />;
    case "textarea":
      return <TokenTextarea state={state} size={size} radiusStep={radiusStep} resolve={resolve} />;
    case "select":
      return <TokenSelect state={state} size={size} radiusStep={radiusStep} resolve={resolve} />;
    case "checkbox":
      return <TokenCheckbox checked state={state} radiusStep={radiusStep} resolve={resolve} />;
    case "radio":
      return <TokenRadio checked state={state} resolve={resolve} />;
    case "switch":
      return <TokenSwitch checked state={state} resolve={resolve} />;
    case "iconButton":
      return <TokenIconButton variant={os("variant") as IconButtonVariant} state={state} size={size} radiusStep={radiusStep} resolve={resolve} />;
    case "buttonGroup":
      return <TokenButtonGroup radiusStep={radiusStep} resolve={resolve} />;
    case "slider":
      return (
        <div className="w-56">
          <TokenSliderComponent state={state} value={62} radiusStep={radiusStep} resolve={resolve} />
        </div>
      );
    case "stepper":
      return <TokenStepper state={state} size={size} radiusStep={radiusStep} resolve={resolve} />;
    case "searchField":
      return (
        <div className="w-64">
          <TokenSearchField state={state} size={size} radiusStep={radiusStep} resolve={resolve} />
        </div>
      );

    /* display */
    case "badge":
      return (
        <TokenBadge
          variant={os("tone") as ToneVariant}
          style={os("style") as "subtle" | "solid" | "outline"}
          dot={ob("dot")}
          mode={mode}
          radiusStep={radiusStep}
          resolve={resolve}
        />
      );
    case "tag":
      return (
        <TokenTag mode={mode} radiusStep={radiusStep} resolve={resolve}>
          engineering
        </TokenTag>
      );
    case "avatar":
      return <TokenAvatar size="lg" radiusStep={radiusStep} presence="online" resolve={resolve} />;
    case "tooltip":
      return <TokenTooltip radiusStep={radiusStep} resolve={resolve} />;
    case "progress":
      return (
        <div className="w-64">
          <TokenProgress value={64} radiusStep={radiusStep} resolve={resolve} />
        </div>
      );
    case "spinner":
      return <TokenSpinner size={30} resolve={resolve} />;
    case "skeleton":
      return (
        <div className="w-72">
          <TokenSkeletonLoader radiusStep={radiusStep} resolve={resolve} />
        </div>
      );
    case "alert":
      return (
        <div className="w-80">
          <TokenAlert
            variant={os("tone") as AlertVariant}
            style={os("style") as AlertStyle}
            accent={os("accent") as AlertAccent}
            icon={ob("icon")}
            dismissible={ob("dismissible")}
            action={ob("action")}
            mode={mode}
            radiusStep={radiusStep}
            resolve={resolve}
          />
        </div>
      );
    case "toast":
      return (
        <TokenToast
          variant={os("tone") as ToneVariant}
          icon={ob("icon")}
          dismissible={ob("dismissible")}
          action={ob("action")}
          elevation={os("elevation")}
          mode={mode}
          radiusStep={radiusStep}
          resolve={resolve}
        />
      );
    case "stat":
      return <TokenStat mode={mode} resolve={resolve} />;
    case "divider":
      return (
        <div className="w-72">
          <TokenDivider label="Yesterday" resolve={resolve} />
        </div>
      );
    case "kbd":
      return (
        <div className="flex items-center gap-1.5">
          <TokenKbd resolve={resolve}>⌘</TokenKbd>
          <TokenKbd resolve={resolve}>K</TokenKbd>
        </div>
      );
    case "emptyState":
      return <TokenEmptyState radiusStep={radiusStep} resolve={resolve} />;
    case "codeBlock":
      return (
        <div className="w-80">
          <TokenCodeBlock radiusStep={radiusStep} resolve={resolve} />
        </div>
      );

    /* navigation */
    case "navbar":
      return (
        <div className="w-full">
          <TokenNavbar radiusStep={radiusStep} resolve={resolve} />
        </div>
      );
    case "sidebar":
      return <TokenSidebar radiusStep={radiusStep} resolve={resolve} />;
    case "breadcrumbs":
      return <TokenBreadcrumbs resolve={resolve} />;
    case "steps":
      return <TokenSteps resolve={resolve} />;
    case "pagination":
      return <TokenPagination radiusStep={radiusStep} resolve={resolve} />;
    case "dropdown":
      return <TokenDropdownMenu radiusStep={radiusStep} resolve={resolve} />;
    case "link":
      return <TokenLink resolve={resolve} />;

    /* patterns */
    case "card":
      return (
        <div className="w-80">
          <TokenCard mode={mode} radiusStep={radiusStep} resolve={resolve} />
        </div>
      );
    case "listItem":
      return (
        <div className="w-80">
          <TokenListItem mode={mode} radiusStep={radiusStep} resolve={resolve} />
        </div>
      );
    case "feedItem":
      return (
        <div className="w-80">
          <TokenFeedItem radiusStep={radiusStep} resolve={resolve} />
        </div>
      );
    case "accordion":
      return (
        <div className="w-80">
          <TokenAccordion radiusStep={radiusStep} resolve={resolve} />
        </div>
      );
    case "banner":
      return (
        <div className="w-80">
          <TokenBanner
            variant={os("tone") as ToneVariant}
            icon={ob("icon")}
            action={ob("action")}
            dismissible={ob("dismissible")}
            mode={mode}
            radiusStep={radiusStep}
            resolve={resolve}
          />
        </div>
      );
    case "field":
      return <TokenField mode={mode} radiusStep={radiusStep} resolve={resolve} />;
    case "statGrid":
      return (
        <div className="w-full">
          <TokenStatGrid mode={mode} radiusStep={radiusStep} resolve={resolve} />
        </div>
      );
    case "modal":
      return <ModalScene skeletonId={os("skeletonId") || "1"} />;
    case "tabs":
      return <TabsSkeleton skeletonId={os("skeletonId") || "1"} />;
    case "table":
      return <TableSkeleton skeletonId={os("skeletonId") || "1"} />;

    default:
      return <span className="text-[12px] text-fg-mute">No preview</span>;
  }
}

/* ── segmented selector shared by the top toolbar (variant + state) ── */

function ToolbarSegmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-fg-mute">
        {label}
      </span>
      <div className="inline-flex rounded-lg border border-line bg-ink-panel p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
              value === o.value ? "bg-fg text-ink" : "text-fg-mute hover:text-fg-dim"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── shared studio hooks ── */

function useStudioData(id: string) {
  const spec = COMPONENT_SPECS[id];
  const cfg = useDesignSystem((s) => s.components[id]);
  const bindings = useDesignSystem((s) => s.components[id]?.bindings);
  const setBinding = useDesignSystem((s) => s.setComponentBinding);
  const clearBinding = useDesignSystem((s) => s.clearComponentBinding);
  const resetAll = useDesignSystem((s) => s.resetComponentBindings);
  const setProperty = useDesignSystem((s) => s.setComponentProperty);
  const setSlotContent = useDesignSystem((s) => s.setSlotContent);
  const currentMode = useDesignSystem((s) => s.currentPreviewMode);
  const setPreviewMode = useDesignSystem((s) => s.setPreviewMode);
  const resolve = useComponentBindings(id);
  const data = useInspectorData();

  const properties = cfg?.properties;
  const instances = cfg?.instances;
  const size = (properties?.size as SizeToken) ?? "md";
  const radiusStep = Number(properties?.radiusStep ?? 2);
  const overrideCount = bindings ? Object.keys(bindings).length : 0;

  return {
    spec,
    cfg,
    bindings,
    setBinding,
    clearBinding,
    resetAll,
    setProperty,
    setSlotContent,
    currentMode,
    setPreviewMode,
    resolve,
    data,
    properties,
    instances,
    size,
    radiusStep,
    overrideCount,
  };
}

/* ── Cluster type shared between preview and controls ── */
export type Cluster = {
  key: string;
  title: string;
  count?: number;
  part: string | null;
  content: ReactNode;
};

/* ── preview component (hero + toolbar + strip) ── */

export function ComponentStudioPreview({
  id,
  hoveredPart,
  setHoveredPart,
}: {
  id: string;
  hoveredPart: string | null;
  setHoveredPart: (part: string | null) => void;
}) {
  const {
    spec,
    setProperty,
    currentMode: mode,
    setPreviewMode,
    resolve,
    size,
    radiusStep,
    overrideCount,
    resetAll,
    properties,
  } = useStudioData(id);

  const [activeState, setActiveState] = useState<CState>(spec?.states[0] ?? "default");
  const previewRef = useRef<HTMLDivElement>(null);
  const box = usePartBox(previewRef, hoveredPart);

  if (!spec) return null;

  const axis = previewAxis(id);
  const opts = resolveOptions(id, properties);
  const axisValue = axis ? (opts[axis.key] as string) : undefined;
  const multiState = spec.states.length > 1;
  const hoveredLabel = spec.parts.find((p) => p.id === hoveredPart)?.label ?? "";

  const hero = (st: CState, o: Record<string, string | boolean | number> = opts): ReactNode =>
    renderHero(id, { state: st, size, radiusStep, resolve, mode, opts: o });

  /* the clickable canvas strip: states for controls, variants for display */
  const stripItems: Array<{ key: string; label: string; node: ReactNode; active: boolean; onClick: () => void }> =
    multiState
      ? spec.states.map((st) => ({
          key: st,
          label: STATE_LABEL[st],
          node: hero(st),
          active: st === activeState,
          onClick: () => setActiveState(st),
        }))
      : axis
        ? (axis.options ?? []).map((c) => ({
            key: c.value,
            label: c.label,
            node: hero(activeState, { ...opts, [axis.key]: c.value } as Record<string, string | boolean | number>),
            active: c.value === axisValue,
            onClick: () => setProperty(id, axis.key, c.value),
          }))
        : [];

  const RING = "#0d99ff";

  const dotted = {
    backgroundImage: "radial-gradient(circle, rgb(var(--c-fg) / 0.07) 1px, transparent 1px)",
    backgroundSize: "16px 16px",
  } as const;

  return (
    <div>
      {/* top toolbar: variant · state · reset · light/dark */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {axis && axisValue ? (
          <ToolbarSegmented
            label={axis.label}
            options={(axis.options ?? []).map((c) => ({ value: c.value, label: c.label }))}
            value={axisValue}
            onChange={(v) => setProperty(id, axis.key, v)}
          />
        ) : null}

        {multiState ? (
          <ToolbarSegmented
            label="Editing"
            options={spec.states.map((s) => ({ value: s, label: STATE_LABEL[s] }))}
            value={activeState}
            onChange={setActiveState}
          />
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          {overrideCount > 0 ? (
            <button
              type="button"
              onClick={() => resetAll(id)}
              className="inline-flex items-center gap-1 rounded-md border border-line px-1.5 py-1 text-[10.5px] text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
            >
              <RotateCcw size={10} /> Reset all · {overrideCount}
            </button>
          ) : null}
          <div className="inline-flex rounded-lg border border-line bg-ink-panel p-0.5">
            {(["light", "dark"] as PreviewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-label={m}
                onClick={() => setPreviewMode(m)}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium capitalize transition-colors ${
                  mode === m ? "bg-fg text-ink" : "text-fg-mute hover:text-fg-dim"
                }`}
              >
                {m === "light" ? <Sun size={12} /> : <Moon size={12} />}
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* enlarged live preview — full canvas width */}
      <div className="rounded-2xl border border-line p-6" style={dotted}>
        <div className="flex items-center justify-center py-10">
          <div ref={previewRef} className="relative w-full">
            <ThemeFrame mode={mode} className="w-full">
              <div className="flex min-h-[240px] items-center justify-center p-10">
                {hero(activeState)}
              </div>
            </ThemeFrame>

            {/* hover-highlight overlay: rings the part named by the hovered cluster */}
            <div className="pointer-events-none absolute inset-0 z-20">
              <div
                className="absolute rounded-md"
                style={{
                  top: (box?.top ?? 0) - 5,
                  left: (box?.left ?? 0) - 5,
                  width: (box?.width ?? 0) + 10,
                  height: (box?.height ?? 0) + 10,
                  boxShadow: `0 0 0 2px ${RING}`,
                  background: `${RING}14`,
                  opacity: box ? 1 : 0,
                  transition: "opacity 120ms ease-out",
                }}
              />
              {box ? (
                <span
                  className="absolute -translate-y-full whitespace-nowrap rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold text-white"
                  style={{ top: box.top - 7, left: box.left - 5, background: RING }}
                >
                  {hoveredLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {stripItems.length > 0 ? (
          <div className="mt-6 border-t border-line pt-4">
            <div className="mb-3 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-fg-mute">
              {multiState ? "Interaction states — click to edit" : `${axis?.label ?? "Variants"} — click to preview`}
            </div>
            <ThemeFrame mode={mode}>
              <div className="flex flex-wrap items-start gap-x-8 gap-y-5 p-5">
                {stripItems.map((it) => (
                  <div
                    key={it.key}
                    role="button"
                    tabIndex={0}
                    onClick={it.onClick}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        it.onClick();
                      }
                    }}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                      it.active
                        ? "border-line-strong bg-ink-panel/60"
                        : "border-transparent hover:border-line"
                    }`}
                  >
                    {it.node}
                    <span className={`text-[10px] ${it.active ? "text-fg" : "text-fg-mute"}`}>
                      {it.label}
                    </span>
                  </div>
                ))}
              </div>
            </ThemeFrame>
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { useEffect } from "react";

/* ── figma-style scrubbable numeric input ── */

export function ScrubberInput({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  unit = "",
  icon,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
  unit?: string;
  icon?: ReactNode;
}) {
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startValue = value;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // sensitivity: 1px of drag = 0.25 of step units
      const deltaValue = Math.round((deltaX * 0.25) / step) * step;
      const newValue = Math.min(max, Math.max(min, startValue + deltaValue));
      onChange(newValue);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
    };

    document.body.style.cursor = "ew-resize";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleBlur = () => {
    const num = parseFloat(inputValue);
    if (!isNaN(num)) {
      const newValue = Math.min(max, Math.max(min, num));
      onChange(newValue);
    } else {
      setInputValue(String(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  // Map label to Figma-like icons
  let resolvedIcon: ReactNode = icon;
  if (!resolvedIcon && label) {
    const l = label.toLowerCase();
    if (l.includes("radius")) resolvedIcon = <CornerUpRight size={11} className="text-fg-mute" />;
    else if (l.includes("border") || l.includes("thickness")) resolvedIcon = <Square size={11} className="text-fg-mute" />;
    else if (l.includes("opacity")) resolvedIcon = <Eye size={11} className="text-fg-mute" />;
    else if (l.includes("paddingh") || l.includes("padding · horizontal") || l.includes("horizontal")) resolvedIcon = <ArrowLeftRight size={11} className="text-fg-mute" />;
    else if (l.includes("paddingv") || l.includes("padding · vertical") || l.includes("vertical")) resolvedIcon = <ArrowUpDown size={11} className="text-fg-mute" />;
  }

  const shorthandLabel = label.replace(/Modal size \/ width|Backdrop opacity|Elevation shadow|Border thickness|Corner radius|Body text description|Primary action text|Secondary action text/gi, (m) => {
    if (/width/i.test(m)) return "W";
    if (/opacity/i.test(m)) return "Opacity";
    if (/shadow/i.test(m)) return "Shadow";
    if (/thickness/i.test(m)) return "Border";
    if (/radius/i.test(m)) return "Radius";
    if (/text/i.test(m)) return "Text";
    if (/primary/i.test(m)) return "Primary";
    if (/secondary/i.test(m)) return "Cancel";
    return m;
  });

  return (
    <div className="flex h-7 items-center justify-between rounded-lg border border-line bg-ink px-2 py-0.5 transition-colors focus-within:border-focus hover:border-line-strong">
      {resolvedIcon ? (
        <span
          onMouseDown={handleMouseDown}
          className="cursor-ew-resize select-none flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-fg-mute hover:text-fg mr-1 shrink-0"
          title={`Drag to slide: ${label}`}
        >
          {resolvedIcon}
          <span className="text-[8px] font-medium text-fg-mute">{shorthandLabel.substring(0, 3)}</span>
        </span>
      ) : label ? (
        <span
          onMouseDown={handleMouseDown}
          className="cursor-ew-resize select-none text-[9px] font-bold uppercase tracking-wide text-fg-mute hover:text-fg mr-1 shrink-0"
          title="Drag to slide value"
        >
          {shorthandLabel}
        </span>
      ) : (
        <span
          onMouseDown={handleMouseDown}
          className="cursor-ew-resize select-none text-[10px] text-fg-mute hover:text-fg mr-1 shrink-0"
          title="Drag to slide value"
        >
          ↔
        </span>
      )}
      <div className="flex items-center gap-0.5 min-w-0 flex-1 justify-end">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-right font-mono text-[10.5px] text-fg focus:outline-none"
        />
        {unit ? (
          <span className="text-[9px] text-fg-mute font-mono shrink-0 ml-0.5">{unit}</span>
        ) : null}
      </div>
    </div>
  );
}

/* ── styled compact dropdown menu selector ── */

export function CompactSelect({
  options,
  value,
  onChange,
  className = "w-28",
}: {
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-full appearance-none rounded-lg border border-line bg-ink pl-2.5 pr-7 text-left font-mono text-[10.5px] text-fg hover:border-line-strong focus:border-focus focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-fg-mute font-mono">
        ▼
      </span>
    </div>
  );
}

/* ── compact icon segmented control ── */

export function IconSegmented({
  options,
  value,
  onChange,
}: {
  options: Array<{ label: string; value: string; icon?: ReactNode }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex w-full rounded-lg border border-line bg-ink p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            title={o.label}
            onClick={() => onChange(o.value)}
            className={`flex-1 flex h-6 items-center justify-center rounded-md px-2.5 transition-colors ${
              active
                ? "bg-line-strong text-fg"
                : "text-fg-mute hover:bg-surface-subtle hover:text-fg"
            }`}
          >
            {o.icon ? o.icon : <span className="text-[10px] font-medium">{o.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

const getEnumIcon = (key: string, value: string): ReactNode | null => {
  if (key === "align") {
    if (value === "left") return <AlignLeft size={11} />;
    if (value === "center") return <AlignCenter size={11} />;
  }
  if (key === "position") {
    if (value === "top") return <ArrowUpToLine size={11} />;
    if (value === "center") return <AlignCenter size={11} />;
    if (value === "bottom") return <ArrowDownToLine size={11} />;
  }
  return null;
};

/* ── controls component (all clusters, for the right inspector pane) ── */

export function ComponentStudioControls({
  id,
  hoveredPart,
  setHoveredPart,
}: {
  id: string;
  hoveredPart: string | null;
  setHoveredPart: (part: string | null) => void;
}) {
  const {
    spec,
    bindings,
    setBinding,
    clearBinding,
    setProperty,
    setSlotContent,
    resolve,
    data,
    properties,
    instances,
    size,
  } = useStudioData(id);

  const [activeState] = useState<CState>(spec?.states[0] ?? "default");

  if (!spec) return null;

  const opts = resolveOptions(id, properties);
  const options = componentOptions(id).filter((o) => !o.previewAxis);

  const COLOR_KEYS = new Set([
    "container.bg",
    "container.border",
    "label.color",
    "prefixIcon.color",
    "suffixIcon.color",
  ]);

  const getCurrentBindingForProp = (prop: PropSpec, st?: CState) => {
    const activeVariant = opts.variant as string ?? "filled";
    const isVariantColorProp = (id === "button" && activeVariant !== "filled" && COLOR_KEYS.has(prop.key));
    const propKey = bindingKey(prop.key, st);

    if (isVariantColorProp) {
      const variantStorageKey = `${activeVariant}.${propKey}`;
      const stored = bindings?.[variantStorageKey];
      if (stored) {
        return { binding: stored, overridden: true, storageKey: variantStorageKey };
      }
      // Return variant-specific default binding
      let def = "raw:transparent";
      if (prop.key === "container.bg") {
        if (activeVariant === "tonal") def = "role:surface-subtle";
        else if (activeVariant === "elevated") def = "role:surface-elevated";
        else if (activeVariant === "error") def = "role:feedback-error-text";
        else if (activeVariant === "warning") def = "role:feedback-warning-text";
        else if (activeVariant === "success") def = "role:feedback-success-text";
        else def = "raw:transparent";
      } else if (prop.key === "container.border") {
        if (activeVariant === "outlined") def = "role:border-default";
        else def = "raw:transparent";
      } else if (prop.key === "label.color" || prop.key === "prefixIcon.color" || prop.key === "suffixIcon.color") {
        if (activeVariant === "tonal") def = "role:text-secondary";
        else if (activeVariant === "error" || activeVariant === "warning" || activeVariant === "success") def = "role:text-on-action";
        else def = "role:action-primary-default";
      }
      return { binding: def, overridden: false, storageKey: variantStorageKey };
    }

    if (bindings && bindings[propKey]) {
      return { binding: bindings[propKey], overridden: true, storageKey: propKey };
    }
    return { binding: defBinding(prop, st), overridden: false, storageKey: propKey };
  };

  /* compact vertical stacked row for part properties with figma-style icons */
  const renderPropRow = (prop: PropSpec): ReactNode => {
    const st = prop.stateful ? activeState : undefined;
    const { binding, overridden, storageKey } = getCurrentBindingForProp(prop, activeState);
    const key = storageKey;
    const propStates = prop.states ?? spec.states;
    const activeVariant = opts.variant as string ?? "filled";
    const isVariantColorProp = (id === "button" && activeVariant !== "filled" && COLOR_KEYS.has(prop.key));

    let control: ReactNode;
    if (prop.type === "color") {
      let counterpartHex: string | undefined;
      let counterpartLabel: string | undefined;
      if (prop.contrastAgainst) {
        const counterpartPropSpec = spec.parts.flatMap(p => p.props).find(pr => pr.key === prop.contrastAgainst);
        if (counterpartPropSpec) {
          const { binding: counterpartBinding } = getCurrentBindingForProp(counterpartPropSpec, activeState);
          counterpartHex = data.swatch(counterpartBinding);
          counterpartLabel = counterpartPropSpec.label;
        }
      }
      const contrastContext = (prop.key.includes("label") || prop.key.includes("text") || prop.key.includes("value")) ? "text-normal" : "ui-component";

      control = (
        <TokenSwatchCard
          data={data}
          binding={binding}
          onPick={(b) => setBinding(id, key, b)}
          align="right"
          contrastAgainstHex={counterpartHex}
          contrastAgainstLabel={counterpartLabel}
          contrastContext={contrastContext}
        />
      );
    } else if (prop.type === "space") {
      const spaceOpts = data.spaceOptions;
      const idx = Math.min(
        Math.max(binding.startsWith("space:") ? Number(binding.slice(6)) - 1 : 0, 0),
        spaceOpts.length - 1
      );
      control = (
        <CompactSelect
          options={spaceOpts.map((o) => ({
            label: o.label.split(" · ")[0],
            value: o.value,
          }))}
          value={`space:${idx + 1}`}
          onChange={(v) => setBinding(id, key, v)}
          className="w-full"
        />
      );
    } else if (prop.type === "dimension") {
      const n = binding.startsWith("px:") ? Number(binding.slice(3)) : Number(binding) || 0;
      control = (
        <ScrubberInput
          label=""
          value={n}
          min={prop.min ?? 0}
          max={prop.max ?? 64}
          step={1}
          onChange={(v) => setBinding(id, key, `px:${v}`)}
          unit="px"
        />
      );
    } else {
      const scaleOpts =
        prop.type === "radius"
          ? data.radiusOptions
          : prop.type === "textSize"
            ? data.textOptions
            : prop.type === "weight"
              ? data.weightOptions
              : data.fontOptions;
      control = (
        <CompactSelect
          options={scaleOpts}
          value={binding}
          onChange={(v) => setBinding(id, key, v)}
          className="w-full"
        />
      );
    }

    const getPropIcon = (kKey: string): ReactNode => {
      const k = kKey.toLowerCase();
      if (k.endsWith(".bg") || k.includes("bg") || k.includes("color")) {
        return <Paintbrush size={10} className="text-fg-mute" />;
      }
      if (k.includes("radius")) {
        return <CornerUpRight size={10} className="text-fg-mute" />;
      }
      if (k.includes("border") || k.includes("thickness")) {
        return <Square size={10} className="text-fg-mute" />;
      }
      if (k.includes("pad") || k.includes("space")) {
        return <Sliders size={10} className="text-fg-mute" />;
      }
      if (k.includes("font") || k.includes("text") || k.includes("size") || k.includes("weight")) {
        return <Type size={10} className="text-fg-mute" />;
      }
      return <Sliders size={10} className="text-fg-mute" />;
    };

    return (
      <div key={key} className="flex flex-col gap-1 min-w-0 pb-1">
        <div className="flex items-center justify-between text-[9px] text-fg-mute font-semibold uppercase tracking-wider min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {getPropIcon(prop.key)}
            <span className="truncate" title={prop.label}>{prop.label}</span>
          </div>
          {overridden && (
            <button
              type="button"
              title="Reset to default"
              onClick={() => clearBinding(id, key)}
              className="rounded p-0.5 text-fg-mute transition-colors hover:text-fg shrink-0"
            >
              <RotateCcw size={9} />
            </button>
          )}
        </div>
        <div className="w-full">
          {control}
          {prop.type === "color" && prop.stateful && propStates.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                for (const s of propStates) {
                  const targetKey = isVariantColorProp ? `${activeVariant}.${bindingKey(prop.key, s)}` : bindingKey(prop.key, s);
                  setBinding(id, targetKey, binding);
                }
              }}
              className="block mt-0.5 text-[8px] text-fg-mute text-right underline decoration-dotted underline-offset-2 hover:text-fg-dim"
            >
              apply to all states
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const hasOptionsSection = options.length > 0 || SIZABLE.has(id);

  /* build clusters */
  const clusters: Cluster[] = [];
  if (hasOptionsSection) {
    // split options by type for compact grouped layout
    const numOpts = options.filter((o) => o.type === "number");
    const boolOpts = options.filter((o) => o.type === "boolean");
    const textOpts = options.filter((o) => o.type === "text");
    const colorOpts = options.filter((o) => o.type === "color");
    const enumOpts = options.filter((o) => o.type !== "number" && o.type !== "boolean" && o.type !== "text" && o.type !== "color");

    // Group alignments and position if both exist
    const hasAlign = enumOpts.some((o) => o.key === "align");
    const hasPosition = enumOpts.some((o) => o.key === "position");
    const filteredEnumOpts = enumOpts.filter((o) => o.key !== "align" && o.key !== "position");

    // Number option pairing
    const pairedNumKeys = new Set<string>();
    const numPairs: ReactNode[] = [];

    const radiusOpt = numOpts.find((o) => o.key === "radius");
    const borderOpt = numOpts.find((o) => o.key === "borderWidth");
    if (radiusOpt && borderOpt) {
      pairedNumKeys.add("radius");
      pairedNumKeys.add("borderWidth");
      numPairs.push(
        <div key="radius-border" className="grid grid-cols-2 gap-2">
          <ScrubberInput
            label={radiusOpt.label}
            value={opts.radius as number ?? radiusOpt.def as number}
            min={radiusOpt.min}
            max={radiusOpt.max}
            onChange={(v) => setProperty(id, "radius", v)}
          />
          <ScrubberInput
            label={borderOpt.label}
            value={opts.borderWidth as number ?? borderOpt.def as number}
            min={borderOpt.min}
            max={borderOpt.max}
            onChange={(v) => setProperty(id, "borderWidth", v)}
          />
        </div>
      );
    }

    const padHOpt = numOpts.find((o) => o.key === "paddingH");
    const padVOpt = numOpts.find((o) => o.key === "paddingV");
    if (padHOpt && padVOpt) {
      pairedNumKeys.add("paddingH");
      pairedNumKeys.add("paddingV");
      numPairs.push(
        <div key="padding-hv" className="grid grid-cols-2 gap-2">
          <ScrubberInput
            label={padHOpt.label}
            value={opts.paddingH as number ?? padHOpt.def as number}
            min={padHOpt.min}
            max={padHOpt.max}
            onChange={(v) => setProperty(id, "paddingH", v)}
          />
          <ScrubberInput
            label={padVOpt.label}
            value={opts.paddingV as number ?? padVOpt.def as number}
            min={padVOpt.min}
            max={padVOpt.max}
            onChange={(v) => setProperty(id, "paddingV", v)}
          />
        </div>
      );
    }

    const remainingNumOpts = numOpts.filter((o) => !pairedNumKeys.has(o.key));

    clusters.push({
      key: "options",
      title: "Options",
      part: null,
      content: (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {/* Size segmented option */}
          {SIZABLE.has(id) && (
            <div className="col-span-2 flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[10px] text-fg-mute font-semibold uppercase tracking-wider">
                <Sliders size={10} />
                <span>Size</span>
              </div>
              <TokenSegmented
                options={SIZE_OPTIONS}
                value={size}
                onChange={(v) => setProperty(id, "size", v)}
              />
            </div>
          )}

          {/* Alignment & Position Row */}
          {(hasAlign || hasPosition) && (
            <div className="col-span-2 grid grid-cols-2 gap-3">
              {hasAlign && (
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[9.5px] text-fg-mute font-semibold uppercase tracking-wider flex items-center gap-1">
                    <AlignLeft size={10} />
                    <span>Text Align</span>
                  </span>
                  <IconSegmented
                    options={[
                      { label: "Left", value: "left", icon: <AlignLeft size={11} /> },
                      { label: "Center", value: "center", icon: <AlignCenter size={11} /> },
                    ]}
                    value={opts.align as string ?? "left"}
                    onChange={(v) => setProperty(id, "align", v)}
                  />
                </div>
              )}
              {hasPosition && (
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[9.5px] text-fg-mute font-semibold uppercase tracking-wider flex items-center gap-1">
                    <ArrowUpToLine size={10} />
                    <span>Positioning</span>
                  </span>
                  <IconSegmented
                    options={[
                      { label: "Top", value: "top", icon: <ArrowUpToLine size={11} /> },
                      { label: "Center", value: "center", icon: <AlignCenter size={11} /> },
                      { label: "Bottom", value: "bottom", icon: <ArrowDownToLine size={11} /> },
                    ]}
                    value={opts.position as string ?? "center"}
                    onChange={(v) => setProperty(id, "position", v)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Remaining Enum options */}
          {filteredEnumOpts.map((o) => {
            const val = opts[o.key] as string;
            const choices = o.options ?? [];
            const hasIcons = choices.every((c) => !!getEnumIcon(o.key, c.value));
            return (
              <div key={o.key} className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] text-fg-mute font-semibold uppercase tracking-wider flex items-center gap-1 truncate" title={o.label}>
                  <Sliders size={10} />
                  <span>{o.label}</span>
                </span>
                {hasIcons ? (
                  <IconSegmented
                    options={choices.map((c) => ({
                      label: c.label,
                      value: c.value,
                      icon: getEnumIcon(o.key, c.value) || undefined,
                    }))}
                    value={val}
                    onChange={(v) => setProperty(id, o.key, v)}
                  />
                ) : choices.length <= 3 ? (
                  <TokenSegmented
                    options={choices.map((c) => ({ label: c.label, value: c.value }))}
                    value={val}
                    onChange={(v) => setProperty(id, o.key, v)}
                  />
                ) : (
                  <CompactSelect
                    options={choices.map((c) => ({ label: c.label, value: c.value }))}
                    value={val}
                    onChange={(v) => setProperty(id, o.key, v)}
                    className="w-full"
                  />
                )}
              </div>
            );
          })}

          {/* Paired Numeric settings */}
          {numPairs.length > 0 && (
            <div className="col-span-2 grid grid-cols-2 gap-2">
              {numPairs}
            </div>
          )}

          {/* Remaining Number options */}
          {remainingNumOpts.length > 0 && (
            <div className="col-span-2 grid grid-cols-2 gap-2">
              {remainingNumOpts.map((o) => {
                const val = opts[o.key] as number;
                return (
                  <ScrubberInput
                    key={o.key}
                    label={o.label}
                    value={val}
                    min={o.min ?? 0}
                    max={o.max ?? 100}
                    onChange={(v) => setProperty(id, o.key, v)}
                  />
                );
              })}
            </div>
          )}

          {/* Boolean switch options in 2-column grid */}
          {boolOpts.length > 0 && (
            <div className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-2">
              {boolOpts.map((o) => {
                const val = opts[o.key] as boolean;
                return (
                  <div key={o.key} className="flex items-center justify-between text-[11px] gap-2 h-7 rounded-lg border border-line bg-ink px-2">
                    <span className="text-fg-dim font-medium truncate" title={o.label}>{o.label}</span>
                    <OptionToggle value={val} onChange={(v) => setProperty(id, o.key, v)} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Color inputs */}
          {colorOpts.map((o) => {
            const val = opts[o.key] as string;
            return (
              <div key={o.key} className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] text-fg-mute font-semibold uppercase tracking-wider flex items-center gap-1 truncate" title={o.label}>
                  <Paintbrush size={10} />
                  <span>{o.label}</span>
                </span>
                <HexInput value={val} onChange={(v) => setProperty(id, o.key, v)} size="sm" />
              </div>
            );
          })}

          {/* Inline Text options */}
          {textOpts.map((o) => {
            const val = (opts[o.key] as string) ?? "";
            const sizeKey = `${o.key}.size`;
            // Default size mappings depending on key name
            const defaultSize = o.key.includes("title") ? "xl" : o.key.includes("subtitle") ? "sm" : o.key.includes("body") ? "base" : "base";
            const sizeVal = (opts[sizeKey] as string) ?? defaultSize;

            return (
              <div key={o.key} className="col-span-2 flex flex-col gap-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] text-fg-mute font-semibold uppercase tracking-wider flex items-center gap-1 truncate" title={o.label}>
                    <Type size={10} />
                    <span>{o.label}</span>
                  </span>
                  <span className="text-[9px] uppercase tracking-wide text-fg-mute font-semibold">Scale Step</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setProperty(id, o.key, e.target.value)}
                    className="flex-1 h-7 rounded-md border border-line bg-ink px-2.5 py-1 text-[11px] text-fg focus:border-focus focus:outline-none font-mono"
                  />
                  <select
                    value={sizeVal}
                    onChange={(e) => setProperty(id, sizeKey, e.target.value)}
                    className="w-20 h-7 rounded-md border border-line bg-ink px-1.5 py-0.5 text-[11px] text-fg focus:border-focus focus:outline-none font-mono bg-ink-panel cursor-pointer"
                  >
                    {["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"].map((step) => (
                      <option key={step} value={step}>
                        {step}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      ),
    });
  }

  for (const part of spec.parts) {
    clusters.push({
      key: part.id,
      title: part.label,
      count: part.props.length,
      part: part.id,
      content: (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          {part.props.map(renderPropRow)}
        </div>
      ),
    });
  }

  if (spec.slots && spec.slots.length > 0) {
    for (const slot of spec.slots) {
      const childSpec = COMPONENT_SPECS[slot.componentId];
      if (!childSpec) continue;

      const slotOptions = slot.content;
      const numOpts = slotOptions.filter((o) => o.type === "number");
      const boolOpts = slotOptions.filter((o) => o.type === "boolean");
      const textOpts = slotOptions.filter((o) => o.type === "text");
      const colorOpts = slotOptions.filter((o) => o.type === "color"); // should stay empty per the hard rule in §3.1
      const enumOpts = slotOptions.filter(
        (o) => o.type !== "number" && o.type !== "boolean" && o.type !== "text" && o.type !== "color"
      );

      const getSlotVal = (key: string, def: string | boolean | number) => {
        const stored = instances?.[slot.id]?.[key];
        return typeof stored !== "undefined" ? stored : def;
      };

      clusters.push({
        key: `slot.${slot.id}.content`,
        title: `${slot.label} — ${childSpec.id}`,
        part: null,
        content: (
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {enumOpts.map((o) => {
              const val = getSlotVal(o.key, o.def) as string;
              const choices = o.options ?? [];
              return (
                <div key={o.key} className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] text-fg-mute font-semibold uppercase tracking-wider flex items-center gap-1 truncate" title={o.label}>
                    <Sliders size={10} />
                    <span>{o.label}</span>
                  </span>
                  {choices.length <= 3 ? (
                    <TokenSegmented
                      options={choices.map((c) => ({ label: c.label, value: c.value }))}
                      value={val}
                      onChange={(v) => setSlotContent(id, slot.id, o.key, v)}
                    />
                  ) : (
                    <CompactSelect
                      options={choices.map((c) => ({ label: c.label, value: c.value }))}
                      value={val}
                      onChange={(v) => setSlotContent(id, slot.id, o.key, v)}
                      className="w-full"
                    />
                  )}
                </div>
              );
            })}

            {boolOpts.length > 0 && (
              <div className="col-span-2 grid grid-cols-2 gap-x-4 gap-y-2">
                {boolOpts.map((o) => {
                  const val = getSlotVal(o.key, o.def) as boolean;
                  return (
                    <div key={o.key} className="flex items-center justify-between text-[11px] gap-2 h-7 rounded-lg border border-line bg-ink px-2">
                      <span className="text-fg-dim font-medium truncate" title={o.label}>{o.label}</span>
                      <OptionToggle value={val} onChange={(v) => setSlotContent(id, slot.id, o.key, v)} />
                    </div>
                  );
                })}
              </div>
            )}

            {numOpts.length > 0 && (
              <div className="col-span-2 grid grid-cols-2 gap-2">
                {numOpts.map((o) => {
                  const val = getSlotVal(o.key, o.def) as number;
                  return (
                    <ScrubberInput
                      key={o.key}
                      label={o.label}
                      value={val}
                      min={o.min ?? 0}
                      max={o.max ?? 100}
                      onChange={(v) => setSlotContent(id, slot.id, o.key, v)}
                    />
                  );
                })}
              </div>
            )}

            {colorOpts.map((o) => {
              const val = getSlotVal(o.key, o.def) as string;
              return (
                <div key={o.key} className="flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] text-fg-mute font-semibold uppercase tracking-wider flex items-center gap-1 truncate" title={o.label}>
                    <Paintbrush size={10} />
                    <span>{o.label}</span>
                  </span>
                  <HexInput value={val} onChange={(v) => setSlotContent(id, slot.id, o.key, v)} size="sm" />
                </div>
              );
            })}

            {textOpts.length > 0 && (
              <div className="col-span-2 flex flex-col gap-1">
                {textOpts.map((o) => {
                  const val = getSlotVal(o.key, o.def) as string;
                  return (
                    <div key={o.key} className="flex flex-col gap-1">
                      <span className="text-[10px] text-fg-mute font-semibold uppercase tracking-wider flex items-center gap-1 truncate" title={o.label}>
                        <Type size={10} />
                        <span>{o.label}</span>
                      </span>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => setSlotContent(id, slot.id, o.key, e.target.value)}
                        className="w-full h-7 rounded-md border border-line bg-ink px-2.5 py-1 text-[11px] text-fg focus:border-focus focus:outline-none font-mono"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ),
      });
    }
  } else if (spec.children && spec.children.length > 0) {
    for (const childId of spec.children) {
      const childSpec = COMPONENT_SPECS[childId];
      if (!childSpec) continue;

      const childOptions = childSpec.options?.filter((o) => !o.previewAxis) ?? [];
      const hasChildSize = SIZABLE.has(childId);
      const hasChildOptions = childOptions.length > 0 || hasChildSize;

      if (!hasChildOptions) continue;

      const numOpts = childOptions.filter((o) => o.type === "number");
      const boolOpts = childOptions.filter((o) => o.type === "boolean");
      const textOpts = childOptions.filter((o) => o.type === "text");
      const colorOpts = childOptions.filter((o) => o.type === "color");
      const enumOpts = childOptions.filter((o) => o.type !== "number" && o.type !== "boolean" && o.type !== "text" && o.type !== "color");

      const getChildPropVal = (key: string, def: string | boolean | number) => {
        const fullKey = `${childId}.${key}`;
        const val = properties?.[fullKey];
        if (typeof val !== "undefined") return val;
        return def;
      };

      const childSizeVal = getChildPropVal("size", "sm") as SizeToken;

      // Clean label (e.g. primaryButton -> Primary Button, iconButton -> Icon Button)
      let childTitle = childId;
      if (childId === "primaryButton") childTitle = "Primary Button";
      else if (childId === "secondaryButton") childTitle = "Secondary Button";
      else if (childId === "iconButton") childTitle = "Icon Button";
      else childTitle = childId.charAt(0).toUpperCase() + childId.slice(1);

      clusters.push({
        key: `child.${childId}.options`,
        title: `${childTitle} Options`,
        part: null,
        content: (
          <div className="space-y-2">
            {/* Size & Enum options (Variant) side-by-side */}
            {(hasChildSize || enumOpts.length > 0) && (
              <div className="flex items-center justify-between gap-3 py-1 border-b border-line pb-2">
                {hasChildSize && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-fg-mute font-semibold uppercase tracking-wide">Size</span>
                    <TokenSegmented
                      options={SIZE_OPTIONS}
                      value={childSizeVal}
                      onChange={(v) => setProperty(id, `${childId}.size`, v)}
                    />
                  </div>
                )}
                {enumOpts.map((o) => {
                  const val = getChildPropVal(o.key, o.def) as string;
                  const choices = o.options ?? [];
                  return (
                    <div key={o.key} className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[10px] text-fg-mute font-semibold uppercase tracking-wide">{o.label}</span>
                      {choices.length <= 3 ? (
                        <TokenSegmented
                          options={choices.map((c) => ({ label: c.label, value: c.value }))}
                          value={val}
                          onChange={(v) => setProperty(id, `${childId}.${o.key}`, v)}
                        />
                      ) : (
                        <CompactSelect
                          options={choices.map((c) => ({ label: c.label, value: c.value }))}
                          value={val}
                          onChange={(v) => setProperty(id, `${childId}.${o.key}`, v)}
                          className="w-24"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Boolean switch options in 2-column grid */}
            {boolOpts.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-1.5 border-b border-line last:border-0 pb-2">
                {boolOpts.map((o) => {
                  const val = getChildPropVal(o.key, o.def) as boolean;
                  return (
                    <div key={o.key} className="flex items-center justify-between text-[11px] gap-2">
                      <span className="text-fg-dim font-medium truncate" title={o.label}>{o.label}</span>
                      <OptionToggle value={val} onChange={(v) => setProperty(id, `${childId}.${o.key}`, v)} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Number options grid */}
            {numOpts.length > 0 && (
              <div className="grid grid-cols-2 gap-2 py-1 border-b border-line last:border-0 pb-1.5">
                {numOpts.map((o) => {
                  const val = getChildPropVal(o.key, o.def) as number;
                  return (
                    <ScrubberInput
                      key={o.key}
                      label={o.label}
                      value={val}
                      min={o.min ?? 0}
                      max={o.max ?? 100}
                      onChange={(v) => setProperty(id, `${childId}.${o.key}`, v)}
                    />
                  );
                })}
              </div>
            )}

            {/* Color options */}
            {colorOpts.map((o) => {
              const val = getChildPropVal(o.key, o.def) as string;
              return (
                <div key={o.key} className="flex items-center justify-between py-1 border-b border-line last:border-0 pb-1.5">
                  <span className="text-[11px] text-fg-dim font-medium">{o.label}</span>
                  <HexInput value={val} onChange={(v) => setProperty(id, `${childId}.${o.key}`, v)} size="sm" />
                </div>
              );
            })}

            {/* Text options inline */}
            {textOpts.length > 0 && (
              <div className="space-y-1.5 py-1 last:border-0 pb-1">
                {textOpts.map((o) => {
                  const val = getChildPropVal(o.key, o.def) as string;
                  return (
                    <div key={o.key} className="flex items-center justify-between gap-3 py-1 border-b border-line last:border-0 pb-1.5">
                      <span className="text-[11px] text-fg-dim font-medium w-24 shrink-0 truncate">{o.label}</span>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => setProperty(id, `${childId}.${o.key}`, e.target.value)}
                        className="flex-1 rounded-md border border-line bg-ink px-2 py-1 text-[11px] text-fg focus:border-focus focus:outline-none font-mono text-right"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      });
    }
  }

  return (
    <div className="space-y-3">
      {clusters.map((c) => {
        const active = c.part != null && hoveredPart === c.part;
        return (
          <div
            key={c.key}
            onMouseEnter={() => c.part && setHoveredPart(c.part)}
            onMouseLeave={() =>
              c.part && hoveredPart === c.part && setHoveredPart(null)
            }
            className={`rounded-2xl border p-3 transition-colors ${
              active ? "border-line-strong bg-ink-panel" : "border-line bg-ink-panel/50"
            }`}
          >
            <div className="mb-2.5 flex items-center justify-between px-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-fg-dim">
                {c.title}
              </span>
              {c.count != null ? (
                <span className="font-mono text-[10px] text-fg-mute">{c.count}</span>
              ) : null}
            </div>
            <div className="space-y-1.5">{c.content}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── backward-compatible wrapper (kept for any legacy usage) ── */

export function ComponentStudio({ id }: { id: string }) {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  return (
    <div>
      <ComponentStudioPreview id={id} hoveredPart={hoveredPart} setHoveredPart={setHoveredPart} />
      <div className="mt-6">
        <ComponentStudioControls id={id} hoveredPart={hoveredPart} setHoveredPart={setHoveredPart} />
      </div>
    </div>
  );
}
