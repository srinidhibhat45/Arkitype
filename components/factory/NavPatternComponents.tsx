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
  Home,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { rv, sv, tv } from "@/lib/tokens";
import { NO_BINDINGS, Resolver, resolveOptions, useComponentBindings } from "@/lib/componentSchema";
import { TokenBadge } from "./DisplayComponents";
import { PreviewMode, useDesignSystem } from "@/store/useDesignSystem";
import { TokenButton } from "./CoreComponents";
import {
  appleSurface,
  TemplateTextAction,
  MATERIAL_RADIUS,
  APPLE_RADIUS,
  useTemplate,
  tplRadius,
  tplPad,
  tplWeight,
  tplShadow,
  tplIsSquare,
  tplActiveChip,
  tplActiveBar,
} from "./templateKit";

/* ── Breadcrumbs ── */

export function TokenBreadcrumbs({
  trail = ["Finance", "Ledgers", "Operating"],
  separator = "chevron",
  showHome = false,
  collapse = false,
  resolve = NO_BINDINGS,
}: {
  trail?: string[];
  separator?: "chevron" | "slash" | "dot";
  showHome?: boolean;
  collapse?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  // A breadcrumb is type and a separator glyph — `separator` is the user's
  // choice, so the template speaks through the current crumb's weight and the
  // tracking the whole trail is set in.
  const tpl = useTemplate("breadcrumbs");
  const sepColor = r("text.sep") ?? tv("text-muted");
  const sep =
    separator === "slash" ? (
      <span style={{ color: sepColor, fontSize: "var(--ark-text-xs)" }}>/</span>
    ) : separator === "dot" ? (
      <span style={{ color: sepColor, fontSize: "var(--ark-text-xs)" }}>•</span>
    ) : (
      <ChevronRight size={12} style={{ color: sepColor }} />
    );
  // Collapse everything between the first and last crumbs into an ellipsis.
  const items: Array<string | { ellipsis: true }> =
    collapse && trail.length > 2
      ? [trail[0], { ellipsis: true }, trail[trail.length - 1]]
      : [...trail];
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: "flex",
        alignItems: "center",
        gap: tplPad(tpl, sv(1)),
        fontSize: "var(--ark-text-sm)",
        fontFamily: "var(--ark-font-sans)",
        letterSpacing: tpl.type?.tracking,
      }}
    >
      {showHome ? (
        <span style={{ display: "flex", alignItems: "center", gap: sv(1) }}>
          <Home size={13} style={{ color: r("text.item") ?? tv("text-muted"), cursor: "pointer" }} />
          {sep}
        </span>
      ) : null}
      {items.map((item, i) => {
        const last = i === items.length - 1;
        if (typeof item !== "string") {
          return (
            <span key="ellipsis" style={{ display: "flex", alignItems: "center", gap: sv(1) }}>
              <span style={{ color: r("text.item") ?? tv("text-muted"), cursor: "pointer" }}>…</span>
              {sep}
            </span>
          );
        }
        return (
          <span key={item} style={{ display: "flex", alignItems: "center", gap: sv(1) }}>
            <span
              style={{
                color: last ? r("text.current") ?? tv("text-primary") : r("text.item") ?? tv("text-muted"),
                fontWeight: last ? tplWeight(tpl) ?? 600 : 400,
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
  variant = "numbers",
  showArrows = true,
  resolve = NO_BINDINGS,
}: {
  pages?: number;
  radiusStep?: number;
  variant?: "numbers" | "simple" | "compact";
  showArrows?: boolean;
  resolve?: Resolver;
}) {
  const [active, setActive] = useState(3);
  const shown = [1, 2, 3, 4, 5].filter((p) => p <= pages);
  const r = resolve;
  // The current page cell is the active-item problem again: a pill in Material,
  // a tint in Apple, a square fill in Carbon.
  const tpl = useTemplate("pagination");
  const chip = tplActiveChip(tpl, tv("action-primary-default"));
  const cellBorder = r("cell.border") ?? tv("border-muted");
  const cell = (on: boolean): React.CSSProperties => ({
    minWidth: 28,
    height: 28,
    padding: `0 ${sv(1)}`,
    borderRadius: r("cell.radius") ?? (on ? chip?.borderRadius : undefined) ?? tplRadius(tpl, "toggle") ?? rv(radiusStep),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "var(--ark-text-xs)",
    fontFamily: "var(--ark-font-sans)",
    fontWeight: tplWeight(tpl) ?? 600,
    cursor: "pointer",
    border: "1px solid transparent",
    background: on ? r("cell.activeBg") ?? tv("action-primary-default") : "transparent",
    color: on ? r("cell.activeText") ?? tv("text-on-action") : r("cell.text") ?? tv("text-secondary"),
    transition: "background var(--ark-duration-fast) var(--ark-ease-out)",
  });

  if (variant === "simple") {
    return (
      <nav aria-label="Pagination" style={{ display: "flex", alignItems: "center", gap: sv(2) }}>
        <span style={{ ...cell(false), borderColor: cellBorder, paddingLeft: sv(2), paddingRight: sv(2) }}>
          <ChevronLeft size={13} style={{ marginRight: 4 }} /> Previous
        </span>
        <span
          style={{
            fontSize: "var(--ark-text-xs)",
            fontFamily: "var(--ark-font-sans)",
            color: r("cell.text") ?? tv("text-secondary"),
          }}
        >
          Page {active} of {pages}
        </span>
        <span style={{ ...cell(false), borderColor: cellBorder, paddingLeft: sv(2), paddingRight: sv(2) }}>
          Next <ChevronRight size={13} style={{ marginLeft: 4 }} />
        </span>
      </nav>
    );
  }

  if (variant === "compact") {
    return (
      <nav aria-label="Pagination" style={{ display: "flex", alignItems: "center", gap: 3 }}>
        <span style={{ ...cell(false), color: tv("text-muted") }} aria-label="Previous page">
          <ChevronLeft size={13} />
        </span>
        <span
          style={{
            fontSize: "var(--ark-text-xs)",
            fontFamily: "var(--ark-font-mono)",
            fontWeight: 600,
            padding: `0 ${sv(1)}`,
            color: r("cell.text") ?? tv("text-secondary"),
          }}
        >
          {active} / {pages}
        </span>
        <span style={{ ...cell(false), color: tv("text-muted") }} aria-label="Next page">
          <ChevronRight size={13} />
        </span>
      </nav>
    );
  }

  return (
    <nav aria-label="Pagination" style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {showArrows ? (
        <span style={{ ...cell(false), color: tv("text-muted") }} aria-label="Previous page">
          <ChevronLeft size={13} />
        </span>
      ) : null}
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
      {pages > shown.length ? (
        <>
          <span style={{ ...cell(false), color: tv("text-muted") }}>…</span>
          <span style={{ ...cell(false), borderColor: cellBorder }}>{pages}</span>
        </>
      ) : null}
      {showArrows ? (
        <span style={{ ...cell(false), color: tv("text-muted") }} aria-label="Next page">
          <ChevronRight size={13} />
        </span>
      ) : null}
    </nav>
  );
}

/* ── Dropdown menu (static, opened) ── */

export function TokenDropdownMenu({
  radiusStep = 3,
  showTrigger = true,
  showIcons = true,
  checkmarks = false,
  showDivider = true,
  showDanger = true,
  menuWidth = 180,
  resolve = NO_BINDINGS,
  template,
}: {
  radiusStep?: number;
  showTrigger?: boolean;
  showIcons?: boolean;
  checkmarks?: boolean;
  showDivider?: boolean;
  showDanger?: boolean;
  menuWidth?: number;
  resolve?: Resolver;
  /** Template id — see lib/componentTemplates.ts. */
  template?: string;
}) {
  const r = resolve;
  const dropdownCfg = useDesignSystem((s) => s.components.dropdown);

  // ── Templates (lib/componentTemplates.ts). A menu's *structure* is the same
  // in all four systems — one surface, four rows, an optional rule before the
  // destructive one. What actually differs is the surface treatment and how
  // the highlighted row is drawn, so this is a style table rather than four
  // near-identical copies of the same JSX.
  // One source of truth for "which template is active": the hook resolves an
  // explicit prop, then a preview scope, then the stored choice — so the
  // structural branch below and the shape grammar can never disagree.
  const tpl = useTemplate("dropdown", template);
  const activeTemplate = tpl.id;

  const menuSkin: Record<
    string,
    {
      radius: string | number;
      border: string;
      shadow: string;
      pad: string;
      rowRadius: string | number;
      rowPad: string;
      /** Extra style for the highlighted row, on top of the shared bg/color. */
      activeExtra?: React.CSSProperties;
    }
  > = {
    arkitype: {
      radius: rv(radiusStep),
      border: `1px solid ${r("container.border") ?? tv("border-default")}`,
      shadow: "var(--ark-shadow-high)",
      pad: sv(1),
      rowRadius: rv(Math.max(radiusStep - 1, 0)),
      rowPad: `${sv(1)} ${sv(2)}`,
    },
    material3: {
      radius: `${MATERIAL_RADIUS.sm}px`,
      border: "none",
      shadow: "var(--ark-shadow-high)",
      pad: sv(1),
      rowRadius: 999,
      rowPad: `${sv(2)} ${sv(3)}`,
    },
    apple: {
      radius: `${APPLE_RADIUS.sm}px`,
      border: "none",
      shadow: "var(--ark-shadow-high)",
      pad: sv(1),
      rowRadius: 6,
      rowPad: `${sv(1)} ${sv(2)}`,
    },
    carbon: {
      radius: 0,
      border: `1px solid ${r("container.border") ?? tv("border-default")}`,
      shadow: "var(--ark-shadow-medium)",
      pad: "0px",
      rowRadius: 0,
      rowPad: `${sv(1)} ${sv(2)}`,
      activeExtra: { borderLeft: `3px solid ${tv("action-primary-default")}` },
    },
    // Atlassian and Fluent keep the default arrangement and take their corner,
    // edge and density from the profile instead.
    atlassian: {
      radius: tplRadius(tpl, "overlay") ?? rv(radiusStep),
      border: "none",
      shadow: tplShadow(tpl, "overlay") ?? "var(--ark-shadow-high)",
      pad: sv(1),
      rowRadius: tplRadius(tpl, "toggle") ?? rv(Math.max(radiusStep - 1, 0)),
      rowPad: `${tplPad(tpl, sv(1))} ${tplPad(tpl, sv(2))}`,
    },
    fluent: {
      radius: tplRadius(tpl, "overlay") ?? rv(radiusStep),
      border: `1px solid ${r("container.border") ?? tv("border-default")}`,
      shadow: tplShadow(tpl, "overlay") ?? "var(--ark-shadow-high)",
      pad: sv(1),
      rowRadius: tplRadius(tpl, "toggle") ?? rv(Math.max(radiusStep - 1, 0)),
      rowPad: `${tplPad(tpl, sv(1))} ${tplPad(tpl, sv(2))}`,
    },
  };
  const skin = menuSkin[activeTemplate] ?? menuSkin.arkitype;
  const isCarbon = activeTemplate === "carbon";

  const item = (danger = false): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: sv(2),
    padding: skin.rowPad,
    borderRadius: skin.rowRadius,
    fontSize: "var(--ark-text-sm)",
    fontFamily: "var(--ark-font-sans)",
    color: danger ? undefined : r("item.text") ?? tv("text-secondary"),
    cursor: "pointer",
    // Carbon's active row grows a 3px left bar; every row reserves the space
    // so the labels don't jump sideways between highlighted and plain rows.
    ...(isCarbon ? { borderLeft: "3px solid transparent" } : null),
  });

  const trailingCheck = (
    <Check size={13} style={{ marginLeft: "auto", color: r("item.activeText") ?? tv("text-primary") }} />
  );

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
      {showTrigger ? (
        <span
          style={{
            display: "inline-flex",
            padding: sv(1),
            borderRadius: isCarbon ? 0 : tplRadius(tpl, "control") ?? rv(2),
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
      ) : null}
      <div
        role="menu"
        style={{
          minWidth: menuWidth,
          padding: skin.pad,
          borderRadius: r("container.radius") ?? skin.radius,
          background: r("container.bg") ?? tv("surface-elevated"),
          border: skin.border,
          boxShadow: skin.shadow,
          overflow: "hidden",
        }}
      >
        <div
          role="menuitem"
          style={{
            ...item(),
            background: r("item.activeBg") ?? tv("surface-subtle"),
            color: r("item.activeText") ?? tv("text-primary"),
            ...skin.activeExtra,
          }}
        >
          {showIcons ? <Copy size={13} style={{ color: tv("text-muted") }} /> : null} Duplicate
          {checkmarks ? trailingCheck : null}
        </div>
        <div role="menuitem" style={item()}>
          {showIcons ? <Download size={13} style={{ color: tv("text-muted") }} /> : null} Export as CSV
        </div>
        <div role="menuitem" style={item()}>
          {showIcons ? <Check size={13} style={{ color: tv("text-muted") }} /> : null} Mark reconciled
        </div>
        {showDivider && showDanger ? (
          <div
            style={{
              height: 1,
              background: tv("border-muted"),
              margin: `${sv(1)} 0`,
            }}
          />
        ) : null}
        {showDanger ? (
          <div role="menuitem" style={{ ...item(true), color: "#e5484d" }}>
            {showIcons ? <Trash2 size={13} /> : null} Delete row
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Card ── */

export function TokenCard({
  mode,
  radiusStep = 4,
  resolve = NO_BINDINGS,
  template,
}: {
  mode: PreviewMode;
  radiusStep?: number;
  resolve?: Resolver;
  /** Template id — see lib/componentTemplates.ts. */
  template?: string;
}) {
  const r = resolve;
  const cfg = useDesignSystem((s) => s.components.card);
  const opts = resolveOptions("card", cfg?.properties);
  const buttonResolve = useComponentBindings("button");

  const title = (opts.title ?? "Design Systems Manager") as string;
  // Scale Step is a raw property, not a declared OptionSpec — resolveOptions()
  // only surfaces declared keys, so read it straight off the properties bag.
  const titleSize = (cfg?.properties?.["title.size"] ?? "sm") as string;
  const subtitle = (opts.subtitle ?? "Updated 2 hours ago") as string;
  const subtitleSize = (cfg?.properties?.["subtitle.size"] ?? "xs") as string;
  const bodyText = (opts.bodyText ?? "Manage tokens, balance scales, and distribute variable definitions.") as string;
  const bodyTextSize = (cfg?.properties?.["bodyText.size"] ?? "xs") as string;
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

  // ── Templates (lib/componentTemplates.ts) — structure only; the title,
  // subtitle, body and button label are shared by all branches.
  // One source of truth for "which template is active": the hook resolves an
  // explicit prop, then a preview scope, then the stored choice — so the
  // structural branch below and the shape grammar can never disagree.
  const tpl = useTemplate("card", template);
  const activeTemplate = tpl.id;

  // A template supplies the *default* corner radius and elevation for its
  // system — but a value the user actually set still wins, or those two
  // inspector controls would silently do nothing once a template is picked.
  // Reading the raw properties bag (not `opts`) is what distinguishes "the
  // user chose 12" from "12 is the schema default".
  const storedRadius = cfg?.properties?.radius;
  const storedShadow = cfg?.properties?.shadow;

  // Card's `bg`/`borderColor` options are legacy raw-hex escape hatches whose
  // schema defaults are literal #ffffff / #e4e4e7 — they don't follow the
  // preview mode, so the default layout paints a white card in dark mode. The
  // default branch keeps that behaviour (changing it would restyle every
  // existing project's card); the templates below are token-first instead, and
  // only take the literal when the user actually picked one.
  const storedBg = cfg?.properties?.bg;
  const storedBorderColor = cfg?.properties?.borderColor;
  const storedBorderWidth = cfg?.properties?.borderWidth;
  const storedPadding = cfg?.properties?.padding;
  // Same rule for the default layout's own scalars: the profile supplies the
  // system's corner/edge/padding/elevation, and anything the user actually set
  // still wins. Reading the raw bag is what tells the two apart.
  const defBorderWidth = storedBorderWidth !== undefined ? borderWidth : tpl.border ?? borderWidth;
  const defPadding =
    storedPadding !== undefined ? padding : Math.round(padding * tpl.density);
  const tplBg = r("container.bg") ?? (storedBg !== undefined ? String(storedBg) : tv("surface-elevated"));
  const tplBorderColor =
    r("container.border") ?? (storedBorderColor !== undefined ? String(storedBorderColor) : tv("border-muted"));
  const templateRadius = (fallbackPx: number) =>
    r("container.radius") ?? `${storedRadius !== undefined ? Number(storedRadius) : fallbackPx}px`;
  const templateShadow = (fallback: string) =>
    storedShadow !== undefined ? shadows[String(storedShadow)] ?? fallback : fallback;

  const titleEl = (
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
  );
  const subtitleEl = subtitle ? (
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
  ) : null;
  const bodyEl = (
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
  );

  if (activeTemplate === "material3") {
    return (
      <div
        style={{
          border: "none",
          borderRadius: templateRadius(MATERIAL_RADIUS.md),
          backgroundColor: tplBg,
          boxShadow: templateShadow(shadows.md),
          overflow: "hidden",
          maxWidth: 380,
          width: "100%",
          fontFamily: "var(--ark-font-sans)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: `${padding}px`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            {titleEl}
            {subtitleEl}
          </div>
          <TokenBadge variant="warning" mode={mode}>
            active
          </TokenBadge>
        </div>
        {bodyEl}
        {showButton && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px" }}>
            <TemplateTextAction label={btnLabel} color={tv("action-primary-default")} variant="material" />
          </div>
        )}
      </div>
    );
  }

  if (activeTemplate === "apple") {
    return (
      <div
        style={{
          ...appleSurface(),
          borderRadius: templateRadius(APPLE_RADIUS.md),
          backgroundColor: tplBg,
          boxShadow: templateShadow("var(--ark-shadow-low)"),
          overflow: "hidden",
          maxWidth: 380,
          width: "100%",
          fontFamily: "var(--ark-font-sans)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: `${padding}px` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
              {titleEl}
              {subtitleEl}
            </div>
            <TokenBadge variant="warning" mode={mode}>
              active
            </TokenBadge>
          </div>
          {bodyEl}
        </div>
        {showButton && (
          <>
            <div style={{ height: 1, background: tplBorderColor, marginLeft: `${padding}px` }} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: `${padding / 1.6}px ${padding}px`,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  fontSize: "var(--ark-text-sm)",
                  fontWeight: 600,
                  color: tv("action-primary-default"),
                }}
              >
                {btnLabel}
              </span>
              <ChevronRight size={16} style={{ color: tv("text-muted") }} />
            </div>
          </>
        )}
      </div>
    );
  }

  if (activeTemplate === "carbon") {
    return (
      <div
        style={{
          border: `${borderWidth}px solid ${tplBorderColor}`,
          borderRadius: templateRadius(0),
          backgroundColor: tplBg,
          boxShadow: templateShadow("none"),
          overflow: "hidden",
          maxWidth: 380,
          width: "100%",
          fontFamily: "var(--ark-font-sans)",
        }}
      >
        <div
          style={{
            padding: `${padding / 1.5}px ${padding}px`,
            borderBottom: `${borderWidth}px solid ${tplBorderColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            {titleEl}
            {subtitleEl}
          </div>
          <TokenBadge variant="warning" mode={mode}>
            active
          </TokenBadge>
        </div>
        <div style={{ padding: `${defPadding}px`, display: "flex", flexDirection: "column", gap: "10px" }}>
          {bodyEl}
        </div>
        {showButton && (
          <div
            style={{
              padding: `${padding / 1.5}px ${padding}px`,
              borderTop: `${borderWidth}px solid ${tplBorderColor}`,
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <TemplateTextAction label={btnLabel} color={tv("text-link")} variant="carbon" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        border: `${defBorderWidth}px solid ${r("container.border") ?? borderColor}`,
        borderRadius: templateRadius(tpl.radius?.surface ?? radius),
        backgroundColor: r("container.bg") ?? bg,
        boxShadow: templateShadow(tplShadow(tpl, "raised") ?? shadows[shadow] ?? shadows.md),
        overflow: "hidden",
        maxWidth: 380,
        width: "100%",
        fontFamily: "var(--ark-font-sans)",
        transition: "all 0.2s ease",
      }}
    >
      <div
        style={{
          padding: `${defPadding / 1.5}px ${defPadding}px`,
          borderBottom: `${defBorderWidth}px solid ${borderColor}`,
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
            padding: `${defPadding / 1.5}px ${defPadding}px`,
            borderTop: `${defBorderWidth}px solid ${borderColor}`,
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
  itemCount = 3,
  defaultOpen = 1,
  allowMultiple = false,
  resolve = NO_BINDINGS,
  template,
}: {
  radiusStep?: number;
  variant?: "contained" | "separated" | "flush";
  iconSide?: "left" | "right";
  /** 1-based index of the initially-open item; 0 = all closed. */
  defaultOpen?: number;
  itemCount?: number;
  allowMultiple?: boolean;
  resolve?: Resolver;
  /** Template id — see lib/componentTemplates.ts. */
  template?: string;
}) {
  // Open state as a set so "allow multiple" is a superset of the single mode.
  const [openSet, setOpenSet] = useState<ReadonlySet<number>>(
    () => new Set(defaultOpen > 0 ? [defaultOpen - 1] : [])
  );
  const toggle = (i: number) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else {
        if (!allowMultiple) next.clear();
        next.add(i);
      }
      return next;
    });
  const r = resolve;
  const cfg = useDesignSystem((s) => s.components.accordion);
  const opts = resolveOptions("accordion", cfg?.properties);
  const radius = Number(opts.radius ?? 12);
  const tpl = useTemplate("accordion", template);

  // As with Card: the template supplies the default radius, but a radius the
  // user actually set still wins, so the control never goes dead. Reading the
  // raw properties bag (not `opts`) is what distinguishes the two.
  const storedAccRadius = cfg?.properties?.radius;
  const accRadius = (fallbackPx: number) =>
    r("container.radius") ?? `${storedAccRadius !== undefined ? Number(storedAccRadius) : fallbackPx}px`;

  const border = r("container.border") ?? tv("border-muted");
  const openBg = r("container.openBg") ?? tv("surface-elevated");
  const rad = accRadius(tpl.radius?.surface ?? radius);
  const separated = variant === "separated";
  const flush = variant === "flush";
  const iconLeft = iconSide === "left";
  const items = ACCORDION_ITEMS.slice(0, Math.min(Math.max(Math.round(itemCount), 2), ACCORDION_ITEMS.length));

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

  // ── Templates (lib/componentTemplates.ts) — structure only. The live open
  // state, item list and chevron-side option are shared by every branch, so
  // switching template never resets which panel is open. The container
  // treatment (the `variant` option: contained / separated / flush) is the one
  // thing a template deliberately replaces — that IS the choice being made.
  // One source of truth for "which template is active": `tpl` above resolved an
  // explicit prop, then a preview scope, then the stored choice — so the
  // structural branch below and the shape grammar can never disagree.
  const activeTemplate = tpl.id;

  if (activeTemplate === "material3") {
    return (
      <div
        style={{
          borderRadius: accRadius(MATERIAL_RADIUS.md),
          border: "none",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          fontFamily: "var(--ark-font-sans)",
          maxWidth: 480,
        }}
      >
        {items.map((item, i) => {
          const on = openSet.has(i);
          return (
            <div
              key={item.q}
              style={{
                borderRadius: MATERIAL_RADIUS.sm,
                background: on ? openBg : "transparent",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={on}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: iconLeft ? "flex-start" : "space-between",
                  gap: sv(2),
                  width: "100%",
                  padding: `${sv(2)} ${sv(3)}`,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: r("text.header") ?? tv("text-primary"),
                  fontSize: "var(--ark-text-sm)",
                  fontWeight: 600,
                  fontFamily: "var(--ark-font-sans)",
                  textAlign: "left",
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

  if (activeTemplate === "apple") {
    // iOS inset-grouped: one rounded container, hairline rules between rows.
    return (
      <div
        style={{
          ...appleSurface(),
          borderRadius: accRadius(APPLE_RADIUS.md),
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--ark-font-sans)",
          maxWidth: 480,
        }}
      >
        {items.map((item, i) => {
          const on = openSet.has(i);
          return (
            <div key={item.q}>
              {i > 0 ? <div style={{ height: 1, background: border, marginLeft: sv(3) }} /> : null}
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={on}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: iconLeft ? "flex-start" : "space-between",
                  gap: sv(2),
                  width: "100%",
                  padding: `${sv(2)} ${sv(3)}`,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: r("text.header") ?? tv("text-primary"),
                  fontSize: "var(--ark-text-sm)",
                  fontWeight: 600,
                  fontFamily: "var(--ark-font-sans)",
                  textAlign: "left",
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

  if (activeTemplate === "carbon") {
    // Carbon uses a +/− affordance rather than a rotating chevron, and rules
    // above and below every row.
    return (
      <div
        style={{
          borderRadius: accRadius(0),
          borderTop: `1px solid ${border}`,
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--ark-font-sans)",
          maxWidth: 480,
        }}
      >
        {items.map((item, i) => {
          const on = openSet.has(i);
          const glyph = (
            <span
              aria-hidden="true"
              style={{
                color: r("chevron.color") ?? tv("text-muted"),
                flexShrink: 0,
                fontSize: 15,
                lineHeight: 1,
                fontWeight: 400,
                width: 14,
                textAlign: "center",
              }}
            >
              {on ? "−" : "+"}
            </span>
          );
          return (
            <div key={item.q} style={{ borderBottom: `1px solid ${border}` }}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={on}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: iconLeft ? "flex-start" : "space-between",
                  gap: sv(2),
                  width: "100%",
                  padding: `${sv(2)} ${sv(2)}`,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: r("text.header") ?? tv("text-primary"),
                  fontSize: "var(--ark-text-sm)",
                  fontWeight: 600,
                  fontFamily: "var(--ark-font-sans)",
                  textAlign: "left",
                }}
              >
                {iconLeft ? glyph : null}
                <span style={{ flex: iconLeft ? "0 1 auto" : 1 }}>{item.q}</span>
                {iconLeft ? null : glyph}
              </button>
              {on ? (
                <div
                  style={{
                    padding: iconLeft ? `0 ${sv(2)} ${sv(2)} ${sv(5)}` : `0 ${sv(2)} ${sv(2)}`,
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
      {items.map((item, i) => {
        const on = openSet.has(i);
        const wrapperStyle: React.CSSProperties = separated
          ? { border: `1px solid ${border}`, borderRadius: rad, overflow: "hidden" }
          : flush
            ? { borderBottom: `1px solid ${border}` }
            : { borderTop: i > 0 ? `1px solid ${border}` : "none" };
        return (
          <div key={item.q} style={wrapperStyle}>
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={on}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: iconLeft ? "flex-start" : "space-between",
                gap: sv(2),
                width: "100%",
                padding: `${tplPad(tpl, sv(2))} ${tplPad(tpl, sv(3))}`,
                background: on ? openBg : "transparent",
                border: "none",
                cursor: "pointer",
                color: r("text.header") ?? tv("text-primary"),
                fontSize: "var(--ark-text-sm)",
                fontWeight: tplWeight(tpl) ?? 600,
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
