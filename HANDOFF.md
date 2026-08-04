# Arkitype — Engineering Handoff

> **Purpose:** Context transfer for continuing Arkitype in another AI IDE (Antigravity).
> Captures what the code alone doesn't tell you — architecture intent, the two theme
> systems, the persisted-store landmine, and what's next.
> Written 2026-07-07.
>
> **Arkitype is a standalone product.** It has no dependency on, and shares no code with,
> any other project. It lives only in this folder (`~/Desktop/Arkitype`).
>
> For the blow-by-blow version history, read [`progress.md`](./progress.md) — that's
> the changelog. **This file is the orientation.** Read this first, then that.
>
> If you're picking up the product-vision overhaul (client workspaces, framework
> export, Figma live sync, industry proofing templates), read
> [`MAJOR_OVERHAUL_PLAN.md`](./MAJOR_OVERHAUL_PLAN.md) instead — it's the resumable,
> checkpointed plan for that work specifically, with a phase-by-phase status.

---

## 1. What Arkitype is

A **guided design-system builder** (Next.js 14 App Router + React 18 + TypeScript). It
walks the user through an ordered rail of focused decisions — colour, type, space, shape,
motion, roles — turns them into design tokens + semantic roles, lets them deeply re-bind
**53 live components** to those tokens through a Figma-style Component Studio, and exports
the result (docs + a Figma variables bundle).

- **Status:** alpha (`0.1.0-alpha`), on `main`. Don't trust a branch name or a
  "tree is clean" claim written into a doc — check `git status` instead.
- **Core idea — "entry-first":** no canned presets. Every value is typed/picked by the
  user; suggestions are *derived* from their own brand hex (harmony, tinted neutrals,
  status hues) and offered as chips.
- **Theming mechanism:** built components render entirely off `--ark-*` CSS variables, so
  the token cascade + per-mode (light/dark) theming + per-component bindings all flow
  through CSS custom properties — no re-render needed to re-theme.

---

## 2. Run / verify

```bash
npm install
npm run dev      # http://localhost:3111   (dev server, App Router)
npm run build    # production build
npm run start    # serve production build on :3111
npx tsc --noEmit # typecheck — keep this at exit 0

npx tsx scripts/check-contrast.ts     # WCAG AA audit of the default role maps
npx tsx scripts/check-figma-props.ts  # every Figma property binds to a layer the plugin draws
npx tsx scripts/test-exporter.ts      # compiles the Figma bundle (smoke test — it only fails on a throw)
cd figma-plugin && npm run build      # the plugin typechecks separately from the app
```

`.claude/launch.json` already defines an `arkitype` server on port **3111**. Verify changes
live in the preview at `:3111` — walk the affected step, and (for component work) toggle
states/variants + light/dark in the Component Studio and watch computed styles.

⚠️ Running `npm run build` overwrites `.next` underneath a running `npm run dev`, which
then 404s its own chunks and serves a blank page. It looks exactly like a rendering bug.
Restart the dev server after a production build.

The `figma-plugin/` directory has its own `tsconfig` and its own `node_modules`; the
app's `tsc --noEmit` does **not** cover it. Build it separately when you touch
`lib/figma.ts` or the plugin.

---

## 3. The 8-step rail (the product's spine)

A Welcome moment → an ordered `StageRail` of steps, each a focused decision with its own
live canvas. `STEP_ORDER` in the store is the ground truth for the rail; `app/page.tsx`
maps each step id to its surface. Note that the file names do **not** line up with the
step names one-to-one:

| # | Step id | Renders | Produces |
|---|---------|---------|----------|
| — | — | `Welcome.tsx` | name + brand hex (pure entry) |
| 01 | `colour` | `FoundationStep.tsx` | primitives, roles, and component tokens |
| 02 | `type` | `TypeStep.tsx` | type scale, roles, weights |
| 03 | `space` | `SpaceStep.tsx` | spacing scale + breakpoints |
| 04 | `shape` | `ShapeStep.tsx` | radius + elevation (per-mode shadows) |
| 05 | `motion` | `MotionStep.tsx` | durations + easing curves |
| 06 | `components` | `ComponentsStep.tsx` | the Component Studio (see §5) |
| 07 | `preview` | `PreviewStep.tsx` | whole system across form factor × industry |
| 08 | `ship` | `ShipStep.tsx` | export docs + Figma variables bundle |

