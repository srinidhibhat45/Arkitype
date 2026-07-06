"use client";

/**
 * Top bar: identity + the two global concerns (preview mode, shipping).
 * Everything else lives inside its step — the bar stays quiet.
 */
import { Segmented } from "@/components/ui/controls";
import { STEP_ORDER, useDesignSystem } from "@/store/useDesignSystem";

export function TopBar() {
  const name = useDesignSystem((s) => s.meta.name);
  const setSystemName = useDesignSystem((s) => s.setSystemName);
  const mode = useDesignSystem((s) => s.currentPreviewMode);
  const setPreviewMode = useDesignSystem((s) => s.setPreviewMode);
  const done = useDesignSystem((s) => s.journey.done);
  const goToStep = useDesignSystem((s) => s.goToStep);

  const readyToShip = STEP_ORDER.slice(0, -1).every((id) => done[id]);

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-ink px-5">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 rounded-[5px] bg-fg" aria-hidden />
        <span className="text-[13px] font-semibold tracking-tight text-fg">
          Arkitype
        </span>
      </div>

      <span className="text-fg-mute">/</span>

      <input
        type="text"
        value={name}
        onChange={(e) => setSystemName(e.target.value)}
        aria-label="System name"
        className="w-56 rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] text-fg-dim transition-colors hover:border-line focus:border-line-strong focus:text-fg focus:outline-none"
      />

      <div className="ml-auto flex items-center gap-3">
        <span className="hidden text-[11px] text-fg-mute sm:block">
          Autosaved
        </span>
        <Segmented
          options={[
            { label: "Light", value: "light" as const },
            { label: "Dark", value: "dark" as const },
          ]}
          value={mode}
          onChange={setPreviewMode}
        />
        <button
          type="button"
          onClick={() => goToStep("ship")}
          className={`inline-flex h-8 items-center rounded-lg px-3.5 text-[12px] font-medium transition-colors ${
            readyToShip
              ? "bg-fg text-ink hover:bg-neutral-300"
              : "border border-line text-fg-mute hover:border-line-strong hover:text-fg-dim"
          }`}
        >
          Ship
        </button>
      </div>
    </header>
  );
}
