"use client";

/**
 * Extended composition patterns: List item (media object), Banner, Field
 * (label + control + help/error), Stat grid and Feed item. Built from the
 * primitives above — tone washes via `useTone`, controls reused from the core
 * factory — so every pattern re-themes with the system.
 */
import type { CSSProperties } from "react";
import { ChevronRight, Heart, Megaphone, MessageCircle, X } from "lucide-react";
import { PreviewMode, useDesignSystem } from "@/store/useDesignSystem";
import { rv, sv, tv } from "@/lib/tokens";
import { NO_BINDINGS, Resolver, useComponentBindings, createChildResolver } from "@/lib/componentSchema";
import { ToneVariant, TokenAvatar, TokenBadge, useTone } from "./DisplayComponents";
import { TokenInput, TokenButton } from "./CoreComponents";
import { TokenIconButton } from "./FormControls";
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
  rows = 3,
  showAvatar = true,
  showAmount = true,
  showBadge = true,
  trailing = "chevron",
  resolve = NO_BINDINGS,
}: {
  mode: PreviewMode;
  radiusStep?: number;
  rows?: number;
  showAvatar?: boolean;
  showAmount?: boolean;
  showBadge?: boolean;
  trailing?: "chevron" | "none";
  resolve?: Resolver;
}) {
  const r = resolve;
  const border = r("container.border") ?? tv("border-muted");

  const avatarResolve = useComponentBindings("avatar");
  const badgeResolve = useComponentBindings("badge");
  const childAvatarResolve = createChildResolver("avatar", resolve, avatarResolve);
  const childBadgeResolve = createChildResolver("badge", resolve, badgeResolve);

  const shownRows = LIST_ROWS.slice(0, Math.min(Math.max(Math.round(rows), 1), LIST_ROWS.length));

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
      {shownRows.map((row, i) => (
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
          {showAvatar ? (
            <TokenAvatar size="sm" radiusStep={7} initials={row.name.slice(0, 2).toUpperCase()} resolve={childAvatarResolve} />
          ) : null}
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: "block", fontSize: "var(--ark-text-sm)", fontWeight: 600, color: r("text.name") ?? tv("text-primary"), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {row.name}
            </span>
            <span style={{ display: "block", fontSize: "var(--ark-text-xs)", color: r("text.meta") ?? tv("text-muted") }}>
              {row.meta}
            </span>
          </span>
          {showAmount ? (
            <span style={{ fontSize: "var(--ark-text-sm)", fontWeight: 700, color: r("text.amount") ?? tv("text-primary"), fontVariantNumeric: "tabular-nums" }}>
              {row.amount}
            </span>
          ) : null}
          {showBadge ? (
            <TokenBadge variant={row.tone} mode={mode} resolve={childBadgeResolve}>
              {row.badge}
            </TokenBadge>
          ) : null}
          {trailing === "chevron" ? (
            <ChevronRight size={15} style={{ color: tv("text-muted"), flexShrink: 0 }} />
          ) : null}
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

  const cfg = useDesignSystem((s) => s.components.banner);
  const instances = cfg?.instances;

  const buttonResolve = useComponentBindings("button");
  const iconButtonResolve = useComponentBindings("iconButton");
  const childButtonResolve = createChildResolver("button", resolve, buttonResolve);
  const childIconButtonResolve = createChildResolver("iconButton", resolve, iconButtonResolve);

  const actionOpts = instances?.action ?? {};
  const actionLabel = (actionOpts.label as string) ?? "Review now";
  const actionVariant = (actionOpts.variant as any) ?? "filled";
  const actionSize = (actionOpts.size as any) ?? "sm";
  const actionPrefix = (actionOpts.prefixIcon as string) ?? "";
  const actionSuffix = (actionOpts.suffixIcon as string) ?? "";

  const dismissOpts = instances?.dismiss ?? {};
  const dismissVariant = (dismissOpts.variant as any) ?? "ghost";
  const dismissSize = (dismissOpts.size as any) ?? "sm";

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
        width: "100%",
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
        <div style={{ flexShrink: 0, marginLeft: "4px" }}>
          <TokenButton
            variant={actionVariant}
            size={actionSize}
            prefixIcon={actionPrefix}
            suffixIcon={actionSuffix}
            resolve={childButtonResolve}
          >
            {actionLabel}
          </TokenButton>
        </div>
      ) : null}
      {dismissible ? (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", marginLeft: "4px" }}>
          <TokenIconButton
            variant={dismissVariant}
            size={dismissSize}
            resolve={childIconButtonResolve}
            aria-label="Dismiss banner"
            onClick={() => {}}
          >
            <X size={15} />
          </TokenIconButton>
        </div>
      ) : null}
    </div>
  );
}

/* ── Field (label + control + help/error) ── */

