# Arkitype

A guided **design-system builder**. Arkitype walks you through a series of
focused decisions — colour, type, space, shape, motion — turns them into a
coherent set of design tokens and semantic roles, lets you deeply re-bind
40+ live components to those tokens through a Figma-style component studio,
and exports the result (docs + Figma variables).

> Status: alpha (`0.1.0-alpha`). See [`progress.md`](./progress.md) for the
> detailed build log.

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
   state bars make every state selectable-and-viewable.
8. **Preview** — the whole system on a representative dashboard.
9. **Ship** — export docs and a Figma variables bundle.

## Component library

43 components across four lanes — Controls, Display, Navigation, and Patterns
(buttons, inputs, selection controls, alerts/toasts/badges/banners, tabs,
navbar/sidebar/breadcrumbs, modals, tables, cards, feeds, and more). Each is
schema-driven, so its editable parts and options flow from a single
`ComponentSpec`.

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
components/
  shell/             TopBar, StageRail, StepScaffold
  steps/             one component per step in the rail
  factory/           the token-bound component factory + Component Studio
  ui/                shared primitives (ThemeFrame, controls)
lib/                 tokens, colour, typography, binding, figma export, docs
store/               Zustand persisted design-system store
```
