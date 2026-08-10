# Arkitype — Alpha Build Progress Tracker

> Compressed memory checkpoint. Update after every compiled module.

## Status: ✅ A WIRE CAN BE HELD + DOCS INSIDE THE FILE — implemented (2026-08-10)

**A wire was the one thing on the map you could only hover.** Rows pin, cards
pin; a link's two ends and its cut button existed for exactly as long as the
pointer stayed inside a 14px band, on a canvas carrying three hundred of them.
So the answer moved every time you did, and "disconnect *this* one" meant
re-finding a hairline among its neighbours. `pinnedEdge` joins `ui.selected` and
`pinnedCard` as a third, mutually exclusive pin (`VariableCanvas`):

- **Two rows lit, and no more.** `chain` returns `{edge.from, edge.to}` for a
  held wire — deliberately not `relatedNodes`, and not the cards those rows sit
  on: a link is picked precisely to be separated from its neighbourhood, so
  answering with the neighbourhood puts it back in the crowd. Each end is marked
  on the side the wire actually touches (`inset -2px` on the source, `inset 2px`
  on the consumer), which is direction without tracing.
- **Detach stays put, and spells itself out.** The midpoint control renders as a
  labelled pill for the held wire (counter-scaled against the zoom, like the
  ribbon chips) and keeps the 20px circle for a hover. The pill at the top names
  both ends, carries the same cut, says `only in <mode>` for a partial alias, and
  — when an end sits on a folded card — offers to unfold it.
- **The gesture is a click, not a swallowed mousedown.** The hit stroke is
  tagged `data-var-wire`; `startPan` reads it and, on a click that never moved,
  holds that wire instead of releasing everything. Stopping the mousedown on the
  path would have been one line and would have made most of an All-view canvas
  unpannable — at a zoomed-out scale those hit areas are 30px wide.
- Survives the views: in Selected, holding a wire leaves that single link on the
  canvas (the two-node chain is what `drawnEdges` filters against). Starting a
  connection drops the pin, since a held wire dims exactly the rows a drop needs
  lit. A cut link, or one whose cards get hidden, releases itself.

**The documentation moved into the file.** It was a separate route, so looking
up what *Elbow* does cost you a tab and your place in a canvas you'd panned,
zoomed and half-wired. `LeftTab` gains `"docs"` and it takes over the canvas the
way Variables does (`CANVAS_TABS` now names both, and both are restored to
`layers` by anything that navigates to a step).

- One source of words: `components/docs/DocsContent` holds every `<Section>` and
  is rendered by both `/docs` and the in-file view. Two copies would have been
  one copy and one lie inside a week.
- The rail becomes the contents (`DocsPanel`): grouped section list, a filter
  over section names, and an active row read off the page as it scrolls — the
  last section whose top has passed a reading line, coalesced to a frame. (An
  IntersectionObserver ratio contest flickered between neighbours the whole way
  down sections that run for several screens.)
- `DocsView` is `next/dynamic`, `ssr: false`. The contents list lives in its own
  `docsNav` module so the rail can offer the manual without importing it: `/`
  first load **399 kB**, down from the 420 kB a static import cost.
- Reachable two ways — the rail tab, and a book in the top bar that also opens
  the rail if you'd put it away, because the contents live in it.

**Docs caught up with everything since the last pass**: holding a wire, the
four-tab rail, the top bar's book, and cutting a link (including why a property
on its shipped binding offers no cut). New FAQ entry for "how do I disconnect
one particular link". The two in-app hint lists that still said *hover a wire*
now say *click* one.

Verified live: clicking `secondary-200 → feedback-info-border` holds it, dims
122 rows, marks both ends on the correct sides and parks Detach on it; a second
click lets go; a drag from the same wire still pans; a link into a folded Button
card offers *Unfold the end* and lands on `label · colour` when taken; in
Selected view the held link is the only wire drawn. Docs tab renders in the
canvas in both chrome themes, jumps to `#figma-plugin` on a contents click, and
follows the scroll. `tsc` clean, `next build` clean.

## Status: ✅ THE WHOLE COMPONENT LIBRARY IS ON THE MAP — implemented (2026-08-10)

**The lanes ran to a shared floor, and three of the four were mostly empty.**
Each tier plate was stretched to the depth of the deepest lane, so a complete
lane drew a thousand pixels of tinted nothing under its last card — which says
"something belongs here and is missing" about a lane that is in fact finished.
Each plate now stops at its own last card (`bands`, `VariableCanvas`). Measured
after: 3376 / 1618 / 944 / 3514px, instead of four identical 3514s.

**The component lane held two cards out of a fifty-three component library.**
`usageCollections` was built from *stored overrides only*. That kept it small
and made it useless: the one thing you come to a map for — see where a component
gets its colour, then point it somewhere else — could only be done for wiring
you'd already done somewhere else. It's now derived from `COMPONENT_SPECS` and
`COMPONENT_LANES`:

- **53 cards, 376 rows**, in the library's own lane order (Controls · Display ·
  Navigation · Patterns), not alphabetical — a component sits where it sits in
  the Components step.
- Every property on the binding it **actually renders from**: the schema's
  default until you move it, your override after. Both are real wires, so the
  edges into this lane finally mean something; defaults are drawn a shade back
  and carry `usage.overridden: false`.
- A stateful property earns extra rows only for the states the schema genuinely
  distinguishes (Button's background on hover and active — not its focus, which
  *is* its default), plus any state you've overridden. Button is 20 rows rather
  than 34; Toast is 5.
- Colour rows resolve through the chain to a real hex via `bindingSwatch`,
  instead of the black chip `RowMark` was drawing for a missing swatch.

**Volume, handled by folding rather than filtering.** `VarCollection.
defaultCollapsed` starts every untouched component folded, so the lane reads as
a list of 53 names and the customised ones are the cards already open. That
needs two exception lists on the store (`collapsed` / `expanded`, replacing
`toggleVariableCollapsed` with `setVariableCollapsed(id, collapsed)`), because
the map now has two starting points. Both sets lists — the table's and the
rail's — sub-head the component entries by lane.

Unlink is hidden wherever there's nothing stored to cut: a default is *moved*,
not cut. Where it does apply it now reads "Back to default".

Verified live: all four plates end on their own cards; 53 cards in the lane;
binding Toast's background to `brand-500` from the table stores the override,
shows "Back to default", and reverts to `role:surface-elevated` with the full
neutral-100 → surface-elevated → Container · Background chain. `tsc` clean.

## Status: ✅ PANEL SWITCHES FOUND A HOME + PRIMITIVES GOT A ROUTE — implemented (2026-08-10)

Two follow-ups to the panel work below.

**The switches were invisible, and position was why.** Sitting them together in
the middle of the chrome cluster made them the third and fourth 32px bordered
icon in a row of identical ones. They now sit at the **two ends of the top bar,
each over the panel it controls** — the placement every editor that has ever
shipped this control uses, and the one that needs no explaining. One glyph per
side (`PanelLeft` / `PanelRight`, never swapped: an icon that changes shape
under the cursor reads as two different buttons); what changes is its state.

**Primitives had no way out of Variables.** Add/remove for every primitive scale
has always existed — it's the Tokens panel in the left rail (Colors, Spacing,
Radius, Font Families, Font Scale Steps, Elevation, Motion, each with its own
Add and per-row delete). Nothing was missing except a route to it, which is what
made the primitive sets feel read-only. No second editor was built.

- `primitiveHome(collection)` (`lib/variableGraph.ts`) maps a primitive set to
  its two real homes: the **step** that tunes the values, and the **Tokens
  section** that adds and removes steps.
- `focusTokenSection(section)` switches the left tab to Tokens, **un-hides the
  left panel if it's away** (the destination is inside it), and bumps a tick;
  `StageRail` scrolls to `#token-section-<id>` and rings it for 1.6s, so the
  panel says what it scrolled to instead of leaving you to guess.
- Three surfaces offer it: the table's primitive footer (`PrimitiveActions`),
  the inspector's action bar — generalised from a colour-only "Edit this ramp"
  to every kind — and a footer on the map's primitive cards, where the token
  cards' "New variable" sits.
- `hasCardFooter()` is now the single predicate for "this card draws a footer",
  read by both `cardHeight` (layout) and the canvas (render), since the height
  reserved and the row drawn have to agree.

Verified live: Spacing → "Add or remove steps" lands on the Tokens panel's
Spacing section with its Add button and all eight steps; the same from a colour
ramp's card on the map lands on Colors; and doing it with the rail hidden brings
the rail back first. `tsc` clean, production build green.

## Status: ✅ BOTH SIDE PANELS CAN BE PUT AWAY — implemented (2026-08-10)

