# Arkitype — Accessibility System + Full Audit: Implementation Plan

> **Purpose:** a self-contained plan for (A) building an in-built contrast/
> accessibility checker into Arkitype's own colour-picking UI, and (B) a
> full accessibility audit of the app as it exists today — login, components,
> fonts, colours, modals, light/dark mode — with exact, verified findings and
> prescribed fixes. Written for handoff to another AI/tool (Antigravity +
> Gemini) with **zero access to this conversation**. No code has been changed
> for this — it is a plan only, per explicit request. Every finding below was
> verified by reading the actual file at the line cited; nothing here is
> guessed or generic. Where something genuinely could not be verified without
> further work, it's labeled **UNVERIFIED** rather than asserted as fact.
>
> Companion document: `ATOMIC_DESIGN_PLAN.md` (the slot/instance rebuild —
> unrelated initiative, don't conflate the two; some fixes below touch the
> same files, see the overlap note in §5).

---

## Part A — An accessibility system built into the colour pickers

### A.1 Goal

When a user is about to pick a colour anywhere in Arkitype (a semantic role in
the Roles tab, a primitive swatch, a per-part colour override in the
Component Studio inspector), show a live pass/fail indicator **at the point of
choice** — next to the swatch/hex field — computed against whatever that
colour will actually be paired with (its background if it's a text colour,
its text if it's a background). Friction should scale with confidence: warn
always, but only *require an explicit override click* when the pairing is
unambiguous and the ratio clearly fails.

### A.2 The math — new file `lib/a11y.ts`

Standard WCAG 2.x relative-luminance + contrast-ratio formulas. Exact
functions to write (pure, no React, no store dependency — keep this file
framework-agnostic and unit-testable in isolation):

```ts
// lib/a11y.ts

/** sRGB channel -> linear, per WCAG 2.x */
function linearize(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/** Relative luminance of a #rrggbb hex string, per WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const [R, G, B] = [linearize(r), linearize(g), linearize(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** Contrast ratio between two #rrggbb hex colours, always >= 1. */
export function contrastRatio(hexA: string, hexB: string): number {
  const L1 = relativeLuminance(hexA);
  const L2 = relativeLuminance(hexB);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type A11yContext = "text-normal" | "text-large" | "ui-component";

/**
 * WCAG 2.x thresholds:
 *  - text-normal:  AA >= 4.5,  AAA >= 7
 *  - text-large (>=24px, or >=18.66px bold): AA >= 3, AAA >= 4.5
 *  - ui-component (icons, borders, focus rings, non-text): AA >= 3 (SC 1.4.11), no AAA tier defined
 */
export function wcagLevel(
  ratio: number,
  context: A11yContext
): "fail" | "AA" | "AAA" {
  if (context === "text-normal") {
    if (ratio >= 7) return "AAA";
    if (ratio >= 4.5) return "AA";
    return "fail";
  }
  if (context === "text-large") {
    if (ratio >= 4.5) return "AAA";
    if (ratio >= 3) return "AA";
    return "fail";
  }
  // ui-component
  return ratio >= 3 ? "AA" : "fail";
}

export interface ContrastCheck {
  ratio: number;
  level: "fail" | "AA" | "AAA";
  context: A11yContext;
}

export function checkContrast(hexA: string, hexB: string, context: A11yContext): ContrastCheck {
  const ratio = contrastRatio(hexA, hexB);
  return { ratio: Math.round(ratio * 100) / 100, level: wcagLevel(ratio, context), context };
}
```

These are pure functions operating on resolved `#rrggbb` hex strings, not on
bindings (`role:...`, `prim:...`) — the caller is responsible for resolving a
binding to a concrete hex first (the existing `bindingSwatch()` in
`lib/binding.ts` already does exactly this for colour bindings — reuse it,
don't reimplement hex resolution).

### A.3 The pairing problem — you can't check contrast without knowing what's on the other side

A colour in isolation has no contrast; it needs a counterpart. Two places
this applies, handled differently:

**A.3.1 Semantic roles (Roles tab / `RolesStep.tsx`)**

Add a new registry, `lib/a11yPairs.ts`:

```ts
export interface RoleContrastPair {
  fg: string;   // semantic role id used as text/foreground
  bg: string;   // semantic role id used as the surface it sits on
  context: A11yContext;
  label: string; // shown in the UI, e.g. "Primary text on base surface"
}

export const ROLE_CONTRAST_PAIRS: RoleContrastPair[] = [
  { fg: "text-primary", bg: "surface-base", context: "text-normal", label: "Primary text on base surface" },
  { fg: "text-primary", bg: "surface-elevated", context: "text-normal", label: "Primary text on elevated surface" },
  { fg: "text-secondary", bg: "surface-base", context: "text-normal", label: "Secondary text on base surface" },
  { fg: "text-muted", bg: "surface-base", context: "text-normal", label: "Muted text on base surface" },
  { fg: "text-on-action", bg: "action-primary-default", context: "text-normal", label: "Button label on primary action" },
  { fg: "text-link", bg: "surface-base", context: "text-normal", label: "Link on base surface" },
  { fg: "border-focus", bg: "surface-base", context: "ui-component", label: "Focus ring on base surface" },
  { fg: "feedback-info-text", bg: "feedback-info-surface", context: "text-normal", label: "Info text on info surface" },
  { fg: "feedback-success-text", bg: "feedback-success-surface", context: "text-normal", label: "Success text on success surface" },
  { fg: "feedback-warning-text", bg: "feedback-warning-surface", context: "text-normal", label: "Warning text on warning surface" },
  { fg: "feedback-error-text", bg: "feedback-error-surface", context: "text-normal", label: "Error text on error surface" },
  // Add more as needed — this list should track `DEFAULT_SEMANTIC_GROUPS` in
  // store/useDesignSystem.ts; whoever extends the roles list should extend
  // this list in the same commit.
];

/** Every pair a given role participates in (as fg or bg), for the picker's live badge. */
export function pairsInvolving(roleId: string): RoleContrastPair[] {
  return ROLE_CONTRAST_PAIRS.filter((p) => p.fg === roleId || p.bg === roleId);
}
```

When the user is editing role `X` in `RolesStep.tsx`, call
`pairsInvolving(X)`, resolve each pair's current hex for the **active preview
mode** via the existing `resolveToken(state, mode, roleId)` (already in
`lib/tokens.ts` per `lib/binding.ts`'s `bindingSwatch` usage), run
`checkContrast`, and render one small badge per pair next to the swatch being
edited (e.g., "on base surface: 4.8 AA", "on elevated: 3.1 fail"). **Check
both light and dark mode**, not just whichever is currently active — show two
compact badges (a sun/moon or "L"/"D" glyph) so a fix in one mode doesn't
silently leave the other broken.

**A.3.2 Component parts (Component Studio inspector)**

Add an optional `contrastAgainst?: string` field to `PropSpec` in
`lib/componentSchema.ts`:

```ts
export interface PropSpec {
  key: string;
  label: string;
  type: BindingType;
  stateful?: boolean;
  states?: CState[];
  def: string | Partial<Record<CState, string>>;
  min?: number;
  max?: number;
  /** NEW: which other prop key on this component this one must contrast
   *  against when it's a text/icon colour sitting on a background (or vice
   *  versa). Omit when there's no meaningful pairing (decorative colours). */
  contrastAgainst?: string;
}
```

Populate it only where it's unambiguous — e.g. in `buttonSpec`:
`labelPart("label", ..., { color: {...} })`'s `label.color` prop should get
`contrastAgainst: "container.bg"`; `iconPart` colours likewise pair against
their nearest `container.bg`/`solid.bg`/`outline.bg`. **Do not force a value
here for every prop** — most container backgrounds don't have one single
correct foreground (badges/tags have multiple possible texts depending on
tone), so leave `contrastAgainst` undefined wherever it would be a guess, and
skip the indicator entirely for those (see A.4 — no indicator is the correct,
honest behaviour when the pairing isn't knowable in the schema).

In the Component Studio inspector (`ComponentStudioControls`, the same
function extended in `ATOMIC_DESIGN_PLAN.md` §5), wherever a `"color"`-typed
`PropSpec` is rendered (search for the colour-swatch/hex-input rendering
inside `renderPropRow`, defined near the top of `ComponentStudioControls`),
if `prop.contrastAgainst` is set: resolve the current value being edited and
the counterpart prop's current resolved value (both via the existing
`resolve()`/binding machinery already in scope in that function), run
`checkContrast`, and render the same badge pattern as A.3.1.

### A.4 The indicator — UI spec

- A small pill/chip immediately to the right of the swatch or hex input:
  `AAA` (success-tone), `AA` (a slightly less saturated success-tone —
  visually distinct from AAA so users can tell "good" from "great"), or a
  warning-tone chip with the ratio number and a warning glyph when it fails
  (e.g. `2.1 ✕`).
- Tooltip/expand-on-hover shows the exact ratio and which two colours were
  compared ("Primary text (2.1:1) on Base surface — needs 4.5:1 for body
  text").
- **When there's no known pairing** (`contrastAgainst` undefined, or a role
  with no entry in `ROLE_CONTRAST_PAIRS`): show **no badge at all**, not a
  neutral/grey placeholder. An indicator with nothing to say is worse than no
  indicator — it trains users to ignore the whole feature.
- **Friction model — warn always, block only when unambiguous:**
  - If `level === "fail"` **and** the context is `"text-normal"` or
    `"text-large"` (i.e. this is genuinely a text-on-background pairing, not a
    borderline UI-chrome case): require a second, explicit interaction to
    accept the color — e.g. clicking the swatch again within a "Use anyway"
    affordance that appears next to the fail chip, rather than the colour
    simply applying on the first click/hex-entry. This satisfies the user's
    "prevent me from selecting it" ask without a silent hard block, which
    would be actively hostile in a design tool (there are legitimate
    intentional-contrast-breaking use cases — e.g. a deliberately
    low-contrast disabled state — that must stay possible).
  - If `level === "fail"` and context is `"ui-component"` (focus rings,
    decorative icon colours, borders): show the warning chip but do **not**
    add the extra confirmation step — SC 1.4.11 non-text contrast is real but
    lower-stakes than body text being unreadable, and over-blocking there
    will just train users to click through warnings mindlessly, which
    defeats the purpose everywhere else.
  - `AA`/`AAA` passes: no friction, applies immediately, as today.

### A.5 Where NOT to add this

Don't add contrast badges to the raw primitive Colour step's ramp-generation
UI (`ColourStep.tsx`) — a primitive swatch (e.g. "brand-600") isn't paired
with anything until a semantic role assigns it a job; showing contrast
numbers there would be meaningless noise attached to values that have no
fixed usage yet. Scope this feature to the Roles step and the Component
Studio inspector only, per A.3.

---

## Part B — Full accessibility audit (verified findings, 2026-07-08)

Findings are ranked by severity/confidence. Each cites the exact file and
line read to produce it. **F1–F6 are Critical/High and should be fixed
before anything in Part A ships** — an in-app contrast checker is of limited
value if the components it's checking have unrelated, more basic
accessibility failures (missing focus indication, unlabeled controls).

### F1 — CRITICAL — Hardcoded hex colours break dark mode for Tabs and Table

**File:** `lib/componentSchema.ts`, lines 1531–1533 (`tabsSpec.options`) and
1562–1568 (`tableSpec.options`):

```ts
colorOpt("borderColor", "Border color", "#e4e4e7"),
colorOpt("activeBg", "Active background", "#f4f4f5"),
colorOpt("activeTextColor", "Active text color", "#18181b"),
// ...and, for table:
colorOpt("borderColor", "Border color", "#e4e4e7"),
colorOpt("bg", "Table background fill", "#ffffff"),
colorOpt("accentColor", "Accent color highlight", "#4f46e5"),
```

These are **literal light-mode-only hex values**, not `role:`/`prim:`
bindings. Unlike every other colour in the system (which resolves through
`--ark-*` CSS vars and re-themes automatically per mode), these six values are
frozen. Confirmed consumer: `components/factory/TabsSkeletons.tsx`'s
`useResolvedTabsOptions()` reads `opts.borderColor`/`activeBg`/
`activeTextColor` directly as literal colours (no `tv()`/`resolve()` call) and
applies them to inline styles across all 4 tab-skeleton layouts. Table's
`activeBg` equivalent needs the same read in `TableSkeletons.tsx` (search for
where `resolveOptions("table", ...)` result is consumed — **UNVERIFIED which
exact lines apply these six, confirm during fix**, but the schema-level bug
is fully verified regardless of the exact consumption site).

**Effect:** switch the app to dark mode → Tabs' active-tab background stays
light grey (`#f4f4f5`) and its text stays near-black (`#18181b`) regardless of
theme, producing a light-on-dark or invisible-contrast tab in dark mode — this
is almost certainly the "components behave weirdly in light and dark mode"
the user is describing. Table's white `#ffffff` background and light border
have the identical failure mode.

**Fix:** convert these six options from raw `colorOpt` (type `"color"`, a
literal-hex-only field) into role-bound `PropSpec`s on the component's own
`container`/`tab`/`cell` parts (the schema already has a `container.border`/
`tab.activeBg`/`tab.activeText` `PropSpec` set for `tabsSpec` — read
`lib/componentSchema.ts`'s `tabsSpec.parts` again before changing anything;
there may already be a role-bound duplicate of these exact concerns sitting
unused alongside the raw `options` version, in which case the fix is "stop
reading the raw option and read the existing role-bound part binding
instead," not "invent a new binding"). If, after checking, no role-bound
equivalent exists, add one following the pattern already used for every other
tier-2 component's `container`/`tab` parts (`prop("tab.activeBg", "Active
background", "color", "role:surface-subtle")`, etc.), and delete the raw
`colorOpt` duplicates plus their `TabsSkeletons.tsx`/`TableSkeletons.tsx`
literal reads.

### F2 — CRITICAL — Every icon-only button in the app has the same, generic screen-reader label

**File:** `components/factory/FormControls.tsx`, `TokenIconButton` (~line
30–101). The function signature has **no `aria-label`/label prop at all**;
line 99 hardcodes:

```tsx
<button type="button" style={style} disabled={disabled} aria-label="Action" onClick={onClick}>
```

Every call site — Modal's close button, Banner's dismiss button, Toast's
dismiss button, the bottom-sheet file-grid delete icons, any future usage —
renders with the literal accessible name `"Action"`. A screen-reader user
tabbing through a modal hears "Action, button" for the close icon, "Action,
button" for a delete icon, with zero way to distinguish them without sighted
context.

**Fix:** add an `"aria-label"` prop (string, required or defaulted to
something more useful than `"Action"` if truly omitted — but prefer making
callers pass it explicitly and only fall back for genuinely decorative
icon-only buttons, which should be rare):

```tsx
export function TokenIconButton({
  // ...existing props...
  "aria-label": ariaLabel = "Action",
}: {
  // ...
  "aria-label"?: string;
}) {
  // ...
  return (
    <button type="button" style={style} disabled={disabled} aria-label={ariaLabel} onClick={onClick}>
```

Then update every call site that renders a meaningful icon action to pass a
real label — at minimum: Modal's close button (`"Close dialog"`), Banner's
dismiss (`"Dismiss banner"`), Toast's dismiss (`"Dismiss notification"`), the
bottom-sheet file-grid delete icon (`"Delete file"`). Grep
`<TokenIconButton` across `components/factory/*.tsx` to find every call site
before considering this done — do not assume the four listed above are
exhaustive.

### F3 — HIGH — The design system's own focus-ring token is never used on real keyboard focus

**Files:** `components/factory/CoreComponents.tsx:54` (`focusRing()`,
returns `{ outline: '2px solid var(--ark-*border-focus*)', outlineOffset:
'2px' }` via `tv("border-focus")`) is only ever spread into a component's
inline style when the **`state` prop** equals `"focus"` (confirmed at
`CoreComponents.tsx:176` for `TokenButton`, `:369` for another component, and
identically in `TokenIconButton`). `state` is a prop the *caller* sets — it's
used to render the Component Studio's static per-state preview swatches
(default/hover/focus/active/disabled shown side by side for design purposes),
**not** driven by any real `onFocus`/`onBlur`/`:focus-visible` mechanism.
Confirmed: zero `onFocus`/`onBlur` handlers exist anywhere in
`components/factory/*.tsx` (grepped) tied to this.

Meanwhile, `app/globals.css:81` has an **unscoped, global**
`:focus-visible { outline: 2px solid rgb(var(--c-fg) / 0.45); outline-offset:
2px; }` rule. Because native `<button>`/`<input>` elements don't have
`outline` set in their base inline style (only conditionally added by the
unused `state === "focus"` branch), this global rule **is** what real Tab-key
focus shows on every Token* component in actual use — meaning:

1. Keyboard users are **not** left with zero focus indication (good — this
   isn't as severe as it first appears).
2. But the ring they see is the app **chrome's** generic ink-based colour
   (`--c-fg` at 45% opacity), never the design system's own `border-focus`
   semantic role that a user configures in the Roles step. **The thing users
   are building — a themed focus ring — never actually appears when using
   their own components**, only in the deliberately-triggered preview swatch.
   This is a correctness bug in what the tool demonstrates, and a genuine (if
   more moderate than "zero indication") accessibility gap: the exported
   design system's documented focus treatment is unverified/unverifiable in
   the live tool.

**Fix:** replace the `state === "focus"` conditional spread with a real CSS
`:focus-visible` rule scoped to each Token* component's root element (e.g. via
a CSS class + a `<style jsx>`/global stylesheet rule targeting
`[data-ark-part="container"]:focus-visible`, since these use inline styles +
a `data-ark-part` attribute already present per `TokenButton`'s
`data-ark-part="container"`), setting `outline-color` to the resolved
`border-focus` value. Keep the `state === "focus"` prop-driven path **only**
for the Studio's preview-swatch grid (rename it internally to make the
distinction explicit, e.g. a separate `previewState` vs real interaction, so
future readers don't reintroduce this confusion). Verify after the fix: Tab
through a real rendered Button/IconButton/Input in the Preview or Ship step
and confirm the ring colour changes when you edit `border-focus` in the Roles
step, in both light and dark mode.

### F4 — HIGH — Landing page removes keyboard focus indication entirely on real CTAs

**File:** `components/marketing/LandingPage.tsx`, six occurrences of
`focus-visible:outline-none` with no replacement style, at lines 188, 197,
209, 217, 289, 340 (nav icon buttons, the mobile-menu button, and two primary
hero CTAs). Tailwind's `focus-visible:outline-none` utility overrides the
global `:focus-visible` rule from `app/globals.css:81` (higher selector
specificity — a class + pseudo-class beats a bare pseudo-class), so these six
elements have **no visible keyboard focus state at all** — a genuine,
unambiguous WCAG 2.4.7 (Focus Visible, Level AA) failure on real,
public-facing, non-preview UI.

**Fix:** for each of the six, replace `focus-visible:outline-none` with a
themed visible alternative appropriate to that element's background (dark
hero background → light ring; e.g. `focus-visible:outline-none
focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2
focus-visible:ring-offset-black`). Check each element's surrounding
background colour individually — a single ring colour won't work for all six
given the page has both dark hero sections and lighter card sections
(**UNVERIFIED** which of the six sit on which background — read the
surrounding JSX for each line before picking a ring colour).

### F5 — HIGH — The password gate ("login") has no accessible error handling and an unlabeled form control

**File:** `components/ui/GateKeeper.tsx`, the `!unlocked` branch
(lines 52–130):

1. **Line 83–94:** the `<label>` ("Enter Workspace Password") and the
   password `<input>` are not programmatically associated — no `htmlFor`
   on the label, no matching `id` on the input. A screen reader focusing the
   input announces nothing about what it's for.
2. **Line 95–101:** the show/hide-password toggle `<button>` contains only a
   Lucide `Eye`/`EyeOff` icon, no text, no `aria-label` — announced as an
   unlabeled button.
3. **Lines 103–111:** on a wrong password, a `<motion.p>` reading "Incorrect
   password. Please try again." appears, but has no `role="alert"` /
   `aria-live="polite"` and isn't wired via `aria-describedby` to the input,
   and the input itself has no `aria-invalid`. A screen-reader user who
   submits the wrong password gets **no feedback whatsoever** that anything
   happened — the single most important error state in the entire app (it
   gates access to everything else) is silent for AT users.
4. The `shake` animation (`x: [-10, 10, -10, 10, 0]`, line 65) fires
   unconditionally on error, and the framer-motion enter transitions
   (lines 60–68, 140–143) run unconditionally — see F8 (motion preferences).

**Fix:**
```tsx
<label htmlFor="gate-password" className="...">Enter Workspace Password</label>
<input
  id="gate-password"
  aria-invalid={error}
  aria-describedby={error ? "gate-password-error" : undefined}
  // ...existing props...
/>
<button
  type="button"
  aria-label={showPassword ? "Hide password" : "Show password"}
  onClick={() => setShowPassword(!showPassword)}
>
  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
</button>
{error && (
  <motion.p id="gate-password-error" role="alert" /* ...existing... */>
    Incorrect password. Please try again.
  </motion.p>
)}
```
Same `htmlFor`/`id` + `aria-live` pattern likely needed in
`components/marketing/AuthAndSurvey.tsx` — **UNVERIFIED, not read this pass;
audit it with the same checklist before considering login/auth fully done**
(the user asked specifically about "login" — `GateKeeper.tsx` is the
password-gate screen that was actually read and verified above; if
`AuthAndSurvey.tsx` is a separate real-account login/signup flow, it needs
the identical review and almost certainly has some of the same gaps, given
both were written in the same style).

### F6 — MEDIUM — Tabs component has no ARIA tabs-pattern semantics

**File:** `components/factory/TabsSkeletons.tsx`, all four skeleton layouts
(`skeletonId` 1–4, ~lines 234–378). Tab buttons are plain `<button
onClick={() => setActive(t)}>` elements with visual active-state styling only
— confirmed via grep: no `role="tablist"`, `role="tab"`, `aria-selected`,
`aria-controls`, `role="tabpanel"`, or `aria-labelledby` anywhere in the file.
Screen-reader users get a series of unrelated buttons, not a tab widget, and
there's no arrow-key navigation between tabs (only Tab-key, one stop per
tab, which is technically operable but not the expected pattern per the
[ARIA Authoring Practices tabs pattern](internal knowledge, not fetched this
pass)).

**Fix:** wrap the tab-button row in `role="tablist"` (with
`aria-label="..."` describing the tab group), give each button `role="tab"`,
`aria-selected={t === active}`, `id="tab-${t}"`, `aria-controls="panel-${t}"`;
give the panel container `role="tabpanel"`, `id="panel-${active}"`,
`aria-labelledby="tab-${active}"`; add a `keydown` handler on the tablist for
ArrowLeft/ArrowRight (and ArrowUp/ArrowDown for the vertical-stack skeleton,
`skeletonId === "4"`) to move focus + activate the adjacent tab, matching
the APG tabs pattern. Apply once, reused across all 4 skeleton layouts since
they share the same `tabs.map(...)` structure.

### F7 — MEDIUM — Contrast pass/fail cannot be certified from static defaults; needs a scripted check

Arkitype generates a project's actual colours from a user-chosen brand seed
hex at runtime (`lib/color.ts`'s `generateRamp`), so the shipped **default**
seed/ramp (`DEFAULT_LIGHT`/`DEFAULT_DARK` role→`family-step` mappings in
`store/useDesignSystem.ts`, lines 628–700) is the only fixed data point
available to audit by inspection, and even that requires resolving each
`family-step` reference (e.g. `"brand-600"`) through the actual generated ramp
hex, which depends on the default seed colours (**not read this pass** — find
them via `DEFAULT_FAMILIES` in `store/useDesignSystem.ts`). This is not
something to eyeball — write a one-off Node script (or a Jest/Vitest test)
that:
1. Builds the default project's `primitives.colorFamilies` + resolves
   `DEFAULT_LIGHT`/`DEFAULT_DARK` to concrete hex via the real
   `resolveRef`/`resolveToken` functions (`lib/tokens.ts`).
2. Runs every pair in `ROLE_CONTRAST_PAIRS` (§A.3.1, once written) through
   `checkContrast` from `lib/a11y.ts` (§A.2, once written), for both light and
   dark.
3. Fails (prints a non-zero exit / list of failures) if any `"text-normal"`
   or `"text-large"` pair is below `"AA"`.
Run this once the Part A utilities exist — it doubles as the first real
usage/test of `lib/a11y.ts`, and as the actual verification for this finding
(don't hand-wave "looks fine" — run the script and paste its output into the
PR/commit that closes this finding).

### F8 — MEDIUM — Motion doesn't respect `prefers-reduced-motion` anywhere found

Confirmed unconditional animations: the spinner's CSS `@keyframes ark-spin`
(`app/globals.css`, applied via `.ark-spin` on `TokenSpinner` in
`FeedbackComponents.tsx`); `GateKeeper.tsx`'s framer-motion enter transitions
and the error-triggered shake (§F5 point 4); the hover-highlight ring in
`components/factory/useHighlight.tsx` (per prior-session memory, already
opacity-only rather than a geometry animation — better, but still
unconditional). No `prefers-reduced-motion` media query or framer-motion
`useReducedMotion()` hook usage found anywhere in the codebase (grepped for
`prefers-reduced-motion` and `useReducedMotion`, zero hits).

**Fix:** (a) wrap `.ark-spin`'s animation in
`@media (prefers-reduced-motion: no-preference) { .ark-spin { animation: ... } }`
with a static (non-spinning) fallback style for the reduced-motion case (a
spinner conveys "loading" via more than rotation — keep the icon, drop the
spin); (b) in `GateKeeper.tsx` and anywhere else using framer-motion, call
`useReducedMotion()` and conditionally set `transition={{ duration:
prefersReduced ? 0 : 0.4, ... }}` / skip the `x` shake keyframes entirely when
true.

### F9 — LOW/MEDIUM — Inconsistent default icon usage on tone-carrying feedback components

`CoreComponents.tsx:406-428`, `TokenAlert`'s `icon` prop **defaults to
`false`** — meaning out of the box, an alert's info/success/warning/error
distinction is colour-only. `TokenToast` (`DisplayComponents.tsx:359-380`) and
`TokenBanner` (`PatternComponents.tsx:90-106`) both default `icon` to `true`.
This is an inconsistency across three components that all carry the same
kind of tone/status information, and the one outlier (Alert) is the
colour-only default — a real (if lower-severity, since it's caller-overridable)
concern for colour-blind users relying on the default.

**Fix:** change `TokenAlert`'s default to `icon = true` to match Toast/Banner,
unless there's a specific product reason found for the asymmetry (search
`git blame`/`progress.md` for why Alert defaults differently before assuming
it's simply an oversight — **UNVERIFIED whether this was intentional**).

### Not audited this pass (say so rather than invent findings)

- `components/marketing/AuthAndSurvey.tsx` (real auth flow, if distinct from
  `GateKeeper.tsx`) — flagged in F5, not read.
- Colour contrast of the Component Studio's own chrome UI (rail, inspector
  panel text) — likely fine given it uses the app's own themeable
  `ink`/`fg`/`line` tokens per the v9 chrome-theming work in
  `project-arkitype.md` memory, but not independently re-verified here.
- Any automated tooling check (axe-core, Lighthouse CI) — **check
  `package.json` first** for whether something like `@axe-core/react`,
  `eslint-plugin-jsx-a11y`, or a Playwright+axe smoke test already exists
  before adding a new one; not checked this pass.
- Screen-reader manual testing (VoiceOver/NVDA) — none of the above findings
  required an actual AT session to identify (all were static-code-verifiable),
  but a real pass should still happen before calling this done — see §D.2.

---

## Part C — Fix priority order

1. **F2** (icon-button labels) — small, mechanical, unblocks meaningful
   screen-reader use everywhere at once.
2. **F5** (login/gate) — highest user-facing severity (blocks the entire app
   for AT users who mistype the password), small scope (one file).
3. **F4** (landing-page focus-visible removal) — small scope, six sites,
   clear fix.
4. **F1** (Tabs/Table hardcoded hex) — also directly answers "components
   behave weirdly in light/dark mode."
5. **F3** (real focus ring wiring) — larger, touches every Token* component;
   do after the smaller wins above so there's momentum/context built up on
   how these files are structured.
6. **F6** (Tabs ARIA pattern) — larger, single file, do alongside F1 since
   you'll already be deep in `TabsSkeletons.tsx`.
7. **F8** (reduced motion) — sweep, low risk, do anytime.
8. **F9** (Alert icon default) — trivial, do anytime.
9. **Part A** (the contrast-checker system) — build once F1–F6 are fixed, so
   the tool you're building is checking a component library that's already
   behaviorally sound; then **F7**'s scripted audit becomes the system's own
   first real test run.

---

## Part D — Verification plan

### D.1 Automated
- `npx tsc --noEmit` clean after every fix.
- The F7 contrast script, run against the default project, both modes, zero
  `"fail"` results for any `"text-normal"`/`"text-large"` pair in
  `ROLE_CONTRAST_PAIRS`.
- If `eslint-plugin-jsx-a11y` isn't already in `package.json`, consider adding
  it and running it once across the codebase as a cheap net for anything not
  covered above (unlabeled form fields, missing alt text, etc.) —
  **UNVERIFIED whether already present, check first.**

### D.2 Manual — keyboard only (unplug the mouse)
- Tab through `GateKeeper.tsx`'s password screen and warning screen fully;
  confirm every interactive element is reachable, has a visible focus ring,
  and the error state is announced (pair with a screen reader for this one
  specifically, see D.3).
- Open a Modal (all 4 skeletons), confirm Tab cycles through its content and
  the close button is reachable and clearly focused; confirm Escape closes it
  (**note: not currently implemented per `ATOMIC_DESIGN_PLAN.md`'s Modal
  audit — no keydown handler was found in `ModalSkeletons.tsx`; add one if
  genuinely missing, this is an additional finding worth folding into F5's
  fix pass**: `role="dialog"` without `aria-modal="true"`, without a focus
  trap, and without focus returning to the trigger element on close, is a
  further gap beyond what F1–F9 above cover — flagged here rather than given
  its own F-number since it wasn't independently re-verified this pass,
  confirm before fixing).
- Tab to the Tabs component (all 4 skeletons), confirm arrow-key navigation
  works after F6's fix.
- Both light and dark preview mode for every check above — some focus-ring/
  contrast issues (F1, F3) are mode-specific.

### D.3 Manual — screen reader spot check
- VoiceOver (macOS, Cmd+F5) quick pass: `GateKeeper.tsx` end to end
  (including a deliberate wrong-password submission to confirm the error is
  announced), one Modal open/interact/close cycle, one icon-only button of
  each kind (Modal close, Toast dismiss, Banner dismiss).

### D.4 Sign-off
Do not mark this initiative done until D.1's script has a clean run pasted
into the closing commit/PR description, and D.2/D.3 have been walked at least
once by a human, not just asserted from reading code — several of the
findings above (F3 in particular) are exactly the kind of bug that "looks
fine in the code" but isn't, until you actually tab through the real app.

---

## Part E — Known gotchas (repo-wide, don't rediscover)

Same gotchas apply as documented in `ATOMIC_DESIGN_PLAN.md` §10 (preview_click
flakiness, cumulative log buffers, persist-version/HMR landmine, Bash cwd
drift, project decoupling from Hued) — read that section before starting
verification; it isn't repeated here to avoid the two documents drifting out
of sync with each other.
