# Arkitype — Atomic Instance Model: Implementation Plan

> **Purpose:** a self-contained, execute-without-guessing plan for the "true
> atomic design" rebuild, written for handoff to another AI/tool (Antigravity +
> Gemini) with **zero access to this conversation**. Every claim below was
> verified by reading the actual file at the line numbers cited — treat line
> numbers as approximate (±10) if the file has since changed, but the code
> shapes and reasoning are exact as of 2026-07-08. For general project
> orientation read `HANDOFF.md` first; this file is the engineering plan for
> one specific initiative.
>
> **Do not skip §8 before touching `ComponentStudio.tsx`.** It documents a bug
> that Phase 0/1 of this plan introduced and that must be fixed *first* — the
> Modal work described as "done" below is not actually usable in the UI yet
> because of it.

---

## 0. Status as of 2026-07-08 — read this first

**Done and type-checked (`npx tsc --noEmit` clean), committed:**

- Commit `3a6d39b` — Phase 0 foundations: `SlotSpec`/`slots` type added to
  `lib/componentSchema.ts`; `ComponentConfig.instances` + persist v8→v9
  migration added to `store/useDesignSystem.ts`; dead `primaryButtonSpec`/
  `secondaryButtonSpec` clones deleted; `useSlotInstance()` helper added;
  `modal` spec converted to `slots`.
- Commit `065e17f` — Phase 1 partial: `components/factory/ModalSkeletons.tsx`
  rewritten to read primary/secondary/close-button content through
  `useSlotInstance()` instead of `parentProperties?.["primaryButton.*"]`.

**Not done, and more precisely scoped than the previous version of this
document claimed:**

1. **§8 bug fix (do this first, blocks everything else).** Deleting
   `primaryButtonSpec`/`secondaryButtonSpec` and changing `modal.children` to
   dedupe to `["button","iconButton",...]` silently broke an *already-working*
   inspector UI in `components/factory/ComponentStudio.tsx` (a generic
   "child options" cluster renderer, ~line 1258–1404) that used to show
   separate "Primary Button Options" / "Secondary Button Options" sections and
   wrote to `properties["primaryButton.variant"]` etc. That UI is now gone
   (collapsed into one deduped "Button Options" cluster) **and** disconnected
   from what `ModalSkeletons.tsx` now reads (`instances.primaryAction`/etc).
   Net effect: right now, in the running app, there is **no working UI at all**
   for Modal's primary/secondary/close-button content — worse than before
   Phase 0/1 started, even though the data model is more correct. §8 gives the
   exact fix: add `setSlotContent` to the store, and branch
   `ComponentStudioControls`'s cluster-building loop on `spec.slots` vs the
   legacy `spec.children`.
2. Tabs and Table (Phase 2) are untouched.
3. The 13 remaining organisms (Phase 3) are untouched — see §9 for the
   per-organism table with verified wiring status (not all of them are at the
   same starting point; some have *zero* content-customization UI today, not
   just an ad hoc one — see Alert and Field specifically).
4. Live browser verification has not been run — see §7.

**Execution order for whoever picks this up:** §8 (fix the regression) →
finish Phase 1 (Modal inspector UI actually renders and writes correctly) →
§7 verification → Phase 2 (Tabs, Table) → Phase 3 (§9 table, in the stated
order) → §10 final verification pass.

---

## 1. The problem, precisely

Arkitype already has atoms (tokens) and molecules (43 components) that read
their styling from a shared cascade (`--ark-*` CSS vars), so editing a
molecule's binding *already* updates every place it's used — this part of
"atomic design" is real and working today, verified in `progress.md`
("Cascading Child Resolvers", 2026-07-07).

What's missing is the instance half of the model:

- An **atom** (token) changing propagates everywhere it's used. ✅ already true.
- A **molecule** (Button) changing propagates into every **organism** (Modal,
  Card, Alert...) that uses it. ✅ already true for *style*.
- An organism's *instance* of a molecule (e.g. Modal's primary-action button)
  can only have **content** overridden locally — its text, its icon, and
  which variant/size of the molecule to render. It can **never** override
  style (colour, padding, radius, border, font) — that always comes from the
  molecule's own global definition. ❌ this rule existed informally in one
  file (Modal), inconsistently, via a naming hack (`primaryButton`/
  `secondaryButton` as if they were separate molecules), and wasn't declared
  anywhere the inspector UI could read it.

This is a **formalization + rollout** project, not a from-scratch build. The
new pieces are: a typed `SlotSpec`/`instances` model (built, Phase 0), a
generic resolver (`useSlotInstance`, built), a generic inspector renderer for
it (**not yet built — this is the immediate blocker, §8**), and then repeating
the pattern across 15 organisms (§9).

---

## 2. Vocabulary mapping (for this codebase specifically)

