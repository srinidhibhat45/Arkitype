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
import {
  materialSurface,
  appleSurface,
  appleIconBadge,
  carbonSurface,
  TemplateTextAction,
  AppleTrailingAction,
  AppleDismiss,
  CarbonCloseButton,
  MATERIAL_RADIUS,
  APPLE_RADIUS,
  useTemplate,
  tplRadius,
  tplPad,
  tplWeight,
  tplShadow,
  tplBorderWidth,
} from "./templateKit";

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
  template,
}: {
  mode: PreviewMode;
  radiusStep?: number;
  rows?: number;
  showAvatar?: boolean;
  showAmount?: boolean;
  showBadge?: boolean;
  trailing?: "chevron" | "none";
  resolve?: Resolver;
  /** Template id — see lib/componentTemplates.ts. */
  template?: string;
}) {
  const r = resolve;
  const border = r("container.border") ?? tv("border-muted");

  const avatarResolve = useComponentBindings("avatar");
  const badgeResolve = useComponentBindings("badge");
  const childAvatarResolve = createChildResolver("avatar", resolve, avatarResolve);
  const childBadgeResolve = createChildResolver("badge", resolve, badgeResolve);
  const listCfg = useDesignSystem((s) => s.components.listItem);

  const shownRows = LIST_ROWS.slice(0, Math.min(Math.max(Math.round(rows), 1), LIST_ROWS.length));

  // ── Templates (lib/componentTemplates.ts) — structure only; the same rows,
  // avatars, badges and option flags feed every branch.
  // One source of truth for "which template is active": the hook resolves an
  // explicit prop, then a preview scope, then the stored choice — so the
  // structural branch below and the shape grammar can never disagree.
  const tpl = useTemplate("listItem", template);
  const activeTemplate = tpl.id;

  if (activeTemplate === "material3") {
    return (
      <div
        style={{
          borderRadius: r("container.radius") ?? `${MATERIAL_RADIUS.md}px`,
          background: r("container.bg") ?? tv("surface-elevated"),
          border: "none",
          padding: sv(1),
          maxWidth: 440,
          fontFamily: "var(--ark-font-sans)",
        }}
      >
        {shownRows.map((row) => (
          <div
            key={row.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: sv(2),
              padding: `${sv(2)} ${sv(2)}`,
              borderRadius: MATERIAL_RADIUS.sm,
              background: "transparent",
            }}
          >
            {showAvatar ? (
              <TokenAvatar
                size="md"
                radiusStep={7}
                initials={row.name.slice(0, 2).toUpperCase()}
                resolve={childAvatarResolve}
              />
            ) : null}
            <span style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  display: "block",
                  fontSize: "var(--ark-text-sm)",
                  fontWeight: 600,
                  color: r("text.name") ?? tv("text-primary"),
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.name}
              </span>
              <span
                style={{ display: "block", fontSize: "var(--ark-text-xs)", color: r("text.meta") ?? tv("text-muted") }}
              >
                {row.meta}
              </span>
            </span>
            {showAmount ? (
              <span
                style={{
                  fontSize: "var(--ark-text-sm)",
                  fontWeight: 700,
                  color: r("text.amount") ?? tv("text-primary"),
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {row.amount}
              </span>
            ) : null}
            {showBadge ? (
              <TokenBadge variant={row.tone} mode={mode} resolve={childBadgeResolve}>
                {row.badge}
              </TokenBadge>
            ) : null}
            {trailing === "chevron" ? (
              <ChevronRight size={16} style={{ color: tv("text-muted"), flexShrink: 0 }} />
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (activeTemplate === "apple") {
    // iOS grouped list: hairline dividers that start after the avatar gutter,
    // and a chevron that reads as "this whole row pushes a detail view".
    const inset = showAvatar ? 46 : 0;
    return (
      <div
        style={{
          ...appleSurface(),
          borderRadius: r("container.radius") ?? `${APPLE_RADIUS.md}px`,
          background: r("container.bg") ?? tv("surface-elevated"),
          overflow: "hidden",
          maxWidth: 440,
          fontFamily: "var(--ark-font-sans)",
        }}
      >
        {shownRows.map((row, i) => (
          <div key={row.name}>
            {i > 0 ? (
              <div style={{ height: 1, background: border, marginLeft: inset }} />
            ) : null}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: sv(2),
                padding: `${sv(2)} ${sv(3)}`,
              }}
            >
              {showAvatar ? (
                <TokenAvatar
                  size="sm"
                  radiusStep={7}
                  initials={row.name.slice(0, 2).toUpperCase()}
                  resolve={childAvatarResolve}
                />
              ) : null}
              <span style={{ minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "var(--ark-text-sm)",
                    fontWeight: 600,
                    color: r("text.name") ?? tv("text-primary"),
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {row.name}
                </span>
                <span
                  style={{ display: "block", fontSize: "var(--ark-text-xs)", color: r("text.meta") ?? tv("text-muted") }}
                >
                  {row.meta}
                </span>
              </span>
              {showAmount ? (
                <span
                  style={{
                    fontSize: "var(--ark-text-sm)",
                    color: r("text.amount") ?? tv("text-muted"),
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {row.amount}
                </span>
              ) : null}
              {showBadge ? (
                <TokenBadge variant={row.tone} mode={mode} resolve={childBadgeResolve}>
                  {row.badge}
                </TokenBadge>
              ) : null}
              {trailing === "chevron" ? (
                <ChevronRight size={16} style={{ color: tv("text-muted"), flexShrink: 0 }} />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activeTemplate === "carbon") {
    return (
      <div
        style={{
          borderRadius: r("container.radius") ?? 0,
          border: `1px solid ${border}`,
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
              padding: `${sv(1)} ${sv(2)}`,
              minHeight: 40,
              borderTop: i > 0 ? `1px solid ${border}` : "none",
            }}
          >
            {showAvatar ? (
              <TokenAvatar
                size="sm"
                radiusStep={0}
                initials={row.name.slice(0, 2).toUpperCase()}
                resolve={childAvatarResolve}
              />
            ) : null}
            <span style={{ minWidth: 0, flex: 1 }}>
              <span
                style={{
                  display: "block",
                  fontSize: "var(--ark-text-sm)",
                  fontWeight: 600,
                  color: r("text.name") ?? tv("text-primary"),
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {row.name}
              </span>
              <span
                style={{ display: "block", fontSize: "var(--ark-text-xs)", color: r("text.meta") ?? tv("text-muted") }}
              >
                {row.meta}
              </span>
            </span>
            {showAmount ? (
              <span
                style={{
                  fontSize: "var(--ark-text-sm)",
                  fontWeight: 600,
                  fontFamily: "var(--ark-font-mono)",
                  color: r("text.amount") ?? tv("text-primary"),
                  fontVariantNumeric: "tabular-nums",
                }}
              >
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

  return (
    <div
      style={{
        borderRadius: r("container.radius") ?? tplRadius(tpl, "surface") ?? rv(radiusStep),
        border: `${tpl.border ?? 1}px solid ${border}`,
        boxShadow: tplShadow(tpl, "raised") ?? undefined,
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
            padding: `${tplPad(tpl, sv(2))} ${tplPad(tpl, sv(3))}`,
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
  template,
}: {
  mode: PreviewMode;
  radiusStep?: number;
  variant?: ToneVariant;
  icon?: boolean;
  action?: boolean;
  dismissible?: boolean;
  resolve?: Resolver;
  /** Template id — see lib/componentTemplates.ts. */
  template?: string;
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

  // ── Templates (lib/componentTemplates.ts) — structure only. The banner's
  // copy is fixed demo content in every branch, exactly as in the default.
  // One source of truth for "which template is active": the hook resolves an
  // explicit prop, then a preview scope, then the stored choice — so the
  // structural branch below and the shape grammar can never disagree.
  const tpl = useTemplate("banner", template);
  const activeTemplate = tpl.id;
  const bannerTitle = "Q3 close is in 5 days";
  const bannerBody = "Reconcile pending transactions before the ledger locks.";

  if (activeTemplate === "material3") {
    return (
      <div
        role="region"
        style={{
          ...materialSurface(tone),
          borderRadius: r("container.radius") ?? `${MATERIAL_RADIUS.md}px`,
          padding: `${r("container.padY") ?? sv(3)} ${r("container.padX") ?? sv(4)}`,
          fontFamily: "var(--ark-font-sans)",
          display: "flex",
          alignItems: "center",
          gap: sv(2),
          width: "100%",
        }}
      >
        {icon ? <Megaphone size={18} style={{ color: tone.accent, flexShrink: 0 }} /> : null}
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", fontSize: "var(--ark-text-sm)", fontWeight: 700 }}>
            {bannerTitle}
          </span>
          <span style={{ display: "block", fontSize: "var(--ark-text-xs)", opacity: 0.85 }}>
            {bannerBody}
          </span>
        </span>
        {action ? (
          <span style={{ flexShrink: 0, marginLeft: 4 }}>
            <TemplateTextAction label={actionLabel} color={tone.accent} variant="material" />
          </span>
        ) : null}
        {dismissible ? (
          <button
            type="button"
            aria-label="Dismiss banner"
            onClick={() => {}}
            style={{
              background: "none",
              border: "none",
              padding: 2,
              marginLeft: 4,
              cursor: "pointer",
              color: tone.text,
              opacity: 0.6,
              flexShrink: 0,
              display: "inline-flex",
            }}
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
    );
  }

  if (activeTemplate === "apple") {
    return (
      <div
        role="region"
        style={{
          ...appleSurface(),
          borderRadius: r("container.radius") ?? `${APPLE_RADIUS.md}px`,
          padding: `${r("container.padY") ?? sv(2)} ${r("container.padX") ?? sv(2)}`,
          fontFamily: "var(--ark-font-sans)",
          display: "flex",
          alignItems: "center",
          gap: sv(2),
          width: "100%",
        }}
      >
        {icon ? (
          <span style={appleIconBadge(tone, 34)}>
            <Megaphone size={17} />
          </span>
        ) : null}
        <span style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: "block",
              fontSize: "var(--ark-text-sm)",
              fontWeight: 700,
              color: tv("text-primary"),
            }}
          >
            {bannerTitle}
          </span>
          <span
            style={{ display: "block", fontSize: "var(--ark-text-xs)", color: tv("text-secondary") }}
          >
            {bannerBody}
          </span>
        </span>
        {action ? <AppleTrailingAction label={actionLabel} color={tone.accent} /> : null}
        {dismissible ? <AppleDismiss onClick={() => {}} label="Dismiss banner" /> : null}
      </div>
    );
  }

  if (activeTemplate === "carbon") {
    return (
      <div
        role="region"
        style={{
          position: "relative",
          ...carbonSurface(tone),
          borderRadius: r("container.radius") ?? 0,
          // Longhand, never the `padding` shorthand alongside a paddingRight
          // override — mixing the two makes React warn on rerender.
          paddingTop: r("container.padY") ?? sv(3),
          paddingBottom: r("container.padY") ?? sv(3),
          paddingLeft: r("container.padX") ?? sv(3),
          paddingRight: dismissible ? 28 : r("container.padX") ?? sv(3),
          fontFamily: "var(--ark-font-sans)",
          display: "flex",
          alignItems: "flex-start",
          gap: sv(2),
          width: "100%",
        }}
      >
        {icon ? <Megaphone size={15} style={{ color: tone.accent, flexShrink: 0, marginTop: 2 }} /> : null}
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", fontSize: "var(--ark-text-sm)", fontWeight: 700 }}>
            {bannerTitle}
          </span>
          <span style={{ display: "block", fontSize: "var(--ark-text-xs)", opacity: 0.9 }}>
            {bannerBody}
          </span>
          {action ? (
            <span style={{ display: "block", marginTop: 6 }}>
              <TemplateTextAction label={actionLabel} color={tone.accent} variant="carbon" />
            </span>
          ) : null}
        </span>
        {dismissible ? (
          <CarbonCloseButton color={tone.text} onClick={() => {}} label="Dismiss banner" />
        ) : null}
      </div>
    );
  }

  return (
    <div
      role="region"
      style={{
        display: "flex",
        alignItems: "center",
        gap: sv(2),
        padding: `${r("container.padY") ?? tplPad(tpl, sv(2))} ${r("container.padX") ?? tplPad(tpl, sv(3))}`,
        borderRadius: r("container.radius") ?? tplRadius(tpl, "surface") ?? rv(radiusStep),
        background: tone.bg,
        border: `${tpl.border ?? 1}px solid ${tone.border}`,
        boxShadow: tplShadow(tpl, "raised") ?? undefined,
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
  // A field wraps an Input, which takes the edge grammar itself — what's left
  // here is the label's voice and the corner of the invalid ring, which has to
  // agree with the control it's drawn around.
  const tpl = useTemplate("field");
  const cfg = useDesignSystem((s) => s.components.field);
  const instances = cfg?.instances;

  const inputResolve = useComponentBindings("input");
  const childInputResolve = createChildResolver("input", resolve, inputResolve);

  const controlOpts = instances?.control ?? {};
  const controlSize = (controlOpts.size as any) ?? "md";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: sv(1), width: "100%", maxWidth: 340, fontFamily: "var(--ark-font-sans)" }}>
      <label
        style={{
          fontSize: "var(--ark-text-sm)",
          fontWeight: tplWeight(tpl) ?? 600,
          letterSpacing: tpl.type?.tracking,
          color: r("text.label") ?? tv("text-primary"),
          display: "inline-flex",
          gap: 3,
        }}
      >
        {label}
        {required ? <span style={{ color: r("text.required") ?? tone.accent }}>*</span> : null}
      </label>
      <div
        style={
          invalid
            ? {
                borderRadius: tplRadius(tpl, "field") ?? rv(radiusStep),
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
  // A grid of cards: corner, edge, elevation and the gutter between them are
  // exactly the four things the systems disagree about.
  const tpl = useTemplate("statGrid");
  const cell: CSSProperties = {
    padding: tplPad(tpl, sv(3)),
    borderRadius: r("cell.radius") ?? tplRadius(tpl, "surface") ?? rv(radiusStep),
    background: r("cell.bg") ?? tv("surface-elevated"),
    border: `${tpl.border ?? 1}px solid ${r("cell.border") ?? tv("border-muted")}`,
    boxShadow: tplShadow(tpl, "raised") ?? "var(--ark-shadow-low)",
  };
  const count = Math.min(Math.max(Math.round(cells), 2), 6);
  const shown = Array.from({ length: count }, (_, i) => GRID_STATS[i % GRID_STATS.length]);
  return (
    <div
      style={{
        display: "grid",
        gap: tplPad(tpl, sv(3)),
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
  template,
}: {
  radiusStep?: number;
  author?: string;
  timestamp?: string;
  body?: string;
  showAvatar?: boolean;
  showActions?: boolean;
  showReply?: boolean;
  resolve?: Resolver;
  /** Template id — see lib/componentTemplates.ts. */
  template?: string;
}) {
  const r = resolve;
  const meta = r("text.meta") ?? tv("text-muted");
  const avatarResolve = useComponentBindings("avatar");
  const childAvatarResolve = createChildResolver("avatar", resolve, avatarResolve);
  const feedCfg = useDesignSystem((s) => s.components.feedItem);
  const initials = author
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "MR";

  // ── Templates (lib/componentTemplates.ts) — structure only; author, body,
  // timestamp and the reaction/reply flags are shared by every branch.
  // One source of truth for "which template is active": the hook resolves an
  // explicit prop, then a preview scope, then the stored choice — so the
  // structural branch below and the shape grammar can never disagree.
  const tpl = useTemplate("feedItem", template);
  const activeTemplate = tpl.id;

  const reactions = showActions ? (
    <>
      <span style={{ display: "inline-flex", alignItems: "center", gap: sv(1), fontSize: "var(--ark-text-xs)", color: meta, cursor: "pointer" }}>
        <Heart size={13} /> 12
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: sv(1), fontSize: "var(--ark-text-xs)", color: meta, cursor: "pointer" }}>
        <MessageCircle size={13} /> 3
      </span>
    </>
  ) : null;

  if (activeTemplate === "material3") {
    return (
      <div
        style={{
          display: "flex",
          gap: sv(2),
          padding: sv(4),
          borderRadius: r("container.radius") ?? `${MATERIAL_RADIUS.md}px`,
          border: "none",
          background: r("container.bg") ?? tv("surface-elevated"),
          boxShadow: "var(--ark-shadow-low)",
          maxWidth: 460,
          fontFamily: "var(--ark-font-sans)",
        }}
      >
        {showAvatar ? <TokenAvatar size="md" radiusStep={7} initials={initials} resolve={childAvatarResolve} /> : null}
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
              {reactions}
              {showReply ? (
                <span style={{ marginLeft: "auto" }}>
                  <TemplateTextAction label="Reply" color={r("text.link") ?? tv("text-link")} variant="material" />
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (activeTemplate === "apple") {
    return (
      <div
        style={{
          ...appleSurface(),
          display: "flex",
          gap: sv(2),
          padding: sv(3),
          borderRadius: r("container.radius") ?? `${APPLE_RADIUS.md}px`,
          background: r("container.bg") ?? tv("surface-elevated"),
          maxWidth: 460,
          fontFamily: "var(--ark-font-sans)",
        }}
      >
        {showAvatar ? <TokenAvatar size="sm" radiusStep={7} initials={initials} resolve={childAvatarResolve} /> : null}
        <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: sv(1) }}>
            <span
              style={{
                fontSize: "var(--ark-text-sm)",
                fontWeight: "var(--ark-font-weight-bold)",
                color: r("text.name") ?? tv("text-primary"),
              }}
            >
              {author}
            </span>
            <span style={{ fontSize: "var(--ark-text-xs)", color: meta, marginLeft: "auto" }}>{timestamp}</span>
            {showReply ? <ChevronRight size={15} style={{ color: meta, flexShrink: 0 }} /> : null}
          </div>
          <p style={{ margin: 0, fontSize: "var(--ark-text-sm)", color: r("text.body") ?? tv("text-secondary"), lineHeight: 1.5 }}>
            {body}
          </p>
          {showActions ? (
            <div style={{ display: "flex", alignItems: "center", gap: sv(3), marginTop: sv(1) }}>{reactions}</div>
          ) : null}
        </div>
      </div>
    );
  }

  if (activeTemplate === "carbon") {
    const rule = r("container.border") ?? tv("border-muted");
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          borderRadius: r("container.radius") ?? 0,
          border: `1px solid ${rule}`,
          background: r("container.bg") ?? tv("surface-elevated"),
          maxWidth: 460,
          fontFamily: "var(--ark-font-sans)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: sv(2),
            padding: `${sv(2)} ${sv(3)}`,
            borderBottom: `1px solid ${rule}`,
          }}
        >
          {showAvatar ? <TokenAvatar size="sm" radiusStep={0} initials={initials} resolve={childAvatarResolve} /> : null}
          <span
            style={{
              fontSize: "var(--ark-text-sm)",
              fontWeight: "var(--ark-font-weight-bold)",
              color: r("text.name") ?? tv("text-primary"),
            }}
          >
            {author}
          </span>
          <span style={{ fontSize: "var(--ark-text-xs)", color: meta, marginLeft: "auto", fontFamily: "var(--ark-font-mono)" }}>
            {timestamp}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: sv(2), padding: `${sv(2)} ${sv(3)}` }}>
          <p style={{ margin: 0, fontSize: "var(--ark-text-sm)", color: r("text.body") ?? tv("text-secondary"), lineHeight: 1.55 }}>
            {body}
          </p>
          {showActions || showReply ? (
            <div style={{ display: "flex", alignItems: "center", gap: sv(3) }}>
              {reactions}
              {showReply ? (
                <span style={{ marginLeft: "auto" }}>
                  <TemplateTextAction label="Reply" color={r("text.link") ?? tv("text-link")} variant="carbon" />
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        gap: sv(2),
        padding: tplPad(tpl, sv(3)),
        borderRadius: r("container.radius") ?? tplRadius(tpl, "surface") ?? rv(radiusStep),
        border: `${tpl.border ?? 1}px solid ${r("container.border") ?? tv("border-muted")}`,
        background: r("container.bg") ?? tv("surface-elevated"),
        boxShadow: tplShadow(tpl, "raised") ?? undefined,
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

/* ── Drawer (edge-anchored side sheet) ── */

/**
 * The overlay surface Modal doesn't cover: a panel anchored to an edge rather
 * than centred. Draws its own scrim so the preview reads as an overlay, and
 * nests real Button / Icon button instances for its actions (never restyled
 * copies — style comes from those components' own bindings).
 */
export function TokenDrawer({
  side = "right",
  elevation = "high",
  title = "Ledger settings",
  body = "Adjust how this ledger reconciles, who can approve entries, and where statements are delivered.",
  width = 320,
  showOverlay = true,
  showClose = true,
  showFooter = true,
  radiusStep = 4,
  resolve = NO_BINDINGS,
}: {
  side?: "left" | "right" | "bottom";
  elevation?: string;
  title?: string;
  body?: string;
  width?: number;
  showOverlay?: boolean;
  showClose?: boolean;
  showFooter?: boolean;
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const r = resolve;
  const buttonResolve = useComponentBindings("button");
  const iconButtonResolve = useComponentBindings("iconButton");
  const tpl = useTemplate("drawer");
  const horizontal = side !== "bottom";
  const rule = r("divider.color") ?? tv("border-muted");

  const panel: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    background: r("container.bg") ?? tv("surface-elevated"),
    border: `${r("container.borderWidth") ?? tplBorderWidth(tpl) ?? "1px"} solid ${r("container.border") ?? tv("border-default")}`,
    borderRadius: r("container.radius") ?? tplRadius(tpl, "overlay") ?? rv(radiusStep),
    boxShadow: `var(--ark-shadow-${elevation})`,
    fontFamily: "var(--ark-font-sans)",
    width: horizontal ? width : "100%",
    maxWidth: "100%",
    marginLeft: side === "right" ? "auto" : undefined,
    marginRight: side === "left" ? "auto" : undefined,
    marginTop: side === "bottom" ? "auto" : undefined,
    overflow: "hidden",
  };

  return (
    <div
      data-ark-part="overlay"
      style={{
        display: "flex",
        width: "100%",
        minHeight: 260,
        padding: sv(2),
        borderRadius: rv(radiusStep),
        background: showOverlay ? (r("overlay.bg") ?? "#0f172a99") : "transparent",
      }}
    >
      <div data-ark-part="container" style={panel}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: sv(2),
            padding: `${r("container.padY") ?? tplPad(tpl, sv(4))} ${r("container.padX") ?? tplPad(tpl, sv(4))}`,
            borderBottom: `1px solid ${rule}`,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              data-ark-part="title"
              style={{
                color: r("title.color") ?? tv("text-primary"),
                fontFamily: r("title.font") ?? "var(--ark-font-heading)",
                fontWeight: r("title.weight") ?? 700,
                fontSize: r("title.size") ?? "var(--ark-text-lg)",
              }}
            >
              {title}
            </div>
          </div>
          {showClose ? (
            <TokenIconButton
              variant="ghost"
              radiusStep={radiusStep}
              resolve={createChildResolver("iconButton", r, iconButtonResolve)}
            >
              <X size={14} />
            </TokenIconButton>
          ) : null}
        </div>

        <div
          data-ark-part="body"
          style={{
            flex: 1,
            padding: `${r("container.padY") ?? sv(4)} ${r("container.padX") ?? sv(4)}`,
            color: r("body.color") ?? tv("text-secondary"),
            fontFamily: r("body.font") ?? "var(--ark-font-sans)",
            fontSize: r("body.size") ?? "var(--ark-text-sm)",
            lineHeight: 1.55,
          }}
        >
          {body}
        </div>

        {showFooter ? (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: sv(2),
              padding: `${r("container.padY") ?? sv(4)} ${r("container.padX") ?? sv(4)}`,
              borderTop: `1px solid ${rule}`,
            }}
          >
            <TokenButton
              variant="text"
              size="md"
              resolve={createChildResolver("button", r, buttonResolve)}
            >
              Cancel
            </TokenButton>
            <TokenButton
              variant="filled"
              size="md"
              resolve={createChildResolver("button", r, buttonResolve)}
            >
              Save changes
            </TokenButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
