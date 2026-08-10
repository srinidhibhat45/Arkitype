/**
 * The two things every surface needs to *navigate* the documentation, kept
 * apart from the documentation itself.
 *
 * The contents list is a few dozen labels; `DocsContent` is the whole manual.
 * The workspace rail wants the first and — until you actually open the Docs
 * tab — none of the second, and one import of a shared constant would have
 * dragged the manual into the builder's bundle for every session that never
 * reads it. Hence a file with nothing in it but the table of contents.
 */
import { STEP_ORDER, STEP_META } from "@/store/useDesignSystem";

/**
 * The scroller the docs page renders into. Named so a contents list somewhere
 * else in the app can drive it — a section id is the only thing the two need
 * to agree on.
 */
export const DOCS_SCROLL_ID = "arkitype-docs-scroll";

export const DOCS_NAV: { heading: string; items: { id: string; label: string }[] }[] = [
  {
    heading: "Getting started",
    items: [
      { id: "overview", label: "Overview" },
      { id: "quick-start", label: "Quick start · 5 minutes" },
      { id: "starting-a-file", label: "Starting a file" },
      { id: "the-workspace", label: "The workspace" },
      { id: "files-and-clients", label: "Files & clients" },
    ],
  },
  {
    heading: "Building your system",
    items: STEP_ORDER.map((id) => ({
      id: `step-${id}`,
      label: `${STEP_META[id].n} · ${STEP_META[id].label}`,
    })),
  },
  {
    heading: "Reference",
    items: [
      { id: "variables-map", label: "Variables: table and map" },
      { id: "accessibility", label: "Accessibility engine" },
      { id: "export-formats", label: "Export formats" },
      { id: "publishing", label: "Publishing & sharing" },
      { id: "figma-plugin", label: "Figma plugin" },
      { id: "faq", label: "FAQ" },
    ],
  },
];