| Atomic design term | Arkitype today |
|---|---|
| Atoms | `primitives` (colour ramps, spacing, radius, type scale, elevation, motion) + `semantics` (roles) in `store/useDesignSystem.ts`, surfaced as `--ark-*` CSS vars via `lib/tokens.ts`. No change needed. |
| Molecules | Tier-1 `ComponentSpec`s in `lib/componentSchema.ts` (button, input, badge, avatar, iconButton, …). Each has exactly one global `ComponentConfig` in the store (`components[id]`). No change needed to this layer's *style* model. |
| Organisms | Tier-2 `ComponentSpec`s: `buttonGroup`, `alert`, `toast`, `banner`, `card`, `listItem`, `feedItem`, `accordion`, `field`, `statGrid`, `navbar`, `sidebar`, `dropdown`, `pagination`, `modal`, `tabs`, `table`. These need the slot model (§3). `emptyState` (tier 2, `children: ["button"]`) is a 16th organism the original audit missed — see §9 row for it. |
| Instance | A named placement of one molecule inside one organism (e.g. modal's `"primaryAction"` is an instance of `"button"`). Carries content overrides only, stored in `ComponentConfig.instances[slotId]`. |

---

## 3. The abstraction, as actually implemented (Phase 0/1, done)

### 3.1 Schema — `lib/componentSchema.ts`

```ts
export interface SlotSpec {
  id: string;            // stable within the organism, e.g. "primaryAction"
  componentId: string;   // which molecule this is an instance of, e.g. "button"
  label: string;         // inspector section heading, e.g. "Primary action"
  content: OptionSpec[]; // content-only fields — see the hard rule below
}

export interface ComponentSpec {
  id: string;
  tier: 1 | 2;
  states: CState[];
  parts: PartSpec[];
  options?: OptionSpec[];
  /** @deprecated prefer `slots` — kept for organisms not yet migrated. */
  children?: string[];
  slots?: SlotSpec[];
}
```

**Hard rule, enforce by review:** `SlotSpec.content` may only contain
`OptionSpec`s of type `"text"`, `"boolean"`, or `"enum"` (selecting among the
molecule's own existing variants/sizes/icon-name-strings). Never `"color"`,
never a raw dimension. If a slot needs a colour, that's a sign the colour
belongs on the molecule (or on the organism's own container, if it's the
organism's *own* surface, not the embedded molecule's).

`getComponentChildren(id)` now derives from `slots` when present:

```ts
export function getComponentChildren(id: string): string[] {
  const spec = COMPONENT_SPECS[id];
  if (spec?.slots?.length) return Array.from(new Set(spec.slots.map((s) => s.componentId)));
  return spec?.children ?? [];
}
```

And the generic slot resolver/reader, already added right after it:

```ts
export function getSlotSpec(organismId: string, slotId: string): SlotSpec | undefined {
  return COMPONENT_SPECS[organismId]?.slots?.find((s) => s.id === slotId);
}

export function useSlotInstance(
  organismId: string,
  slotId: string
): { resolve: Resolver; content: Record<string, string | number | boolean> } {
  const slot = getSlotSpec(organismId, slotId);
  const stored = useDesignSystem((s) => s.components[organismId]?.instances?.[slotId]);
  const resolve = useComponentBindings(slot?.componentId ?? "");
  const content: Record<string, string | number | boolean> = {};
  for (const o of slot?.content ?? []) {
    content[o.key] = stored?.[o.key] ?? o.def;
  }
  return { resolve, content };
}
```

The enforcement mechanism is structural, not conventional: `resolve` comes
from `useComponentBindings(slot.componentId)` — the molecule's own **global**
resolver — and there is no code path anywhere that lets an organism's
`instances` bag feed into `resolve`. An organism literally cannot override a
slot's colour/padding even if someone tried, because the function that
produces the look takes no organism-scoped input.

### 3.2 Store — `store/useDesignSystem.ts`

```ts
export interface ComponentConfig {
  skeletonId: string;
  properties: Record<string, string | number | boolean>;
  bindings?: Record<string, string>;
  /** Per-slot content overrides, keyed by SlotSpec.id. Never holds style. */
  instances?: Record<string, Record<string, string | number | boolean>>;
}
```

Persist `version: 9` (was 8). Migration backfills `instances: {}` on every
`ComponentConfig` (both the top-level `state.components` mirror and every
`state.projects[id].components`), and additionally lifts Modal's legacy
`primaryButton.*`/`secondaryButton.*`/`iconButton.*`/`primaryLabel`/
`secondaryLabel` properties into `instances.primaryAction`/
`instances.secondaryAction`/`instances.closeButton`. Full code is already in
the file — read `store/useDesignSystem.ts` around `if (version < 9)` before
touching it again; don't re-derive it from this description.

### 3.3 Modal's slot declaration (already written, `lib/componentSchema.ts`, in the `modal` entry of `OTHER_SPECS`)

```ts
slots: [
  {
    id: "primaryAction",
    componentId: "button",
    label: "Primary action",
    content: [
      textOpt("label", "Label", "Confirm"),
      enumOpt("variant", "Style variant", [ /* filled/tonal/elevated/outlined/text/error/warning/success */ ], "filled"),
      enumOpt("size", "Size", [ /* sm/md/lg/xl */ ], "sm"),
      textOpt("prefixIcon", "Prefix icon (Material name)", ""),
      textOpt("suffixIcon", "Suffix icon (Material name)", ""),
    ],
  },
  {
    id: "secondaryAction",
    componentId: "button",
    label: "Secondary action",
    content: [ /* same shape, defaults "Cancel" / "outlined" */ ],
  },
  {
    id: "closeButton",
    componentId: "iconButton",
    label: "Close icon",
    content: [
      enumOpt("variant", "Variant", [ /* solid/outline/ghost */ ], "ghost"),
      enumOpt("size", "Size", [ /* sm/md/lg/xl */ ], "sm"),
    ],
  },
],
```

`modal.options` had `primaryLabel`/`secondaryLabel` removed (label now lives on
the slot). `showSecondary` stayed — it's a real modal-level boolean ("does the
secondary slot render at all"), not slot content.

### 3.4 `ModalSkeletons.tsx` (already rewritten)

```ts
const primaryAction = useSlotInstance("modal", "primaryAction");
const secondaryAction = useSlotInstance("modal", "secondaryAction");
const closeAction = useSlotInstance("modal", "closeButton");

const primarySize = primaryAction.content.size as any;
const primaryVariant = primaryAction.content.variant as any;
const primaryPrefix = primaryAction.content.prefixIcon as string;
const primarySuffix = primaryAction.content.suffixIcon as string;
const primaryLabel = primaryAction.content.label as string;
// ...mirror for secondaryAction, plus iconBtnSize/iconBtnVariant from closeAction.content
```

`<TokenButton resolve={primaryAction.resolve} ...>{primaryLabel}</TokenButton>`
and similarly for secondary/close. The repeated per-item icon buttons in the
bottom-sheet file grid deliberately stayed on plain
`useComponentBindings("iconButton")` — that's styled repeated data (one icon
per file card), not a fixed instance worth a slot. This is the template for
the "judgment call" in §6.

---

## 4. New store action needed — not yet added — exact code

**File:** `store/useDesignSystem.ts`.

Add to the `ArkitypeState` interface, next to the existing component actions
(search for `setComponentProperty: (` — currently ~line 592):

```ts
setSlotContent: (
  componentId: string,
  slotId: string,
  key: string,
  value: string | number | boolean
) => void;
```

Add the implementation immediately after `setComponentProperty`'s
implementation (search for `setComponentProperty: (componentId, key, value) =>`
— currently ~line 1756):

```ts
setSlotContent: (componentId, slotId, key, value) =>
  set((state) => {
    const cfg = state.components[componentId] ?? { skeletonId: "1", properties: {} };
    return {
      components: {
        ...state.components,
        [componentId]: {
          ...cfg,
          instances: {
            ...(cfg.instances ?? {}),
            [slotId]: {
              ...(cfg.instances?.[slotId] ?? {}),
              [key]: value,
            },
          },
        },
      },
    };
  }),
```

This mirrors `setComponentProperty` exactly, one level deeper (`instances →
slotId → key` instead of `properties → key`). It only ever writes to the
top-level `state.components` mirror, same as every other existing
`setComponentProperty`/`setComponentBinding` action — don't add project-array
syncing here since none of the existing sibling actions do it either
(there must be a separate subscription/sync mechanism elsewhere keeping the
active project's `components` in step; do not try to reverse-engineer or
duplicate it inside this new action — grep for where `state.projects` gets
written back from `state.components` before assuming it's missing).

---

## 5. §8 promised above: the ComponentStudio.tsx regression and its fix

**This is the most important section in this document. Do this before
anything else.**

### 5.1 What broke, and why

`components/factory/ComponentStudio.tsx` has a function
`ComponentStudioControls({ id, ... })` (~line 888) that builds an array of UI
"clusters" for the right-hand inspector panel. Around line 1258, there is
(**still, today**) this block:

```tsx
if (spec.children && spec.children.length > 0) {
  for (const childId of spec.children) {
    const childSpec = COMPONENT_SPECS[childId];
    if (!childSpec) continue;

    const childOptions = childSpec.options?.filter((o) => !o.previewAxis) ?? [];
    const hasChildSize = SIZABLE.has(childId);
    const hasChildOptions = childOptions.length > 0 || hasChildSize;
    if (!hasChildOptions) continue;

    // ...builds numOpts/boolOpts/textOpts/colorOpts/enumOpts from childOptions...

    const getChildPropVal = (key: string, def: string | boolean | number) => {
      const fullKey = `${childId}.${key}`;
      const val = properties?.[fullKey];
      return typeof val !== "undefined" ? val : def;
    };

    // childTitle special-cases "primaryButton" -> "Primary Button", etc.

    clusters.push({
      key: `child.${childId}.options`,
      title: `${childTitle} Options`,
      part: null,
      content: ( /* renders controls, each onChange calling
                    setProperty(id, `${childId}.${o.key}`, v) */ ),
    });
  }
}
```

Before Phase 0, `spec.children` for `modal` was
`["primaryButton", "secondaryButton", "iconButton", "input", "select", "alert"]`.
`COMPONENT_SPECS["primaryButton"]` was a clone of the real Button molecule's
spec (including its `options`: `variant`, `prefixIcon`, `suffixIcon`), so this
loop produced **two separate clusters** — "Primary Button Options" and
"Secondary Button Options" — each writing to
`properties["primaryButton.variant"]` / `properties["secondaryButton.variant"]`
respectively (distinct keys, correctly separated). **Note `hasChildSize =
SIZABLE.has(childId)` was `false` for both `"primaryButton"` and
`"secondaryButton"`** (`SIZABLE` — defined ~line 142 — only lists real molecule
ids: `button, input, textarea, select, iconButton, searchField, stepper`), so
**size was never actually controllable** through this UI even before Phase 0 —
only variant/prefixIcon/suffixIcon were. That part of the original plan's
claim ("no UI control exists for size") was correct; the claim that *no* UI
existed for variant/icon was not — there was one, and Phase 0 removed it by
deleting `primaryButtonSpec`/`secondaryButtonSpec`.

After Phase 0: `getComponentChildren("modal")` now derives from `slots` and
dedupes to `["button", "iconButton"]` (both `primaryAction` and
`secondaryAction` point at `componentId: "button"`). The loop above now
produces **one** cluster, "Button Options", writing to
`properties["button.variant"]` — which is: (a) not separated by
primary/secondary at all, and (b) not read by anything, since
`ModalSkeletons.tsx` now reads `instances.primaryAction.variant` /
`instances.secondaryAction.variant` via `useSlotInstance`, not
`properties["button.variant"]`.

**Net result: right now, editing Modal in the running app gives you a "Button
Options" cluster that does nothing observable, and no way at all to set the
primary/secondary button's label, icon, or variant, or the close icon's
variant/size.** This must be fixed before Phase 1 can be called done.

### 5.2 The fix — exact replacement code

In `useStudioData(id)` (~line 424), add two more destructured values:

```ts
function useStudioData(id: string) {
  const spec = COMPONENT_SPECS[id];
  const cfg = useDesignSystem((s) => s.components[id]);
  const bindings = useDesignSystem((s) => s.components[id]?.bindings);
  const setBinding = useDesignSystem((s) => s.setComponentBinding);
  const clearBinding = useDesignSystem((s) => s.clearComponentBinding);
  const resetAll = useDesignSystem((s) => s.resetComponentBindings);
  const setProperty = useDesignSystem((s) => s.setComponentProperty);
  const setSlotContent = useDesignSystem((s) => s.setSlotContent); // NEW
  const currentMode = useDesignSystem((s) => s.currentPreviewMode);
  const setPreviewMode = useDesignSystem((s) => s.setPreviewMode);
  const resolve = useComponentBindings(id);
  const data = useInspectorData();

  const properties = cfg?.properties;
  const instances = cfg?.instances; // NEW
  const size = (properties?.size as SizeToken) ?? "md";
  const radiusStep = Number(properties?.radiusStep ?? 2);
  const overrideCount = bindings ? Object.keys(bindings).length : 0;

  return {
    spec, cfg, bindings, setBinding, clearBinding, resetAll,
    setProperty, setSlotContent, currentMode, setPreviewMode, resolve, data,
    properties, instances, size, radiusStep, overrideCount,
  };
}
```

In `ComponentStudioControls`, destructure the two new values from
`useStudioData(id)` (alongside the existing `setProperty`, `properties`,
etc. — search for `const { spec, bindings, setBinding, clearBinding,
setProperty, resolve, data, properties, size } = useStudioData(id);` around
line 897 and add `setSlotContent, instances` to that destructure).

Then replace the entire `if (spec.children && spec.children.length > 0) { ... }`
block (~line 1258–1404) with:

```tsx
if (spec.slots && spec.slots.length > 0) {
  for (const slot of spec.slots) {
    const childSpec = COMPONENT_SPECS[slot.componentId];
    if (!childSpec) continue;

    const slotOptions = slot.content;
    const numOpts = slotOptions.filter((o) => o.type === "number");
    const boolOpts = slotOptions.filter((o) => o.type === "boolean");
    const textOpts = slotOptions.filter((o) => o.type === "text");
    const colorOpts = slotOptions.filter((o) => o.type === "color"); // should stay empty per the hard rule in §3.1
    const enumOpts = slotOptions.filter(
      (o) => o.type !== "number" && o.type !== "boolean" && o.type !== "text" && o.type !== "color"
    );

    const getSlotVal = (key: string, def: string | boolean | number) => {
      const stored = instances?.[slot.id]?.[key];
      return typeof stored !== "undefined" ? stored : def;
    };

    clusters.push({
      key: `slot.${slot.id}.content`,
      title: `${slot.label} — ${childSpec.id}`,
      part: null,
      content: (
        <div className="space-y-2">
          {enumOpts.length > 0 && (
            <div className="flex items-center justify-between gap-3 py-1 border-b border-line pb-2 flex-wrap">
              {enumOpts.map((o) => {
                const val = getSlotVal(o.key, o.def) as string;
                const choices = o.options ?? [];
                return (
                  <div key={o.key} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-fg-mute font-semibold uppercase tracking-wide">{o.label}</span>
                    {choices.length <= 3 ? (
                      <TokenSegmented
                        options={choices.map((c) => ({ label: c.label, value: c.value }))}
                        value={val}
                        onChange={(v) => setSlotContent(id, slot.id, o.key, v)}
                      />
                    ) : (
                      <CompactSelect
                        options={choices.map((c) => ({ label: c.label, value: c.value }))}
                        value={val}
                        onChange={(v) => setSlotContent(id, slot.id, o.key, v)}
                        className="w-24"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {boolOpts.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 py-1.5 border-b border-line last:border-0 pb-2">
              {boolOpts.map((o) => {
                const val = getSlotVal(o.key, o.def) as boolean;
                return (
                  <div key={o.key} className="flex items-center justify-between text-[11px] gap-2">
                    <span className="text-fg-dim font-medium truncate" title={o.label}>{o.label}</span>
                    <OptionToggle value={val} onChange={(v) => setSlotContent(id, slot.id, o.key, v)} />
                  </div>
                );
              })}
            </div>
          )}

          {numOpts.length > 0 && (
            <div className="grid grid-cols-2 gap-2 py-1 border-b border-line last:border-0 pb-1.5">
              {numOpts.map((o) => {
                const val = getSlotVal(o.key, o.def) as number;
                return (
                  <ScrubberInput
                    key={o.key}
                    label={o.label}
                    value={val}
                    min={o.min ?? 0}
                    max={o.max ?? 100}
                    onChange={(v) => setSlotContent(id, slot.id, o.key, v)}
                  />
                );
              })}
            </div>
          )}

          {colorOpts.map((o) => {
            const val = getSlotVal(o.key, o.def) as string;
            return (
              <div key={o.key} className="flex items-center justify-between py-1 border-b border-line last:border-0 pb-1.5">
                <span className="text-[11px] text-fg-dim font-medium">{o.label}</span>
                <HexInput value={val} onChange={(v) => setSlotContent(id, slot.id, o.key, v)} size="sm" />
              </div>
            );
          })}

          {textOpts.length > 0 && (
            <div className="space-y-1.5 py-1 last:border-0 pb-1">
              {textOpts.map((o) => {
                const val = getSlotVal(o.key, o.def) as string;
                return (
                  <div key={o.key} className="flex items-center justify-between gap-3 py-1 border-b border-line last:border-0 pb-1.5">
                    <span className="text-[11px] text-fg-dim font-medium w-24 shrink-0 truncate">{o.label}</span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => setSlotContent(id, slot.id, o.key, e.target.value)}
                      className="flex-1 rounded-md border border-line bg-ink px-2 py-1 text-[11px] text-fg focus:border-focus focus:outline-none font-mono text-right"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ),
    });
  }
} else if (spec.children && spec.children.length > 0) {
  // Legacy path, UNCHANGED, for organisms not yet migrated to slots (Phase 3).
  // Copy the exact original loop body here verbatim — do not modify it, it
  // must keep working exactly as before for every organism still on `children`.
  for (const childId of spec.children) {
    // ...original body, unchanged...
  }
}
```

Notes on this rewrite:
- The new path drops the `SIZABLE`/`hasChildSize` special-casing entirely —
  slot `content` already declares `size` as a normal `enum` `OptionSpec` when
  it's meant to be user-facing (as Modal's does), so it flows through
  `enumOpts` like any other field. No special-casing needed, which is itself a
  simplification worth keeping in mind when authoring new slots: **if you want
  size to be editable for a slot, add it as an `enumOpt("size", ...)` inside
  that slot's `content` array** — it is not automatic the way it was (partially)
  for the old `SIZABLE` mechanism.
- The `childTitle` special-casing (`"primaryButton" -> "Primary Button"`
  etc., ~line 1284–1289) is gone in the new path because `slot.label` already
  carries the human-readable name — that was only ever a workaround for the
  fake component ids.
- The legacy `else if` branch is **load-bearing** — every organism still on
  `children` (i.e., everything except `modal` right now) must keep working
  exactly as it did before this edit. Do not "clean up" or touch that branch
  in the same commit as this fix; touch it only when that specific organism
  is migrated in Phase 3.

### 5.3 Verification for this fix specifically

1. `npx tsc --noEmit` clean.
2. `cd ~/Desktop/Arkitype && npm run dev`, open the Components step, select
   Modal. Confirm you now see three sections: "Primary action — button",
   "Secondary action — button", "Close icon — iconButton", each with the
   controls declared in their `content` arrays (label text input where
   applicable, variant/size selectors, icon text inputs).
3. Change the primary action's label → confirm the modal preview's primary
   button text updates, and confirm no other component (standalone Button
   preview, Toast, any other organism) changes.
4. Go to the Button molecule's own Components-step entry, change its global
   padding or colour binding → confirm both of Modal's action buttons update
   (this is the existing, still-correct cascading-resolver behavior — verify
   it wasn't accidentally broken by this change, it shouldn't be, since
   `resolve` in `useSlotInstance` is untouched).
5. Confirm every *other* organism's inspector (Alert, Toast, Card, Table,
   Tabs, etc. — anything still on `children`) looks and behaves **identically**
   to before this fix. This is the regression-safety check for the `else if`
   branch.

