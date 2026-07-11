"use client";

/**
 * Navigation & composition patterns: Breadcrumbs, Pagination, Dropdown menu,
 * Card, Accordion. Token-driven; Accordion is live (local open state only).
 */
import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { rv, sv, tv } from "@/lib/tokens";
import { NO_BINDINGS, Resolver, resolveOptions, useComponentBindings } from "@/lib/componentSchema";
import { TokenBadge } from "./DisplayComponents";
import { PreviewMode, useDesignSystem } from "@/store/useDesignSystem";
import { TokenButton } from "./CoreComponents";

/* ── Breadcrumbs ── */

export function TokenBreadcrumbs({
  trail = ["Finance", "Ledgers", "Operating"],
  separator = "chevron",
  resolve = NO_BINDINGS,
}: {
  trail?: string[];
  separator?: "chevron" | "slash" | "dot";
  resolve?: Resolver;
}) {
  const r = resolve;
  const sepColor = r("text.sep") ?? tv("text-muted");
  const sep =
    separator === "slash" ? (
      <span style={{ color: sepColor, fontSize: "var(--ark-text-xs)" }}>/</span>
    ) : separator === "dot" ? (
      <span style={{ color: sepColor, fontSize: "var(--ark-text-xs)" }}>•</span>
    ) : (
      <ChevronRight size={12} style={{ color: sepColor }} />
    );
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: "flex",
        alignItems: "center",
        gap: sv(1),
        fontSize: "var(--ark-text-sm)",
        fontFamily: "var(--ark-font-sans)",
      }}
    >
      {trail.map((item, i) => {
        const last = i === trail.length - 1;
        return (
          <span key={item} style={{ display: "flex", alignItems: "center", gap: sv(1) }}>
            <span
              style={{
                color: last ? r("text.current") ?? tv("text-primary") : r("text.item") ?? tv("text-muted"),
                fontWeight: last ? 600 : 400,
                cursor: last ? "default" : "pointer",
              }}
              aria-current={last ? "page" : undefined}
            >
              {item}
            </span>
            {!last ? sep : null}
          </span>
        );
      })}
    </nav>
  );
}

/* ── Pagination ── */

export function TokenPagination({
  pages = 8,
  radiusStep = 2,
  resolve = NO_BINDINGS,
}: {
  pages?: number;
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const [active, setActive] = useState(3);
  const shown = [1, 2, 3, 4, 5];
  const r = resolve;
  const cellBorder = r("cell.border") ?? tv("border-muted");
  const cell = (on: boolean): React.CSSProperties => ({
    minWidth: 28,
    height: 28,
    padding: `0 ${sv(1)}`,
    borderRadius: r("cell.radius") ?? rv(radiusStep),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "var(--ark-text-xs)",
    fontFamily: "var(--ark-font-sans)",
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid transparent",
    background: on ? r("cell.activeBg") ?? tv("action-primary-default") : "transparent",
    color: on ? r("cell.activeText") ?? tv("text-on-action") : r("cell.text") ?? tv("text-secondary"),
    transition: "background var(--ark-duration-fast) var(--ark-ease-out)",
  });

  return (
    <nav aria-label="Pagination" style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <span style={{ ...cell(false), color: tv("text-muted") }} aria-label="Previous page">
        <ChevronLeft size={13} />
      </span>
      {shown.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => setActive(p)}
          style={{ ...cell(p === active), borderColor: p === active ? "transparent" : cellBorder }}
          aria-current={p === active ? "page" : undefined}
        >
          {p}
        </button>
      ))}
      <span style={{ ...cell(false), color: tv("text-muted") }}>…</span>
      <span style={{ ...cell(false), borderColor: cellBorder }}>{pages}</span>
      <span style={{ ...cell(false), color: tv("text-muted") }} aria-label="Next page">
        <ChevronRight size={13} />
      </span>
    </nav>
  );
}

/* ── Dropdown menu (static, opened) ── */

