"use client";

/**
 * Modes, as the thing you can actually do something about.
 *
 * A mode is a *column of values* — every table that shows tokens shows one
 * column per mode, so the controls for adding, renaming and removing one belong
 * on the columns themselves rather than in a settings screen somewhere. This
 * module is that control, extracted so the Variables table and the Colour
 * step's token tiers are literally the same affordance: a file that grows a
 * "High contrast" column in one surface has grown it in both, and there is no
 * surface where modes are a fixed pair of built-ins you can only look at.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import {
  ModeBase,
  ModeDef,
  PreviewMode,
  isBuiltInMode,
  modeBase,
  modeDefsOf,
  useDesignSystem,
} from "@/store/useDesignSystem";

/** The mode menu's width — needed before layout, to keep it on screen. */
const MENU_WIDTH = 220;

/** An inline rename that commits on blur or Enter and reverts on Escape. */
function EditableName({
  value,
  onCommit,
  className,
  title,
}: {
  value: string;
  onCommit: (next: string) => void;
  className: string;
  title: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      value={draft}
      spellCheck={false}
      title={title}
      onChange={(e) => setDraft(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => {
        if (draft.trim() && draft.trim() !== value) onCommit(draft.trim());
        else setDraft(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
}

/**
 * One mode's column header, and everything you can do to that mode.
 *
 * Modes live in the header rather than in a settings panel because a mode *is*
 * a column: the place you notice you want another one is while looking at the
 * two you have, and the place you'd go to rename or drop one is the thing with
 * its name on it.
 */
export function ModeHeader({
  def,
  canDelete,
  labelClassName = "text-[10.5px] font-semibold text-fg-mute",
}: {
  def: ModeDef;
  canDelete: boolean;
  /** The host table's own column-label type, so the header sits in its row. */
  labelClassName?: string;
}) {
  const renameVariableMode = useDesignSystem((s) => s.renameVariableMode);
  const setVariableModeBase = useDesignSystem((s) => s.setVariableModeBase);
  const removeVariableMode = useDesignSystem((s) => s.removeVariableMode);
  const addVariableMode = useDesignSystem((s) => s.addVariableMode);
  const primitives = useDesignSystem((s) => s.primitives);
  const semantics = useDesignSystem((s) => s.semantics);

  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Where the menu was anchored when it opened — see the note below. */
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const builtIn = isBuiltInMode(def.id);
  /** How this mode reads — from its own surfaces unless someone pinned it. */
  const reads = modeBase(semantics, def.id, primitives);

  /**
   * The menu is positioned against the viewport rather than against its own
   * column. Both tables that host these headers scroll — sideways once a file
   * has enough modes — and a scrolling box clips, so a menu laid out inside the
   * column would be cut off by the very thing that made the file interesting
   * enough to need it. Fixed escapes the clip; closing on scroll keeps it
   * honest, since it can no longer follow its column.
   */
  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const r = buttonRef.current?.getBoundingClientRect();
    if (r) {
      setAnchor({
        top: r.bottom + 4,
        left: Math.max(8, Math.min(r.left - 8, window.innerWidth - MENU_WIDTH - 8)),
      });
    }
    setConfirmDelete(false);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onScroll = (e: Event) => {
      // Scrolling *inside* the menu (its own overflow) isn't the page moving
      // out from under it.
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // Capture: the scroller is an ancestor box, not the window.
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="flex min-w-0 items-center gap-1">
      <span className={`min-w-0 truncate ${labelClassName}`}>{def.name}</span>
      {!builtIn ? (
        <span
          title={
            def.base
              ? `Pinned: this mode is treated as ${def.base}`
              : `Reads as ${reads}, from its own surface-base`
          }
          className={`shrink-0 rounded border px-1 font-mono text-[8px] leading-[13px] ${
            def.base ? "border-line-strong text-fg-dim" : "border-line text-fg-mute"
          }`}
        >
          {reads}
        </span>
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        title={`${def.name} — rename, duplicate${canDelete ? ", delete" : ""}`}
        aria-label={`${def.name} options`}
        className="shrink-0 rounded p-0.5 text-fg-mute transition-colors hover:bg-ink-hover hover:text-fg"
      >
        <ChevronDown size={10} />
      </button>

      {open && anchor ? (
        <div
          style={{ position: "fixed", top: anchor.top, left: anchor.left, width: MENU_WIDTH }}
          className="z-50 overflow-hidden rounded-lg border border-line-strong bg-ink-raised p-2 shadow-2xl"
        >
          <EditableName
            value={def.name}
            title="Rename this mode"
            onCommit={(next) => renameVariableMode(def.id, next)}
            className="mb-2 h-7 w-full rounded border border-line bg-ink px-1.5 text-[11.5px] font-semibold text-fg focus:border-line-strong focus:outline-none"
          />

          {builtIn ? (
            <p className="mb-2 text-[10px] leading-snug text-fg-mute">
              Light and Dark can&apos;t be removed — they&apos;re the pair every CSS export writes
              as <span className="font-mono">:root</span> and{" "}
              <span className="font-mono">.dark</span>, and the pair the contrast audit reports
              against. Every other mode stands entirely on its own.
            </p>
          ) : (
            <div className="mb-2">
              <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.07em] text-fg-mute">
                Reads as
              </p>
              <div className="grid grid-cols-3 gap-1 rounded border border-line bg-ink p-0.5">
                {([null, "light", "dark"] as Array<ModeBase | null>).map((b) => (
                  <button
                    key={b ?? "auto"}
                    type="button"
                    onClick={() => setVariableModeBase(def.id, b)}
                    title={
                      b === null
                        ? "Work it out from this mode's own surface-base — nothing to declare"
                        : `Treat this mode as ${b}, whatever its surfaces say`
                    }
                    className={`rounded py-1 text-[10px] font-bold capitalize transition-colors ${
                      (def.base ?? null) === b ? "bg-fg text-ink" : "text-fg-mute hover:text-fg-dim"
                    }`}
                  >
                    {b ?? "auto"}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[9.5px] leading-snug text-fg-mute">
                This mode owns its values and its own shadow ramp. All this decides is which way
                non-token chrome leans — auto reads it off your own{" "}
                <span className="font-mono">surface-base</span> ({reads}).
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              addVariableMode(`${def.name} copy`, def.id);
              setOpen(false);
            }}
            title="A new standalone mode, its values copied from this one to start with"
            className="mb-1 flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[11px] text-fg-mute transition-colors hover:bg-ink-hover hover:text-fg"
          >
            <Copy size={10} />
            New mode from this one
          </button>

          {canDelete ? (
            <button
              type="button"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  window.setTimeout(() => setConfirmDelete(false), 4000);
                  return;
                }
                removeVariableMode(def.id);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[11px] transition-colors ${
                confirmDelete
                  ? "bg-red-500/10 text-red-400"
                  : "text-fg-mute hover:bg-ink-hover hover:text-red-400"
              }`}
            >
              <Trash2 size={10} />
              {confirmDelete ? "Delete — every value in it goes" : "Delete this mode"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * "Add a mode" — the one control that was only ever offered on the Variables
 * table, which made modes look like a feature of that surface instead of a
 * property of the file. It seeds the new column from `startFrom` (Light by
 * default) so the file still renders the moment the column exists.
 */
export function AddModeButton({
  startFrom = "light",
  className = "inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[11px] font-semibold text-fg-mute transition-colors hover:border-line-strong hover:bg-ink-hover hover:text-fg",
  label = "Mode",
}: {
  /** Which existing column the new one's values are copied from. */
  startFrom?: PreviewMode;
  className?: string;
  label?: string;
}) {
  const addVariableMode = useDesignSystem((s) => s.addVariableMode);
  const semantics = useDesignSystem((s) => s.semantics);
  const count = modeDefsOf(semantics).length;

  return (
    <button
      type="button"
      onClick={() => addVariableMode(`Mode ${count + 1}`, startFrom)}
      title="Add a mode — a new column, copied from Light, that every variable gets its own value in. Rename it from its header."
      className={className}
    >
      <Plus size={11} />
      {label}
    </button>
  );
}
