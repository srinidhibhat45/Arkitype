"use client";

/**
 * The Live Proofing Dashboard's three form factors.
 *
 * Each surface takes an `IndustryPack` (lib/proofingTemplates.ts) and renders it
 * entirely from tokens and the component factory — no hardcoded colour, spacing,
 * radius, or type anywhere below. That's the whole point: the same system has to
 * survive a dense desktop console, a 390px touch screen, and an editorial
 * marketing page, and the only way to prove it is to render all three from one
 * set of decisions.
 *
 * Layout (this file) and content (the pack) are kept separate so the two axes
 * stay orthogonal: any industry renders in any form factor.
 */
import { useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BatteryFull,
  Calendar,
  Heart,
  LayoutGrid,
  Package,
  PieChart,
  Plus,
  Receipt,
  Settings2,
  Shield,
  ShoppingCart,
  SignalHigh,
  Star,
  Truck,
  Users,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { rv, sv, tv } from "@/lib/tokens";
import { useComponentBindings } from "@/lib/componentSchema";
import {
  INTERACTION_STATES,
  TokenButton,
  TokenInput,
  type InteractionState,
} from "@/components/factory/CoreComponents";
import { TokenBadge } from "@/components/factory/DisplayComponents";
import { TableSkeleton, type Txn } from "@/components/factory/TableSkeletons";
import { TabsSkeleton } from "@/components/factory/TabsSkeletons";
import { ModalScene } from "@/components/factory/ModalSkeletons";
import type { IndustryPack, ProofingIcon } from "@/lib/proofingTemplates";

const ICONS: Record<ProofingIcon, typeof Wallet> = {
  wallet: Wallet,
  receipt: Receipt,
  pie: PieChart,
  grid: LayoutGrid,
  heart: Heart,
  activity: Activity,
  users: Users,
  calendar: Calendar,
  cart: ShoppingCart,
  package: Package,
  truck: Truck,
  star: Star,
  shield: Shield,
  zap: Zap,
};

/** Skeleton ids the surfaces render, read once so all three stay in step. */
function useSkeletonIds() {
  const components = useDesignSystem((s) => s.components);
  return {
    table: components.table?.skeletonId ?? "1",
    tabs: components.tabs?.skeletonId ?? "1",
    modal: components.modal?.skeletonId ?? "1",
    tableRadius: Number(components.table?.properties.radiusStep ?? 2),
    tabsRadius: Number(components.tabs?.properties.radiusStep ?? 2),
    modalRadius: Number(components.modal?.properties.radiusStep ?? 4),
    buttonRadius: Number(components.button?.properties.radiusStep ?? 2),
    buttonSize: (components.button?.properties.size as "sm" | "md" | "lg") ?? "md",
  };
}

/* ── SaaS console ──────────────────────────────────────────────────────────── */

function SidebarMenu({ pack }: { pack: IndustryPack }) {
  const [active, setActive] = useState(pack.nav[1] ?? pack.nav[0]);
  return (
    <aside
      style={{
        width: 168,
        flexShrink: 0,
        borderRight: `1px solid ${tv("border-muted")}`,
        background: tv("surface-elevated"),
        padding: sv(3),
        display: "flex",
        flexDirection: "column",
        gap: sv(1),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: sv(2),
          marginBottom: sv(3),
          color: tv("text-primary"),
          fontWeight: 800,
          fontSize: "var(--ark-text-sm)",
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: rv(2),
            background: tv("action-primary-default"),
            color: tv("text-on-action"),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--ark-text-xs)",
          }}
        >
          {pack.brandInitial}
        </span>
        {pack.productName}
      </div>
      {pack.nav.map((item) => {
        const on = item === active;
        return (
          <button
            key={item}
            type="button"
            onClick={() => setActive(item)}
            style={{
              textAlign: "left",
              padding: `${sv(1)} ${sv(2)}`,
              borderRadius: rv(2),
              background: on ? tv("surface-subtle") : "transparent",
              color: on ? tv("text-primary") : tv("text-muted"),
              border: "none",
              borderLeft: `2px solid ${on ? tv("action-primary-default") : "transparent"}`,
              fontSize: "var(--ark-text-xs)",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "var(--ark-font-sans)",
            }}
          >
            {item}
          </button>
        );
      })}
      <div style={{ marginTop: "auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: sv(2),
            color: tv("text-muted"),
            fontSize: "var(--ark-text-xs)",
            padding: sv(2),
          }}
        >
          <Settings2 size={13} /> Settings
        </div>
      </div>
    </aside>
  );
}

