"use client";

/**
 * The documentation itself — every section, in order, and the contents list
 * that navigates them.
 *
 * Lifted out of `app/docs/page.tsx` so the same words can be read in two
 * places: the public /docs route, and the Docs tab inside a file. Two copies
 * would have been one copy and one lie within a week — the whole reason this
 * content quotes the product's own constants (STEP_ORDER, COMPONENT_LANES,
 * PROJECT_LIMIT) instead of restating them.
 *
 * What's *not* in here is chrome: the page header, the hero, the sidebar
 * shell, the "start building" call to action. Those belong to whichever
 * surface is doing the rendering, because a marketing page and a panel inside
 * a workspace want different ones. Nor is the contents list — that's
 * `docsNav`, so the builder's rail can navigate the manual without loading it
 * (see the dynamic import in `app/page.tsx`).
 */
import { type ReactNode } from "react";
import { STEP_META, FRAMEWORK_TWINS, PROJECT_LIMIT } from "@/store/useDesignSystem";
import { COMPONENT_LANES } from "@/lib/componentLanes";
import { FIGMA_PLUGIN_NAME, FIGMA_PLUGIN_URL } from "@/lib/links";
import { ArrowUpRight } from "lucide-react";

/** Derived, never restated — a copied count is a lie with a delay on it. */
const COMPONENT_COUNT = COMPONENT_LANES.reduce((n, lane) => n + lane.items.length, 0);

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

/* ── the documentation ────────────────────────────────────────── */

/**
 * Every section, in order. Rendered inside whatever column the host gives it
 * — the sections size themselves to it and carry their own vertical rhythm.
 */
