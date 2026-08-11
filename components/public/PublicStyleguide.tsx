"use client";

/**
 * The published styleguide's renderer. Every section here is *derived* from the
 * snapshot — there is no authored page content anywhere in this file, which is
 * the whole point: a published site can't drift from the system it documents
 * because there's no second copy to maintain.
 *
 * It is split into the builder's own sections (see PublicNav) rather than one
 * continuous scroll, so a reader can go straight to colour, or type, or the
 * component library, instead of finding it.
 */
import Link from "next/link";
import { rampStepLabels } from "@/lib/color";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import { COMPONENT_DOCS } from "@/lib/componentDocs";
import { WIRED_COMPONENTS } from "@/lib/componentSchema";
import { describeTokenValue, resolveToken, tokenKind } from "@/lib/tokens";
import { generateTypeScale, STEP_DEFS } from "@/lib/typography";
import type { PublishedSnapshot } from "@/lib/publish";
import {
  RADII_NAMES,
  componentStatus,
  elevationOf,
  shadowToCss,
  type PreviewMode,
  type ProjectState,
} from "@/store/useDesignSystem";
import { KIND_LABEL, KindIcon } from "@/components/variables/VariableBits";
import { StatusBadge } from "@/components/public/StatusBadge";
import {
  ModeSwitch,
  PublicPage,
  usePublicTheme,
  type PublicTheme,
} from "@/components/public/PublicChrome";
import {
  PUBLIC_SECTIONS,
  SectionNav,
  useSectionRoute,
  type PublicSectionId,
} from "@/components/public/PublicNav";

type Primitives = ProjectState["primitives"];
type Semantics = ProjectState["semantics"];

/* ── section chrome ── */

