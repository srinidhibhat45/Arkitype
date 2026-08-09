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

/** Derived, never restated — a copied count is a lie with a delay on it. */
const COMPONENT_COUNT = COMPONENT_LANES.reduce((n, lane) => n + lane.items.length, 0);
import { BetaTag } from "@/components/ui/BetaTag";
import { FIGMA_PLUGIN_NAME, FIGMA_PLUGIN_URL } from "@/lib/links";
import { ArrowLeft, ArrowUpRight, Moon, Sun } from "lucide-react";

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
      { id: "variables-map", label: "The Variables map" },
      { id: "accessibility", label: "Accessibility engine" },
      { id: "export-formats", label: "Export formats" },
      { id: "publishing", label: "Publishing & sharing" },
      { id: "figma-plugin", label: "Figma plugin" },
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
              complete token system, a {COMPONENT_COUNT}-component library built entirely
              from those tokens, real product screens to stress-test them in, five export
              formats to hand off — and a link you can send to anyone who needs to read
              the system without installing a thing.
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
              {COMPONENT_COUNT} components across four lanes, all reading roles, scales, and
              motion tokens exclusively — remap a role in step one and every component
              that uses it follows, with nothing to update by hand.
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
            <p>
              Each component also carries a <strong className="font-medium text-fg">Lifecycle</strong>{" "}
              setting — Ready, Beta, or Deprecated. It changes nothing about how the
              component looks; it&apos;s a note to whoever picks the system up, and it
              shows as a badge on the published styleguide so a teammate can tell
              &ldquo;use this&rdquo; from &ldquo;we&apos;re replacing this&rdquo; without asking.
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
              The reward moment — and the stress test. Preview renders a complete,
              realistic product entirely from your live tokens; nothing in the frame is
              hardcoded. Change a colour or a spacing step and the whole product
              redraws.
            </p>
            <p>
              Two dropdowns control what you&apos;re looking at, and they do different
              jobs on purpose:
            </p>
            <FieldList
              items={[
                {
                  label: "Form factor — changes the shape",
                  body: "SaaS is a dense desktop console (sidebar, stat deck, data table). Mobile is a real 390px phone frame, where touch targets have to hold a 44pt minimum. Marketing is a wide editorial page that leans on the big end of your type scale. Same system, three very different pressures.",
                },
                {
                  label: "Industry — changes only the words",
                  body: "Fintech, Healthcare, or E-commerce swaps the copy, numbers, and icons — never the styling. It's there so you can show a client their own vocabulary without building them a bespoke mockup.",
                },
              ]}
            />
            <p className="!mt-6">
              Any form factor pairs with any industry, so three layouts and three
              content packs give you nine screens to check — all generated, none
              hand-built. If the system holds up across all of them, it ships.
            </p>
            <p>
              The same panel also lets you switch{" "}
              <strong className="font-medium text-fg">density</strong> (Compact /
              Standard / Spacious) to see the system tighten and loosen, flip on an{" "}
              <strong className="font-medium text-fg">all-states strip</strong> that
              shows every interactive state at once (default, hover, focus, active,
              loading, disabled), swap the Table / Tabs / Modal skeleton and watch the
              product reflow, and zoom the canvas. Check{" "}
              <strong className="font-medium text-fg">both light and dark</strong> with
              the top-bar toggle while you&apos;re here — a system that only looks
              considered in one theme isn&apos;t finished.
            </p>
          </Section>

          {/* ── 08 Ship ──────────────────────────────────────────── */}
          <Section id="step-ship" eyebrow={`Step ${STEP_META.ship.n}`} title={STEP_META.ship.label}>
            <p>
              Five export artifacts, each copyable to clipboard or downloadable as a
              real file, switched via one tab strip — plus a sixth tab,{" "}
              <strong className="font-medium text-fg">Publish</strong>, which puts the
              system on the web at its own link instead of handing over a file. See{" "}
              <a href="#export-formats" className="font-medium text-fg underline underline-offset-2">
                Export formats
              </a>{" "}
              below for exactly what&apos;s in each one, and{" "}
              <a href="#publishing" className="font-medium text-fg underline underline-offset-2">
                Publishing &amp; sharing
              </a>{" "}
              for the link.
            </p>
            <p>
              For the Figma bundle specifically, a component picker lets you tick or
              untick which of the {COMPONENT_COUNT} components are included (grouped by lane, with a
              per-lane select-all), and a bundle-trace panel reports the system name,
              token count, Figma variable and collection counts, included component
              count, generated page count, both modes, and the final payload size —
              so you know what you&apos;re about to hand off before you do.
            </p>
            <Callout title="Shipping to Figma">
              The bundle is meant to be run through{" "}
              <a
                href={FIGMA_PLUGIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-fg underline underline-offset-2"
              >
                {FIGMA_PLUGIN_NAME}
              </a>
              , the free companion plugin — install it once and Ship becomes a
              two-minute handoff. See{" "}
              <a href="#figma-plugin" className="font-medium text-fg underline underline-offset-2">
                The Figma plugin
              </a>{" "}
              for the full walkthrough.
            </Callout>
          </Section>

          {/* ── Variables map ────────────────────────────────────── */}
          <Section id="variables-map" eyebrow="Reference" title="The Variables map">
            <p>
              The <strong className="font-medium text-fg">Variables</strong> tab in the left rail
              replaces the step canvas with a map of every variable in the file at once — every
              ramp step, scale rung, semantic role, component token, and every component property
              you&apos;ve bound. It isn&apos;t a second copy of your tokens: an edit here lands in
              exactly the same place the Colour and Components steps write to.
            </p>
            <p>
              Value flows left to right through four lanes. Each lane has its own colour and a
              number, and both travel with it everywhere — on the map, in the rail, and in the
              inspector — so a variable is recognisable as the same thing wherever you meet it.
            </p>
            <FieldList
              items={[
                {
                  label: "1 · Primitives",
                  body: "Raw values — the ramps and scales everything else is built from. They hold literals, so nothing can feed them.",
                },
                {
                  label: "2 · Semantic roles",
                  body: "Jobs, not values — what a colour is for, pointed at a primitive.",
                },
                {
                  label: "3 · Component tokens",
                  body: "A component's own names, usually pointed at a role.",
                },
                {
                  label: "4 · Component properties",
                  body: "The end of the line — a real property on a real component. Only bindings you've actually set appear, so the lane shows the wiring you chose rather than the hundreds of defaults you didn't.",
                },
              ]}
            />

            <SubHeading>Reading the wires</SubHeading>
            <p>
              A wire is painted in the lane of the value it <em>carries</em> and points at whatever
              consumes it, so its colour answers &ldquo;where did this come from&rdquo; without a
              click. Wires stay drawn at full strength at all times; hovering or selecting a row
              lights its whole chain and fades the rest, but never out of sight.
            </p>
            <FieldList
              items={[
                { label: "Solid", body: "The same source in both light and dark" },
                {
                  label: "Long dashes / short dots",
                  body: "Light-only and dark-only. A token whose two modes point at different primitives draws both, landing side by side on the row.",
                },
                { label: "Fine dots", body: "A component-property binding" },
                {
                  label: "Elbow / Curve",
                  body: "Two routings, top-right of the canvas. Elbows share a trunk, so a bundle leaving one ramp can be traced; curves keep each wire distinct when two cards nearly overlap.",
                },
              ]}
            />

            <SubHeading>Wiring and unwiring</SubHeading>
            <p>
              Drag from a row&apos;s right-hand handle onto any row to its right to link them —
              illegal drops (a radius into a colour role, or anything that would loop back on
              itself) are refused before you release. Hovering a wire offers a cut: on a token that
              detaches the link and freezes the colour it currently resolves to, so the system looks
              identical the instant after. The inspector does the same work in words — it states
              what the selected variable follows, offers a searchable list of everything that could
              legally feed it, and shows the whole chain in the direction the value travels.
            </p>

            <SubHeading>Undo, redo, reset</SubHeading>
            <p>
              <strong className="font-medium text-fg">⌘Z</strong> and{" "}
              <strong className="font-medium text-fg">⇧⌘Z</strong> work across the whole workspace,
              not just this map, and a rapid gesture like scrubbing a slider collapses into one
              step. <strong className="font-medium text-fg">Reset this sitting</strong>, top-left of
              the canvas, puts every token back to how it stood when you opened Variables — and
              because it&apos;s recorded like any other edit, one ⌘Z brings your work back if you
              pressed it by mistake.
            </p>
            <Callout title="Layout is a view preference">
              Dragging cards around, hiding a collection, and the zoom level are all remembered per
              file and per browser — none of it is part of the design system, and none of it is
              exported. <em>Reset card layout</em>, next to the zoom controls, puts the cards back
              on their lanes without touching a single token.
            </Callout>
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
                      components array and a page per included component. Feed it to{" "}
                      <a
                        href="#figma-plugin"
                        className="font-medium text-fg underline underline-offset-2"
                      >
                        the companion plugin
                      </a>{" "}
                      to build a full kit: cover, foundations, and one page per
                      component with usage docs, variant grids, and token-bound
                      layers. Re-running it updates the file in place.
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
                  <tr>
                    <td className="py-3 pr-4 font-medium text-fg">Published styleguide</td>
                    <td className="py-3 pr-4 text-fg-dim">a link, not a file</td>
                    <td className="py-3 text-fg-dim">
                      A read-only website of your system — foundations, every token, and
                      a page per component with its live preview, states, variants, and
                      usage docs. Anyone with the link can read it; no account, no
                      install. See{" "}
                      <a href="#publishing" className="font-medium text-fg underline underline-offset-2">
                        Publishing &amp; sharing
                      </a>
                      .
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

          {/* ── Publishing ───────────────────────────────────────── */}
          <Section id="publishing" eyebrow="Reference" title="Publishing & sharing">
            <p>
              Every other artifact is a file someone has to receive, open, and keep
              track of. Publishing skips all of that:{" "}
              <strong className="font-medium text-fg">Ship → Publish → Publish</strong>{" "}
              turns your system into a website at its own address, and you send the
              address. Whoever opens it needs no account, no login, and no Arkitype.
            </p>

            <SubHeading>What&apos;s on the published site</SubHeading>
            <FieldList
              items={[
                {
                  label: "Foundations",
                  body: "Your colour ramps, type scale, spacing, radius, elevation, and motion — the values themselves, laid out to be read and copied.",
                },
                {
                  label: "The full token set",
                  body: "Every primitive and every semantic role, in light and dark.",
                },
                {
                  label: "A page per component",
                  body: "The live component — not a screenshot — with every state and variant, its usage documentation (what it's for, when to use it, do / don't, and an accessibility note), and its Ready / Beta / Deprecated badge.",
                },
              ]}
            />

            <SubHeading>How publishing behaves</SubHeading>
            <FieldList
              items={[
                {
                  label: "It publishes a frozen copy",
                  body: "The site shows the system exactly as it was the moment you hit Publish. Keep editing freely — your changes stay private until you press Republish. Nobody watches you work.",
                },
                {
                  label: "The link never changes",
                  body: "Republishing updates the same address, so a link you sent last month still works and now shows the current system. Renaming the file doesn't move it either.",
                },
                {
                  label: "Unpublish takes it down",
                  body: "One button, and the link stops working. You can publish again later.",
                },
              ]}
            />

            <Callout title="Who can see it — read this before you send it to a client">
              A published styleguide is <strong className="font-medium text-fg">unlisted, not
              private</strong>. There&apos;s no password: the link itself is the key, so
              anyone you forward it to can open it, and anyone they forward it to can
              too. Search engines are a different matter — published pages are
              deliberately blocked from Google and left out of the sitemap, so a
              styleguide can&apos;t turn up in a search for your client&apos;s name. Treat
              the link the way you&apos;d treat a shared-drive link: fine for people you
              chose, not a place for anything confidential.
            </Callout>

            <p className="!mt-6">
              Publishing has one other job: it&apos;s what unlocks the{" "}
              <strong className="font-medium text-fg">Figma sync link</strong>, the
              address the plugin pulls from so your designers never have to be sent a
              JSON file at all. Both links appear side by side in the Publish tab once
              you&apos;ve published.
            </p>
          </Section>

          {/* ── Figma plugin ─────────────────────────────────────── */}
          <Section id="figma-plugin" eyebrow="Reference" title="The Figma plugin">
            <p>
              The Figma bundle is JSON — <strong className="font-medium text-fg">{FIGMA_PLUGIN_NAME}</strong>{" "}
              is what turns it into an actual Figma file. It&apos;s free on the Figma
              Community, and it&apos;s the shortest path from a finished system to
              something your designers can draw with.
            </p>
            <a
              href={FIGMA_PLUGIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="!mt-6 inline-flex items-center gap-2 rounded-lg bg-fg px-5 py-2.5 text-[15px] font-medium text-ink transition-opacity hover:opacity-90"
            >
              Install the plugin
              <ArrowUpRight size={16} />
            </a>
            <SubHeading>Getting a system into Figma — two ways in</SubHeading>
            <p>
              There are two ways to hand the plugin your bundle. <strong className="font-medium text-fg">
              Pull</strong> is the faster one and the one worth setting up as your habit;
              <strong className="font-medium text-fg"> paste/drop the JSON</strong> still
              works and needs nothing published.
            </p>
            <FieldList
              items={[
                {
                  label: "1 · Install once",
                  body: (
                    <>
                      Open the{" "}
                      <a
                        href={FIGMA_PLUGIN_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-fg underline underline-offset-2"
                      >
                        Community listing
                      </a>{" "}
                      and hit Open in Figma. After that it lives in your Plugins menu
                      for every file.
                    </>
                  ),
                },
                {
                  label: "2a · Pull (recommended) — needs a published system",
                  body: (
                    <>
                      Publish the system first (see{" "}
                      <a href="#publishing" className="font-medium text-fg underline underline-offset-2">
                        Publishing &amp; sharing
                      </a>
                      ), copy the <strong className="font-medium text-fg">Figma sync link</strong>{" "}
                      from Ship&apos;s Publish tab, and paste it into the plugin&apos;s Pull field.
                      No file to download, no re-importing — and the plugin remembers the
                      link, so after that it&apos;s one click. Every republish, pull again to
                      catch up.
                    </>
                  ),
                },
                {
                  label: "2b · Or export the JSON directly",
                  body: "Don't want to publish? In Ship, pick the Figma kit tab, tick the components you want, and download the JSON (or copy it to your clipboard), then drop it into the plugin's Import tab.",
                },
                {
                  label: "3 · Choose how much to build",
                  body: "“Sync Variables” writes just the two variable collections. “Generate Design System File” builds the whole kit — cover, foundations, and a page per component.",
                },
              ]}
            />
            <SubHeading>What it builds</SubHeading>
            <FieldList
              items={[
                {
                  label: "Variables",
                  body: "Primitives (single mode) and Semantics (Light/Dark, aliased to primitives) — real Figma variables, so a mode swap on a frame reskins everything bound to them.",
                },
                {
                  label: "A page per component",
                  body: "Usage docs, variant grids, component properties, elevation effect styles, and layers bound to tokens rather than pasted hex.",
                },
                {
                  label: "Cover and foundations",
                  body: "A titled cover page plus foundations pages for colour, type, space, shape, and motion.",
                },
              ]}
            />
            <Callout title="Re-running is safe">
              The plugin updates in place rather than rebuilding from scratch, so
              instances and local overrides survive. Change tokens in Arkitype,
              re-export, re-run — the file catches up and your designers keep their
              work.
            </Callout>
          </Section>

          {/* ── FAQ ──────────────────────────────────────────────── */}
          <Section id="faq" eyebrow="Reference" title="FAQ">
            <FieldList
              items={[
                {
                  label: "Is my work safe? Can I lose data?",
                  body: "Arkitype is alpha software and can be unstable — treat it accordingly. Export what matters from Ship regularly rather than relying on a single saved copy.",
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
                {
                  label: "How do I get the system into Figma?",
                  body: (
                    <>
                      Install{" "}
                      <a
                        href={FIGMA_PLUGIN_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-fg underline underline-offset-2"
                      >
                        {FIGMA_PLUGIN_NAME}
                      </a>{" "}
                      from the Figma Community (free), then feed it the JSON from
                      Ship — see{" "}
                      <a href="#figma-plugin" className="font-medium text-fg underline underline-offset-2">
                        The Figma plugin
                      </a>
                      .
                    </>
                  ),
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
