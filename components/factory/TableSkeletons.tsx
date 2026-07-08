"use client";

/**
 * The Complex Data Table — fully customizable styling.
 * Renders Dense Financial Ledger, Card Grid, Borderless Clean List, or Timeline Audit Log
 * based on selected skeletonId, styled dynamically via properties from the store.
 */
import { CSSProperties } from "react";
import { MoreHorizontal } from "lucide-react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { resolveOptions, useComponentBindings } from "@/lib/componentSchema";
import { sv, tv } from "@/lib/tokens";
import { TokenBadge, TokenAvatar } from "./DisplayComponents";

export const TABLE_SKELETONS = [
  { id: "1", name: "Dense Financial Ledger", desc: "Numeric right-align · frozen header · badges" },
  { id: "2", name: "Card Grid Layout", desc: "Responsive cards · avatars · tag lists" },
  { id: "3", name: "Borderless Clean List", desc: "Minimal metadata rows, high breathing room" },
  { id: "4", name: "Timeline Audit Log", desc: "Threaded vertical log with date badges" },
] as const;

export interface Txn {
  id: string;
  date: string;
  payee: string;
  category: string;
  status: "Cleared" | "Pending" | "Flagged";
  amount: number;
}

export const TRANSACTIONS: Txn[] = [
  { id: "TXN-0451", date: "2026-07-01", payee: "Linear Systems GmbH", category: "Software", status: "Cleared", amount: -1240.0 },
  { id: "TXN-0452", date: "2026-07-01", payee: "Northwind Payroll", category: "Salaries", status: "Cleared", amount: -18450.0 },
  { id: "TXN-0453", date: "2026-07-02", payee: "Acme Cloud Invoice", category: "Infrastructure", status: "Pending", amount: -3320.75 },
  { id: "TXN-0454", date: "2026-07-02", payee: "Meridian Client Retainer", category: "Revenue", status: "Cleared", amount: 24000.0 },
  { id: "TXN-0455", date: "2026-07-03", payee: "Halcyon Office REIT", category: "Facilities", status: "Cleared", amount: -5600.0 },
  { id: "TXN-0456", date: "2026-07-03", payee: "Vertex Data Brokerage", category: "Research", status: "Flagged", amount: -980.5 },
  { id: "TXN-0457", date: "2026-07-04", payee: "Aster Design Co-op", category: "Contractors", status: "Pending", amount: -4275.0 },
  { id: "TXN-0458", date: "2026-07-04", payee: "Quill Subscription Refund", category: "Software", status: "Cleared", amount: 129.99 },
];