**Colour and Roles are one step now.** `FoundationStep` is the merged surface and renders
`ColourStep.tsx` / `RolesStep.tsx` as tabs — neither is mounted directly by `app/page.tsx`,
so a step is not simply "one file per step" any more. The legacy `roles` step id still
resolves (`<FoundationStep initialTab="roles">`) for deep links, but it is deliberately
absent from `STEP_ORDER`, so it is not a stop on the rail.

Shell chrome: `components/shell/` — `TopBar.tsx` (Appearance toggle + preview Light/Dark),
`StageRail.tsx` (the step rail), `StepScaffold.tsx` (per-step layout wrapper).

---

## 4. ⚠️ Two theme systems — do NOT confuse them

This trips people up constantly. There are **two independent** light/dark controls:

1. **Chrome theme** — the *tool's own* appearance (the Arkitype UI itself).
   - Driven by `--c-*` channel-form CSS vars in `app/globals.css` (`:root` = light, `.dark`
     = dark). Tailwind `darkMode: "class"`; `tailwind.config.ts` maps `ink/line/fg` to
     `rgb(var(--c-*) / <alpha-value>)`.
   - Toggled by the **Appearance** control in `TopBar`; persisted as `chromeTheme` in the
     store; applied to `<html>` from `app/page.tsx`.
   - Light is the default.

2. **Preview theme** — the light/dark of the *design system being built*.
   - Rendered inside `ThemeFrame` (`components/ui/ThemeFrame.tsx`) via the `--ark-*` vars.
   - Controlled by the "Preview" segmented control (separate from Appearance) and the
     Light/Dark toggle inside the Component Studio.

When you touch styling, be explicit about which system you mean. `--c-*` = chrome, `--ark-*`
= the generated design system.

---

## 5. Component system (the deep part)

### Schema-driven components
`lib/componentSchema.ts` declares every component's styleable surface as a `ComponentSpec`
(parts → props, each typed + optionally per-state, with a default binding; plus `options`
and a `previewAxis` flag). **53 components across 4 lanes.**

⚠️ Don't restate the inventory here — it drifts. `lib/componentLanes.ts` is the single
source of truth for which components exist and which lane they sit in (Controls · Display ·
Navigation · Patterns), and `WIRED_COMPONENTS` gates which render live. `app/docs/page.tsx`
and the landing hero both *derive* their count from it; do the same in any new surface.

`WIRED_COMPONENTS` gates which render live and fully-bindable. Modal / Tabs / Table are
**skeleton components** — bg/border/overlay/tab-colour bindings are wired, but corner
radius and border width on Tabs/Table are plain numeric Options (not token-bound; there's
no `container.radius`/`container.borderWidth` prop for them). Factory implementations live in
`components/factory/` split by lane (`CoreComponents`, `SelectionControls`,
`FormControls`, `DisplayComponents`, `FeedbackComponents`, `NavigationComponents`,
`PatternComponents`, `NavPatternComponents`, plus `*Skeletons.tsx` for the skeletal ones).

### Binding grammar
`lib/binding.ts` is the binding engine. Each styleable prop can point at a token via a
prefixed string; `resolveBinding()` turns it into a CSS value string:

```
role:<name>   prim:<family>-<label>   hex:<#hex>   space:<i>   radius:<i>
text:<i>      weight:<name>           font:<role>  px:<n>      raw:<value>
```

Unbound props fall back to the component's own hardcoded value — **defaults stay
pixel-identical**, so binding is purely additive. `bindingSwatch()` / `describeBinding()`
power the inspector's "currently bound to" UI.

### Component Studio
`components/factory/ComponentStudio.tsx` — the v7→v9 editing UI. A live preview flanked by
grouped **parameter clusters** (container-query responsive: 3-zone → 2-zone → stack).
Hovering a cluster rings the matching part on the preview via `data-ark-part` tags +
`useHighlight.tsx` (a measuring overlay). A Variant/State bar makes every state
selectable-and-viewable. Tagged priority parts:
button/input/textarea/select/checkbox/radio/switch; untagged parts degrade gracefully.

---

## 6. ⚠️ Persisted store — the landmine

`store/useDesignSystem.ts` is a **Zustand store persisted to localStorage** under the key
**`arkitype-system`**, currently at **persist `version: 14`** (this number drifts —
grep `version:` in the `persist(...)` config for ground truth rather than trusting
this doc).

**What actually persists is now tiny.** `partialize` keeps only `currentPreviewMode` and
`chromeTheme` — the design itself lives in Supabase (`projects.state`), not localStorage.
So the migrate chain below is *not* what protects a returning user's work; `backfillProjectState`
is, and it runs on every cloud load. Bump + migrate anyway if you change the shape of the two
persisted prefs, but don't assume localStorage holds the system.

