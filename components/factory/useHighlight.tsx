"use client";

/**
 * Hover-link between the inspector and the live preview. Hovering a parameter
 * cluster names a schema `part` (e.g. "container", "label"); `usePartBox` finds
 * the DOM node tagged `data-ark-part="<part>"` inside the active preview card
 * and measures its visual box relative to the (untransformed) section frame.
 * `PartHighlight` then draws a ring + label chip in a frame-level overlay.
 *
 * Measurement runs on a requestAnimationFrame follow-loop while a part is
 * hovered: the box is re-read every frame from getBoundingClientRect, so it
 * stays glued to the element through zoom changes, the active card's scale
 * transform, token edits that resize the component mid-hover, scrolling and
 * transitions. State only updates when the numbers actually move, so the loop
 * doesn't re-render per frame. Parts a component hasn't tagged measure to
 * `null` and no ring is drawn — the feature degrades gracefully.
 */
import { RefObject, useLayoutEffect, useState } from "react";

export type PartBox = {
  top: number;
  left: number;
  width: number;
  height: number;
  /** Effective visual border-radius of the part (post-transform px). */
  radius: number;
} | null;

const RING = "#0d99ff";

export function usePartBox(
  /** Untransformed frame the overlay is positioned in (the section wrapper). */
  frameRef: RefObject<HTMLElement>,
  /** Scope to search for the part — the active preview card. */
  scopeRef: RefObject<HTMLElement>,
  part: string | null
): PartBox {
  const [box, setBox] = useState<PartBox>(null);

  useLayoutEffect(() => {
    if (!part) {
      setBox(null);
      return;
    }

    let raf = 0;
    const tick = () => {
      const frame = frameRef.current;
      // `~=` matches one word in a space-separated list, so a single element
      // can stand in for several parts (e.g. an input is both container and text).
      const el = scopeRef.current?.querySelector<HTMLElement>(
        `[data-ark-part~="${part}"]`
      );
      if (!frame || !el) {
        setBox(null);
      } else {
        const f = frame.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        // offsetWidth ignores transforms, so visual ÷ layout = accumulated scale;
        // the ring's corner radius must grow by the same factor to hug the shape.
        const scale = el.offsetWidth ? r.width / el.offsetWidth : 1;
        const computedRadius = getComputedStyle(el).borderRadius;
        const radius = computedRadius.includes("%")
          ? Math.min(r.width, r.height) / 2
          : (parseFloat(computedRadius) || 0) * scale;
        const next = {
          top: r.top - f.top,
          left: r.left - f.left,
          width: r.width,
          height: r.height,
          radius,
        };
        setBox((prev) =>
          prev &&
          Math.abs(prev.top - next.top) < 0.5 &&
          Math.abs(prev.left - next.left) < 0.5 &&
          Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.height - next.height) < 0.5
            ? prev
            : next
        );
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frameRef, scopeRef, part]);

  return box;
}

/**
 * Frame-level highlight overlay: a ring around the measured part plus a label
 * chip with the part name and its live pixel size. Rendered as a sibling of the
 * preview content (never inside a transformed card), so `PartBox` coordinates
 * map 1:1 onto pixels with no compensation math.
 */
export function PartHighlight({
  box,
  label,
}: {
  box: PartBox;
  label: string;
}) {
  if (!box) return null;

  const PAD = 4;
  // The chip sits above the ring unless that would leave the frame.
  const chipAbove = box.top - PAD >= 26;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <div
        className="absolute"
        style={{
          top: box.top - PAD,
          left: box.left - PAD,
          width: box.width + PAD * 2,
          height: box.height + PAD * 2,
          borderRadius: Math.max(6, box.radius + PAD),
          boxShadow: `0 0 0 1.5px ${RING}, 0 4px 16px ${RING}2e`,
          background: `${RING}0f`,
          animation: "ark-ring-in 120ms ease-out",
        }}
      />
      <span
        className="absolute flex items-baseline gap-1 whitespace-nowrap rounded px-1.5 py-[3px] text-[9.5px] font-semibold leading-none text-white shadow-sm"
        style={{
          top: chipAbove ? box.top - PAD - 5 : box.top + PAD + 2,
          left: Math.max(4, box.left - PAD),
          transform: chipAbove ? "translateY(-100%)" : undefined,
          background: RING,
          animation: "ark-ring-in 120ms ease-out",
        }}
      >
        {label}
        <span className="font-mono text-[8.5px] font-medium opacity-75">
          {Math.round(box.width)}×{Math.round(box.height)}
        </span>
      </span>
    </div>
  );
}
