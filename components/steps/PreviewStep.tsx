"use client";

/**
 * Step 06 — Preview. The reward moment: a full budget-management product
 * rendered 100% from the system. Nothing in the frame is hardcoded — swap a
 * skeleton or reseed a colour and the product morphs live.
 */
import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  LayoutGrid,
  PieChart,
  Plus,
  Receipt,
  Settings2,
  Wallet,
} from "lucide-react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { rv, sv, tv } from "@/lib/tokens";
import {
  AsideDivider,
  AsideNote,
  SelectControl,
  SliderControl,
} from "@/components/ui/controls";
import { StepScaffold } from "@/components/shell/StepScaffold";
import { ThemeFrame } from "@/components/ui/ThemeFrame";
import { TokenButton } from "@/components/factory/CoreComponents";
import { useComponentBindings } from "@/lib/componentSchema";
import { MODAL_SKELETONS, ModalScene } from "@/components/factory/ModalSkeletons";
import { TABS_SKELETONS, TabsSkeleton } from "@/components/factory/TabsSkeletons";
import {
  TABLE_SKELETONS,
  TableSkeleton,
  TRANSACTIONS,
} from "@/components/factory/TableSkeletons";

const STATS = [
  { label: "Total balance", value: "$128,404.22", delta: "+4.1%", up: true, icon: Wallet },
  { label: "Monthly burn", value: "$33,866.25", delta: "−2.8%", up: false, icon: Receipt },
  { label: "Runway", value: "14.2 months", delta: "+0.6", up: true, icon: PieChart },
  { label: "Pending", value: String(TRANSACTIONS.filter((t) => t.status === "Pending").length), delta: "2 urgent", up: false, icon: LayoutGrid },
];

const MENU = ["Overview", "Ledger", "Budgets", "Forecast", "Approvals", "Reports"];

function SidebarMenu() {
  const [active, setActive] = useState("Ledger");
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
          B
        </span>
        BudgetOps
      </div>
      {MENU.map((item) => {
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

function StatDeck() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: sv(3),
      }}
    >
      {STATS.map(({ label, value, delta, up, icon: Icon }) => (
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
      ))}
    </div>
  );
}

const skeletonOptions = (
  meta: ReadonlyArray<{ id: string; name: string }>
) => meta.map((m) => ({ label: `${m.id} · ${m.name}`, value: m.id }));

export function PreviewStep() {
  const zoom = useDesignSystem((s) => s.canvasZoom);
  const setCanvasZoom = useDesignSystem((s) => s.setCanvasZoom);
  const mode = useDesignSystem((s) => s.currentPreviewMode);
  const components = useDesignSystem((s) => s.components);
  const setComponentSkeleton = useDesignSystem((s) => s.setComponentSkeleton);
  const [modalOpen, setModalOpen] = useState(false);

  const tableCfg = components.table;
  const tabsCfg = components.tabs;
  const modalCfg = components.modal;
  const buttonCfg = components.button;
  const buttonResolve = useComponentBindings("button");

  return (
    <StepScaffold
      step="preview"
      title="Your system, under real load"
      lede="A dense budget product built entirely from your tokens — no hardcoded styles anywhere in the frame. Go back and change any decision, or swap skeletons right here, and watch the product morph. If it holds up here, it ships."
      aside={
        <>
          <SliderControl
            label="Canvas zoom"
            value={zoom}
            min={0.5}
            max={1.25}
            step={0.05}
            unit="×"
            onChange={setCanvasZoom}
          />

          <AsideDivider />

          <AsideNote>Swap structures without leaving the preview:</AsideNote>

          <SelectControl
            label="Table skeleton"
            value={tableCfg?.skeletonId ?? "1"}
            options={skeletonOptions(TABLE_SKELETONS)}
            onChange={(v) => setComponentSkeleton("table", v)}
          />
          <SelectControl
            label="Tabs skeleton"
            value={tabsCfg?.skeletonId ?? "1"}
            options={skeletonOptions(TABS_SKELETONS)}
            onChange={(v) => setComponentSkeleton("tabs", v)}
          />
          <SelectControl
            label="Modal skeleton"
            value={modalCfg?.skeletonId ?? "1"}
            options={skeletonOptions(MODAL_SKELETONS)}
            onChange={(v) => setComponentSkeleton("modal", v)}
          />

          <AsideDivider />

          <AsideNote>
            Use the Light / Dark toggle in the top bar to check both modes —
            the product should feel equally considered in each.
          </AsideNote>
        </>
      }
    >
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "top left",
          width: `${100 / zoom}%`,
        }}
      >
        <ThemeFrame mode={mode}>
          <div className="relative flex" style={{ minHeight: 560 }}>
            <SidebarMenu />

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
                    Operating Ledger
                  </h1>
                  <p
                    style={{
                      color: tv("text-muted"),
                      fontSize: "var(--ark-text-xs)",
                      margin: 0,
                    }}
                  >
                    FY26 · consolidated across 4 cost centers
                  </p>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <TokenButton
                    size={(buttonCfg?.properties.size as "sm" | "md" | "lg") ?? "md"}
                    radiusStep={Number(buttonCfg?.properties.radiusStep ?? 2)}
                    resolve={buttonResolve}
                    onClick={() => setModalOpen(true)}
                  >
                    <Plus size={13} /> New transaction
                  </TokenButton>
                </div>
              </div>

              <StatDeck />

              <section
                style={{
                  background: tv("surface-elevated"),
                  border: `1px solid ${tv("border-muted")}`,
                  borderRadius: rv(Number(tableCfg?.properties.radiusStep ?? 2)),
                  overflow: "hidden",
                  boxShadow: "var(--ark-shadow-low)",
                }}
              >
                <TableSkeleton
                  skeletonId={tableCfg?.skeletonId ?? "1"}
                  radiusStep={Number(tableCfg?.properties.radiusStep ?? 2)}
                />
              </section>

              <section
                style={{
                  background: tv("surface-elevated"),
                  border: `1px solid ${tv("border-muted")}`,
                  borderRadius: rv(Number(tabsCfg?.properties.radiusStep ?? 2)),
                  overflow: "hidden",
                }}
              >
                <TabsSkeleton
                  skeletonId={tabsCfg?.skeletonId ?? "1"}
                  radiusStep={Number(tabsCfg?.properties.radiusStep ?? 2)}
                />
              </section>
            </main>

            {modalOpen ? (
              <ModalScene
                skeletonId={modalCfg?.skeletonId ?? "1"}
                radiusStep={Number(modalCfg?.properties.radiusStep ?? 4)}
                onClose={() => setModalOpen(false)}
              />
            ) : null}
          </div>
        </ThemeFrame>
      </div>
    </StepScaffold>
  );
}
