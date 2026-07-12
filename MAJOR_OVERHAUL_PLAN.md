# Arkitype — Major Overhaul Plan (from Design-System-Manager feedback)

> **Purpose:** This is a resumable, checkpointed plan. If a session runs out of
> tokens mid-phase, the next session reads this file, checks the Status lines,
> and continues from the first `⬜`/`🚧` item. Update the Status line and tick
> boxes as work lands — same discipline as `progress.md`.
>
> **Source:** three rounds of Q&A with a "Design System Manager" persona,
> pasted in full by the user on 2026-07-12 (kept verbatim below in
> [§0 Raw feedback](#0-raw-feedback-source-of-truth) so intent is never lost
> to summarization). Everything above §0 is *my* synthesis into an actual
> engineering plan against Arkitype's real codebase — not a restatement of
> the feedback.

---

## How to resume this plan

1. Read `HANDOFF.md` first (architecture orientation), then this file.
2. Find the first phase below that isn't `✅ DONE`.
3. Check its checklist — items already ticked are verified working, not just written.
4. `npx tsc --noEmit` must stay exit-0. Verify live on `:3111` before ticking a box.
5. On persisted-store shape changes: bump `version` in `store/useDesignSystem.ts`
   (`persist(...)`, currently **v12** — Phase 1 bumped 11→12 for `density`; Phase 2
   added only *optional* `meta` fields, which need no bump) and add a `migrate`
   branch — see HANDOFF.md §6, this is a landmine if skipped.
6. Update this file's Status lines + `progress.md` after each phase.

---

## Gap analysis — what the feedback assumes vs. what exists today (2026-07-12)

| Feedback concept | Exists today? | Reality |
|---|---|---|
| Client/agency multi-tenant dashboard hierarchy | ❌ | `ProjectDashboard.tsx` is a flat grid, one owner per project (`sql/arkitype_schema.sql`), `PROJECT_LIMIT = 24` |
| Project Initialization Wizard (platform / stack / starting point) | ❌ | `Welcome.tsx` captures only name + brand hex, by deliberate design ("never open onto an empty configuration dump") |
| Density switch (Compact/Standard/Spacious) | ❌ (but adjacent) | `spacingMultipliers[]` and `radiusScale` are already independently editable (SpaceStep/ShapeStep) — no single preset that scales both at once |
| Token tiers: Primitive → Semantic → Component | ✅ Already the architecture | `primitives` → `semantics` (roles) → `components[].bindings`, see `lib/binding.ts`, `lib/componentSchema.ts` |
| Figma Variables sync | 🟡 Partial | `figma-plugin/` exists, `lib/figma.ts` compiles a bundle — but it's export-only (download JSON, paste into plugin), not live bidirectional "click Pull Updates" |
| Framework code export (Tailwind config, MUI theme, SwiftUI) | ❌ | `ShipStep.tsx` only exports the Figma JSON bundle + a markdown doc. No Style-Dictionary-style platform adapters at all |
| Live interactive proofing dashboard (SaaS/Mobile/industry templates) | 🟡 Partial | `PreviewStep.tsx` (one dashboard) + landing-page showcase cards exist; no industry template switcher (Fintech/Healthcare/E-comm) |
| WCAG accessibility gate on Roles step | 🟡 Partial | `lib/a11y.ts`, `lib/a11yPairs.ts` exist (contrast math) — check whether RolesStep surfaces a hard gate or just numbers |
| Auth / accounts | ✅ | Supabase magic-link, `profiles` + `projects` tables, RLS owner-only |
| Component library breadth | ✅ Already exceeds the brief | 50 components, full modifier parity — this was the 2026-07-11 push, not something this feedback asked for |

**Conclusion:** the feedback is a full product vision for a category of tool Arkitype
is *becoming*, not a punch list of small fixes. Do NOT attempt it in one pass.
The phases below are ordered by leverage-per-session, each independently shippable.

---

## Phase 1 — Workspace hierarchy, density, framework export ✅ DONE (2026-07-12)

The three highest-leverage, most self-contained pieces: they don't touch the
Figma plugin, don't require a new collaboration/permissions model, and build
directly on existing pipelines (`systemCssVars`, the persist/migrate pattern,
the dashboard grid).

### 1A. Client/folder workspace hierarchy
> Feedback: "Client Dashboard Matrix" (Q3 §1), "project separation (even for freelancers)" (Q3 prompt)
- [x] **No SQL migration needed** — `ProjectState.folder?: string` lives inside the existing `state` jsonb blob (`sql/arkitype_schema.sql` already stores the whole blob per project row), so it round-trips through `db.createProject`/`db.saveProject` with zero schema changes. Simpler and safer than the SQL-column approach originally planned.
- [x] `store/useDesignSystem.ts` — `ProjectState.folder?: string`; `createProject(name, folder?)`; `moveProjectToFolder(id, folder)`; `renameFolderEverywhere(oldName, newName)`; `deleteFolder(name)` (unfiles, doesn't delete projects)
- [x] No "manage empty folders" concept — a client name becomes real the moment a project carries it (typed via a datalist-backed combobox), and disappears from the dashboard the moment the last project leaves it. Avoided inventing a new persisted entity.
- [x] `components/dashboard/ProjectDashboard.tsx` — group by folder into collapsible sections (named clients alphabetical, "Unfiled" trailing; flat grid unchanged for users with zero clients), "Move to client" hover action per card, folder rename (native `prompt()`, mirrors the existing native `confirm()` precedent for delete) / ungroup actions on section headers, folder+density fields folded into a new `NewFileModal`
- [x] Scoped deliberately to **single-owner folders**, not real multi-user team sharing (invites/roles/RLS-for-teams). That's Phase 5.

### 1B. Density switch
> Feedback: Q2 "Hidden Secret to Winning This Market" — a Compact/Standard/Spacious switch that globally rescales padding; Q3 Level-1 "Vibe Slider"
- [x] `store/useDesignSystem.ts` — `primitives.density: "compact" | "standard" | "spacious"` (default `"standard"`); `DENSITY_PRESETS` sets `spacingBase`/`radiusScale` absolutely (3/4/5px, 0.75/1/1.25) rather than relatively, so repeated switching never compounds rounding error; `setDensity` action recomputes `spacing`/`radii` through the existing `buildSpacing`/`buildRadii` builders; persist **v11 → v12** migrate backfills `density: "standard"`
- [x] **Placement correction from the original plan**: NOT on `Welcome.tsx`. Discovered mid-build that `Welcome.tsx` is dead code for the multi-project flow — `createDefaultProjectState` sets `meta.started: true` immediately, so dashboard-created files skip Welcome entirely and land straight in the Colour step. The real "beginning of the flow" (Q2's requirement) is the dashboard's **New file** action, so density (+ client) now lives in a new `NewFileModal` inside `ProjectDashboard.tsx`, applied via `setDensity` right after `createProject`. Also exposed in `SpaceStep.tsx` for later editing.
- [x] Manual per-value spacing/radius edits remain fully available after a density pick — density is a preset action, not a locked mode

### 1C. Framework adapter exports (the missing "Automated Production Handoff")
> Feedback: Q3 Phase 6 "Token Pipeline Automation" / Style Dictionary → per-platform outputs; Q1 Phase 6 "Framework Adapters"
- [x] `lib/adapters.ts` (new) — pure transforms off existing `systemCssVars`/token state, no new deps:
  - `compileCssVariables(state)` → real `:root{}` + `.dark{}` CSS custom-properties file (this didn't exist as an export at all before)
  - `compileTailwindConfig(state)` → `tailwind.config.js`-shaped source (colors from semantic roles + primitive ramps, spacing, borderRadius, fontSize/fontWeight, boxShadow, transitionDuration/timingFunction)
  - `compileMuiTheme(state)` → MUI `createTheme({...})`-shaped source (palette, spacing fn, shape.borderRadius, typography, shadows)
- [x] `components/steps/ShipStep.tsx` — extend the artifact `Segmented` from 2 to 5 tabs (Figma JSON / Docs / CSS Vars / Tailwind / MUI), each downloadable + copyable through the existing `download()`/`copy()` plumbing
- [x] SwiftUI/Jetpack Compose adapters explicitly deferred to Phase 3 (native token formats are a bigger, riskier lift — don't fake them)

**Verified 2026-07-12:** `npx tsc --noEmit` exit 0. Live on `:3111` — magic-link auth needs real email access this session didn't have, so verification hydrated the store directly via a temporary `window.__ark` debug hook (added, exercised, then removed before finishing — grep the file for "TEMP-VERIFY" if it's ever back, it shouldn't be). Confirmed: dashboard groups 4 fake projects into "Aero Logistics" (2)/"FinTech Pulse" (1)/"Unfiled" (1) with correct counts; New file modal renders name/client-combobox/density fields and calls through to `createProject`; `moveProjectToFolder`/`renameFolderEverywhere`/`deleteFolder` all update grouping correctly live; Space step's Density segmented control flips Compact→Spacious and every spacing row rescales (3px→5px base) in real time; Ship step's 5 tabs (Figma JSON, Docs, CSS vars, Tailwind, MUI) all render non-empty, well-formed output. The only console errors were the expected `Not signed in`/RLS-rejected writes from the fake unauthenticated session (same failure shape as the pre-existing `renameProject`/autosave calls) — not bugs. **Not yet verified**: a real signed-in round-trip through Supabase (create → reload → data survives) — do that first thing next session, before trusting this in production.

---

## Phase 2 — Project Initialization Wizard (starting-point choices) ✅ DONE (2026-07-12)

> Feedback: Q3 §1 "Project Initialization Wizard" — target platform / engineering
> destination / starting point (Scrape existing / Agnostic skeleton / UI Framework Twin)

Built as a **2-step wizard modal** replacing Phase 1's density-only `NewFileModal`
in `ProjectDashboard.tsx` (renamed `NewFileWizard`). Step 1 = "how do you start?",
step 2 = name + targets. Since `Welcome.tsx` is dead code for dashboard files (Phase
1B finding), the wizard also owns the creative name+brand moment Welcome used to.

- [x] **Agnostic skeleton** — the "Blank system" card; the prior default flow.
- [x] **Scrape existing** — `app/api/scrape/route.ts` (new): POST `{url}`, fetches
  server-side (client fetch hits CORS), scans inline `<style>` + `style=""` +
  linked stylesheets for colours (ranked by frequency × saturation, near-white/
  black/grey dropped — same thresholds as `lib/paletteFromImage.ts`) and the
  dominant non-generic `font-family`. SSRF-guarded (http/https only; localhost/
  private-range/bare-hostname refused). Returns `{colors, fonts}`. Verified live:
  `stripe.com` → `#533afd` (Stripe's real blurple) + `sohne-var` (their real font).
  The "screenshot fallback" from the original plan wasn't needed — URL scrape works
  well enough on its own; `paletteFromImage.ts` stays the logo-upload path elsewhere.
- [x] **UI Framework Twin** — `FRAMEWORK_TWINS` in the store: Material (spacious
  density, radiusScale 0.5 → crisp 4px, type ratio 1.2) and Tailwind (standard
  density, radiusScale 1 → 8px, ratio 1.25). **Structure only — never colour**, so
  brand identity stays the user's (matches the feedback's "inject brand soul into
  robust structures" framing exactly). Fully editable after.
- [x] Where it lives: the wizard IS the "New file" flow (not a separate screen and
  not folded into the now-dead `Welcome.tsx`). `applyInitConfig(config)` applies the
  whole result atomically to the just-created project (brand/secondary/font +
  density + twin structural tokens + meta targets) in one `set`, right after
  `createProject` selects it.
- [x] `meta.targetPlatform` / `meta.engineeringDestination` stored (optional fields
  → **no persist migrate needed**, unlike the required `density` in v12). `ShipStep`
  opens on the matching export tab via `DESTINATION_TO_ARTIFACT` (tailwind→tailwind,
  mui→mui, css→css, swiftui→docs fallback until a Swift adapter exists).

**Verified 2026-07-12** (`tsc` exit 0; live via the temporary `window.__ark` hook,
removed after): wizard step 1 renders all 4 start cards; live scrape of stripe.com
fills swatches + font; step 2 pre-fills brand from the scrape and auto-selects the
Tailwind destination; `applyInitConfig` exercised for scrape + both twins — twins
correctly force their own density/radius/type and leave colour alone, scrape applies
brand+secondary+font; Ship step opened directly on the MUI tab when destination=mui,
with the material-twin's spacing/radius/font visible in the generated `createTheme()`.
One test-harness note: the browser pane's `type` action didn't dispatch React's
onChange for the URL field (button stayed disabled) — `form_input` did; not a code
bug. **Still unverified**: a real signed-in Supabase create→reload round-trip.

---

## Phase 3 — Figma live sync (bidirectional "Pull Updates") ⬜ NOT STARTED

> Feedback: Q3 §4 "Figma Engine Injection" / "Pull Updates" — update variables
> in place without breaking existing instances

- [ ] Audit `figma-plugin/src/code.ts` — confirm current behavior (looks like
  one-shot import of a pasted/uploaded JSON bundle; verify before assuming).
- [ ] Design the "update in place" contract: Figma Variables have stable IDs
  once created — the plugin needs to persist a mapping (token name → Figma
  variable ID) inside the Figma file (`figma.root.setPluginData` or a plugin
  data blob) so a second sync updates existing variables instead of creating
  duplicates.
- [ ] Add a "Copy sync code" or small hosted-JSON-by-id endpoint so the plugin
  can pull directly from Arkitype instead of manual paste (needs a public
  read endpoint per project — new RLS-safe design, e.g. a signed short-lived
  export URL, NOT making `projects` publicly readable).
- [ ] Component bindings/options into the bundle (currently tokens-only per
  HANDOFF.md §7 — flagged there as a known gap independent of this feedback).

This phase touches a second codebase (the Figma plugin sandbox) and a public
data-exposure decision — higher risk, do it deliberately, not "no hesitation."

---

## Phase 4 — Live proofing dashboard: industry templates ⬜ NOT STARTED

> Feedback: Q3 §3 "Live Interactive Proofing Dashboard" — SaaS / Mobile / plus
> the open question "industry-specific templates like E-Commerce, Fintech, or
> Healthcare?" (never answered by the user — **ask before building**, this is
> a real content/scope fork, not an implementation detail)

- [ ] Resolve the open question with the user: generic universal patterns
  (current `PreviewStep.tsx` direction) vs. industry-specific template swaps.
  Building the wrong one wastes the whole phase.
- [ ] `PreviewStep.tsx` currently ships one dashboard mock — extend to a
  template switcher once the direction above is confirmed.
- [ ] Density/State switcher on the proofing view itself (Light/Dark ×
  Compact/Spacious × interactive-states-all-at-once) — natural pairing with
  Phase 1B's density primitive.

---

## Phase 5 — True multi-user collaboration (Agency workspace type) ⬜ NOT STARTED, NOT SCOPED

> Feedback: Q3 "Independent Freelancer / Agency / In-House Team" workspace
> types at login — implies shared projects across multiple auth users, invites,
> roles/permissions.

Explicitly NOT attempted in Phase 1's folder system (which is single-owner
organization only). This is a real auth/RLS redesign — new tables
(`workspaces`, `workspace_members`), policy rework on `projects` from
owner-only to membership-based, an invite flow. Do not start this without a
dedicated planning pass; it's the riskiest, highest-blast-radius item in the
whole feedback set (touches the security model — see
[[security-hardening]]-style migration discipline from the Hued project).

---

## 0. Raw feedback (source of truth)

<details>
<summary>Q1 — Design system inception → delivery roadmap (Figma, cross-platform)</summary>

Covers: visual/technical audit, three-tier token strategy (Primitive → Semantic
→ Component), Figma Variables modes (Light/Dark, Compact Mobile/Spacious Web),
100% Auto Layout + component properties + slot architecture, in-Figma +
external (zeroheight-style) documentation, federated contribution model,
semantic versioning + deprecation with migration paths, Dev Mode + Code
Connect, Style Dictionary token pipeline (Figma → JSON → CSS/Swift/Compose).
Ends asking which platform/component causes the most handoff friction.

</details>

<details>
<summary>Q2 — Turning this into a product for agency designers stuck re-skinning Material UI</summary>

Core reframe: "Structural Skeleton + Semantic Engine" — ship unbreakable
agnostic structure, let the user inject brand skin. Three-level info
architecture (Brand DNA primitives → Semantic Bridge → Component Skeletons).
Golden workflow: Establish Identity DNA (2 min) → Automate Semantic Bridge
(instant, incl. WCAG math) → Live Visual Validation (interactive preview,
not code/token sheets) → One-Click Injection & Export (Figma file +
Tailwind/MUI config simultaneously). "Hidden secret": a Density Switch
(Compact/Standard/Spacious) scaling padding globally solves the #1 agency
pain point (Material's spacious touch-target defaults looking clunky on
dense enterprise UI). Ends asking the target dev stack.

</details>

<details>
<summary>Q3 — Full end-to-end flow: login → project separation → Figma → product (most detailed, most actionable)</summary>

1. **Entry & multi-tenant project separation**: Smart login (OAuth) →
   workspace type choice (Freelancer/Agency/In-House) → Client Dashboard
   Matrix (Client folders → systems inside) → Project Initialization Wizard
   (target platforms; engineering destination; starting point: Scrape
   existing / Agnostic skeleton / UI Framework Twin).
2. **Platform flow**: Foundations Blueprint (5 min: color scale engine,
   typescale generator, vibe slider for spacing/radius) → Intelligent
   Semantic Bridge (auto-generated states + a11y checklist) → Split-Screen
   Studio (token controller + live proofing dashboard) → Figma Engine
   Injection (companion plugin populates variables + component sets) →
   Automated Production Handoff (Style-Dictionary-transformed framework
   config + component spec link).
3. **Workspace interface**: three-tier modifier granularity (Global /
   Component Group / Atomic Overrides) in the left panel; Live Proofing
   Dashboard on the right (SaaS view, Mobile view, State Switcher for
   Light/Dark × Density × interactive states).
4. **Figma sync & code gen pipeline**: companion plugin, "Pull Updates"
   updates existing Figma Variables in place without breaking instances;
   developer handoff = W3C Design Token JSON + framework adapters (e.g.
   pristine `tailwind.config.js`) + Code Connect mapping docs.
   Ends asking: generic universal proofing templates, or industry-specific
   (E-Commerce/Fintech/Healthcare)? — **unanswered, resolve before Phase 4.**

</details>

