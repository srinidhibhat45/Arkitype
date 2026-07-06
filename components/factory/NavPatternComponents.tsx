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
import { NO_BINDINGS, Resolver } from "@/lib/componentSchema";
import { TokenBadge } from "./DisplayComponents";
import type { PreviewMode } from "@/store/useDesignSystem";

/* ── Breadcrumbs ── */

export function TokenBreadcrumbs({
  trail = ["Finance", "Ledgers", "Operating"],
  resolve = NO_BINDINGS,
}: {
  trail?: string[];
  resolve?: Resolver;
}) {
  const r = resolve;
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
            {!last ? (
              <ChevronRight size={12} style={{ color: r("text.sep") ?? tv("text-muted") }} />
            ) : null}
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
  const border = r("container.border") ?? tv("border-muted");
  return (
    <div
      style={{
        borderRadius: r("container.radius") ?? rv(radiusStep),
        background: r("container.bg") ?? tv("surface-elevated"),
        border: `1px solid ${border}`,
        boxShadow: "var(--ark-shadow-low)",
        overflow: "hidden",
        maxWidth: 380,
        fontFamily: "var(--ark-font-sans)",
      }}
    >
      <div
        style={{
          padding: `${sv(2)} ${sv(3)}`,
          borderBottom: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ color: r("text.title") ?? tv("text-primary"), fontSize: "var(--ark-text-sm)", fontWeight: 700 }}>
          Marketing budget
        </span>
        <TokenBadge variant="warning" mode={mode}>
          82% used
        </TokenBadge>
      </div>
      <div style={{ padding: sv(3), display: "flex", flexDirection: "column", gap: sv(2) }}>
        <span
          style={{
            color: r("text.value") ?? tv("text-primary"),
            fontSize: "var(--ark-text-2xl)",
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          $41,200 <span style={{ color: tv("text-muted"), fontSize: "var(--ark-text-sm)", fontWeight: 500 }}>of $50,000</span>
        </span>
        <span style={{ color: r("text.body") ?? tv("text-secondary"), fontSize: "var(--ark-text-xs)" }}>
          Campaigns, sponsorships and content. Renews on the 1st.
        </span>
      </div>
      <div
        style={{
          padding: `${sv(2)} ${sv(3)}`,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: sv(2),
        }}
      >
        <span style={{ color: tv("text-muted"), fontSize: "var(--ark-text-xs)", fontWeight: 600, cursor: "pointer" }}>
          View history
        </span>
        <span
          style={{
            color: r("text.action") ?? tv("action-primary-default"),
            fontSize: "var(--ark-text-xs)",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Adjust limit →
        </span>
      </div>
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
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const [open, setOpen] = useState(0);
  const r = resolve;
  const border = r("container.border") ?? tv("border-muted");
  const openBg = r("container.openBg") ?? tv("surface-elevated");
  return (
    <div
      style={{
        borderRadius: r("container.radius") ?? rv(radiusStep),
        border: `1px solid ${border}`,
        overflow: "hidden",
        fontFamily: "var(--ark-font-sans)",
        maxWidth: 480,
      }}
    >
      {ACCORDION_ITEMS.map((item, i) => {
        const on = open === i;
        return (
          <div key={item.q} style={{ borderTop: i > 0 ? `1px solid ${border}` : "none" }}>
            <button
              type="button"
              onClick={() => setOpen(on ? -1 : i)}
              aria-expanded={on}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
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
              {item.q}
              <ChevronDown
                size={14}
                style={{
                  color: r("chevron.color") ?? tv("text-muted"),
                  flexShrink: 0,
                  transform: on ? "rotate(180deg)" : "none",
                  transition: "transform var(--ark-duration-base) var(--ark-ease-out)",
                }}
              />
            </button>
            {on ? (
              <div
                style={{
                  padding: `0 ${sv(3)} ${sv(2)}`,
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
