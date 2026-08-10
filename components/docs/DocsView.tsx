"use client";

/**
 * The documentation, read without leaving the file you're working on.
 *
 * Same words as /docs — literally the same component — in the workspace's own
 * frame: the rail becomes the contents list, the canvas becomes the page. It
 * takes over the canvas for the same reason Variables does; the step you were
 * on is untouched underneath and comes back the moment you switch tabs.
 *
 * The alternative was a link that opens /docs in a new tab, which is what this
 * replaces. Answering "what does Elbow do" should not cost you your place in a
 * canvas you've panned, zoomed and half-wired.
 */
import { DocsSections } from "@/components/docs/DocsContent";
import { DOCS_SCROLL_ID } from "@/components/docs/docsNav";
import { ArrowUpRight } from "lucide-react";

export function DocsView() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-ink">
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-line px-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-fg-mute">
          Documentation
        </p>
        <p className="min-w-0 flex-1 truncate text-[10.5px] text-fg-mute">
          Everything Arkitype does, in order — pick a section in the rail.
        </p>
        {/* The way out to the standalone page: the one thing this surface
            can't do is be sent to somebody. */}
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          title="Open the full documentation page in a new tab"
          className="inline-flex shrink-0 items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[10.5px] font-semibold text-fg-mute transition-colors hover:border-line-strong hover:text-fg"
        >
          Full page
          <ArrowUpRight size={10} />
        </a>
      </div>

      <div id={DOCS_SCROLL_ID} className="min-h-0 flex-1 overflow-y-auto">
        {/* A reading column, not a full-width canvas. The sections carry a
            96px scroll margin for the marketing page's sticky header, which
            there isn't one of in here — hence the override, so jumping to a
            section lands its title near the top instead of a screen down. */}
        <div className="mx-auto max-w-3xl px-8 pb-24 pt-8 [&_section]:scroll-mt-4">
          <DocsSections />
        </div>
      </div>
    </div>
  );
}
