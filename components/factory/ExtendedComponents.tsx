"use client";

/**
 * Extended library parts distilled from the industry's leading systems —
 * Material 3, Carbon, Lightning (SLDS), Polaris, Atlassian and Apple HIG:
 *
 *   • Chip       — M3 assist/filter/input/suggestion chips, SLDS pills.
 *   • Rating     — Apple rating indicators / star inputs.
 *   • Popover    — Carbon/Polaris popover, Atlassian popup, Apple popovers.
 *   • FileUpload — Carbon file uploader, Polaris drop zone, SLDS file selector.
 *   • Timeline   — activity trail (Carbon/Atlassian patterns).
 *   • Tree       — Carbon tree view, SLDS tree grid.
 *
 * Every visual attribute resolves from --ark-* tokens (semantic roles, spacing,
 * radius, type, motion). Nothing is a magic number; a `resolve()` override wins
 * over the hardcoded fallback so the studio can rebind any part to any role.
 */
import type { CSSProperties, ReactNode } from "react";
import {
  Check,
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  Folder,
  MapPin,
  Star,
  UploadCloud,
  X,
} from "lucide-react";
import { PreviewMode, useDesignSystem } from "@/store/useDesignSystem";
import { rv, sv, tv } from "@/lib/tokens";
import {
  CState,
  NO_BINDINGS,
  Resolver,
  createChildResolver,
  useComponentBindings,
} from "@/lib/componentSchema";
import { pxNum, TokenButton } from "./CoreComponents";

/* ────────────────────────────── Chip ────────────────────────────── */

const CHIP_SIZE: Record<string, { py: number; px: number; text: string; icon: number }> = {
  sm: { py: 1, px: 2, text: "xs", icon: 12 },
  md: { py: 1, px: 3, text: "sm", icon: 14 },
};

export function TokenChip({
  variant = "assist",
  state = "default",
  size = "md",
  selected = false,
  leadingIcon = true,
  removable = false,
  radiusStep = 7,
  children = "Chip",
  resolve = NO_BINDINGS,
}: {
  variant?: "assist" | "filter" | "input" | "suggestion";
  state?: CState;
  size?: "sm" | "md";
  selected?: boolean;
  leadingIcon?: boolean;
  removable?: boolean;
  radiusStep?: number;
  children?: ReactNode;
  resolve?: Resolver;
}) {
  const s = CHIP_SIZE[size] ?? CHIP_SIZE.md;
  const disabled = state === "disabled";
  const r = resolve;

  // Selected chips (filter/input) flip to the accent recipe; unselected chips
  // are outlined (assist/filter) or tonal (input/suggestion) by default.
  const isTonal = variant === "input" || variant === "suggestion";
  let bg = r("container.bg", state) ?? (isTonal ? tv("surface-subtle") : "transparent");
  let border = r("container.border", state) ?? tv("border-default");
  let text = r("label.color", state) ?? tv("text-secondary");
  let iconColor = r("leadingIcon.color", state) ?? tv("text-muted");

  if (selected) {
    bg = r("container.bg", state) ?? tv("action-primary-default");
    border = r("container.border", state) ?? tv("action-primary-default");
    text = r("label.color", state) ?? tv("text-on-action");
    iconColor = r("leadingIcon.color", state) ?? tv("text-on-action");
  }
  if (disabled) {
    bg = selected ? tv("surface-subtle") : "transparent";
    border = tv("border-muted");
    text = tv("text-muted");
    iconColor = tv("text-muted");
  }

  const showLead = leadingIcon && !(variant === "suggestion");
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: sv(1),
        padding: `${r("container.padY") ?? sv(s.py)} ${r("container.padX") ?? sv(s.px)}`,
        borderRadius: r("container.radius") ?? rv(radiusStep),
        background: bg,
        border: `${r("container.borderWidth") ?? "1px"} solid ${border}`,
        color: text,
        fontSize: `var(--ark-text-${s.text})`,
        fontFamily: r("label.font") ?? "var(--ark-font-sans)",
        fontWeight: 500,
        lineHeight: 1.2,
        opacity: disabled ? 0.75 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        transition: "background var(--ark-duration-fast) var(--ark-ease-out), border-color var(--ark-duration-fast) var(--ark-ease-out)",
      }}
    >
      {showLead ? (
        selected ? (
          <Check size={pxNum(r("leadingIcon.size"), s.icon)} style={{ color: iconColor }} strokeWidth={3} />
        ) : (
          <MapPin size={pxNum(r("leadingIcon.size"), s.icon)} style={{ color: iconColor }} />
        )
      ) : null}
      {children}
      {removable ? (
        <X
          size={pxNum(r("removeIcon.size"), s.icon - 1)}
          style={{ color: r("removeIcon.color") ?? (selected ? text : tv("text-muted")), cursor: "pointer" }}
          aria-label="Remove"
        />
      ) : null}
    </span>
  );
}

