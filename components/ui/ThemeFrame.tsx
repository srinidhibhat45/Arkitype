"use client";

/**
 * ThemeFrame — the bridge between the Zustand system tree and rendered UI.
 * Compiles the current store into --ark-* CSS custom properties for a mode
 * and scopes them to its subtree. Everything inside renders exclusively from
 * variables; changing any primitive or semantic mapping re-themes instantly.
 */
import type { CSSProperties, ReactNode } from "react";
import { modeBase, useDesignSystem, type ProjectState } from "@/store/useDesignSystem";
import { systemCssVars, tv } from "@/lib/tokens";
import type { PreviewMode } from "@/store/useDesignSystem";

export function ThemeFrame({
  mode,
  children,
  className = "",
  style,
  label,
  primitives: primitivesProp,
  semantics: semanticsProp,
}: {
  mode: PreviewMode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  label?: string;
  /** Supply both to theme from a serialized system (a published snapshot)
   *  instead of the live store — the store is the default. */
  primitives?: ProjectState["primitives"];
  semantics?: ProjectState["semantics"];
}) {
  const storePrimitives = useDesignSystem((s) => s.primitives);
  const storeSemantics = useDesignSystem((s) => s.semantics);
  const primitives = primitivesProp ?? storePrimitives;
  const semantics = semanticsProp ?? storeSemantics;
  const vars = systemCssVars({ primitives, semantics }, mode);
  // The frame itself isn't a token — it's tool chrome around the preview — so
  // it follows the appearance the mode declared rather than its name.
  const base = modeBase(semantics, mode);

  return (
    <div className={className} style={{ ...vars, ...style }}>
      {label ? (
        <div className="mb-2 text-[11px] font-medium text-fg-mute">{label}</div>
      ) : null}
      <div
        style={{
          background: tv("surface-base"),
          color: tv("text-primary"),
          border: `1px solid ${base === "dark" ? "#232327" : "#e4e4e7"}`,
          fontFamily: "var(--ark-font-sans)",
        }}
        className="overflow-hidden rounded-xl"
      >
        {children}
      </div>
    </div>
  );
}
