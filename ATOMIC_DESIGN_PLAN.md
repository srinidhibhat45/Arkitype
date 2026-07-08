# Arkitype — Atomic Instance Model: Implementation Plan

> **Purpose:** a self-contained plan for the "true atomic design" rebuild —
> written so it can be handed to another AI/tool (e.g. Antigravity + Gemini) and
> executed without this conversation's context. Read this file top to bottom
> before touching code. For general orientation read `HANDOFF.md` first.
>
> **Status:** Phase 0 done (2026-07-08) — `SlotSpec`/`slots` added to
> `lib/componentSchema.ts`, `ComponentConfig.instances` + persist v8→v9
> migration added to `store/useDesignSystem.ts`, dead `primaryButtonSpec`/
> `secondaryButtonSpec` clones deleted, `modal` migrated to `slots`
> (`primaryAction`/`secondaryAction`/`closeButton`), `useSlotInstance` hook
> added. `npx tsc --noEmit` clean. **Not yet done:** `ModalSkeletons.tsx` still
> reads the old `parentProperties?.["primaryButton.*"]` pattern instead of
> calling `useSlotInstance` (Phase 1 step 7) — the migration lifts old data
> into `instances` but the renderer doesn't consume it yet, so wire that up
> next. No inspector UI section for slots yet (Phase 1 step 8). Tabs/Table and
> the rest of Phase 3 are untouched.

---

## 1. The problem, precisely

Arkitype already has atoms (tokens) and molecules (43 components) that read
their styling from a shared cascade (`--ark-*` CSS vars), so editing a
molecule's binding *already* updates every place it's used — this part of
"atomic design" is real and working today, verified in `progress.md`
("Cascading Child Resolvers", 2026-07-07).

What's missing is the other half of the model, the one the user actually
asked for: **a governed instance system**. In a real design system (Figma
components, Material, etc.):

- An **atom** (token) changing propagates everywhere it's used. ✅ already true.
- A **molecule** (Button) changing propagates into every **organism**
  (Modal, Card, Alert...) that uses it. ✅ already true for *style*.
- An organism's *instance* of a molecule (e.g. Modal's primary-action button)
  can only have **content** overridden locally — its text, its icon, and
  *which variant/size of the molecule to render*. It can **never** override
  style (colour, padding, radius, border, font) — that always comes from the
  molecule's own global definition. ❌ **this rule exists informally in one
  file (Modal) and nowhere else, is not enforced by the type system, and is
  not declared in the schema that drives the inspector UI.**

So the real gap isn't "build atomic design from scratch" — it's **formalize
the instance/slot concept that today is hand-rolled, inconsistent, and partly
dead code**, and **roll it out to all 43 components** so every organism
follows the same rule the same way.

---

## 2. Evidence from the current codebase (verified 2026-07-08)

Read these files before starting — they are the ground truth, not this doc:

- `lib/componentSchema.ts` — `ComponentSpec.children?: string[]` is the only
  existing "this organism uses that molecule" declaration. It's just a list of
  ids, not a slot model — no way to say "two separate button instances," no
  way to declare which fields are instance-content vs which are style.
- `lib/componentSchema.ts:1389-1397` — `primaryButtonSpec`/`secondaryButtonSpec`
  are **dead**: they clone `buttonSpec` under new ids, but are never in
  `WIRED_COMPONENTS`, never resolved via `useComponentBindings`, and
  `ModalSkeletons.tsx` actually resolves style through plain `"button"`. Only
  `modal.children` still lists the phantom ids. Delete them; this is legacy
  from an earlier design that was later reworked without cleanup.
- `lib/componentSchema.ts:1561-1567` — `createChildResolver(childId, parentResolve, childResolve)`
  literally ignores `parentResolve` and returns `childResolve` unchanged. The
  comment says "Enforces Atomic Design by bypassing parent overrides" — that's
  correct behavior, but the dead parameter makes the invariant look accidental
  rather than intentional. Fix the signature so the intent is explicit in the
  type (see §4).
- `components/factory/ModalSkeletons.tsx:250-264` — per-slot **content**
  (which button size/variant/icon to show for the primary and secondary
  actions) is read as ad hoc string-keyed properties:
  `parentProperties?.["primaryButton.size"]`, `["primaryButton.variant"]`,
  `["primaryButton.prefixIcon"]`, etc. **None of these keys are declared as
  `OptionSpec`s in `modalSpec.options`** (only `primaryLabel`, `secondaryLabel`,
  `showSecondary` are). That means there is currently **no UI control** for
  picking the primary button's variant/size/icon — a real, silent functionality
  gap, not just an architecture smell.
