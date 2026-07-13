"use client";

/**
 * IconField — a text input for a Material Symbols ligature name, paired with a
 * flyout grid so a valid icon can be found and clicked instead of typed from
 * memory. The flyout only ever inserts names from MATERIAL_ICON_GROUPS, so
 * whatever gets picked is guaranteed to render.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, Search, X } from "lucide-react";
import { iconDisplayLabel, MATERIAL_ICON_GROUPS } from "@/lib/materialSymbols";

export function IconField({
  value,
  onChange,
  placeholder = "Icon name",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/\s+/g, "_");
    if (!q) return MATERIAL_ICON_GROUPS;
    return MATERIAL_ICON_GROUPS.map((g) => ({
      ...g,
      icons: g.icons.filter((n) => n.includes(q)),
    })).filter((g) => g.icons.length > 0);
  }, [search]);

  const pick = (name: string) => {
    onChange(name);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          title={value ? `Change icon (${value})` : "Browse icons"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-ink text-fg-dim hover:border-line-strong hover:text-fg"
        >
          {value ? (
            <span className="material-symbols-outlined select-none" style={{ fontSize: 15, lineHeight: 1 }}>
              {value}
            </span>
          ) : (
            <LayoutGrid size={13} />
          )}
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-7 min-w-0 flex-1 rounded-md border border-line bg-ink px-2 text-[11px] text-fg focus:border-focus focus:outline-none font-mono"
        />
      </div>
      {open ? (
        <div className="absolute right-0 top-full z-[100] mt-1.5 w-72 rounded-lg border border-line-strong bg-ink-panel p-2.5 shadow-2xl">
          <div className="mb-2 flex items-center gap-1.5 rounded-md border border-line bg-ink px-2">
            <Search size={12} className="shrink-0 text-fg-mute" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search icons…"
              className="h-7 flex-1 min-w-0 bg-transparent text-[11px] text-fg placeholder-fg-mute focus:outline-none"
            />
            {value ? (
              <button
                type="button"
                onClick={() => pick("")}
                title="Clear icon"
                className="shrink-0 text-fg-mute hover:text-fg"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {filtered.map((g) => (
              <div key={g.category} className="space-y-1">
                <div className="px-0.5 text-[9px] font-bold uppercase tracking-wider text-fg-mute">
                  {g.category}
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {g.icons.map((name) => {
                    const active = value === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        title={iconDisplayLabel(name)}
                        onClick={() => pick(name)}
                        className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                          active
                            ? "border-line-strong bg-ink-hover text-fg"
                            : "border-transparent text-fg-dim hover:border-line hover:bg-ink"
                        }`}
                      >
                        <span className="material-symbols-outlined select-none" style={{ fontSize: 17, lineHeight: 1 }}>
                          {name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-[11px] text-fg-mute">
                No icons match “{search}”
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
