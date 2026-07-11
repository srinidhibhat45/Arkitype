/**
 * The single source of truth for how the component library is grouped into
 * lanes (Controls · Display · Navigation · Patterns) and the order parts appear
 * within each lane.
 *
 * Both the Components step (center canvas + inspector) and the StageRail's
 * "Document Layers" tree read this — keep them from drifting apart by importing
 * here rather than re-declaring the inventory.
 */

export type LaneId = "controls" | "display" | "navigation" | "patterns";

export interface ComponentLane {
  id: LaneId;
  label: string;
  note: string;
  items: Array<{ id: string; label: string }>;
}

export const COMPONENT_LANES: ComponentLane[] = [
  {
    id: "controls",
    label: "Controls",
    note: "Sizes map to your spacing steps, radius to your radius scale, transitions to your motion tokens — nothing here is a magic number.",
    items: [
      { id: "button", label: "Button" },
      { id: "iconButton", label: "Icon button" },
      { id: "buttonGroup", label: "Button group" },
      { id: "input", label: "Input" },
      { id: "textarea", label: "Textarea" },
      { id: "select", label: "Select" },
      { id: "searchField", label: "Search" },
      { id: "checkbox", label: "Checkbox" },
      { id: "radio", label: "Radio" },
      { id: "switch", label: "Switch" },
      { id: "slider", label: "Slider" },
      { id: "stepper", label: "Stepper" },
      { id: "chip", label: "Chip" },
      { id: "datePicker", label: "Date picker" },
      { id: "fileUpload", label: "File upload" },
    ],
  },
  {
    id: "display",
    label: "Display",
    note: "Feedback and status surfaces. Tone variants resolve from your primitive ramps per mode — the same wash/border/text recipe as alerts.",
    items: [
      { id: "badge", label: "Badge" },
      { id: "tag", label: "Tag" },
      { id: "avatar", label: "Avatar" },
      { id: "tooltip", label: "Tooltip" },
      { id: "progress", label: "Progress" },
      { id: "spinner", label: "Spinner" },
      { id: "skeleton", label: "Skeleton" },
      { id: "alert", label: "Alert" },
      { id: "toast", label: "Toast" },
      { id: "stat", label: "Stat" },
      { id: "rating", label: "Rating" },
      { id: "divider", label: "Divider" },
      { id: "kbd", label: "Keyboard" },
      { id: "popover", label: "Popover" },
      { id: "emptyState", label: "Empty state" },
      { id: "codeBlock", label: "Code block" },
    ],
  },
  {
    id: "navigation",
    label: "Navigation",
    note: "Wayfinding parts. Tabs carries four structural skeletons; the active one is what the preview dashboard renders.",
    items: [
      { id: "tabs", label: "Tabs" },
      { id: "navbar", label: "Navbar" },
      { id: "sidebar", label: "Sidebar" },
      { id: "breadcrumbs", label: "Breadcrumbs" },
      { id: "steps", label: "Steps" },
      { id: "pagination", label: "Pagination" },
      { id: "dropdown", label: "Dropdown" },
      { id: "tree", label: "Tree view" },
      { id: "link", label: "Link" },
    ],
  },
  {
    id: "patterns",
    label: "Patterns",
    note: "Composition patterns built from the parts above. Modal and Table obey the strict 4-skeleton rule — click a card to switch structure.",
    items: [
      { id: "modal", label: "Modal" },
      { id: "table", label: "Table" },
      { id: "card", label: "Card" },
      { id: "listItem", label: "List item" },
      { id: "feedItem", label: "Feed item" },
      { id: "accordion", label: "Accordion" },
      { id: "banner", label: "Banner" },
      { id: "field", label: "Field" },
      { id: "statGrid", label: "Stat grid" },
      { id: "timeline", label: "Timeline" },
    ],
  },
];
