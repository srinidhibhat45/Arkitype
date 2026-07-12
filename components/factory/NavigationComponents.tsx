"use client";

/**
 * Extended navigation parts: Navbar (top app bar), Sidebar (vertical nav list),
 * Steps (wizard progress) and Link (text link states). Wayfinding surfaces —
 * active state carried by the action/border-focus roles, everything structural
 * from the spacing/radius scales and type/motion vars.
 */
import type { CSSProperties } from "react";
import { BarChart3, Check, CreditCard, ExternalLink, Home, Search, Settings } from "lucide-react";
import { rv, sv, tv } from "@/lib/tokens";
import { CState, NO_BINDINGS, Resolver, useComponentBindings } from "@/lib/componentSchema";
import { TokenAvatar } from "./DisplayComponents";

/* ── Navbar (top app bar) ── */

export function TokenNavbar({
  radiusStep = 7,
  brandText = "Ledgerly",
  links = ["Overview", "Ledgers", "Reports"],
  activeIndex = 1,
  showSearch = true,
  showAvatar = true,
  density = "regular",
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  brandText?: string;
  links?: string[];
  activeIndex?: number;
  showSearch?: boolean;
  showAvatar?: boolean;
  density?: "regular" | "compact";
  resolve?: Resolver;
}) {
  const active = Math.min(Math.max(activeIndex, 0), links.length - 1);
  const r = resolve;
  const avatarResolve = useComponentBindings("avatar");
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: sv(3),
        padding: density === "compact" ? `${sv(1)} ${sv(3)}` : `${sv(2)} ${sv(3)}`,
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
        {brandText}
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
        {showSearch ? (
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
        ) : null}
        {showAvatar ? (
          <TokenAvatar size="sm" radiusStep={radiusStep} initials="AK" resolve={avatarResolve} />
        ) : null}
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
  collapsed = false,
  header = "Workspace",
  showHeader = true,
  showIcons = true,
  showAccent = true,
  activeIndex = 1,
  width = 220,
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  collapsed?: boolean;
  header?: string;
  showHeader?: boolean;
  showIcons?: boolean;
  showAccent?: boolean;
  activeIndex?: number;
  width?: number;
  resolve?: Resolver;
}) {
  const active = Math.min(Math.max(activeIndex, 0), SIDEBAR_ITEMS.length - 1);
  const r = resolve;
  return (
    <nav
      aria-label="Primary"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: sv(2),
        width: collapsed ? 56 : width,
        maxWidth: "100%",
        background: r("container.bg") ?? tv("surface-elevated"),
        borderRight: `1px solid ${r("container.border") ?? tv("border-muted")}`,
        fontFamily: "var(--ark-font-sans)",
      }}
    >
      {showHeader && !collapsed ? (
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
          {header}
        </span>
      ) : null}
      {SIDEBAR_ITEMS.map((item, i) => {
        const on = i === active;
        const Icon = item.icon;
        return (
          <span
            key={item.label}
            aria-current={on ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: sv(2),
              padding: collapsed ? sv(1) : `${sv(1)} ${sv(2)}`,
              borderRadius: r("item.radius") ?? rv(radiusStep),
              fontSize: "var(--ark-text-sm)",
              fontWeight: on ? 600 : 500,
              cursor: "pointer",
              color: on ? r("item.active") ?? tv("text-primary") : r("item.inactive") ?? tv("text-secondary"),
              background: on ? r("item.activeBg") ?? tv("surface-subtle") : "transparent",
            }}
          >
            {on && showAccent ? (
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
            {showIcons || collapsed ? (
              <Icon size={15} style={{ color: on ? r("item.accent") ?? tv("text-link") : tv("text-muted"), flexShrink: 0 }} />
            ) : null}
            {!collapsed ? item.label : null}
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
  orientation = "horizontal",
  showLabels = true,
  resolve = NO_BINDINGS,
}: {
  steps?: string[];
  current?: number;
  orientation?: "horizontal" | "vertical";
  showLabels?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  const vertical = orientation === "vertical";
  return (
    <ol
      style={{
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        alignItems: vertical ? "stretch" : "center",
        gap: 0,
        listStyle: "none",
        margin: 0,
        padding: 0,
        width: vertical ? undefined : "100%",
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
        const connector =
          i < steps.length - 1 ? (
            <span
              style={
                vertical
                  ? {
                      width: 2,
                      minHeight: 20,
                      margin: `${sv(1)} 0 ${sv(1)} 12px`,
                      borderRadius: rv(7),
                      background: done ? r("connector.done") ?? tv("action-primary-default") : r("connector.todo") ?? tv("border-muted"),
                    }
                  : {
                      flex: 1,
                      height: 2,
                      margin: `0 ${sv(2)}`,
                      borderRadius: rv(7),
                      background: done ? r("connector.done") ?? tv("action-primary-default") : r("connector.todo") ?? tv("border-muted"),
                    }
              }
            />
          ) : null;
        return (
          <li
            key={label}
            style={
              vertical
                ? { display: "flex", flexDirection: "column" }
                : { display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "0 0 auto" }
            }
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: sv(2) }}>
              <span style={circle} aria-current={active ? "step" : undefined}>
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              {showLabels ? (
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
              ) : null}
            </span>
            {connector}
          </li>
        );
      })}
    </ol>
  );
}

/* ── Link (text link states) ── */

export function TokenLink({
  state,
  underline = "auto",
  external = false,
  label = "link",
  size = "md",
  weight = "semibold",
  resolve = NO_BINDINGS,
}: {
  /** When given, renders a single line reflecting that one state — like every
   *  other Token component. Omit only for a full states-at-once showcase. */
  state?: CState;
  underline?: "auto" | "always" | "none";
  external?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
  weight?: "medium" | "semibold" | "bold";
  resolve?: Resolver;
}) {
  const r = resolve;
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize:
      size === "sm" ? "var(--ark-text-xs)" : size === "lg" ? "var(--ark-text-base)" : "var(--ark-text-sm)",
    fontFamily: r("link.font") ?? "var(--ark-font-sans)",
    fontWeight: weight === "medium" ? 500 : weight === "bold" ? 700 : 600,
    cursor: "pointer",
  };
  const linkDefault = r("link.default") ?? tv("text-link");
  const restDecoration = underline === "always" ? "underline" : "none";
  const hoverDecoration = underline === "none" ? "none" : "underline";
  const ext = external ? <ExternalLink size={12} style={{ flexShrink: 0 }} /> : null;

  if (state === "hover") {
    return (
      <span style={{ ...base, color: r("link.hover") ?? tv("text-link-hover"), textDecoration: hoverDecoration, textUnderlineOffset: 3 }}>
        {label}{ext}
      </span>
    );
  }
  if (state === "focus") {
    return (
      <span style={{ ...base, color: linkDefault, textDecoration: restDecoration, outline: `2px solid ${tv("border-focus")}`, outlineOffset: 2, borderRadius: rv(1) }}>
        {label}{ext}
      </span>
    );
  }
  if (state === "disabled") {
    return (
      <span style={{ ...base, color: r("link.disabled") ?? tv("text-muted"), cursor: "not-allowed", textDecoration: "line-through" }}>
        {label}{ext}
      </span>
    );
  }
  if (state) {
    return (
      <span style={{ ...base, color: linkDefault, textDecoration: restDecoration, textUnderlineOffset: 3 }}>
        {label}{ext}
      </span>
    );
  }

  // no state given: full states-at-once showcase
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: sv(2) }}>
      <span style={{ ...base, color: linkDefault, textDecoration: restDecoration, textUnderlineOffset: 3 }}>
        Default {label}{ext}
      </span>
      <span style={{ ...base, color: r("link.hover") ?? tv("text-link-hover"), textDecoration: hoverDecoration, textUnderlineOffset: 3 }}>
        Hover {label}{ext}
      </span>
      <span
        style={{ ...base, color: linkDefault, textDecoration: restDecoration, outline: `2px solid ${tv("border-focus")}`, outlineOffset: 2, borderRadius: rv(1) }}
      >
        Focused {label}{ext}
      </span>
      <span style={{ ...base, color: r("link.disabled") ?? tv("text-muted"), cursor: "not-allowed", textDecoration: "line-through" }}>
        Disabled {label}{ext}
      </span>
    </div>
  );
}
