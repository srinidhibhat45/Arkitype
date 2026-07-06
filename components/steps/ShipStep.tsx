"use client";

/**
 * Step 07 — Ship. Compiles the live tree into the Figma-Plugin-API bundle
 * and the engineering handoff docs. Copy or download either artifact.
 */
import { useMemo, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { countTokens, useDesignSystem } from "@/store/useDesignSystem";
import { compileFigmaBundle } from "@/lib/figma";
import { generateHandoffDocs } from "@/lib/docs";
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

type Artifact = "json" | "docs";

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

export function ShipStep() {
  const state = useDesignSystem();
  const [artifact, setArtifact] = useState<Artifact>("json");
  const [copied, setCopied] = useState(false);

  const bundle = useMemo(() => compileFigmaBundle(state), [state]);
  const json = useMemo(() => JSON.stringify(bundle, null, 2), [bundle]);
  const docs = useMemo(() => generateHandoffDocs(state), [state]);

  const content = artifact === "json" ? json : docs;
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
      title="Two artifacts, ready to hand off"
      lede="The Figma bundle matches the Plugin API's variable format — collections, modes, and semantic tokens alias-bound to primitives. The docs give engineers the consumption model, the contrast audit, and copy-paste CSS."
      aside={
        <>
          <Field label="Artifact">
            <Segmented
              options={[
                { label: "Figma JSON", value: "json" as const },
                { label: "Docs (MD)", value: "docs" as const },
              ]}
              value={artifact}
              onChange={setArtifact}
            />
          </Field>

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
                artifact === "json"
                  ? download(
                      `${fileBase}-variables.json`,
                      json,
                      "application/json"
                    )
                  : download(`${fileBase}-handoff.md`, docs, "text/markdown")
              }
            >
              <Download size={13} />
              Download {artifact === "json" ? ".json" : ".md"}
            </PrimaryButton>
          </div>

          <AsideDivider />

          <AsideNote>
            Semantic variables ship as VARIABLE_ALIAS bindings with resolved
            hex fallbacks, so the importing plugin can wire references or fall
            back to flat values.
          </AsideNote>
        </>
      }
    >
      <CanvasSection
        title={artifact === "json" ? "Figma variables bundle" : "Handoff document"}
        hint={artifact === "json" ? "figma.variables.* compatible" : "Markdown"}
      >
        <pre className="whitespace-pre-wrap break-words rounded-xl border border-line bg-ink-panel p-6 font-mono text-[12px] leading-relaxed text-fg-dim">
          {content}
        </pre>
      </CanvasSection>
    </StepScaffold>
  );
}