- Cascading style resolution (`useComponentBindings` + `createChildResolver`)
  is already wired in more places than just Modal: `FeedbackComponents.tsx`
  (Alert/Toast), `PatternComponents.tsx` (Card, ListItem, FeedItem), `NavPatternComponents.tsx`
  (Navbar), `NavigationComponents.tsx` (Sidebar), `TableSkeletons.tsx` (badge/avatar
  in cells), `DisplayComponents.tsx`. So the style-inheritance half of the work
  is largely done — don't rebuild it, formalize and reuse it.
- `store/useDesignSystem.ts:388-394` — `ComponentConfig` is `{ skeletonId,
  properties, bindings }`, **one flat config per component id**, global. There
  is no per-instance/per-slot storage today; that's why Modal had to invent the
  `"primaryButton.foo"` string-prefix hack instead of a real per-slot bag.
  Persist version is currently **8** (`store/useDesignSystem.ts:1832`).

Conclusion: this is a **formalization + rollout** project, not a from-scratch
build. Scope it that way — most of phase work is "give the existing pattern a
name, a type, and a home," then repeat it consistently.

---

## 3. Vocabulary mapping (for this codebase specifically)

| Atomic design term | Arkitype today |
|---|---|
| Atoms | `primitives` (colour ramps, spacing, radius, type scale, elevation, motion) + `semantics` (roles) in `store/useDesignSystem.ts`, surfaced as `--ark-*` CSS vars via `lib/tokens.ts`. No change needed. |
| Molecules | Tier-1 `ComponentSpec`s in `lib/componentSchema.ts` (button, input, badge, avatar, iconButton, …). Each has exactly one global `ComponentConfig` in the store. No change needed to this layer's *style* model. |
| Organisms | Tier-2 `ComponentSpec`s (modal, tabs, table, card, alert, toast, banner, navbar, sidebar, dropdown, accordion, pagination, field, statGrid, listItem, feedItem, buttonGroup). These need the new **slot** model (§4). |
| Instance | **New concept.** A named placement of one molecule inside one organism (e.g. modal's "primaryAction" is an instance of "button"). Carries content overrides only. |

---

## 4. The new abstraction: slots + instances

### 4.1 Schema (`lib/componentSchema.ts`)

Add a `SlotSpec` and attach it to organisms instead of the bare `children` list:

```ts
export interface SlotSpec {
  id: string;            // stable within the organism, e.g. "primaryAction"
  componentId: string;   // which molecule this is an instance of, e.g. "button"
  label: string;         // inspector section heading, e.g. "Primary action"
  /** Content-only fields — NEVER colour/space/radius/border/font. */
  content: OptionSpec[];
}

export interface ComponentSpec {
  id: string;
  tier: 1 | 2;
  states: CState[];
  parts: PartSpec[];
  options?: OptionSpec[];
  slots?: SlotSpec[];     // replaces free-form `children` for tier-2 specs
}
```

Keep `getComponentChildren`/`getParentComponents` working by deriving them:
`children = slots?.map(s => s.componentId) ?? []` — anything reading the old
`children` list (docs, wayfinding) keeps working unchanged.

**Hard rule to enforce in code review, not just convention:** a `SlotSpec.content`
array may only contain `OptionSpec`s whose `type` is `"text"`, `"boolean"`, or an
`"enum"` that selects among the molecule's own existing variants/sizes/icons.
It must never contain `"color"` or a raw dimension — those only exist on the
molecule's own `parts`/`options`. If you catch yourself wanting to add a color
field to a slot, that color belongs on the molecule, not the slot.

### 4.2 Store (`store/useDesignSystem.ts`)

```ts
export interface ComponentConfig {
  skeletonId: string;
  properties: Record<string, string | number | boolean>;
  bindings?: Record<string, string>;
  /** NEW: per-slot content overrides, keyed by SlotSpec.id. Never holds style. */
  instances?: Record<string, Record<string, string | number | boolean>>;
}
```

Bump persist `version` from 8 → **9**. Migration (`migrate`):
- For `modal` specifically, lift the legacy `primaryButton.*`/`secondaryButton.*`/
  `iconButton.*` keys out of `properties` into `instances.primaryAction`,
  `instances.secondaryAction`, `instances.closeButton` respectively, so
  existing saved projects don't silently lose whatever was there. (In practice
  there's likely nothing meaningful stored for the variant/size/icon keys since
  no UI ever wrote them — but `primaryLabel`/`secondaryLabel` text *has* been
  reachable and must survive.)
