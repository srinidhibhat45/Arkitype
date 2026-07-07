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
import { Moon, RotateCcw, Sun } from "lucide-react";
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
  previewAxis,
  resolveOptions,
  useComponentBindings,
} from "@/lib/componentSchema";
import { useInspectorData } from "@/components/factory/studioShared";
import { usePartBox } from "@/components/factory/useHighlight";
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
];

/* ── one representative instance of a component, in one state/variant ── */

type HeroCtx = {
  state: CState;
  size: SizeToken;
  radiusStep: number;
  resolve: Resolver;
  mode: PreviewMode;
  opts: Record<string, string | boolean>;
};

function renderHero(id: string, ctx: HeroCtx): ReactNode {
  const { state, size, radiusStep, resolve, mode, opts } = ctx;
  const os = (k: string) => opts[k] as string;
  const ob = (k: string) => opts[k] as boolean;
  switch (id) {
    /* controls */
    case "button":
      return <TokenButton state={state} size={size} radiusStep={radiusStep} resolve={resolve} prefixIcon suffixIcon />;
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

/* ── the studio ── */

export function ComponentStudio({ id }: { id: string }) {
  const spec = COMPONENT_SPECS[id];
  const cfg = useDesignSystem((s) => s.components[id]);
  const bindings = useDesignSystem((s) => s.components[id]?.bindings);
  const setBinding = useDesignSystem((s) => s.setComponentBinding);
  const clearBinding = useDesignSystem((s) => s.clearComponentBinding);
  const resetAll = useDesignSystem((s) => s.resetComponentBindings);
  const setProperty = useDesignSystem((s) => s.setComponentProperty);
  const currentMode = useDesignSystem((s) => s.currentPreviewMode);
  const setPreviewMode = useDesignSystem((s) => s.setPreviewMode);
  const resolve = useComponentBindings(id);
  const data = useInspectorData();

  const properties = cfg?.properties;
  const size = (properties?.size as SizeToken) ?? "md";
  const radiusStep = Number(properties?.radiusStep ?? 2);
  const overrideCount = bindings ? Object.keys(bindings).length : 0;

  const [activeState, setActiveState] = useState<CState>(spec?.states[0] ?? "default");
  const mode = currentMode;

  // Hover-link: a parameter cluster names a schema part; the overlay measures
  // its `data-ark-part` box inside the preview and rings it.
  const previewRef = useRef<HTMLDivElement>(null);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const box = usePartBox(previewRef, hoveredPart);

  if (!spec) return null;

  const axis = previewAxis(id);
  const opts = resolveOptions(id, properties);
  const axisValue = axis ? (opts[axis.key] as string) : undefined;
  const options = componentOptions(id).filter((o) => !o.previewAxis);
  const multiState = spec.states.length > 1;
  const hoveredLabel = spec.parts.find((p) => p.id === hoveredPart)?.label ?? "";

  const hero = (st: CState, o: Record<string, string | boolean> = opts): ReactNode =>
    renderHero(id, { state: st, size, radiusStep, resolve, mode, opts: o });

  /* one card per schema property (colour / scale / space / dimension) */
  const renderPropCard = (prop: PropSpec): ReactNode => {
    const st = prop.stateful ? activeState : undefined;
    const key = bindingKey(prop.key, st);
    const { binding, overridden } = currentBinding(bindings, prop, activeState);
    const propStates = prop.states ?? spec.states;

    let control: ReactNode;
    if (prop.type === "color") {
      control = (
        <>
          <TokenSwatchCard data={data} binding={binding} onPick={(b) => setBinding(id, key, b)} />
          {prop.stateful && propStates.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                for (const s of propStates) setBinding(id, bindingKey(prop.key, s), binding);
              }}
              className="mt-1 text-[9.5px] text-fg-mute underline decoration-dotted underline-offset-2 hover:text-fg-dim"
            >
              apply to all states
            </button>
          ) : null}
        </>
      );
    } else if (prop.type === "space") {
      const spaceOpts = data.spaceOptions;
      const idx = Math.min(
        Math.max(binding.startsWith("space:") ? Number(binding.slice(6)) - 1 : 0, 0),
        spaceOpts.length - 1
      );
      control = (
        <TokenSlider
          value={idx}
          min={0}
          max={spaceOpts.length - 1}
          valueLabel={spaceOpts[idx]?.label ?? `space-${idx + 1}`}
          onChange={(v) => setBinding(id, key, `space:${v + 1}`)}
        />
      );
    } else if (prop.type === "dimension") {
      const n = binding.startsWith("px:") ? Number(binding.slice(3)) : Number(binding) || 0;
      control = (
        <TokenSlider
          value={n}
          min={prop.min ?? 0}
          max={prop.max ?? 64}
          valueLabel={`${n}px`}
          onChange={(v) => setBinding(id, key, `px:${v}`)}
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
        <TokenSegmented options={scaleOpts} value={binding} onChange={(v) => setBinding(id, key, v)} />
      );
    }

    return (
      <ParamCard
        key={key}
        label={prop.label}
        overridden={overridden}
        onReset={() => clearBinding(id, key)}
      >
        {control}
      </ParamCard>
    );
  };

  /* an Options-section control (functional choice, persisted to properties) */
  const renderOption = (o: OptionSpec): ReactNode => {
    const val = opts[o.key];
    if (o.type === "boolean") {
      return (
        <OptionRow key={o.key} label={o.label}>
          <OptionToggle value={val as boolean} onChange={(v) => setProperty(id, o.key, v)} />
        </OptionRow>
      );
    }
    return (
      <ParamCard key={o.key} label={o.label}>
        <TokenSegmented
          options={(o.options ?? []).map((c) => ({ label: c.label, value: c.value }))}
          value={val as string}
          onChange={(v) => setProperty(id, o.key, v)}
        />
      </ParamCard>
    );
  };

  const hasOptionsSection = options.length > 0 || SIZABLE.has(id);

  /* parameter clusters: an Options group (functional choices) plus one group per
     schema part. Each part cluster is a hover target that rings its region. */
  type Cluster = {
    key: string;
    title: string;
    count?: number;
    part: string | null;
    content: ReactNode;
  };
  const clusters: Cluster[] = [];
  if (hasOptionsSection) {
    clusters.push({
      key: "options",
      title: "Options",
      part: null,
      content: (
        <>
          {SIZABLE.has(id) ? (
            <ParamCard
              label="Size"
              overridden={size !== "md"}
              onReset={() => setProperty(id, "size", "md")}
            >
              <TokenSegmented
                options={SIZE_OPTIONS}
                value={size}
                onChange={(v) => setProperty(id, "size", v)}
              />
            </ParamCard>
          ) : null}
          {options.map(renderOption)}
        </>
      ),
    });
  }
  for (const part of spec.parts) {
    clusters.push({
      key: part.id,
      title: part.label,
      count: part.props.length,
      part: part.id,
      content: <>{part.props.map(renderPropCard)}</>,
    });
  }

  // Flank the preview with two rails when there are enough clusters; otherwise
  // dock a single rail beside it. Either way each cluster keeps its hover-link.
  const dualRail = clusters.length >= 3;
  const leftClusters = dualRail ? clusters.filter((_, i) => i % 2 === 0) : [];
  const rightClusters = dualRail ? clusters.filter((_, i) => i % 2 === 1) : clusters;

  const renderCluster = (c: Cluster): ReactNode => {
    const active = c.part != null && hoveredPart === c.part;
    return (
      <div
        key={c.key}
        onMouseEnter={() => c.part && setHoveredPart(c.part)}
        onMouseLeave={() =>
          c.part && setHoveredPart((h) => (h === c.part ? null : h))
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
        <div className="space-y-2.5">{c.content}</div>
      </div>
    );
  };

  const RING = "#0d99ff"; // selection-blue ring; reads on light + dark previews

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
            node: hero(activeState, { ...opts, [axis.key]: c.value }),
            active: c.value === axisValue,
            onClick: () => setProperty(id, axis.key, c.value),
          }))
        : [];

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

      {/* grouped clusters flanking the live preview */}
      <div className="studio-scope">
        <div className={`studio-grid ${dualRail ? "cols-3" : "cols-2"}`}>
          {dualRail ? (
            <div className="studio-left space-y-4">
              {leftClusters.map(renderCluster)}
            </div>
          ) : null}

          <div className="studio-canvas">
            <div className="rounded-2xl border border-line p-5" style={dotted}>
              <div className="flex items-center justify-center py-8">
                <div ref={previewRef} className="relative w-full max-w-lg">
                  <ThemeFrame mode={mode} className="w-full">
                    <div className="flex min-h-[180px] items-center justify-center p-10">
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
                        // Fade only — snapping geometry avoids a fly-in from the corner.
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

          <div className="studio-right space-y-4">
            {rightClusters.map(renderCluster)}
          </div>
        </div>
      </div>
    </div>
  );
}
