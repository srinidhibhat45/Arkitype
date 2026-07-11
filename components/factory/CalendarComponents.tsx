"use client";

/**
 * Date picker / calendar — the month-grid surface expected of a world-class
 * system (Material 3 date pickers, Carbon date picker, SLDS datepicker,
 * Atlassian calendar, Apple date pickers).
 *
 * Rendered as a deterministic representative month (no `new Date()` so SSR and
 * client agree — avoids hydration drift). Every colour resolves from a role and
 * the whole surface is rebindable part-by-part in the studio.
 */
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { rv, sv, tv } from "@/lib/tokens";
import { NO_BINDINGS, Resolver } from "@/lib/componentSchema";

const WEEKDAYS_SUN = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAYS_MON = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type Cell = { label: number; adjacent: boolean };

/** Build a stable 42-cell grid for a 31-day month whose 1st lands on `offset`. */
function buildGrid(offset: number, daysInMonth = 31, prevMonthDays = 28): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < offset; i++) {
    cells.push({ label: prevMonthDays - offset + 1 + i, adjacent: true });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ label: d, adjacent: false });
  let trailing = 1;
  while (cells.length < 42) cells.push({ label: trailing++, adjacent: true });
  return cells;
}

export function TokenDatePicker({
  mode = "single",
  radiusStep = 3,
  firstDay = "sun",
  showAdjacent = true,
  selectedDay = 12,
  rangeStart = 12,
  rangeEnd = 18,
  today = 20,
  resolve = NO_BINDINGS,
}: {
  mode?: "single" | "range";
  radiusStep?: number;
  firstDay?: "sun" | "mon";
  showAdjacent?: boolean;
  selectedDay?: number;
  rangeStart?: number;
  rangeEnd?: number;
  today?: number;
  resolve?: Resolver;
}) {
  const r = resolve;
  const offset = firstDay === "mon" ? 5 : 6; // representative month start
  const weekdays = firstDay === "mon" ? WEEKDAYS_MON : WEEKDAYS_SUN;
  const grid = buildGrid(offset);

  const dayText = r("day.text") ?? tv("text-primary");
  const mutedText = r("day.mutedText") ?? tv("text-muted");
  const selBg = r("day.selectedBg") ?? tv("action-primary-default");
  const selText = r("day.selectedText") ?? tv("text-on-action");
  const rangeBg = r("day.rangeBg") ?? tv("surface-subtle");
  const todayRing = r("day.todayRing") ?? tv("border-focus");
  const cellRadius = r("day.radius") ?? rv(7);

  const cellState = (c: Cell) => {
    if (c.adjacent) return "adjacent" as const;
    if (mode === "single") return c.label === selectedDay ? "selected" : "normal";
    // range mode
    if (c.label === rangeStart || c.label === rangeEnd) return "endpoint" as const;
    if (c.label > rangeStart && c.label < rangeEnd) return "inrange" as const;
    return "normal" as const;
  };

  return (
    <div
      style={{
        width: 264,
        padding: sv(3),
        borderRadius: r("container.radius") ?? rv(radiusStep),
        background: r("container.bg") ?? tv("surface-elevated"),
        border: `${r("container.borderWidth") ?? "1px"} solid ${r("container.border") ?? tv("border-default")}`,
        boxShadow: "var(--ark-shadow-medium)",
        fontFamily: "var(--ark-font-sans)",
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: sv(2) }}>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: rv(2), color: r("header.navColor") ?? tv("text-secondary"), cursor: "pointer" }}>
          <ChevronLeft size={16} />
        </span>
        <span style={{ fontSize: "var(--ark-text-sm)", fontWeight: 700, color: r("header.monthColor") ?? tv("text-primary") }}>
          March 2026
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: rv(2), color: r("header.navColor") ?? tv("text-secondary"), cursor: "pointer" }}>
          <ChevronRight size={16} />
        </span>
      </div>

      {/* weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
        {weekdays.map((w) => (
          <span key={w} style={{ textAlign: "center", fontSize: "var(--ark-text-xs)", fontWeight: 600, color: r("weekday.color") ?? tv("text-muted"), paddingBottom: 4 }}>
            {w}
          </span>
        ))}
      </div>

      {/* days */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 2 }}>
        {grid.map((c, i) => {
          const st = cellState(c);
          if (c.adjacent && !showAdjacent) {
            return <span key={i} />;
          }
          const isToday = st === "normal" && c.label === today && !c.adjacent;
          let bg = "transparent";
          let color = c.adjacent ? mutedText : dayText;
          let radius: string | number = cellRadius;
          if (st === "selected" || st === "endpoint") {
            bg = selBg;
            color = selText;
          } else if (st === "inrange") {
            bg = rangeBg;
            radius = 0;
          }
          const content: ReactNode = (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: radius,
                background: bg,
                color,
                fontSize: "var(--ark-text-sm)",
                fontWeight: st === "selected" || st === "endpoint" ? 700 : 500,
                boxShadow: isToday ? `inset 0 0 0 1.5px ${todayRing}` : undefined,
                cursor: "pointer",
              }}
            >
              {c.label}
            </span>
          );
          return (
            <span key={i} style={{ display: "flex", justifyContent: "center" }}>
              {content}
            </span>
          );
        })}
      </div>
    </div>
  );
}
