"use client";

/**
 * Extra display & feedback parts: Spinner, Divider, Kbd, Stat, Empty state,
 * Code block. Tone-carrying pieces reuse the shared `useTone` recipe so a
 * delta or accent resolves from the primitive ramps per mode; structure comes
 * from spacing/radius roles and the type/motion CSS vars.
 */
import type { CSSProperties, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Inbox, Loader2 } from "lucide-react";
import { PreviewMode } from "@/store/useDesignSystem";
import { rv, sv, tv } from "@/lib/tokens";
import { NO_BINDINGS, Resolver } from "@/lib/componentSchema";
import { useTone } from "./DisplayComponents";
import { TokenButton } from "./CoreComponents";

/* ── Spinner ── */

export function TokenSpinner({
  size = 24,
  tone = "action",
  resolve = NO_BINDINGS,
}: {
  size?: number;
  tone?: "action" | "muted";
  resolve?: Resolver;
}) {
  const r = resolve;
  return (
    <Loader2
      className="ark-spin"
      size={size}
      style={{
        color:
          tone === "action"
            ? r("spinner.color") ?? tv("action-primary-default")
            : r("spinner.muted") ?? tv("text-muted"),
      }}
      aria-label="Loading"
      role="status"
    />
  );
}

/* ── Divider ── */

export function TokenDivider({
  label,
  resolve = NO_BINDINGS,
}: {
  label?: string;
  resolve?: Resolver;
}) {
  const r = resolve;
  const line: CSSProperties = {
    flex: 1,
    height: 1,
    background: r("divider.line") ?? tv("border-muted"),
  };
  if (!label) {
    return <div style={{ ...line, width: "100%" }} role="separator" />;
  }
  return (
    <div
      role="separator"
      aria-label={label}
      style={{ display: "flex", alignItems: "center", gap: sv(2), width: "100%" }}
    >
      <span style={line} />
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
      <span style={line} />
    </div>
  );
}

/* ── Kbd (keycap) ── */

export function TokenKbd({
  children = "⌘",
  resolve = NO_BINDINGS,
}: {
  children?: ReactNode;
  resolve?: Resolver;
}) {
  const r = resolve;
  return (
    <kbd
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 22,
        height: 22,
        padding: `0 ${sv(1)}`,
        borderRadius: r("container.radius") ?? rv(2),
        background: r("container.bg") ?? tv("surface-elevated"),
        border: `1px solid ${r("container.border") ?? tv("border-default")}`,
        borderBottomWidth: 2,
        borderBottomColor: r("container.underline") ?? tv("border-strong"),
        color: r("text.color") ?? tv("text-secondary"),
        fontSize: "var(--ark-text-xs)",
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
  resolve = NO_BINDINGS,
}: {
  mode: PreviewMode;
  label?: string;
  value?: string;
  delta?: string;
  trend?: "up" | "down";
  resolve?: Resolver;
}) {
  const tone = useTone(trend === "up" ? "success" : "error", mode);
  const Arrow = trend === "up" ? ArrowUpRight : ArrowDownRight;
  const r = resolve;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: sv(1), fontFamily: r("text.font") ?? "var(--ark-font-sans)" }}>
      <span style={{ fontSize: "var(--ark-text-xs)", color: r("text.label") ?? tv("text-muted"), fontWeight: 500 }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: sv(2), flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: "var(--ark-text-3xl)",
            fontWeight: 800,
            color: r("text.value") ?? tv("text-primary"),
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
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
      </div>
      <span style={{ fontSize: "var(--ark-text-xs)", color: tv("text-muted") }}>
        vs. previous 30 days
      </span>
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
        <TokenButton size="sm" radiusStep={radiusStep}>
          Record transaction
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
  resolve = NO_BINDINGS,
}: {
  radiusStep?: number;
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: sv(1),
          padding: `${sv(1)} ${sv(2)}`,
          borderBottom: `1px solid ${tv("border-muted")}`,
        }}
      >
        {["error", "warning", "success"].map((_, i) => (
          <span
            key={i}
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: tv("border-strong"),
            }}
          />
        ))}
        <span
          style={{
            marginLeft: "auto",
            fontSize: "var(--ark-text-xs)",
            color: tv("text-muted"),
          }}
        >
          tokens.ts
        </span>
      </div>
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