**Corollary worth stating plainly:** a new field on `ComponentConfig` or `primitives` needs
**no** persist bump, because it never reaches localStorage. Make it optional and read it
through a helper that supplies the default (`componentStatus(cfg)` returning `"ready"` for
`undefined` is the worked example) — then existing projects load unchanged with no migrate
branch at all. Reserve bumps for the two persisted prefs.

**If you change the shape of anything that gets persisted, you MUST bump `version` and add a
`migrate` branch** (the `migrate: (persisted, version) => …` block, ~line 1437). Otherwise a
returning user's stale localStorage deserializes into a broken state. The existing migrate
chain backfills across every prior version (motion/layout, generated+override foundations,
new component ids, etc.) — follow that pattern.

The `highlight`/"jump here" target is deliberately **not** persisted (transient). Store
actions — and `backfillProjectState` at load time — self-heal missing component ids
(`{...DEFAULT_COMPONENTS, ...saved}`), so **adding a component needs no migrate**: add it to
`DEFAULT_COMPONENTS`, `COMPONENT_SPECS`, `WIRED_COMPONENTS` and `COMPONENT_LANES` and existing
projects pick it up on next load.

---

## 7. Token pipeline & export

- `lib/tokens.ts` — `systemCssVars` compiles the whole system into `--ark-*` vars (colour
  ramps, `--ark-<family>-<label>` primitives, per-mode shadows, weight/font-role vars, hex
  roles, dynamic step labels). This is what every component reads.
- `lib/color.ts` — ramp generation (`generateRamp`, `rampStepLabels`), harmony suggestions,
  and hex/alpha handling (`alphaOf` / `stripAlpha` / `withAlpha`; transparency stores and
  exports as 8-digit `#RRGGBBAA`).
- `familyRamp` — the *canonical* "family → resolved shades" call (generated ramp, then
  per-swatch overrides). It lives in `store/useDesignSystem.ts`, **not** `lib/color.ts`.
  Reach for it instead of calling `generateRamp` directly, which ignores overrides.
- `lib/typography.ts` — `generateTypeScale` (size/leading/weight/role + rounding).
- `lib/figma.ts` — the Figma design-system bundle: variables (dynamic families,
  type/weight/font/shadow, hex-or-alias semantics) **plus** components (per-variant resolved
  bindings + options), per-component docs, Figma component-property definitions
  (`FIGMA_PROP_DEFS` — TEXT/BOOLEAN props wired to named layers), and `structure.pages`
  (lane → Figma page map).