/* ────────────────────────────── Rating ────────────────────────────── */

export function TokenRating({
  value = 3,
  max = 5,
  size = 20,
  allowHalf = false,
  resolve = NO_BINDINGS,
}: {
  value?: number;
  max?: number;
  size?: number;
  allowHalf?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  const on = r("star.on") ?? tv("action-primary-default");
  const off = r("star.off") ?? tv("border-strong");
  const stars: ReactNode[] = [];
  for (let i = 0; i < max; i++) {
    const filled = i + 1 <= Math.floor(value);
    const half = allowHalf && !filled && i < value && i + 1 > value;
    stars.push(
      <span key={i} style={{ position: "relative", display: "inline-flex", lineHeight: 0 }}>
        <Star size={size} style={{ color: off }} fill="none" />
        {(filled || half) && (
          <span
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              width: half ? "50%" : "100%",
              display: "inline-flex",
              lineHeight: 0,
            }}
          >
            <Star size={size} style={{ color: on }} fill="currentColor" />
          </span>
        )}
      </span>
    );
  }
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 3 }} role="img" aria-label={`${value} of ${max}`}>
      {stars}
    </div>
  );
}

/* ────────────────────────────── Popover ────────────────────────────── */

type Placement = "top" | "right" | "bottom" | "left";

function arrowStyle(placement: Placement, color: string, border: string): CSSProperties {
  const size = 7;
  const base: CSSProperties = { position: "absolute", width: 0, height: 0 };
  switch (placement) {
    case "top": // arrow points down, sits at bottom edge
      return { ...base, bottom: -size, left: "50%", transform: "translateX(-50%)", borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent`, borderTop: `${size}px solid ${color}`, filter: `drop-shadow(0 1px 0 ${border})` };
    case "bottom":
      return { ...base, top: -size, left: "50%", transform: "translateX(-50%)", borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent`, borderBottom: `${size}px solid ${color}` };
    case "left":
      return { ...base, right: -size, top: "50%", transform: "translateY(-50%)", borderTop: `${size}px solid transparent`, borderBottom: `${size}px solid transparent`, borderLeft: `${size}px solid ${color}` };
    case "right":
    default:
      return { ...base, left: -size, top: "50%", transform: "translateY(-50%)", borderTop: `${size}px solid transparent`, borderBottom: `${size}px solid transparent`, borderRight: `${size}px solid ${color}` };
  }
}

export function TokenPopover({
  placement = "bottom",
  radiusStep = 3,
  title = "Filter results",
  body = "Narrow the ledger to a date range, status or owner. Selections apply instantly.",
  showArrow = true,
  showClose = true,
  showAction = true,
  elevation = "high",
  resolve = NO_BINDINGS,
}: {
  placement?: Placement;
  radiusStep?: number;
  title?: string;
  body?: string;
  showArrow?: boolean;
  showClose?: boolean;
  showAction?: boolean;
  elevation?: string;
  resolve?: Resolver;
}) {
  const r = resolve;
  const bg = r("container.bg") ?? tv("surface-elevated");
  const border = r("container.border") ?? tv("border-default");

  const cfg = useDesignSystem((s) => s.components.popover);
  const instances = cfg?.instances;
  const buttonResolve = useComponentBindings("button");
  const childButtonResolve = createChildResolver("button", resolve, buttonResolve);
  const actionOpts = instances?.action ?? {};

  return (
    <div style={{ position: "relative", maxWidth: 280 }}>
      <div
        style={{
          position: "relative",
          background: bg,
          border: `${r("container.borderWidth") ?? "1px"} solid ${border}`,
          borderRadius: r("container.radius") ?? rv(radiusStep),
          boxShadow: `var(--ark-shadow-${elevation})`,
          padding: `${sv(2)} ${sv(3)}`,
          fontFamily: "var(--ark-font-sans)",
        }}
        role="dialog"
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: sv(2) }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "var(--ark-text-sm)", fontWeight: 700, color: r("text.title") ?? tv("text-primary") }}>
              {title}
            </div>
            <div style={{ marginTop: 2, fontSize: "var(--ark-text-xs)", lineHeight: 1.5, color: r("text.body") ?? tv("text-secondary") }}>
              {body}
            </div>
          </div>
          {showClose ? (
            <X size={14} style={{ color: r("closeIcon.color") ?? tv("text-muted"), cursor: "pointer", flexShrink: 0 }} aria-label="Close" />
          ) : null}
        </div>
        {showAction ? (
          <div style={{ marginTop: sv(2), display: "flex", justifyContent: "flex-end" }}>
            <TokenButton
              variant={(actionOpts.variant as any) ?? "filled"}
              size={(actionOpts.size as any) ?? "sm"}
              prefixIcon={(actionOpts.prefixIcon as string) ?? ""}
              suffixIcon={(actionOpts.suffixIcon as string) ?? ""}
              resolve={childButtonResolve}
            >
              {(actionOpts.label as string) ?? "Apply"}
            </TokenButton>
          </div>
        ) : null}
        {showArrow ? <span style={arrowStyle(placement, bg, border)} /> : null}
      </div>
    </div>
  );
}

