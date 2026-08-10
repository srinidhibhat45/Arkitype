"use client";

/**
 * The roles surface, live. Editing moved into `TokenTiers` (the semantic and
 * component tiers of the one colour surface) and auditing into `ContrastPanel`,
 * so what remains here is the composed preview those two are judged against:
 * one card, every role, rendered per mode.
 */
import { PreviewMode, modeName, useDesignSystem } from "@/store/useDesignSystem";
import { rv, sv, tv } from "@/lib/tokens";
import { ThemeFrame } from "@/components/ui/ThemeFrame";

/** Live composed surface exercising the roles, rendered per mode. */
export function RolesInContext({ mode }: { mode: PreviewMode }) {
  // The card is labelled with the mode's own name — a file with a "High
  // contrast" column shouldn't have it announced as "Dark".
  const semantics = useDesignSystem((s) => s.semantics);

  return (
    <ThemeFrame mode={mode} label={modeName(semantics, mode)}>
      <div style={{ background: tv("surface-base"), padding: sv(4) }}>
        <div
          style={{
            background: tv("surface-elevated"),
            border: `1px solid ${tv("border-default")}`,
            borderRadius: rv(4),
            boxShadow: "var(--ark-shadow-medium)",
            padding: sv(4),
            display: "flex",
            flexDirection: "column",
            gap: sv(2),
          }}
        >
          <span style={{ color: tv("text-muted"), fontSize: "var(--ark-text-xs)" }}>
            Billing · overview
          </span>
          <span
            style={{ color: tv("text-primary"), fontSize: "var(--ark-text-xl)", fontWeight: 700 }}
          >
            Your plan renews Friday
          </span>
          <span style={{ color: tv("text-secondary"), fontSize: "var(--ark-text-sm)" }}>
            Every colour here is a role — remap one and this card follows.{" "}
            <span style={{ color: tv("text-link") }}>View invoice</span>
          </span>

          <div
            style={{
              marginTop: sv(1),
              background: tv("feedback-success-surface"),
              border: `1px solid ${tv("feedback-success-border")}`,
              color: tv("feedback-success-text"),
              borderRadius: rv(3),
              padding: `${sv(2)} ${sv(3)}`,
              fontSize: "var(--ark-text-xs)",
            }}
          >
            Payment method confirmed.
          </div>

          <div style={{ display: "flex", gap: sv(2), marginTop: sv(1) }}>
            <button
              style={{
                background: tv("action-primary-default"),
                color: tv("text-on-action"),
                border: "1px solid transparent",
                borderRadius: rv(2),
                padding: `${sv(1)} ${sv(3)}`,
                fontSize: "var(--ark-text-sm)",
                fontWeight: 600,
              }}
            >
              Manage plan
            </button>
            <button
              style={{
                background: tv("action-secondary-default"),
                color: tv("text-primary"),
                border: `1px solid ${tv("border-default")}`,
                borderRadius: rv(2),
                padding: `${sv(1)} ${sv(3)}`,
                fontSize: "var(--ark-text-sm)",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </ThemeFrame>
  );
}
