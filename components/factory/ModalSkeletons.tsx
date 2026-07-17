"use client";

/**
 * The Modal Node — fully customizable layout options.
 * Renders Centered Overlay, Right Side-Sheet, Full-Screen Overlay, or Bottom-Sheet
 * based on selected skeletonId, styled using design options from the store.
 */
import { X, Sparkles, Folder, File, Trash, Edit } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { resolveOptions, useComponentBindings, createChildResolver, useSlotInstance, Resolver } from "@/lib/componentSchema";
import { sv, tv, rv } from "@/lib/tokens";
import { TokenButton, TokenInput, TokenSelect, TokenAlert } from "./CoreComponents";
import { TokenIconButton } from "./FormControls";

// Shadows mapping
const SHADOWS: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
};

export const MODAL_SKELETONS = [
  { id: "1", name: "Centered Overlay", desc: "Pinned header · form rows · split footer" },
  { id: "2", name: "Right Side-Sheet", desc: "Top-to-bottom high-density config pane" },
  { id: "3", name: "Full-Screen Overlay", desc: "Immersive composition canvas capture" },
  { id: "4", name: "Bottom-Sheet", desc: "Base-pinned drawer, mobile-first" },
] as const;

interface ModalResolvedOpts {
  title: string;
  titleSize: string;
  subtitle: string;
  subtitleSize: string;
  align: "left" | "center";
  showClose: boolean;
  forcedAction: boolean;
  position: "center" | "top" | "bottom";
  showDivider: boolean;
  radius: number;
  shadow: string;
  borderWidth: number;
  bodyText: string;
  bodyTextSize: string;
  showSecondary: boolean;
  width: "xs" | "sm" | "md" | "lg";
  overlayOpacity: number;
  paddingH: number;
  paddingV: number;
  skeletonId: string;
  borderColor: string;
}

function useResolvedModalOptions(): ModalResolvedOpts {
  const cfg = useDesignSystem((s) => s.components.modal);
  const opts = resolveOptions("modal", cfg?.properties);
  // Scale Step is a raw property, not a declared OptionSpec — resolveOptions()
  // only surfaces declared keys, so read it straight off the properties bag.
  const props = cfg?.properties;

  return {
    title: (opts.title ?? "Confirm deletion") as string,
    titleSize: (props?.["title.size"] ?? "xl") as string,
    subtitle: (opts.subtitle ?? "This action cannot be undone") as string,
    subtitleSize: (props?.["subtitle.size"] ?? "sm") as string,
    align: (opts.align ?? "left") as "left" | "center",
    showClose: opts.showClose !== false && opts.forcedAction !== true,
    forcedAction: !!opts.forcedAction,
    position: (opts.position ?? "center") as "center" | "top" | "bottom",
    showDivider: opts.showDivider !== false,
    radius: Number(opts.radius ?? 12),
    shadow: (opts.shadow ?? "lg") as string,
    borderWidth: Number(opts.borderWidth ?? 1),
    bodyText: (opts.bodyText ?? "This will permanently delete the selected items from your workspace.") as string,
    bodyTextSize: (props?.["bodyText.size"] ?? "sm") as string,
    showSecondary: opts.showSecondary !== false,
    width: (opts.width ?? "sm") as "xs" | "sm" | "md" | "lg",
    overlayOpacity: Number(opts.overlayOpacity ?? 48),
    paddingH: Number(opts.paddingH ?? 24),
    paddingV: Number(opts.paddingV ?? 20),
    skeletonId: (cfg?.skeletonId ?? "1") as string,
    borderColor: (opts.borderColor ?? "#e4e4e7") as string,
  };
}

