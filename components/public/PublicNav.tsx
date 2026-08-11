"use client";

/**
 * The published site's section navigation.
 *
 * The sections are the builder's own steps — Colour & roles, Typography,
 * Spacing, Shape & elevation, Motion, Components — because a reader and the
 * designer who published should be looking at the same information
 * architecture. A published system used to be one unbroken scroll of every
 * foundation and all 53 components, with no way to get to a part except by
 * finding it.
 *
 * The active section lives in the URL hash, so a section is linkable and the
 * browser's back button steps through them.
 */
import { useEffect, useState } from "react";

export const PUBLIC_SECTIONS = [
  { id: "colour", label: "Colour", blurb: "Palette primitives" },
  { id: "roles", label: "Roles", blurb: "Semantic tokens per mode" },
  { id: "type", label: "Typography", blurb: "Font roles, weights, scale" },
  { id: "space", label: "Spacing", blurb: "Rhythm and breakpoints" },
  { id: "shape", label: "Shape & elevation", blurb: "Radius and depth" },
  { id: "motion", label: "Motion", blurb: "Durations and easing" },
  { id: "components", label: "Components", blurb: "The library" },
] as const;

export type PublicSectionId = (typeof PUBLIC_SECTIONS)[number]["id"];

const isSection = (v: string): v is PublicSectionId =>
  PUBLIC_SECTIONS.some((s) => s.id === v);

/** The section named by the URL hash, kept in sync with back/forward. */
export function useSectionRoute(): [PublicSectionId, (id: PublicSectionId) => void] {
  // SSR has no hash — start on the first section and correct on mount, rather
  // than reading `location` during render and mismatching hydration.
  const [section, setSection] = useState<PublicSectionId>("colour");

  useEffect(() => {
    const read = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if (isSection(raw)) setSection(raw);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const go = (id: PublicSectionId) => {
    setSection(id);
    // pushState rather than assigning `location.hash`: this must not scroll to
    // an element that happens to share the id.
    window.history.pushState(null, "", `#${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return [section, go];
}

export function SectionNav({
  active,
  onSelect,
  counts,
}: {
  active: PublicSectionId;
  onSelect: (id: PublicSectionId) => void;
  counts: Partial<Record<PublicSectionId, number>>;
}) {
  return (
    <nav
      aria-label="Sections"
      className="sticky top-0 z-20 border-b border-line bg-ink/85 backdrop-blur"
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className="-mb-px flex gap-1 overflow-x-auto">
          {PUBLIC_SECTIONS.map((s) => {
            const on = s.id === active;
            const count = counts[s.id];
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={on ? "page" : undefined}
                title={s.blurb}
                className={`shrink-0 border-b-2 px-3 py-3 text-[13px] font-medium transition-colors ${
                  on
                    ? "border-fg text-fg"
                    : "border-transparent text-fg-mute hover:border-line-strong hover:text-fg-dim"
                }`}
              >
                {s.label}
                {count !== undefined ? (
                  <span className="ml-1.5 font-mono text-[10px] text-fg-mute">{count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
