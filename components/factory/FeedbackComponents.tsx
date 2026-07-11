"use client";

/**
 * Extra display & feedback parts: Spinner, Divider, Kbd, Stat, Empty state,
 * Code block. Tone-carrying pieces reuse the shared `useTone` recipe so a
 * delta or accent resolves from the primitive ramps per mode; structure comes
 * from spacing/radius roles and the type/motion CSS vars.
 */
import type { CSSProperties, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Inbox, Loader2 } from "lucide-react";
import { PreviewMode, useDesignSystem } from "@/store/useDesignSystem";
import { rv, sv, tv } from "@/lib/tokens";
import { NO_BINDINGS, Resolver, useComponentBindings, createChildResolver } from "@/lib/componentSchema";
import { useTone } from "./DisplayComponents";
import { TokenButton } from "./CoreComponents";

/* ── Spinner ── */

export function TokenSpinner({
  size = 24,
  tone = "action",
  variant = "ring",
  label,
  resolve = NO_BINDINGS,
}: {
  size?: number;
  tone?: "action" | "muted";
  variant?: "ring" | "dots" | "bars";
  label?: string;
  resolve?: Resolver;
}) {
  const r = resolve;
  const color =
    tone === "action"
      ? r("spinner.color") ?? tv("action-primary-default")
      : r("spinner.muted") ?? tv("text-muted");

  let glyph: ReactNode;
  if (variant === "dots") {
    const dot = size * 0.24;
    glyph = (
      <span
        role="status"
        aria-label={label ?? "Loading"}
        style={{ display: "inline-flex", alignItems: "center", gap: dot * 0.6, height: size }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="ark-pulse"
            style={{
              width: dot,
              height: dot,
              borderRadius: "50%",
              background: color,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </span>
    );
  } else if (variant === "bars") {
    const barW = Math.max(size * 0.12, 2);
    glyph = (
      <span
        role="status"
        aria-label={label ?? "Loading"}
        style={{ display: "inline-flex", alignItems: "center", gap: barW, height: size }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="ark-pulse"
            style={{
              width: barW,
              height: size * (i === 1 ? 0.9 : 0.6),
              borderRadius: barW / 2,
              background: color,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </span>
    );
  } else {
    glyph = (
      <Loader2 className="ark-spin" size={size} style={{ color }} aria-label={label ?? "Loading"} role="status" />
    );
  }

  if (!label) return glyph;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: sv(2), fontFamily: "var(--ark-font-sans)" }}>
      {glyph}
      <span style={{ fontSize: "var(--ark-text-sm)", fontWeight: 500, color: r("spinner.muted") ?? tv("text-muted") }}>
        {label}
      </span>
    </span>
  );
}

/* ── Divider ── */

export function TokenDivider({
  label,
  orientation = "horizontal",
  variant = "solid",
  thickness = 1,
  labelPosition = "center",
  inset = false,
  resolve = NO_BINDINGS,
}: {
  label?: string;
  orientation?: "horizontal" | "vertical";
  variant?: "solid" | "dashed" | "dotted";
  thickness?: number;
  labelPosition?: "start" | "center" | "end";
  inset?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  const color = r("divider.line") ?? tv("border-muted");
  const insetPad = inset ? sv(6) : undefined;

  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        style={{
          alignSelf: "stretch",
          minHeight: 44,
          marginTop: inset ? sv(2) : undefined,
          marginBottom: inset ? sv(2) : undefined,
          borderLeftWidth: thickness,
          borderLeftStyle: variant,
          borderLeftColor: color,
        }}
      />
    );
  }

  const line: CSSProperties = {
    flex: 1,
    borderTopWidth: thickness,
    borderTopStyle: variant,
    borderTopColor: color,
  };
  if (!label) {
    return (
      <div
        style={{ ...line, width: inset ? undefined : "100%", marginLeft: insetPad, marginRight: insetPad }}
        role="separator"
      />
    );
  }
  return (
    <div
      role="separator"
      aria-label={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: sv(2),
        width: "100%",
        paddingLeft: insetPad,
        paddingRight: insetPad,
      }}
    >
      {labelPosition !== "start" ? <span style={line} /> : null}
      <span
        style={{
          fontSize: "var(--ark-text-xs)",
          fontFamily: "var(--ark-font-sans)",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: r("divider.label") ?? tv("text-muted"),
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {labelPosition !== "end" ? <span style={line} /> : null}
    </div>
  );
}

/* ── Kbd (keycap) ── */

export function TokenKbd({
  children = "⌘",
  size = "sm",
  resolve = NO_BINDINGS,
}: {
  children?: ReactNode;
  size?: "sm" | "md";
  resolve?: Resolver;
}) {
  const r = resolve;
  const cap = size === "md" ? 28 : 22;
  return (
    <kbd
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: cap,
        height: cap,
        padding: `0 ${sv(1)}`,
        borderRadius: r("container.radius") ?? rv(2),
        background: r("container.bg") ?? tv("surface-elevated"),
        border: `1px solid ${r("container.border") ?? tv("border-default")}`,
        borderBottomWidth: 2,
        borderBottomColor: r("container.underline") ?? tv("border-strong"),
        color: r("text.color") ?? tv("text-secondary"),
        fontSize: size === "md" ? "var(--ark-text-sm)" : "var(--ark-text-xs)",
        fontFamily: "var(--ark-font-mono)",
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      {children}
    </kbd>
  );
}

/* ── Stat / metric ── */

export function TokenStat({
  mode,
  label = "Net revenue",
  value = "$128,540",
  delta = "+12.4%",
  trend = "up",
  showDelta = true,
  size = "md",
  showCaption = true,
  caption = "vs. previous 30 days",
  resolve = NO_BINDINGS,
}: {
  mode: PreviewMode;
  label?: string;
  value?: string;
  delta?: string;
  trend?: "up" | "down";
  showDelta?: boolean;
  size?: "sm" | "md" | "lg";
  showCaption?: boolean;
  caption?: string;
  resolve?: Resolver;
}) {
  const tone = useTone(trend === "up" ? "success" : "error", mode);
  const Arrow = trend === "up" ? ArrowUpRight : ArrowDownRight;
  const r = resolve;
  const valueSize =
    size === "sm" ? "var(--ark-text-2xl)" : size === "lg" ? "var(--ark-text-4xl)" : "var(--ark-text-3xl)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: sv(1), fontFamily: r("text.font") ?? "var(--ark-font-sans)" }}>
      <span style={{ fontSize: "var(--ark-text-xs)", color: r("text.label") ?? tv("text-muted"), fontWeight: 500 }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: sv(2), flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: valueSize,
            fontWeight: 800,
            color: r("text.value") ?? tv("text-primary"),
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        {showDelta ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              padding: `2px ${sv(1)}`,
              borderRadius: rv(7),
              background: tone.bg,
              border: `1px solid ${tone.border}`,
              color: tone.text,
              fontSize: "var(--ark-text-xs)",
              fontWeight: 700,
            }}
          >
            <Arrow size={12} style={{ color: tone.accent }} />
            {delta}
          </span>
        ) : null}
      </div>
      {showCaption ? (
        <span style={{ fontSize: "var(--ark-text-xs)", color: tv("text-muted") }}>
          {caption}
        </span>
      ) : null}
    </div>
  );
}