function ModalChrome({
  opts,
  children,
  footer,
  style,
  onClose,
  iconButtonResolve,
  resolve,
  closeIconSize,
  closeIconVariant,
}: {
  opts: ModalResolvedOpts;
  children: ReactNode;
  footer?: ReactNode;
  style?: CSSProperties;
  onClose?: () => void;
  iconButtonResolve?: Resolver;
  resolve: Resolver;
  closeIconSize: any;
  closeIconVariant: any;
}) {
  const bgColor = resolve("container.bg") ?? tv("surface-elevated");
  const bColor = resolve("container.border") ?? tv("border-muted");

  const iconBtnSize = closeIconSize ?? "sm";
  const iconBtnVariant = closeIconVariant ?? "ghost";

  return (
    <div
      role="dialog"
      aria-label={opts.title}
      style={{
        backgroundColor: bgColor,
        border: `${opts.borderWidth}px solid ${bColor}`,
        borderRadius: resolve("container.radius") ?? `${opts.radius}px`,
        boxShadow: SHADOWS[opts.shadow] ?? SHADOWS.lg,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        ...style,
      }}
    >
      {/* Pinned header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: opts.align === "center" ? "center" : "space-between",
          padding: `${opts.paddingV / 1.5}px ${opts.paddingH}px`,
          borderBottom: opts.showDivider ? `1px solid ${bColor}` : "none",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", textAlign: opts.align, width: "100%" }}>
          <span
            style={{
              color: tv("text-primary"),
              fontSize: `var(--ark-text-${opts.titleSize})`,
              lineHeight: `var(--ark-leading-${opts.titleSize})`,
              fontWeight: `var(--ark-weight-${opts.titleSize})`,
              fontFamily: `var(--ark-font-role-${opts.titleSize})`,
            }}
          >
            {opts.title}
          </span>
          {opts.subtitle && (
            <span
              style={{
                color: tv("text-muted"),
                fontSize: `var(--ark-text-${opts.subtitleSize})`,
                lineHeight: `var(--ark-leading-${opts.subtitleSize})`,
                fontWeight: `var(--ark-weight-${opts.subtitleSize})`,
                fontFamily: `var(--ark-font-role-${opts.subtitleSize})`,
                marginTop: "2px",
              }}
            >
              {opts.subtitle}
            </span>
          )}
        </div>

        {opts.showClose && (
          <div
            style={{
              position: "absolute",
              right: `${opts.paddingH / 1.5}px`,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <TokenIconButton
              variant={iconBtnVariant}
              size={iconBtnSize}
              resolve={iconButtonResolve}
              aria-label="Close dialog"
              onClick={onClose}
            >
              <X size={14} />
            </TokenIconButton>
          </div>
        )}
      </div>

      {/* Body scroll area */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: `${opts.paddingV}px ${opts.paddingH}px` }}>
        {children}
      </div>

      {/* Footer block */}
      {footer ? (
        <div
          style={{
            display: "flex",
            justifyContent: opts.align === "center" ? "center" : "space-between",
            alignItems: "center",
            gap: "12px",
            padding: `${opts.paddingV / 1.5}px ${opts.paddingH}px`,
            borderTop: opts.showDivider ? `1px solid ${bColor}` : "none",
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
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}>
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

export function ModalSkeleton({
  skeletonId,
  onClose,
}: {
  skeletonId: string;
  onClose?: () => void;
}) {
  const opts = useResolvedModalOptions();

  const cfg = useDesignSystem((s) => s.components.modal);
  const parentProperties = cfg?.properties;
  const mode = useDesignSystem((s) => s.currentPreviewMode);

  // Repeated per-item icon buttons (bottom-sheet file grid) are styled data,
  // not a fixed instance slot — they just use the molecule's global style.
  const iconButtonResolve = useComponentBindings("iconButton");
  const inputResolve = useComponentBindings("input");
  const selectResolve = useComponentBindings("select");
  const alertResolve = useComponentBindings("alert");

  const parentResolve = useComponentBindings("modal");
  const childInputResolve = createChildResolver("input", parentResolve, inputResolve);
  const childSelectResolve = createChildResolver("select", parentResolve, selectResolve);
  const childAlertResolve = createChildResolver("alert", parentResolve, alertResolve);

  // Each slot's `resolve` is the Button/IconButton molecule's own global style
  // resolver — the modal has no way to override it. `content` is the slot's
  // per-instance content (label/icon/variant/size), stored on the modal itself.
  const primaryAction = useSlotInstance("modal", "primaryAction");
  const secondaryAction = useSlotInstance("modal", "secondaryAction");
  const closeAction = useSlotInstance("modal", "closeButton");

  const primarySize = primaryAction.content.size as any;
  const primaryVariant = primaryAction.content.variant as any;
  const primaryPrefix = primaryAction.content.prefixIcon as string;
  const primarySuffix = primaryAction.content.suffixIcon as string;
  const primaryLabel = primaryAction.content.label as string;

  const secondarySize = secondaryAction.content.size as any;
  const secondaryVariant = secondaryAction.content.variant as any;
  const secondaryPrefix = secondaryAction.content.prefixIcon as string;
  const secondarySuffix = secondaryAction.content.suffixIcon as string;
  const secondaryLabel = secondaryAction.content.label as string;

  const selectSize = (parentProperties?.["select.size"] as any) ?? "sm";
  const inputSize = (parentProperties?.["input.size"] as any) ?? "sm";
  const iconBtnSize = closeAction.content.size as any;
  const iconBtnVariant = closeAction.content.variant as any;

  // Width translation
  const widthMap = {
    xs: "280px",
    sm: "420px",
    md: "600px",
    lg: "820px",
  };
  const modalWidth = widthMap[opts.width] ?? widthMap.sm;

  const footer = (
    <div style={{ display: "flex", width: "100%", justifyContent: opts.align === "center" ? "center" : "flex-end", gap: "10px" }}>
      {opts.showSecondary && (
        <TokenButton
          size={secondarySize}
          variant={secondaryVariant}
          prefixIcon={secondaryPrefix}
          suffixIcon={secondarySuffix}
          resolve={secondaryAction.resolve}
          onClick={onClose}
        >
          {secondaryLabel}
        </TokenButton>
      )}
      <TokenButton
        size={primarySize}
        variant={primaryVariant}
        prefixIcon={primaryPrefix}
        suffixIcon={primarySuffix}
        resolve={primaryAction.resolve}
        onClick={onClose}
      >
        {primaryLabel}
      </TokenButton>
    </div>
  );

  switch (skeletonId) {
    case "2": // Right side-sheet
      return (
        <ModalChrome
          opts={opts}
          resolve={parentResolve}
          onClose={onClose}
          footer={footer}
          iconButtonResolve={closeAction.resolve}
          closeIconSize={iconBtnSize}
          closeIconVariant={iconBtnVariant}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: `min(${modalWidth}, 100%)`,
            borderTopLeftRadius: `${opts.radius}px`,
            borderBottomLeftRadius: `${opts.radius}px`,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            borderTop: "none",
            borderRight: "none",
            borderBottom: "none",
            maxHeight: "100%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p
              style={{
                color: tv("text-secondary"),
                fontSize: `var(--ark-text-${opts.bodyTextSize})`,
                lineHeight: `var(--ark-leading-${opts.bodyTextSize})`,
                fontWeight: `var(--ark-weight-${opts.bodyTextSize})`,
                fontFamily: `var(--ark-font-role-${opts.bodyTextSize})`,
                marginBottom: "8px",
              }}
            >
              {opts.bodyText}
            </p>
            <FieldRow label="Date Range">
              <TokenSelect size={selectSize} value="Last 30 days" resolve={childSelectResolve} />
            </FieldRow>
            <FieldRow label="Status">
              <TokenSelect size={selectSize} value="Cleared + Pending" resolve={childSelectResolve} />
            </FieldRow>
            <FieldRow label="Minimum Amount">
              <TokenInput size={inputSize} placeholder="0.00" resolve={childInputResolve} />
            </FieldRow>
            <FieldRow label="Category">
              <TokenSelect size={selectSize} value="All categories" resolve={childSelectResolve} />
            </FieldRow>
            <FieldRow label="Search Memo">
              <TokenInput size={inputSize} placeholder="Contains…" resolve={childInputResolve} />
            </FieldRow>
          </div>
        </ModalChrome>
      );

    case "3": // Full-screen overlay
      return (
        <ModalChrome
          opts={opts}
          resolve={parentResolve}
          onClose={onClose}
          footer={footer}
          iconButtonResolve={closeAction.resolve}
          closeIconSize={iconBtnSize}
          closeIconVariant={iconBtnVariant}
          style={{ 
            position: "absolute", 
            inset: "20px",
            width: "calc(100% - 40px)",
            height: "calc(100% - 40px)"
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", height: "100%", maxWidth: "600px", width: "100%", margin: "0 auto" }}>
            <p
              style={{
                color: tv("text-secondary"),
                fontSize: `var(--ark-text-${opts.bodyTextSize})`,
                lineHeight: `var(--ark-leading-${opts.bodyTextSize})`,
                fontWeight: `var(--ark-weight-${opts.bodyTextSize})`,
                fontFamily: `var(--ark-font-role-${opts.bodyTextSize})`,
              }}
            >
              {opts.bodyText}
            </p>
            <FieldRow label="Report Title">
              <TokenInput size={inputSize} placeholder="FY26 Q3 Consolidated Spend" resolve={childInputResolve} />
            </FieldRow>
            <div
              style={{
                flex: 1,
                minHeight: 100,
                border: `1px dashed ${opts.borderColor}`,
                borderRadius: `${opts.radius - 4 > 0 ? opts.radius - 4 : 4}px`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                gap: "12px",
                backgroundColor: tv("surface-subtle"),
              }}
            >
              <div style={{ width: "100%", maxWidth: "400px" }}>
                <TokenAlert
                  variant={(parentProperties?.["alert.variant"] as any) ?? "info"}
                  mode={mode}
                  title="Document Composition Canvas"
                  body="Drag elements here or edit parameters to update."
                  style={(parentProperties?.["alert.style"] as any) ?? "subtle"}
                  accent={(parentProperties?.["alert.accent"] as any) ?? "left"}
                  icon={parentProperties?.["alert.icon"] !== false}
                  resolve={childAlertResolve}
                />
              </div>
              <span style={{ color: tv("text-muted"), fontSize: "var(--ark-text-xs)", fontFamily: "var(--ark-font-mono)" }}>
                composition workbench
              </span>
            </div>
          </div>
        </ModalChrome>
      );

    case "4": // Bottom-sheet
      return (
        <ModalChrome
          opts={opts}
          resolve={parentResolve}
          onClose={onClose}
          footer={footer}
          iconButtonResolve={closeAction.resolve}
          closeIconSize={iconBtnSize}
          closeIconVariant={iconBtnVariant}
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 0,
            width: `min(${modalWidth}, 100%)`,
            height: "65%",
            borderTopLeftRadius: `${opts.radius}px`,
            borderTopRightRadius: `${opts.radius}px`,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            borderBottom: "none",
            maxHeight: "100%",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
            <p
              style={{
                color: tv("text-secondary"),
                fontSize: `var(--ark-text-${opts.bodyTextSize})`,
                lineHeight: `var(--ark-leading-${opts.bodyTextSize})`,
                fontWeight: `var(--ark-weight-${opts.bodyTextSize})`,
                fontFamily: `var(--ark-font-role-${opts.bodyTextSize})`,
                marginBottom: "8px",
              }}
            >
              {opts.bodyText}
            </p>
            
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                alignContent: "start",
                gap: "10px",
                overflowY: "auto",
                flex: 1,
                paddingBottom: "10px",
              }}
            >
              {[
                { icon: Folder, name: "Ledgers.pdf" },
                { icon: File, name: "Receipt_0451.png" },
                { icon: File, name: "Receipt_0452.png" },
                { icon: Sparkles, name: "Audit_Summary.docx" },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: "1 / 1",
                    background: tv("surface-subtle"),
                    border: `1px solid ${opts.borderColor}`,
                    borderRadius: `${opts.radius - 4 > 0 ? opts.radius - 4 : 4}px`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "8px",
                    gap: "6px",
                    position: "relative",
                  }}
                >
                  <item.icon size={20} style={{ color: tv("text-link") }} />
                  <span style={{ color: tv("text-primary"), fontSize: "10px", fontWeight: 500, textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.name}
                  </span>
                  
                  <div style={{ position: "absolute", top: 4, right: 4 }}>
                    <TokenIconButton variant={iconBtnVariant} size={iconBtnSize} resolve={iconButtonResolve} aria-label="Delete file">
                      <Trash size={10} style={{ color: tv("text-muted") }} />
                    </TokenIconButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ModalChrome>
      );

    default: // 1 — Centered overlay
      return (
        <ModalChrome
          opts={opts}
          resolve={parentResolve}
          onClose={onClose}
          footer={footer}
          iconButtonResolve={closeAction.resolve}
          closeIconSize={iconBtnSize}
          closeIconVariant={iconBtnVariant}
          style={{
            position: "absolute",
            top: opts.position === "top" ? "10%" : opts.position === "bottom" ? "auto" : "50%",
            bottom: opts.position === "bottom" ? "10%" : "auto",
            left: "50%",
            transform: opts.position === "top" ? "translate(-50%, 0)" : opts.position === "bottom" ? "translate(-50%, 0)" : "translate(-50%, -50%)",
            width: `min(${modalWidth}, 90%)`,
            maxHeight: "95%",
            height: "fit-content",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p
              style={{
                color: tv("text-secondary"),
                fontSize: `var(--ark-text-${opts.bodyTextSize})`,
                lineHeight: `var(--ark-leading-${opts.bodyTextSize})`,
                fontWeight: `var(--ark-weight-${opts.bodyTextSize})`,
                fontFamily: `var(--ark-font-role-${opts.bodyTextSize})`,
              }}
            >
              {opts.bodyText}
            </p>
            
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginTop: "4px",
              }}
            >
              <FieldRow label="Payee">
                <TokenInput size={inputSize} state="active" value="Acme Corp" placeholder="Vendor name" resolve={childInputResolve} />
              </FieldRow>
              <FieldRow label="Category">
                <TokenSelect size={selectSize} state="active" value="Operating Budget" resolve={childSelectResolve} />
              </FieldRow>
              <FieldRow label="Amount">
                <TokenInput size={inputSize} state="active" value="1,240.00" placeholder="0.00" resolve={childInputResolve} />
              </FieldRow>
              <FieldRow label="Cost Center">
                <TokenSelect size={selectSize} state="active" value="CC-104 · Platform" resolve={childSelectResolve} />
              </FieldRow>
            </div>
          </div>
        </ModalChrome>
      );
  }
}

/** Backdrop + modal, for embedding inside any relative container. */
export function ModalScene({
  skeletonId,
  onClose,
}: {
  skeletonId: string;
  radiusStep?: number;
  onClose?: () => void;
}) {
  const opts = useResolvedModalOptions();
  const resolve = useComponentBindings("modal");
  const overlayBg = resolve("overlay.bg") ?? `rgba(9, 9, 11, ${opts.overlayOpacity / 100})`;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "360px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Backdrop */}
      <div
        onClick={opts.forcedAction ? undefined : onClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: overlayBg,
          backdropFilter: "blur(1.5px)",
          zIndex: 1,
        }}
      />
      
      {/* Container wrapper for modal */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
        <ModalSkeleton
          skeletonId={skeletonId}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
