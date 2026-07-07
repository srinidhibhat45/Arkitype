# Arkitype — Engineering Handoff

> **Purpose:** Context transfer for continuing Arkitype in another AI IDE (Antigravity).
> Captures what the code alone doesn't tell you — architecture intent, the two theme
> systems, the persisted-store landmine, and what's next.
> Written 2026-07-07.
>
> **Arkitype is a standalone product.** It has no dependency on, and shares no code with,
> any other project. It lives only in this folder (`~/Desktop/Arkitype`).
>
> For the blow-by-blow version history (v3→v9), read [`progress.md`](./progress.md) —
> that's the changelog. **This file is the orientation.** Read this first, then that.

---

## 1. What Arkitype is

A **guided design-system builder** (Next.js 14 App Router + React 18 + TypeScript). It
walks the user through an ordered rail of focused decisions — colour, type, space, shape,
motion, roles — turns them into design tokens + semantic roles, lets them deeply re-bind
**43 live components** to those tokens through a Figma-style Component Studio, and exports
the result (docs + a Figma variables bundle).

- **Status:** alpha (`0.1.0-alpha`). Branch `feat/chrome-theming-studio-and-roles-merge`.
  Working tree currently clean; `npx tsc --noEmit` passes (exit 0).
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
```

`.claude/launch.json` already defines an `arkitype` server on port **3111**. Verify changes
live in the preview at `:3111` — walk the affected step, and (for component work) toggle
states/variants + light/dark in the Component Studio and watch computed styles.

---

## 3. The 9-step rail (the product's spine)

A Welcome moment → an ordered `StageRail` of steps, each a focused decision with its own
live canvas. One file per step in `components/steps/`:

| # | Step | File | Produces |
|---|------|------|----------|
| — | Welcome | `Welcome.tsx` | name + brand hex (pure entry) |
| 01 | Colour | `ColourStep.tsx` | colour families → generated ramps + harmony chips |
| 02 | Type | `TypeStep.tsx` | type scale, roles, weights |
| 03 | Space | `SpaceStep.tsx` | spacing scale + breakpoints |
| 04 | Shape | `ShapeStep.tsx` (a.k.a. FoundationStep) | radius + elevation (per-mode shadows) |
| 05 | Motion | `MotionStep.tsx` | durations + easing curves |
| 06 | Roles | `RolesStep.tsx` | semantic token roles mapped onto primitives (+ overrides) |
| 07 | Components | `ComponentsStep.tsx` | the Component Studio (see §5) |
| 08 | Preview | `PreviewStep.tsx` | whole system on a representative dashboard |
| 09 | Ship | `ShipStep.tsx` | export docs + Figma variables bundle |

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
and a `previewAxis` flag). **43 components across 4 lanes:**

- **Controls (12):** Button, Icon button, Button group, Input, Textarea, Select, Search,
  Checkbox, Radio, Switch, Slider, Stepper.
- **Display (14):** Badge, Tag, Avatar, Tooltip, Progress, Spinner, Skeleton, Alert, Toast,
  Stat, Divider, Kbd, Empty state, Code block.
- **Navigation (8):** Tabs, Navbar, Sidebar, Breadcrumbs, Steps, Pagination, Dropdown, Link.
- **Patterns (9):** Modal, Table, Card, List item, Feed item, Accordion, Banner, Field, Stat grid.

`WIRED_COMPONENTS` gates which render live and fully-bindable. Modal / Tabs / Table are
**skeleton + radius only** (intentionally). Factory implementations live in
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
**`arkitype-system`**, currently at **persist `version: 6`**.

**If you change the shape of anything that gets persisted, you MUST bump `version` and add a
`migrate` branch** (the `migrate: (persisted, version) => …` block, ~line 1437). Otherwise a
returning user's stale localStorage deserializes into a broken state. The existing migrate
chain backfills across every prior version (motion/layout, generated+override foundations,
new component ids, etc.) — follow that pattern.

`partialize` (~line 1564) controls *what* persists (e.g. it persists `chromeTheme`). The
`highlight`/"jump here" target is deliberately **not** persisted (transient). Store actions
self-heal missing component ids (`{...DEFAULT_COMPONENTS, ...saved}`) so new components
appear for existing users without a hard migrate.

---

## 7. Token pipeline & export

- `lib/tokens.ts` — `systemCssVars` compiles the whole system into `--ark-*` vars (colour
  ramps, `--ark-<family>-<label>` primitives, per-mode shadows, weight/font-role vars, hex
  roles, dynamic step labels). This is what every component reads.
- `lib/color.ts` — ramp generation (`generateRamp`, `familyRamp`), harmony suggestions.
- `lib/typography.ts` — `generateTypeScale` (size/leading/weight/role + rounding).
- `lib/figma.ts` — the Figma variables bundle (dynamic families, type/weight/font/shadow,
  hex-or-alias semantics). **Tokens-only by design** — component bindings/options are NOT in
  the Figma bundle yet (see next steps).
- `lib/docs.ts` — the exported docs; §6 lists "Configured components" (resolved options +
  override counts). Token count is ~187.

---

## 8. Project layout

```
app/
  page.tsx           App Router entry — mounts the rail, applies chromeTheme to <html>
  layout.tsx         root layout
  globals.css        --c-* chrome theme vars (:root / .dark) + .studio-grid container queries
components/
  shell/             TopBar, StageRail, StepScaffold
  steps/             one file per rail step (§3)
  factory/           token-bound component factory + ComponentStudio + useHighlight + *Skeletons
  ui/                ThemeFrame (preview theming), controls
lib/                 tokens, color, typography, binding, componentSchema, figma, docs
store/               useDesignSystem.ts (persisted Zustand — §6)
progress.md          the version-by-version build log (authoritative changelog)
```

---

## 9. Next steps (from progress.md, fast-follow)

1. **Grow the component library** 43 → 60–70+ across all lanes.
2. **Typography + alias parity:** per-step leading-override UI, editable type-scale steps,
   a unified TokenPicker in Roles.
3. **Export component bindings** into the Figma/docs bundle (currently tokens-only).
4. **Iconography foundation** (style / stroke / grid) — the one Figma foundation not yet covered.
5. **Real per-step completion criteria** (e.g. a Roles WCAG-AA contrast gate with override).
6. **Restart-system affordance + keyboard flow** (⌘→ to advance the rail).
7. **Production build + deploy.**

---

## 10. Conventions to keep

- Keep `npx tsc --noEmit` at exit 0 before considering a change done; then verify live on :3111.
- Components read `--ark-*`; the tool chrome reads `--c-*`. Never cross them.
- Any persisted-shape change ⇒ bump persist `version` + add a `migrate` branch (§6).
- Defaults must stay pixel-identical when adding bindability (binding is additive).
- **Update `progress.md`** after each compiled module — it's the running memory checkpoint.

---

*This document is Arkitype's own. It has nothing to do with any other repository on this machine.*
