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
  borderColor: string;
  bg: string;
  radius: number;
  padding: number;
  striped: boolean;
  rowHeight: number;
  accentColor: string;
}

function useResolvedTableOptions(): TableResolvedOpts {
  const cfg = useDesignSystem((s) => s.components.table);
  const opts = resolveOptions("table", cfg?.properties);
  return {
    showHeader: opts.showHeader !== false,
    borderWidth: Number(opts.borderWidth ?? 1),
    borderColor: (opts.borderColor ?? "#e4e4e7") as string,
    bg: (opts.bg ?? "#ffffff") as string,
    radius: Number(opts.radius ?? 8),
    padding: Number(opts.padding ?? 12),
    striped: opts.striped !== false,
    rowHeight: Number(opts.rowHeight ?? 44),
    accentColor: (opts.accentColor ?? "#4f46e5") as string,
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

  const wrapperStyle: CSSProperties = {
    backgroundColor: opts.bg,
    border: `${opts.borderWidth}px solid ${opts.borderColor}`,
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
          backgroundColor: opts.bg,
          border: `${opts.borderWidth}px solid ${opts.borderColor}`,
          borderRadius: `${opts.radius}px`,
        }}
      >
        {data.map((t) => (
          <div
            key={t.id}
            style={{
              backgroundColor: tv("surface-elevated"),
              border: `1px solid ${opts.borderColor}`,
              borderRadius: `${opts.radius - 2 > 0 ? opts.radius - 2 : 4}px`,
              padding: `${opts.padding}px`,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <TokenAvatar initials={t.payee.charAt(0)} size="sm" resolve={avatarResolve} />
              <span
                style={{
                  color: tv("text-primary"),
                  fontSize: "var(--ark-text-xs)",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.payee}
              </span>
              <MoreHorizontal
                size={13}
                style={{ marginLeft: "auto", color: tv("text-muted"), flexShrink: 0 }}
              />
            </div>
            <Amount value={t.amount} accentColor={opts.accentColor} />
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              <StatusBadge status={t.status} />
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: "9999px",
                  backgroundColor: tv("surface-subtle"),
                  color: tv("text-secondary"),
                  fontSize: "10px",
                }}
              >
                {t.category}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (skeletonId === "3") {
    // Borderless clean list styled dynamically
    return (
      <div style={{ ...wrapperStyle, padding: `8px ${opts.padding * 1.5}px` }}>
        <div style={{ minWidth: "500px" }}>
          {data.map((t, idx) => (
          <div
            key={t.id}
            className="group"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              height: `${opts.rowHeight}px`,
              borderBottom: idx === data.length - 1 ? "none" : `1px solid ${opts.borderColor}`,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  color: tv("text-primary"),
                  fontSize: "var(--ark-text-sm)",
                  fontWeight: 600,
                }}
              >
                {t.payee}
              </div>
              <div
                style={{
                  color: tv("text-muted"),
                  fontSize: "10px",
                  fontFamily: "var(--ark-font-mono)",
                }}
              >
                {t.id} · {t.date} · {t.category}
              </div>
            </div>
            <Amount value={t.amount} accentColor={opts.accentColor} />
            <MoreHorizontal
              size={14}
              style={{ color: tv("text-muted"), cursor: "pointer" }}
            />
          </div>
        ))}
        </div>
      </div>
    );
  }

  if (skeletonId === "4") {
    // Timeline audit log styled dynamically
    return (
      <div style={{ ...wrapperStyle, padding: `${opts.padding * 1.5}px`, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: `calc(${opts.padding * 1.5}px + 44px)`,
            top: `${opts.padding * 1.5}px`,
            bottom: `${opts.padding * 1.5}px`,
            width: 1,
            backgroundColor: opts.borderColor,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {data.map((t) => (
            <div
              key={t.id}
              style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}
            >
              <span
                style={{
                  width: 44,
                  flexShrink: 0,
                  color: tv("text-muted"),
                  fontSize: "10px",
                  fontFamily: "var(--ark-font-mono)",
                  textAlign: "right",
                  lineHeight: "18px",
                }}
              >
                {t.date.slice(5)}
              </span>
              <span
                style={{
                  width: 9,
                  height: 9,
                  marginTop: 5,
                  borderRadius: "50%",
                  backgroundColor: t.status === "Flagged" ? "#ef4444" : opts.accentColor,
                  flexShrink: 0,
                  position: "relative",
                  zIndex: 1,
                  boxShadow: `0 0 0 3px ${opts.bg}`,
                }}
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  backgroundColor: tv("surface-elevated"),
                  border: `1px solid ${opts.borderColor}`,
                  borderRadius: `${opts.radius - 2 > 0 ? opts.radius - 2 : 4}px`,
                  padding: "8px 12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <span
                    style={{
                      color: tv("text-primary"),
                      fontSize: "var(--ark-text-xs)",
                      fontWeight: 600,
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.payee}
                  </span>
                  <Amount value={t.amount} accentColor={opts.accentColor} />
                </div>
                <div
                  style={{
                    marginTop: 2,
                    color: tv("text-muted"),
                    fontSize: "10px",
                    fontFamily: "var(--ark-font-mono)",
                  }}
                >
                  {t.id} logged to {t.category} · {t.status.toLowerCase()}
                </div>
              </div>
            </div>
          ))}
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
              borderBottom: `${opts.borderWidth}px solid ${opts.borderColor}`,
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
              borderBottom: idx === data.length - 1 ? "none" : `1px solid ${opts.borderColor}`,
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
              <Amount value={t.amount} accentColor={opts.accentColor} />
            </span>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
