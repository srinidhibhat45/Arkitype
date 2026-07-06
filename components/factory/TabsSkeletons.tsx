"use client";

/**
 * The Tabs Cluster — strict 4-skeleton rule.
 *  1 Standard Underline · 2 Contained Pills · 3 Segmented Matrix · 4 Vertical Sidebar Stack
 * Fully functional (interaction state is local UI state; all styling flows
 * from --ark-* variables).
 */
import { useState } from "react";
import type { ReactNode } from "react";
import { rv, sv, tv } from "@/lib/tokens";

export const TABS_SKELETONS = [
  { id: "1", name: "Standard Underline", desc: "Border-base indicator beneath labels" },
  { id: "2", name: "Contained Pills", desc: "Isolated solid capsules, high contrast" },
  { id: "3", name: "Segmented Matrix", desc: "Equal-width blocks in a bounded box" },
  { id: "4", name: "Vertical Sidebar Stack", desc: "Left-aligned structural anchors" },
] as const;

const DEFAULT_TABS = ["Overview", "Allocations", "Forecast", "Audit"];

function PanelBody({ active }: { active: string }) {
  return (
    <div
      style={{
        padding: sv(3),
        display: "flex",
        flexDirection: "column",
        gap: sv(2),
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
      {[92, 74, 58].map((w) => (
        <div
          key={w}
          style={{
            height: 8,
            width: `${w}%`,
            background: tv("surface-subtle"),
            borderRadius: rv(1),
          }}
        />
      ))}
    </div>
  );
}

export function TabsSkeleton({
  skeletonId,
  radiusStep,
  tabs = DEFAULT_TABS,
  children,
}: {
  skeletonId: string;
  radiusStep: number;
  tabs?: string[];
  children?: (active: string) => ReactNode;
}) {
  const [active, setActive] = useState(tabs[0]);
  const body = children ? children(active) : <PanelBody active={active} />;

  const baseBtn = {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--ark-font-sans)",
    fontSize: "var(--ark-text-xs)",
    fontWeight: 600,
  } as const;

  if (skeletonId === "2") {
    // Contained pills
    return (
      <div>
        <div style={{ display: "flex", gap: sv(2), padding: sv(2) }}>
          {tabs.map((t) => {
            const on = t === active;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActive(t)}
                style={{
                  ...baseBtn,
                  padding: `${sv(1)} ${sv(3)}`,
                  borderRadius: rv(7),
                  background: on ? tv("action-primary-default") : tv("surface-subtle"),
                  color: on ? tv("text-on-action") : tv("text-secondary"),
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
        {body}
      </div>
    );
  }

  if (skeletonId === "3") {
    // Segmented matrix
    return (
      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
            border: `1px solid ${tv("border-default")}`,
            borderRadius: rv(radiusStep),
            overflow: "hidden",
            margin: sv(2),
          }}
        >
          {tabs.map((t, i) => {
            const on = t === active;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActive(t)}
                style={{
                  ...baseBtn,
                  padding: `${sv(1)} ${sv(2)}`,
                  background: on ? tv("action-primary-default") : tv("surface-elevated"),
                  color: on ? tv("text-on-action") : tv("text-secondary"),
                  borderLeft: i > 0 ? `1px solid ${tv("border-default")}` : "none",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
        {body}
      </div>
    );
  }

  if (skeletonId === "4") {
    // Vertical sidebar stack
    return (
      <div style={{ display: "flex", minHeight: 120 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: sv(1),
            padding: sv(2),
            borderRight: `1px solid ${tv("border-muted")}`,
            minWidth: 110,
          }}
        >
          {tabs.map((t) => {
            const on = t === active;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setActive(t)}
                style={{
                  ...baseBtn,
                  textAlign: "left",
                  padding: `${sv(1)} ${sv(2)}`,
                  borderRadius: rv(Math.min(radiusStep, 3)),
                  background: on ? tv("surface-subtle") : "transparent",
                  color: on ? tv("text-primary") : tv("text-muted"),
                  borderLeft: `2px solid ${on ? tv("action-primary-default") : "transparent"}`,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>{body}</div>
      </div>
    );
  }

  // 1 — Standard underline
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: sv(4),
          padding: `0 ${sv(3)}`,
          borderBottom: `1px solid ${tv("border-muted")}`,
        }}
      >
        {tabs.map((t) => {
          const on = t === active;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActive(t)}
              style={{
                ...baseBtn,
                padding: `${sv(2)} 0`,
                color: on ? tv("text-primary") : tv("text-muted"),
                borderBottom: `2px solid ${on ? tv("action-primary-default") : "transparent"}`,
                marginBottom: -1,
                transition: "color 120ms ease, border-color 120ms ease",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>
      {body}
    </div>
  );
}