const fmt = (n: number): string =>
  `${n < 0 ? "−" : "+"}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface TableResolvedOpts {
  showHeader: boolean;
  borderWidth: number;
  radius: number;
  padding: number;
  striped: boolean;
  rowHeight: number;
}

function useResolvedTableOptions(): TableResolvedOpts {
  const cfg = useDesignSystem((s) => s.components.table);
  const opts = resolveOptions("table", cfg?.properties);
  return {
    showHeader: opts.showHeader !== false,
    borderWidth: Number(opts.borderWidth ?? 1),
    radius: Number(opts.radius ?? 8),
    padding: Number(opts.padding ?? 12),
    striped: opts.striped !== false,
    rowHeight: Number(opts.rowHeight ?? 44),
  };
}

function StatusBadge({ status }: { status: Txn["status"] }) {
  const mode = useDesignSystem((s) => s.currentPreviewMode);
  const badgeResolve = useComponentBindings("badge");
  const variant = status === "Cleared" ? "success" : status === "Pending" ? "neutral" : "warning";
  return (
    <TokenBadge variant={variant} mode={mode} resolve={badgeResolve}>
      {status}
    </TokenBadge>
  );
}

function Amount({ value, accentColor }: { value: number; accentColor: string }) {
  return (
    <span
      style={{
        fontFamily: "var(--ark-font-mono)",
        fontVariantNumeric: "tabular-nums",
        color: value >= 0 ? accentColor : tv("text-primary"),
        fontWeight: 600,
        fontSize: "var(--ark-text-xs)",
        whiteSpace: "nowrap",
      }}
    >
      {fmt(value)}
    </span>
  );
}

export function TableSkeleton({
  skeletonId,
  rows = TRANSACTIONS,
  maxRows,
}: {
  skeletonId: string;
  radiusStep?: number;
  rows?: Txn[];
  maxRows?: number;
}) {
  const opts = useResolvedTableOptions();
  const data = maxRows ? rows.slice(0, maxRows) : rows;
  const avatarResolve = useComponentBindings("avatar");

  const parentResolve = useComponentBindings("table");
  const bg = parentResolve("container.bg") ?? tv("surface-elevated");
  const borderColor = parentResolve("container.border") ?? tv("border-muted");
  const accentColor = parentResolve("cell.accent") ?? tv("action-primary-default");

  const wrapperStyle: CSSProperties = {
    backgroundColor: bg,
    border: `${opts.borderWidth}px solid ${borderColor}`,
    borderRadius: `${opts.radius}px`,
    overflow: "hidden",
    overflowX: "auto",
    width: "100%",
  };

  if (skeletonId === "2") {
    // Card grid layout styled dynamically
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: `${opts.padding}px`,
          padding: `${opts.padding}px`,
          backgroundColor: bg,
          border: `${opts.borderWidth}px solid ${borderColor}`,
          borderRadius: `${opts.radius}px`,
        }}
      >
        {data.map((t) => (
          <div
            key={t.id}
            style={{
              backgroundColor: tv("surface-elevated"),
              border: `1px solid ${borderColor}`,
              borderRadius: `${opts.radius - 2 > 0 ? opts.radius - 2 : 4}px`,
              padding: `${opts.padding}px`,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", justifyItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <span style={{ fontSize: "10px", color: tv("text-muted"), fontFamily: "var(--ark-font-mono)" }}>
                {t.id}
              </span>
              <StatusBadge status={t.status} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <TokenAvatar initials={t.payee.slice(0, 2)} size="sm" resolve={avatarResolve} />
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontSize: "var(--ark-text-xs)", fontWeight: 700, color: tv("text-primary"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.payee}
                </span>
                <span style={{ fontSize: "10px", color: tv("text-muted") }}>
                  {t.date}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", justifyItems: "center", justifyContent: "space-between", gap: "8px", borderTop: `1px solid ${borderColor}`, paddingTop: "8px", marginTop: "4px" }}>
              <span style={{ fontSize: "10px", color: tv("text-secondary") }}>
                {t.category}
              </span>
              <Amount value={t.amount} accentColor={accentColor} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (skeletonId === "3") {
    // Borderless Clean List styled dynamically
    return (
      <div style={wrapperStyle}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <tbody>
            {data.map((t, idx) => (
              <tr
                key={t.id}
                style={{
                  borderBottom: idx === data.length - 1 ? "none" : `1px solid ${borderColor}`,
                  height: `${opts.rowHeight}px`,
                  backgroundColor: opts.striped && idx % 2 === 1 ? tv("surface-subtle") : "transparent",
                }}
              >
                <td style={{ padding: `0 ${opts.padding}px`, width: "60px" }}>
                  <span style={{ fontSize: "10px", color: tv("text-muted"), fontFamily: "var(--ark-font-mono)" }}>
                    {t.id}
                  </span>
                </td>
                <td style={{ padding: `0 ${opts.padding}px` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <TokenAvatar initials={t.payee.slice(0, 2)} size="sm" resolve={avatarResolve} />
                    <span style={{ fontSize: "var(--ark-text-xs)", fontWeight: 500, color: tv("text-primary") }}>
                      {t.payee}
                    </span>
                  </div>
                </td>
                <td style={{ padding: `0 ${opts.padding}px` }}>
                  <span style={{ fontSize: "var(--ark-text-xs)", color: tv("text-secondary") }}>
                    {t.category}
                  </span>
                </td>
                <td style={{ padding: `0 ${opts.padding}px` }}>
                  <StatusBadge status={t.status} />
                </td>
                <td style={{ padding: `0 ${opts.padding}px`, textAlign: "right" }}>
                  <Amount value={t.amount} accentColor={accentColor} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (skeletonId === "4") {
    // Timeline Audit Log styled dynamically
    return (
      <div style={{ ...wrapperStyle, backgroundColor: "transparent", border: "none" }}>
        <div style={{ position: "relative", paddingLeft: "24px" }}>
          {/* Vertical line */}
          <div
            style={{
              position: "absolute",
              left: "8px",
              top: "12px",
              bottom: "12px",
              width: "2px",
              backgroundColor: borderColor,
            }}
          />
          
          <div style={{ display: "flex", flexDirection: "column", gap: `${opts.padding * 1.5}px` }}>
            {data.map((t) => (
              <div key={t.id} style={{ display: "flex", gap: "12px", alignItems: "flex-start", position: "relative" }}>
                {/* Timeline node dot */}
                <span
                  style={{
                    width: 9,
                    height: 9,
                    marginTop: 5,
                    borderRadius: "50%",
                    backgroundColor: t.status === "Flagged" ? "#ef4444" : accentColor,
                    flexShrink: 0,
                    position: "relative",
                    zIndex: 1,
                    boxShadow: `0 0 0 3px ${bg}`,
                  }}
                />
                
                {/* Content card */}
                <div
                  style={{
                    fontFamily: "var(--ark-font-mono)",
                  }}
                >
                  {t.id} logged to {t.category} · {t.status.toLowerCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 1 — Dense financial ledger (standard table layout) styled dynamically
  const cols = "5.5rem 1fr 6.5rem 5.5rem 7rem";
  return (
    <div style={wrapperStyle}>
      <div style={{ minWidth: "500px" }}>
        {opts.showHeader && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: "8px",
              padding: `8px ${opts.padding}px`,
              backgroundColor: tv("surface-subtle"),
              borderBottom: `${opts.borderWidth}px solid ${borderColor}`,
              height: "36px",
              alignItems: "center",
            }}
          >
            {["ID", "Payee", "Category", "Status", "Amount"].map((h, i) => (
              <span
                key={h}
                style={{
                  color: tv("text-muted"),
                  fontSize: "10px",
                  fontFamily: "var(--ark-font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  textAlign: i === 4 ? "right" : "left",
                }}
              >
                {h}
              </span>
            ))}
          </div>
        )}
        <div style={{ maxHeight: "280px", overflowY: "auto" }}>
          {data.map((t, idx) => (
          <div
            key={t.id}
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              gap: "8px",
              alignItems: "center",
              padding: `0 ${opts.padding}px`,
              height: `${opts.rowHeight}px`,
              borderBottom: idx === data.length - 1 ? "none" : `1px solid ${borderColor}`,
              backgroundColor: opts.striped && idx % 2 === 1 ? tv("surface-elevated") : "transparent",
            }}
          >
            <span
              style={{
                color: tv("text-muted"),
                fontSize: "10px",
                fontFamily: "var(--ark-font-mono)",
              }}
            >
              {t.id}
            </span>
            <span
              style={{
                color: tv("text-primary"),
                fontSize: "var(--ark-text-xs)",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {t.payee}
            </span>
            <span style={{ color: tv("text-secondary"), fontSize: "var(--ark-text-xs)" }}>
              {t.category}
            </span>
            <span>
              <StatusBadge status={t.status} />
            </span>
            <span style={{ textAlign: "right" }}>
              <Amount value={t.amount} accentColor={accentColor} />
            </span>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
