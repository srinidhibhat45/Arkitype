"use client";

/**
 * A component's public page: the live thing, every state and variant, plus its
 * usage documentation. Read-only — no inspector, no store mutation.
 *
 * It reuses `renderHero` (the studio's pure render path) rather than
 * `ComponentStudioPreview`, whose toolbar is all edit affordances — reset,
 * zoom, and strip clicks that write to the store.
 */
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { renderHero } from "@/components/factory/ComponentStudio";
import {
  COMPONENT_SPECS,
  STATE_LABEL,
  previewAxis,
  resolveOptions,
  useComponentBindings,
  type CState,
} from "@/lib/componentSchema";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import { COMPONENT_DOCS } from "@/lib/componentDocs";
import { ThemeFrame } from "@/components/ui/ThemeFrame";
import { componentStatus, type PreviewMode } from "@/store/useDesignSystem";
import type { PublishedSnapshot } from "@/lib/publish";
import { StatusBadge } from "@/components/public/StatusBadge";
import { useSnapshotHydrated } from "@/components/public/SnapshotProvider";

function DocList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-fg-mute">
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="text-[13px] leading-relaxed text-fg-dim">
            — {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PublicComponentPage({
  snapshot,
  slug,
  componentId,
}: {
  snapshot: PublishedSnapshot;
  slug: string;
  componentId: string;
}) {
  const hydrated = useSnapshotHydrated(snapshot);
  const [mode, setMode] = useState<PreviewMode>("light");
  const resolve = useComponentBindings(componentId);

  const spec = COMPONENT_SPECS[componentId];
  const label =
    COMPONENT_LANES.flatMap((l) => l.items).find((i) => i.id === componentId)?.label ?? componentId;
  const doc = COMPONENT_DOCS[componentId];
  const cfg = snapshot.components[componentId];
  const status = componentStatus(cfg);

  const opts = resolveOptions(componentId, cfg?.properties);
  const radiusStep = Number(cfg?.properties?.radiusStep ?? 2);
  const axis = previewAxis(componentId);

  const hero = (
    state: CState,
    o: Record<string, string | boolean | number> = opts
  ) => renderHero(componentId, { state, size: "md", radiusStep, resolve, mode, opts: o });

  return (
    <div className="min-h-screen bg-ink text-fg">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href={`/p/${slug}`}
            className="flex min-w-0 items-center gap-2 text-[13px] text-fg-mute transition-colors hover:text-fg"
          >
            <ArrowLeft size={14} className="shrink-0" />
            <span className="truncate">{snapshot.name}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-line p-0.5">
            {(["light", "dark"] as PreviewMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md px-2.5 py-1 text-[12px] capitalize transition-colors ${
                  mode === m ? "bg-ink-raised text-fg" : "text-fg-mute hover:text-fg-dim"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-2 flex items-center gap-2.5">
          <h1 className="text-[24px] font-semibold tracking-tight">{label}</h1>
          <StatusBadge status={status} />
        </div>
        {doc ? (
          <p className="mb-8 max-w-2xl text-[14px] leading-relaxed text-fg-dim">{doc.description}</p>
        ) : null}

        {!spec ? (
          <p className="text-[13px] text-fg-mute">
            This component isn&apos;t part of the published system.
          </p>
        ) : !hydrated ? (
          // The previews render off the hydrated store, which only exists after
          // mount — hold the space so the docs below don't jump when it lands.
          <div className="h-[180px] animate-pulse rounded-xl border border-line bg-ink-panel" />
        ) : (
          <>
            <ThemeFrame
              mode={mode}
              primitives={snapshot.primitives}
              semantics={snapshot.semantics}
            >
              <div className="flex min-h-[180px] items-center justify-center p-10">
                {hero(spec.states[0] ?? "default")}
              </div>
            </ThemeFrame>

            {spec.states.length > 1 ? (
              <div className="mt-10">
                <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-fg-mute">
                  States
                </h2>
                <ThemeFrame
                  mode={mode}
                  primitives={snapshot.primitives}
                  semantics={snapshot.semantics}
                >
                  <div className="flex flex-wrap gap-8 p-8">
                    {spec.states.map((st) => (
                      <div key={st} className="flex flex-col items-center gap-2.5">
                        {hero(st)}
                        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-mute">
                          {STATE_LABEL[st]}
                        </span>
                      </div>
                    ))}
                  </div>
                </ThemeFrame>
              </div>
            ) : null}

            {axis?.options?.length ? (
              <div className="mt-10">
                <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-fg-mute">
                  {axis.label}
                </h2>
                <ThemeFrame
                  mode={mode}
                  primitives={snapshot.primitives}
                  semantics={snapshot.semantics}
                >
                  <div className="flex flex-wrap gap-8 p-8">
                    {axis.options.map((c) => (
                      <div key={c.value} className="flex flex-col items-center gap-2.5">
                        {hero(spec.states[0] ?? "default", { ...opts, [axis.key]: c.value })}
                        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-mute">
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </ThemeFrame>
              </div>
            ) : null}
          </>
        )}

        {doc ? (
          <div className="mt-12 grid gap-8 border-t border-line pt-10 sm:grid-cols-2">
            <DocList title="When to use" items={doc.whenToUse} />
            <DocList title="Do" items={doc.dos} />
            <DocList title="Don't" items={doc.donts} />
            <div>
              <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-fg-mute">
                Accessibility
              </h3>
              <p className="text-[13px] leading-relaxed text-fg-dim">{doc.a11y}</p>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
