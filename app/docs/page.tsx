"use client";

/**
 * /docs — the full walkthrough. A separate route (not a landing-page section)
 * so it can go into real depth without bloating the marketing scroll: a
 * sticky sidebar, one section per build step, and reference material.
 * Content mirrors the actual builder (STEP_ORDER/STEP_META, FRAMEWORK_TWINS,
 * PROJECT_LIMIT, COMPONENT_LANES) so it can't quietly drift from the product.
 */
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  useDesignSystem,
  STEP_ORDER,
  STEP_META,
  FRAMEWORK_TWINS,
  PROJECT_LIMIT,
} from "@/store/useDesignSystem";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import { BetaTag } from "@/components/ui/BetaTag";
import { ArrowLeft, Moon, Sun } from "lucide-react";

/* ── small building blocks ─────────────────────────────────────── */

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5 rounded-lg border border-line bg-ink-panel px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-mute">{title}</p>
      <div className="mt-1.5 text-sm leading-relaxed text-fg-dim">{children}</div>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-line/60 py-14 first:pt-0">
      {eyebrow && (
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-fg-mute">{eyebrow}</p>
      )}
      <h2 className="font-serif text-3xl tracking-tight text-fg">{title}</h2>
      <div className="mt-5 space-y-4 text-[15px] leading-relaxed text-fg-dim">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className="!mt-8 font-serif text-xl tracking-tight text-fg">{children}</h3>;
}

