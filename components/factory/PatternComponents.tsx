"use client";

/**
 * Extended composition patterns: List item (media object), Banner, Field
 * (label + control + help/error), Stat grid and Feed item. Built from the
 * primitives above — tone washes via `useTone`, controls reused from the core
 * factory — so every pattern re-themes with the system.
 */
import type { CSSProperties } from "react";
import { ChevronRight, Heart, Megaphone, MessageCircle, X } from "lucide-react";
import { PreviewMode } from "@/store/useDesignSystem";
import { rv, sv, tv } from "@/lib/tokens";
import { NO_BINDINGS, Resolver } from "@/lib/componentSchema";
import { ToneVariant, TokenAvatar, TokenBadge, useTone } from "./DisplayComponents";
import { TokenInput } from "./CoreComponents";
import { TokenStat } from "./FeedbackComponents";

/* ── List item (media object) ── */

const LIST_ROWS = [
  { name: "Northwind Traders", meta: "Invoice · Net-30", amount: "$4,200", tone: "success" as const, badge: "Paid" },
  { name: "Acme Logistics", meta: "Subscription · Monthly", amount: "$980", tone: "warning" as const, badge: "Due" },
  { name: "Globex Corp", meta: "One-off · Consulting", amount: "$12,500", tone: "neutral" as const, badge: "Draft" },
];