function SectionHeader({ title, lede }: { title: string; lede: string }) {
  return (
    <header className="mb-8">
      <h2 className="text-[24px] font-semibold tracking-tight text-fg">{title}</h2>
      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-fg-mute">{lede}</p>
    </header>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-fg-dim">
          {title}
        </h3>
        {hint ? <span className="font-mono text-[11px] text-fg-mute">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

/* ── Colour ── */

function ColourSection({ primitives }: { primitives: Primitives }) {
  return (
    <>
      <SectionHeader
        title="Colour"
        lede="The palette primitives. Every ramp is generated from a single seed, with any hand-corrected swatch preserved. UI should reference the semantic roles rather than these steps directly."
      />
      {primitives.colorFamilies.map((family) => {
        const ramp = primitives.colors[family.id] ?? [];
        const labels = rampStepLabels(ramp.length);
        return (
          <Block key={family.id} title={family.name} hint={family.id}>
            <div className="flex flex-wrap gap-1.5">
              {ramp.map((hex, i) => (
                <div key={i} className="w-[78px]">
                  <div
                    className="h-14 rounded-lg border border-line"
                    style={{ background: hex }}
                  />
                  <div className="mt-1.5 font-mono text-[10px] text-fg-dim">{labels[i]}</div>
                  <div className="font-mono text-[10px] uppercase text-fg-mute">{hex}</div>
                </div>
              ))}
            </div>
          </Block>
        );
      })}
    </>
  );
}

/* ── Roles ── */

/**
 * One semantic token, in one mode.
 *
 * A token doesn't have to carry a colour. `button-radius` carries a radius,
 * `card-padding` a spacing step — and resolving those *as colours* is what put
 * a row of `#FF00FF` swatches (the pipeline's deliberate "broken reference"
 * magenta) on every published page. Ask what the token carries first, then
 * render it the way that kind is legible: a swatch and a hex for colour, the
 * type mark and the value it works out to for everything else.
 */
function RoleRow({
  token,
  mode,
  state,
  semantics,
}: {
  token: string;
  mode: PreviewMode;
  state: { primitives: Primitives; semantics: Semantics };
  semantics: Semantics;
}) {
  const kind = tokenKind({ semantics }, token);
  const raw = semantics.modes[mode]?.[token] ?? "";

  if (kind !== "color") {
    const described = describeTokenValue(state.primitives, raw);
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-line px-2.5 py-2">
        <span
          title={`${KIND_LABEL[kind]} — points at the ${kind} scale`}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line bg-ink-panel"
        >
          <KindIcon kind={kind} size={12} />
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-dim">{token}</span>
        <span className="shrink-0 font-mono text-[10px] text-fg-mute">
          {described || raw || "—"}
        </span>
      </div>
    );
  }

  const hex = resolveToken(state, mode, token);
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-line px-2.5 py-2">
      <span
        className="h-6 w-6 shrink-0 rounded border border-line"
        style={{
          backgroundImage:
            "linear-gradient(45deg,#8883 25%,transparent 25%,transparent 75%,#8883 75%),linear-gradient(45deg,#8883 25%,transparent 25%,transparent 75%,#8883 75%)",
          backgroundSize: "8px 8px",
          backgroundPosition: "0 0,4px 4px",
        }}
      >
        <span className="block h-full w-full rounded-[3px]" style={{ background: hex }} />
      </span>
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-dim">{token}</span>
      <span className="shrink-0 font-mono text-[10px] uppercase text-fg-mute">{hex}</span>
    </div>
  );
}

function RolesSection({
  primitives,
  semantics,
  mode,
}: {
  primitives: Primitives;
  semantics: Semantics;
  mode: PreviewMode;
}) {
  const state = { primitives, semantics };
  return (
    <>
      <SectionHeader
        title="Semantic roles"
        lede="What UI code should reference. Primitives are an implementation detail; these roles carry the meaning and re-map per mode. Showing the values for the mode selected above."
      />
      {semantics.groups.map((group) => (
        <Block key={group.label} title={group.label} hint={`${group.tokens.length}`}>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {group.tokens.map((token) => (
              <RoleRow
                key={token}
                token={token}
                mode={mode}
                state={state}
                semantics={semantics}
              />
            ))}
          </div>
        </Block>
      ))}
    </>
  );
}

/* ── Typography ── */

function TypeSection({ primitives }: { primitives: Primitives }) {
  const t = primitives.typography;
  const steps = generateTypeScale(
    t.baseSize,
    t.scaleFactor,
    {
      rounding: t.rounding,
      sizeOverrides: t.sizeOverrides,
      leadingOverrides: t.leadingOverrides,
      stepAssign: t.stepAssign,
    },
    t.stepDefs ?? STEP_DEFS
  );

  const roles = Object.entries(t.fontRoles ?? {});

  return (
    <>
      <SectionHeader
        title="Typography"
        lede={`A modular scale on a ${t.baseSize}px base at a ${t.scaleFactor} ratio, plus the font roles and weights every text token references.`}
      />

      <Block title="Font roles" hint={`${roles.length}`}>
        <div className="space-y-2">
          {roles.map(([role, def]) => (
            <div
              key={role}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-line px-3.5 py-3"
            >
              <span className="w-20 shrink-0 font-mono text-[11px] text-fg-mute">{role}</span>
              <span
                className="min-w-0 flex-1 truncate text-[20px] text-fg-dim"
                style={{ fontFamily: def.family, fontWeight: weightValue(t, def.weight) }}
              >
                {def.family.split(",")[0].replace(/['"]/g, "")}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-fg-mute">
                {def.weight} · {weightValue(t, def.weight)}
              </span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Weights" hint={`${t.weights.length}`}>
        <div className="flex flex-wrap gap-2">
          {t.weights.map((w) => (
            <div key={w.name} className="rounded-lg border border-line px-3.5 py-2.5">
              <div className="text-[17px] text-fg-dim" style={{ fontWeight: w.value }}>
                Ag
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-fg-mute">
                {w.name} · {w.value}
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Scale" hint={`${steps.length} steps`}>
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.name}
              className="flex items-baseline gap-4 border-b border-line pb-3"
            >
              <span className="w-20 shrink-0 font-mono text-[11px] text-fg-mute">{step.name}</span>
              <span className="w-28 shrink-0 font-mono text-[11px] text-fg-mute">
                {step.size}px / {step.lineHeight}
              </span>
              <span
                className="min-w-0 flex-1 truncate text-fg-dim"
                style={{ fontSize: `${Math.min(step.size, 44)}px`, lineHeight: step.lineHeight }}
              >
                The quick brown fox
              </span>
            </div>
          ))}
        </div>
      </Block>
    </>
  );
}

const weightValue = (t: Primitives["typography"], name: string): number =>
  t.weights.find((w) => w.name === name)?.value ?? 400;

/* ── Spacing ── */

function SpaceSection({ primitives }: { primitives: Primitives }) {
  // Ascending, not object-key order — a breakpoint table that reads
  // lg / md / sm / xl is a table you have to re-sort in your head.
  const breakpoints = Object.entries(primitives.layout?.breakpoints ?? {}).sort(
    (a, b) => a[1] - b[1]
  );
  return (
    <>
      <SectionHeader
        title="Spacing & layout"
        lede={`A ${primitives.spacingBase}px base, stepped. Every gap and padding binding in the library names a step on this scale rather than a pixel value.`}
      />

      <Block title="Scale" hint={`${primitives.spacing.length} steps`}>
        <div className="space-y-1.5">
          {primitives.spacing.map((px, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="w-16 shrink-0 font-mono text-[11px] text-fg-mute">{i + 1}</span>
              <span className="w-14 shrink-0 font-mono text-[11px] text-fg-dim">{px}px</span>
              <span
                className="h-3 rounded-sm bg-fg-mute"
                style={{ width: Math.max(px, 2) }}
              />
            </div>
          ))}
        </div>
      </Block>

      {breakpoints.length ? (
        <Block title="Breakpoints" hint={`${breakpoints.length}`}>
          <div className="grid gap-2 sm:grid-cols-2">
            {breakpoints.map(([name, px]) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5"
              >
                <span className="font-mono text-[11px] text-fg-dim">{name}</span>
                <span className="font-mono text-[11px] text-fg-mute">≥ {px}px</span>
              </div>
            ))}
          </div>
        </Block>
      ) : null}
    </>
  );
}

/* ── Shape & elevation ── */

function ShapeSection({
  primitives,
  semantics,
  mode,
}: {
  primitives: Primitives;
  semantics: Semantics;
  mode: PreviewMode;
}) {
  const radiusNames = primitives.radiusNames ?? RADII_NAMES;
  // Every mode owns its ramp; one that hasn't been given its own reads the one
  // matching how it presents.
  const shadows = elevationOf(primitives, semantics, mode);

  return (
    <>
      <SectionHeader
        title="Shape & elevation"
        lede="Corner radii and the elevation ramp. Shadows are shown for the selected mode — a dark mode usually needs a different ramp to read as depth at all."
      />

      <Block title="Radius" hint={`${primitives.radii.length} steps`}>
        <div className="flex flex-wrap gap-3">
          {primitives.radii.map((px, i) => (
            <div key={i} className="text-center">
              <div
                className="h-16 w-16 border border-line-strong bg-ink-panel"
                style={{ borderRadius: px }}
              />
              <div className="mt-1.5 font-mono text-[10px] text-fg-dim">{radiusNames[i] ?? i}</div>
              <div className="font-mono text-[10px] text-fg-mute">
                {px >= 9999 ? "full" : `${px}px`}
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Elevation" hint={`${shadows.length} levels`}>
        <div className="flex flex-wrap gap-5">
          {shadows.map((def) => (
            <div key={def.name} className="text-center">
              <div
                className="h-16 w-28 rounded-lg border border-line bg-ink-raised"
                style={{ boxShadow: shadowToCss(def) }}
              />
              <div className="mt-2 font-mono text-[10px] text-fg-dim">{def.name}</div>
            </div>
          ))}
        </div>
      </Block>
    </>
  );
}

/* ── Motion ── */

function MotionSection({ primitives }: { primitives: Primitives }) {
  // Fastest first. A duration scale is ordered by definition; object-key order
  // is not that order.
  const durations = Object.entries(primitives.motion.durations).sort((a, b) => a[1] - b[1]);
  const slowest = durations.length ? durations[durations.length - 1][1] : 1;

  return (
    <>
      <SectionHeader
        title="Motion"
        lede="Durations and easing curves. Transitions in the library reference these by name, so retuning the system's feel is one edit rather than a search for every hardcoded 200ms."
      />

      <Block title="Durations" hint={`${durations.length}`}>
        <div className="grid gap-2 sm:grid-cols-2">
          {durations.map(([name, ms]) => (
            <div
              key={name}
              className="rounded-lg border border-line px-3.5 py-3"
            >
              <div className="mb-2 flex items-baseline justify-between">
                <span className="font-mono text-[11px] text-fg-dim">{name}</span>
                <span className="font-mono text-[11px] text-fg-mute">{ms}ms</span>
              </div>
              {/* The bar's width states the duration relative to the slowest —
                  a number in milliseconds is hard to feel, a length isn't. */}
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-panel">
                <div
                  className="h-full rounded-full bg-fg-mute"
                  style={{ width: `${Math.round((ms / slowest) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Easing" hint={`${primitives.motion.easings.length}`}>
        <div className="grid gap-2 sm:grid-cols-2">
          {primitives.motion.easings.map((e) => (
            <div
              key={e.name}
              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-3"
            >
              <span className="shrink-0 font-mono text-[11px] text-fg-dim">{e.name}</span>
              <span className="min-w-0 truncate font-mono text-[10px] text-fg-mute">{e.value}</span>
            </div>
          ))}
        </div>
      </Block>
    </>
  );
}

/* ── Components ── */

function ComponentsSection({
  snapshot,
  slug,
}: {
  snapshot: PublishedSnapshot;
  slug: string;
}) {
  const lanes = COMPONENT_LANES.map((lane) => ({
    ...lane,
    items: lane.items.filter((i) => WIRED_COMPONENTS.has(i.id)),
  })).filter((l) => l.items.length > 0);

  return (
    <>
      <SectionHeader
        title="Components"
        lede="Each one reads roles and scales exclusively — change a mapping and every component follows. Open one to see every state and variant rendered live, with its usage guidance."
      />
      {lanes.map((lane) => (
        <Block key={lane.id} title={lane.label} hint={`${lane.items.length}`}>
          <p className="mb-3 max-w-2xl text-[12px] leading-relaxed text-fg-mute">{lane.note}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {lane.items.map((item) => {
              const doc = COMPONENT_DOCS[item.id];
              const status = componentStatus(snapshot.components[item.id]);
              return (
                <Link
                  key={item.id}
                  href={`/p/${slug}/components/${item.id}`}
                  className="group rounded-xl border border-line p-3.5 transition-colors hover:border-line-strong hover:bg-ink-panel"
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
        </Block>
      ))}
    </>
  );
}

/* ── the page ── */

export function PublicStyleguide({
  snapshot,
  slug,
}: {
  snapshot: PublishedSnapshot;
  slug: string;
}) {
  const { primitives, semantics } = snapshot;
  const theme = usePublicTheme(semantics, primitives);
  const [section, goTo] = useSectionRoute();

  const lanes = COMPONENT_LANES.map((lane) =>
    lane.items.filter((i) => WIRED_COMPONENTS.has(i.id))
  );
  const componentCount = lanes.reduce((n, items) => n + items.length, 0);
  const roleCount = semantics.groups.reduce((n, g) => n + g.tokens.length, 0);

  const counts: Partial<Record<PublicSectionId, number>> = {
    colour: primitives.colorFamilies.length,
    roles: roleCount,
    type: (primitives.typography.stepDefs ?? STEP_DEFS).length,
    space: primitives.spacing.length,
    shape: primitives.radii.length,
    motion: primitives.motion.easings.length,
    components: componentCount,
  };

  const title = PUBLIC_SECTIONS.find((s) => s.id === section)?.label ?? "";

  return (
    <PublicPage>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-semibold tracking-tight">{snapshot.name}</h1>
            <p className="text-[12px] text-fg-mute">
              Design system · {componentCount} components
            </p>
          </div>
          <ModeSwitch theme={theme} semantics={semantics} primitives={primitives} />
        </div>
      </header>

      <SectionNav active={section} onSelect={goTo} counts={counts} />

      <main className="mx-auto max-w-6xl px-6 py-12" aria-label={title}>
        {section === "colour" ? (
          <ColourSection primitives={primitives} />
        ) : section === "roles" ? (
          <RolesSection primitives={primitives} semantics={semantics} mode={theme.mode} />
        ) : section === "type" ? (
          <TypeSection primitives={primitives} />
        ) : section === "space" ? (
          <SpaceSection primitives={primitives} />
        ) : section === "shape" ? (
          <ShapeSection primitives={primitives} semantics={semantics} mode={theme.mode} />
        ) : section === "motion" ? (
          <MotionSection primitives={primitives} />
        ) : (
          <ComponentsSection snapshot={snapshot} slug={slug} />
        )}
      </main>

      <footer className="border-t border-line py-8">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-[12px] text-fg-mute">
            Published with{" "}
            <a href="/" className="underline underline-offset-2 hover:text-fg-dim">
              Arkitype
            </a>
          </p>
        </div>
      </footer>
    </PublicPage>
  );
}

/* `theme` is referenced by ModeSwitch's props type. */
export type { PublicTheme };
