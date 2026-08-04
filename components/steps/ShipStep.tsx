"use client";

/**
 * Step 07 — Ship. Compiles the live tree into the Figma-Plugin-API bundle
 * and the engineering handoff docs. Copy or download either artifact.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Check, Copy, Download, Globe, Loader2 } from "lucide-react";
import { countTokens, useDesignSystem } from "@/store/useDesignSystem";
import { getPublication, publishSnapshot, unpublish, type PublishedRecord } from "@/lib/publish";
import { compileFigmaBundle } from "@/lib/figma";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import { WIRED_COMPONENTS } from "@/lib/componentSchema";
import { generateHandoffDocs } from "@/lib/docs";
import { compileCssVariables, compileMuiTheme, compileTailwindConfig } from "@/lib/adapters";
import { FIGMA_PLUGIN_NAME, FIGMA_PLUGIN_URL } from "@/lib/links";
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

/** Publish isn't a downloadable artifact — it's an action with its own surface. */
type Tab = Artifact | "publish";

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
  const [tab, setTab] = useState<Tab>(
    () => DESTINATION_TO_ARTIFACT[state.meta.engineeringDestination ?? ""] ?? "json"
  );
  const [copied, setCopied] = useState(false);
  const artifact: Artifact = tab === "publish" ? "json" : tab;

  const activeProjectId = state.activeProjectId;
  const project = activeProjectId ? state.projects[activeProjectId] : undefined;
  const [publication, setPublication] = useState<PublishedRecord | null>(null);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState<"public" | "sync" | null>(null);

  useEffect(() => {
    if (!activeProjectId) return;
    let active = true;
    getPublication(activeProjectId)
      .then((rec) => active && setPublication(rec))
      .catch((e) => active && setPublishError(e?.message ?? "Couldn't check publish status"));
    return () => {
      active = false;
    };
  }, [activeProjectId]);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const publicUrl = publication ? `${origin}/p/${publication.slug}` : null;
  /* The same slug, served as a compiled Figma bundle — what the plugin's Pull
   * field takes (app/api/figma/[slug]). Publishing is therefore the pull's
   * prerequisite: no slug, nothing to pull. */
  const syncUrl = publication ? `${origin}/api/figma/${publication.slug}` : null;

  const doPublish = async (): Promise<void> => {
    if (!project) return;
    setPublishBusy(true);
    setPublishError(null);
    try {
      setPublication(await publishSnapshot(project));
    } catch (e) {
      setPublishError((e as Error)?.message ?? "Publish failed");
    } finally {
      setPublishBusy(false);
    }
  };

  const doUnpublish = async (): Promise<void> => {
    if (!activeProjectId) return;
    setPublishBusy(true);
    setPublishError(null);
    try {
      await unpublish(activeProjectId);
      setPublication(null);
    } catch (e) {
      setPublishError((e as Error)?.message ?? "Couldn't unpublish");
    } finally {
      setPublishBusy(false);
    }
  };

  /** Copy one of the publish links, flagging which one so only it says "Copied". */
  const copyLink = async (key: "public" | "sync", text: string | null): Promise<void> => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setLinkCopied(key);
      setTimeout(() => setLinkCopied(null), 1500);
    } catch {
      // Clipboard unavailable — no-op.
    }
  };
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
              options={[
                ...(Object.keys(ARTIFACT_META) as Artifact[]).map((a) => ({
                  label: ARTIFACT_META[a].label,
                  value: a as Tab,
                })),
                { label: "Publish", value: "publish" as Tab },
              ]}
              value={tab}
              onChange={setTab}
            />
          </Field>

          {tab === "publish" && (
            <>
              <AsideDivider />
              <div className="mb-6 rounded-xl border border-line p-4">
                <p className="mb-3 text-[12px] font-medium text-fg-dim">
                  {publication ? "Live styleguide" : "Publish a styleguide"}
                </p>
                <p className="mb-3 text-[11px] leading-relaxed text-fg-mute">
                  {publication
                    ? "Anyone with this link can read the system — foundations, tokens, and every component with its usage docs. No account needed."
                    : "Publishes a frozen copy of this system to a shareable link. Later edits stay private until you republish."}
                </p>

                {publicUrl && (
                  <>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-mute">
                      Styleguide link
                    </p>
                    <button
                      type="button"
                      onClick={() => copyLink("public", publicUrl)}
                      title="Copy link"
                      className="mb-3 block w-full break-all rounded-lg border border-line bg-ink-panel px-2.5 py-2 text-left font-mono text-[11px] text-fg-dim transition-colors hover:border-line-strong hover:text-fg"
                    >
                      {linkCopied === "public" ? "Copied to clipboard" : publicUrl}
                    </button>

                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-fg-mute">
                      Figma sync link
                    </p>
                    <button
                      type="button"
                      onClick={() => copyLink("sync", syncUrl)}
                      title="Copy sync link"
                      className="mb-2 block w-full break-all rounded-lg border border-line bg-ink-panel px-2.5 py-2 text-left font-mono text-[11px] text-fg-dim transition-colors hover:border-line-strong hover:text-fg"
                    >
                      {linkCopied === "sync" ? "Copied to clipboard" : syncUrl}
                    </button>
                    <p className="mb-3 text-[11px] leading-relaxed text-fg-mute">
                      Paste this into the {FIGMA_PLUGIN_NAME} plugin&apos;s{" "}
                      <strong className="font-medium text-fg-dim">Pull</strong> field — no
                      more downloading and re-importing a file. Re-pull after any republish.
                    </p>
                  </>
                )}

                {publishError && (
                  <p className="mb-3 text-[11px] leading-relaxed text-rose-400">{publishError}</p>
                )}

                {!project && (
                  <p className="mb-3 text-[11px] leading-relaxed text-fg-mute">
                    Open a file from the dashboard to publish it.
                  </p>
                )}

                <div className="space-y-2">
                  <PrimaryButton full onClick={doPublish} disabled={publishBusy || !project}>
                    {publishBusy ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
                    {publication ? "Republish" : "Publish"}
                  </PrimaryButton>
                  {publication && (
                    <GhostButton full onClick={doUnpublish} disabled={publishBusy}>
                      Take offline
                    </GhostButton>
                  )}
                </div>
              </div>
            </>
          )}

          {tab === "json" && (
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

          {tab === "json" && (
            <>
              <AsideDivider />
              <div className="mb-6 rounded-xl border border-line p-4">
                <p className="mb-3 text-[12px] font-medium text-fg-dim">
                  Load this into Figma
                </p>
                <ol className="space-y-3">
                  {[
                    {
                      key: "install",
                      body: (
                        <>
                          Install the{" "}
                          <a
                            href={FIGMA_PLUGIN_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-fg-dim underline underline-offset-2 transition-colors hover:text-fg"
                          >
                            {FIGMA_PLUGIN_NAME}
                          </a>{" "}
                          plugin — free, one click, from the Figma Community.
                        </>
                      ),
                    },
                    { key: "download", body: "Download the file below, or copy it to your clipboard." },
                    { key: "run", body: "Open your Figma file and run the plugin." },
                    {
                      key: "import",
                      body: "Drop the file into its Import tab — or paste the JSON. (Published this system? Skip both: copy the Figma sync link from the Publish tab and pull it straight into the plugin.)",
                    },
                    {
                      key: "generate",
                      body: "Click “Sync Variables” for tokens only, or “Generate Design System File” for the full kit.",
                    },
                  ].map((step, i) => (
                    <li
                      key={step.key}
                      className="flex gap-2.5 text-[12px] leading-relaxed text-fg-mute"
                    >
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line-strong text-[10px] font-bold text-fg-dim">
                        {i + 1}
                      </span>
                      <span>{step.body}</span>
                    </li>
                  ))}
                </ol>
                <a
                  href={FIGMA_PLUGIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-[12px] font-medium text-fg-dim transition-colors hover:bg-ink-hover hover:text-fg"
                >
                  Get the plugin
                  <ArrowUpRight size={13} />
                </a>
              </div>
            </>
          )}

          {tab !== "publish" && (
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
          )}

          <AsideDivider />

          <AsideNote>
            {tab === "publish"
              ? "The published site is generated from the same token state as every other artifact here — there's no second copy to keep in sync, and nothing to hand-author."
              : artifact === "json"
              ? "The plugin builds a complete kit — Cover, Foundations, and one page per component with usage docs, variant grids, component properties, elevation effect styles, and token-bound layers. Re-running it after edits updates everything in place, so instances and overrides survive."
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
      {tab === "publish" ? (
        <CanvasSection
          title="Published styleguide"
          hint={publication ? "live — anyone with the link" : "not published yet"}
        >
          <div className="rounded-xl border border-line bg-ink-panel p-8">
            {publicUrl ? (
              <div className="space-y-4">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-[13px] text-fg-dim underline underline-offset-4 transition-colors hover:text-fg"
                >
                  {publicUrl}
                  <ArrowUpRight size={14} />
                </a>
                <p className="text-[12px] leading-relaxed text-fg-mute">
                  Last published{" "}
                  {publication ? new Date(publication.publishedAt).toLocaleString() : "—"}. The page
                  shows the system as it was at that moment — foundations, the full token set, and
                  every component with its usage documentation and lifecycle status.
                </p>
              </div>
            ) : (
              <p className="text-[13px] leading-relaxed text-fg-mute">
                Nothing published yet. Publishing mints a permanent link you can hand to a client or
                drop into a README — the same system this step exports, rendered as a browsable site
                instead of a file to download.
              </p>
            )}
          </div>
        </CanvasSection>
      ) : (
        <CanvasSection title={ARTIFACT_META[artifact].title} hint={ARTIFACT_META[artifact].hint}>
          <pre className="whitespace-pre-wrap break-words rounded-xl border border-line bg-ink-panel p-6 font-mono text-[12px] leading-relaxed text-fg-dim">
            {content}
          </pre>
        </CanvasSection>
      )}
    </StepScaffold>
  );
}