- For every other `ComponentConfig`, default `instances` to `{}` — no data to
  migrate since no other organism had this pattern yet.
- Follow the existing lesson already documented in `HANDOFF.md`/memory: default
  at the *read site* too (`cfg?.instances?.[slotId] ?? {}`), not only in
  `migrate()` — a past incident showed a persisted `version` can get stamped
  ahead of the matching shape during HMR.

### 4.3 Resolution helpers (`lib/componentSchema.ts`)

```ts
/** Content-only resolver for one slot: schema default merged with any stored override. */
export function useSlotInstance(
  organismId: string,
  slotId: string
): { resolve: Resolver; content: Record<string, string | number | boolean> } {
  const slot = COMPONENT_SPECS[organismId]?.slots?.find(s => s.id === slotId);
  const stored = useDesignSystem(s => s.components[organismId]?.instances?.[slotId]);
  const resolve = useComponentBindings(slot!.componentId); // style ALWAYS global — no override path exists
  const content: Record<string, string | number | boolean> = {};
  for (const o of slot?.content ?? []) content[o.key] = stored?.[o.key] ?? o.def;
  return { resolve, content };
}
```

This is the generic replacement for the bespoke
`parentProperties?.["primaryButton.size"]` pattern — note there is **no
parameter for a parent to inject a style override**. The absence of that
parameter *is* the enforcement mechanism: it's structurally impossible for an
organism to override a molecule's colour/padding, because the function that
gives you the molecule's look never accepts organism input.

Also tidy `createChildResolver`'s signature to drop the unused `parentResolve`
param (or keep it but rename to make the no-op intentional, e.g.
`lockToChildStyle(childResolve)`), so the type signature itself communicates
the rule instead of relying on a comment.

### 4.4 Inspector UI (`components/factory/*` inspector rendering)

For a tier-2 component, render one collapsible section per `slot`:
- Heading = `slot.label` + the molecule name, e.g. "Primary action — Button".
- Controls = auto-generated from `slot.content` (same generator already used
  for `options`), so no new control-widget code is needed — only new grouping.
