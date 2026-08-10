import { useEffect, useMemo, useState } from "react";
import { Moon, Sun, Folder, HelpCircle, AlertTriangle, PanelLeft, PanelRight } from "lucide-react";
import { Segmented } from "@/components/ui/controls";
import { PanelSide, STEP_ORDER, modeDefsOf, useDesignSystem } from "@/store/useDesignSystem";
import * as db from "@/lib/persistence";

/**
 * One panel switch, parked over the panel it controls.
 *
 * Position is the whole point. Sitting these two in the middle of the chrome
 * cluster made them a third and fourth 32px bordered icon among identical ones,
 * and nobody found them. At the far ends of the bar they're spatially obvious —
 * the switch for the left panel is above the left panel — which is where Figma
 * and every editor that has ever shipped this control puts it.
 *
 * They're in the *bar* rather than on the panels because a control docked
 * inside a panel disappears with it. The bar never goes anywhere, so whatever
 * you put away is always one click from coming back.
 */
function PanelToggle({ side }: { side: PanelSide }) {
  const showing = useDesignSystem((s) => s.panels[side]);
  const togglePanel = useDesignSystem((s) => s.togglePanel);

  const name = side === "left" ? "left panel" : "right panel";
  // One glyph per side, never swapped: an icon that changes shape as you press
  // it reads as two different buttons. What changes is its *state* — lit means
  // the panel is out, dim means it's away — which is the same thing the panel
  // itself is telling you.
  const Icon = side === "left" ? PanelLeft : PanelRight;

  return (
    <button
      type="button"
      onClick={() => togglePanel(side)}
      aria-pressed={showing}
      aria-label={`${showing ? "Hide" : "Show"} ${name}`}
      title={`${showing ? "Hide" : "Show"} the ${name}  ·  ⌘\\ for both`}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
        showing
          ? "text-fg-dim hover:bg-ink-hover hover:text-fg"
          : "bg-ink-hover text-fg-mute hover:text-fg"
      }`}
    >
      <Icon size={16} strokeWidth={showing ? 2 : 1.6} />
    </button>
  );
}

/** ⌘\ / Ctrl+\ — Figma's "get out of my way", and the fastest way back. */
function usePanelShortcut() {
  const toggleAllPanels = useDesignSystem((s) => s.toggleAllPanels);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "\\" || !(e.metaKey || e.ctrlKey)) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      toggleAllPanels();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleAllPanels]);
}

export function TopBar() {
  const name = useDesignSystem((s) => s.meta.name);
  const setSystemName = useDesignSystem((s) => s.setSystemName);
  const mode = useDesignSystem((s) => s.currentPreviewMode);
  const setPreviewMode = useDesignSystem((s) => s.setPreviewMode);
  const semantics = useDesignSystem((s) => s.semantics);
  const modeDefs = useMemo(() => modeDefsOf(semantics), [semantics]);
  const chromeTheme = useDesignSystem((s) => s.chromeTheme);
  const toggleChromeTheme = useDesignSystem((s) => s.toggleChromeTheme);
  const done = useDesignSystem((s) => s.journey.done);
  const goToStep = useDesignSystem((s) => s.goToStep);
  const activeProjectId = useDesignSystem((s) => s.activeProjectId);
  // Keyed by project id so a failed save on another file can't show — or get
  // silently "resolved" by retrying the wrong project — on this one.
  const saveStatus = useDesignSystem((s) => (activeProjectId ? s.saveStatus[activeProjectId] : undefined)) ?? "idle";
  const saveError = useDesignSystem((s) => (activeProjectId ? s.saveError[activeProjectId] : undefined)) ?? null;
  const setSaveStatus = useDesignSystem((s) => s.setSaveStatus);
  const [retrying, setRetrying] = useState(false);

  const setView = useDesignSystem((s) => s.setView);
  const setTutorialStep = useDesignSystem((s) => s.setTutorialStep);

  const readyToShip = STEP_ORDER.slice(0, -1).every((id) => done[id]);

  // A conflict means someone/something else already saved a newer version of
  // this file — resubmitting our stale copy would just fail the same way
  // again, so the only sound recovery is to reload and start from the
  // current version rather than "retry" the write that lost the race.
  const isConflict = !!saveError && saveError.startsWith("This file changed elsewhere");

  const retrySave = async () => {
    if (!activeProjectId || retrying) return;
    if (isConflict) {
      window.location.reload();
      return;
    }
    const cur = useDesignSystem.getState().projects[activeProjectId];
    if (!cur) return;
    setRetrying(true);
    setSaveStatus(activeProjectId, "saving");
    try {
      await db.saveProject(activeProjectId, cur.name, cur);
      setSaveStatus(activeProjectId, "saved");
    } catch (e: unknown) {
      setSaveStatus(activeProjectId, "error", e instanceof Error ? e.message : "Save failed");
    } finally {
      setRetrying(false);
    }
  };

  usePanelShortcut();

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line bg-ink pl-2.5 pr-2.5">
      {/* Left switch, over the left panel. */}
      <PanelToggle side="left" />
      <span className="h-5 w-px shrink-0 bg-line" aria-hidden />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setView("dashboard")}
          title="Back to Dashboard files"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-line text-fg-mute hover:text-fg transition-all text-xs font-bold"
        >
          <Folder size={13} className="text-indigo-400" />
          <span>Files</span>
        </button>
        
        <span className="text-fg-mute" aria-hidden>/</span>
        
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

      <div id="workspace-topbar-actions" className="ml-auto flex items-center gap-3">
        {saveStatus === "error" ? (
          <div
            className="flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-400"
            title={saveError ?? "Save failed"}
          >
            <AlertTriangle size={12} />
            <span>{isConflict ? "Changed elsewhere" : "Not saved"}</span>
            <button
              type="button"
              onClick={retrySave}
              disabled={retrying}
              className="ml-1 rounded border border-rose-500/40 px-1.5 py-0.5 text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
            >
              {isConflict ? "Reload" : retrying ? "Retrying…" : "Retry"}
            </button>
          </div>
        ) : (
          <span className="hidden text-[11px] text-fg-mute sm:block">
            {saveStatus === "saving" ? "Saving…" : "Autosaved"}
          </span>
        )}

        {/* Guided Tour Launcher */}
        <button
          type="button"
          onClick={() => setTutorialStep(0)}
          title="Start Guided Tour"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
        >
          <HelpCircle size={14} />
        </button>

        {/* Appearance: themes the tool chrome (distinct from the preview toggle) */}
        <button
          type="button"
          onClick={toggleChromeTheme}
          aria-label={`Appearance: ${chromeTheme}`}
          title={`Appearance — ${chromeTheme === "light" ? "Light" : "Dark"} · click to switch`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
        >
          {chromeTheme === "light" ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <span className="h-4 w-px bg-line" aria-hidden />

        {/* Preview: themes the component being designed, not the app */}
        <div className="flex items-center gap-2">
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.08em] text-fg-mute md:block">
            Preview
          </span>
          {/* Every mode the file has, not the two it used to be limited to. */}
          <Segmented
            options={modeDefs.map((m) => ({ label: m.name, value: m.id }))}
            value={mode}
            onChange={setPreviewMode}
          />
        </div>

        <button
          type="button"
          onClick={() => goToStep("ship")}
          className={`inline-flex h-8 items-center rounded-lg px-3.5 text-[12px] font-medium transition-colors ${
            readyToShip
              ? "bg-fg text-ink hover:opacity-90"
              : "border border-line text-fg-mute hover:border-line-strong hover:text-fg-dim"
          }`}
        >
          Ship
        </button>

        {/* Right switch, over the right panel. */}
        <span className="h-5 w-px shrink-0 bg-line" aria-hidden />
        <PanelToggle side="right" />
      </div>
    </header>
  );
}
