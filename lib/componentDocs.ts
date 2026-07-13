/**
 * Per-component usage documentation for the exported design-system file.
 *
 * This is the written layer of the Figma kit: every wired component ships with
 * a description, when-to-use guidance, do/don't rules, and an accessibility
 * note. The Figma plugin renders these onto each component's sheet, and
 * `lib/docs.ts` can reuse them for the Markdown handoff.
 *
 * Keyed by component id (must match `COMPONENT_SPECS` / `WIRED_COMPONENTS`).
 */

export interface ComponentDoc {
  /** One-paragraph definition of what the component is. */
  description: string;
  /** Situations where this component is the right choice. */
  whenToUse: string[];
  /** Practices to follow. */
  dos: string[];
  /** Practices to avoid. */
  donts: string[];
  /** Accessibility guidance. */
  a11y: string;
}

export const COMPONENT_DOCS: Record<string, ComponentDoc> = {
  /* ── Controls ── */
  button: {
    description:
      "The primary interactive element for triggering actions. Style variants express hierarchy (filled for the main action, tonal/outlined/text for secondary paths) and tone (error, warning, success) — pick them from the variant properties instead of restyling an instance.",
    whenToUse: [
      "Submitting forms, confirming dialogs, or starting a flow.",
      "One filled button per view — it marks the single primary action.",
      "Use the error tone for destructive confirmations, not for emphasis.",
    ],
    dos: [
      "Use verb-first labels (“Save changes”, not “Changes”).",
      "Switch tone/state via the properties panel so tokens stay bound.",
      "Pair a prefix icon only when it clarifies the action.",
    ],
    donts: [
      "Don't place two filled buttons side by side.",
      "Don't detach an instance to recolour it — change the variant.",
      "Don't use a button for navigation when a Link reads better.",
    ],
    a11y:
      "Hit target ≥ 44px tall including padding. Label text must meet 4.5:1 contrast against the button fill; the disabled state is exempt but should still be readable.",
  },
  iconButton: {
    description:
      "A compact button whose entire content is a single icon. Used for high-frequency, low-ambiguity actions (close, edit, overflow menu) where a text label would add noise.",
    whenToUse: [
      "Toolbars, card corners, table row actions, and dense UI.",
      "When the icon's meaning is universally understood or a tooltip is present.",
    ],
    dos: [
      "Always pair with a tooltip or accessible name.",
      "Keep one icon size across a toolbar.",
    ],
    donts: [
      "Don't use for the primary action of a page.",
      "Don't mix icon-only and labelled buttons in the same group.",
    ],
    a11y:
      "Requires an aria-label in code. Minimum 44×44px touch target even if the glyph is smaller.",
  },
  buttonGroup: {
    description:
      "A set of related buttons fused into one segmented control. Communicates that its options are peers — usually mutually exclusive views or filters.",
    whenToUse: [
      "Switching between 2–5 equivalent views (list/grid, day/week/month).",
      "Grouped toggles that share one decision.",
    ],
    dos: ["Keep segment labels one word where possible.", "Highlight exactly one active segment."],
    donts: [
      "Don't exceed five segments — use a Select instead.",
      "Don't mix unrelated actions into one group.",
    ],
    a11y: "Expose as a radiogroup or tablist in code; the active segment needs more than colour alone (weight, fill) to be distinguishable.",
  },
  input: {
    description:
      "A single-line text field. The workhorse of forms — its border, background, and text colours are bound to semantic tokens so every state (hover, focus, disabled) re-themes with the system.",
    whenToUse: [
      "Free-form single-line entry: names, emails, amounts.",
      "Inside a Field pattern when it needs a label and help text.",
    ],
    dos: [
      "Use the focus state's border-focus token untouched — it's the system-wide focus signal.",
      "Show placeholder text as a hint, never as the label.",
    ],
    donts: [
      "Don't use an input for constrained choices — that's a Select.",
      "Don't rely on placeholder text that disappears on typing as the only label.",
    ],
    a11y: "Every input needs a programmatically associated label. Placeholder contrast should be ≥ 4.5:1 against the field background.",
  },
  textarea: {
    description:
      "A multi-line text field for prose-length entry. Shares the input's token recipe, with a taller default and top-aligned text.",
    whenToUse: ["Comments, descriptions, messages — anything past one line."],
    dos: ["Size the default height to the expected content (3–5 lines).", "Allow resize where the platform supports it."],
    donts: ["Don't use for single-line data like emails.", "Don't cap length silently — show a counter."],
    a11y: "Associate a visible label; announce remaining character count when limits exist.",
  },
  select: {
    description:
      "A dropdown field for choosing one option from a closed list. Renders as an input-shaped trigger with a chevron; the menu itself inherits Dropdown styling.",
    whenToUse: [
      "5+ mutually exclusive options where radio buttons would sprawl.",
      "When the default option is the common case.",
    ],
    dos: ["Order options by likelihood or alphabetically.", "Use a placeholder like “Select role…” for no-default fields."],
    donts: ["Don't use for 2–4 options — radios or a button group scan faster.", "Don't nest more than one level of grouping."],
    a11y: "Keyboard support (arrows, type-ahead, Esc) is mandatory; the collapsed trigger must announce the current value.",
  },
  searchField: {
    description:
      "An input specialised for querying: leading search icon, optional clear affordance, and submit-on-enter behaviour.",
    whenToUse: ["Filtering lists and tables in place.", "Global site or app search."],
    dos: ["Debounce live filtering.", "Keep the icon leading — users scan for it."],
    donts: ["Don't use as a generic text input.", "Don't hide the field behind an icon if search is a primary task."],
    a11y: "Use role=searchbox / type=search in code so assistive tech announces intent.",
  },
  checkbox: {
    description:
      "A binary control for independent on/off choices. Each checkbox stands alone — checking one never unchecks another.",
    whenToUse: ["Multi-select lists.", "Standalone opt-ins (terms, preferences)."],
    dos: ["Keep labels positive (“Send me updates”, not “Don't email me”).", "Make the label clickable."],
    donts: ["Don't use when options are mutually exclusive — that's Radio.", "Don't pre-check consent boxes."],
    a11y: "The visible label is the accessible name; the checked mark must not be the only state signal (the fill also changes).",
  },
  radio: {
    description:
      "A single-choice control used in groups: selecting one deselects the rest. The circular shape signals exclusivity.",
    whenToUse: ["2–5 mutually exclusive options that benefit from being visible at once."],
    dos: ["Always render as a group with one pre-selected default where possible.", "Stack vertically for scanability."],
    donts: ["Don't use a lone radio button — a checkbox or switch fits binary choices.", "Don't exceed ~6 options; use a Select."],
    a11y: "Group with a fieldset/legend equivalent; arrow keys move selection within the group.",
  },
  switch: {
    description:
      "An instant on/off toggle. Unlike a checkbox, flipping a switch applies immediately — no save step.",
    whenToUse: ["Settings that take effect immediately (notifications, dark mode)."],
    dos: ["Reflect the new state instantly.", "Label the setting, not the action (“Notifications”, not “Enable”)."],
    donts: ["Don't use inside forms that need explicit submission — use a checkbox.", "Don't add on/off text inside the track."],
    a11y: "Expose as role=switch with aria-checked; the thumb position plus track colour together convey state.",
  },
  slider: {
    description:
      "A draggable control for choosing a value from a continuous or stepped range. Track, fill, and thumb are separately tokenised parts.",
    whenToUse: ["Ranges where relative position matters more than the exact number (volume, opacity)."],
    dos: ["Show the current value near the thumb or field.", "Snap to sensible steps."],
    donts: ["Don't use for precise data entry — pair with a numeric input.", "Don't make the track thinner than 4px."],
    a11y: "Arrow-key adjustment with visible focus on the thumb; announce value changes via aria-valuenow.",
  },
  stepper: {
    description:
      "A numeric input flanked by increment/decrement buttons. For small adjustments within a known range.",
    whenToUse: ["Quantities (1–99), counts, and bounded numeric settings."],
    dos: ["Disable the minus button at the minimum (and plus at max).", "Allow direct typing into the value."],
    donts: ["Don't use for wide ranges — typing beats fifty clicks.", "Don't hide the bounds."],
    a11y: "Buttons need accessible names (“Increase quantity”); announce the new value after each press.",
  },
  chip: {
    description:
      "A compact interactive token representing an input, filter, or choice. Sits between a Tag (passive) and a Button (imperative).",
    whenToUse: ["Filter bars, selected-item lists, and compact multi-select."],
    dos: ["Show selected state with a fill change, not just a border.", "Allow removal with an inline ✕ where chips represent input."],
    donts: ["Don't use chips for primary actions.", "Don't let chip rows wrap into more than ~2 lines — collapse into “+N”."],
    a11y: "Selected state must be announced (aria-pressed or aria-selected); the remove affordance needs its own accessible name.",
  },
  datePicker: {
    description:
      "An input paired with a calendar popover for choosing dates. The field follows input tokens; the calendar follows popover/dropdown tokens.",
    whenToUse: ["Any date entry where format errors are likely from free typing."],
    dos: ["Accept keyboard entry in a forgiving format alongside the calendar.", "Show today and the selected day distinctly."],
    donts: ["Don't force calendar-only input for well-known dates (birthdays).", "Don't hide the expected format."],
    a11y: "The calendar grid needs full arrow-key navigation and a text alternative for every day cell.",
  },
  fileUpload: {
    description:
      "A dropzone plus browse affordance for attaching files. Dashed border signals the droppable region.",
    whenToUse: ["Uploading documents, images, or bulk files."],
    dos: ["State accepted types and size limits up front.", "Show per-file progress and errors."],
    donts: ["Don't rely on drag-and-drop alone — always offer browse.", "Don't clear the queue on one failed file."],
    a11y: "The dropzone must be focusable and operable via keyboard (Enter opens the file dialog).",
  },

  /* ── Display ── */
  badge: {
    description:
      "A small status descriptor. Tone variants (info, success, warning, error, neutral) map to the feedback token trio — surface, text, border — so they re-theme per mode.",
    whenToUse: ["Statuses on rows, cards, and headers (Active, Pending, Failed)."],
    dos: ["Keep to one or two words.", "Use tone semantically — green means success, not decoration."],
    donts: ["Don't make badges interactive — that's a Chip.", "Don't stack more than two on one item."],
    a11y: "Colour alone can't carry meaning: the text label is the signal, the tone is reinforcement.",
  },
  tag: {
    description:
      "A label for categorising or grouping content, optionally removable. Quieter than a badge — metadata, not status.",
    whenToUse: ["Topics, categories, and user-generated labels."],
    dos: ["Allow wrapping in tag clouds.", "Keep the removable ✕ target at least 20px."],
    donts: ["Don't encode status in tags — use Badge.", "Don't truncate to less than three characters."],
    a11y: "Removable tags need an accessible “Remove {tag}” name on the ✕ control.",
  },
  avatar: {
    description:
      "A user or entity thumbnail: image, initials fallback, and optional presence dot. Sizes map to the spacing scale.",
    whenToUse: ["Anywhere a person or workspace needs visual identity — nav bars, comments, tables."],
    dos: ["Always provide an initials fallback.", "Keep presence dots on the bottom-right with a surface-coloured ring."],
    donts: ["Don't stretch avatars — they're always square/circular.", "Don't use presence colours for anything but presence."],
    a11y: "Images need alt text (the person's name); presence needs a text equivalent in the tooltip or label.",
  },
  tooltip: {
    description:
      "A small overlay that names or explains its trigger on hover/focus. Inverse-surface styling gives it maximum contrast.",
    whenToUse: ["Labelling icon-only controls.", "Short clarifications that don't fit inline."],
    dos: ["Keep under ~8 words.", "Show on both hover and keyboard focus."],
    donts: ["Don't hide essential instructions in tooltips.", "Don't put interactive content inside — that's a Popover."],
    a11y: "Trigger and tooltip must be linked with aria-describedby; the tooltip itself is never focusable.",
  },
  progress: {
    description:
      "A horizontal bar communicating completion of a determinate task. Track and fill are separate tokenised parts.",
    whenToUse: ["Uploads, imports, multi-step completion — anything with a known end."],
    dos: ["Pair with a percentage or step label.", "Animate width changes with the system's motion tokens."],
    donts: ["Don't use for unknown durations — that's a Spinner.", "Don't reset without explanation."],
    a11y: "Expose aria-valuenow/min/max; the fill colour needs 3:1 contrast against the track.",
  },
  spinner: {
    description:
      "An indeterminate loading indicator for waits without a known duration.",
    whenToUse: ["Short async operations (fetches, saves) under ~10 seconds."],
    dos: ["Pair with a text hint when the wait exceeds ~2 seconds.", "Centre in the region being loaded."],
    donts: ["Don't show multiple spinners in one view.", "Don't use for long operations — show progress instead."],
    a11y: "Announce loading state via aria-busy/live region, not the animation alone.",
  },
  skeleton: {
    description:
      "A placeholder that mimics the shape of loading content, reducing perceived wait and layout shift.",
    whenToUse: ["Content-heavy regions with predictable layout (cards, lists, tables)."],
    dos: ["Match the skeleton's shape to the real content.", "Swap to real content in place."],
    donts: ["Don't skeleton tiny elements like single icons.", "Don't animate faster than the motion tokens allow."],
    a11y: "Mark the region aria-busy so screen readers skip placeholder noise.",
  },
  alert: {
    description:
      "An inline message embedded in the page flow. Tone variants reuse the feedback token trio; it stays until the condition resolves or the user dismisses it.",
    whenToUse: ["Persistent contextual feedback: validation summaries, warnings, success confirmations that should linger."],
    dos: ["Lead with the consequence, then the fix.", "Use the tone that matches severity — warning is not error."],
    donts: ["Don't auto-dismiss errors.", "Don't stack more than two alerts; consolidate."],
    a11y: "Use role=alert for errors (interrupts politely) and role=status for success/info.",
  },
  toast: {
    description:
      "A transient notification that overlays a screen corner and auto-dismisses. For confirmations that don't need to interrupt.",
    whenToUse: ["Non-blocking confirmations (“Saved”, “Copied”) and background completions."],
    dos: ["Auto-dismiss in 4–8 seconds.", "Offer an inline undo where the action is reversible."],
    donts: ["Don't put required decisions in toasts.", "Don't queue more than three."],
    a11y: "Route through a live region; pause the dismiss timer on hover/focus.",
  },
  stat: {
    description:
      "A key metric block: muted label, large value, optional trend. The typographic hierarchy comes straight from the type scale.",
    whenToUse: ["Dashboards and summaries where a number is the message."],
    dos: ["Format numbers with locale separators.", "Colour trends semantically (success/error tokens)."],
    donts: ["Don't crowd more than one number per stat.", "Don't shrink the value below the display step."],
    a11y: "Read as label-then-value in the accessibility tree; trend arrows need a text equivalent.",
  },
  rating: {
    description:
      "A row of stars (or equivalent glyphs) for displaying or capturing a score.",
    whenToUse: ["Product/content scores, feedback capture."],
    dos: ["Show the numeric value alongside the stars.", "Use half-steps only when the data has them."],
    donts: ["Don't use ratings for binary sentiment — that's thumbs.", "Don't make display-only ratings look interactive."],
    a11y: "Interactive ratings are a radiogroup (“3 of 5 stars”); display-only ones need a text value.",
  },
  divider: {
    description:
      "A hairline separator between content regions, bound to the border-default token.",
    whenToUse: ["Separating list sections, card regions, or menu groups when spacing alone is ambiguous."],
    dos: ["Prefer whitespace first; add dividers only when grouping fails without them."],
    donts: ["Don't use dividers between every list row by default.", "Don't thicken dividers for emphasis — use headings."],
    a11y: "Decorative — hide from the accessibility tree unless it separates landmark regions.",
  },
  kbd: {
    description:
      "An inline representation of a keyboard key or shortcut, styled like a keycap in the mono font role.",
    whenToUse: ["Documenting shortcuts in menus, tooltips, and docs."],
    dos: ["One key per kbd; compose combos with “+” between elements."],
    donts: ["Don't use kbd styling for generic code — that's Code block."],
    a11y: "Reads naturally as text; ensure the keycap background meets 3:1 contrast with its border.",
  },
  popover: {
    description:
      "A floating panel anchored to a trigger, holding richer content than a tooltip — actions, forms, previews.",
    whenToUse: ["Contextual detail or quick actions that don't warrant a modal."],
    dos: ["Dismiss on Esc and outside click.", "Keep to one focused task."],
    donts: ["Don't nest popovers.", "Don't exceed roughly a third of the viewport."],
    a11y: "Move focus into the popover on open and restore it to the trigger on close.",
  },
  emptyState: {
    description:
      "A placeholder for regions with no content yet: graphic, explanation, and a call to action to fill the gap.",
    whenToUse: ["First-run screens, cleared lists, zero search results."],
    dos: ["Explain why it's empty and what to do next.", "Keep the CTA to one clear action."],
    donts: ["Don't blame the user (“You have no items”). State it neutrally.", "Don't leave an empty region unexplained."],
    a11y: "The heading, body, and action must all be in the reading order — not baked into the illustration.",
  },
  codeBlock: {
    description:
      "A pre-formatted block for code and terminal output, using the mono font role on a sunken surface.",
    whenToUse: ["Documentation, API examples, config snippets."],
    dos: ["Offer a copy button for multi-line snippets.", "Preserve indentation exactly."],
    donts: ["Don't wrap long lines silently — scroll horizontally.", "Don't use for inline code — that's a kbd-like inline style."],
    a11y: "Contrast rules still apply to syntax colours; announce the copy action's success.",
  },

  /* ── Navigation ── */
  tabs: {
    description:
      "Peer views switched in place. The active tab carries an accent underline bound to the primary action token.",
    whenToUse: ["2–7 sibling views over the same data or object."],
    dos: ["Keep tab labels parallel in grammar and length.", "Preserve each tab's state when switching."],
    donts: ["Don't use tabs for sequential steps — that's Steps.", "Don't nest tab bars two levels deep."],
    a11y: "role=tablist with arrow-key navigation; the active tab is aria-selected and the underline is not the only signal.",
  },
  navbar: {
    description:
      "The top-level horizontal navigation bar: brand, primary destinations, and session actions.",
    whenToUse: ["App-wide navigation with 3–6 primary destinations."],
    dos: ["Mark the current destination.", "Keep the bar height consistent across pages."],
    donts: ["Don't overload with actions that belong in page toolbars.", "Don't hide the brand link home."],
    a11y: "Wrap in a nav landmark; the current page link needs aria-current.",
  },
  sidebar: {
    description:
      "A vertical navigation rail for app sections, with an active-item highlight on the subtle surface token.",
    whenToUse: ["Apps with 5+ sections or hierarchies that need grouping headers."],
    dos: ["Group related items with headers.", "Highlight exactly one active item."],
    donts: ["Don't exceed two nesting levels.", "Don't mix actions (buttons) with destinations (links) in one group."],
    a11y: "A nav landmark with aria-current on the active item; collapsed states need accessible expand controls.",
  },
  breadcrumbs: {
    description:
      "A horizontal trail showing where the current page sits in the hierarchy. All ancestors are links; the current page is plain text.",
    whenToUse: ["Hierarchies three or more levels deep."],
    dos: ["Keep the full trail on desktop; collapse middles on narrow screens."],
    donts: ["Don't make the current page a link.", "Don't use breadcrumbs as primary navigation."],
    a11y: "A nav landmark labelled “Breadcrumb”; separators are decorative and hidden from screen readers.",
  },
  steps: {
    description:
      "A progress indicator for multi-step flows: completed, current, and upcoming steps rendered as connected markers.",
    whenToUse: ["Wizards and checkouts with 3–6 sequential steps."],
    dos: ["Name every step.", "Let users return to completed steps where the flow allows."],
    donts: ["Don't use for parallel (non-sequential) tasks — that's Tabs.", "Don't show more than ~6 markers; group sub-steps."],
    a11y: "Announce position (“Step 2 of 4: Shipping”); the current marker needs more than colour (filled vs. outlined).",
  },
  pagination: {
    description:
      "Page-by-page navigation for long result sets: previous/next arrows plus a window of numbered pages.",
    whenToUse: ["Tables and lists too long for one screen where position matters."],
    dos: ["Keep the current page visibly distinct.", "Disable (not hide) prev/next at the ends."],
    donts: ["Don't paginate short lists that could just scroll.", "Don't move items between pages on refresh unnecessarily."],
    a11y: "A nav landmark; the current page gets aria-current=page, arrows get accessible names.",
  },
  dropdown: {
    description:
      "A trigger that opens a floating menu of actions or options — the action-menu sibling of Select.",
    whenToUse: ["Overflow actions (⋯ menus), bulk-action menus, compact toolbars."],
    dos: ["Order items by frequency, destructive actions last and toned error.", "Close on selection, Esc, and outside click."],
    donts: ["Don't hide the page's single primary action in a dropdown.", "Don't nest submenus more than one level."],
    a11y: "Full keyboard support (arrows, Home/End, type-ahead); focus returns to the trigger on close.",
  },
  tree: {
    description:
      "A hierarchical list with expandable branches, for navigating nested structures like files or org charts.",
    whenToUse: ["Deep parent/child data where users need to expand selectively."],
    dos: ["Persist expansion state across visits.", "Indent consistently with the spacing scale."],
    donts: ["Don't auto-expand everything.", "Don't use for flat lists."],
    a11y: "role=tree with aria-expanded per branch and full arrow-key traversal.",
  },
  link: {
    description:
      "Inline navigational text bound to the text-link token pair, underlined to stay recognisable without colour.",
    whenToUse: ["Navigation inside prose or between pages — never for actions that change data."],
    dos: ["Write descriptive link text (“View billing settings”, not “Click here”)."],
    donts: ["Don't style buttons as links for destructive actions.", "Don't remove the underline in body text."],
    a11y: "Underline plus colour keeps links visible to colour-blind users; visited/hover states come from the token pair.",
  },

  /* ── Patterns ── */
  modal: {
    description:
      "A blocking dialog over an overlay scrim. Reserved for decisions or tasks that must be resolved before returning to the page.",
    whenToUse: ["Confirmations with consequences, focused sub-tasks, required interstitials."],
    dos: ["Title states the decision; buttons state the outcomes.", "Keep one primary action, right-aligned in the footer."],
    donts: ["Don't launch modals from modals.", "Don't use for content that could live inline or in a popover."],
    a11y: "Focus trap inside the dialog, Esc closes (unless destructive), focus returns to the trigger on close.",
  },
  table: {
    description:
      "Structured rows and columns for comparing records. Header row sits on a subtle surface; row borders use border-muted.",
    whenToUse: ["Data where users scan across attributes or sort/filter records."],
    dos: ["Left-align text, right-align numbers.", "Keep row height consistent with the density setting."],
    donts: ["Don't centre-align everything.", "Don't cram actions into every cell — use a row-level menu."],
    a11y: "Real table semantics with header cells associated to columns; sort state announced on header buttons.",
  },
  card: {
    description:
      "A contained surface grouping related content and actions. Elevation variants map to the shadow scale.",
    whenToUse: ["Dashboard modules, previews in grids, grouped settings."],
    dos: ["One subject per card.", "Use elevation sparingly — most cards sit flat with a border."],
    donts: ["Don't nest cards inside cards.", "Don't make the whole card clickable while it also contains buttons."],
    a11y: "The card's heading anchors its reading order; interactive cards need a single clear accessible name.",
  },
  listItem: {
    description:
      "A single row in a list: leading visual, title + supporting text, trailing affordance. The building block of feeds, settings, and pickers.",
    whenToUse: ["Vertically scanned collections where each row is one object."],
    dos: ["Keep titles to one line and let supporting text carry detail.", "Align trailing affordances consistently."],
    donts: ["Don't vary row anatomy within one list.", "Don't exceed two lines of supporting text."],
    a11y: "The whole row can be the click target, but nested controls must remain individually focusable.",
  },
  feedItem: {
    description:
      "A timeline-style list item for activity streams: avatar, actor + action text, timestamp.",
    whenToUse: ["Activity logs, notifications, comment streams."],
    dos: ["Lead with the actor and verb.", "Use relative timestamps with absolute on hover."],
    donts: ["Don't mix feed items with structural list items in one stream."],
    a11y: "Timestamps need machine-readable datetime; live streams should announce new items politely.",
  },
  accordion: {
    description:
      "Vertically stacked disclosure sections that expand one panel of content at a time.",
    whenToUse: ["FAQs, progressive detail, settings groups on narrow screens."],
    dos: ["Make the entire header row the toggle.", "Rotate the chevron with the system's motion tokens."],
    donts: ["Don't hide critical content users must see in collapsed panels.", "Don't auto-collapse siblings unless space demands it."],
    a11y: "Headers are buttons with aria-expanded; panel content is reachable in reading order when open.",
  },
  banner: {
    description:
      "A full-width message pinned to the top of a page or section — system-level announcements rather than field-level feedback.",
    whenToUse: ["Maintenance notices, plan limits, environment warnings."],
    dos: ["One banner at a time.", "Offer dismiss for non-critical notices."],
    donts: ["Don't use banners for form validation — that's Alert.", "Don't animate attention-seeking effects."],
    a11y: "role=status for informational banners, role=alert only for urgent system states.",
  },
  field: {
    description:
      "The form-row pattern: label, control, and help/error text stacked with consistent spacing. Wraps any input-family control.",
    whenToUse: ["Every labelled control in a form."],
    dos: ["Keep label casing and position consistent across the app.", "Swap help text for error text in place — don't stack both."],
    donts: ["Don't float labels inside the control.", "Don't mark every field “required” — mark the exceptions."],
    a11y: "Label, help, and error are all programmatically associated to the control (for/id + aria-describedby).",
  },
  statGrid: {
    description:
      "A responsive row of Stat blocks sharing one baseline — the dashboard summary strip.",
    whenToUse: ["Topline metrics at the head of a dashboard or report."],
    dos: ["Keep 3–5 stats per row.", "Align values on a shared baseline."],
    donts: ["Don't mix currencies/units without labels.", "Don't wrap into more than two rows — cut metrics instead."],
    a11y: "Reads as a list of label/value pairs; trends need text equivalents.",
  },
  timeline: {
    description:
      "A vertical sequence of dated events connected by a rail — history and audit views.",
    whenToUse: ["Order histories, audit logs, project milestones."],
    dos: ["Newest first for logs, oldest first for processes.", "Keep event markers on the rail aligned to the spacing scale."],
    donts: ["Don't use for parallel tracks — timelines are single-threaded."],
    a11y: "An ordered list semantically; dates precede descriptions in reading order.",
  },
};

/** Docs for a component id, with a safe generic fallback. */
export function componentDoc(id: string, label: string): ComponentDoc {
  return (
    COMPONENT_DOCS[id] ?? {
      description: `${label} component, themed by the system's semantic tokens.`,
      whenToUse: [`Use ${label} where its pattern fits the content.`],
      dos: ["Change appearance via variants and tokens, not detached overrides."],
      donts: ["Don't restyle instances manually — rebind tokens in Arkitype instead."],
      a11y: "Follow WCAG 2.1 AA contrast and keyboard operability.",
    }
  );
}
