"use client";

/**
 * The Tabs Cluster — fully customizable tabs view.
 * Renders Standard Underline, Contained Pills, Segmented Matrix, or Vertical Sidebar Stack
 * based on selected skeletonId, styled dynamically via properties from the store.
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { useDesignSystem, PreviewMode } from "@/store/useDesignSystem";
import { resolveOptions, useComponentBindings, createChildResolver, Resolver } from "@/lib/componentSchema";
import { sv, tv } from "@/lib/tokens";
import { TokenBadge } from "./DisplayComponents";
import { TokenButton, TokenInput, TokenAlert } from "./CoreComponents";
import { TokenSearchField, TokenStepper } from "./FormControls";

export const TABS_SKELETONS = [
  { id: "1", name: "Standard Underline", desc: "Border-base indicator beneath labels" },
  { id: "2", name: "Contained Pills", desc: "Isolated solid capsules, high contrast" },
  { id: "3", name: "Segmented Matrix", desc: "Equal-width blocks in a bounded box" },
  { id: "4", name: "Vertical Sidebar Stack", desc: "Left-aligned structural anchors" },
] as const;

const DEFAULT_TABS = ["Overview", "Allocations", "Forecast", "Audit"];

interface TabsResolvedOpts {
  radius: number;
  borderWidth: number;
  padding: number;
  showIcons: boolean;
  skeletonId: string;
}

function useResolvedTabsOptions(): TabsResolvedOpts {
  const cfg = useDesignSystem((s) => s.components.tabs);
  const opts = resolveOptions("tabs", cfg?.properties);
  return {
    radius: Number(opts.radius ?? 6),
    borderWidth: Number(opts.borderWidth ?? 1),
    padding: Number(opts.padding ?? 8),
    showIcons: opts.showIcons !== false,
    skeletonId: (cfg?.skeletonId ?? "1") as string,
  };
}

function PanelBody({
  active,
  mode,
  childButtonResolve,
  childInputResolve,
  childAlertResolve,
  childSearchFieldResolve,
  childStepperResolve,
  parentProperties,
  parentInstances,
}: {
  active: string;
  mode: PreviewMode;
  childButtonResolve: Resolver;
  childInputResolve: Resolver;
  childAlertResolve: Resolver;
  childSearchFieldResolve: Resolver;
  childStepperResolve: Resolver;
  parentProperties?: Record<string, any>;
  parentInstances?: Record<string, any>;
}) {
  const panelActionOpts = parentInstances?.panelAction ?? {};
  const btnSize = (panelActionOpts.size as any) ?? "sm";
  const btnVariant = (panelActionOpts.variant as any) ?? "filled";
  const btnPrefix = (panelActionOpts.prefixIcon as string) ?? "add";
  const btnSuffix = (panelActionOpts.suffixIcon as string) ?? "";
  const btnLabel = (panelActionOpts.label as string) ?? "Create new";

  const inputSize = (parentProperties?.["input.size"] as any) ?? "sm";
  const searchSize = (parentProperties?.["searchField.size"] as any) ?? "sm";
  const stepperSize = (parentProperties?.["stepper.size"] as any) ?? "sm";

  const alertVariant = (parentProperties?.["alert.variant"] as any) ?? "warning";
  const alertStyle = (parentProperties?.["alert.style"] as any) ?? "subtle";
  const alertAccent = (parentProperties?.["alert.accent"] as any) ?? "left";
  const alertIcon = parentProperties?.["alert.icon"] !== false;

  return (
    <div
      style={{
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <span
        style={{
          color: tv("text-primary"),
          fontSize: "var(--ark-text-sm)",
          fontWeight: 700,
        }}
      >
        {active} panel
      </span>
      
      {active === "Overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <TokenSearchField state="active" value="Marketing" placeholder="Search allocations..." size={searchSize} resolve={childSearchFieldResolve} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ flex: 1 }}>
              <TokenInput state="active" value="DEPT-402" placeholder="Department code (e.g. DEPT-402)" size={inputSize} resolve={childInputResolve} />
            </div>
            <div style={{ width: "90px", flexShrink: 0 }}>
              <TokenStepper value={5} size={stepperSize} resolve={childStepperResolve} />
            </div>
          </div>
        </div>
      )}

      {active === "Allocations" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <TokenInput state="active" value="DEPT-402" placeholder="Department code (e.g. DEPT-402)" size={inputSize} resolve={childInputResolve} />
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "var(--ark-text-xs)", color: tv("text-secondary"), fontWeight: 600 }}>Limit:</span>
            <TokenStepper value={5} size={stepperSize} resolve={childStepperResolve} />
            <TokenButton
              size={btnSize}
              variant={btnVariant}
              prefixIcon={btnPrefix}
              suffixIcon={btnSuffix}
              resolve={childButtonResolve}
            >
              Update
            </TokenButton>
          </div>
        </div>
      )}

      {active === "Forecast" && (
        <div style={{ width: "100%" }}>
          <TokenAlert
            variant={alertVariant}
            mode={mode}
            title="Budget Cap Reached"
            body="Your current forecast exceeds the set quarterly limits by 12.4%."
            style={alertStyle}
            accent={alertAccent}
            icon={alertIcon}
            resolve={childAlertResolve}
          />
        </div>
      )}

      {active === "Audit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <TokenAlert
            variant={alertVariant}
            style={alertStyle}
            accent={alertAccent}
            icon={alertIcon}
            title="Warning Signal"
            body="Review required. 3 sub-packages exceed budgeted weights."
            mode={mode}
            resolve={childAlertResolve}
          />
        </div>
      )}

      {active === "Settings" && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <TokenButton
            variant={btnVariant}
            size={btnSize}
            prefixIcon={btnPrefix}
            suffixIcon={btnSuffix}
            resolve={childButtonResolve}
          >
            {btnLabel}
          </TokenButton>
        </div>
      )}
    </div>
  );
}

export function TabsSkeleton({
  skeletonId,
  tabs = DEFAULT_TABS,
  children,
}: {
  skeletonId: string;
  radiusStep?: number;
  tabs?: string[];
  children?: (active: string) => ReactNode;
}) {
  const opts = useResolvedTabsOptions();
  const [active, setActive] = useState(tabs[0]);
  const mode = useDesignSystem((s) => s.currentPreviewMode);

  const cfg = useDesignSystem((s) => s.components.tabs);
  const parentProperties = cfg?.properties;

  const buttonResolve = useComponentBindings("button");
  const inputResolve = useComponentBindings("input");
  const alertResolve = useComponentBindings("alert");
  const searchFieldResolve = useComponentBindings("searchField");
  const stepperResolve = useComponentBindings("stepper");

  const parentResolve = useComponentBindings("tabs");
  const childButtonResolve = createChildResolver("button", parentResolve, buttonResolve);
  const childInputResolve = createChildResolver("input", parentResolve, inputResolve);
  const childAlertResolve = createChildResolver("alert", parentResolve, alertResolve);
  const childSearchFieldResolve = createChildResolver("searchField", parentResolve, searchFieldResolve);
  const childStepperResolve = createChildResolver("stepper", parentResolve, stepperResolve);

  const borderColor = parentResolve("container.borderColor") ?? tv("border-default");
  const activeBg = parentResolve("tab.activeBg") ?? tv("surface-subtle");
  const activeTextColor = parentResolve("tab.activeText") ?? tv("text-primary");
  const indicatorColor = parentResolve("tab.indicator") ?? tv("action-primary-default");

  const body = children ? children(active) : (
    <PanelBody
      active={active}
      mode={mode}
      childButtonResolve={childButtonResolve}
      childInputResolve={childInputResolve}
      childAlertResolve={childAlertResolve}
      childSearchFieldResolve={childSearchFieldResolve}
      childStepperResolve={childStepperResolve}
      parentProperties={parentProperties}
      parentInstances={cfg?.instances}
    />
  );
  
  const badgeResolve = useComponentBindings("badge");

  const renderTabLabel = (t: string) => {
    return (
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {t}
        {t === "Audit" && (
          <span style={{ marginLeft: "6px", display: "inline-flex", transform: "scale(0.82)", transformOrigin: "left center" }}>
            <TokenBadge variant="warning" mode={mode} resolve={badgeResolve}>
              12
            </TokenBadge>
          </span>
        )}
      </span>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isVertical = skeletonId === "4";
    const nextKeys = isVertical ? ["ArrowDown", "ArrowRight"] : ["ArrowRight"];
    const prevKeys = isVertical ? ["ArrowUp", "ArrowLeft"] : ["ArrowLeft"];
    const currentIndex = tabs.indexOf(active);

    if (nextKeys.includes(e.key)) {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      setActive(tabs[nextIndex]);
      setTimeout(() => {
        const btn = document.getElementById(`tab-${skeletonId}-${tabs[nextIndex]}`);
        btn?.focus();
      }, 0);
    } else if (prevKeys.includes(e.key)) {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      setActive(tabs[prevIndex]);
      setTimeout(() => {
        const btn = document.getElementById(`tab-${skeletonId}-${tabs[prevIndex]}`);
        btn?.focus();
      }, 0);
    }
  };

  const baseBtn = {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--ark-font-sans)",
    fontSize: "var(--ark-text-xs)",
    fontWeight: 600,
    transition: "all 0.15s ease",
  } as const;

  if (skeletonId === "2") {
    // Contained pills styled dynamically
    return (
      <div>
        <div
          role="tablist"
          aria-label="Component preview tabs"
          onKeyDown={handleKeyDown}
          style={{ display: "flex", gap: "8px", padding: `${opts.padding}px` }}
        >
          {tabs.map((t) => {
            const on = t === active;
            return (
              <button
                key={t}
                id={`tab-${skeletonId}-${t}`}
                role="tab"
                aria-selected={on}
                aria-controls={`panel-${skeletonId}-${t}`}
                tabIndex={on ? 0 : -1}
                type="button"
                onClick={() => setActive(t)}
                style={{
                  ...baseBtn,
                  padding: "6px 12px",
                  borderRadius: `${opts.radius}px`,
                  backgroundColor: on ? activeBg : "transparent",
                  color: on ? activeTextColor : tv("text-secondary"),
                  border: `${opts.borderWidth}px solid ${on ? borderColor : "transparent"}`,
                }}
              >
                {renderTabLabel(t)}
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id={`panel-${skeletonId}-${active}`}
          aria-labelledby={`tab-${skeletonId}-${active}`}
          style={{ width: "100%" }}
        >
          {body}
        </div>
      </div>
    );
  }

  if (skeletonId === "3") {
    // Segmented matrix styled dynamically
    return (
      <div>
        <div
          role="tablist"
          aria-label="Component preview tabs"
          onKeyDown={handleKeyDown}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
            border: `${opts.borderWidth}px solid ${borderColor}`,
            borderRadius: `${opts.radius}px`,
            overflow: "hidden",
            margin: `${opts.padding}px`,
          }}
        >
          {tabs.map((t, i) => {
            const on = t === active;
            return (
              <button
                key={t}
                id={`tab-${skeletonId}-${t}`}
                role="tab"
                aria-selected={on}
                aria-controls={`panel-${skeletonId}-${t}`}
                tabIndex={on ? 0 : -1}
                type="button"
                onClick={() => setActive(t)}
                style={{
                  ...baseBtn,
                  padding: "8px 12px",
                  backgroundColor: on ? activeBg : "transparent",
                  color: on ? activeTextColor : tv("text-secondary"),
                  borderLeft: i > 0 ? `${opts.borderWidth}px solid ${borderColor}` : "none",
                }}
              >
                {renderTabLabel(t)}
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id={`panel-${skeletonId}-${active}`}
          aria-labelledby={`tab-${skeletonId}-${active}`}
          style={{ width: "100%" }}
        >
          {body}
        </div>
      </div>
    );
  }

  if (skeletonId === "4") {
    // Vertical sidebar stack styled dynamically
    return (
      <div style={{ display: "flex", minHeight: 140 }}>
        <div
          role="tablist"
          aria-label="Component preview tabs"
          aria-orientation="vertical"
          onKeyDown={handleKeyDown}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            padding: `${opts.padding}px`,
            borderRight: `${opts.borderWidth}px solid ${borderColor}`,
            minWidth: 120,
          }}
        >
          {tabs.map((t) => {
            const on = t === active;
            return (
              <button
                key={t}
                id={`tab-${skeletonId}-${t}`}
                role="tab"
                aria-selected={on}
                aria-controls={`panel-${skeletonId}-${t}`}
                tabIndex={on ? 0 : -1}
                type="button"
                onClick={() => setActive(t)}
                style={{
                  ...baseBtn,
                  textAlign: "left",
                  padding: "6px 12px",
                  borderRadius: `${opts.radius}px`,
                  backgroundColor: on ? activeBg : "transparent",
                  color: on ? activeTextColor : tv("text-muted"),
                }}
              >
                {renderTabLabel(t)}
              </button>
            );
          })}
        </div>
        <div
          role="tabpanel"
          id={`panel-${skeletonId}-${active}`}
          aria-labelledby={`tab-${skeletonId}-${active}`}
          style={{ flex: 1, minWidth: 0 }}
        >
          {body}
        </div>
      </div>
    );
  }

  // 1 — Standard underline styled dynamically
  return (
    <div>
      <div
        role="tablist"
        aria-label="Component preview tabs"
        onKeyDown={handleKeyDown}
        style={{
          display: "flex",
          gap: "16px",
          padding: `0 ${opts.padding * 1.5}px`,
          borderBottom: `${opts.borderWidth}px solid ${borderColor}`,
        }}
      >
        {tabs.map((t) => {
          const on = t === active;
          return (
            <button
              key={t}
              id={`tab-${skeletonId}-${t}`}
              role="tab"
              aria-selected={on}
              aria-controls={`panel-${skeletonId}-${t}`}
              tabIndex={on ? 0 : -1}
              type="button"
              onClick={() => setActive(t)}
              style={{
                ...baseBtn,
                padding: "10px 0",
                color: on ? activeTextColor : tv("text-muted"),
                borderBottom: `2px solid ${on ? indicatorColor : "transparent"}`,
                marginBottom: -1,
              }}
            >
              {renderTabLabel(t)}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`panel-${skeletonId}-${active}`}
        aria-labelledby={`tab-${skeletonId}-${active}`}
        style={{ width: "100%" }}
      >
        {body}
      </div>
    </div>
  );
}
