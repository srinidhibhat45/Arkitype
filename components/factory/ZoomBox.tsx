"use client";

/**
 * Layout-aware zoom container. A bare `transform: scale()` only changes how an
 * element PAINTS — its layout box keeps the unscaled size, so zoomed previews
 * bled over sibling cards and captions while their containers stayed put.
 * ZoomBox measures its unscaled content (offsetWidth/Height ignore transforms)
 * and sizes itself to content × scale, so the scaled child occupies real
 * layout space: parent cards grow with it, flex rows re-wrap, nothing overlaps.
 *
 * `fill` mode is for full-bleed surfaces (the product preview): instead of
 * shrink-wrapping, the inner element spans 100/scale% of the container width
 * and only the height is compensated.
 */
import { ReactNode, useLayoutEffect, useRef, useState } from "react";

export function ZoomBox({
  scale,
  fill = false,
  className,
  children,
}: {
  scale: number;
  fill?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () =>
      setSize((prev) => {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        return prev && prev.w === w && prev.h === h ? prev : { w, h };
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className={className}
      style={{
        width: !fill && size ? size.w * scale : undefined,
        height: size ? size.h * scale : undefined,
      }}
    >
      <div
        ref={innerRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: fill ? `${100 / scale}%` : "fit-content",
        }}
      >
        {children}
      </div>
    </div>
  );
}