/* ── Empty state ── */

export function TokenEmptyState({
  radiusStep = 4,
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  resolve?: Resolver;
}) {
  const r = resolve;
  const cfg = useDesignSystem((s) => s.components.emptyState);
  const instances = cfg?.instances;

  const actionOpts = instances?.action ?? {};
  const actionLabel = (actionOpts.label as string) ?? "Record transaction";
  const actionVariant = (actionOpts.variant as any) ?? "filled";
  const actionSize = (actionOpts.size as any) ?? "sm";
  const actionPrefix = (actionOpts.prefixIcon as string) ?? "";
  const actionSuffix = (actionOpts.suffixIcon as string) ?? "";

  const buttonResolve = useComponentBindings("button");
  const childButtonResolve = createChildResolver("button", resolve, buttonResolve);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: sv(2),
        padding: sv(4),
        fontFamily: "var(--ark-font-sans)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 52,
          height: 52,
          borderRadius: r("icon.radius") ?? rv(radiusStep),
          background: r("icon.bg") ?? tv("surface-subtle"),
          border: `1px solid ${r("icon.border") ?? tv("border-muted")}`,
          color: r("icon.color") ?? tv("text-muted"),
        }}
      >
        <Inbox size={22} />
      </span>
      <span style={{ fontSize: "var(--ark-text-base)", fontWeight: 700, color: r("text.title") ?? tv("text-primary") }}>
        No transactions yet
      </span>
      <span style={{ fontSize: "var(--ark-text-sm)", color: r("text.body") ?? tv("text-muted"), maxWidth: 260 }}>
        Once activity posts to this ledger it will show up here, newest first.
      </span>
      <div style={{ marginTop: sv(1) }}>
        <TokenButton
          variant={actionVariant}
          size={actionSize}
          radiusStep={radiusStep}
          prefixIcon={actionPrefix}
          suffixIcon={actionSuffix}
          resolve={childButtonResolve}
        >
          {actionLabel}
        </TokenButton>
      </div>
    </div>
  );
}

