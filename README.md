# Arkitype

**Live at [arkitype.srinidhibhat.com](https://arkitype.srinidhibhat.com)**

A guided **design-system builder**. Arkitype walks you through a series of
focused decisions — colour, type, space, shape, motion — turns them into a
coherent set of design tokens and semantic roles, lets you deeply re-bind
53 live components to those tokens through a Figma-style component studio,
and exports the result (docs, Figma variables, an AI agent guide, or a hosted
styleguide link).

> Status: alpha (`0.1.0-alpha`). See [`progress.md`](./progress.md) for the
> detailed build log.

The host is set once in [`lib/site.ts`](./lib/site.ts) and read by metadata,
`sitemap.ts`, `robots.ts`, and the structured data — override it with
`NEXT_PUBLIC_SITE_URL` for a preview deployment. Published styleguides
(`/p/<slug>`) are deliberately `noindex` **and** disallowed in `robots.txt`:
with `select using (true)` on `published_snapshots`, the slug *is* the access
grant, so indexing them would turn "anyone with the link" into "anyone with a
search box".

## The workflow

A Welcome moment leads into an ordered rail of steps, each one focused
decision with its own live canvas:

1. **Colour** — a custom hex drives generated ramps + harmony suggestions.
2. **Type** — type scale, roles, and weights.
3. **Space** — spacing scale.
4. **Shape** — radius / border foundations.
5. **Motion** — durations and easing.
6. **Roles** — semantic token roles (action, surface, text, …) mapped onto
   the generated primitives, with overrides.
7. **Components** — a Figma-style **Component Studio**: each live component
   sits on a dotted canvas with a docked inspector; every parameter binds to
   a design-system token (role/scale) rather than a raw value. Variant and
   state bars make every state selectable-and-viewable. Ten compound
   components can also start from a **Template** — a structure modelled on
   Material 3, Apple's HIG or IBM Carbon — drawn in your own tokens.
8. **Preview** — a real product rendered entirely from the live tokens, checked
   two independent ways: **form factor** (SaaS console / Mobile / Marketing —
   changes the layout) and **industry** (Fintech / Healthcare / E-commerce —
   changes only the content), plus density and an all-states strip.
9. **Ship** — export docs, a Figma variables bundle, framework config (CSS/
   Tailwind/MUI), or a Markdown guide for AI coding tools, or **publish** the
   system as a hosted styleguide.

## The published styleguide

Ship's **Publish** tab mints a shareable link — `/p/<slug>` — carrying the whole
system as a browsable site: foundations, the full token set, and a page per
component with its live preview, every state and variant, usage documentation,
and a lifecycle badge (ready / beta / deprecated). No account needed to read it.

Every page is *compiled from the design system itself*, exactly like the Figma
bundle and the framework exports. Nothing on it is hand-authored, so a published
styleguide can't drift from the system it documents — there's no second copy to
keep in sync, and no stories or doc pages to maintain.

Publishing freezes a copy, so edits after publishing stay private until you
republish, and the link stays stable even if you rename the file.

## The Figma plugin

A companion plugin, live on the Figma Community, turns the Ship step's export
into an actual Figma file:

**[Arkitype Figma Sync (beta)](https://www.figma.com/community/plugin/1658818555967908857/arkitype-figma-sync-beta)**

Two ways to hand it the bundle:

- **Pull** (needs the system published first) — paste the Figma sync link
  from Ship's Publish tab into the plugin's Pull field. The plugin remembers
  the last link, so re-syncing after a republish is one click, no file to
  download or re-import. It works by hitting `app/api/figma/[slug]`, which
  compiles the bundle for a published system on demand.
- **Paste/drop the JSON** — download or copy the bundle from Ship and drop it
  into the plugin's Import tab. No publishing required.

Either way, then choose how much to build: sync just the two variable
collections, or generate the full design-system file (cover, foundations, and
a page per component with usage docs, variant grids, and token-bound layers).
Re-running updates the file in place, so instances and overrides survive.
Source lives in [`figma-plugin/`](./figma-plugin).

## Component library

53 components across four lanes — Controls, Display, Navigation, and Patterns
(buttons, inputs, selection controls, alerts/toasts/badges/banners, tabs,
navbar/sidebar/breadcrumbs, drawers, modals, tables, cards, feeds, avatar
groups, and more). Each is schema-driven, so its editable parts and options
flow from a single `ComponentSpec`.

The inventory lives in [`lib/componentLanes.ts`](./lib/componentLanes.ts) — the
in-app copy derives its count from there rather than restating it.

### Templates

Ten compound components (Alert, Toast, Banner, Card, Empty state, Accordion,
Dropdown menu, List item, Feed item, Popover) ship alternate *structures*
modelled on Material 3, Apple's HIG and IBM Carbon, picked from a small
**Templates** button in the studio toolbar. A template changes layout only —
it resolves through the same token chain as the default, so it renders in the
file's own colours and keeps any part bindings and options already set.

The registry is [`lib/componentTemplates.ts`](./lib/componentTemplates.ts) and
the shared per-system style recipes are in
[`components/factory/templateKit.tsx`](./components/factory/templateKit.tsx).
The choice is stored as an undeclared `properties.template` key on
`ComponentConfig` (the same convention as `radiusStep`), so it needs no store
or schema change and rides along with the file when it saves, exports and
publishes. Absent means `arkitype` — the original layout, unchanged.

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** for the studio chrome; components theme via CSS variables
  (`--ark-*`)
- **Zustand** for the persisted design-system store (`store/useDesignSystem.ts`)
- **Radix UI** primitives (select / slider / switch)
- **lucide-react** icons

## Getting started

```bash
npm install
npm run dev      # http://localhost:3111
```

Other scripts:

```bash
npm run build    # production build
npm run start    # serve the production build on :3111
```

## Project layout

```
app/                 Next.js App Router entry (page, layout, global styles)
  p/[slug]/          the public, unauthenticated published styleguide
  api/figma/[slug]/  serves a published system's bundle to the plugin's Pull
components/
  shell/             TopBar, StageRail, StepScaffold
  steps/             one component per step in the rail
  factory/           the token-bound component factory + Component Studio
  public/            the published-styleguide renderers
  ui/                shared primitives (ThemeFrame, controls)
lib/                 tokens, colour, typography, binding, figma export, docs, publish
store/               Zustand persisted design-system store
```

> Publishing needs the `published_snapshots` table — re-run
> [`sql/arkitype_schema.sql`](./sql/arkitype_schema.sql) in the Supabase SQL
> editor (every statement is idempotent, so it's safe on an existing project).