/* ────────────────────────────── File upload / drop zone ────────────────────── */

export function TokenFileUpload({
  variant = "idle",
  radiusStep = 4,
  title = "Drag files here or browse",
  hint = "PNG, PDF or CSV up to 10 MB",
  showButton = true,
  resolve = NO_BINDINGS,
}: {
  variant?: "idle" | "dragActive" | "error";
  radiusStep?: number;
  title?: string;
  hint?: string;
  showButton?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  const active = variant === "dragActive";
  const error = variant === "error";

  const bg =
    r("container.bg") ??
    (active ? tv("feedback-info-surface") : error ? tv("feedback-error-surface") : tv("surface-subtle"));
  const border =
    r("container.border") ??
    (active ? tv("border-focus") : error ? tv("feedback-error-border") : tv("border-default"));
  const iconColor =
    r("icon.color") ?? (active ? tv("border-focus") : error ? tv("feedback-error-text") : tv("text-muted"));

  const cfg = useDesignSystem((s) => s.components.fileUpload);
  const instances = cfg?.instances;
  const buttonResolve = useComponentBindings("button");
  const childButtonResolve = createChildResolver("button", resolve, buttonResolve);
  const actionOpts = instances?.browse ?? {};

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: sv(2),
        textAlign: "center",
        padding: `${r("container.padY") ?? sv(5)} ${r("container.padX") ?? sv(4)}`,
        borderRadius: r("container.radius") ?? rv(radiusStep),
        background: bg,
        border: `${r("container.borderWidth") ?? "2px"} dashed ${border}`,
        fontFamily: "var(--ark-font-sans)",
        width: "100%",
        transition: "background var(--ark-duration-fast) var(--ark-ease-out), border-color var(--ark-duration-fast) var(--ark-ease-out)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: rv(7),
          background: r("icon.bg") ?? tv("surface-elevated"),
          border: `1px solid ${r("icon.border") ?? tv("border-muted")}`,
          color: iconColor,
        }}
      >
        <UploadCloud size={pxNum(r("icon.size"), 20)} />
      </span>
      <div style={{ fontSize: "var(--ark-text-sm)", fontWeight: 600, color: r("text.title") ?? tv("text-primary") }}>
        {title}
      </div>
      <div style={{ fontSize: "var(--ark-text-xs)", color: error ? tv("feedback-error-text") : r("text.hint") ?? tv("text-muted") }}>
        {hint}
      </div>
      {showButton ? (
        <div style={{ marginTop: sv(1) }}>
          <TokenButton
            variant={(actionOpts.variant as any) ?? "outlined"}
            size={(actionOpts.size as any) ?? "sm"}
            prefixIcon={(actionOpts.prefixIcon as string) ?? ""}
            suffixIcon={(actionOpts.suffixIcon as string) ?? ""}
            resolve={childButtonResolve}
          >
            {(actionOpts.label as string) ?? "Browse files"}
          </TokenButton>
        </div>
      ) : null}
    </div>
  );
}

/* ────────────────────────────── Timeline ────────────────────────────── */

const TIMELINE_ENTRIES = [
  { title: "Invoice paid", meta: "09:24 · Finance bot", body: "TXN-0459 cleared to the operating account." },
  { title: "Approval granted", meta: "08:10 · A. Okafor", body: "Budget request signed off within policy limits." },
  { title: "Draft submitted", meta: "Yesterday · You", body: "Initial request queued for review." },
  { title: "Ticket opened", meta: "2 days ago · System", body: "Automatic intake from the request form." },
  { title: "Account created", meta: "Last week · System", body: "Workspace provisioned and seeded." },
];

