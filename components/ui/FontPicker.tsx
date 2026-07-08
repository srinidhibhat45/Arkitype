"use client";
/**
 * FontPicker — a rich popover-based font selector for a single font role.
 * • Browse by category (All / Sans / Serif / Mono / Display)
 * • Live search by name
 * • Each row previews the font name rendered in that font (loaded lazily)
 * • Custom font stack fallback — always-visible text field
 */
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  GOOGLE_FONTS,
  FontCategory,
  buildGoogleFontUrl,
  primaryFamilyName,
} from "@/lib/googleFonts";

const CATEGORY_TABS: Array<{ label: string; value: FontCategory | "all" }> = [
  { label: "All", value: "all" },
  { label: "Sans-serif", value: "sans-serif" },
  { label: "Serif", value: "serif" },
  { label: "Mono", value: "mono" },
  { label: "Display", value: "display" },
];

interface Props {
  value: string;
  onChange: (family: string) => void;
  placeholder?: string;
}

/** Lazy-loads a preview stylesheet for fonts visible in the list */
function useFontPreviewLoader(families: string[]) {
  useEffect(() => {
    if (families.length === 0) return;
    const url = buildGoogleFontUrl(families);
    if (!url) return;
    const existing = document.querySelector(`link[data-ark-preview]`);
    const link = (existing as HTMLLinkElement) ?? document.createElement("link");
    if (!existing) {
      link.rel = "stylesheet";
      (link as HTMLLinkElement).setAttribute("data-ark-preview", "1");
      document.head.appendChild(link);
    }
    (link as HTMLLinkElement).href = url;
  }, [families.join(",")]);
}

export function FontPicker({ value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FontCategory | "all">("all");
  const [customValue, setCustomValue] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentName = primaryFamilyName(value);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = GOOGLE_FONTS.filter((f) => {
    const matchesCategory = category === "all" || f.category === category;
    const matchesQuery = f.family.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  // Load previews for visible fonts (first 30)
  const previewFamilies = filtered.slice(0, 30).map((f) => f.family);
  useFontPreviewLoader(previewFamilies);

  function select(family: string) {
    onChange(family);
    setOpen(false);
    setQuery("");
  }

  const isCustom =
    !!value && !GOOGLE_FONTS.some((f) => f.family === currentName);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-line bg-ink-panel px-2.5 text-[12px] text-fg transition-colors hover:border-line-strong focus:border-line-strong focus:outline-none"
      >
        <span
          className="truncate"
          style={{ fontFamily: value }}
        >
          {currentName || placeholder || "Choose font…"}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-fg-mute transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-[200] w-72 overflow-hidden rounded-xl border border-line bg-ink-panel shadow-2xl">
          {/* Search */}
          <div className="border-b border-line px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-ink px-2.5 py-1.5 focus-within:border-line-strong">
              <Search size={12} className="shrink-0 text-fg-mute" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search fonts…"
                className="min-w-0 flex-1 bg-transparent text-[12px] text-fg placeholder:text-fg-mute focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-fg-mute hover:text-fg"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-0.5 border-b border-line px-2 py-1.5">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setCategory(tab.value)}
                className={`rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                  category === tab.value
                    ? "bg-ink-raised text-fg"
                    : "text-fg-mute hover:text-fg"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Font list */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-[11px] text-fg-mute">
                No fonts match &quot;{query}&quot;
              </div>
            ) : (
              filtered.map((font) => {
                const active = font.family === currentName;
                return (
                  <button
                    key={font.family}
                    type="button"
                    onClick={() => select(font.family)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-ink-hover ${
                      active ? "bg-ink-raised" : ""
                    }`}
                  >
                    <span
                      className="text-[14px] text-fg"
                      style={{ fontFamily: `"${font.family}", sans-serif` }}
                    >
                      {font.family}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[9px] uppercase tracking-wide text-fg-mute">
                        {font.category.replace("-", "\u2011")}
                      </span>
                      {active && (
                        <Check size={12} className="text-blue-400" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Custom font entry */}
          <div className="border-t border-line px-3 py-2">
            <div className="mb-1 text-[10px] text-fg-mute">
              Custom font stack
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={isCustom ? value : customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customValue.trim()) {
                    select(customValue.trim());
                    setCustomValue("");
                  }
                }}
                placeholder='e.g. "MyFont", sans-serif'
                className="h-7 min-w-0 flex-1 rounded-md border border-line bg-ink px-2 font-mono text-[11px] text-fg placeholder:text-fg-mute focus:border-line-strong focus:outline-none"
              />
              <button
                type="button"
                disabled={!customValue.trim()}
                onClick={() => {
                  if (customValue.trim()) {
                    select(customValue.trim());
                    setCustomValue("");
                  }
                }}
                className="rounded-md border border-line px-2 py-1 text-[11px] font-medium text-fg-mute transition-colors hover:border-line-strong hover:text-fg disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
