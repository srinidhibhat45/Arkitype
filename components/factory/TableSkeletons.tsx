"use client";

/**
 * The Complex Data Table — strict 4-skeleton rule.
 *  1 Dense Financial Ledger · 2 Card Grid · 3 Borderless Clean List · 4 Timeline Audit Log
 * All structure/color/spacing resolves from --ark-* variables; row data is the
 * shared budget dataset consumed by the Stress-Test Canvas too.
 */
import { MoreHorizontal } from "lucide-react";
import { rv, sv, tv } from "@/lib/tokens";

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

function StatusBadge({ status }: { status: Txn["status"] }) {
  const token =
    status === "Cleared"
      ? "action-primary-default"
      : status === "Pending"
        ? "text-muted"
        : "border-focus";
  return (
    <span
      style={{
        display: "inline-block",
        padding: `2px ${sv(2)}`,
        borderRadius: rv(7),
        border: `1px solid ${tv(token)}`,
        color: tv(token),
        fontSize: "var(--ark-text-xs)",
        fontFamily: "var(--ark-font-mono)",
        lineHeight: 1.3,
      }}
    >
      {status}
    </span>
  );
}

function Amount({ value }: { value: number }) {
  return (
    <span
      style={{
        fontFamily: "var(--ark-font-mono)",
        fontVariantNumeric: "tabular-nums",
        color: value >= 0 ? tv("action-primary-default") : tv("text-primary"),
        fontWeight: 600,
      }}
    >
      {fmt(value)}
    </span>
  );
}

export function TableSkeleton({
  skeletonId,
  radiusStep,
  rows = TRANSACTIONS,
  maxRows,
}: {
  skeletonId: string;
  radiusStep: number;
  rows?: Txn[];
  maxRows?: number;
}) {
  const data = maxRows ? rows.slice(0, maxRows) : rows;

  if (skeletonId === "2") {
    // Card grid
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: sv(2),
          padding: sv(2),
        }}
      >
        {data.map((t) => (
          <div
            key={t.id}
            style={{
              background: tv("surface-elevated"),
              border: `1px solid ${tv("border-muted")}`,
              borderRadius: rv(radiusStep),
              padding: sv(2),
              display: "flex",
              flexDirection: "column",
              gap: sv(1),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: sv(2) }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: rv(7),
                  background: tv("action-primary-default"),
                  color: tv("text-on-action"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--ark-text-xs)",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {t.payee.charAt(0)}
              </div>
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
            <Amount value={t.amount} />
            <div style={{ display: "flex", gap: sv(1), flexWrap: "wrap" }}>
              <StatusBadge status={t.status} />
              <span
                style={{
                  padding: `2px ${sv(2)}`,
                  borderRadius: rv(7),
                  background: tv("surface-subtle"),
                  color: tv("text-secondary"),
                  fontSize: "var(--ark-text-xs)",
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
    // Borderless clean list
    return (
      <div style={{ padding: `${sv(2)} ${sv(4)}` }}>
        {data.map((t) => (
          <div
            key={t.id}
            className="group"
            style={{
              display: "flex",
              alignItems: "center",
              gap: sv(3),
              padding: `${sv(3)} 0`,
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
                  fontSize: "var(--ark-text-xs)",
                  fontFamily: "var(--ark-font-mono)",
                }}
              >
                {t.id} · {t.date} · {t.category}
              </div>
            </div>
            <Amount value={t.amount} />
            <MoreHorizontal
              size={14}
              className="opacity-0 transition-opacity group-hover:opacity-100"
              style={{ color: tv("text-muted") }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (skeletonId === "4") {
    // Timeline audit log
    return (
      <div style={{ padding: sv(3), position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: `calc(${sv(3)} + 44px)`,
            top: sv(3),
            bottom: sv(3),
            width: 1,
            background: tv("border-muted"),
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: sv(3) }}>
          {data.map((t) => (
            <div
              key={t.id}
              style={{ display: "flex", alignItems: "flex-start", gap: sv(3) }}
            >
              <span
                style={{
                  width: 44,
                  flexShrink: 0,
                  color: tv("text-muted"),
                  fontSize: "var(--ark-text-xs)",
                  fontFamily: "var(--ark-font-mono)",
                  textAlign: "right",
                }}
              >
                {t.date.slice(5)}
              </span>
              <span
                style={{
                  width: 9,
                  height: 9,
                  marginTop: 3,
                  borderRadius: rv(7),
                  background:
                    t.status === "Flagged"
                      ? tv("border-focus")
                      : tv("action-primary-default"),
                  flexShrink: 0,
                  position: "relative",
                  zIndex: 1,
                  boxShadow: `0 0 0 3px ${tv("surface-base")}`,
                }}
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: tv("surface-elevated"),
                  border: `1px solid ${tv("border-muted")}`,
                  borderRadius: rv(radiusStep),
                  padding: sv(2),
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: sv(2) }}>
                  <span
                    style={{
                      color: tv("text-primary"),
                      fontSize: "var(--ark-text-xs)",
                      fontWeight: 600,
                    }}
                  >
                    {t.payee}
                  </span>
                  <Amount value={t.amount} />
                </div>
                <div
                  style={{
                    marginTop: 2,
                    color: tv("text-muted"),
                    fontSize: "var(--ark-text-xs)",
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

  // 1 — Dense financial ledger
  const cols = "5.5rem 1fr 6.5rem 5.5rem 7rem";
  return (
    <div style={{ maxHeight: 320, overflowY: "auto", position: "relative" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: cols,
          gap: sv(2),
          padding: `${sv(1)} ${sv(3)}`,
          background: tv("surface-subtle"),
          position: "sticky",
          top: 0,
          zIndex: 1,
          borderBottom: `1px solid ${tv("border-default")}`,
        }}
      >
        {["ID", "Payee", "Category", "Status", "Amount"].map((h, i) => (
          <span
            key={h}
            style={{
              color: tv("text-muted"),
              fontSize: "var(--ark-text-xs)",
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
      {data.map((t, idx) => (
        <div
          key={t.id}
          style={{
            display: "grid",
            gridTemplateColumns: cols,
            gap: sv(2),
            alignItems: "center",
            padding: `${sv(1)} ${sv(3)}`,
            borderBottom: `1px solid ${tv("border-muted")}`,
            background: idx % 2 === 1 ? tv("surface-elevated") : "transparent",
          }}
        >
          <span
            style={{
              color: tv("text-muted"),
              fontSize: "var(--ark-text-xs)",
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
          <StatusBadge status={t.status} />
          <span style={{ textAlign: "right" }}>
            <Amount value={t.amount} />
          </span>
        </div>
      ))}
    </div>
  );
}
