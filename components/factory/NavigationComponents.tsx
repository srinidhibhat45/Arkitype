"use client";

/**
 * Extended navigation parts: Navbar (top app bar), Sidebar (vertical nav list),
 * Steps (wizard progress) and Link (text link states). Wayfinding surfaces —
 * active state carried by the action/border-focus roles, everything structural
 * from the spacing/radius scales and type/motion vars.
 */
import type { CSSProperties } from "react";
import { BarChart3, Check, CreditCard, Home, Search, Settings } from "lucide-react";
import { rv, sv, tv } from "@/lib/tokens";
import { NO_BINDINGS, Resolver } from "@/lib/componentSchema";
import { TokenAvatar } from "./DisplayComponents";

/* ── Navbar (top app bar) ── */

export function TokenNavbar({
  radiusStep = 7,
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const links = ["Overview", "Ledgers", "Reports"];
  const active = 1;
  const r = resolve;
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: sv(3),
        padding: `${sv(2)} ${sv(3)}`,
        borderBottom: `1px solid ${r("container.border") ?? tv("border-muted")}`,
        background: r("container.bg") ?? tv("surface-elevated"),
        fontFamily: "var(--ark-font-sans)",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: sv(1), fontWeight: 800, color: r("brand.text") ?? tv("text-primary"), fontSize: "var(--ark-text-sm)" }}>
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: rv(2),
            background: r("brand.mark") ?? tv("action-primary-default"),
            display: "inline-block",
          }}
        />
        Ledgerly
      </span>
      <nav style={{ display: "flex", alignItems: "center", gap: sv(1) }}>
        {links.map((l, i) => (
          <span
            key={l}
            aria-current={i === active ? "page" : undefined}
            style={{
              padding: `${sv(1)} ${sv(2)}`,
              borderRadius: rv(2),
              fontSize: "var(--ark-text-sm)",
              fontWeight: i === active ? 600 : 500,
              cursor: "pointer",
              color: i === active ? r("link.active") ?? tv("text-primary") : r("link.inactive") ?? tv("text-muted"),
              background: i === active ? r("link.activeBg") ?? tv("surface-subtle") : "transparent",
            }}
          >
            {l}
          </span>
        ))}
      </nav>
      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: sv(2) }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: rv(2),
            color: tv("text-muted"),
          }}
        >
          <Search size={15} />
        </span>
        <TokenAvatar size="sm" radiusStep={radiusStep} initials="AK" />
      </span>
    </header>
  );
}

/* ── Sidebar (vertical nav list) ── */

const SIDEBAR_ITEMS = [
  { icon: Home, label: "Dashboard" },
  { icon: CreditCard, label: "Transactions" },
  { icon: BarChart3, label: "Reports" },
  { icon: Settings, label: "Settings" },
];

export function TokenSidebar({
  radiusStep = 2,
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const active = 1;
  const r = resolve;
  return (
    <nav
      aria-label="Primary"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: sv(2),
        width: 220,
        maxWidth: "100%",
        background: r("container.bg") ?? tv("surface-elevated"),
        borderRight: `1px solid ${r("container.border") ?? tv("border-muted")}`,
        fontFamily: "var(--ark-font-sans)",
      }}
    >
      <span
        style={{
          padding: `${sv(1)} ${sv(2)}`,
          fontSize: "var(--ark-text-xs)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: tv("text-muted"),
        }}
      >
        Workspace
      </span>
      {SIDEBAR_ITEMS.map((item, i) => {
        const on = i === active;
        const Icon = item.icon;
        return (
          <span
            key={item.label}
            aria-current={on ? "page" : undefined}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: sv(2),
              padding: `${sv(1)} ${sv(2)}`,
              borderRadius: r("item.radius") ?? rv(radiusStep),
              fontSize: "var(--ark-text-sm)",
              fontWeight: on ? 600 : 500,
              cursor: "pointer",
              color: on ? r("item.active") ?? tv("text-primary") : r("item.inactive") ?? tv("text-secondary"),
              background: on ? r("item.activeBg") ?? tv("surface-subtle") : "transparent",
            }}
          >
            {on ? (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3,
                  height: 18,
                  borderRadius: rv(7),
                  background: r("item.accent") ?? tv("action-primary-default"),
                }}
              />
            ) : null}
            <Icon size={15} style={{ color: on ? r("item.accent") ?? tv("action-primary-default") : tv("text-muted"), flexShrink: 0 }} />
            {item.label}
          </span>
        );
      })}
    </nav>
  );
}

/* ── Steps (wizard progress) ── */

export function TokenSteps({
  steps = ["Account", "Details", "Review"],
  current = 1,
  resolve = NO_BINDINGS,
}: {
  steps?: string[];
  current?: number;
  resolve?: Resolver;
}) {
  const r = resolve;
  return (
    <ol
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        listStyle: "none",
        margin: 0,
        padding: 0,
        width: "100%",
        fontFamily: "var(--ark-font-sans)",
      }}
    >
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const circle: CSSProperties = {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: "50%",
          fontSize: "var(--ark-text-xs)",
          fontWeight: 700,
          background: done || active ? r("circle.on") ?? tv("action-primary-default") : r("circle.todo") ?? tv("surface-subtle"),
          color: done || active ? r("circle.onText") ?? tv("text-on-action") : r("circle.todoText") ?? tv("text-muted"),
          border: `1px solid ${done || active ? "transparent" : tv("border-default")}`,
          ...(active
            ? { outline: `2px solid ${tv("border-focus")}`, outlineOffset: "2px" }
            : {}),
        };
        return (
          <li key={label} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "0 0 auto" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: sv(2) }}>
              <span style={circle} aria-current={active ? "step" : undefined}>
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span
                style={{
                  fontSize: "var(--ark-text-sm)",
                  fontWeight: active ? 600 : 500,
                  color: active ? r("label.active") ?? tv("text-primary") : r("label.inactive") ?? tv("text-muted"),
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </span>
            {i < steps.length - 1 ? (
              <span
                style={{
                  flex: 1,
                  height: 2,
                  margin: `0 ${sv(2)}`,
                  borderRadius: rv(7),
                  background: done ? r("connector.done") ?? tv("action-primary-default") : r("connector.todo") ?? tv("border-muted"),
                }}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/* ── Link (text link states) ── */

export function TokenLink({ resolve = NO_BINDINGS }: { resolve?: Resolver }) {
  const r = resolve;
  const base: CSSProperties = {
    fontSize: "var(--ark-text-sm)",
    fontFamily: r("link.font") ?? "var(--ark-font-sans)",
    fontWeight: 600,
    cursor: "pointer",
  };
  const linkDefault = r("link.default") ?? tv("text-link");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: sv(2) }}>
      <span style={{ ...base, color: linkDefault }}>Default link</span>
      <span style={{ ...base, color: r("link.hover") ?? tv("text-link-hover"), textDecoration: "underline", textUnderlineOffset: 3 }}>
        Hover link
      </span>
      <span
        style={{ ...base, color: linkDefault, outline: `2px solid ${tv("border-focus")}`, outlineOffset: 2, borderRadius: rv(1) }}
      >
        Focused link
      </span>
      <span style={{ ...base, color: r("link.disabled") ?? tv("text-muted"), cursor: "not-allowed", textDecoration: "line-through" }}>
        Disabled link
      </span>
    </div>
  );
}