- A small "Edit Button styling →" link that calls `goToStep`/`pendingFocus`
  into the Components step for that molecule, reusing the existing
  `bindingSource` cross-step wayfinding link pattern from the 2026-07-07 IA
  pass (`studioShared.tsx`'s shared picker) — so users are never confused
  about *where* to change the look.
- Explicitly no colour/space/radius/border controls in this section, ever —
  see the hard rule in §4.1.

---

## 5. Phased rollout

Do these in order; each phase should end with a working, verified app (not a
half-migrated one). Use the `verify` skill / preview MCP after each phase, not
just at the end.

**Phase 0 — Foundations (no visible UI change)**
1. Add `SlotSpec` type + `slots` field to `ComponentSpec` in `lib/componentSchema.ts`.
   Derive `children` from `slots` where present; leave organisms that haven't
   been migrated yet on the old plain `children: string[]`.
2. Add `instances` to `ComponentConfig` in `store/useDesignSystem.ts`; bump
   persist version 8 → 9 with the migration described in §4.2.
3. Add `useSlotInstance` to `lib/componentSchema.ts`.
4. Delete the dead `primaryButtonSpec`/`secondaryButtonSpec` clones.
5. `npx tsc --noEmit` must stay clean. No visual change expected yet.

**Phase 1 — Migrate Modal (proves the pattern; highest existing debt)**
6. Replace `modal.children` with `modal.slots`: `primaryAction`→button,
   `secondaryAction`→button, `closeButton`→iconButton. Each slot's `content`
   should include the fields Modal already *wants* to expose (label/text,
   icon, variant, size) as proper `OptionSpec`s — this is also the fix for the
   "no UI control exists for these" gap found in §2.
7. Rewrite `ModalSkeletons.tsx` to call `useSlotInstance("modal", "primaryAction")`
   etc. instead of manually indexing `parentProperties`. Delete the manual
   `primarySize`/`primaryVariant`/`primaryPrefix`/... local variables.
8. Add the slot inspector sections for Modal (§4.4).
9. Verify in the preview MCP:
   - Change the Button molecule's global padding/colour in the Components
     step → confirm both Modal action buttons update, on all 4 modal skeletons.
   - Set Modal's primary-action label/icon via its new slot controls →
     confirm it does *not* leak into the standalone Button preview or any
     other organism.
   - Reload with a pre-Phase-0 localStorage snapshot (or force `version: 8`)
     → confirm migration runs once, existing label text survives, no console
     errors.

**Phase 2 — Migrate Tabs and Table**
   Same steps as Phase 1, scoped to `tabs.slots` and `table.slots` (both
   already have partial cascading-resolver wiring per `progress.md`, so this
   should be mostly mechanical).

**Phase 3 — Roll out to the remaining organisms, in this order (simplest → most slots):**
   `buttonGroup` → `alert`, `toast`, `banner` (each already has an
   `action`/`dismissible` boolean implying a button/iconButton slot) →
   `card`, `listItem`, `feedItem`, `accordion` → `navbar`, `sidebar`,
   `dropdown`, `pagination` → `field`, `statGrid`.

   For each: convert `children` → `slots`, move any ad hoc per-instance
   properties out of the flat `properties` bag into `instances`, add the
   inspector section, verify style propagation + content isolation exactly as
   in Phase 1 step 9.

   **Judgment call, not a rule:** not every `children` entry needs to become a
   full slot. If a molecule appears inside an organism purely as repeated data
   (e.g. Table's per-row `TokenBadge`/`TokenAvatar` — one instance per data
   row, no single editable "content" slot makes sense) leave it as a plain
   style-only child. Slots are for *fixed, singular* placements with
   meaningful content to override (a modal's one primary button, a toast's one
   action), not for repeated list items. Don't manufacture a slot where the
   real answer is "this is just styled data."

**Phase 4 — Full verification pass**
   - `npx tsc --noEmit` clean.
   - Walk all four lanes (Controls/Display/Navigation/Patterns) in the preview
     MCP, zero console errors, both preview modes.
   - Pick 2-3 molecules (Button, IconButton, Badge) and change a global style
     property each; confirm the change ripples into every organism that uses
     them, screenshotted before/after.
   - Confirm no organism's inspector exposes a colour/padding/radius/border
     control anywhere under a slot section (spot-check by reading each
     migrated `SlotSpec.content` array, not just clicking through the UI).

**Phase 5 — stretch, not required for correctness**
   Already-deferred items from `progress.md`/memory that become easier once
   slots exist: export slot content overrides into the Figma bundle
   (`lib/figma.ts`), typography/alias parity pass. Do not start this until
   Phases 0-4 are done and verified.

---

## 6. Known gotchas (from prior sessions on this project — don't rediscover these)

- `preview_click` has been flaky in this app (stale Next dev overlay); dispatch
  `.click()`/input events via `preview_eval` instead when verifying.
- `preview_logs`/`preview_console_logs` return a **cumulative** buffer — an old
  transient error from mid-edit can look like a current failure. Cross-check
  with `npx tsc --noEmit` and a fresh reload before trusting a scary-looking
  log line.
- Zustand persist can get a `version` bumped without the matching shape landing
  if the store module is mid-edit during HMR. Migration alone isn't sufficient
  defense — also default at every read site (`?? {}` / `?? []`).
- Container queries, not viewport media queries, drive `ComponentStudio`'s
  responsive layout (`.studio-grid`) — keep that in mind if slot sections need
  their own responsive collapse.
- Bash's cwd in a shared session can drift to an unrelated project directory —
  always `cd ~/Desktop/Arkitype` explicitly before `npm`/`npx` commands.
- This project shares no code with Hued; do not import from or reference the
  Hued repo.

---

## 7. Definition of done

- `lib/componentSchema.ts` has no organism with a bare `children: string[]`
  that could reasonably be a `slots` array (data-repeat cases from Phase 3's
  judgment call are the accepted exception).
- No `SlotSpec.content` anywhere contains a style-typed `OptionSpec`.
- `ComponentConfig.instances` is the only place per-instance content lives;
  the `"primaryButton.size"`-style string-prefix hack is gone from every
  factory file.
- Changing any molecule's global binding/property visibly updates every
  organism that embeds it, with zero organism-specific code required to make
  that happen (it falls out of `useSlotInstance` / `useComponentBindings`
  automatically).
- `npx tsc --noEmit` clean; full preview MCP walk clean.
