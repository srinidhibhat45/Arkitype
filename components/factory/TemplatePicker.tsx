"use client";

/**
 * TemplateButton — the "small button, used once and forgotten" entry point
 * for Templates. Every component in the library carries the six systems now
 * (see `lib/componentTemplates.ts`); the length check below stays as the gate
 * so a component that ever opts out renders no chrome rather than a picker
 * with one card in it.
 *
 * The popover's card previews are never static mocks: `renderPreview(id)` is
 * supplied by the caller (the Studio's own `hero(...)` closure), and each card
 * renders inside a `TemplatePreviewScope` so components that read the active
 * template from the store see the hypothetical one instead. Every card is the
 * real component rendering live, in the file's actual current tokens and mode
 * — exactly what picking it would produce.
 *
 * Each preview needs its own `ThemeFrame`, and that is not decoration.
 * `AnchoredPopover` portals to `document.body`, which puts these cards
 * *outside* the Studio canvas's frame — the only place the `--ark-*` custom
 * properties are declared. Without a frame of their own every token-driven
 * declaration in the preview resolved to nothing: no fill, no padding, no
 * radius, no type scale, so a button card rendered as its bare label on a
 * blank box and the picker looked broken on exactly the components people
 * open it for.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, LayoutTemplate } from "lucide-react";
import { useDesignSystem } from "@/store/useDesignSystem";
import { activeTemplateId, getTemplates } from "@/lib/componentTemplates";
import { TemplatePreviewScope } from "@/components/factory/templateKit";
import { AnchoredPopover } from "@/components/factory/studioShared";
import { ThemeFrame } from "@/components/ui/ThemeFrame";

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
  // The cards claim to render "in your own tokens" — which means the mode the
  // top bar is previewing too, not a fixed light one.
  const mode = useDesignSystem((s) => s.currentPreviewMode);
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
        className="w-[720px] max-w-[calc(100vw-32px)] rounded-lg border border-line-strong bg-ink-panel p-3 shadow-2xl"
      >
        <div ref={popoverRef}>
          <div className="mb-2.5">
            <div className="text-[12px] font-semibold text-fg">Start from a template</div>
            <div className="mt-0.5 text-[11px] leading-relaxed text-fg-mute">
              Six shape grammars — corners, density, edges, elevation and label weight — modelled
              on systems that have been through years of real use. Every card below renders in your
              own tokens, and any part binding you've set keeps working after you pick one.
            </div>
          </div>
          <div className="grid max-h-[70vh] grid-cols-3 gap-2 overflow-y-auto pr-0.5">
            {templates.map((t) => {
              const isActive = t.id === activeId;
              return (
                /* A card is a div, not a <button>: half these previews are
                   themselves buttons (Button, Icon button, Button group, and
                   every template branch with an action in it), and a <button>
                   inside a <button> is invalid HTML that React reports on
                   every render. role/tabIndex/aria-pressed plus the two keys a
                   button answers to keep it a real control either way. */
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => pick(t.id)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    pick(t.id);
                  }}
                  aria-pressed={isActive}
                  className={`flex cursor-pointer flex-col items-stretch gap-2 rounded-lg border p-2 text-left transition-colors ${
                    isActive
                      ? "border-line-strong bg-ink-raised"
                      : "border-line hover:border-line-strong hover:bg-ink/40"
                  }`}
                >
                  {/* The frame is what makes the preview a preview: it declares
                      the --ark-* variables the component renders from, and
                      paints the system's own surface underneath it, in the mode
                      the top bar is showing. See the note at the top of the
                      file for what a card looks like without one. */}
                  <ThemeFrame mode={mode} className="w-full">
                    <div
                      className="flex items-center justify-center overflow-hidden"
                      style={{ height: 112 }}
                    >
                      {/* `inert` keeps a card's live demo controls (a nested
                         TokenButton, an accordion toggle…) out of the tab order,
                         so the card itself is the only focusable thing here.
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
                        <TemplatePreviewScope template={t.id}>
                          {renderPreview(t.id)}
                        </TemplatePreviewScope>
                      </div>
                    </div>
                  </ThemeFrame>
                  <div className="px-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[11.5px] font-semibold text-fg">{t.name}</span>
                      {isActive ? (
                        <Check size={11} className="shrink-0 text-fg-dim" strokeWidth={3} />
                      ) : null}
                      {/* Most templates restyle; these ten also rebuild the
                          layout. Saying which is which keeps the card's promise
                          the same size as what it delivers. */}
                      {t.structural ? (
                        <span
                          title="This template also rebuilds the component's layout, not just its shape grammar"
                          className="ml-auto shrink-0 rounded bg-ink-raised px-1 py-px text-[8px] font-semibold uppercase tracking-wider text-fg-mute"
                        >
                          Layout
                        </span>
                      ) : null}
                    </div>
                    <div className="truncate text-[9.5px] font-medium uppercase tracking-wide text-fg-mute">
                      {t.source}
                    </div>
                    <div className="mt-1 text-[10.5px] leading-snug text-fg-mute">{t.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AnchoredPopover>
    </div>
  );
}