/* ── Code block ── */

const CODE_LINES: Array<Array<{ t: string; c?: "kw" | "str" | "com" | "fn" }>> = [
  [{ t: "// resolve a semantic token for a mode", c: "com" }],
  [
    { t: "const", c: "kw" },
    { t: " bg " },
    { t: "= " },
    { t: "resolveToken", c: "fn" },
    { t: "(state, " },
    { t: "'dark'", c: "str" },
    { t: ", " },
    { t: "'surface-base'", c: "str" },
    { t: ");" },
  ],
];

export function TokenCodeBlock({
  radiusStep = 3,
  filename = "tokens.ts",
  showHeader = true,
  showDots = true,
  showLineNumbers = false,
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
  filename?: string;
  showHeader?: boolean;
  showDots?: boolean;
  showLineNumbers?: boolean;
  resolve?: Resolver;
}) {
  const r = resolve;
  const colorFor = (c?: "kw" | "str" | "com" | "fn"): string =>
    c === "kw"
      ? r("syntax.keyword") ?? tv("text-link")
      : c === "str"
        ? r("syntax.string") ?? tv("action-primary-default")
        : c === "com"
          ? r("syntax.comment") ?? tv("text-muted")
          : c === "fn"
            ? r("syntax.function") ?? tv("text-primary")
            : tv("text-secondary");

  return (
    <div
      style={{
        borderRadius: r("container.radius") ?? rv(radiusStep),
        border: `1px solid ${r("container.border") ?? tv("border-default")}`,
        background: r("container.bg") ?? tv("surface-sunken"),
        overflow: "hidden",
        fontFamily: "var(--ark-font-mono)",
      }}
    >
      {showHeader ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: sv(1),
            padding: `${sv(1)} ${sv(2)}`,
            borderBottom: `1px solid ${tv("border-muted")}`,
          }}
        >
          {showDots
            ? ["error", "warning", "success"].map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: tv("border-strong"),
                  }}
                />
              ))
            : null}
          <span
            style={{
              marginLeft: "auto",
              fontSize: "var(--ark-text-xs)",
              color: tv("text-muted"),
            }}
          >
            {filename}
          </span>
        </div>
      ) : null}
      <pre
        style={{
          margin: 0,
          padding: sv(3),
          fontSize: "var(--ark-text-xs)",
          lineHeight: 1.7,
          overflowX: "auto",
        }}
      >
        {CODE_LINES.map((line, i) => (
          <div key={i}>
            {showLineNumbers ? (
              <span
                style={{
                  display: "inline-block",
                  width: 22,
                  marginRight: sv(2),
                  textAlign: "right",
                  color: tv("text-muted"),
                  opacity: 0.6,
                  userSelect: "none",
                }}
              >
                {i + 1}
              </span>
            ) : null}
            {line.map((tok, j) => (
              <span key={j} style={{ color: colorFor(tok.c) }}>
                {tok.t}
              </span>
            ))}
          </div>
        ))}
      </pre>
    </div>
  );
}
