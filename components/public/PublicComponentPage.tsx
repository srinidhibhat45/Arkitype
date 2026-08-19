"use client";

/**
 * A component's public page: the live thing, every state and variant, plus its
 * usage documentation. Read-only — no inspector, no store mutation.
 *
 * It reuses `renderHero` (the studio's pure render path) rather than
 * `ComponentStudioPreview`, whose toolbar is all edit affordances — reset,
 * zoom, and strip clicks that write to the store.
 *
 * ── Why previews get a *stage* ─────────────────────────────────────────────
 *
 * The variant and state grids used to be a `flex flex-wrap` row of bare heroes.
 * That is fine for a button and catastrophic for anything that sizes itself
 * against its container: Modal, Table and Tabs are `width/height: 100%` scenes
 * and Navbar/Drawer are full-width bars, so as flex siblings they collapsed to
 * unreadable slivers — four modal skeletons rendered as four vertical slots of
 * overlapping text. `lib/previewStage.ts` declares what each of those needs and
 * `Stage` below gives it a container with real dimensions.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { renderHero, useLiveHeroInteraction } from "@/components/factory/ComponentStudio";
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
import { stageFor } from "@/lib/previewStage";
import { ThemeFrame } from "@/components/ui/ThemeFrame";
import { componentStatus } from "@/store/useDesignSystem";
import type { PublishedSnapshot } from "@/lib/publish";
import { StatusBadge } from "@/components/public/StatusBadge";
import { activeTemplateId, getTemplate } from "@/lib/componentTemplates";
import { useSnapshotHydrated } from "@/components/public/SnapshotProvider";
import { ModeSwitch, PublicPage, usePublicTheme } from "@/components/public/PublicChrome";

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

function GridHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-fg-mute">
      {children}
    </h2>
  );
}

/**
 * One preview cell. `stage` is the component's declared layout contract: a
 * definite min-width (so `width: 100%` children have something to resolve
 * against) and, for full-bleed scenes, a definite height to paint into.
 *
 * The cell scrolls rather than clipping — a preview that doesn't fit the
 * reader's viewport is still a preview; one cropped by `overflow: hidden`
 * isn't.
 */
function Stage({
  componentId,
  label,
  children,
  interactive,
}: {
  componentId: string;
  label?: string;
  children: ReactNode;
  interactive?: Record<string, unknown>;
}) {
  const stage = stageFor(componentId);
  return (
    <div className={stage?.solo ? "w-full" : undefined}>
      {/* The scroll container is the OUTER box and it is never wider than the
       *  page. The min-width lives on the child, so a 600px-wide scene on a
       *  375px phone scrolls sideways inside its own card instead of being
       *  clipped by the frame — and the page body never scrolls sideways. */}
      <div className="w-full overflow-x-auto" {...interactive}>
        <div
          className="mx-auto flex items-center justify-center p-6"
          style={{
            minWidth: stage?.minWidth,
            minHeight: stage?.height || 120,
          }}
        >
          <div
            style={{
              width: stage ? "100%" : undefined,
              // A scene positions its surface absolutely and so contributes no
              // height of its own — it gets one here or it paints into nothing.
              height: stage?.height ? stage.height - 48 : undefined,
            }}
            className={stage ? "flex items-center justify-center" : undefined}
          >
            {children}
          </div>
        </div>
      </div>
      {label ? (
        <div className="pb-4 text-center font-mono text-[10px] uppercase tracking-wider text-fg-mute">
          {label}
        </div>
      ) : null}
    </div>
  );
}

/** The wrapper a set of preview cells sits in: a row for shrink-wrapping
 *  components, a stack for the ones that need the full width each. */