function StatDeck({ pack }: { pack: IndustryPack }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: sv(3),
      }}
    >
      {pack.stats.map(({ label, value, delta, up, icon }) => {
        const Icon = ICONS[icon];
        return (
          <div
            key={label}
            style={{
              background: tv("surface-elevated"),
              border: `1px solid ${tv("border-muted")}`,
              borderRadius: rv(3),
              padding: sv(3),
              boxShadow: "var(--ark-shadow-low)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: tv("text-muted"),
                fontSize: "var(--ark-text-xs)",
                marginBottom: sv(1),
              }}
            >
              {label}
              <Icon size={13} />
            </div>
            <div
              style={{
                color: tv("text-primary"),
                fontSize: "var(--ark-text-lg)",
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value}
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                marginTop: sv(1),
                color: up ? tv("action-primary-default") : tv("text-muted"),
                fontSize: "var(--ark-text-xs)",
                fontFamily: "var(--ark-font-mono)",
              }}
            >
              {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {delta}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SaasSurface({ pack }: { pack: IndustryPack }) {
  const ids = useSkeletonIds();
  const buttonResolve = useComponentBindings("button");
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="relative flex" style={{ minHeight: 560 }}>
      <SidebarMenu pack={pack} />

      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: sv(4),
          display: "flex",
          flexDirection: "column",
          gap: sv(4),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: sv(3) }}>
          <div>
            <h1
              style={{
                color: tv("text-primary"),
                fontSize: "var(--ark-text-xl)",
                lineHeight: "var(--ark-leading-xl)",
                fontWeight: 800,
                margin: 0,
              }}
            >
              {pack.pageTitle}
            </h1>
            <p style={{ color: tv("text-muted"), fontSize: "var(--ark-text-xs)", margin: 0 }}>
              {pack.pageMeta}
            </p>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <TokenButton
              size={ids.buttonSize}
              radiusStep={ids.buttonRadius}
              resolve={buttonResolve}
              onClick={() => setModalOpen(true)}
              prefixIcon={<Plus size={13} />}
            >
              {pack.primaryCta}
            </TokenButton>
          </div>
        </div>

        <StatDeck pack={pack} />

        <section
          style={{
            background: tv("surface-elevated"),
            border: `1px solid ${tv("border-muted")}`,
            borderRadius: rv(ids.tableRadius),
            overflow: "hidden",
            boxShadow: "var(--ark-shadow-low)",
          }}
        >
          <TableSkeleton
            skeletonId={ids.table}
            radiusStep={ids.tableRadius}
            rows={pack.table.rows as Txn[]}
            columns={pack.table.columns}
            statusLabels={pack.table.statusLabels}
          />
        </section>

        <section
          style={{
            background: tv("surface-elevated"),
            border: `1px solid ${tv("border-muted")}`,
            borderRadius: rv(ids.tabsRadius),
            overflow: "hidden",
          }}
        >
          <TabsSkeleton skeletonId={ids.tabs} radiusStep={ids.tabsRadius} />
        </section>
      </main>

      {modalOpen ? (
        // Absolute overlay over the whole product frame (the parent is
        // `relative`) — ModalScene is width/height:100% for its in-card studio
        // previews, so as a plain flex sibling it would squash the dashboard.
        <div style={{ position: "absolute", inset: 0, zIndex: 50 }}>
          <ModalScene
            skeletonId={ids.modal}
            radiusStep={ids.modalRadius}
            onClose={() => setModalOpen(false)}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ── Mobile app ────────────────────────────────────────────────────────────── */

export function MobileSurface({ pack }: { pack: IndustryPack }) {
  const ids = useSkeletonIds();
  const mode = useDesignSystem((s) => s.currentPreviewMode);
  const buttonResolve = useComponentBindings("button");
  const badgeResolve = useComponentBindings("badge");
  const [tab, setTab] = useState(0);
  const m = pack.mobile;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        padding: sv(4),
        minHeight: 560,
        background: tv("surface-subtle"),
      }}
    >
      {/* 390pt-wide device viewport — the real constraint a token set has to
          survive: the same scale that reads as "roomy" at 1280px can push a
          touch target off the edge here. */}
      <div
        style={{
          width: 390,
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          background: tv("surface-base"),
          border: `1px solid ${tv("border-muted")}`,
          borderRadius: rv(5),
          overflow: "hidden",
          boxShadow: "var(--ark-shadow-high)",
        }}
      >
        {/* status bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: `${sv(2)} ${sv(3)}`,
            color: tv("text-muted"),
            fontSize: "var(--ark-text-xs)",
            fontFamily: "var(--ark-font-mono)",
          }}
        >
          <span>9:41</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: sv(1) }}>
            <SignalHigh size={13} />
            <Wifi size={13} />
            <BatteryFull size={13} />
          </span>
        </div>

        <div style={{ padding: `0 ${sv(3)} ${sv(3)}`, display: "flex", flexDirection: "column", gap: sv(3) }}>
          <h1
            style={{
              color: tv("text-primary"),
              fontSize: "var(--ark-text-xl)",
              lineHeight: "var(--ark-leading-xl)",
              fontWeight: 800,
              margin: 0,
            }}
          >
            {m.screenTitle}
          </h1>

          {/* hero card */}
          <div
            style={{
              background: tv("action-primary-default"),
              color: tv("text-on-action"),
              borderRadius: rv(4),
              padding: sv(4),
              boxShadow: "var(--ark-shadow-medium)",
            }}
          >
            <div style={{ fontSize: "var(--ark-text-xs)", opacity: 0.85 }}>{m.balanceLabel}</div>
            <div
              style={{
                fontSize: "var(--ark-text-xl)",
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
                marginTop: sv(1),
              }}
            >
              {m.balanceValue}
            </div>
          </div>

          <TokenButton
            fullWidth
            size={ids.buttonSize}
            radiusStep={ids.buttonRadius}
            resolve={buttonResolve}
            prefixIcon={<Plus size={13} />}
          >
            {pack.primaryCta}
          </TokenButton>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: sv(2),
              }}
            >
              <span
                style={{
                  color: tv("text-primary"),
                  fontSize: "var(--ark-text-sm)",
                  fontWeight: 700,
                }}
              >
                {m.listTitle}
              </span>
              <TokenBadge variant="neutral" mode={mode} resolve={badgeResolve}>
                {m.items.length}
              </TokenBadge>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {m.items.map((item, i) => (
                <div
                  key={item.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: sv(3),
                    // 44pt minimum touch target — the mobile view exists to make
                    // a too-tight density visible instead of theoretical.
                    minHeight: 44,
                    padding: `${sv(2)} 0`,
                    borderTop: i === 0 ? "none" : `1px solid ${tv("border-muted")}`,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        color: tv("text-primary"),
                        fontSize: "var(--ark-text-sm)",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </div>
                    <div style={{ color: tv("text-muted"), fontSize: "var(--ark-text-xs)" }}>
                      {item.meta}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--ark-font-mono)",
                      fontVariantNumeric: "tabular-nums",
                      fontSize: "var(--ark-text-xs)",
                      fontWeight: 600,
                      color: item.up ? tv("action-primary-default") : tv("text-primary"),
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.trailing}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* tab bar */}
        <div
          style={{
            marginTop: "auto",
            display: "grid",
            gridTemplateColumns: `repeat(${m.tabs.length}, 1fr)`,
            borderTop: `1px solid ${tv("border-muted")}`,
            background: tv("surface-elevated"),
          }}
        >
          {m.tabs.map((t, i) => {
            const Icon = ICONS[t.icon];
            const on = i === tab;
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => setTab(i)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  minHeight: 44,
                  padding: `${sv(2)} 0`,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: on ? tv("action-primary-default") : tv("text-muted"),
                  fontFamily: "var(--ark-font-sans)",
                  fontSize: "var(--ark-text-xs)",
                  fontWeight: on ? 700 : 500,
                }}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Marketing site ────────────────────────────────────────────────────────── */

export function MarketingSurface({ pack }: { pack: IndustryPack }) {
  const ids = useSkeletonIds();
  const buttonResolve = useComponentBindings("button");
  const inputResolve = useComponentBindings("input");
  const mk = pack.marketing;

  return (
    <div style={{ minHeight: 560, background: tv("surface-base") }}>
      {/* nav */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: sv(3),
          padding: `${sv(3)} ${sv(5)}`,
          borderBottom: `1px solid ${tv("border-muted")}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: sv(2),
            color: tv("text-primary"),
            fontWeight: 800,
            fontSize: "var(--ark-text-sm)",
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: rv(2),
              background: tv("action-primary-default"),
              color: tv("text-on-action"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "var(--ark-text-xs)",
            }}
          >
            {pack.brandInitial}
          </span>
          {pack.productName}
        </div>
        <nav style={{ display: "flex", gap: sv(3), marginLeft: sv(4) }}>
          {pack.nav.slice(0, 4).map((item) => (
            <span key={item} style={{ color: tv("text-muted"), fontSize: "var(--ark-text-xs)", fontWeight: 500 }}>
              {item}
            </span>
          ))}
        </nav>
        <div style={{ marginLeft: "auto" }}>
          <TokenButton variant="text" size="sm" radiusStep={ids.buttonRadius} resolve={buttonResolve}>
            Sign in
          </TokenButton>
        </div>
      </header>

      {/* hero */}
      <section style={{ padding: `${sv(6)} ${sv(5)}`, maxWidth: 760 }}>
        <div
          style={{
            display: "inline-block",
            color: tv("action-primary-default"),
            fontFamily: "var(--ark-font-mono)",
            fontSize: "var(--ark-text-xs)",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            marginBottom: sv(3),
          }}
        >
          {mk.eyebrow}
        </div>
        <h1
          style={{
            color: tv("text-primary"),
            // The display step is the one this surface exists to stress — a
            // scale that looks fine at --ark-text-lg can fall apart here.
            fontSize: "var(--ark-text-3xl)",
            lineHeight: "var(--ark-leading-3xl)",
            fontFamily: "var(--ark-font-display)",
            fontWeight: 800,
            margin: 0,
          }}
        >
          {mk.headline}
        </h1>
        <p
          style={{
            color: tv("text-secondary"),
            fontSize: "var(--ark-text-lg)",
            lineHeight: "var(--ark-leading-lg)",
            marginTop: sv(3),
            marginBottom: sv(4),
            maxWidth: 560,
          }}
        >
          {mk.sub}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: sv(2) }}>
          <div style={{ minWidth: 220 }}>
            <TokenInput
              size={ids.buttonSize}
              radiusStep={ids.buttonRadius}
              placeholder="you@company.com"
              resolve={inputResolve}
            />
          </div>
          <TokenButton
            size={ids.buttonSize}
            radiusStep={ids.buttonRadius}
            resolve={buttonResolve}
            suffixIcon={<ArrowRight size={13} />}
          >
            {mk.primaryCta}
          </TokenButton>
          <TokenButton
            variant="outlined"
            size={ids.buttonSize}
            radiusStep={ids.buttonRadius}
            resolve={buttonResolve}
          >
            {mk.secondaryCta}
          </TokenButton>
        </div>
      </section>

      {/* proof strip */}
      <section
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: sv(5),
          padding: `${sv(4)} ${sv(5)}`,
          borderTop: `1px solid ${tv("border-muted")}`,
          borderBottom: `1px solid ${tv("border-muted")}`,
          background: tv("surface-subtle"),
        }}
      >
        {mk.proofPoints.map((p) => (
          <div key={p.label}>
            <div
              style={{
                color: tv("text-primary"),
                fontSize: "var(--ark-text-lg)",
                fontWeight: 800,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {p.value}
            </div>
            <div style={{ color: tv("text-muted"), fontSize: "var(--ark-text-xs)" }}>{p.label}</div>
          </div>
        ))}
      </section>

      {/* features */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: sv(4),
          padding: `${sv(5)} ${sv(5)} ${sv(6)}`,
        }}
      >
        {mk.features.map((f) => {
          const Icon = ICONS[f.icon];
          return (
            <div
              key={f.title}
              style={{
                background: tv("surface-elevated"),
                border: `1px solid ${tv("border-muted")}`,
                borderRadius: rv(4),
                padding: sv(4),
                boxShadow: "var(--ark-shadow-low)",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: rv(2),
                  background: tv("surface-subtle"),
                  color: tv("action-primary-default"),
                  marginBottom: sv(3),
                }}
              >
                <Icon size={15} />
              </span>
              <h3
                style={{
                  color: tv("text-primary"),
                  fontSize: "var(--ark-text-sm)",
                  fontWeight: 700,
                  margin: 0,
                  marginBottom: sv(1),
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  color: tv("text-muted"),
                  fontSize: "var(--ark-text-xs)",
                  lineHeight: "var(--ark-leading-xs)",
                  margin: 0,
                }}
              >
                {f.body}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}

/* ── Interactive-state proof ───────────────────────────────────────────────── */

/**
 * Every interaction state at once. Hovering one control at a time can't show
 * whether the *set* holds together — whether focus is distinguishable from
 * hover, or disabled reads as disabled rather than just pale. This lays them
 * side by side in whichever mode the frame is in.
 */
export function StatesStrip() {
  const buttonResolve = useComponentBindings("button");
  const inputResolve = useComponentBindings("input");
  const ids = useSkeletonIds();

  const row = (label: string, render: (state: InteractionState) => JSX.Element) => (
    // nowrap + its own scroll: a wrapped row orphans the last state onto a line
    // of its own, which reads as a different control rather than one more state.
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: sv(3),
        flexWrap: "nowrap",
        overflowX: "auto",
      }}
    >
      <span
        style={{
          width: 64,
          flexShrink: 0,
          paddingTop: sv(1),
          color: tv("text-muted"),
          fontSize: "var(--ark-text-xs)",
          fontFamily: "var(--ark-font-mono)",
        }}
      >
        {label}
      </span>
      {INTERACTION_STATES.map((state) => (
        <div
          key={state}
          style={{ display: "flex", flexDirection: "column", gap: sv(1), flexShrink: 0 }}
        >
          {render(state)}
          <span
            style={{
              color: tv("text-muted"),
              fontSize: "10px",
              fontFamily: "var(--ark-font-mono)",
              textAlign: "center",
            }}
          >
            {state}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: sv(4),
        padding: sv(4),
        borderTop: `1px solid ${tv("border-muted")}`,
        background: tv("surface-subtle"),
      }}
    >
      {row("Button", (state) => (
        <TokenButton
          state={state}
          size={ids.buttonSize}
          radiusStep={ids.buttonRadius}
          resolve={buttonResolve}
        >
          {pretty(state)}
        </TokenButton>
      ))}
      {row("Outlined", (state) => (
        <TokenButton
          variant="outlined"
          state={state}
          size={ids.buttonSize}
          radiusStep={ids.buttonRadius}
          resolve={buttonResolve}
        >
          {pretty(state)}
        </TokenButton>
      ))}
      {row("Input", (state) => (
        <div style={{ width: 132 }}>
          <TokenInput
            state={state}
            size={ids.buttonSize}
            radiusStep={ids.buttonRadius}
            placeholder={pretty(state)}
            resolve={inputResolve}
          />
        </div>
      ))}
    </div>
  );
}

const pretty = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
