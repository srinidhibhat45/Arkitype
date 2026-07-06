"use client";

/**
 * The Modal Node — strict 4-skeleton rule.
 *  1 Centered Overlay · 2 Right Side-Sheet · 3 Full-Screen Overlay · 4 Bottom-Sheet
 * All geometry, spacing, radii and color resolve from --ark-* variables.
 */
import { X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { rv, sv, tv } from "@/lib/tokens";
import { TokenButton, TokenInput, TokenSelect } from "./CoreComponents";

export const MODAL_SKELETONS = [
  { id: "1", name: "Centered Overlay", desc: "Pinned header · form rows · split footer" },
  { id: "2", name: "Right Side-Sheet", desc: "Top-to-bottom high-density config pane" },
  { id: "3", name: "Full-Screen Overlay", desc: "Immersive composition canvas capture" },
  { id: "4", name: "Bottom-Sheet", desc: "Base-pinned drawer, mobile-first" },
] as const;

function ModalChrome({
  title,
  radiusStep,
  children,
  footer,
  style,
  square = false,
  onClose,
}: {
  title: string;
  radiusStep: number;
  children: ReactNode;
  footer?: ReactNode;
  style?: CSSProperties;
  square?: boolean;
  onClose?: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
      style={{
        background: tv("surface-elevated"),
        border: `1px solid ${tv("border-default")}`,
        borderRadius: square ? 0 : rv(radiusStep),
        boxShadow: "var(--ark-shadow-high)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Pinned header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `${sv(2)} ${sv(3)}`,
          borderBottom: `1px solid ${tv("border-muted")}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: tv("text-primary"),
            fontSize: "var(--ark-text-sm)",
            fontWeight: 700,
          }}
        >
          {title}
        </span>
        <button
          type="button"
          aria-label="Close dialog"
          onClick={onClose}
          style={{
            color: tv("text-muted"),
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: "flex",
            padding: sv(1),
            borderRadius: rv(1),
          }}
        >
          <X size={14} />
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: sv(3) }}>
        {children}
      </div>
      {footer ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: sv(2),
            padding: `${sv(2)} ${sv(3)}`,
            borderTop: `1px solid ${tv("border-muted")}`,
            flexShrink: 0,
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: sv(1) }}>
      <span
        style={{
          color: tv("text-secondary"),
          fontSize: "var(--ark-text-xs)",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function SplitFooter({ onClose }: { onClose?: () => void }) {
  return (
    <>
      <span style={{ color: tv("text-muted"), fontSize: "var(--ark-text-xs)" }}>
        Draft autosaved
      </span>
      <div style={{ display: "flex", gap: sv(2) }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "transparent",
            color: tv("text-secondary"),
            border: `1px solid ${tv("border-default")}`,
            borderRadius: rv(2),
            padding: `${sv(1)} ${sv(3)}`,
            fontSize: "var(--ark-text-xs)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <TokenButton size="sm" radiusStep={2} onClick={onClose}>
          Save Transaction
        </TokenButton>
      </div>
    </>
  );
}

/** The modal body itself, positioned by skeleton inside a relative parent. */
export function ModalSkeleton({
  skeletonId,
  radiusStep,
  onClose,
}: {
  skeletonId: string;
  radiusStep: number;
  onClose?: () => void;
}) {
  const formRows = (twoCol: boolean) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: twoCol ? "1fr 1fr" : "1fr",
        gap: sv(3),
      }}
    >
      <FieldRow label="Payee">
        <TokenInput size="sm" radiusStep={2} placeholder="Vendor name" />
      </FieldRow>
      <FieldRow label="Category">
        <TokenSelect size="sm" radiusStep={2} value="Operating Budget" />
      </FieldRow>
      <FieldRow label="Amount">
        <TokenInput size="sm" radiusStep={2} placeholder="0.00" />
      </FieldRow>
      <FieldRow label="Cost Center">
        <TokenSelect size="sm" radiusStep={2} value="CC-104 · Platform" />
      </FieldRow>
    </div>
  );

  switch (skeletonId) {
    case "2": // Right side-sheet
      return (
        <ModalChrome
          title="Configure Ledger Filters"
          radiusStep={0}
          square
          onClose={onClose}
          footer={<SplitFooter onClose={onClose} />}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "min(340px, 62%)",
            borderTop: "none",
            borderRight: "none",
            borderBottom: "none",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: sv(3) }}>
            <FieldRow label="Date Range">
              <TokenSelect size="sm" radiusStep={2} value="Last 30 days" />
            </FieldRow>
            <FieldRow label="Status">
              <TokenSelect size="sm" radiusStep={2} value="Cleared + Pending" />
            </FieldRow>
            <FieldRow label="Minimum Amount">
              <TokenInput size="sm" radiusStep={2} placeholder="0.00" />
            </FieldRow>
            <FieldRow label="Category">
              <TokenSelect size="sm" radiusStep={2} value="All categories" />
            </FieldRow>
            <FieldRow label="Search Memo">
              <TokenInput size="sm" radiusStep={2} placeholder="Contains…" />
            </FieldRow>
          </div>
        </ModalChrome>
      );

    case "3": // Full-screen overlay
      return (
        <ModalChrome
          title="Compose Budget Report"
          radiusStep={radiusStep}
          onClose={onClose}
          footer={<SplitFooter onClose={onClose} />}
          style={{ position: "absolute", inset: sv(2) }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: sv(3), height: "100%" }}>
            <FieldRow label="Report Title">
              <TokenInput size="md" radiusStep={2} placeholder="FY26 Q3 Consolidated Spend" />
            </FieldRow>
            <div
              style={{
                flex: 1,
                minHeight: 60,
                border: `1px dashed ${tv("border-default")}`,
                borderRadius: rv(2),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: tv("text-muted"),
                fontSize: "var(--ark-text-xs)",
                fontFamily: "var(--ark-font-mono)",
              }}
            >
              document composition canvas
            </div>
          </div>
        </ModalChrome>
      );

    case "4": // Bottom-sheet
      return (
        <ModalChrome
          title="Attach Receipt Media"
          radiusStep={radiusStep}
          onClose={onClose}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "58%",
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            borderBottom: "none",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: sv(2),
            }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: "1 / 1",
                  background: tv("surface-subtle"),
                  border: `1px solid ${tv("border-muted")}`,
                  borderRadius: rv(2),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: tv("text-muted"),
                  fontSize: "var(--ark-text-xs)",
                  fontFamily: "var(--ark-font-mono)",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
            ))}
          </div>
        </ModalChrome>
      );

    default: // 1 — Centered overlay
      return (
        <ModalChrome
          title="New Transaction"
          radiusStep={radiusStep}
          onClose={onClose}
          footer={<SplitFooter onClose={onClose} />}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(420px, 86%)",
            maxHeight: "88%",
          }}
        >
          {formRows(true)}
        </ModalChrome>
      );
  }
}

/** Backdrop + modal, for embedding inside any relative container. */
export function ModalScene({
  skeletonId,
  radiusStep,
  onClose,
}: {
  skeletonId: string;
  radiusStep: number;
  onClose?: () => void;
}) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(9, 9, 11, 0.55)",
          backdropFilter: "blur(1.5px)",
        }}
      />
      <ModalSkeleton
        skeletonId={skeletonId}
        radiusStep={radiusStep}
        onClose={onClose}
      />
    </div>
  );
}