---

## 6. Phase 2 — Tabs and Table

Read `components/factory/TabsSkeletons.tsx` and `components/factory/TableSkeletons.tsx`
fully before starting (both are moderate-sized, single-file organisms, not
split across multiple factory files like Modal's ancillary pieces are).

**Tabs** (`tabsSpec` in `lib/componentSchema.ts`, currently
`children: ["button", "input", "alert", "searchField", "stepper", "badge"]`):
`components/factory/TabsSkeletons.tsx` has a `PanelBody` component
(~line 52–162) that reads `parentProperties?.["button.size"]`,
`["button.variant"]`, `["button.prefixIcon"]`, `["button.suffixIcon"]`,
`["input.size"]`, `["searchField.size"]`, `["stepper.size"]`,
`["alert.variant"]`, `["alert.style"]`, `["alert.accent"]`, `["alert.icon"]` —
all read straight off `cfg?.properties` with the flat `"button.size"`-style
keys, same pattern Modal had. Unlike Modal, there's only **one** button here
(rendered twice, in the "Allocations" and "Audit" panels, both using the same
`btnSize`/`btnVariant`/etc. — so it's arguably a single reusable "action"
slot, not two separate ones like Modal's primary/secondary). Recommended slot
declaration for `tabsSpec`:

```ts
slots: [
  {
    id: "panelAction",
    componentId: "button",
    label: "Panel action button",
    content: [
      enumOpt("variant", "Style variant", [/* same 8 button variants */], "filled"),
      enumOpt("size", "Size", [/* sm/md/lg/xl */], "sm"),
      textOpt("prefixIcon", "Prefix icon (Material name)", ""),
      textOpt("suffixIcon", "Suffix icon (Material name)", ""),
    ],
  },
],
```

Leave `input`, `alert`, `searchField`, `stepper`, `badge` as plain `children`
for now (style-only, via `useComponentBindings`/`createChildResolver`, exactly
as today) **unless** you also want their per-panel text/placeholder content to
become editable — that would be new scope beyond "port the existing ad hoc
button pattern," decide with the user before expanding it. The `alert.*`
properties (`variant`/`style`/`accent`/`icon`) are arguably also "content" in
the atomic-design sense (which alert tone/style to show) — if migrating them
too, add a second slot `{ id: "panelAlert", componentId: "alert", content:
[...] }`, but note Alert's own content rendering has its own gap (see §9's
Alert row) that should probably be fixed first so there's something
meaningful to control.

Then: rewrite `PanelBody` to accept `panelAction: ReturnType<typeof
useSlotInstance>` instead of the five separate resolver props +
`parentProperties`, same restructuring pattern as Modal's rewrite in §3.4.
Also fix the child-cluster inspector for Tabs the same way once its own
`slots` exists (it'll automatically flow through the §5.2 fix — no
Tabs-specific inspector code needed).

**Table** (`tableSpec`, `children: ["badge", "avatar", "iconButton"]`):
`components/factory/TableSkeletons.tsx` uses `TokenBadge`/`TokenAvatar` inside
per-row rendering (confirmed via grep: `badgeResolve`/`avatarResolve` from
`useComponentBindings`, no ad hoc `parentProperties` reads found in this file
at all). This is the **repeated-data case** from the judgment call in §3.4 —
each row's badge/avatar has different data (different initials, different
status), there is no single fixed "instance" to attach content overrides to.
**Recommendation: leave Table exactly as-is, do not add slots.** This is a
correct place to stop, not a gap.