/** Small "field" list — label + description rows, used for control inventories. */
function FieldList({ items }: { items: { label: string; body: ReactNode }[] }) {
  return (
    <dl className="mt-4 space-y-3 border-l border-line pl-5">
      {items.map((it) => (
        <div key={it.label}>
          <dt className="text-sm font-medium text-fg">{it.label}</dt>
          <dd className="mt-0.5 text-sm leading-relaxed text-fg-dim">{it.body}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── sidebar structure ────────────────────────────────────────── */

const NAV: { heading: string; items: { id: string; label: string }[] }[] = [
  {
    heading: "Getting started",
    items: [
      { id: "overview", label: "Overview" },
      { id: "starting-a-file", label: "Starting a file" },
      { id: "files-and-clients", label: "Files & clients" },
    ],
  },
  {
    heading: "Building your system",
    items: STEP_ORDER.map((id) => ({ id: `step-${id}`, label: `${STEP_META[id].n} · ${STEP_META[id].label}` })),
  },
  {
    heading: "Reference",
    items: [
      { id: "accessibility", label: "Accessibility engine" },
      { id: "export-formats", label: "Export formats" },
      { id: "faq", label: "FAQ" },
    ],
  },
];

/* ── page ─────────────────────────────────────────────────────── */

export default function DocsPage() {
  const chromeTheme = useDesignSystem((s) => s.chromeTheme);
  const toggleChromeTheme = useDesignSystem((s) => s.toggleChromeTheme);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // /docs is a separate route from app/page.tsx, which is where the SPA
  // normally applies chromeTheme to <html> — replicate that here so the
  // toggle in this page's own header actually does something.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", chromeTheme === "dark");
  }, [chromeTheme]);
  if (!mounted) return <div className="min-h-screen bg-ink" />;

  return (
    <div className="min-h-screen bg-ink text-fg font-sans antialiased">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 font-serif text-2xl leading-none tracking-tight text-fg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" width={28} height={28} className="rounded-md" />
            Arkitype
            <BetaTag />
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="rounded-lg border border-line-strong px-3 py-2 text-sm font-medium text-fg-dim lg:hidden"
            >
              Contents
            </button>
            <button
              onClick={toggleChromeTheme}
              aria-label="Toggle light or dark theme"
              className="rounded-full p-2.5 text-fg-mute transition-colors hover:bg-ink-hover hover:text-fg"
            >
              {chromeTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-lg px-4 py-2.5 text-[15px] font-medium text-fg-dim transition-colors hover:text-fg sm:flex"
            >
              <ArrowLeft size={15} /> Back to site
            </Link>
            <Link
              href="/"
              className="rounded-lg bg-fg px-5 py-2.5 text-[15px] font-medium text-ink transition-opacity hover:opacity-90"
            >
              Open Arkitype
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-12 px-6">
        {/* ── Sidebar ────────────────────────────────────────────── */}
        <aside
          className={`${
            mobileNavOpen ? "block" : "hidden"
          } fixed inset-x-0 top-[65px] z-30 max-h-[calc(100vh-65px)] overflow-y-auto bg-ink px-6 pb-10 pt-6 lg:sticky lg:top-24 lg:block lg:h-[calc(100vh-7rem)] lg:w-56 lg:shrink-0 lg:px-0 lg:pb-0`}
        >
          <nav className="space-y-7">
            {NAV.map((group) => (
              <div key={group.heading}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-mute">
                  {group.heading}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={() => setMobileNavOpen(false)}
                        className="block rounded-md px-2 py-1.5 text-sm text-fg-dim transition-colors hover:bg-ink-hover hover:text-fg"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Content ────────────────────────────────────────────── */}
        <main className="min-w-0 flex-1 py-14">
          <div className="mb-10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-fg-mute">Documentation</p>
            <h1 className="mt-3 max-w-2xl font-serif text-4xl leading-[1.1] tracking-tight text-fg sm:text-5xl">
              Everything Arkitype does, in order.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-fg-dim">
              One page, start to finish: how a file is born, what each of the eight
              build steps actually lets you configure, and exactly what comes out
              the other end when you ship.
            </p>
          </div>

          <Section id="overview" eyebrow="Getting started" title="Overview">
            <p>
              Arkitype is a guided design-system builder. Instead of a blank canvas,
              it walks you through eight ordered steps — <strong className="font-medium text-fg">Colour,
              Typography, Spacing, Shape, Motion, Components, Preview, Ship</strong> — where
              each step&apos;s output becomes the next step&apos;s input. By the end you have a
              complete token system, a 50-component library built entirely from those
              tokens, a real mock product to stress-test them in, and five export
              formats ready to hand off.
            </p>
            <p>
              The core idea: <strong className="font-medium text-fg">nothing is a magic number.</strong> A
              button&apos;s padding references a spacing token, its corner references a
              radius token, its colours reference semantic roles which in turn
              reference a primitive colour ramp, and its hover transition references
              a motion token. Change any one of those upstream values and every
              downstream component that reads it updates automatically — that&apos;s the
              whole reason the steps are ordered the way they are.
            </p>
            <Callout title="The token chain">
              Primitive scale (colour ramp / spacing / radius / type / motion) →
              Semantic role (what a value <em>means</em>, per light/dark mode) →
              Component (reads roles + scales, never a raw value) → Export
              (compiled to CSS vars, Tailwind, MUI, Figma, or docs).
            </Callout>
          </Section>

          <Section id="starting-a-file" eyebrow="Getting started" title="Starting a file">
            <p>
              From the dashboard, <strong className="font-medium text-fg">New file</strong> opens a
              two-step wizard. Step one picks how the file begins:
            </p>
            <FieldList
              items={[
                {
                  label: "Blank system",
                  body: "The agnostic skeleton — sensible neutral defaults for every scale, no opinion imposed. The right choice when the brand doesn't exist yet.",
                },
                {
                  label: "From a live site",
                  body: "Paste a URL and Arkitype fetches the page server-side, pulls colours out of its inline + linked CSS, ranks them by frequency and saturation, and does the same for font-family declarations (Google-Fonts-linked families are trusted first, since the name is canonical). The best-matching brand colour and, if it maps to a real loadable Google Font, a body/heading typeface are pre-filled on step two. A font that can't be loaded (a site's self-hosted face) is skipped rather than silently applied.",
                },
                {
                  label: `${FRAMEWORK_TWINS.material.label} twin`,
                  body: `${FRAMEWORK_TWINS.material.blurb}. A twin copies a framework's structural DNA — corner radius, type ratio, density, native typeface, motion timing, shadow language — but deliberately never touches colour, so brand identity always stays yours.`,
                },
                {
                  label: `${FRAMEWORK_TWINS.tailwind.label} twin`,
                  body: `${FRAMEWORK_TWINS.tailwind.blurb}. Same rule: structure only, no colour.`,
                },
              ]}
            />
            <p className="!mt-6">
              Step two names the file, optionally files it under a client, sets a
              brand colour (pre-filled if you scraped a site), a density preset,
              target platform (Web / Mobile / Cross-platform), and an engineering
              destination (Tailwind / MUI / CSS variables / SwiftUI) — the
              destination decides which export tab opens first when you reach Ship.
            </p>
            <Callout title="Account limit">
              Each account holds up to <strong className="font-medium text-fg">{PROJECT_LIMIT}</strong> design
              files. Duplicating or creating past the limit is blocked with a clear
              message rather than failing silently.
            </Callout>
          </Section>

          <Section id="files-and-clients" eyebrow="Getting started" title="Files & clients">
            <p>
              The dashboard groups files by an optional <strong className="font-medium text-fg">client</strong> —
              type a name once (when creating a file, or via a card&apos;s &ldquo;move to
              client&rdquo; action) and that client exists; there&apos;s no separate
              &ldquo;manage clients&rdquo; screen to maintain in parallel. Renaming a
              client relabels it everywhere at once; ungrouping a client unfiles its
              files without deleting them. Every file autosaves as you work — there&apos;s
              no explicit save action to remember.
            </p>
          </Section>

          {/* ── 01 Colour & Roles ───────────────────────────────── */}
          <Section id="step-colour" eyebrow={`Step ${STEP_META.colour.n}`} title={STEP_META.colour.label}>
            <p>
              One stop, two tabs — <strong className="font-medium text-fg">Colours</strong> (primitives)
              and <strong className="font-medium text-fg">Roles</strong> (meaning). They&apos;re the same
              concern: generate ramps, then decide what each shade means.
            </p>

            <SubHeading>Colours — building the ramps</SubHeading>
            <p>
              Families are a free-form list — add, remove, or rename as many as you
              like; the defaults are Brand, Secondary, Neutral, Success, Warning, and
              Error. Each family is one hex seed plus a shade count (3–12 steps). Any
              generated swatch can be pinned to an exact hex by hand — a marker shows
              it&apos;s no longer auto-generated, with a one-click reset. Suggestion
              chips offer harmony-derived seeds (complementary, analogous, split,
              triadic rotations from the brand hue) so a second or third family never
              starts from nothing.
            </p>
            <Callout title="How the ramp is actually generated">
              Each shade targets a fixed WCAG relative-luminance value, and the
              generator binary-searches the HSL lightness channel until the produced
              colour matches that target exactly — hue is preserved, saturation
              follows a bell curve (desaturated at the extremes, fullest through the
              middle). That&apos;s why a 600-shade from any hue carries roughly the same
              visual weight: the ramps are perceptually anchored, not naive lightness
              interpolation.
            </Callout>

            <SubHeading>Roles — mapping meaning onto values</SubHeading>
            <p>
              Components never read a raw colour. They read a{" "}
              <strong className="font-medium text-fg">semantic role</strong> —
              like &ldquo;primary text&rdquo; or &ldquo;success feedback background&rdquo; — and each
              role resolves to a different primitive ramp step per mode, which is what
              makes light and dark &ldquo;one system&rdquo; instead of two. The default set
              is 8 groups (Surface, Text, Action, Border, and four Feedback groups) and
              34 roles, all editable — add a group, add a role to any group, or remove
              one.
            </p>
            <p>
              A live guard checks contrast the moment you rebind a role: if the change
              would drop a real pairing below AA, a warning names exactly which
              pairing failed and by how much, with <strong className="font-medium text-fg">Use
              anyway</strong> / <strong className="font-medium text-fg">Cancel</strong> — so
              the tool warns, but never silently blocks a deliberate choice. A
              contrast audit panel checks 17 curated pairings across both modes (34
              checks total) against AA (4.5:1 body text / 3:1 large text or UI
              components) and AAA (7:1 / 4.5:1) and surfaces a running count of
              anything below AA.
            </p>
          </Section>

          {/* ── 02 Typography ───────────────────────────────────── */}
          <Section id="step-type" eyebrow={`Step ${STEP_META.type.n}`} title={STEP_META.type.label}>
            <p>
              One base size and one scale ratio generate the whole type scale — pick a
              named ratio (Minor Third 1.2, Major Third 1.25, Perfect Fourth 1.333,
              Golden Ratio 1.618) or dial in any custom value, and choose how
              generated sizes round (raw decimals, nearest half pixel, or whole
              pixels).
            </p>
            <p>
              The scale itself is a dynamic list of steps (8 by default: xs through
              4xl), each independently able to pin an exact size and line-height
              override, and each assigned its own font role (Display / Heading /
              Body / Mono) and weight — a heading step doesn&apos;t have to share a
              family or weight with body text. Steps beyond the defaults can be added
              or removed freely (the base step can&apos;t be deleted). Line-height
              tightens automatically as size grows unless you&apos;ve pinned it by hand.
            </p>
            <p>
              Each font role is bound via a Google Fonts picker, and a one-click
              pairing-preset panel sets all four roles at once from a curated list
              (Modern System, Editorial, Geometric Minimal, Literary, and more). A
              specimen list renders every step at real size/weight/family against
              editable preview text, and an &ldquo;in context&rdquo; section shows the
              scale inside three realistic layouts — Article, Split Columns, and a UI
              Card — with adjustable measure (paragraph width) and spacing.
            </p>
          </Section>

          {/* ── 03 Spacing & Layout ─────────────────────────────── */}
          <Section id="step-space" eyebrow={`Step ${STEP_META.space.n}`} title={STEP_META.space.label}>
            <p>
              A density preset — Compact, Standard, or Spacious — rescales the base
              spacing unit and corner radius together as a starting point; every
              value stays editable afterward, it&apos;s a preset, not a lock. The base
              unit (2–12px) generates a ladder of spacing steps as multiples of
              itself; the first eight rungs are permanent (components depend on
              them), further rungs can be added or removed, and any rung can be
              pinned to an exact pixel value.
            </p>
            <p>
              Breakpoints (sm / md / lg / xl) are free-text pixel values with plain-
              language descriptions of what each is for, visualised as a relative
              width chart — these become real layout variables, so design and code
              reflow at the same widths. A &ldquo;rhythm in practice&rdquo; preview applies
              your spacing steps to real flex layouts so a multiplier change is felt,
              not just read as a number.
            </p>
          </Section>

          {/* ── 04 Shape & Elevation ────────────────────────────── */}
          <Section id="step-shape" eyebrow={`Step ${STEP_META.shape.n}`} title={STEP_META.shape.label}>
            <p>
              A single radius-scale slider (0×–2.5×) scales the whole radius ladder at
              once — the two extremes, &ldquo;none&rdquo; and &ldquo;full&rdquo;, never move — and
              any individual step can still be pinned to an exact pixel value.
            </p>
            <p>
              Elevation is a fully structured shadow token, not a CSS string: each
              level (Flat / Low / Medium / High by default) has independent X, Y,
              Blur, Spread, Colour, and Opacity — and critically, <strong className="font-medium text-fg">
              each level is stored separately for light and dark mode</strong>, editable
              via a Light/Dark toggle right in the editor. The preview shows both
              modes side by side simultaneously, regardless of which theme the tool
              itself is in, so dark-mode depth is never invisible while you&apos;re
              working in light mode (or vice versa). A composed preview card applies
              radius + elevation + spacing together in one realistic surface.
            </p>
          </Section>

          {/* ── 05 Motion ────────────────────────────────────────── */}
          <Section id="step-motion" eyebrow={`Step ${STEP_META.motion.n}`} title={STEP_META.motion.label}>
            <p>
              Three named durations — <strong className="font-medium text-fg">fast</strong> (hovers,
              toggles, colour shifts), <strong className="font-medium text-fg">base</strong> (reveals,
              dropdowns, accordions), and <strong className="font-medium text-fg">slow</strong> (modals,
              page-level transitions) — plus a list of named easing curves, each a
              free-text CSS timing function (any keyword or{" "}
              <code className="rounded bg-ink-panel px-1.5 py-0.5 text-[13px]">cubic-bezier(...)</code>).
              A curve playground animates a ball along a track using the real
              duration + easing combination so the timing is felt, not just read as
              numbers, and a relative bar chart compares the three durations at a
              glance.
            </p>
            <p>
              Every interactive part in the component library — buttons, inputs,
              toggles, the rest — already consumes these duration and easing tokens.
              Nothing in the system animates ad hoc.
            </p>
          </Section>

          {/* ── 06 Components ───────────────────────────────────── */}
          <Section id="step-components" eyebrow={`Step ${STEP_META.components.n}`} title={STEP_META.components.label}>
            <p>
              50 components across four lanes, all reading roles, scales, and motion
              tokens exclusively — remap a role in step one and every component that
              uses it follows, with nothing to update by hand.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {COMPONENT_LANES.map((lane) => (
                <div key={lane.id} className="rounded-lg border border-line p-4">
                  <h4 className="text-sm font-medium text-fg">
                    {lane.label} <span className="font-normal text-fg-mute">({lane.items.length})</span>
                  </h4>
                  <p className="mt-2 flex flex-wrap gap-1.5">
                    {lane.items.map((it) => (
                      <span
                        key={it.id}
                        className="rounded-full border border-line-strong px-2.5 py-1 text-[12px] text-fg-dim"
                      >
                        {it.label}
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
            <p className="!mt-6">
              Most components take a Size (Small / Medium / Large) and a Corner
              radius bound to the radius scale by name; a few — like radio, switch,
              or breadcrumbs — deliberately skip radius since they don&apos;t have a
              meaningful corner. Underneath, every part/slot/state combination
              (default, hover, focus, active, disabled) can bind independently to a
              token, which is the mechanism that makes &ldquo;every state, every
              variant&rdquo; actually hold together.
            </p>
            <Callout title="The 4-skeleton rule">
              Three components — <strong className="font-medium text-fg">Modal, Tabs,</strong> and{" "}
              <strong className="font-medium text-fg">Table</strong> — carry four predefined
              structural layouts each, picked from a gallery rather than freely
              composed. This keeps their most structurally-varied parts consistent
              and switchable everywhere they&apos;re used, including live in Preview.
            </Callout>
          </Section>

          {/* ── 07 Preview ───────────────────────────────────────── */}
          <Section id="step-preview" eyebrow={`Step ${STEP_META.preview.n}`} title={STEP_META.preview.label}>
            <p>
              The reward moment: a complete fictional product — <strong className="font-medium text-fg">
              BudgetOps</strong>, a budget-management dashboard with sidebar navigation,
              a stat deck, a data table, and tabs — rendered entirely from your live
              token state. Nothing in the frame is hardcoded.
            </p>
            <p>
              You can swap the Table, Tabs, or Modal skeleton right from this step
              and watch the whole dashboard reflow instantly, open a real modal
              overlay (a &ldquo;New transaction&rdquo; flow) on top of the product frame,
              zoom the canvas, and — importantly — check both light and dark via the
              top-bar toggle. A system that only looks considered in one theme isn&apos;t
              finished.
            </p>
          </Section>

          {/* ── 08 Ship ──────────────────────────────────────────── */}
          <Section id="step-ship" eyebrow={`Step ${STEP_META.ship.n}`} title={STEP_META.ship.label}>
            <p>
              Five export artifacts, each copyable to clipboard or downloadable as a
              real file, switched via one tab strip. See{" "}
              <a href="#export-formats" className="font-medium text-fg underline underline-offset-2">
                Export formats
              </a>{" "}
              below for exactly what&apos;s in each one.
            </p>
            <p>
              For the Figma bundle specifically, a component picker lets you tick or
              untick which of the 50 components are included (grouped by lane, with a
              per-lane select-all), and a bundle-trace panel reports the system name,
              token count, Figma variable and collection counts, included component
              count, generated page count, both modes, and the final payload size —
              so you know what you&apos;re about to hand off before you do.
            </p>
          </Section>

          {/* ── Accessibility ────────────────────────────────────── */}
          <Section id="accessibility" eyebrow="Reference" title="The accessibility engine">
            <p>
              Contrast checking runs on real WCAG 2.x math — each colour&apos;s sRGB
              channels are linearised and combined into a relative luminance, and two
              colours&apos; luminances produce a standard contrast ratio. Three
              thresholds apply depending on context:
            </p>
            <FieldList
              items={[
                { label: "Normal text", body: "AA ≥ 4.5:1, AAA ≥ 7:1" },
                { label: "Large text", body: "AA ≥ 3:1, AAA ≥ 4.5:1" },
                { label: "UI components (borders, focus rings)", body: "AA ≥ 3:1 — no AAA tier defined for this context" },
              ]}
            />
            <p className="!mt-6">
              Rather than checking every colour against every other colour, Arkitype
              checks a curated list of 17 real pairings — the surfaces a role
              actually renders text or a border on in the shipped preview — across
              both light and dark, for 34 checks in total. This runs live in the
              Roles tab (with an inline warn-and-override on any change that would
              fail) and again as a static audit summary you can review before
              shipping.
            </p>
          </Section>

          {/* ── Export formats ───────────────────────────────────── */}
          <Section id="export-formats" eyebrow="Reference" title="Export formats">
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line-strong text-fg-mute">
                    <th className="py-2.5 pr-4 font-medium">Format</th>
                    <th className="py-2.5 pr-4 font-medium">File</th>
                    <th className="py-2.5 font-medium">What&apos;s in it</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr>
                    <td className="py-3 pr-4 font-medium text-fg">Figma bundle</td>
                    <td className="py-3 pr-4 text-fg-dim">{`{name}-design-system.json`}</td>
                    <td className="py-3 text-fg-dim">
                      Two Figma variable collections — Primitives (single mode) and
                      Semantics (Light/Dark modes, aliased to primitives) — plus a
                      components array and a page per included component. Feed it to
                      the companion Arkitype Figma plugin to build a full kit: cover,
                      foundations, and one page per component with usage docs, variant
                      grids, and token-bound layers. Re-running it updates the file in
                      place.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium text-fg">Markdown handoff doc</td>
                    <td className="py-3 pr-4 text-fg-dim">{`{name}-handoff.md`}</td>
                    <td className="py-3 text-fg-dim">
                      Seven sections: consumption model, colour primitives, the full
                      scale reference, the accessibility audit, a token dependency
                      graph, the component inventory, and implementation snippets.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium text-fg">CSS variables</td>
                    <td className="py-3 pr-4 text-fg-dim">{`{name}-tokens.css`}</td>
                    <td className="py-3 text-fg-dim">
                      A real <code className="rounded bg-ink-panel px-1 py-0.5 text-[12px]">:root</code> +{" "}
                      <code className="rounded bg-ink-panel px-1 py-0.5 text-[12px]">.dark</code> custom-properties
                      file, generated by the same compiler every preview frame in the
                      app already reads from — nothing to fall out of sync.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium text-fg">Tailwind config</td>
                    <td className="py-3 pr-4 text-fg-dim">tailwind.config.js</td>
                    <td className="py-3 text-fg-dim">
                      Colours, spacing, radius, font sizes/weights, shadows, and
                      transition durations/easings — each mapped to reference the CSS
                      variables file, so import both together.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium text-fg">MUI theme</td>
                    <td className="py-3 pr-4 text-fg-dim">arkitype-theme.ts</td>
                    <td className="py-3 text-fg-dim">
                      Real <code className="rounded bg-ink-panel px-1 py-0.5 text-[12px]">createTheme()</code> calls
                      for light and dark with fully resolved values (MUI needs concrete
                      numbers for its own contrast math, not CSS vars) — palette,
                      spacing, shape, and typography. MUI&apos;s own default shadow scale
                      is left in place rather than emitting a mismatched array.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Callout title="About the SwiftUI destination">
              SwiftUI can be picked as an engineering destination during onboarding,
              but there&apos;s no SwiftUI code generator yet — choosing it opens the
              Markdown handoff doc at Ship instead, as the closest available fit.
            </Callout>
          </Section>

          {/* ── FAQ ──────────────────────────────────────────────── */}
          <Section id="faq" eyebrow="Reference" title="FAQ">
            <FieldList
              items={[
                {
                  label: "Is my work safe? Can I lose data?",
                  body: "Arkitype is beta software and can be unstable — treat it accordingly. Export what matters from Ship regularly rather than relying on a single saved copy.",
                },
                {
                  label: "How many design files can I have?",
                  body: `${PROJECT_LIMIT} per account. Duplicating or creating past that is blocked with a clear message.`,
                },
                {
                  label: "What's a “framework twin”, exactly?",
                  body: "A starting point that copies a framework's structure (radius, type ratio, density, native font, motion, shadows) but never its colour — so Material or Tailwind UI's shape shows up without overwriting your brand.",
                },
                {
                  label: "Can I start from a site I don't control the code for?",
                  body: "Yes — “From a live site” fetches it server-side and reads whatever colours and fonts are actually in its CSS. Sites that block bots or load styles dynamically may return little or nothing extractable.",
                },
                {
                  label: "Does the tool's own light/dark toggle affect my design system?",
                  body: "No — the chrome toggle (top right) only changes how the builder itself looks. Your system's light and dark modes are configured separately in Roles and Shape, and Preview lets you check both.",
                },
                {
                  label: "What can I export to?",
                  body: "A Figma bundle, a Markdown handoff doc, CSS variables, a Tailwind config, or an MUI theme — see Export formats above.",
                },
              ]}
            />
          </Section>

          <div className="pt-14 text-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-fg px-7 py-3.5 text-base font-medium text-ink transition-opacity hover:opacity-90"
            >
              Start building
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