- `lib/componentDocs.ts` — authored usage documentation (description / when-to-use /
  do / don't / a11y) for every wired component; rendered onto each component's sheet in
  the generated Figma file.
- `figma-plugin/` — consumes the bundle and builds a complete multi-page kit (Cover,
  Getting started, Foundations, one page per lane, Changelog). Idempotent via plugin-data
  tags (`ark:pageId`/`ark:sectionId`/`ark:componentId`): re-syncs update variables and
  redraw variants in place, so instances never break.
- `app/api/figma/[slug]` — the plugin's **Pull** endpoint: compiles the bundle for a
  *published* system, keyed by the same slug that serves `app/p/[slug]`. It reuses
  `published_snapshots` rather than adding a second public read path, which is why
  **pulling into Figma requires publishing first**. `compileFigmaBundle` therefore takes
  `FigmaBundleSource` (`Pick<ArkitypeState, primitives|semantics|components|meta>`), not
  the whole store, so a snapshot feeds it directly — as do `countTokens` and
  `collectUsedIcons`. It is the only route in the app that sends
  `Access-Control-Allow-Origin: *`; that is safe *here alone* because the row is already
  world-readable to anyone holding the slug and the request carries no credentials.
  The plugin's manifest currently allows `*` because the workspace host is user-chosen —
  **narrow `allowedDomains` to the real origin once the app is deployed.**

### ⚠️ The app and the plugin ship separately — and the bundle is the contract

`figma-plugin/dist/` is **gitignored**, and the plugin users actually run is the one
**published to the Figma Community**, not the one in this repo. Deploying the web app does
*not* update it. That makes two failure modes real:

1. **New component, old plugin.** `drawComponentNode`'s switch has no case for it, so it
   falls through to `drawFallback` and exports as a grey placeholder box. This is exactly
   how Jumplist shipped — it was in the bundle for a full release with no renderer.
2. **New component *property*, old plugin.** `applyComponentProperties` binds by
   `findAll(n => n.name === p.layer)`. No matching layer means the property appears in
   Figma's panel and silently controls nothing.

So: **whenever you add a component or a `FIGMA_PROP_DEFS` entry, rebuild and republish the
plugin in the same release.** `npx tsx scripts/check-figma-props.ts` catches both cases
against the local plugin source (it fails on a property whose layer is never drawn, and on
a wired component with no renderer case) — but it can only check the source in this repo,
not whatever version is live in the Community. Layer names are load-bearing API; renaming
one without updating `FIGMA_PROP_DEFS` breaks a property silently.
- `lib/docs.ts` — the exported docs; §6 lists "Configured components" (resolved options +
  override counts). Token count is ~187.

### The published styleguide (the sixth export target)

Ship also **publishes** — `lib/publish.ts` freezes `{name, primitives, semantics,
components}` into `public.published_snapshots` and `app/p/[slug]` renders it for anyone
with the link. Two things to know before touching it:

1. **`published_snapshots` is the only anon-readable table in the schema** (`select using
   (true)`). Everything else is owner-scoped. The slug's random suffix is therefore
   security, not cosmetics — knowing a slug *is* the access grant, so slugs must never
   become guessable/name-derived.
2. **The public component page hydrates the Zustand store from the snapshot**
   (`components/public/SnapshotProvider.tsx`), because the factory components read
   `s.primitives`/`s.components` directly rather than taking props. This is only safe
   because `AuthProvider` — which owns the autosave subscription — mounts on `/` alone.
   **If a public route ever mounts `AuthProvider`, that hydration becomes a write path
   into the viewer's own projects.** Hydration also must stay in an effect: the persist
   middleware writes to `localStorage`, which throws during SSR.

The rule that makes this worth having: **the published site only renders what generation
already produced.** No authored page content, no per-component story files. Add a
freeform editing surface and it becomes Zeroheight with fewer features.

---

## 7b. SEO & the indexing boundary

Live at **https://arkitype.srinidhibhat.com**. The host is declared once in
`lib/site.ts` (override with `NEXT_PUBLIC_SITE_URL` for previews) and everything
else reads it: `metadataBase`, `app/sitemap.ts`, `app/robots.ts`, the
`SoftwareApplication` JSON-LD in `app/layout.tsx`, and the Figma plugin's
`allowedDomains`. Don't paste the hostname anywhere else.

⚠️ **`/p/*` is `noindex` and `Disallow:` — that is a security boundary, not a
preference.** `published_snapshots` is `select using (true)`, so the slug *is*
the access grant (§7). Indexing published styleguides would turn "anyone with
the link" into "anyone with a search box", and a designer who shared a client's
system could not un-share it. Both halves are needed and both are load-bearing:
`robots.ts` stops crawling, the routes' own `robots: { index: false }` stops
indexing of a URL found via an inbound link. **Never add published slugs to the
sitemap** — that file is fetched by anyone and would publish every customer's
system at once. Making them discoverable is a product decision that belongs
behind a per-publication opt-in.

Two traps this setup already hit, worth not re-introducing:
- The root layout sets `alternates: { canonical: "/" }`, which **is inherited by
  any route that doesn't set its own** — published pages were briefly declaring
  the homepage as their canonical. Every non-root route sets a self-referencing
  canonical for this reason.
- The root `title.template` appends `— Arkitype`, so a page title must not
  contain the brand or it doubles up in results.

`app/opengraph-image.tsx` generates the 1200×630 card at request time with no
custom font and no external asset — a social card that needs a network hop is a
social card that intermittently doesn't render. In `next dev` the `og:image` URL
resolves to `localhost`; that's dev-only, and the production build emits the
absolute site URL (verified).

---

## 8. Project layout

```
app/
  page.tsx           App Router entry — mounts the rail, applies chromeTheme to <html>
  p/[slug]/          PUBLIC, unauthenticated: the published styleguide (§7)
    components/[componentId]/   one page per component — the shareable playground
  layout.tsx         root layout
  globals.css        --c-* chrome theme vars (:root / .dark) + .studio-grid container queries
components/
  shell/             TopBar, StageRail, StepScaffold
  steps/             one file per rail step (§3)
  factory/           token-bound component factory + ComponentStudio + useHighlight + *Skeletons
  public/            the published-site renderers (no store writes, no editing)
  ui/                ThemeFrame (preview theming), controls
lib/                 tokens, color, typography, binding, componentSchema, figma, docs, adapters
  publish.ts         snapshot → published_snapshots (sibling of persistence.ts)
  proofingTemplates.ts  Preview step content packs — pure data, no React, no token reads
  supabase/server.ts anonymous server client, public routes only
store/               useDesignSystem.ts (persisted Zustand — §6)
progress.md          the version-by-version build log (authoritative changelog)
```

---

## 9. Next steps (from progress.md, fast-follow)

1. **Grow the component library** 53 → 60–70+ across all lanes.
2. **Typography + alias parity:** per-step leading-override UI, editable type-scale steps,
   a unified TokenPicker in Roles.
3. **Iconography foundation** (style / stroke / grid) — the one Figma foundation not yet covered.
4. **Real per-step completion criteria** beyond the Colour step (which now has a live
   WCAG-AA pairing gate).
5. **Restart-system affordance + keyboard flow** (⌘→ to advance the rail).
6. **Deploy.** The production build is verified green from a clean checkout; nothing is
   hosted yet.
7. **Decide what the alpha gate is actually for.** `BetaGate` is a client-side
   `sessionStorage` flag, so `sessionStorage.setItem("ark_beta_gate_unlocked","true")`
   walks past it, and `signUp` is open — an uninvited visitor can create a real account.
   RLS still confines them to their own data, so this is a "who gets in / who burns the
   Supabase quota" question, not a data-leak one. Close it by disabling open signup in
   Supabase (invite-only) if that's not the intent. *(Kept deliberately as-is for the
   first alpha — access is invite-only by email.)*