export function TokenDropdownMenu({
  radiusStep = 3,
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const r = resolve;
  const item = (danger = false): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: sv(2),
    padding: `${sv(1)} ${sv(2)}`,
    borderRadius: rv(Math.max(radiusStep - 1, 0)),
    fontSize: "var(--ark-text-sm)",
    fontFamily: "var(--ark-font-sans)",
    color: danger ? undefined : r("item.text") ?? tv("text-secondary"),
    cursor: "pointer",
  });
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
      <span
        style={{
          display: "inline-flex",
          padding: sv(1),
          borderRadius: rv(2),
          border: `1px solid ${tv("border-default")}`,
          color: tv("text-secondary"),
          background: tv("surface-elevated"),
          marginBottom: sv(1),
        }}
        aria-haspopup="menu"
        aria-expanded
      >
        <MoreHorizontal size={14} />
      </span>
      <div
        role="menu"
        style={{
          minWidth: 180,
          padding: sv(1),
          borderRadius: r("container.radius") ?? rv(radiusStep),
          background: r("container.bg") ?? tv("surface-elevated"),
          border: `1px solid ${r("container.border") ?? tv("border-default")}`,
          boxShadow: "var(--ark-shadow-high)",
        }}
      >
        <div role="menuitem" style={{ ...item(), background: r("item.activeBg") ?? tv("surface-subtle"), color: r("item.activeText") ?? tv("text-primary") }}>
          <Copy size={13} style={{ color: tv("text-muted") }} /> Duplicate
        </div>
        <div role="menuitem" style={item()}>
          <Download size={13} style={{ color: tv("text-muted") }} /> Export as CSV
        </div>
        <div role="menuitem" style={item()}>
          <Check size={13} style={{ color: tv("text-muted") }} /> Mark reconciled
        </div>
        <div
          style={{
            height: 1,
            background: tv("border-muted"),
            margin: `${sv(1)} 0`,
          }}
        />
        <div role="menuitem" style={{ ...item(true), color: "#e5484d" }}>
          <Trash2 size={13} /> Delete row
        </div>
      </div>
    </div>
  );
}

/* ── Card ── */