---

## 7. Verification checklist for every phase (repeat this, don't skip it)

1. `cd ~/Desktop/Arkitype` (session cwd can drift to an unrelated project —
   always `cd` explicitly before `npm`/`npx`).
2. `npx tsc --noEmit` — must be clean before any manual check.
3. `npm run dev` (port 3111) and open the Components step in the browser.
4. If using the `preview_*` MCP tooling: it's gated by whatever
   `.claude/launch.json` the session's primary working directory has. If the
   session's primary directory is a different project (e.g. Hued), those
   tools won't see Arkitype's own `arkitype` launch entry — a prior session
   **deliberately removed** an `arkitype` entry from that other project's
   `launch.json` to keep the two decoupled (see `project-arkitype.md` memory,
   2026-07-07 v9 note #4). Don't reverse that decision to make tooling
   convenient — either open Arkitype as its own project/session so the
   tooling attaches to its own `launch.json` directly, or verify manually via
   `npm run dev` + a real browser.
5. `preview_click` has historically been flaky in this app (a stale Next dev
   overlay swallows clicks) — dispatch `.click()`/input events via
   `preview_eval` instead if using that tool.
6. `preview_logs`/`preview_console_logs` return a **cumulative** buffer — a
   transient error from mid-edit (file briefly unbalanced between two edits)
   can resurface identically on a later check even though it's stale. Cross-
   check against a fresh `tsc --noEmit` and a hard reload before trusting an
   old-looking log line.
7. For every migrated organism, specifically confirm:
   a. Changing the underlying molecule's **global** binding/property in its
      own Components-step entry ripples into every organism embedding it.
   b. Setting a slot's content (label/icon/variant/size) does **not** leak
      into the standalone molecule preview or into any other organism using
      the same molecule.
   c. No colour/padding/radius/border control appears anywhere under a slot's
      inspector section (spot-check by reading the `SlotSpec.content` array
      itself, not just clicking through the UI — a control that isn't wired
      to anything is easy to miss visually).
   d. Zero new console errors, both light and dark preview modes.

---

## 8. Phase 3 — remaining organisms, per-organism status and plan

For each row below: **Schema today** is verbatim from `lib/componentSchema.ts`
(`OTHER_SPECS` array); **Wiring today** was verified by reading the actual
render file (not assumed); **Recommended slots** is what to add.

### 8.1 `buttonGroup` (tier 2, `children: ["button"]`)
Schema: `container`/`segment` parts (a multi-segment control, not a
button-instance composition — the "children: ['button']" declaration looks
aspirational/inaccurate here; the rendered segments aren't `TokenButton`
instances with independent content, they're literal `segment.*` styled divs
per the schema's own `parts`). **Recommendation: this one probably shouldn't
have `children`/`slots` at all** — verify by reading its renderer (find it in
`FormControls.tsx` or `CoreComponents.tsx`, search for `TokenButtonGroup`,
already located at `components/factory/FormControls.tsx:107`) before deciding;
if it doesn't actually render `<TokenButton>` instances, remove the
`children: ["button"]` line entirely rather than migrating it to a slot that
represents nothing real.

### 8.2 `alert` (tier 2, `children: ["button", "iconButton"]`, options include `action`/`dismissible` booleans)
**Wiring today: effectively none.** Read `components/factory/CoreComponents.tsx:406-489`
(`TokenAlert`) — the function accepts `dismissible`/`icon`/`style`/`accent`
props and renders title/body text, but **does not render any action button or
dismiss icon at all**, despite the schema declaring `children: ["button",
"iconButton"]` and `action`/`dismissible` options. This is a bigger gap than
Modal's was — there is nothing to "migrate," the action/dismiss UI needs to be
**built first** (render a `TokenButton`/`TokenIconButton` conditionally on
`action`/`dismissible`, similar to how `TokenBanner` already does — see §8.4),
*then* wrapped in slots. Don't skip straight to adding `slots` here; verify
the render function actually uses the new instances before declaring this
organism done.

### 8.3 `toast` (tier 2, `children: ["button", "iconButton"]`, options include `action`/`dismissible`)
**Wiring today: partial, closest to Modal's pre-Phase-1 state.**
`components/factory/DisplayComponents.tsx:359-394` (`TokenToast`) reads
`properties?.["button.size"]` (line 394) via the same ad hoc flat-key
pattern Modal had, and has `childButtonResolve`/`childIconButtonResolve`
wired via `createChildResolver`. Read lines 394 onward (not fully read for
this plan — confirm whether the dismiss `iconButton` and the action `button`
are actually rendered in JSX, and with what hardcoded label/icon, before
writing the slot's `content` defaults) — then apply the exact Modal recipe:
add `slots: [{ id: "action", componentId: "button", content: [...] }, { id:
"dismiss", componentId: "iconButton", content: [...] }]` (single slots, not
primary/secondary, since a toast has at most one action), rewrite the ad hoc
`properties?.["button.size"]` read to `useSlotInstance("toast", "action")`.

### 8.4 `banner` (tier 2, `children: ["button", "iconButton"]`, options include `action`/`dismissible`)
**Wiring today: partial, verified.** `components/factory/PatternComponents.tsx:90-162`
(`TokenBanner`) does render both: `{action ? <TokenButton size={btnSize}
resolve={childButtonResolve}>Review now</TokenButton> : null}` (~line 148,
hardcoded label "Review now", no variant/icon customization) and `{dismissible
? <TokenIconButton variant="ghost" size="sm" resolve={childIconButtonResolve}>
<X size={15}/></TokenIconButton> : null}` (~line 155, hardcoded variant/size,
not even reading `properties` at all for the dismiss button). `btnSize` itself
comes from `parentProperties?.["button.size"]` (~line 118), same ad hoc
pattern. This is the **second-best next worked example after Modal** — apply
the identical recipe: `slots: [{ id: "action", componentId: "button", content:
[textOpt("label","Label","Review now"), enumOpt("variant",...), enumOpt("size",...),
textOpt("prefixIcon",...), textOpt("suffixIcon",...)] }, { id: "dismiss",
componentId: "iconButton", content: [enumOpt("variant",...), enumOpt("size",...)] }]`.

### 8.5 `card`, `listItem`, `feedItem`, `accordion`, `navbar`, `sidebar`, `dropdown`, `pagination`
**Wiring today: unknown — no ad hoc `parentProperties?.[...]` pattern was
found in a repo-wide grep for these**, meaning either (a) they use
`useComponentBindings`/`createChildResolver` purely for style with fully
hardcoded content (no per-instance customization surface exists at all yet —
same situation as Alert, §8.2), or (b) they don't render their declared
`children` as real component instances at all (same open question as
`buttonGroup`, §8.1). **Read each render function before writing its slot
declaration** — do not assume the Modal/Banner pattern applies uniformly.
Render functions, already located: `TokenCard`/`TokenAccordion`/
`TokenPagination`/`TokenDropdownMenu` in `components/factory/NavPatternComponents.tsx`
(lines 202, 314, 71, 129 respectively); `TokenListItem`/`TokenFeedItem` in
`components/factory/PatternComponents.tsx` (lines 27, 273); `TokenNavbar`/
`TokenSidebar` in `components/factory/NavigationComponents.tsx` (lines 17, 100).
For each, the question to answer before writing a slot is: **"is there
exactly one fixed, meaningful placement of this molecule with content worth
exposing, or is it repeated/data-driven?"** — Card/ListItem/FeedItem likely
lean data-driven (like Table); Navbar/Sidebar/Dropdown/Pagination/Accordion
likely have fixed single placements (a nav CTA button, a "New" button, a
dropdown trigger icon) that are better slot candidates. Don't guess from this
table alone — read the file, then decide, using §3.4's judgment-call rule.

### 8.6 `field` (tier 2, `children: ["input", "badge"]`)
**Wiring today: verified, and it's a content-authoring gap, not just a
missing slot.** `components/factory/PatternComponents.tsx:166-225`
(`TokenField`) hardcodes `"Account email"` as the label and
`"name@company.com"` as the placeholder directly in JSX — these aren't even
schema options today, let alone slot content. `inputSize` comes from
`parentProperties?.["input.size"]` (~line 186), the familiar ad hoc pattern.
To do this properly: add `label`/`placeholder`/`helpText` as new
`OptionSpec`s (on `field.options`, since they describe the Field organism's
own text, not the embedded Input's content) alongside a `slots: [{ id:
"control", componentId: "input", content: [enumOpt("size",...)] }]` for the
Input's own size. Don't conflate "Field's own label text" with "Input
instance content" — the label belongs to Field, the size belongs to the Input
slot.

### 8.7 `statGrid` (tier 2, `children: ["divider"]`)
A divider between stat cells is styled repeated structure, not a content-
bearing instance. **Recommendation: leave as plain `children`, no slot.**

### 8.8 `emptyState` (tier 2, `children: ["button"]`) — not in the original organism list, found via schema re-read
`components/factory/FeedbackComponents.tsx:188-237` (`TokenEmptyState`)
renders exactly one `<TokenButton size="sm" ...>Record transaction</TokenButton>`
(~line 231), hardcoded label, no variant/icon control, size hardcoded to
`"sm"` (not even reading a property). Same shape as Banner/Toast — good slot
candidate: `slots: [{ id: "action", componentId: "button", content:
[textOpt("label","Label","Record transaction"), enumOpt("variant",...),
enumOpt("size",...)] }]`.

---

## 9. Definition of done

- Every organism in §8 has been read and classified (slot vs deliberately-left
  style-only), with the reasoning visible in a code comment or commit message
  — not silently decided.
- No `SlotSpec.content` anywhere contains a style-typed (`"color"` or
  dimension) `OptionSpec`.
- `ComponentConfig.instances` is the only place per-instance content lives;
  no factory file reads a flat `properties["childId.field"]`-style key for
  anything that has been migrated to a slot.
- `ComponentStudioControls` in `ComponentStudio.tsx` renders a working,
  distinct inspector section for every declared slot on every migrated
  organism (this was the §5 regression — confirm it's actually fixed, not
  just that the code compiles).
- Changing any molecule's global binding/property visibly updates every
  organism that embeds it, with zero organism-specific resolver code required
  beyond calling `useSlotInstance`/`useComponentBindings`.
- `npx tsc --noEmit` clean; full manual (or preview-MCP, if reachable) walk of
  all four component lanes, both light and dark preview modes, zero console
  errors.

---

## 10. Known gotchas (do not rediscover these)

- `preview_click` has been flaky in this app (stale Next dev overlay) —
  dispatch `.click()`/input events via `preview_eval` instead.
- `preview_logs`/`preview_console_logs` return a cumulative buffer, not
  current-state-only.
- Zustand persist can get a `version` bumped without the matching shape
  landing if the store module is mid-edit during HMR — migration alone isn't
  sufficient defense; also default at every read site (`?? {}`).
- Container queries, not viewport media queries, drive `ComponentStudio`'s
  responsive layout (`.studio-grid`).
- Bash's cwd in a shared session can drift to an unrelated project directory —
  always `cd ~/Desktop/Arkitype` explicitly.
- This project shares no code with Hued; do not import from or reference the
  Hued repo. Arkitype's `.claude/launch.json` has its own `arkitype` dev-server
  entry; a sibling project's `launch.json` was deliberately kept clean of it.