export function TokenTimeline({
  entries = 3,
  markerShape = "dot",
  connector = "solid",
  resolve = NO_BINDINGS,
}: {
  entries?: number;
  markerShape?: "dot" | "ring" | "icon";
  connector?: "solid" | "dashed";
  resolve?: Resolver;
}) {
  const r = resolve;
  const n = Math.min(Math.max(entries, 1), TIMELINE_ENTRIES.length);
  const lineColor = r("line.color") ?? tv("border-default");
  const markerBg = r("marker.bg") ?? tv("action-primary-default");
  const markerRing = r("marker.ring") ?? tv("surface-base");

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", fontFamily: "var(--ark-font-sans)" }}>
      {TIMELINE_ENTRIES.slice(0, n).map((e, i) => {
        const last = i === n - 1;
        return (
          <div key={i} style={{ display: "flex", gap: sv(3) }}>
            {/* rail */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 18 }}>
              {markerShape === "ring" ? (
                <span style={{ width: 12, height: 12, borderRadius: "50%", background: markerRing, border: `2px solid ${markerBg}`, flexShrink: 0, marginTop: 3 }} />
              ) : markerShape === "icon" ? (
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: markerBg, color: tv("text-on-action"), flexShrink: 0, marginTop: 1 }}>
                  <Check size={10} strokeWidth={3} />
                </span>
              ) : (
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: markerBg, boxShadow: `0 0 0 3px ${markerRing}`, flexShrink: 0, marginTop: 4 }} />
              )}
              {!last ? (
                <span
                  style={{
                    flex: 1,
                    width: connector === "dashed" ? 0 : 2,
                    minHeight: 26,
                    marginTop: 2,
                    background: connector === "dashed" ? "transparent" : lineColor,
                    borderLeft: connector === "dashed" ? `2px dashed ${lineColor}` : undefined,
                  }}
                />
              ) : null}
            </div>
            {/* content */}
            <div style={{ paddingBottom: last ? 0 : sv(3), minWidth: 0 }}>
              <div style={{ fontSize: "var(--ark-text-sm)", fontWeight: 600, color: r("text.title") ?? tv("text-primary") }}>
                {e.title}
              </div>
              <div style={{ fontSize: "var(--ark-text-xs)", color: r("text.meta") ?? tv("text-muted"), marginTop: 1 }}>
                {e.meta}
              </div>
              <div style={{ fontSize: "var(--ark-text-xs)", color: r("text.body") ?? tv("text-secondary"), marginTop: 3, lineHeight: 1.5 }}>
                {e.body}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────── Tree view ────────────────────────────── */

type TreeNode = { label: string; children?: TreeNode[]; open?: boolean };

const TREE_DATA: TreeNode[] = [
  {
    label: "tokens",
    open: true,
    children: [
      { label: "primitive.json" },
      { label: "semantic.json", children: [] },
    ],
  },
  {
    label: "components",
    open: true,
    children: [
      { label: "button.tsx" },
      { label: "card.tsx" },
    ],
  },
  { label: "index.ts" },
];

export function TokenTree({
  showIcons = true,
  showGuides = true,
  radiusStep = 2,
  selectedLabel = "semantic.json",
  resolve = NO_BINDINGS,
}: {
  showIcons?: boolean;
  showGuides?: boolean;
  radiusStep?: number;
  selectedLabel?: string;
  resolve?: Resolver;
}) {
  const r = resolve;
  const text = r("row.text") ?? tv("text-secondary");
  const selText = r("row.selectedText") ?? tv("text-primary");
  const selBg = r("row.selectedBg") ?? tv("surface-subtle");
  const chevron = r("chevron.color") ?? tv("text-muted");
  const iconColor = r("icon.color") ?? tv("action-primary-default");
  const guide = r("guide.color") ?? tv("border-muted");

  const renderNode = (node: TreeNode, depth: number, key: string): ReactNode => {
    const hasChildren = !!node.children;
    const open = node.open ?? false;
    const selected = node.label === selectedLabel;
    return (
      <div key={key}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: sv(1),
            paddingLeft: depth * 16 + 6,
            paddingRight: 8,
            height: 28,
            borderRadius: r("row.radius") ?? rv(radiusStep),
            background: selected ? selBg : "transparent",
            color: selected ? selText : text,
            fontSize: "var(--ark-text-sm)",
            fontWeight: selected ? 600 : 500,
            cursor: "pointer",
            position: "relative",
          }}
        >
          {showGuides && depth > 0 ? (
            <span style={{ position: "absolute", left: depth * 16 - 8, top: 0, bottom: 0, width: 1, background: guide }} />
          ) : null}
          {hasChildren ? (
            open ? (
              <ChevronDown size={13} style={{ color: chevron, flexShrink: 0 }} />
            ) : (
              <ChevronRight size={13} style={{ color: chevron, flexShrink: 0 }} />
            )
          ) : (
            <span style={{ width: 13, flexShrink: 0 }} />
          )}
          {showIcons ? (
            hasChildren ? (
              <Folder size={14} style={{ color: iconColor, flexShrink: 0 }} />
            ) : (
              <FileIcon size={14} style={{ color: tv("text-muted"), flexShrink: 0 }} />
            )
          ) : null}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "var(--ark-font-sans)" }}>
            {node.label}
          </span>
        </div>
        {hasChildren && open
          ? node.children!.map((c, i) => renderNode(c, depth + 1, `${key}-${i}`))
          : null}
      </div>
    );
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 1 }} role="tree">
      {TREE_DATA.map((n, i) => renderNode(n, 0, String(i)))}
    </div>
  );
}
