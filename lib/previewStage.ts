/**
 * How much room a component's preview needs to be readable.
 *
 * `renderHero` returns markup, not a size. Most components shrink-wrap and are
 * happy in a wrapping row of tiles. A handful do not: the modal/table/tabs
 * scenes are `width: 100%; height: 100%` stages, and navbar/drawer/sidebar are
 * `w-full` bars. Dropped into a flex row of siblings those collapse to a
 * sliver — which is exactly what the published styleguide was doing to them,
 * rendering four modal skeletons as four unreadable vertical slots.
 *
 * A stage is therefore a *layout contract*, declared once here and read by
 * every read-only surface that renders heroes (today the published styleguide;
 * the studio has its own zoomable canvas). `stageFor` returns null for the
 * common case, meaning "shrink-wrap, tile it".
 */

export interface PreviewStage {
  /** Minimum width the preview needs, in px. */
  minWidth: number;
  /** Height of the stage, in px — scenes paint into it rather than measuring. */
  height: number;
  /** One per row: the preview is too wide to sit beside a peer. */
  solo: boolean;
}

/**
 * Full-bleed scenes. These position their surface absolutely over a backdrop,
 * so the scene contributes no intrinsic height — the stage has to supply one
 * tall enough for the tallest skeleton (a full-height side-sheet), or the
 * bottom of the dialog is simply cut off.
 */
const SCENE: PreviewStage = { minWidth: 600, height: 600, solo: true };

/** Full-width bars: definite width matters, height is theirs to decide. */
const BAR: PreviewStage = { minWidth: 520, height: 0, solo: true };

const STAGES: Record<string, PreviewStage> = {
  modal: SCENE,
  // The drawer draws its own scrim at an intrinsic height — it only ever
  // needed a container wide enough not to squash the panel.
  drawer: { minWidth: 560, height: 0, solo: true },
  table: { minWidth: 600, height: 0, solo: true },
  tabs: { minWidth: 600, height: 0, solo: true },
  navbar: BAR,
  sidebar: { minWidth: 300, height: 0, solo: false },
  statGrid: { minWidth: 520, height: 0, solo: true },
  emptyState: { minWidth: 420, height: 0, solo: false },
};

/** The stage a component needs, or null when it shrink-wraps like everything else. */
export function stageFor(componentId: string): PreviewStage | null {
  return STAGES[componentId] ?? null;
}
