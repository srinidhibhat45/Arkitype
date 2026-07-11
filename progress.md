# Arkitype — Alpha Build Progress Tracker

> Compressed memory checkpoint. Update after every compiled module.

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