`panels: { left, right }` on the store (persisted alongside `chromeTheme` — a
chrome preference, not file data), with `togglePanel`, `setPanel` and
`toggleAllPanels`. `StageRail` and both inspectors (`StepScaffold`'s aside and
`VariablesView`'s) return `null` when their side is off, so the canvas takes the
full width rather than sitting next to an empty gutter.

- **The switches are in the top bar, not on the panels.** A control docked
  inside a panel disappears with it; the top bar is the one thing always on
  screen, so whatever you put away is one click from coming back. The icons
  state which way round things are (`PanelLeftClose` ⇄ `PanelLeft`).
- `⌘\` / `Ctrl+\` hides both — and, if either is already hidden, brings both
  back, because that's the gesture people actually reach for. Ignored while a
  text field has focus.
- **Nothing is narrowed to an icon strip.** A half-rail still costs the canvas
  ~48px and can no longer say what anything is; a panel is either there or it
  isn't.
- Two things that would otherwise be lost with a hidden panel are kept:
  `StepScaffold` re-renders **Back / Continue** as a floating pair in the
  canvas's bottom-right (the wizard nav lives in the inspector footer), and the
  guided tour restores both panels on start, since two of its four stops *are*
  the panels.

## Status: ✅ STANDALONE MODES + TYPED VARIABLES — implemented (2026-08-10)

Four things the Variables surfaces were still getting wrong: a custom mode had
to declare itself a light or a dark one, the map had exactly one shape, adding
a set meant finding one button at the bottom of the canvas, and a component
token could only ever hold a colour.

**A mode stands on its own.** `ModeDef.base` is now optional and means
*override*, not parent.

- `modeBase(semantics, mode, primitives?)` reads a mode's appearance off its own
  `surface-base` — through its aliases, by luminance where a ramp is to hand and
  by step number where it isn't. Nothing declares a parent; the table's column
  chip says "reads as dark" and the menu offers Auto / Light / Dark.
- **Elevation is per mode.** `ElevationTokens` gains an index signature keyed by
  mode id (light and dark stay named keys, so every existing read still types).
  `elevationOf(primitives, semantics, mode)` falls back to the appearance ramp
  for a mode that hasn't got its own yet; `addVariableMode` clones one,
  `removeVariableMode` drops it, and add/rename/remove *level* apply to every
  ramp at once via `mapElevation` — a shadow name has to mean the same rung in
  every column. `ShapeStep` previews and edits all of them, not two.
- Light and dark are still undeletable, but the reason changed and the copy
  with it: they're the file's export contract (`:root`/`.dark`, the contrast
  audit), not the two appearances everything else descends from.

**Variables carry a type.** `TokenKind` moves into the store; a token's value
grammar grows an explicit prefix past colour — `space:3`, `radius:md`,
`text:sm`, `weight:medium`, `font:body`, `shadow:low`, `duration:fast`,
`ease:out`, `px:12` — deliberately the same vocabulary `lib/binding.ts` uses.

- `tokenKind()` follows `@alias` chains until something declares a type;
  colour is the answer when nothing does, so every pre-typed file is unchanged.
  `resolveTokenCss()` resolves colours to a hex (the audit needs one) and
  everything else to the `var()` of the primitive it names, so a radius token
  re-reads its scale the moment the scale moves.
- The graph treats a typed value as a real edge: `valueSource` maps it to the
  primitive node, `tokenValueFor` is the inverse (what a dropped wire writes),
  `findIssues` validates it against its own scale rather than reporting a
  missing swatch, and `acceptsKind` does the rest — the picker only ever offers
  variables of the same type, so an illegal link can't be made.
- The seed component sets carry what a component *is*: `button-radius`,
  `-padding-x/y`, `-gap`, `-font-size`, `-font-weight`; `card-radius`,
  `-padding`, `-gap`, `-shadow`; `input-radius`, `-padding-x/y`, `-font-size`.
  `backfillComponentShape` tops up an older file's set **only when its token
  list still reads exactly as it shipped**, so a set anyone has touched is left
  alone; idempotent by construction.
- Exports follow: CSS emits the var() indirection, Tailwind routes each token
  into the scale that matches its kind (`colors` keeps only colours),
  Figma exports typed tokens as FLOAT/STRING aliased to the primitive, and the
  docs' extra-mode blocks use `resolveTokenCss`. `freezeTokenValue` is what
  "unlink, keep the current value" writes — a hex for a colour, `px:N` for
  anything measured, and nothing at all for a kind with no literal form.

**The map has two shapes.** `autoLayout(collections, collapsed, layout)`:
`"lanes"` is the fixed single column per tier, `"packed"` wraps each band into
as many sub-columns as it needs to stay ~780px deep, so a whole system fits a
screen. Card drags persist per layout (a position that means something in one
means nothing in the other), and `fitWidth` fits both dimensions in packed.

**Creating a set happens where you're looking.** Every band header on the map
carries a `New set` button in its own accent, and every tier heading in the
table's sets list carries a `+`; both open the create panel already on that
tier (`variablesUI.createKind`). The card footer's `New variable` wears its
card's accent instead of being the faintest thing on it, and adding a variable
picks what it holds before naming it (`addRole(group, name, kind)`, seeded by
`seedValueFor`).

Verified live on :3111: Card and Button sets show their radius/padding/type
rows resolving to real px against this file's scales; the CSS export emits
`--ark-button-radius: var(--ark-radius-md)` and Tailwind keeps `colors`
colour-only; a third mode flipped its own reading to "dark" the moment its
`surface-base` moved to `neutral-900`, and `ShapeStep` grew a third elevation
preview and a third Editing tab for it. `tsc --noEmit` clean, production build
green.

## Status: ✅ MODES AS A LIST + A LEGIBLE VARIABLES MAP — implemented (2026-08-10)

Three things the Variables surfaces were getting wrong: modes were hardcoded to
two, the map's cards moved whenever a neighbour changed height, and its
connections could be pointed at but never opened.

**Modes are a list, not a pair.** `semantics.modeDefs: ModeDef[]` (`{ id, name,
base }`) alongside `semantics.modes: Record<modeId, Record<token, value>>`;
`PreviewMode` widens to a mode id. Light and dark are permanent (elevation
ramps, the contrast audit and the `:root`/`.dark` pair every export writes are
defined in terms of the two) but renameable; anything past them is the user's,
added from the table's `+ Mode` and managed from its own column header.

- A custom mode declares `base: "light" | "dark"` — its *appearance*. Everything
  outside the token map now asks `modeBase(semantics, mode)` rather than
  comparing the id to `"dark"`: `ThemeFrame`'s border, `systemCssVars`' shadow
  ramp, `useTone`, the disabled/alert fallbacks in `CoreComponents`.
- Every action that touched two maps now iterates `modeDefsOf`: `addRole`,
  `createVariableSet`, `removeRole`, `renameRole`, `removeGroup`,
  `backfillComponentTier`, `countTokens`, `togglePreviewMode` (cycles rather
  than flips). New modes seed from an existing one — an empty column is every
  token in the file dangling at once.
- Exports carry them: CSS emits `[data-ark-mode="<id>"]` past `:root`/`.dark`,
  the Figma bundle gives the Semantics collection one Figma mode per mode, and
  the generated docs get a block each. The contrast audit and both preview
  switchers (top bar, Studio) enumerate modes instead of assuming two.
- Persist **v15**; `backfillModes` repairs a def with no map and a map with no
  def, and runs unconditionally on cloud loads (rows carry no version).

**One column per lane on the map.** `autoLayout` stops packing a tier into
balanced sub-columns. It costs height (which you scroll) and buys a stable
order (which you can't get any other way): a set is always where you last saw
it, and every connection runs cleanly between two columns instead of
criss-crossing inside one. Initial framing is `fitWidth` — a true fit renders a
4,500px-deep map at 8%, where nothing has a name.

**Connections you can open.** Ribbons were white, unselectable, and reported a
count you then couldn't chase.

- A ribbon now wears the tier colour of the values it carries, and **clicking it
  opens a list of its links by name** — each row jumps to the variable or cuts
  the link. That's the fix for "it says five and I can't find them".
- Linking accepts drag *or* click-then-click, and while a link is in flight
  **every legal target stays lit while the rest fade** — the rule is answered
  before the drop, not after. `Esc` cancels; a status bar counts the targets.
- Two controls removed, one kept: `Wires: Bundled/All/Focus` → `Links:
  Summary/All`, and the Elbow/Curve routing toggle is gone (one routing, the one
  whose shared trunks can be traced). `VariableEdge` carries `modes: string[]` +
  `binding: boolean` instead of a single-mode enum, so a dash now means "not in
  every mode" rather than "light only".
- `VariablesUI` dropped `wireStyle`/`wireDensity` for `links`, and `editMode`'s
  `"both"` became `"all"` — it's never persisted, so no migration.

Verified live on :3111 through a temporary `/varcheck` harness (added,
exercised, removed): added/renamed/deleted a third mode and watched the table,
the inspector's per-mode editors and the map's dashes all follow; opened a
ribbon and read its ten links; wired `surface-sunken → neutral-400` by drag and
confirmed it landed in all three modes; armed a link by click and saw 43 legal
targets lit. Clean console, `tsc` clean, production build passes.

## Status: ✅ DEPLOYED + SEO — implemented (2026-08-04)

Live at **arkitype.srinidhibhat.com**. Full rationale in `HANDOFF.md` §7b.

- **`lib/site.ts`** is the single source of the host — metadata, sitemap, robots,
  JSON-LD, and the Figma plugin's `allowedDomains` all read it.
  `NEXT_PUBLIC_SITE_URL` overrides for previews.
- **Marketing surfaces get real SEO**: title template, canonicals, OG/Twitter,
  `SoftwareApplication` JSON-LD, `sitemap.xml`, `robots.txt`,
  `manifest.webmanifest`, and a generated 1200×630 OG card
  (`app/opengraph-image.tsx` — no custom font, no external asset, so it can't
  fail on a network hop). `/docs` got its own `layout.tsx` purely to carry
  metadata, since the page itself is a client component.
- **⚠️ `/p/*` is `noindex` + `Disallow:`, deliberately.** The slug is the access
  grant (`select using (true)`), so indexing published styleguides would turn
  "anyone with the link" into "anyone with a search box". Published slugs must
  never enter the sitemap. Unfurls in Slack/iMessage still work — those fetch
  the URL directly and don't consult robots.
- **Figma plugin `allowedDomains` narrowed** from `"*"` to the real origin plus
  localhost — the follow-up left open when the host was undecided.
- Three defects that only rendering could catch: the root layout's
  `canonical: "/"` was being **inherited by published pages**, declaring the
  homepage as their canonical (every non-root route now self-references); the
  `/docs` title double-branded through the title template; and the manifest
  claimed icon sizes the files didn't have.
- Verified against a **production build**, not just dev: `robots.txt`,
  `sitemap.xml`, `manifest.webmanifest`, and `/opengraph-image` (real 1200×630
  PNG) all serve; `og:image` resolves to the absolute site URL in prod (it shows
  `localhost` in dev — dev-only); a published page renders exactly one robots
  tag, `noindex, nofollow`, proven by temporarily stubbing the snapshot fetch
  (added, exercised, removed — `grep TEMP-VERIFY` clean).

## Status: ✅ FIGMA PULL SYNC + FORM-FACTOR × INDUSTRY PROOFING — implemented (2026-08-04)

Overhaul-plan Phases 3 and 4, closed together. Full detail in `MAJOR_OVERHAUL_PLAN.md`.

- **Audit first, and it moved the goalposts.** Three of Phase 3's four items were
  *already built* by earlier work — the plugin was never a one-shot import. `ark:pageId`
  /`ark:sectionId`/`ark:componentId` plugin-data tags plus name-matched variables already
  gave update-in-place re-sync (instances survive), and component bindings/options were
  already in the bundle. Only the pull path was genuinely missing. **Don't trust a plan's
  checkbox over the code.**
- **`app/api/figma/[slug]`** — serves the compiled bundle for a *published* system.
  Deliberately **reuses the publish slug instead of minting a second public surface**:
  `published_snapshots` is already the only anon-readable table, already audited, and its
  random slug suffix is already the access grant. Trade-off accepted and stated in the UI:
  pulling into Figma requires publishing first.
- **`compileFigmaBundle` narrowed to `FigmaBundleSource`** (`Pick<ArkitypeState,
  primitives|semantics|components|meta>`) so a snapshot feeds it with no faked state.
  Same narrowing on `countTokens` and `collectUsedIcons`. All in-app call sites unchanged.
- **Plugin Pull field** (`figma-plugin/ui.html`) — takes the sync link or the `/p/<slug>`
  styleguide link; remembers the last one in `figma.clientStorage` so re-pull is one
  click. `manifest.json` needed `allowedDomains: ["*"]` because the workspace host is
  user-chosen — **narrow it once the app is deployed**. ⚠️ The plugin ships separately:
  no user has Pull until it's rebuilt and republished to the Community.
- **Proofing = form factor × industry, two independent axes** (user's call). 3 layouts
  (`components/factory/ProofingSurfaces.tsx`) × 3 content packs
  (`lib/proofingTemplates.ts`) = 9 combinations, not 6 hand-built templates. Mobile
  enforces a 44pt touch floor at 390pt; Marketing loads the display end of the type scale.
  Density (real primitive, via Phase 1B's `setDensity`) and an all-six-`INTERACTION_STATES`
  strip round out the state switcher the feedback asked for.
- **`lib/` still doesn't import from `components/`** — `ProofingRow` is declared
  structurally identical to `Txn` rather than imported, and icons are string keys.
- Two defects typecheck could not catch, found by looking: **`--ark-text-md` doesn't
  exist** (scale is xs/sm/base/lg/xl/2xl/3xl/4xl) so hero copy silently inherited its
  size; and the mobile status bar used Apple private-use SF Symbol glyphs that render as
  tofu off-Apple.
- Verified: `tsc --noEmit` exit 0; `check-contrast` + `check-figma-props` + `test-exporter`
  pass; plugin `npm run build` clean; endpoint returns a correct 404 + CORS headers on
  `:3111`; snapshot→bundle compile proven against a **real default project state** (170
  variables, 53 components, 294 variants, 2,523 style bindings). **Unverified:** a
  signed-in publish → pull round-trip (no credentials this session).

## Status: ✅ PUBLISHED STYLEGUIDE + COMPONENT PLAYGROUND — implemented (2026-08-04)

The Zeroheight/Storybook answer, built as pure addition — the 8-step rail, the Ship
step's five artifacts, and the authenticated Component Studio are all byte-for-byte
unchanged. Full detail in `MAJOR_OVERHAUL_PLAN.md` Phase 6.

- **Component lifecycle** — `ComponentConfig.status?` (`"ready" | "beta" | "deprecated"`),
  read through `componentStatus(cfg)` so `undefined` ≡ `"ready"`. **No persist bump:**
  `partialize` keeps only `currentPreviewMode`/`chromeTheme`, so components never reach
  localStorage and a migrate branch would be dead code. Rail badge renders only for
  non-`ready`, so the default view is untouched.
- **`?component=` deep links** in the Components step, via `history.replaceState` (not
  router navigation — no Suspense requirement, no full-tree re-render, no back-button
  spam).
- **`published_snapshots`** — the first anon-readable table in the schema
  (`select using (true)`, owner-scoped writes). Slug carries a random suffix because with
  that policy **the slug is the access grant**; a name-derived slug would be enumerable.
  Slug is stable across republishes so shared links don't rot. The snapshot is a frozen
  copy, so edits after publishing stay private until republish.
- **Ship → Publish tab** (publish / republish / take offline / copy link) and the public
  routes `app/p/[slug]` + `app/p/[slug]/components/[componentId]`.
- **The published site renders only what generation already produced.** No authoring
  surface, no editable pages, no per-component story files — that's the differentiator
  against both competitors, and the thing to protect in review.
- Two bugs only live verification could find: render-time store hydration 500'd every
  component page (persist writes `localStorage` during SSR); keying that effect on the
  snapshot object then looped infinitely. Both fixed — see the plan's Phase 6 notes.
- Verified: `tsc --noEmit` exit 0, `check-contrast` + `check-figma-props` pass, **53/53
  component pages 200 on an SSR sweep**, styleguide index renders 7 sections + 53 links
  with a clean console, light/dark confirmed against computed `ThemeFrame` backgrounds.
  ⚠️ **Not verified:** the authenticated surfaces (Publish tab, Lifecycle cluster, rail
  badge, `?component=`) and a real Supabase publish round-trip — no login credentials
  this session. `sql/arkitype_schema.sql` must be re-run in Supabase before Publish works.

## Status: ✅ FIGMA EXPORT FIDELITY + PROPERTY COVERAGE + 2 COMPONENTS — implemented
Alpha-launch pass. **No persist bump** — two component ids added, which
`backfillProjectState` self-heals (HANDOFF §6). `npx tsc --noEmit` clean, production
build green, `check-contrast` / `check-figma-props` / `test-exporter` all pass, plugin
typechecks. New components verified live on :3111 in both preview modes via a temporary
route (removed after).

⚠️ **Requires a Figma Community plugin republish to land for users** — see HANDOFF §7.
The bundle now carries two components and 87 new properties the published plugin
doesn't know about; against the old plugin, Drawer/Avatar group export as grey
`drawFallback` placeholders.

### change (export fidelity)
- **The Figma renderers ignored the studio's options.** ~16 components drew hardcoded
  sample copy regardless of what the designer configured: Navbar exported "✦ Arkitype /
  Home / Docs" when the studio said "Ledgerly / Overview, Ledgers, Reports"; Steps drew
  bare numbered circles and dropped step labels entirely; Divider, Spinner, Progress and
  Switch all have `showLabel`+`label` options whose labels were never drawn at all.
  `drawNavbarSidebar`, `drawNavigationLanes`, `drawStats`, `drawComplexDisplays`,
  `drawDivider`, `drawProgressSlider`, `drawStatusIndicators`, `drawSwitchControl`,
  `drawAdvancedControls`, `drawRating`, `drawTimeline`, `drawTree`, `drawTable` now read
  their options via `optText`/`optBool`/`optNum`/`optList`, with fallbacks mirroring the
  live component's own defaults.
- **Jumplist had no renderer.** Shipped in the previous release with no `case` in
  `drawComponentNode`, so it exported as a grey `drawFallback` box. Added `drawJumplist`
  (heading, marker rail/dot, nested indent, active item) mirroring `TokenJumplist`.
- **Figma component properties: 28 → 49 of 53 components** (107 → 115 properties).
  Tabs, Table, Navbar, Sidebar, Breadcrumbs, Steps, Field, Progress, Spinner, Divider,
  Switch, Rating, Popover, Timeline, Tree, Stat grid, Code block, Button group, Stepper
  had none — a designer couldn't edit an instance from Figma's properties panel at all.
  The four without properties (Slider, Icon button, Skeleton, Pagination) have nothing
  text-bearing to expose.
- **Unique layer names.** Duplicate names inside one variant made a single property
  rewrite every match — one "Column 1" hit the table header *and* both body rows; one
  segment label hit all three button-group segments. Renamed to `headerCol1`/`row1Col1`,
  `segment1..3`, `item1..4`, `crumbN`, `tabActive`/`tabInactive`, `label1`/`value1`, etc.
- **`scripts/check-figma-props.ts`** (new) — cross-references `FIGMA_PROP_DEFS` against
  the layer names the plugin source can actually produce, and flags any wired component
  with no renderer case. Both bugs above would have been caught by it. Throws (rather
  than passing) if it can't locate the dispatch switch.
- **Boolean properties now have layers to toggle** — spinner/switch/divider labels,
  field's required mark and help line are drawn unconditionally with `.visible` set,
  following `drawButton`'s icon-slot rule.

### change (size axis)
- **`lib/sizing.ts`** (new) — `SIZE_MAP` moved out of `CoreComponents.tsx` so the studio,
  the live components and the exporter share one definition. The studio has always let a
  designer pick a size; it never reached Figma, so every exported Input was medium.
- **`size` is a real Figma variant property** for Input / Textarea / Select / Search
  (`SIZE_VARIANT_COMPONENTS`) — 5 → 20 variants each, bundle total 229 → 289. Padding and
  type step resolve per size to the user's own `space/*` and `type/size/*` aliases, never
  hardcoded numbers. Button/Icon button held back deliberately (40 × 4 = 160 variants).

### change (components + a11y)
- **Drawer** (Patterns) — edge-anchored side sheet, the one overlay shape Modal doesn't
  cover. Left/right/bottom, scrim, nested Button + Icon button slot instances.
- **Avatar group** (Display) — capped overlapping stack with a "+N" overflow chip.
  Default overlap 8px (10px put the separator ring on top of the initials).
- **Keyboard-accessible project cards** — `renderCard` was a `div` with `onClick`, so
  files couldn't be opened from the keyboard and weren't in the a11y tree; its four
  hover actions were `opacity-0`, so keyboard focus landed on invisible controls. Now
  `role="button"` + Enter/Space (ignoring events from the nested controls), a focus ring,
  `focus-within:opacity-100` on the action row, and per-card `aria-label`s.
- **Counts derive from `COMPONENT_LANES`** in `app/docs/page.tsx` and the landing hero —
  they said "50" and "fifty" while the product shipped 51.

## Status: ✅ INIT WIZARD (scrape + framework twins + targets) — implemented
Phase 2 of `MAJOR_OVERHAUL_PLAN.md`. **No persist bump** — only optional `meta`
fields added. `npx tsc --noEmit` clean; verified live on :3111 (temporary store hook,
removed after) incl. a real scrape of stripe.com.

### change (project initialization wizard)
- **2-step wizard** — `NewFileModal`→`NewFileWizard` in `ProjectDashboard.tsx`.
  Step 1 "how do you start?": Blank / From-a-live-site / Material-twin / Tailwind-twin
  cards. Step 2: name, client, brand colour (HexInput, pre-filled from a scrape),
  density (hidden when a twin dictates it), target platform, engineering destination.
  Also absorbs the name+brand creative moment (Welcome.tsx is dead code for dashboard
  files). `PillGroup<T>` generic + `StartCard` helpers.
- **`applyInitConfig(config)`** (store) — one atomic `set` applied to the just-created
  project: brand + optional secondary/font (scrape only) + density + framework-twin
  structural tokens + `meta.targetPlatform`/`engineeringDestination`. `FRAMEWORK_TWINS`
  (material: spacious/0.5 radius/1.2 ratio; tailwind: standard/1.0/1.25) seed structure
  ONLY — never colour, so brand stays the user's. Twins force their own density over
  the config's; blank/scrape honour the picker.
- **`app/api/scrape/route.ts`** (new) — POST `{url}`, server-side fetch (avoids CORS),
  ranks colours from inline+linked CSS (freq × saturation, drops near-white/black/grey)
  + dominant non-generic font-family. SSRF-guarded (http/https only; localhost/private/
  bare-host refused), 8s timeout, 2MB/4-sheet caps. stripe.com → #533afd + sohne-var.
- **`meta.targetPlatform`/`engineeringDestination`** (optional, no migrate). `ShipStep`
  opens on the matching export tab via `DESTINATION_TO_ARTIFACT` (swiftui→docs until a
  Swift adapter exists — Phase 3).

## Status: ✅ v12 CLIENT WORKSPACES + DENSITY SWITCH + FRAMEWORK EXPORTS — implemented
Phase 1 of `MAJOR_OVERHAUL_PLAN.md` (full plan + source feedback there — read that
file first if resuming this line of work). Three self-contained pieces, persist
**v11 → v12**. `npx tsc --noEmit` clean; verified live on :3111 via a temporary
store debug hook (magic-link auth needs real email access this session lacked —
see the plan doc's Verified note for exactly what was and wasn't exercised).

### v12 change (client folders · density preset · Tailwind/MUI/CSS export)
- **Client/folder dashboard hierarchy** — `ProjectState.folder?: string` lives in
  the existing jsonb blob (no SQL migration). `store/useDesignSystem.ts` gained
  `moveProjectToFolder`/`renameFolderEverywhere`/`deleteFolder`; no "manage empty
  folders" concept — a client exists the moment a project carries its name, via a
  datalist-backed combobox, and disappears when the last project leaves it.
  `ProjectDashboard.tsx` groups into collapsible sections (named clients
  alphabetical, "Unfiled" trailing; flat grid unchanged when nobody has clients
  yet), with a "Move to client" hover action per card and rename/ungroup on
  section headers.
- **Density switch** — `primitives.density: "compact"|"standard"|"spacious"`,
  `DENSITY_PRESETS` sets `spacingBase`/`radiusScale` absolutely (3/4/5px,
  0.75/1/1.25×) so repeated switching never compounds rounding error.
  `setDensity` recomputes `spacing`/`radii` through the existing
  `buildSpacing`/`buildRadii`. **Not on Welcome.tsx** — discovered mid-build that
  dashboard-created files skip Welcome entirely (`createDefaultProjectState`
  sets `started: true`), so density+client now live in a new `NewFileModal` on
  the dashboard (the actual start of the flow), plus `SpaceStep.tsx` for later
  editing. Persist v11→v12 migrate backfills `density: "standard"`.
- **Framework adapter exports** (`lib/adapters.ts`, new) — the Ship step only
  exported Figma JSON + a markdown doc before; now also: `compileCssVariables`
  (real `:root`+`.dark` custom-properties file), `compileTailwindConfig`
  (semantic roles + primitive ramps + spacing/radius/type/shadow/motion, all
  referencing the `--ark-*` vars — the same pairing pattern shadcn/ui-style
  pipelines use, not a hex snapshot that goes stale), `compileMuiTheme` (fully
  resolved `createTheme()` sources, light+dark; `shadows` intentionally left at
  MUI's default rather than risk a wrong-length override). `ShipStep.tsx`
  extends the artifact segmented control 2→5 tabs via an `ARTIFACT_META` map.

## Status: ✅ v11 FULL MODIFIER PARITY (22 components) + CHROME A11Y/ZOOM FIXES — implemented
Every zero-option component (14) gained a full `options[]` set and the thin tier (8) was
deepened, all through the existing schema→factory→renderHero recipe with pixel-identical
defaults and no persist bump. Chrome accessibility pass: hover/selected-state legibility in
light mode fixed at the root (token-mixing bugs, no-op `ink-light`/`ink-dark` classes, missing
`focus` color), pinned-dark gate/landing kept self-consistent, and three canvas-zoom defects
fixed. `npx tsc --noEmit` clean; verified live on :3111 (light + dark chrome, focus ring
computed `#0d6ed8`, zoom→ring re-sync at 175%, PreviewStep clamps stored 1.75 → 1.25).

### v11 change (modifier depth · chrome a11y · zoom)
- **Modifier expansion — zero-option tier** (`lib/componentSchema.ts` + factory files +
  `ComponentStudio.tsx` renderHero threading):
  - *Display*: `progress` (bar/circle previewAxis, value, thickness, showLabel, label,
    indeterminate — new SVG circle + `ark-slide` bar animation), `skeleton` (media/text/card
    previewAxis, lines 1–5, `ark-pulse` animation), `stat` (trend previewAxis, label/value/
    delta text, showDelta, size sm/md/lg, caption + toggle), `kbd` (size previewAxis,
    space-separated keys → keycap row, optional + separator), `codeBlock` (filename, header
    toggle, traffic-light dots, line numbers).
  - *Navigation*: `navbar` (density previewAxis, brand text, comma-separated links, active #,
    search/avatar toggles), `sidebar` (expanded/collapsed previewAxis, header text + toggle,
    icons/accent toggles, active #, width), `steps` (orientation previewAxis with new vertical
    layout, comma-separated labels, current #, showLabels), `pagination` (numbers/simple/
    compact previewAxis with two new layouts, totalPages, arrows toggle), `dropdown` (trigger/
    icons/checkmark/divider/danger toggles, menu width).
  - *Patterns*: `listItem` (trailing previewAxis, rows 1–3, avatar/amount/badge toggles),
    `feedItem` (author/timestamp/body text — initials derived from author, avatar/actions/
    reply toggles), `field` (default/error previewAxis wired to the existing `invalid` render,
    label/help/error text, required + help toggles), `statGrid` (auto/2/3/4-column previewAxis,
    cells 2–6 cycling seed data, delta cascade into composed `TokenStat`).
- **Modifier deepening — thin tier**: `breadcrumbs` (+trail text, home icon, collapse-middle
  ellipsis), `link` (+label, size, weight), `divider` (+inset), `tooltip` (+size, multiline),
  `avatar` (+surface ring, stack count 1–4 avatar-group), `tag` (+subtle/outline style, size),
  `spinner` (+ring/dots/bars variants, staggered `ark-pulse`), `accordion` (+itemCount,
  defaultOpen — 0 = closed, allowMultiple via Set state; studio remounts on config change).
- **Chrome a11y — legibility** — the reported "text disappears on hover/selected in light
  mode" had four root causes, all fixed:
  - Token-mixing: `bg-fg hover:bg-white text-ink` → `hover:opacity-90` (v9 precedent) in
    `ProjectDashboard.tsx` + `AuthAndSurvey.tsx`.
  - **No-op Tailwind classes**: `bg-ink-light`/`bg-ink-dark` were never registered tokens —
    11 uses meant modals/cards/backdrops had NO background (TutorialTour popover,
    ProjectDashboard sidebar/search/modals/backdrops, AuthAndSurvey cards). Mapped to real
    tokens (`ink-raised`/`ink-panel`/`black` scrims).
  - **Missing `focus` color**: `focus:border-focus`/`active:bg-focus` at 9 call sites
    (ComponentStudio ×6, studioShared, StepScaffold + StageRail resize handles) generated no
    CSS. Registered `focus` in `tailwind.config.ts` backed by new `--c-focus` channel var
    (`#0d6ed8` light / `#0d99ff` dark) — all 9 sites lit up without edits.
  - **Gate background override**: `.canvas-dotted` (sets `background-color: rgb(var(--c-ink))`,
    unlayered so it beats Tailwind utilities) was on GateKeeper's pinned-dark roots — in light
    chrome the gate went light behind white text. New `.canvas-dotted-dark` (fixed #070709 +
    white dots) for designed-dark surfaces; landing page verified token-leak-free and stays
    pinned dark by design (user decision).
  - Light-mode contrast raises: `text-white` → `text-fg` on themed surfaces (dashboard h1 +
    modal titles, survey questions, tour title), `indigo-400`/`pink-400`/`red-400` accents →
    `-600 dark:-400` splits, selected nav `bg-white/5` → `bg-ink-hover`, dashboard cards/
    swatch containers off `zinc-*` onto `ink-panel`/`ink-hover`. StudioControls' opaque
    `bg-red-950/95` warning banner intentionally kept (self-consistent in both themes).
- **Zoom defects** —
  - `useHighlight.tsx`: `usePartBox` gained a `remeasureKey` param (+200ms settle re-measure
    for the transform transition); ComponentStudio passes `` `${canvasZoom}:${axisValue}` ``
    so the hover ring re-measures on zoom change AND when `previewRef` moves to another
    variant card (ref identity never re-fired the effect before — two staleness paths).
  - Axis-strip ring: active card carries Tailwind `scale-105` with the ring nested inside —
    measured (post-transform) boxes now divide by `ACTIVE_CARD_SCALE` to land exactly.
  - `PreviewStep.tsx`: shared persisted `canvasZoom` (Studio slider 0.5–2.5) now clamps at
    read to its own 0.5–1.25 range — no persist-shape change.
- **Deferred (flagged, not done)**: 393 arbitrary-px text classes (`text-[11px]` etc.) across
  24 chrome files bypass rem-based browser text-zoom; full-page zoom unaffected. Large
  mechanical migration — left out of scope deliberately.

## Status: ✅ v10 VISUAL POLISH, RESIZABLE PANELS, FIGMA-STYLE GROUPING, FIELD SCRUBBING & DESIGN SYSTEM UPGRADES — implemented
Fluent 2 shadows & double focus rings, Atlassian Rovo UI generative loading gradients, GitHub Primer ActionList checkmarks in custom dropdowns,
horizontal drag-scrubbing directly on input elements, prepended industry icons, resolved color picker clipping, updated the property
inspector layout to combine related properties side-by-side, corrected text wrapping, and implemented drag-resizing. `npx tsc --noEmit` clean; verified.

### v10 change (visual polish · inspector layout · resizable panels)
- **Design System Upgrades** — `components/factory/CoreComponents.tsx`, `ComponentStudio.tsx`, and `app/globals.css`:
  - **Fluent 2**: Upgraded focus outline rings to a high-contrast double ring (inner background offset + outer primary line) and added layered ambient shadow styles to button, input, textarea, and select controls.
  - **Atlassian Rovo UI**: Integrated a keyframe generative color gradient onto buttons in their loading state to show processing progress.
  - **GitHub Primer**: Styled dropdown options popups to render in a clean, vertical ActionList layout with trailing selection Check icons.
- **Figma-style Field Scrubbing** — `components/factory/ComponentStudio.tsx`: implemented `FigmaScrubbableSelect`
  and `FigmaScrubbableNumberInput` custom components, allowing users to click and drag horizontally directly on the field inputs to scrub
  values/options up and down, while preserving normal click actions (click select opens dropdown menu, click number enables manual text typing).
- **Figma-style Field Icons** — `components/factory/ComponentStudio.tsx`: added `getLabelIcon` mapper prepending
  industry-standard visual icons (corner radius curves, padding axes, dimension arrows, rulers, typography baselines/bold,
  color droplets, etc.) next to property and option text labels.
- **Searchable Color Picker** — `components/factory/studioShared.tsx`: added a search input box (`Search tokens...`)
  with `autoFocus` that filters tokens instantly. Converted the swatch grid into a vertical list row format displaying
  the monospace token names next to their swatch color chips.
- **Color Picker Clipping Fix** — `components/factory/StudioControls.tsx` & `ComponentStudio.tsx`:
  Repositioned picker wrapper from `right-full` (which clipped outside the sidebar border under `overflow-y-auto`)
  to `top-full mt-1.5` aligned to `left-0` (for left-column properties) or `right-0` (for right-column properties) to
  keep the color picker fully inside the sidebar boundaries.
- **Figma-style Grouping** — `components/factory/ComponentStudio.tsx`: implemented `groupedProps` and
  `groupedOptions` helpers to combine related property pairs (padding H/V, radius/borderWidth, typography
  role/weight, icon color/size, and toggles) side-by-side in `grid-cols-2`, while keeping color swatches and
  larger text inputs full-width. This reduces vertical panel height by 30% to 50%.
- **Resizable Sidebars** — `components/shell/StageRail.tsx` & `components/shell/StepScaffold.tsx`:
  Added drag-resize event handlers on left/right borders and increased default panel widths
  to `260px` (StageRail) and `360px` (StepScaffold) for a cleaner appearance. Custom panel
  widths persist in `localStorage` across page reloads and step navigation.
- **Timeline Audit Log** — `components/factory/TableSkeletons.tsx`: added `whiteSpace: "nowrap"`
  to the `Amount` component to prevent the minus sign from splitting and wrapping.
  Applied `text-overflow: ellipsis` truncation and `whiteSpace: "nowrap"` to the payee
  name in skeleton 4 to ensure single-line alignment of payee + amounts in cards.

## Status: ✅ v9 THEMEABLE CHROME + FLANKED STUDIO + HOVER-LINK — the tool chrome
is now theme-aware (light default + a proper dark) via CSS-var tokens (`--c-*`,
channel form) that flip on `.dark`; new Appearance toggle in TopBar (persisted
`chromeTheme`, distinct from the preview Light/Dark). The ComponentStudio was
re-laid from a cramped docked inspector into a live preview flanked by grouped
parameter clusters (container-query 3-zone → 2-zone → stack), and hovering a
cluster now rings the matching part on the preview via `data-ark-part` tags + a
measuring overlay (`useHighlight`). Priority controls tagged
(button/input/textarea/select/checkbox/radio/switch); untagged parts degrade
gracefully. `npx tsc --noEmit` clean; verified live on :3111 in both chrome
themes, hover-link, and responsive collapse. Also decoupled from Hued (removed
the stray `arkitype` entry from Hued's `.claude/launch.json`).

### v9 change (theme system · studio layout · hover-highlight)
- **Theme tokens** — `tailwind.config.ts` maps `ink/line/fg` to
  `rgb(var(--c-*) / <alpha-value>)`; `app/globals.css` defines `:root` (light) +
  `.dark` (dark) channel vars and moves body/scrollbar/focus/selection onto them.
  `darkMode: "class"`. Primary-button hovers `bg-neutral-300` → `opacity-90`
  (theme-neutral). Dotted canvas → `rgb(var(--c-fg)/0.07)`.
- **Chrome theme state** — `store/useDesignSystem.ts`: persisted `chromeTheme`
  (+ `setChromeTheme`/`toggleChromeTheme`), applied to `<html>` from
  `app/page.tsx`. `TopBar` gained the Appearance toggle + a "Preview" label on
  the existing preview segmented to disambiguate the two.
- **Studio** — `ComponentStudio.tsx`: clusters (Options + one per part) flank the
  preview; `useHighlight.tsx` (`usePartBox`, `[data-ark-part~=…]`) + an overlay
  ring; `data-ark-part` tags in `CoreComponents`/`SelectionControls`;
  `.studio-grid` container queries in globals.css; `ParamCard` restyled for light.

## Status: ✅ v8 STUDIO UX OVERHAUL COMPLETE — fixed the confusing colour picker,
added a unified Variant/State bar so every component's states/variants are
selectable-and-viewable, gave display comps (alert/toast/badge/banner) deep
configurable+exported options, and re-laid the studio into a Figma-style
toolbar + canvas + docked inspector. `npx tsc --noEmit` clean; verified live on
:3111 (fresh server, zero console errors after heavy cycling).

### v8 change (states clarity · deeper controls · Figma layout)
- **Swatch bug fix** — `components/factory/studioShared.tsx`: `Swatch` was a bare
  `<span>` (`display:inline`) so its inline width/height were ignored and the
  picker's Roles/Primitives swatches collapsed to slivers. Added `inline-block`
  (both branches). Also polished `ColorPicker`: a `SwatchButton` with a
  selected ring+check, larger 20px swatches, and a "currently bound to" header
  line (`describeBinding`).
- **Options model** — `lib/componentSchema.ts`: new `OptionSpec` +
  `ComponentSpec.options` + a `previewAxis` flag (one enum option becomes the top
  Variant selector + strip). Authored options for alert (tone[axis]/style/accent/
  icon/dismissible), toast (tone[axis]/icon/dismissible/action/elevation), banner
  (tone[axis]/icon/action/dismissible), badge (tone[axis]/style/dot), iconButton
  (variant[axis]). Helpers `componentOptions`/`optionValue`/`resolveOptions`/
  `previewAxis`; **read-time defaults, no persist bump** — stored under
  `ComponentConfig.properties` (already persisted + partialized + exported).
- **Factory options** — `TokenAlert` (CoreComponents), `TokenToast`/`TokenBadge`
  (DisplayComponents), `TokenBanner` (PatternComponents) thread the new props and
  render solid/outline styles, tone icons (lucide), close/action buttons, and
  elevation via `--ark-shadow-<level>`. Reuse `useTone()`. Defaults stay
  pixel-identical for reused call sites (badge in card/table). Alert uses longhand
  border sides (`borderStyle`/`border*Width`/`border*Color`) so the accent bar
  never mixes the `border` shorthand with `borderLeft` (kills a React rerender
  warning).
- **Figma studio** — `components/factory/ComponentStudio.tsx` rewritten into a
  sticky top toolbar (Variant selector from the axis · State selector labelled
  "Editing: <state>" · Light/Dark · Reset-all), a centre dotted canvas with the
  hero + a **clickable** strip that iterates variants (display) or states
  (controls) so you can view-and-select, and a docked right **inspector**:
  `StudioControls.tsx` gains `InspectorSection` (collapsible per schema part),
  `OptionRow` + `OptionToggle` (switch). Options section first, then Size, then
  one section per part. `renderHero` threads `opts`.
- **Export** — `lib/docs.ts` §6 adds a "Configured components" list recording each
  component's resolved options + colour/scale override count (Figma variables
  bundle stays tokens-only by design). `ComponentsStep` aside copy reworded.
- **Verified:** picker swatches now 20×20 `inline-block` squares (bug gone);
  Alert Variant bar re-themes hero+strip, Solid style + icon-off + accent render
  live; Badge strip shows all six tones; Button shows "Editing: Hover" with the
  Background card reading `action-primary-hover`; fresh server, 0 console errors
  after 30 option changes.

## Status: ✅ v7 COMPONENT STUDIO CANVAS COMPLETE — the component-editing UI
was re-skinned to a Figma-Make-style "Component Studio": the live component sits
centred on a dotted canvas with floating, labelled **parameter cards** in the
left/right gutters, **state tabs** + a **Light/Dark toggle** on top, and an
**interaction-states strip** below. Every card writes the *same* token binding as
the old inspector — this is a presentation-layer change over the v6 engine, not a
new data path. `npx tsc --noEmit` clean; verified live on :3111 across all four
lanes.

### v7 change (floating token-card studio)
Reference: user's Figma Make "Component Studio". Goal: parameters bind to
**design-system tokens** (roles/scales) instead of raw sliders/hex — except
genuinely-free values (padding/border-width stay sliders).
- **`components/factory/studioShared.tsx`** (new) — extracted `useInspectorData`,
  `Swatch`, `ColorPicker` out of `Inspector.tsx` (no behaviour change) so both the
  legacy inspector and the new studio share one picker + live option lists.
  `Inspector.tsx` now imports them.
- **`components/factory/StudioControls.tsx`** (new) — reference-style card kit in
  Arkitype's dark chrome: `ParamCard` (uppercase label + per-card reset),
  `TokenSegmented` (pills over token steps, short labels via `shorten()`),
  `TokenSlider` (Radix; space snaps to the spacing scale, dimension = free px),
  `TokenSwatchCard` (swatch + `describeBinding`, opens the shared `ColorPicker`).
- **`components/factory/ComponentStudio.tsx`** (new) — the canvas. `renderHero(id)`
  returns ONE representative instance per component (reuses the factory `Token*`
  components; `TokenSlider` from FormControls aliased `TokenSliderComponent` to
  avoid the name clash). State tabs drive the hero + stateful colour cards; L/D
  toggle re-themes a `ThemeFrame`; schema `parts→props` flatten into left/right
  cards; multi-state comps get the bottom states strip. Type→control map:
  color→picker, radius/textSize/weight/fontRole→segmented, space→snap slider,
  dimension→px slider; plus a Size card (Sm/Md/Lg) for sizable controls.
- **`components/steps/ComponentsStep.tsx`** — wired, non-skeletal comps now render
  `<ComponentStudio>` (replacing the dual-frame matrix + 300px side inspector);
  skeletal (modal/tabs/table) keep `SkeletonGrid`; the redundant aside Size select
  is hidden for wired comps; aside note reworded. Legacy `ComponentCanvas` +
  `ComponentInspector` retained for the (currently empty) non-wired fallback.
- **Verified:** Button (radius token none→full flips hero border-radius 4px→9999px
  computed; states strip renders Default/Hover/Focus/Active/Disabled; L/D toggle;
  BACKGROUND opens Roles/Primitives/Custom picker; per-card + Reset-all work),
  Badge (single-state, PADDING shows `space-2 · 6px`), Card (multi-part
  role-bound colour cards). Only console errors were the transient duplicate-def
  compile noise during the two-step Inspector edit; clean after.

## Status: ✅ v6 COMPONENT BINDING SYSTEM COMPLETE — the core "customise
components to your roles/variables" function, wired across **all 43 components
in all four lanes**. Persist bumped to **version 5** (v4→v5 backfills an empty
`bindings` map per component). `npx tsc --noEmit` clean; verified live at
http://localhost:3111.

### v6 change (deep per-part/per-state component customization)
Components can now be re-bound to the system — every visual attribute (a
button's prefix/suffix icon colour per state, padding, radius, border, font,
content colour…) can point at a role, a raw primitive swatch, or a literal hex.
- **`lib/binding.ts`** — binding grammar (`role:` `prim:` `hex:` `space:` `radius:`
  `text:` `weight:` `font:` `px:` `raw:`) → `resolveBinding()` returns a CSS value
  string, so the `--ark-*` cascade + per-mode theming still drive rendering.
  `bindingSwatch()`/`describeBinding()` power the inspector.
- **`lib/tokens.ts`** — `systemCssVars` now also emits `--ark-<family>-<label>`
  primitive vars (enables `prim:` bindings).
- **`lib/componentSchema.ts`** — declarative per-component styleable surface
  (parts → props, each typed + optionally per-state, with a default binding).
  Controls lane authored in full depth; other lanes have lighter surface/tone
  specs. `useComponentBindings(id)` returns `(key,state)=>css|undefined`;
  components fall back to their own hardcoded value when unbound (defaults stay
  pixel-identical). `WIRED_COMPONENTS` gates which render live.
- **Store** — `ComponentConfig.bindings`, actions `setComponentBinding` /
  `clearComponentBinding` / `resetComponentBindings`, persist v5 migrate.
- **`components/factory/Inspector.tsx`** — schema-driven inspector: parts as
  collapsible groups, colour rows with a Roles/Primitives/Custom picker + per-
  state pills + "apply to all states" + reset, scale/dimension rows, Reset all.
- **Factory refactor** — every factory component threads a `resolve` prop and
  wraps each hardcoded value as `resolve(key,state) ?? <existing expr>`:
  - Controls (full per-part/per-state depth): button (+prefix/suffix icon
    slots), input, textarea, select, searchField, stepper, slider, buttonGroup,
    iconButton (per-variant), checkbox, radio, switch.
  - Display: badge, tag, avatar, tooltip, progress, spinner, skeleton, alert,
    toast, stat, divider, kbd, emptyState, codeBlock.
  - Navigation: navbar, sidebar, breadcrumbs, steps, pagination, dropdown, link.
  - Patterns: card, listItem, feedItem, accordion, banner, field, statGrid.
  - Tone-driven parts (alert/badge/toast/banner/stat) keep their per-mode ramp
    recipe for colours; radius/padding/font + surface colours are bindable.
  `PreviewStep` button also threads the resolver, so the dashboard follows.
  `WIRED_COMPONENTS` now lists all 43; modal/tabs/table stay skeleton+radius.
- **`ComponentsStep`** — inspector column beside the live canvas; every non-
  skeletal part renders the live inspector.
- **Verified:** v4→v5 migrate clean (43 comps, 0 console errors); per-state/
  per-mode overrides render live — Button (default→success wash, hover prefix
  icon→error, full radius, wider padding), Toast + Card (feedback-error-surface
  → error-50 light / error-900 dark, computed styles confirmed); inspector
  picker write + per-row reset + Reset-all all work; Slider inspector shows
  Track/Fill/Thumb.

### Remaining (fast-follow)
1. New components 43 → 60–70+ across all lanes.
2. Typography + alias customization parity (per-step leading override UI,
   editable type-scale steps; unified TokenPicker in Roles).
3. Export component bindings into the Figma/docs bundle.

---

## Status (prior): ✅ v5 COMPONENT-LIBRARY EXPANSION COMPLETE — 23 → **43 parts** across
the same four lanes, every one token-driven (roles + scales + motion, dual
light/dark). Persist bumped to **version 4** (migrate v3→v4 backfills the 20 new
component ids). `npx tsc --noEmit` clean; verified live at
http://localhost:3111. Foundations (v4, below) unchanged.

### v5 change (component library 23 → 43)
Four new factory files, one per lane, reusing existing recipes (shared
`SIZE_MAP`/`focusRing` from CoreComponents + `useTone` from DisplayComponents
are now exported):
- **Controls +5 → 12** (`FormControls.tsx`): Icon button (solid/outline/ghost ×
  states), Button group (segmented), Slider (track/fill/thumb + states),
  Stepper (number input), Search field.
- **Display +6 → 14** (`FeedbackComponents.tsx`): Spinner (ark-spin), Divider
  (labelled), Kbd (keycap), Stat (tone-driven delta), Empty state (reuses
  TokenButton), Code block (surface-sunken, token-coloured syntax).
- **Navigation +4 → 8** (`NavigationComponents.tsx`): Navbar (top app bar),
  Sidebar (active accent bar), Steps (wizard progress), Link (state ladder).
- **Patterns +5 → 9** (`PatternComponents.tsx`): List item (media object),
  Banner (tone wash + action), Field (label + control + help/error), Stat grid
  (composes TokenStat), Feed item (comment/activity).
- ComponentsStep: lane inventory + `SIZABLE`/`NO_RADIUS` sets + one canvas case
  per part; lede count auto-derives (now 43). `lib/docs.ts` inventory is already
  dynamic off `state.components`, so it reflects 43 with no edit.
- Migrate v3→v4 verified by resetting stored version to 3 (23 comps) and
  reloading → backfilled to 43, zero console errors.

### v4 change (control at every level)
Reconciled the entry-first generators with full per-value control:
- **Colour** — `primitives.colorFamilies: ColorFamily[]` (dynamic add/remove/rename)
  replaces the fixed 6-slot union. Per-family `steps` (3–12; `rampStepLabels(n)`
  gives 10→50–900, 11→50–950) and per-swatch `overrides{label:hex}`.
  `generateRamp(seed, stepCount)` resamples the luma/sat curves. `familyRamp()`
  resolves generated+overrides. `COLOR_SLOTS` kept as default-ids back-compat only.
- **Typography** — `rounding` (none/half/integer, default integer kills 48.83),
  per-step `sizeOverrides`/`leadingOverrides`, `weights[]` scale, `fontRoles`
  (display/heading/body/mono {family,weight}), per-step `stepAssign{role,weight}`.
  `generateTypeScale(base, factor, opts)` now returns size/leading/weight/role +
  `generatedSize`/`overridden`. `families{sans,mono}` kept as body/mono mirror.
- **Spacing** — editable `spacingMultipliers[]` + `spacingOverrides{i:px}` +
  add/removeSpacingStep (first 8 locked; components rely on space-1…8).
- **Radii** — `radiusOverrides{i:px}` on top of the scale slider (names fixed 0–7
  so `rv()` stays stable).
- **Elevation** — `elevation:{light:ShadowDef[], dark:ShadowDef[]}` replaces the
  flat `shadows:string[]`; `shadowToCss()` compiles. ShapeStep shows BOTH modes
  in `ThemeFrame`s at once (fixes "dark depth invisible") + a structured editor
  (x/y/blur/spread/colour/opacity, add/remove/rename).
- **Roles** — `semantics.groups[]` now in state (add/rename/removeRole, addGroup);
  defaults expanded 14 → **34** across 8 groups (surfaces, text, 2 action tiers,
  borders, feedback info/success/warning/error). A semantic value may be a
  `slot-step` ref OR a raw `#hex` (`resolveRef` handles both). RolesStep adds a
  per-cell colour well + live in-context dual-mode card.
- **Pipeline** — `lib/tokens.ts` (per-mode shadows, weight/font-role vars, hex
  roles, dynamic step labels), `lib/figma.ts` (dynamic families, `type/weight/*`,
  `font/weight/*`, `font/{role}`, `shadow/{light,dark}/*`, hex-or-alias semantics),
  `lib/docs.ts`, `countTokens` all updated. Token count 127 → **187**.

### v3 baseline — ✅ EXPANSION COMPLETE — entry-first colour, 9-step process, 23 components. Verified at http://localhost:3111

## Product Shape (v3)
Guided builder teaching the real build order of a design system, grounded in
Figma's foundations guidance (colour/type/spacing-and-grids as separate
foundations; semantic variables; accessibility as foundational):

**Welcome** (name + brand hex, pure entry) →
**01 Colour** → **02 Typography** → **03 Spacing & layout** →
**04 Shape & elevation** → **05 Motion** → **06 Roles** →
**07 Components** → **08 Preview** → **09 Ship**

### Entry-first philosophy (v3 change)
- No canned presets anywhere. Every value is typed/picked freely.
- Suggestions are DERIVED from the user's own input and offered as chips:
  - Secondary: complementary / analogous ±30° / split ±150° / triadic +120°
    (hue rotations preserving brand S/L) — `harmonySuggestions()` in lib/color.ts
  - Neutral: `tintedNeutral()` (brand hue at 8% sat) + pure grey
  - Success/Warning/Error: `statusSuggestion()` — conventional hue carrying
    the brand's saturation
  - Type ratio: free number input; named ratios (Minor Third…Golden) are chips
  - Breakpoints/durations/easings: raw numeric + CSS-string inputs

### New foundations (v3)
- **Spacing & layout** (03): spacing scale + editable breakpoints (sm/md/lg/xl)
  with reflow diagram; exports as `layout/breakpoint/*` FLOAT variables.
- **Motion** (05): durations fast/base/slow (ms inputs) + 4 editable easing
  curves with a play-to-feel curve playground. Exports `motion/duration/*`,
  `motion/easing/*`. Components animate via `--ark-duration-*`/`--ark-ease-*`.
- Token count now 127; Figma bundle includes motion + layout variables.
- Docs (§ naming convention) explain the primitive→semantic→component tier
  model; § component inventory lists all parts + active skeletons.

### Component library — 43 parts in 4 lanes (ComponentsStep) — v5
- **Controls (12):** Button, Icon button, Button group, Input, Textarea, Select,
  Search, Checkbox, Radio, Switch, Slider, Stepper — state matrices in
  simultaneous light/dark.
- **Display (14):** Badge (6 tones), Tag, Avatar (sizes+presence), Tooltip,
  Progress, Spinner, Skeleton loader, Alert, Toast, Stat, Divider, Keyboard,
  Empty state, Code block.
- **Navigation (8):** Tabs (4 skeletons), Navbar, Sidebar, Breadcrumbs, Steps,
  Pagination, Dropdown, Link.
- **Patterns (9):** Modal (4 skeletons), Table (4 skeletons), Card, List item,
  Feed item, Accordion, Banner, Field, Stat grid.
- Factory files: CoreComponents (+Textarea; exports SIZE_MAP/focusRing),
  SelectionControls, DisplayComponents (exports `useTone()`), NavPatternComponents,
  + v5: FormControls, FeedbackComponents, NavigationComponents, PatternComponents.

## Store
`journey` 9 steps · `primitives.motion` + `primitives.layout` · persist
**version 4** with `migrate`: v<2 backfills motion/layout + resets invalid
activeStep, v<3 folds foundations into the generated+override model, **v<4
backfills the 20 new component ids** (`{...DEFAULT_COMPONENTS, ...saved}`).
Actions: setMotionDuration, setEasing, setBreakpoint, setComponentProperty/
Skeleton (both self-heal missing ids).

## Verification Trace — v5 (2026-07-06)
- `npx tsc --noEmit` → exit 0, zero errors. Fresh preview session: zero console
  errors/warnings across all four lanes.
- Walked each lane in the preview MCP (system "Meridian", both modes visible):
  Controls "12 parts" (Icon button variant×state matrix, Slider states);
  Display "14 parts" (Stat green/red deltas, Code block syntax); Navigation
  "8 parts" (Sidebar active accent bar, Steps wizard); Patterns "9 parts"
  (Feed item, Field help→error). Lede auto-reads "43 components in four lanes".
- Migrate v3→v4: forced stored `version=3` with the 23 legacy ids, reloaded →
  backfilled to 43, all 20 new ids present, no errors.
- Fixed Field invalid variant (was reusing TokenInput `active` → stray "1,240.00";
  now placeholder + error ring/message).

### Prior trace (v4, 2026-07-06)
- Welcome presets removed; custom hex drove all ramps; harmony chips correct.
  Space/Motion/Roles/Ship all walked; token trace 187; Preview dashboard intact.

## Immediate Next Steps
1. Per-component usage guidelines in docs (content strategy per
   designsystems.com guidance) — now 43 parts to document.
2. Iconography foundation (style, stroke, grid) — the one Figma foundation
   not yet covered.
3. Real completion criteria per step (Roles AA gate w/ override).
4. Restart-system affordance; keyboard flow (⌘→); production build + deploy.

## Landing Page Redesign (2026-07-07)
- **Redesigned Marketing Landing Page**: Replaced the landing page UI layout (`components/marketing/LandingPage.tsx`) to match the structural sections, grids, layout, visual components, search overlay, and theme switcher from Astryx (`https://astryx.atmeta.com/`).
- **Arkitype Branding & Copy**: Swapped out Astryx names, technologies (StyleX -> Tailwind CSS, Next.js), links, and branding with Arkitype.
- **Showcase Cards Rebuild**: Programmed 7 custom high-fidelity responsive preview cards (Watch, Checkout form, Chat conversation dialogue, Inventory data table, Revenue stats graph, and Gallery components).
- **Interactive Sandbox Bindings**: Connected parameters controls (accent color family picker, spacing density sliders, corner border radii, and font toggles) to all preview showcase cards, letting users customize elements dynamically directly on the landing page.
- **Production Verification**: Confirmed Next.js production build compiler and type checking pass successfully with zero errors.

## Composite Skeletons Component Population (2026-07-07)
- **Populated Modal Skeletons**: Replaced the empty outline rectangle placeholder divs in `components/factory/ModalSkeletons.tsx` with actual `TokenInput`, `TokenSelect`, `TokenAlert`, and `TokenIconButton` elements. Pre-configured Centered Overlay, Right Side-Sheet, Full-Screen Overlay, and Bottom-Sheet to render populated forms.
- **Populated Tabs Skeletons**: Swapped out the blank loading skeleton stripes in `components/factory/TabsSkeletons.tsx` with dynamic panel content containing real search inputs, limit steppers, warning alerts, and action buttons.
- **Cascading Child Resolvers**: Passed child resolvers (`childInputResolve`, `childSelectResolve`, `childButtonResolve`, `childIconButtonResolve`, `childAlertResolve`) down to all nested primitive components. When a user edits a primitive component (such as Button or Input), those styling and layout changes instantly cascade down and propagate to the composites (like Modal and Tabs) that compose them.
- **Modifiers & Specs Integration**: Defined complete schemas (`modalSpec`, `tabsSpec`, and `tableSpec`) in `lib/componentSchema.ts` containing all modifier settings (alignment, title text, dividers, sizes, shadows, borders, active tab text and bg, striped rows, cell padding, and timeline logs). Added them to `WIRED_COMPONENTS` so that the right sidebar `ComponentInspector` is fully active and automatically populates all controls and parameter clusters when configuring modals, tabs, or tables. Disabled fallback grid rendering to let users modify these properties inside the flocked `ComponentStudio` interface with a variants selector bar at the bottom.




## Design-System File Export Overhaul (2026-07-13)
- **Complete Figma kit output**: The plugin's "Build Library" (now "Generate
  Design System File") no longer dumps one flat frame — it builds a full
  multi-page kit: Cover → Getting started → Foundations (Colour / Typography /
  Space & Layout / Shape & Elevation / Motion) → one page per component lane
  (Controls / Display / Navigation / Patterns) → Changelog.
- **Per-component usage docs** (`lib/componentDocs.ts`, new): description,
  when-to-use, do/don't, and a11y note authored for all 49 wired components;
  rendered as a documentation sheet next to every component set and embedded
  in the set's Figma description.
- **Labelled variant matrices**: each set's variants are laid out on a
  state-column × option-row grid with row/column labels drawn beside the set.
- **Figma component properties**: TEXT props (Label, Placeholder, Title…) and
  BOOLEAN props (Show prefix icon, Show dot, Dismissible…) are created on the
  sets and wired to named layers via `componentPropertyReferences` — instance
  users edit copy and toggle icons from the properties panel, exactly like a
  hand-built kit. Property definitions live in `FIGMA_PROP_DEFS`
  (`lib/figma.ts`) and flow through the bundle.
- **Token-binding sweep**: renderers' hardcoded dark-theme RGBs replaced with
  semantic-variable bindings (`semPaint`), text nodes bind fontSize/fontWeight
  to type variables where aliased, and component copy renders in the user's
  own font roles (`font/body`, `font/mono`) instead of always-Inter.
- **7 new plugin renderers**: chip, rating, popover, fileUpload, timeline,
  tree, datePicker (previously fell back to a placeholder label).
- **Update-in-place contract**: pages/sheets/sets tagged with plugin data
  (`ark:pageId` / `ark:sectionId` / `ark:componentId`); re-syncs update the
  same variables and redraw variants inside the same sets (instances keep
  overrides), stale variants are pruned, and every sync appends a Changelog
  entry. Status detection is now document-wide.
- **Bundle enrichment** (`lib/figma.ts`): `structure.pages` (lane → page map),
  `docs`, `properties`, lane display names, `meta.systemName/componentCount`.
- **Ship step**: artifact renamed "Figma kit", trace shows component + page
  counts. `scripts/test-exporter.ts` passes (50 components; Button = 8
  variants × 5 states with 14 aliased bindings). Both `npx tsc --noEmit` and
  the plugin build exit 0.


## Figma Kit Fidelity Pass (2026-07-13)
- **Variant styling actually varies now** (`lib/figma.ts`): the bundle compiler
  used the schema's spec default for every variant, so all 8 button variants
  (and every tone-driven component) exported pixel-identical. Added
  `buttonVariantDefault()` mirroring `TokenButton`'s per-variant recipe —
  error/warning/success bind to their ramp 600/700/800 steps per state,
  outlined/text go transparent with `text/link` labels and `border/default`
  strokes, tonal rides `action-secondary-*`, elevated rides surface roles.
  User overrides (variant-scoped or shared) still win.
- **Tone washes injected** (`injectVariantExtras`): badge/tag/alert/banner now
  carry per-tone `container.bg/border`, text colours, and accent bindings
  (semantic `feedback/*` roles preferred so they flip in dark mode; brand tones
  fall back to ramp steps). Toast keeps its neutral surface but gets a
  tone-accurate `indicator.color`. Plugin renderers read the injected keys.
- **One Figma page per component**: `structure.pages` is now one page per
  component (lane metadata included) instead of one page per lane; the plugin
  names pages "🎛 Controls · Button", keys them `comp-<id>`, rescues live
  component sets onto their new pages, and deletes the now-empty legacy
  `lane-*` pages (never touching user content).
- **Include/exclude components on export** (`ShipStep`): the Figma-kit aside
  gains a per-lane checklist (All/None per lane, live n/50 count) feeding
  `compileFigmaBundle(state, { includeComponents })`.
- **Elevation is real Figma effects now**: shadow tokens become local effect
  styles ("Arkitype / Elevation / Light|Dark / <level>", idempotent by name);
  the compiler injects `container.elevation` for card/modal/popover/toast/
  statGrid/dropdown/tooltip and the elevated button (hover deepens low→medium),
  and the plugin applies the style via `effectStyleId` (clearing it when a
  variant loses elevation). The Shape page demos reference the same styles.
- **Patterns un-skewed**: `drawCardModal` called `drawDivider(node, …)` which
  restyled the *card itself* to a 180×1 horizontal sliver — every card/modal
  variant rendered as a crushed mess. Replaced with `appendDividerLine()`
  (a stretch child rule). Also: card/modal get their stored `padding` option
  as fallback (was 0 — content flush to edges), badges get pill padding,
  alert/toast titles read the right style keys (`text.title`/`text.body`),
  and statGrid/buttonGroup get wider grid cells.
- Verified: `npx tsc --noEmit` exit 0, plugin `npm run build` exit 0,
  `scripts/test-exporter.ts` passes (50 components, Button 40 variants), and a
  bundle-level check confirms distinct variant/tone bindings, per-component
  pages, elevation levels, and the include filter.

## Alpha Release Prep (2026-07-17)
- **Public surfaces hardened** ahead of opening the alpha: CSP + security
  headers on every route (`next.config.mjs`), scoped to the origins actually
  in use (Supabase, Google Fonts, GA) with `'unsafe-eval'` dev-only for HMR;
  `/api/scrape` pins every socket to a validated public IP through an `undici`
  dispatcher `lookup` and re-validates each redirect hop, which is what closes
  the DNS-rebinding gap a hostname-only pre-check leaves open; `/api/beta-gate`
  rate-limits per IP so the one shared password can't be brute-forced.
- **Component tokens are a third tier** under primitives → roles: a component
  can be re-pointed without disturbing the role it descends from
  (`TokenTiers.tsx`). Binding/token layers learn opacity (`alphaOf` /
  `stripAlpha` / `withAlpha`), so a token carries a hex-or-alias plus alpha and
  exports as 8-digit `#RRGGBBAA`.
- **Library 43 → 50** across the four lanes; schema, factory, Figma bundle, and
  docs all follow from the same specs.
- **`saveStatus` is keyed by project id.** It was one global value, so saving
  one file drove the indicator on every open file; `AuthProvider` now reports
  against the id it actually saved. Persist `version` → 13 with a migrate branch.
- **The contrast audit was auditing fiction** (`scripts/check-contrast.ts`). It
  kept private copies of the families and role maps, and they drifted: it still
  mapped mid foregrounds to `-400` and feedback surfaces to `-950` long after
  the product moved to `-300` / `-900`. So it reported two AA failures the
  product had already fixed — and worse, its resolver returned `#000000` for an
  unknown step, so every stale `-950` silently became a black swatch that
  *passed*. It now imports `DEFAULT_FAMILIES` / `DEFAULT_LIGHT` / `DEFAULT_DARK`
  / `familyRamp` from the store and throws on an unresolvable token. All 34
  default pairings pass AA (muted-on-elevated 6.01, link-on-elevated 6.04 in
  dark — matching the values predicted in `DEFAULT_DARK`'s own comment).
- **`HANDOFF.md` re-grounded**: the rail is 8 steps, not 9 (Colour and Roles
  merged into `FoundationStep`; `ShapeStep` is its own file and was never an
  alias for it); persist version 12 → 13; `familyRamp` documented where it
  actually lives (the store, not `lib/color.ts`); the verify section now lists
  the two `scripts/` audits and the separate `figma-plugin` build, plus the
  `npm run build`-clobbers-a-running-`dev`-server trap.
- Verified: `npx tsc --noEmit` exit 0; `npm run build` green from a clean
  `git archive` checkout (this caught `TokenTiers.tsx` being imported but never
  committed — a fresh clone would not have built); `scripts/test-exporter.ts`
  passes (50 components, Button 40 variants); `scripts/check-contrast.ts` exit
  0; `figma-plugin` `npm run build` exit 0; dashboard → builder → Ship walked
  live on :3111 (five artifacts, 205 tokens, 170 Figma variables).