function StageGrid({ componentId, children }: { componentId: string; children: ReactNode }) {
  const stage = stageFor(componentId);
  return (
    <div
      className={
        stage?.solo
          ? "flex flex-col divide-y divide-line"
          : "flex flex-wrap items-start justify-start gap-2 p-2"
      }
    >
      {children}
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
  const theme = usePublicTheme(snapshot.semantics, snapshot.primitives);
  const mode = theme.mode;
  const resolve = useComponentBindings(componentId);

  const spec = COMPONENT_SPECS[componentId];
  const label =
    COMPONENT_LANES.flatMap((l) => l.items).find((i) => i.id === componentId)?.label ?? componentId;
  const doc = COMPONENT_DOCS[componentId];
  const cfg = snapshot.components[componentId];
  const status = componentStatus(cfg);
  // The preview below already renders in whichever template the file chose; say
  // which one, so a reader can tell "this is shaped like Carbon" from "someone
  // set a small radius". Silent for the default — there'd be nothing to learn.
  const templateId = activeTemplateId(componentId, cfg?.properties);
  const template = templateId === "arkitype" ? null : getTemplate(componentId, templateId);

  const opts = resolveOptions(componentId, cfg?.properties);
  const radiusStep = Number(cfg?.properties?.radiusStep ?? 2);
  const axis = previewAxis(componentId);

  const hero = (
    state: CState,
    o: Record<string, string | boolean | number> = opts
  ) => renderHero(componentId, { state, size: "md", radiusStep, resolve, mode, opts: o });

  // Same real hover/press/focus (and, for checkbox/radio/switch, click-to-toggle)
  // as the Studio's own canvas — a published spec page is exactly where someone
  // would want to try a component for real, not just read a static swatch.
  const { toggleKey, effectiveStateFor, liveHandlers, heroOptsWithToggle, toggleLive } =
    useLiveHeroInteraction(componentId);
  const multiState = spec ? spec.states.length > 1 : false;
  const showLiveHint = multiState || !!toggleKey;
  const stage = stageFor(componentId);

  return (
    <PublicPage>
      <header className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href={`/p/${slug}#components`}
            className="flex min-w-0 items-center gap-2 text-[13px] text-fg-mute transition-colors hover:text-fg"
          >
            <ArrowLeft size={14} className="shrink-0" />
            <span className="truncate">{snapshot.name}</span>
          </Link>
          <ModeSwitch
            theme={theme}
            semantics={snapshot.semantics}
            primitives={snapshot.primitives}
          />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-2 flex flex-wrap items-center gap-2.5">
          <h1 className="text-[24px] font-semibold tracking-tight">{label}</h1>
          <StatusBadge status={status} />
          {template ? (
            <span
              title={`${template.description} (${template.source})`}
              className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-fg-mute"
            >
              {template.name}
            </span>
          ) : null}
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
          <div
            className="animate-pulse rounded-xl border border-line bg-ink-panel"
            style={{ height: stage?.height || 180 }}
          />
        ) : (
          <>
            <ThemeFrame
              mode={mode}
              primitives={snapshot.primitives}
              semantics={snapshot.semantics}
            >
              <Stage
                componentId={componentId}
                interactive={{
                  role: toggleKey ? "button" : undefined,
                  onClick: toggleKey ? () => toggleLive(opts) : undefined,
                  style: toggleKey ? { cursor: "pointer" } : undefined,
                  ...liveHandlers("single"),
                }}
              >
                {hero(
                  effectiveStateFor(spec.states[0] ?? "default", "single"),
                  heroOptsWithToggle(opts)
                )}
              </Stage>
            </ThemeFrame>
            {showLiveHint ? (
              <p className="mt-2 text-center text-[11px] text-fg-mute">
                {toggleKey
                  ? "Hover, press or tab into it above — click to toggle it on/off"
                  : "Hover, press or tab into it above to try the real interaction"}
              </p>
            ) : null}

            {spec.states.length > 1 ? (
              <div className="mt-10">
                <GridHeading>States</GridHeading>
                <ThemeFrame
                  mode={mode}
                  primitives={snapshot.primitives}
                  semantics={snapshot.semantics}
                >
                  <StageGrid componentId={componentId}>
                    {spec.states.map((st) => (
                      <Stage key={st} componentId={componentId} label={STATE_LABEL[st]}>
                        {hero(st)}
                      </Stage>
                    ))}
                  </StageGrid>
                </ThemeFrame>
              </div>
            ) : null}

            {axis?.options?.length ? (
              <div className="mt-10">
                <GridHeading>{axis.label}</GridHeading>
                <ThemeFrame
                  mode={mode}
                  primitives={snapshot.primitives}
                  semantics={snapshot.semantics}
                >
                  <StageGrid componentId={componentId}>
                    {axis.options.map((c) => (
                      <Stage key={c.value} componentId={componentId} label={c.label}>
                        {hero(spec.states[0] ?? "default", { ...opts, [axis.key]: c.value })}
                      </Stage>
                    ))}
                  </StageGrid>
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
    </PublicPage>
  );
}
