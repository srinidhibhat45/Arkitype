"use client";

/**
 * ThemeFrame — the bridge between the Zustand system tree and rendered UI.
 * Compiles the current store into --ark-* CSS custom properties for a mode
 * and scopes them to its subtree. Everything inside renders exclusively from
 * variables; changing any primitive or semantic mapping re-themes instantly.
 */
import type { CSSProperties, ReactNode } from "react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { systemCssVars, tv } from "@/lib/tokens";
import type { PreviewMode } from "@/store/useDesignSystem";

export function ThemeFrame({
  mode,
  children,
  className = "",
  style,
  label,
}: {
  mode: PreviewMode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  label?: string;
}) {
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);
  const vars = systemCssVars({ primitives, semantics }, mode);

  return (
    <div className={className} style={{ ...vars, ...style }}>
      {label ? (
        <div className="mb-2 text-[11px] font-medium text-fg-mute">{label}</div>
      ) : null}
      <div
        style={{
          background: tv("surface-base"),
          color: tv("text-primary"),
          border: `1px solid ${mode === "dark" ? "#232327" : "#e4e4e7"}`,
          fontFamily: "var(--ark-font-sans)",
        }}
        className="overflow-hidden rounded-xl"
      >
        {children}
      </div>
    </div>
  );
}