8. **Finish the size axis.** Button and Icon button expose a Size control in the studio but
   are deliberately **not** size-variant in Figma yet (`SIZE_VARIANT_COMPONENTS` in
   `lib/sizing.ts`) — Button is already 40 variants and ×4 sizes would put 160 in one set.
   Decide whether that's worth it, or narrow the size list for Button.
9. **Options the Figma renderers still ignore.** The audit in §7 covers *properties*, not
   options. Remaining known gaps: date-picker `mode`/`firstDay`/`showAdjacent`, file-upload
   options, tabs `showIcons`, empty-state copy, table `rowHeight`. Each is a small
   `optText`/`optBool`/`optNum` read in the matching `draw*` function.

*(Done since this list was written: component-binding export into the Figma bundle; Figma
component properties for 49 of 53 components — up from 28 — with `scripts/check-figma-props.ts`
guarding them; the Figma renderers now honour the studio's content options instead of drawing
hardcoded sample copy; `size` is a real Figma variant axis for the four form controls; Jumplist
got the renderer it never had; Drawer and Avatar group added; keyboard-accessible project cards.)*

---

## 10. Conventions to keep

- Keep `npx tsc --noEmit` at exit 0 before considering a change done; then verify live on :3111.
- Components read `--ark-*`; the tool chrome reads `--c-*`. Never cross them.
- Any persisted-shape change ⇒ bump persist `version` + add a `migrate` branch (§6).
- Defaults must stay pixel-identical when adding bindability (binding is additive).
- **Update `progress.md`** after each compiled module — it's the running memory checkpoint.
- **Scripts and docs import the shipped constants; they never restate them.** `app/docs/page.tsx`
  pulls `PROJECT_LIMIT`/`COMPONENT_LANES` for this reason. `scripts/check-contrast.ts` did the
  opposite for a while and drifted a full ramp step behind the product, so it spent months
  reporting two AA failures that had already been fixed — a copied constant is a lie with a
  delay on it.
- **Audits fail loudly.** A resolver that returns a placeholder (`"#000000"`) for an unknown
  token turns a stale reference into a passing check. Throw instead. `check-figma-props.ts`
  follows the same rule: if it can't locate the plugin's dispatch switch it throws rather
  than reporting a clean run against nothing.
- **The exported kit must match the preview the designer approved.** If the studio exposes an
  option, the matching `draw*` in the plugin has to read it. Renderers that drew their own
  sample copy meant a designer could set a navbar brand, export, and find "✦ Arkitype" in
  Figma. Default fallbacks in the plugin mirror the live component's defaults for the same
  reason.
- **Figma layer names are API.** `FIGMA_PROP_DEFS` binds properties to layers by name, and
  duplicate names inside one variant bind a single property to *all* of them (one "Column 1"
  used to rewrite the table header and both body rows). Keep names unique per variant, and
  pass them as literals/templates at the `createTextHelper` call — a name routed through a
  variable can't be verified by the audit.
- **Booleans need a layer to toggle.** Draw the layer unconditionally and set `.visible`,
  the way `drawButton` does for its icon slots; a layer that isn't drawn gives Figma a dead
  boolean property.

---

*This document is Arkitype's own. It has nothing to do with any other repository on this machine.*
