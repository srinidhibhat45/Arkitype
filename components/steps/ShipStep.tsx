"use client";

/**
 * Step 07 — Ship. Compiles the live tree into the Figma-Plugin-API bundle
 * and the engineering handoff docs. Copy or download either artifact.
 */
import { useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { countTokens, useDesignSystem } from "@/store/useDesignSystem";
import { compileFigmaBundle } from "@/lib/figma";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import { WIRED_COMPONENTS } from "@/lib/componentSchema";
import { generateHandoffDocs } from "@/lib/docs";
import { compileCssVariables, compileMuiTheme, compileTailwindConfig } from "@/lib/adapters";
import {
  AsideDivider,
  AsideNote,
  CanvasSection,
  Field,
  GhostButton,
  PrimaryButton,
  Segmented,
} from "@/components/ui/controls";
import { StepScaffold } from "@/components/shell/StepScaffold";

type Artifact = "json" | "docs" | "css" | "tailwind" | "mui";

const ARTIFACT_META: Record<
  Artifact,
  { label: string; title: string; hint: string; filename: (base: string) => string; mime: string }
> = {
  json: {
    label: "Figma kit",
    title: "Figma design-system bundle",
    hint: "variables + components + docs pages",
    filename: (b) => `${b}-design-system.json`,
    mime: "application/json",
  },
  docs: {
    label: "Docs (MD)",
    title: "Handoff document",
    hint: "Markdown",
    filename: (b) => `${b}-handoff.md`,
    mime: "text/markdown",
  },
  css: {
    label: "CSS vars",
    title: "CSS custom properties",
    hint: ":root + .dark, drop-in",
    filename: (b) => `${b}-tokens.css`,
    mime: "text/css",
  },
  tailwind: {
    label: "Tailwind",
    title: "tailwind.config.js",
    hint: "colors/spacing/radius/type/shadow/motion",
    filename: () => "tailwind.config.js",
    mime: "text/javascript",
  },
  mui: {
    label: "MUI theme",
    title: "MUI createTheme() sources",
    hint: "light + dark, resolved values",
    filename: () => "arkitype-theme.ts",
    mime: "text/typescript",
  },
};

function download(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** The init wizard's engineering destination → the export tab that opens first. */
const DESTINATION_TO_ARTIFACT: Record<string, Artifact> = {
  tailwind: "tailwind",
  mui: "mui",
  css: "css",
  swiftui: "docs", // no SwiftUI adapter yet (Phase 3) — the handoff doc is the closest fit
};

/** Wired components grouped by lane — the pickable kit contents. */
const PICKER_LANES = COMPONENT_LANES.map((lane) => ({
  id: lane.id,
  label: lane.label,
  items: lane.items.filter((i) => WIRED_COMPONENTS.has(i.id)),
})).filter((lane) => lane.items.length > 0);

const ALL_WIRED_IDS = PICKER_LANES.flatMap((l) => l.items.map((i) => i.id));

export function ShipStep() {
  const state = useDesignSystem();
  const [artifact, setArtifact] = useState<Artifact>(
    () => DESTINATION_TO_ARTIFACT[state.meta.engineeringDestination ?? ""] ?? "json"
  );
  const [copied, setCopied] = useState(false);
  // Components excluded from the Figma kit export (empty = ship everything).
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());

  const toggleComponent = (id: string): void => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setLane = (laneId: string, include: boolean): void => {
    const laneIds = PICKER_LANES.find((l) => l.id === laneId)?.items.map((i) => i.id) ?? [];
    setExcluded((prev) => {
      const next = new Set(prev);
      laneIds.forEach((id) => (include ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const includedIds = useMemo(
    () => ALL_WIRED_IDS.filter((id) => !excluded.has(id)),
    [excluded]
  );

  const bundle = useMemo(
    () => compileFigmaBundle(state, { includeComponents: includedIds }),
    [state, includedIds]
  );
  const json = useMemo(() => JSON.stringify(bundle, null, 2), [bundle]);
  const docs = useMemo(() => generateHandoffDocs(state), [state]);
  const css = useMemo(() => compileCssVariables(state), [state]);
  const tailwind = useMemo(() => compileTailwindConfig(state), [state]);
  const mui = useMemo(() => compileMuiTheme(state), [state]);

  const contentByArtifact: Record<Artifact, string> = { json, docs, css, tailwind, mui };
  const content = contentByArtifact[artifact];
  const variableCount = bundle.collections.reduce(
    (sum, c) => sum + c.variables.length,
    0
  );
  const tokenCount = countTokens(state);
  const fileBase = state.meta.name
    ? state.meta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : "arkitype";

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — no-op.
    }
  };

  return (
    <StepScaffold
      step="ship"
      title="Five artifacts, ready to hand off"
      lede="The Figma bundle matches the Plugin API's variable format. The docs give engineers the consumption model, the contrast audit, and copy-paste CSS. CSS vars, Tailwind config, and MUI theme sources turn the same tokens into a running framework config, not just a spec to re-type."
      aside={
        <>
          <Field label="Artifact">
            <Segmented
              options={(Object.keys(ARTIFACT_META) as Artifact[]).map((a) => ({
                label: ARTIFACT_META[a].label,
                value: a,
              }))}
              value={artifact}
              onChange={setArtifact}
            />
          </Field>

          {artifact === "json" && (
            <>
              <AsideDivider />
              <div className="mb-6 rounded-xl border border-line p-4">
                <div className="mb-1 flex items-baseline justify-between">
                  <p className="text-[12px] font-medium text-fg-dim">Kit components</p>
                  <span className="font-mono text-[11px] text-fg-mute">
                    {includedIds.length}/{ALL_WIRED_IDS.length}
                  </span>
                </div>
                <p className="mb-3 text-[11px] leading-relaxed text-fg-mute">
                  Untick anything you don&apos;t want in the Figma kit. Each included
                  component gets its own page.
                </p>
                <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                  {PICKER_LANES.map((lane) => {
                    const laneIncluded = lane.items.filter((i) => !excluded.has(i.id)).length;
                    const allOn = laneIncluded === lane.items.length;
                    return (
                      <div key={lane.id}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-mute">
                            {lane.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => setLane(lane.id, !allOn)}
                            className="text-[10px] text-fg-mute underline-offset-2 hover:text-fg-dim hover:underline"
                          >
                            {allOn ? "None" : "All"}
                          </button>
                        </div>
                        <div className="space-y-0.5">
                          {lane.items.map((item) => (
                            <label
                              key={item.id}
                              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[12px] text-fg-dim hover:bg-ink-panel"
                            >
                              <input
                                type="checkbox"
                                checked={!excluded.has(item.id)}
                                onChange={() => toggleComponent(item.id)}
                                className="h-3 w-3 accent-current"
                              />
                              {item.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <AsideDivider />

          <div className="mb-6 rounded-xl border border-line p-4">
            <p className="mb-3 text-[12px] font-medium text-fg-dim">
              Bundle trace
            </p>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-fg-mute">System</span>
                <span className="text-fg-dim">{state.meta.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-mute">Tokens</span>
                <span className="font-mono text-fg-dim">{tokenCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-mute">Figma variables</span>
                <span className="font-mono text-fg-dim">{variableCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-mute">Collections</span>
                <span className="font-mono text-fg-dim">
                  {bundle.collections.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-mute">Components</span>
                <span className="font-mono text-fg-dim">
                  {bundle.components.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-mute">Figma pages</span>
                <span className="font-mono text-fg-dim">
                  {bundle.structure.pages.length + 8}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-mute">Modes</span>
                <span className="text-fg-dim">Light · Dark</span>
              </div>
              <div className="flex justify-between">
                <span className="text-fg-mute">Payload</span>
                <span className="font-mono text-fg-dim">
                  {(json.length / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <GhostButton full onClick={copy}>
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy size={13} /> Copy to clipboard
                </>
              )}
            </GhostButton>
            <PrimaryButton
              full
              onClick={() =>
                download(ARTIFACT_META[artifact].filename(fileBase), content, ARTIFACT_META[artifact].mime)
              }
            >
              <Download size={13} />
              Download {ARTIFACT_META[artifact].filename(fileBase).split(".").pop()}
            </PrimaryButton>
          </div>

          <AsideDivider />

          <AsideNote>
            {artifact === "json"
              ? "Feed this to the Arkitype Figma plugin: it builds a complete kit — Cover, Foundations, and one page per component with usage docs, variant grids, component properties, elevation effect styles, and token-bound layers. Re-running it updates everything in place."
              : artifact === "tailwind"
                ? "Colours/scales reference the --ark-* CSS variables — download the CSS vars artifact too and import it once, globally."
                : artifact === "mui"
                  ? "Palette/spacing/shape/typography are resolved to concrete values; MUI's shadow elevation is left at its default rather than a wrong-length override."
                  : artifact === "css"
                    ? "Drop-in :root + .dark custom properties — the same variables every Arkitype preview frame renders from."
                    : "The consumption model, the contrast audit, and copy-paste CSS."}
          </AsideNote>
        </>
      }
    >
      <CanvasSection title={ARTIFACT_META[artifact].title} hint={ARTIFACT_META[artifact].hint}>
        <pre className="whitespace-pre-wrap break-words rounded-xl border border-line bg-ink-panel p-6 font-mono text-[12px] leading-relaxed text-fg-dim">
          {content}
        </pre>
      </CanvasSection>
    </StepScaffold>
  );
}
