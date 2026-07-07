"use client";

/**
 * Hover-link between the inspector and the live preview. Hovering a parameter
 * cluster names a schema `part` (e.g. "container", "label"); this hook finds the
 * DOM node tagged `data-ark-part="<part>"` inside the preview and measures its
 * box relative to the preview container, so the studio can draw a highlight ring
 * over exactly that region. Parts a component hasn't tagged simply measure to
 * `null` and no ring is drawn — the feature degrades gracefully.
 */
import { RefObject, useLayoutEffect, useState } from "react";

export type PartBox = {
  top: number;
  left: number;
  width: number;
  height: number;
} | null;

export function usePartBox(
  containerRef: RefObject<HTMLElement>,
  part: string | null
): PartBox {
  const [box, setBox] = useState<PartBox>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || !part) {
      setBox(null);
      return;
    }

    const measure = () => {
      // `~=` matches one word in a space-separated list, so a single element can
      // stand in for several parts (e.g. an input is both container and text).
      const el = container.querySelector<HTMLElement>(
        `[data-ark-part~="${part}"]`
      );
      if (!el) {
        setBox(null);
        return;
      }
      const c = container.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setBox({
        top: r.top - c.top,
        left: r.left - c.left,
        width: r.width,
        height: r.height,
      });
    };

    // Measure after layout settles, then keep in sync with size changes.
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [containerRef, part]);

  return box;
}
