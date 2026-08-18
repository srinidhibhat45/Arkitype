"use client";

/**
 * TemplateButton — the "small button, used once and forgotten" entry point
 * for Templates. Renders nothing for components with no registered
 * alternates (see `lib/componentTemplates.ts`), so it never adds chrome to
 * the ~30 components that don't have one.
 *
 * The popover's card previews are never static mocks: `renderPreview(id)` is
 * supplied by the caller (the Studio's own `hero(...)` closure with
 * `template` injected), so every card is the real component rendering live,
 * in the file's actual current tokens and mode — exactly what picking it
 * would produce.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, LayoutTemplate } from "lucide-react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { activeTemplateId, getTemplates } from "@/lib/componentTemplates";
import { AnchoredPopover } from "@/components/factory/studioShared";

export function TemplateButton({
  componentId,
  renderPreview,
}: {
  componentId: string;
  /** Render the component as it would look under the given template id,
   *  using the live current tokens/mode/options — never a stored mock. */
  renderPreview: (templateId: string) => ReactNode;
}) {
  const templates = getTemplates(componentId);
  const properties = useDesignSystem((s) => s.components[componentId]?.properties);
  const setProperty = useDesignSystem((s) => s.setComponentProperty);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Nothing to switch between — stay invisible rather than show a picker
  // with only "Arkitype" in it.
  if (templates.length <= 1) return null;

  const activeId = activeTemplateId(componentId, properties);
  const active = templates.find((t) => t.id === activeId) ?? templates[0];
  const isDefault = active.id === "arkitype";

  const pick = (id: string) => {
    setProperty(componentId, "template", id);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Start from a template modeled on a real design system — your colours stay yours"
        className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors ${
          isDefault
            ? "border-line text-fg-mute hover:border-line-strong hover:text-fg"
            : "border-line-strong bg-ink-hover text-fg"
        }`}
      >
        <LayoutTemplate size={12} />
        <span className="max-w-[110px] truncate">{isDefault ? "Templates" : active.name}</span>
      </button>

      <AnchoredPopover
        anchorRef={containerRef}
        open={open}
        align="right"
        className="w-[640px] max-w-[calc(100vw-32px)] rounded-lg border border-line-strong bg-ink-panel p-3 shadow-2xl"
      >
        <div ref={popoverRef}>
          <div className="mb-2.5">
            <div className="text-[12px] font-semibold text-fg">Start from a template</div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-fg-mute">
              Swaps the structure only — every card already renders in your own tokens, and any
              part binding you've set keeps working after you pick one.
            </div>
          </div>
          <div className="grid max-h-[70vh] grid-cols-2 gap-2 overflow-y-auto pr-0.5">
            {templates.map((t) => {
              const isActive = t.id === activeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t.id)}
                  aria-pressed={isActive}
                  className={`flex flex-col items-stretch gap-2 rounded-lg border p-2 text-left transition-colors ${
                    isActive
                      ? "border-line-strong bg-ink-raised"
                      : "border-line hover:border-line-strong hover:bg-ink/40"
                  }`}
                >
                  <div
                    className="flex items-center justify-center overflow-hidden rounded-md border border-line bg-ink"
                    style={{ height: 112 }}
                  >
                    {/* `inert` keeps a card's live demo controls (a nested
                       TokenButton, an accordion toggle…) out of the tab order,
                       so the outer <button> is the only focusable thing here.
                       It's set imperatively rather than as a JSX prop because
                       React 18 doesn't know `inert` is a boolean attribute and
                       warns on every render if you pass it declaratively. */}
                    <div
                      aria-hidden="true"
                      ref={(el) => el?.setAttribute("inert", "")}
                      style={{
                        pointerEvents: "none",
                        transform: "scale(0.58)",
                        transformOrigin: "center center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {renderPreview(t.id)}
                    </div>
                  </div>
                  <div className="px-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[11.5px] font-semibold text-fg">{t.name}</span>
                      {isActive ? (
                        <Check size={11} className="shrink-0 text-fg-dim" strokeWidth={3} />
                      ) : null}
                    </div>
                    <div className="truncate text-[9.5px] font-medium uppercase tracking-wide text-fg-mute">
                      {t.source}
                    </div>
                    <div className="mt-1 text-[10.5px] leading-snug text-fg-mute">{t.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </AnchoredPopover>
    </div>
  );
}