export function TokenField({
  mode,
  radiusStep = 2,
  invalid = false,
  label = "Account email",
  required = true,
  help = "We’ll send receipts and statements here.",
  errorText = "Enter a valid work email address.",
  showHelp = true,
  resolve = NO_BINDINGS,
}: {
  mode: PreviewMode;
  radiusStep?: number;
  invalid?: boolean;
  label?: string;
  required?: boolean;
  help?: string;
  errorText?: string;
  showHelp?: boolean;
  resolve?: Resolver;
}) {
  const tone = useTone("error", mode);
  const r = resolve;

  const cfg = useDesignSystem((s) => s.components.field);
  const instances = cfg?.instances;

  const inputResolve = useComponentBindings("input");
  const childInputResolve = createChildResolver("input", resolve, inputResolve);

  const controlOpts = instances?.control ?? {};
  const controlSize = (controlOpts.size as any) ?? "md";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: sv(1), width: "100%", maxWidth: 340, fontFamily: "var(--ark-font-sans)" }}>
      <label style={{ fontSize: "var(--ark-text-sm)", fontWeight: 600, color: r("text.label") ?? tv("text-primary"), display: "inline-flex", gap: 3 }}>
        {label}
        {required ? <span style={{ color: r("text.required") ?? tone.accent }}>*</span> : null}
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
          size={controlSize}
          radiusStep={radiusStep}
          placeholder="name@company.com"
          resolve={childInputResolve}
        />
      </div>
      {showHelp || invalid ? (
        <span
          style={{
            fontSize: "var(--ark-text-xs)",
            color: invalid ? tone.accent : r("text.help") ?? tv("text-muted"),
            fontWeight: invalid ? 600 : 400,
          }}
        >
          {invalid ? errorText : help}
        </span>
      ) : null}
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
  columns = "auto",
  cells = 3,
  showDelta = true,
  resolve = NO_BINDINGS,
}: {
  mode: PreviewMode;
  radiusStep?: number;
  columns?: "auto" | "2" | "3" | "4";
  cells?: number;
  showDelta?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  const statResolve = useComponentBindings("stat");
  const cell: CSSProperties = {
    padding: sv(3),
    borderRadius: r("cell.radius") ?? rv(radiusStep),
    background: r("cell.bg") ?? tv("surface-elevated"),
    border: `1px solid ${r("cell.border") ?? tv("border-muted")}`,
    boxShadow: "var(--ark-shadow-low)",
  };
  const count = Math.min(Math.max(Math.round(cells), 2), 6);
  const shown = Array.from({ length: count }, (_, i) => GRID_STATS[i % GRID_STATS.length]);
  return (
    <div
      style={{
        display: "grid",
        gap: sv(3),
        // Every card keeps a readable floor width (a currency value + delta chip
        // never fit below ~220px). A fixed column count that needs more room than
        // the container simply overflows, and the studio wrapper scrolls it —
        // rather than the old `1fr` tracks squeezing past the edge and clipping.
        gridTemplateColumns:
          columns === "auto"
            ? "repeat(auto-fit, minmax(180px, 1fr))"
            : `repeat(${columns}, minmax(220px, 1fr))`,
        width: "100%",
      }}
    >
      {shown.map((s, i) => (
        <div key={`${s.label}-${i}`} style={cell}>
          <TokenStat mode={mode} label={s.label} value={s.value} delta={s.delta} trend={s.trend} showDelta={showDelta} resolve={statResolve} />
        </div>
      ))}
    </div>
  );
}

/* ── Feed item (comment / activity) ── */

export function TokenFeedItem({
  radiusStep = 4,
  author = "Maria Reyes",
  timestamp = "2h ago",
  body = "Flagged TXN-0459 for review — the vendor total doesn’t match the PO. Can finance confirm before close?",
  showAvatar = true,
  showActions = true,
  showReply = true,
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  author?: string;
  timestamp?: string;
  body?: string;
  showAvatar?: boolean;
  showActions?: boolean;
  showReply?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  const meta = r("text.meta") ?? tv("text-muted");
  const avatarResolve = useComponentBindings("avatar");
  const childAvatarResolve = createChildResolver("avatar", resolve, avatarResolve);
  const initials = author
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "MR";
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
      {showAvatar ? <TokenAvatar size="sm" radiusStep={7} initials={initials} resolve={childAvatarResolve} /> : null}
      <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: sv(1) }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: sv(1) }}>
          <span style={{ fontSize: "var(--ark-text-sm)", fontWeight: 700, color: r("text.name") ?? tv("text-primary") }}>
            {author}
          </span>
          <span style={{ fontSize: "var(--ark-text-xs)", color: meta }}>· {timestamp}</span>
        </div>
        <p style={{ margin: 0, fontSize: "var(--ark-text-sm)", color: r("text.body") ?? tv("text-secondary"), lineHeight: 1.55 }}>
          {body}
        </p>
        {showActions || showReply ? (
          <div style={{ display: "flex", alignItems: "center", gap: sv(3), marginTop: sv(1) }}>
            {showActions ? (
              <>
                <span style={{ display: "inline-flex", alignItems: "center", gap: sv(1), fontSize: "var(--ark-text-xs)", color: meta, cursor: "pointer" }}>
                  <Heart size={13} /> 12
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: sv(1), fontSize: "var(--ark-text-xs)", color: meta, cursor: "pointer" }}>
                  <MessageCircle size={13} /> 3
                </span>
              </>
            ) : null}
            {showReply ? (
              <span style={{ fontSize: "var(--ark-text-xs)", fontWeight: 600, color: r("text.link") ?? tv("text-link"), cursor: "pointer", marginLeft: "auto" }}>
                Reply
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