export function DocsSections() {
  return (
    <>
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
              Semantic role (what a value <em>means</em>, one value per mode) →
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
                      (SaaS / Mobile / Marketing) and walk the top-bar{" "}
                      <strong className="font-medium text-fg">Preview</strong> switch through every
                      mode your file carries. This is the step that tells you whether the decisions
                      you just made actually work. Go back and fix what doesn&apos;t.
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
              currently selected. Both side panels drag to resize, and the width is remembered — and
              either can be put away entirely when you want the room. A panel switch sits at each end
              of the top bar — over the panel it controls — and <Key>{"⌘\\"}</Key> clears both at once (and brings them back),
              and the choice sticks across reloads. Nothing is narrowed to a strip of icons: a panel
              is either there or it isn&apos;t, and the switch that returns it is in the top bar,
              which never goes anywhere. Hiding the inspector on a step keeps{" "}
              <strong className="font-medium text-fg">Back</strong> and{" "}
              <strong className="font-medium text-fg">Continue</strong> — they reappear as a small
              pair in the canvas&apos;s bottom-right corner.
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
                  label: "The book — documentation",
                  body: "Opens this documentation inside the file, in the canvas, with its contents in the rail. Nothing you're working on is closed or lost to read it, and the header of that surface links out to the standalone page when you want to send it to someone.",
                },
                {
                  label: "? — the guided tour",
                  body: "A four-stop tour of the frame itself (rail, canvas, inspector, top bar). It's always available, not just on first run.",
                },
                {
                  label: "The panel switches — one at each end",
                  body: "The switch at the far left hides and shows the left rail; the one at the far right does the same for the inspector. They sit over the panels they control rather than in the middle of the chrome, so which is which needs no explaining. ⌘\\ puts both away for a full-width canvas and brings them back the same way.",
                },
                {
                  label: "Sun / moon — Appearance",
                  body: "Themes the tool. This is not your design system's light and dark mode, and changing it doesn't touch a single token.",
                },
                {
                  label: "Preview — your system's modes",
                  body: "Every mode the file carries: light, dark, and any further one you've added. Whatever the canvas is previewing resolves through it — so it's live on Shape, Components and Preview, and dimmed everywhere else, with the reason on its tooltip. Colour and Variables dim it because they show every mode at once rather than one at a time; Type, Spacing, Motion and Ship dim it because nothing they hold changes per mode.",
                },
                {
                  label: "Ship",
                  body: "Jumps straight to step 8 from anywhere. It fills in solid once the system is far enough along to be worth handing off.",
                },
              ]}
            />

            <SubHeading>The left rail — four tabs</SubHeading>
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
                {
                  label: "Docs",
                  body: "This documentation, in the canvas, with its contents in the rail — so looking something up costs you nothing: not your place in the file, not a tab, not the pan and zoom you'd set up on a map. Same words as the public page, which the header still links out to for when you want to send someone a link. The contents list follows your reading as you scroll, and its search filters the sections by name. The book icon in the top bar opens it too, and opens the rail if you'd put it away.",
                },
              ]}
            />
            <p className="!mt-6">
              Layers and Tokens sit <em>beside</em> the step you&apos;re on. Variables and Docs are
              different — they take over the canvas, because one spans all eight steps&apos; tokens
              at once and the other spans all eight steps, and neither has a single step to live
              inside. Your step is untouched underneath: switch back to Layers or Tokens and
              you&apos;re exactly where you left off. Anything that navigates to a step — Ship, the
              tour, a jump to a token — brings the step surface back with it.
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
              The canvas carries a real tab strip — <strong className="font-medium text-fg">Palette
              &amp; tokens</strong> and <strong className="font-medium text-fg">Contrast audit</strong>.
              Palette &amp; tokens is one stop for two concerns that used to be
              called separate tabs and still read as one scroll — <strong className="font-medium text-fg">Colours</strong> (primitives)
              and <strong className="font-medium text-fg">Roles</strong> (meaning): generate ramps,
              then decide what each shade means. The audit used to sit on top of that scroll, a
              report standing between you and the palette every time you came to change a colour —
              it now has its own tab, reached from the strip or from <strong className="font-medium text-fg">Open
              audit</strong> on the health score in the aside.
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
              one. A token&apos;s colour well — the swatch beside its value, on a ramp step or a
              role alike — opens a small picker with hue and opacity together; opacity used to
              be a slider parked on every row and is now a{" "}
              <span className="font-mono text-fg">67%</span> chip that only appears once a token
              isn&apos;t fully opaque, so the rows stay readable and the value field beside it
              still takes a typed <span className="font-mono text-fg">/NN</span> if you&apos;d
              rather not open the picker at all.
            </p>
            <p>
              A live guard checks contrast the moment you rebind a role: if the change
              would drop a real pairing below AA, a warning names exactly which
              pairing failed and by how much, with <strong className="font-medium text-fg">Use
              anyway</strong> / <strong className="font-medium text-fg">Cancel</strong> — so
              the tool warns, but never silently blocks a deliberate choice. The
              Contrast audit tab checks 17 curated pairings in every mode the file
              carries — 34 checks on a stock light/dark system, and more the moment you
              add one — against AA (4.5:1 body text / 3:1 large text or UI components)
              and AAA (7:1 / 4.5:1), and surfaces a running count of anything below AA. You can
              also declare backgrounds the derived pairings can&apos;t find — pure white, pure
              black, a brand fill, an <span className="font-mono text-fg">@role</span> that
              tracks the system — and every text and border token in the file is checked
              against each one, in every mode, the same as any surface the system owns. A
              declared background is pinned rather than derived, so a one-click repair can
              retarget the text but never move the background you named.
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
              each level is stored separately per mode</strong>, picked from the
              editor&apos;s own mode switch. Every mode&apos;s ramp is previewed at once,
              regardless of which theme the tool itself is in, so dark-mode depth is
              never invisible while you&apos;re working in light mode (or vice versa).
              A composed preview card applies radius + elevation + spacing together in
              one realistic surface, in whichever mode the top bar is previewing.
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
              <strong className="font-medium text-fg">every mode</strong> with the
              top-bar Preview switch while you&apos;re here — a system that only looks
              considered in one of them isn&apos;t finished.
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
              count, generated page count, every mode by name, and the final payload
              size — so you know what you&apos;re about to hand off before you do.
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
              <strong className="font-medium text-fg">New set of variables</strong> — in the rail, on
              each tier heading in the table&apos;s sets list, on each band&apos;s header on the map,
              and at the foot of the map — starts an empty set, or drops in a ready-made one. Asking
              from inside a band opens the panel already on that tier. The ready-made sets (a focus ring, a disabled grey, six chart
              colours, a tooltip&apos;s own colours…) arrive wired to your ramps and roles rather
              than to invented values, and land as a single edit, so one ⌘Z puts it back.
            </p>
            <p>
              Value flows left to right through four lanes. Each lane has its own colour and a
              number, and both travel with it everywhere — on the map, in the rail, and in the
              inspector — so a variable is recognisable as the same thing wherever you meet it. The
              map draws those lanes one of two ways, and the toggle is in its top-right corner:{" "}
              <strong className="font-medium text-fg">Lanes</strong> gives each tier a single column
              in a fixed order, so a set is always where you last saw it and every connection runs
              cleanly between two columns — at the price of a map several screens deep.{" "}
              <strong className="font-medium text-fg">Packed</strong> wraps each tier into as many
              columns as it takes to land the whole system on the screen you&apos;re reading it on —
              the fold depth is solved for your canvas&apos;s shape, so it comes out deep and narrow
              on a tall panel and shallow and wide on a letterbox. The order is the same either way:
              down a column, then across. Cards you&apos;ve dragged keep their nudge relative to
              their own slot, so switching between the two never piles them on top of each other.
            </p>
            <FieldList
              items={[
                {
                  label: "1 · Primitives",
                  body: "Raw values — the ramps and scales everything else is built from. They hold literals, so nothing can feed them. They're also generated rather than typed, so Variables doesn't pretend to edit them: every primitive set carries “Add or remove steps” (opens the Tokens panel at that scale) and “Edit in <step>” (tunes its values where they're generated).",
                },
                {
                  label: "2 · Semantic roles",
                  body: "Jobs, not values — what a colour is for, pointed at a primitive.",
                },
                {
                  label: "3 · Component tokens",
                  body: "A component's own names — not only its colours. A Button set carries its corner, its padding, its gap and its type alongside its fill, each pointed at the primitive scale of its own type (radius:md, space:4, text:sm), so everything a component is lives in one place.",
                },
                {
                  label: "4 · Component properties",
                  body: "The end of the line — a real property on a real component. Every component in the library is here, each property on the binding it really renders from: the schema's until you move it, yours after. Components you've customised open; the rest stay folded to a name. Their untouched default wiring isn't drawn at rest — see “Default wiring” below.",
                },
              ]}
            />

            <SubHeading>The table</SubHeading>
            <p>
              Sets down the left, grouped by those four tiers with a count each. Pick one and it
              fills the columns: a <strong className="font-medium text-fg">Name</strong> column, then
              one column per mode for a role or component token, a single read-only Value for a
              primitive, and <em>Bound to</em> for a component property.
            </p>
            <FieldList
              items={[
                {
                  label: "Rows group themselves",
                  body: "Variables sharing everything but their last segment collapse under one heading — overlay-scrim and overlay-veil become an “overlay” heading with scrim and veil under it. Renaming the visible part keeps the prefix, so the grouping can't quietly rewrite a name.",
                },
                {
                  label: "A value states what it is",
                  body: "A chip carrying a mark — a swatch for a colour, its type's icon for anything else — and either the name it follows (an alias), its hex (a literal), or the step it names with the px it currently works out to. Aliases read as names on purpose: that's the whole reason to alias.",
                },
                {
                  label: "Clicking a value opens both ways to set it",
                  body: "A free-text field on top — a ramp reference like brand-600, an @role, a raw hex, or a typed reference like radius:md — with a colour well beside it where a colour is what's being held, and a searchable list of every variable that could legally feed this one below. The list only ever offers variables of the same type, so there's no illegal link to recover from.",
                },
                {
                  label: "Names, adds and deletes",
                  body: "Rename a variable in place and every reference and component binding follows. Hovering a row offers copy and delete; the set header renames or deletes the whole set, and “+ Variable” adds to it — picking what the new one holds (a colour, a spacing step, a radius, a type size, a weight, a family, an elevation) before you name it.",
                },
              ]}
            />

            <SubHeading>Modes are columns, and you can add them</SubHeading>
            <p>
              Light and dark are the two every system starts with, not the two it&apos;s limited to.{" "}
              <strong className="font-medium text-fg">+ Mode</strong> adds a column — a brand theme,
              a high-contrast pass, a print variant — and every variable in the file gains its own
              value in it. A new mode starts as a copy of an existing one rather than empty, because
              an empty column is every token in the file dangling at once — but it is a copy, not a
              link: the two are independent from the moment it exists, right down to their own
              elevation ramps.
            </p>
            <p>
              A mode belongs to the file, not to one surface, so it is added and edited from either
              place that shows you columns: the set header here, and{" "}
              <strong className="font-medium text-fg">Add mode</strong> on the Semantic roles and
              Component tokens tables on step 1. Both write the same thing — a column that appears
              everywhere the other one looks.
            </p>
            <FieldList
              items={[
                {
                  label: "The column header is the mode",
                  body: "Its chevron opens rename, duplicate and delete — on the Variables table and on the Colour step's tables alike. That's deliberate: the place you notice you want another mode is while looking at the ones you have.",
                },
                {
                  label: "Every mode stands on its own",
                  body: "A mode is not a variant of Light or Dark. It owns its column of values and its own elevation ramp — Dusk tunes its own depth rather than borrowing Dark’s — and nothing flows between two modes after the one-time copy that seeds a new one.",
                },
                {
                  label: "Reads as — Auto, Light or Dark",
                  body: "The only question left for anything outside the token map (the frame a preview sits on, which end of a raw ramp is the wash) is whether a mode reads light or dark. Auto answers it from the mode’s own surface-base, so you never declare a parent; pin it by hand only when your surfaces don’t say.",
                },
                {
                  label: "Light and Dark can't be deleted",
                  body: "They can be renamed, but not removed — not because other modes derive from them, but because the two are the file’s fixed export contract: the :root/.dark pair every CSS export writes, and the pair the contrast audit reports against.",
                },
                {
                  label: "Every mode ships",
                  body: "Extra modes export as [data-ark-mode=\"<id>\"] blocks in the CSS, as their own Figma variable modes in the bundle, and as their own section in the generated docs. The preview switcher in the top bar lists them all.",
                },
              ]}
            />

            <SubHeading>Creating a set</SubHeading>
            <p>
              <strong className="font-medium text-fg">New set of variables</strong> opens the same
              panel from everywhere it appears: the rail, the top of the table&apos;s sets list, the
              <em> + </em> on each tier heading beside it, the{" "}
              <strong className="font-medium text-fg">New set</strong> button on each band&apos;s
              header on the map, and the foot of the map. The two that sit inside a tier open the
              panel on that tier. Name an empty set (a{" "}
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

            <SubHeading>Reading the connections</SubHeading>
            <p>
              Every alias <em>you</em> made is drawn. The exception is the one that matters: a
              component property still sitting on the binding its schema shipped with. On a stock
              file those are three quarters of every wire on the canvas — several hundred
              connections nobody chose, each crossing the whole picture to land on a folded card —
              and with them drawn there is nothing else to see. Every card and row stays on the map
              regardless; only the ink is held back, and it comes straight back when you point at a
              component, select a role that feeds it, or press{" "}
              <strong className="font-medium text-fg">the count in the Component properties band
              header</strong>.
            </p>
            <p>
              What&apos;s left is made readable by contrast rather than subtraction. Click a
              variable and its chain goes opaque and thick, plugged at the source and arrowed where
              it lands, while every other wire drops to a twelfth of its weight —{" "}
              <strong className="font-medium text-fg">and stays that way</strong>. Nothing you hover
              over afterwards takes the answer away; a pill at the top of the canvas names what
              you&apos;re holding, counts how much of the file is in its chain, and lets go of it.
              So does <Key>Esc</Key>, and so does a click on bare canvas. Clicking a card&apos;s
              header holds the whole set the same way.
            </p>
            <p>
              <strong className="font-medium text-fg">A wire can be held too</strong>, and it&apos;s
              the narrowest of the three: click one and it lights its own two variables — the one
              being followed, marked on the edge the wire leaves, and the one following it, marked
              on the edge it arrives at — while everything else on the map, including the rest of
              those two cards, drops back. That&apos;s the question a single link is picked to
              answer: not what a variable reaches, but <em>which two rows does this one join</em>.
              A held wire keeps its <em>Detach</em> button parked on it in full, rather than as a
              dot that exists only while the pointer stays inside it, and the pill names both ends
              and offers the cut a second time. If either end is on a folded card, the pill offers
              to unfold it. In <em>Selected</em> view, holding a wire leaves that one link alone on
              the canvas.
            </p>
            <p>
              Two other views for when the weave really is too much. <em>Summary</em> draws one{" "}
              <em>ribbon</em> per pair of sets: coloured by the lane its values come from, as thick
              as how many run along it, arrowed the way they travel, and labelled with that count.
              Twenty ribbons say what three hundred wires couldn&apos;t. And a ribbon isn&apos;t
              only a summary you point at —{" "}
              <strong className="font-medium text-fg">click one and it opens</strong>, listing every
              link it carries by name; each row jumps to the variable or cuts the link outright.{" "}
              <em>Selected</em> goes further and draws nothing at all until you pick something,
              which is the one to reach for on a very large file.
            </p>
            <FieldList
              items={[
                {
                  label: "Solid",
                  body: "The alias holds in every mode the file has — the ordinary case.",
                },
                {
                  label: "Dashed",
                  body: "It doesn't. A token pointing somewhere different in one mode draws a separate link for each group, landing side by side on the row, and the opened ribbon labels each with how many modes it covers.",
                },
                {
                  label: "Links: All / Summary / Selected",
                  body: "What's drawn at rest. All is the default — every authored wire, with the held chain brought forward against the rest. Summary draws one ribbon per pair of sets instead, opening into wires wherever you point or click. Selected draws nothing until you pick a variable, then that one chain; it's the lightest of the three on a very large file.",
                },
                {
                  label: "Default wiring",
                  body: "Off at rest, and the single biggest reason the map is readable. It's the toggle in the Component properties band header — and the matching checkbox in the rail — and it turns the several hundred untouched schema bindings back on. Worth doing once to see the true shape of what a component library consumes; worth turning off again to work.",
                },
                {
                  label: "Holding one link",
                  body: "Click a wire. It goes thick and blue, the two variables it joins are marked on the sides it actually touches, and every other row and wire on the map — the rest of those two cards included — steps back. Its Detach button stays put while it's held. Click it again, press Esc, or click bare canvas to let go; a drag that starts on a wire still pans the canvas, so only a click takes hold.",
                },
                {
                  label: "Wires: Curved / Elbow",
                  body: "How a connection is routed. Curved leaves and lands flat, so which row each end belongs to is unambiguous and a dense band fans out rather than stacking; it's the default. Elbow runs out, down a shared vertical trunk, and back in with rounded corners — easiest to trace when there are a handful of wires between two cards, worst when three hundred share the trunk.",
                },
                {
                  label: "Folding a card",
                  body: "The chevron on any card header (or a double-click on it) collapses the card to its header, and every link into or out of it gathers onto that one point. Expand-all and collapse-all, in the same toolbar, do the whole file at once — collapsing everything is the fastest way to see the shape of a system. Which column a card sits in doesn't change when you fold it, so opening one card never rearranges the rest of the map.",
                },
              ]}
            />

            <SubHeading>Wiring and unwiring</SubHeading>
            <p>
              Every row carries a <strong className="font-medium text-fg">+</strong> handle on each
              side it can be joined on — left for what it follows, right for what follows it — and
              the handle does two things.
            </p>
            <FieldList
              items={[
                {
                  label: "Click it for the list",
                  body: "A small menu opens beside the row holding every variable in the file that could legally take the link, grouped by set and searchable. On the right-hand handle they're checkboxes: tick as many as you like and Connect wires them all in one press, as one edit and one undo. On the left-hand handle they're single choices, because a variable follows exactly one source — pick it and you're done. This is the one that scales: the list is the whole file, so the target doesn't have to be on screen, or even drawn (a ramp step hidden by “Hide unused primitives” is offered here, and its card appears the moment something points at it).",
                },
                {
                  label: "Or drag it onto a target",
                  body: "Quicker between neighbours, and the gesture to use when you can already see where it's going. While a link is in flight every row that could legally take it stays lit and the rest fade, so a drop is never a guess: the rule (a colour takes a colour, a primitive holds literals, a link can't loop back on itself) is answered up front rather than after you release. Esc cancels.",
                },
              ]}
            />
            <p>
              Either way the edit lands in the mode the toolbar is showing and offers to spread to
              the rest — see <em>Mode</em> below.
            </p>
            <p>
              Cutting one is the same gesture from three places: point at a wire, hold it (its
              Detach stays put and everything else gets out of the way), or use the row for it in
              an opened ribbon. Wherever it appears, that button sits on the stretch of the wire
              that&apos;s in the open rather than at its exact middle, which on a full map is
              usually behind a card. On a token, a cut detaches the link and freezes the colour it
              currently resolves to, so the system looks identical the instant after. A component
              property still on its shipped binding has nothing to cut — there&apos;s no stored
              value to remove — so it says so instead of offering a button that would do nothing;
              point it somewhere else to change it. The inspector does the same work in words — it
              states what the selected variable follows, offers a searchable list of everything that
              could legally feed it, and shows the whole chain in the direction the value travels. In
              the table, that same work is a click on the value.
            </p>
            <p>
              One control worth knowing before you wire anything:{" "}
              <strong className="font-medium text-fg">Mode</strong>, in the map&apos;s toolbar and at
              the top of the rail, decides which mode a new link writes to <em>and</em> which links
              are drawn. It opens on <em>Light</em>, because one mode is the clearer picture: a
              token whose modes disagree contributes one wire instead of one per mode, and the wire
              you are looking at is the wire you are editing. A link made that way lands in that one
              mode and its confirmation offers to spread it to the others — take the offer or
              don&apos;t. <em>All modes</em> writes every mode at once, as before.
            </p>

            <SubHeading>Getting around the canvas</SubHeading>
            <FieldList
              items={[
                {
                  label: "Pan and zoom",
                  body: (
                    <>
                      Drag the background to pan, scroll to pan vertically, <Key>⌘</Key> + scroll to
                      zoom. The zoom controls, <em>Fit to view</em> and <em>Tidy up</em> sit
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
                  body: "The rail's Tiers toggles drop a whole lane and individual sets have an eye toggle. “Hide unused primitives” is on by default and drops every ramp step nothing references yet — which is most of them on a fresh file; the Primitives band header says how many, and puts them back.",
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
              design system, and none of it is exported. A card you drag keeps an <em>offset</em> from
              its own slot rather than a position on the canvas, so folding something above it, or
              switching between Lanes and Packed, moves it along with its lane instead of stranding
              it on top of a neighbour. <em>Tidy up</em>, next to the zoom controls, drops every
              offset at once; a single card's own header offers the same thing for itself.
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
              actually renders text or a border on in the shipped preview — in every
              mode the file carries, so a stock light/dark system is 34 checks and a
              third mode makes it 51. This runs live in the Roles tab (with an inline
              warn-and-override on any change that would fail) and again as a static
              audit summary you can review before shipping.
            </p>
            <p>
              Every ratio is taken between two <em>opaque</em> colours, never between whatever a
              token literally stores. A translucent value like{" "}
              <span className="font-mono text-fg">brand-600/40</span> is composited over what
              actually sits behind it first — its declared background, or a white page if
              nothing else is behind it — so a token that reads as pale pink on screen is scored
              as pale pink, not as the saturated 600-shade its value names. Declared backgrounds
              extend the same 17-pairing logic past the file&apos;s own surfaces: name one — a
              hex, a ramp step, an <span className="font-mono text-fg">@role</span> — from the
              Contrast audit tab, and every text and border token is added to the audit against
              it, in every mode, exactly like a surface the system already owns.
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
                      Semantics (one Figma mode per mode in your file, aliased to
                      primitives) — plus a
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
                  body: "Every primitive and every semantic role, in every mode the file carries.",
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
                  body: "Primitives (single mode) and Semantics (one Figma mode per mode in your file, aliased to primitives) — real Figma variables, so a mode swap on a frame reskins everything bound to them.",
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
                  body: "No — the chrome toggle (top right) only changes how the builder itself looks. Your system's modes are configured separately: their values on step 1 (Colour) or in Variables, their elevation on step 4 (Shape). The Preview switch beside it walks the canvas through them, and dims itself on the surfaces that already show every mode at once.",
                },
                {
                  label: "Where did the opacity slider go?",
                  body: "Into the colour well. It used to be a slider parked on every colour row (Colour step and Variables alike), mostly sitting at 100% and costing the row its width — click the swatch and it opens a small picker with hue and opacity together. The row itself now shows a percentage chip only once a token isn't fully opaque, and the value field still takes a typed /NN if you'd rather skip the picker entirely.",
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
                      Check the two things that keep it calm are still on, because between them they
                      account for most of the wires on a full file:{" "}
                      <em>Draw default wiring</em> should be <em>off</em> (the toggle lives in the
                      Component properties band header and in the rail) and{" "}
                      <em>Hide unused primitives</em> should be <em>on</em>. Past that, move{" "}
                      <strong className="font-medium text-fg">Links</strong> off All — Summary
                      replaces every wire with one ribbon per pair of sets, and Selected draws
                      nothing until you click a variable. Then collapse the cards you aren&apos;t
                      reading; the collapse-all button folds every card to its header and gathers
                      its connections onto one point. <em>Elbow</em> wires share a trunk between
                      each pair of cards instead of fanning, which some files read better as.
                    </>
                  ),
                },
                {
                  label: "How do I disconnect one particular link?",
                  body: (
                    <>
                      Click the wire. It&apos;s held from then on — thick, blue, with both the
                      variables it joins lit and the rest of the map faded — and its{" "}
                      <em>Detach</em> button stays parked on it instead of appearing only while
                      you keep the pointer inside a hairline. The pill at the top of the canvas
                      names both ends and offers the same cut. If you can&apos;t find the wire in
                      the first place, click the variable at either end and read its chain, or
                      switch <strong className="font-medium text-fg">Links</strong> to{" "}
                      <em>Selected</em> so nothing else is drawn at all.
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
    </>
  );
}
