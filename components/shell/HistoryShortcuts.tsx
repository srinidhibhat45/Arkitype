"use client";

/**
 * ⌘Z / ⇧⌘Z for the whole workspace.
 *
 * Undo is recorded centrally in the store (see EditHistory), so it covers every
 * step, not just the Variables map — the shortcut belongs to the workspace
 * shell rather than to any one surface.
 *
 * Two things it deliberately keeps its hands off: a field the user is typing
 * in (the browser's own text undo is the right behaviour there, and stealing it
 * is maddening), and anything with its own dialog open, since the top-most
 * surface should own the keystroke. Renders nothing.
 */
import { useEffect } from "react";
import { useDesignSystem } from "@/store/useDesignSystem";

/** True while focus sits in something the user can type into. */
function isTextEntry(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable;
}

export function HistoryShortcuts() {
  const undo = useDesignSystem((s) => s.undo);
  const redo = useDesignSystem((s) => s.redo);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      if (isTextEntry(e.target)) return;
      e.preventDefault();
      // ⇧⌘Z is the Mac redo; ⌃Y is the Windows one. Both land here.
      if (key === "y" || e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return null;
}
