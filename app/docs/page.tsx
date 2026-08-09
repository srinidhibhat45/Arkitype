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

/**
 * A numbered do-this-then-this list. Distinct from FieldList on purpose: that
 * one inventories controls you might use in any order, this one is a path with
 * a beginning and an end, and the numbers are the point.
 */
function Steps({ items }: { items: { label: string; body: ReactNode }[] }) {
  return (
    <ol className="mt-5 space-y-5">
      {items.map((it, i) => (
        <li key={it.label} className="flex gap-4">
          <span
            aria-hidden
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-[12px] font-medium text-fg-dim"
          >
            {i + 1}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-fg">{it.label}</p>
            <div className="mt-1 text-sm leading-relaxed text-fg-dim">{it.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** An inline keyboard shortcut. */
function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-ink-panel px-1.5 py-0.5 font-sans text-[12px] text-fg-dim">
      {children}
    </kbd>
  );
}

/* ── sidebar structure ────────────────────────────────────────── */

const NAV: { heading: string; items: { id: string; label: string }[] }[] = [
  {
    heading: "Getting started",
    items: [
      { id: "overview", label: "Overview" },
      { id: "quick-start", label: "Quick start · 5 minutes" },
      { id: "starting-a-file", label: "Starting a file" },
      { id: "the-workspace", label: "The workspace" },
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
      { id: "variables-map", label: "Variables: table and map" },
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
            <p className="!mt-6">
              If you&apos;d rather try it than read it, the{" "}
              <a href="#quick-start" className="font-medium text-fg underline underline-offset-2">
                quick start
              </a>{" "}
              below gets you from an empty account to a real exported artifact in about five
              minutes. Everything after it is reference — read it when you hit the thing it
              describes.
            </p>
          </Section>

          {/* ── Quick start ──────────────────────────────────────── */}
          <Section id="quick-start" eyebrow="Getting started" title="Quick start · 5 minutes">
            <p>
              The shortest honest path through Arkitype. You can stop after step 4 and still have
              something worth looking at — the rest is handoff.
            </p>
            <Steps
              items={[
                {
                  label: "Make a file",
                  body: (
                    <>
                      From the dashboard, <strong className="font-medium text-fg">New file</strong>.
                      Pick <strong className="font-medium text-fg">Blank system</strong> if you just
                      want to look around, or paste a URL under{" "}
                      <strong className="font-medium text-fg">From a live site</strong> to start from
                      a brand that already exists. Name it, set a brand colour, and open it. Nothing
                      here is permanent — every field is editable afterwards.
                    </>
                  ),
                },
                {
                  label: "Set the brand colour and check the warnings",
                  body: (
                    <>
                      You land on <strong className="font-medium text-fg">01 · Colour &amp; roles</strong>.
                      Change the Brand seed and watch the whole ramp regenerate. Switch to the{" "}
                      <strong className="font-medium text-fg">Roles</strong> tab: this is where a
                      colour stops being a colour and starts being a job. If a change would push a
                      real pairing below AA, you&apos;ll get a named warning rather than a silent
                      failure — you can override it, but you&apos;ll know.
                    </>
                  ),
                },
                {
                  label: "Skim steps 2–5, change one thing in each",
                  body: (
                    <>
                      Typography, Spacing, Shape, Motion. You don&apos;t have to finish them — move a
                      type ratio, a base spacing unit, a radius slider, one duration. The point is to
                      feel that these are upstream of everything else, not to get them right on the
                      first pass.
                    </>
                  ),
                },
                {
                  label: "Go to Preview and watch it hold together",
                  body: (
                    <>
                      Step 7 renders a whole product from your tokens — nothing in the frame is
                      hardcoded. Flip <strong className="font-medium text-fg">form factor</strong>{" "}
                      (SaaS / Mobile / Marketing) and the top-bar{" "}
                      <strong className="font-medium text-fg">Preview: Light / Dark</strong> toggle.
                      This is the step that tells you whether the decisions you just made actually
                      work. Go back and fix what doesn&apos;t.
                    </>
                  ),
                },
                {
                  label: "Ship something",
                  body: (
                    <>
                      Step 8. Grab <strong className="font-medium text-fg">CSS variables</strong> or a{" "}
                      <strong className="font-medium text-fg">Tailwind config</strong> if you want to
                      use it in code today, or hit{" "}
                      <strong className="font-medium text-fg">Publish</strong> to get a shareable link
                      that needs no account and no install. For Figma, publish first, then paste the
                      sync link into{" "}
                      <a
                        href={FIGMA_PLUGIN_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-fg underline underline-offset-2"
                      >
                        {FIGMA_PLUGIN_NAME}
                      </a>
                      .
                    </>
                  ),
                },
              ]}
            />
            <Callout title="Two things that make the first hour easier">
              <p>
                <Key>⌘Z</Key> works everywhere in the workspace, not just where you&apos;d expect —
                so poke at things. And the eight steps are an order, not a gate: the rail lets you
                jump to any of them at any time, and coming back to Colour after Components is
                normal, not a mistake.
              </p>
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

          {/* ── The workspace ────────────────────────────────────── */}
          <Section id="the-workspace" eyebrow="Getting started" title="The workspace">
            <p>
              Every step shares the same three-part frame: a rail on the left for navigating and
              editing tokens, the canvas in the middle, and an inspector on the right for whatever is
              currently selected. Both side panels drag to resize, and the width is remembered.
            </p>

            <SubHeading>The top bar</SubHeading>
            <FieldList
              items={[
                {
                  label: "Files · Arkitype · name",
                  body: "Files takes you back to the dashboard. The name is editable in place — click it and type.",
                },
                {
                  label: "Autosaved",
                  body: "There's no save button; the file writes as you work. If a save fails you get a red “Not saved” with a Retry instead, and “Changed elsewhere” if the same file was edited in another tab — that one offers Reload rather than silently overwriting.",
                },
                {
                  label: "? — the guided tour",
                  body: "A four-stop tour of the frame itself (rail, canvas, inspector, top bar). It's always available, not just on first run.",
                },
                {
                  label: "Sun / moon — Appearance",
                  body: "Themes the tool. This is not your design system's light and dark mode, and changing it doesn't touch a single token.",
                },
                {
                  label: "Preview: Light / Dark",
                  body: "This one is your system's mode. Everything on the canvas — components, previews, the Variables table's two columns — resolves through it. Check both while you work; a system that only looks considered in one theme isn't finished.",
                },
                {
                  label: "Ship",
                  body: "Jumps straight to step 8 from anywhere. It fills in solid once the system is far enough along to be worth handing off.",
                },
              ]}
            />

            <SubHeading>The left rail — three tabs</SubHeading>
            <FieldList
              items={[
                {
                  label: "Layers",
                  body: "The eight build steps, in order, with a progress count at the foot. Under Components it expands into every component grouped by lane, so you can jump straight to one. The filter box at the top searches steps and components together.",
                },
                {
                  label: "Tokens",
                  body: "The registry, editable without leaving whatever step you're on: Colors, Spacing, Radius, Font Families, Font Scale Steps, Elevation, and Motion, each with an Add control and a one-click copy on every value. There's also a Density switcher here for rescaling spacing and radius together.",
                },
                {
                  label: "Variables",
                  body: (
                    <>
                      The navigator for the Variables workspace — search across every variable in the
                      file, create a new set, and (on the map) control which tiers and collections are
                      drawn. See{" "}
                      <a
                        href="#variables-map"
                        className="font-medium text-fg underline underline-offset-2"
                      >
                        Variables: the table and the map
                      </a>
                      .
                    </>
                  ),
                },
              ]}
            />
            <p className="!mt-6">
              Layers and Tokens sit <em>beside</em> the step you&apos;re on. Variables is different —
              it takes over the canvas, because it spans all eight steps&apos; tokens at once and has
              no single step to live inside. Your step is untouched underneath: switch back to Layers
              or Tokens and you&apos;re exactly where you left off.
            </p>

            <SubHeading>Undoing things</SubHeading>
            <p>
              <Key>⌘Z</Key> and <Key>⇧⌘Z</Key> (<Key>Ctrl+Z</Key> / <Key>Ctrl+Y</Key> on Windows)
              cover the whole workspace, not one panel — a colour rebind, a component binding, a
              renamed token, a whole ready-made variable set all undo the same way. A rapid gesture
              like scrubbing a slider collapses into one step rather than fifty. The shortcut
              deliberately stays out of the way while you&apos;re typing in a field, where the
              browser&apos;s own text undo is the right behaviour.
            </p>
            <Callout title="If you get lost">
              Nothing in the builder is destructive without saying so first — deletes ask twice, and
              the Variables workspace additionally offers <em>Reset this sitting</em>, which returns
              every token to how it stood when you opened it. Even that is recorded as an ordinary
              edit, so one <Key>⌘Z</Key> brings your work back if you hit it by mistake.
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

          {/* ── Variables ────────────────────────────────────────── */}
          <Section id="variables-map" eyebrow="Reference" title="Variables: the table and the map">
            <p>
              The <strong className="font-medium text-fg">Variables</strong> tab in the left rail
              replaces the step canvas with every variable in the file at once — every ramp step,
              scale rung, semantic role, component token, and every component property
              you&apos;ve bound. It isn&apos;t a second copy of your tokens: an edit here lands in
              exactly the same place the Colour and Components steps write to.
            </p>
            <p>
              Two views, switched top-left. <strong className="font-medium text-fg">Table</strong> is
              the everyday one: your sets down the left, a column per mode, a row per variable.
              Click any value to point it at another variable or type one in.{" "}
              <strong className="font-medium text-fg">Map</strong> is the same data as a graph, for
              the question a table can&apos;t answer — what feeds this, and what breaks if I change
              it.
            </p>
            <p>
              <strong className="font-medium text-fg">New set of variables</strong> — in the rail, in
              the table&apos;s sets list, and at the foot of the map — starts an empty set, or drops
              in a ready-made one. The ready-made sets (a focus ring, a disabled grey, six chart
              colours, a tooltip&apos;s own colours…) arrive wired to your ramps and roles rather
              than to invented values, and land as a single edit, so one ⌘Z puts it back.
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

            <SubHeading>The table</SubHeading>
            <p>
              Sets down the left, grouped by those four tiers with a count each. Pick one and it
              fills the columns: a <strong className="font-medium text-fg">Name</strong> column, then
              one column per mode — Light and Dark for a role or component token, a single read-only
              Value for a primitive, and <em>Bound to</em> for a component property.
            </p>
            <FieldList
              items={[
                {
                  label: "Rows group themselves",
                  body: "Variables sharing everything but their last segment collapse under one heading — overlay-scrim and overlay-veil become an “overlay” heading with scrim and veil under it. Renaming the visible part keeps the prefix, so the grouping can't quietly rewrite a name.",
                },
                {
                  label: "A value states what it is",
                  body: "A chip carrying a swatch and either the name it follows (an alias), or its hex (a literal), plus an alpha percentage when there is one. Aliases read as names on purpose — that's the whole reason to alias.",
                },
                {
                  label: "Clicking a value opens both ways to set it",
                  body: "A colour well and a free-text field on top — a ramp reference like brand-600, an @role, or a raw hex — and a searchable list of every variable that could legally feed this one below. Nothing in that list can produce an illegal link, so there's no error to recover from.",
                },
                {
                  label: "Names, adds and deletes",
                  body: "Rename a variable in place and every reference and component binding follows. Hovering a row offers copy and delete; the set header renames or deletes the whole set, and “+ Variable” adds to it.",
                },
              ]}
            />

            <SubHeading>Creating a set</SubHeading>
            <p>
              <strong className="font-medium text-fg">New set of variables</strong> appears in three
              places — the rail, the top of the table&apos;s sets list, and the foot of the map — and
              opens the same panel. Name an empty set (a{" "}
              <strong className="font-medium text-fg">Role</strong> set or a{" "}
              <strong className="font-medium text-fg">Component</strong> one), or take a ready-made
              one: Focus &amp; overlay, Selection &amp; highlight, Disabled, Chart, Badge, Table,
              Tooltip, Dialog, Navigation, Toast.
            </p>
            <Callout title="What “ready-made” actually means here">
              A preset is a starting point, not a template — once applied it&apos;s ordinary tokens
              you can rename, rebind, or delete, and nothing keeps referring back to it. The values
              resolve against <em>your</em> file: a set asking for a brand ramp finds yours, or the
              closest thing to it, and a component token pointing at a role you don&apos;t have falls
              back to a primitive instead of dangling. Each one lands as a single edit, so one{" "}
              <Key>⌘Z</Key> removes the set and everything in it.
            </Callout>

            <SubHeading>Reading the wires</SubHeading>
            <p>
              A wire is painted in the lane of the value it <em>carries</em> and points at whatever
              consumes it, so its colour answers &ldquo;where did this come from&rdquo; without a
              click. At rest a wire is quiet and ends in a small dot at each end; point at a row or a
              card and its whole chain lights up, gains an arrow, and spells out the dashes below.
              A full system is several hundred aliases, and this is what keeps it a map rather than
              a hairball.
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
                  label: "Wires: All / Calm / Focus",
                  body: "How much is drawn at rest. Calm is the default — everything is there, hushed. All puts every wire at full strength when you want the whole weave; Focus draws nothing but the chain under your cursor.",
                },
                {
                  label: "Elbow / Curve",
                  body: "Two routings, top-right of the canvas. Elbows share a trunk, so a bundle leaving one ramp can be traced; curves keep each wire distinct when two cards nearly overlap.",
                },
                {
                  label: "Folding a card",
                  body: "The chevron on any card header (or a double-click on it) collapses the card to its header, and every wire into or out of it gathers onto that one point. Fold-all, next to the routing controls, does the whole file at once — the fastest way to see the shape of a system.",
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
              legally feed it, and shows the whole chain in the direction the value travels. In the
              table, that same work is a click on the value.
            </p>
            <p>
              One control worth knowing before you drag anything:{" "}
              <strong className="font-medium text-fg">Editing — Light / Dark / Both</strong>, at the
              top of the rail, decides which mode a new wire writes to <em>and</em> which wires are
              drawn. On Both (the default) a link lands in light and dark together; on a single mode
              it lands only there, and the map shows only that mode&apos;s wiring.
            </p>

            <SubHeading>Getting around the canvas</SubHeading>
            <FieldList
              items={[
                {
                  label: "Pan and zoom",
                  body: (
                    <>
                      Drag the background to pan, scroll to pan vertically, <Key>⌘</Key> + scroll to
                      zoom. The zoom controls, <em>Fit to view</em> and <em>Reset card layout</em> sit
                      bottom-left.
                    </>
                  ),
                },
                {
                  label: "Finding one variable",
                  body: "Search in the rail. On the map it flies the canvas to it; in the table it opens the set that holds it. Clicking a source or a dependent in the inspector does the same thing.",
                },
                {
                  label: "Hiding what you're not looking at",
                  body: "The rail's Tiers toggles drop a whole lane, individual sets have an eye toggle, and “Hide unused primitives” drops every ramp step nothing references yet — which is most of them, on a fresh file.",
                },
                {
                  label: "Key",
                  body: "The legend, bottom-right, holds the four lane colours and what each dash pattern means. It collapses, and stays collapsed.",
                },
              ]}
            />

            <SubHeading>Undo, redo, reset</SubHeading>
            <p>
              <Key>⌘Z</Key> and <Key>⇧⌘Z</Key> work across the whole workspace, not just this map,
              and a rapid gesture like scrubbing a slider collapses into one step.{" "}
              <strong className="font-medium text-fg">Reset this sitting</strong>, top-left of the
              canvas, puts every token back to how it stood when you opened Variables — and because
              it&apos;s recorded like any other edit, one <Key>⌘Z</Key> brings your work back if you
              pressed it by mistake.
            </p>
            <Callout title="Layout is a view preference">
              Dragging cards around, folding them, hiding a collection, which view you were in and
              the zoom level are all remembered per file and per browser — none of it is part of the
              design system, and none of it is exported. <em>Reset card layout</em>, next to the
              zoom controls, puts the cards back on their lanes without touching a single token.
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
                  label: "Do I have to do the eight steps in order?",
                  body: "No. The order is how the tokens depend on each other, not a gate — click any step in the rail at any time. Going back to Colour after you've built components is normal; that's the whole point of everything referencing a token instead of a value.",
                },
                {
                  label: "What's the difference between the Tokens tab and the Variables tab?",
                  body: (
                    <>
                      Same tokens, different question. <strong className="font-medium text-fg">Tokens</strong>{" "}
                      is a registry that sits beside whatever step you&apos;re on — quick edits and
                      copying values without losing your place.{" "}
                      <strong className="font-medium text-fg">Variables</strong> takes over the canvas
                      to show all of them at once, and is where you go to ask what feeds what. Neither
                      is a copy: an edit in either lands in the same place the steps write to.
                    </>
                  ),
                },
                {
                  label: "How do I add my own token or colour role?",
                  body: (
                    <>
                      A single one: the Tokens tab&apos;s Add controls, or the Roles tab in step 1. A
                      whole set at once:{" "}
                      <strong className="font-medium text-fg">New set of variables</strong> in the
                      Variables tab, which also offers ready-made sets (focus ring, disabled, chart
                      series, and more) wired to your own ramps. See{" "}
                      <a
                        href="#variables-map"
                        className="font-medium text-fg underline underline-offset-2"
                      >
                        Variables
                      </a>
                      .
                    </>
                  ),
                },
                {
                  label: "The Variables map looks like spaghetti. What do I do?",
                  body: (
                    <>
                      Three levers, in the order worth trying them. Fold the cards you aren&apos;t
                      reading — the fold-all button collapses every card to its header and gathers its
                      wires onto one point. Drop{" "}
                      <strong className="font-medium text-fg">Wires</strong> from Calm to Focus, which
                      draws only the chain under your cursor. And turn on{" "}
                      <em>Hide unused primitives</em> in the rail, since on most files the majority of
                      ramp steps aren&apos;t referenced yet.
                    </>
                  ),
                },
                {
                  label: "I broke something. How far back can I go?",
                  body: (
                    <>
                      <Key>⌘Z</Key> covers the whole workspace and holds a long history. In the
                      Variables workspace, <em>Reset this sitting</em> additionally returns every
                      token to how it stood when you opened it — and that itself is undoable. Nothing
                      is deleted without a second click asking you to confirm.
                    </>
                  ),
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