export function TokenCard({
  mode,
  radiusStep = 4,
  resolve = NO_BINDINGS,
}: {
  mode: PreviewMode;
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const r = resolve;
  const cfg = useDesignSystem((s) => s.components.card);
  const opts = resolveOptions("card", cfg?.properties);
  const buttonResolve = useComponentBindings("button");

  const title = (opts.title ?? "Design Systems Manager") as string;
  const titleSize = (opts["title.size"] ?? "sm") as string;
  const subtitle = (opts.subtitle ?? "Updated 2 hours ago") as string;
  const subtitleSize = (opts["subtitle.size"] ?? "xs") as string;
  const bodyText = (opts.bodyText ?? "Manage tokens, balance scales, and distribute variable definitions.") as string;
  const bodyTextSize = (opts["bodyText.size"] ?? "xs") as string;
  const borderWidth = Number(opts.borderWidth ?? 1);
  const borderColor = (opts.borderColor ?? "#e4e4e7") as string;
  const bg = (opts.bg ?? "#ffffff") as string;
  const radius = Number(opts.radius ?? 12);
  const padding = Number(opts.padding ?? 20);
  const shadow = (opts.shadow ?? "md") as string;
  const btnLabel = (opts.btnLabel ?? "View Tokens") as string;
  const showButton = opts.showButton !== false;

  const shadows: Record<string, string> = {
    none: "none",
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  };

  return (
    <div
      style={{
        border: `${borderWidth}px solid ${r("container.border") ?? borderColor}`,
        borderRadius: r("container.radius") ?? `${radius}px`,
        backgroundColor: r("container.bg") ?? bg,
        boxShadow: shadows[shadow] ?? shadows.md,
        overflow: "hidden",
        maxWidth: 380,
        width: "100%",
        fontFamily: "var(--ark-font-sans)",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          padding: `${padding / 1.5}px ${padding}px`,
          borderBottom: `${borderWidth}px solid ${borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              color: r("text.title") ?? tv("text-primary"),
              fontSize: `var(--ark-text-${titleSize})`,
              lineHeight: `var(--ark-leading-${titleSize})`,
              fontWeight: `var(--ark-weight-${titleSize})`,
              fontFamily: `var(--ark-font-role-${titleSize})`,
            }}
          >
            {title}
          </span>
          {subtitle && (
            <span
              style={{
                color: tv("text-muted"),
                fontSize: `var(--ark-text-${subtitleSize})`,
                lineHeight: `var(--ark-leading-${subtitleSize})`,
                fontWeight: `var(--ark-weight-${subtitleSize})`,
                fontFamily: `var(--ark-font-role-${subtitleSize})`,
                marginTop: "1px",
              }}
            >
              {subtitle}
            </span>
          )}
        </div>
        <TokenBadge variant="warning" mode={mode}>
          active
        </TokenBadge>
      </div>
      <div style={{ padding: `${padding}px`, display: "flex", flexDirection: "column", gap: "10px" }}>
        <span
          style={{
            color: r("text.body") ?? tv("text-secondary"),
            fontSize: `var(--ark-text-${bodyTextSize})`,
            lineHeight: `var(--ark-leading-${bodyTextSize})`,
            fontWeight: `var(--ark-weight-${bodyTextSize})`,
            fontFamily: `var(--ark-font-role-${bodyTextSize})`,
          }}
        >
          {bodyText}
        </span>
      </div>
      {showButton && (
        <div
          style={{
            padding: `${padding / 1.5}px ${padding}px`,
            borderTop: `${borderWidth}px solid ${borderColor}`,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <TokenButton size="sm" resolve={buttonResolve}>
            {btnLabel}
          </TokenButton>
        </div>
      )}
    </div>
  );
}

/* ── Accordion (live) ── */

const ACCORDION_ITEMS = [
  {
    q: "How are budgets rolled over?",
    a: "Unspent allocation moves to the next quarter automatically unless the cost-centre owner opts out before close.",
  },
  {
    q: "Who approves transactions over $5,000?",
    a: "Finance leads review anything above the threshold; approvals expire after 14 days.",
  },
  {
    q: "Can I export the ledger?",
    a: "Yes — CSV and JSON exports are available from the row menu or the reports page.",
  },
];

export function TokenAccordion({
  radiusStep = 3,
  variant = "contained",
  iconSide = "right",
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  variant?: "contained" | "separated" | "flush";
  iconSide?: "left" | "right";
  resolve?: Resolver;
}) {
  const [open, setOpen] = useState(0);
  const r = resolve;
  const cfg = useDesignSystem((s) => s.components.accordion);
  const opts = resolveOptions("accordion", cfg?.properties);
  const radius = Number(opts.radius ?? 12);

  const border = r("container.border") ?? tv("border-muted");
  const openBg = r("container.openBg") ?? tv("surface-elevated");
  const rad = r("container.radius") ?? `${radius}px`;
  const separated = variant === "separated";
  const flush = variant === "flush";
  const iconLeft = iconSide === "left";

  const chevron = (on: boolean) => (
    <ChevronDown
      size={14}
      style={{
        color: r("chevron.color") ?? tv("text-muted"),
        flexShrink: 0,
        transform: on ? "rotate(180deg)" : "none",
        transition: "transform var(--ark-duration-base) var(--ark-ease-out)",
      }}
    />
  );

  return (
    <div
      style={{
        borderRadius: flush ? 0 : rad,
        border: separated || flush ? "none" : `1px solid ${border}`,
        overflow: separated ? "visible" : "hidden",
        display: "flex",
        flexDirection: "column",
        gap: separated ? sv(2) : 0,
        fontFamily: "var(--ark-font-sans)",
        maxWidth: 480,
      }}
    >
      {ACCORDION_ITEMS.map((item, i) => {
        const on = open === i;
        const wrapperStyle: React.CSSProperties = separated
          ? { border: `1px solid ${border}`, borderRadius: rad, overflow: "hidden" }
          : flush
            ? { borderBottom: `1px solid ${border}` }
            : { borderTop: i > 0 ? `1px solid ${border}` : "none" };
        return (
          <div key={item.q} style={wrapperStyle}>
            <button
              type="button"
              onClick={() => setOpen(on ? -1 : i)}
              aria-expanded={on}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: iconLeft ? "flex-start" : "space-between",
                gap: sv(2),
                width: "100%",
                padding: `${sv(2)} ${sv(3)}`,
                background: on ? openBg : "transparent",
                border: "none",
                cursor: "pointer",
                color: r("text.header") ?? tv("text-primary"),
                fontSize: "var(--ark-text-sm)",
                fontWeight: 600,
                fontFamily: "var(--ark-font-sans)",
                textAlign: "left",
                transition: "background var(--ark-duration-fast) var(--ark-ease-out)",
              }}
            >
              {iconLeft ? chevron(on) : null}
              <span style={{ flex: iconLeft ? "0 1 auto" : 1 }}>{item.q}</span>
              {iconLeft ? null : chevron(on)}
            </button>
            {on ? (
              <div
                style={{
                  padding: iconLeft ? `0 ${sv(3)} ${sv(2)} ${sv(6)}` : `0 ${sv(3)} ${sv(2)}`,
                  background: openBg,
                  color: r("text.body") ?? tv("text-secondary"),
                  fontSize: "var(--ark-text-xs)",
                  lineHeight: 1.6,
                }}
              >
                {item.a}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
