"use client";

/**
 * The published styleguide's renderer. Every section here is *derived* from the
 * snapshot — there is no authored page content anywhere in this file, which is
 * the whole point: a published site can't drift from the system it documents
 * because there's no second copy to maintain.
 */
import { useState } from "react";
import Link from "next/link";
import { rampStepLabels } from "@/lib/color";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import { COMPONENT_DOCS } from "@/lib/componentDocs";
import { WIRED_COMPONENTS } from "@/lib/componentSchema";
import { resolveToken } from "@/lib/tokens";
import { generateTypeScale, STEP_DEFS } from "@/lib/typography";
import type { PublishedSnapshot } from "@/lib/publish";
import {
  RADII_NAMES,
  componentStatus,
  shadowToCss,
  type PreviewMode,
} from "@/store/useDesignSystem";
import { StatusBadge } from "@/components/public/StatusBadge";

function Section({
  id,
  title,
  lede,
  children,
}: {
  id: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line py-12">
      <h2 className="text-[19px] font-semibold tracking-tight text-fg">{title}</h2>
      {lede ? <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-fg-mute">{lede}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function PublicStyleguide({
  snapshot,
  slug,
}: {
  snapshot: PublishedSnapshot;
  slug: string;
}) {
  const [mode, setMode] = useState<PreviewMode>("light");
  const { primitives, semantics, components } = snapshot;
  const tokenState = { primitives, semantics };

  const typeSteps = generateTypeScale(
    primitives.typography.baseSize,
    primitives.typography.scaleFactor,
    {
      rounding: primitives.typography.rounding,
      sizeOverrides: primitives.typography.sizeOverrides,
      leadingOverrides: primitives.typography.leadingOverrides,
      stepAssign: primitives.typography.stepAssign,
    },
    primitives.typography.stepDefs ?? STEP_DEFS
  );

  const radiusNames = primitives.radiusNames ?? RADII_NAMES;
  const shadows = primitives.elevation[mode] ?? [];

  const lanes = COMPONENT_LANES.map((lane) => ({
    ...lane,
    items: lane.items.filter((i) => WIRED_COMPONENTS.has(i.id)),
  })).filter((l) => l.items.length > 0);

  const componentCount = lanes.reduce((n, l) => n + l.items.length, 0);

  return (
    <div className="min-h-screen bg-ink text-fg">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-semibold tracking-tight">{snapshot.name}</h1>
            <p className="text-[12px] text-fg-mute">Design system</p>
          </div>
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

      <main className="mx-auto max-w-5xl px-6 pb-24">
        <div className="py-12">
          <p className="max-w-2xl text-[14px] leading-relaxed text-fg-dim">
            Foundations, tokens and {componentCount} components — generated from the system itself,
            not written by hand.
          </p>
        </div>

        <Section
          id="colour"
          title="Colour"
          lede="Every ramp is generated from a single seed, with any hand-corrected swatch preserved."
        >
          <div className="space-y-6">
            {primitives.colorFamilies.map((family) => {
              const ramp = primitives.colors[family.id] ?? [];
              const labels = rampStepLabels(ramp.length);
              return (
                <div key={family.id}>
                  <div className="mb-2 flex items-baseline gap-2">
                    <h3 className="text-[13px] font-medium text-fg-dim">{family.name}</h3>
                    <span className="font-mono text-[11px] text-fg-mute">{family.id}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ramp.map((hex, i) => (
                      <div key={i} className="w-[74px]">
                        <div
                          className="h-12 rounded-md border border-line"
                          style={{ background: hex }}
                        />
                        <div className="mt-1 font-mono text-[10px] text-fg-mute">{labels[i]}</div>
                        <div className="font-mono text-[10px] uppercase text-fg-mute">{hex}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section
          id="roles"
          title="Semantic roles"
          lede="What UI code should reference. Primitives are an implementation detail; these roles carry the meaning and re-map per mode."
        >
          <div className="space-y-6">
            {semantics.groups.map((group) => (
              <div key={group.label}>
                <h3 className="mb-2 text-[13px] font-medium text-fg-dim">{group.label}</h3>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {group.tokens.map((token) => {
                    const hex = resolveToken(tokenState, mode, token);
                    return (
                      <div
                        key={token}
                        className="flex items-center gap-2.5 rounded-lg border border-line px-2.5 py-1.5"
                      >
                        <div
                          className="h-6 w-6 shrink-0 rounded border border-line"
                          style={{ background: hex }}
                        />
                        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-dim">
                          {token}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] uppercase text-fg-mute">
                          {hex}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="type" title="Typography" lede={`Base ${primitives.typography.baseSize}px · ratio ${primitives.typography.scaleFactor}`}>
          <div className="space-y-3">
            {typeSteps.map((step) => (
              <div key={step.name} className="flex items-baseline gap-4 border-b border-line pb-3">
                <span className="w-24 shrink-0 font-mono text-[11px] text-fg-mute">{step.name}</span>
                <span className="w-28 shrink-0 font-mono text-[11px] text-fg-mute">
                  {step.size}px / {step.lineHeight}
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-fg-dim"
                  style={{ fontSize: `${Math.min(step.size, 40)}px`, lineHeight: step.lineHeight }}
                >
                  The quick brown fox
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section id="space" title="Spacing" lede={`A ${primitives.spacingBase}px base, stepped.`}>
          <div className="flex flex-wrap gap-3">
            {primitives.spacing.map((px, i) => (
              <div key={i} className="rounded-lg border border-line p-2.5">
                <div className="mb-1.5 h-2 rounded-sm bg-fg-mute" style={{ width: Math.max(px, 2) }} />
                <div className="font-mono text-[10px] text-fg-mute">
                  {i + 1} · {px}px
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="shape" title="Shape & elevation">
          <div className="mb-8 flex flex-wrap gap-3">
            {primitives.radii.map((px, i) => (
              <div key={i} className="text-center">
                <div
                  className="h-14 w-14 border border-line bg-ink-panel"
                  style={{ borderRadius: px }}
                />
                <div className="mt-1 font-mono text-[10px] text-fg-mute">
                  {radiusNames[i] ?? i} · {px}px
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-4">
            {shadows.map((def) => (
              <div key={def.name} className="text-center">
                <div
                  className="h-14 w-24 rounded-lg border border-line bg-ink-panel"
                  style={{ boxShadow: shadowToCss(def) }}
                />
                <div className="mt-1.5 font-mono text-[10px] text-fg-mute">{def.name}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="motion" title="Motion">
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(primitives.motion.durations).map(([name, ms]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border border-line px-3 py-2"
              >
                <span className="font-mono text-[11px] text-fg-dim">{name}</span>
                <span className="font-mono text-[11px] text-fg-mute">{ms}ms</span>
              </div>
            ))}
            {primitives.motion.easings.map((e) => (
              <div
                key={e.name}
                className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"
              >
                <span className="shrink-0 font-mono text-[11px] text-fg-dim">{e.name}</span>
                <span className="min-w-0 truncate font-mono text-[10px] text-fg-mute">{e.value}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          id="components"
          title="Components"
          lede="Each one reads roles and scales exclusively — change a mapping and every component follows."
        >
          <div className="space-y-8">
            {lanes.map((lane) => (
              <div key={lane.id}>
                <h3 className="mb-1 text-[13px] font-medium text-fg-dim">{lane.label}</h3>
                <p className="mb-3 max-w-2xl text-[12px] leading-relaxed text-fg-mute">{lane.note}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {lane.items.map((item) => {
                    const doc = COMPONENT_DOCS[item.id];
                    const status = componentStatus(components[item.id]);
                    return (
                      <Link
                        key={item.id}
                        href={`/p/${slug}/components/${item.id}`}
                        className="group rounded-xl border border-line p-3.5 transition-colors hover:border-line-strong"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-[13px] font-medium text-fg-dim group-hover:text-fg">
                            {item.label}
                          </span>
                          <StatusBadge status={status} />
                        </div>
                        {doc ? (
                          <p className="line-clamp-2 text-[12px] leading-relaxed text-fg-mute">
                            {doc.description}
                          </p>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-[12px] text-fg-mute">
            Published with{" "}
            <a href="/" className="underline underline-offset-2 hover:text-fg-dim">
              Arkitype
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