export function TokenListItem({
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
        border: `1px solid ${border}`,
        overflow: "hidden",
        background: r("container.bg") ?? tv("surface-elevated"),
        maxWidth: 440,
        fontFamily: "var(--ark-font-sans)",
      }}
    >
      {LIST_ROWS.map((row, i) => (
        <div
          key={row.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: sv(2),
            padding: `${sv(2)} ${sv(3)}`,
            borderTop: i > 0 ? `1px solid ${border}` : "none",
          }}
        >
          <TokenAvatar size="sm" radiusStep={7} initials={row.name.slice(0, 2).toUpperCase()} />
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: "block", fontSize: "var(--ark-text-sm)", fontWeight: 600, color: r("text.name") ?? tv("text-primary"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {row.name}
            </span>
            <span style={{ display: "block", fontSize: "var(--ark-text-xs)", color: r("text.meta") ?? tv("text-muted") }}>
              {row.meta}
            </span>
          </span>
          <span style={{ fontSize: "var(--ark-text-sm)", fontWeight: 700, color: r("text.amount") ?? tv("text-primary"), fontVariantNumeric: "tabular-nums" }}>
            {row.amount}
          </span>
          <TokenBadge variant={row.tone} mode={mode}>
            {row.badge}
          </TokenBadge>
          <ChevronRight size={15} style={{ color: tv("text-muted"), flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

/* ── Banner ── */

export function TokenBanner({
  mode,
  radiusStep = 3,
  variant = "brand",
  icon = true,
  action = true,
  dismissible = true,
  resolve = NO_BINDINGS,
}: {
  mode: PreviewMode;
  radiusStep?: number;
  variant?: ToneVariant;
  icon?: boolean;
  action?: boolean;
  dismissible?: boolean;
  resolve?: Resolver;
}) {
  const tone = useTone(variant, mode);
  const r = resolve;
  return (
    <div
      role="region"
      style={{
        display: "flex",
        alignItems: "center",
        gap: sv(2),
        padding: `${r("container.padY") ?? sv(2)} ${r("container.padX") ?? sv(3)}`,
        borderRadius: r("container.radius") ?? rv(radiusStep),
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.text,
        fontFamily: "var(--ark-font-sans)",
      }}
    >
      {icon ? (
        <Megaphone size={16} style={{ color: tone.accent, flexShrink: 0 }} />
      ) : null}
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "block", fontSize: "var(--ark-text-sm)", fontWeight: 700 }}>
          Q3 close is in 5 days
        </span>
        <span style={{ display: "block", fontSize: "var(--ark-text-xs)", opacity: 0.85 }}>
          Reconcile pending transactions before the ledger locks.
        </span>
      </span>
      {action ? (
        <span
          style={{
            padding: `${sv(1)} ${sv(2)}`,
            borderRadius: rv(Math.max(radiusStep - 1, 0)),
            background: tone.accent,
            color: tv("text-on-action"),
            fontSize: "var(--ark-text-xs)",
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Review now
        </span>
      ) : null}
      {dismissible ? (
        <X size={15} style={{ color: tone.accent, cursor: "pointer", flexShrink: 0 }} aria-label="Dismiss" />
      ) : null}
    </div>
  );
}

/* ── Field (label + control + help/error) ── */

export function TokenField({
  mode,
  radiusStep = 2,
  invalid = false,
  resolve = NO_BINDINGS,
}: {
  mode: PreviewMode;
  radiusStep?: number;
  invalid?: boolean;
  resolve?: Resolver;
}) {
  const tone = useTone("error", mode);
  const r = resolve;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: sv(1), width: "100%", maxWidth: 340, fontFamily: "var(--ark-font-sans)" }}>
      <label style={{ fontSize: "var(--ark-text-sm)", fontWeight: 600, color: r("text.label") ?? tv("text-primary"), display: "inline-flex", gap: 3 }}>
        Account email
        <span style={{ color: r("text.required") ?? tone.accent }}>*</span>
      </label>
      <div
        style={
          invalid
            ? {
                borderRadius: rv(radiusStep),
                boxShadow: `0 0 0 1px ${tone.accent}`,
              }
            : undefined
        }
      >
        <TokenInput
          state="default"
          radiusStep={radiusStep}
          placeholder="name@company.com"
        />
      </div>
      <span
        style={{
          fontSize: "var(--ark-text-xs)",
          color: invalid ? tone.accent : r("text.help") ?? tv("text-muted"),
          fontWeight: invalid ? 600 : 400,
        }}
      >
        {invalid
          ? "Enter a valid work email address."
          : "We’ll send receipts and statements here."}
      </span>
    </div>
  );
}

/* ── Stat grid ── */

const GRID_STATS = [
  { label: "Net revenue", value: "$128,540", delta: "+12.4%", trend: "up" as const },
  { label: "Expenses", value: "$54,120", delta: "-3.1%", trend: "down" as const },
  { label: "Outstanding", value: "$19,300", delta: "+8.0%", trend: "up" as const },
];

export function TokenStatGrid({
  mode,
  radiusStep = 4,
  resolve = NO_BINDINGS,
}: {
  mode: PreviewMode;
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const r = resolve;
  const cell: CSSProperties = {
    padding: sv(3),
    borderRadius: r("cell.radius") ?? rv(radiusStep),
    background: r("cell.bg") ?? tv("surface-elevated"),
    border: `1px solid ${r("cell.border") ?? tv("border-muted")}`,
    boxShadow: "var(--ark-shadow-low)",
  };
  return (
    <div
      style={{
        display: "grid",
        gap: sv(3),
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        width: "100%",
      }}
    >
      {GRID_STATS.map((s) => (
        <div key={s.label} style={cell}>
          <TokenStat mode={mode} label={s.label} value={s.value} delta={s.delta} trend={s.trend} />
        </div>
      ))}
    </div>
  );
}

/* ── Feed item (comment / activity) ── */

export function TokenFeedItem({
  radiusStep = 4,
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const r = resolve;
  const meta = r("text.meta") ?? tv("text-muted");
  return (
    <div
      style={{
        display: "flex",
        gap: sv(2),
        padding: sv(3),
        borderRadius: r("container.radius") ?? rv(radiusStep),
        border: `1px solid ${r("container.border") ?? tv("border-muted")}`,
        background: r("container.bg") ?? tv("surface-elevated"),
        maxWidth: 460,
        fontFamily: "var(--ark-font-sans)",
      }}
    >
      <TokenAvatar size="sm" radiusStep={7} initials="MR" />
      <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: sv(1) }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: sv(1) }}>
          <span style={{ fontSize: "var(--ark-text-sm)", fontWeight: 700, color: r("text.name") ?? tv("text-primary") }}>
            Maria Reyes
          </span>
          <span style={{ fontSize: "var(--ark-text-xs)", color: meta }}>· 2h ago</span>
        </div>
        <p style={{ margin: 0, fontSize: "var(--ark-text-sm)", color: r("text.body") ?? tv("text-secondary"), lineHeight: 1.55 }}>
          Flagged TXN-0459 for review — the vendor total doesn’t match the PO. Can finance confirm before close?
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: sv(3), marginTop: sv(1) }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: sv(1), fontSize: "var(--ark-text-xs)", color: meta, cursor: "pointer" }}>
            <Heart size={13} /> 12
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: sv(1), fontSize: "var(--ark-text-xs)", color: meta, cursor: "pointer" }}>
            <MessageCircle size={13} /> 3
          </span>
          <span style={{ fontSize: "var(--ark-text-xs)", fontWeight: 600, color: r("text.link") ?? tv("text-link"), cursor: "pointer", marginLeft: "auto" }}>
            Reply
          </span>
        </div>
      </div>
    </div>
  );
}
