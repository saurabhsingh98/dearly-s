"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Scroll-snap carousel: native momentum on touch, arrow + progress controls on
 * pointer devices. Item widths are viewport-relative so the number of visible
 * cards adapts continuously instead of at fixed breakpoints.
 */
export function Carousel({
  children,
  itemClass = "w-[42vw] sm:w-[36vw] lg:w-[27vw] xl:w-[21vw]",
  className = "",
  ariaLabel,
}: {
  children: React.ReactNode[];
  itemClass?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 0);
    setAtStart(el.scrollLeft < 8);
    setAtEnd(max - el.scrollLeft < 8);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    const onResize = () => sync();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [sync]);

  const nudge = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={trackRef}
        onScroll={sync}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
      >
        {children.map((child, i) => (
          <div key={i} className={`${itemClass} shrink-0 snap-start`}>
            {child}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="h-[0.3vh] min-h-[2px] flex-1 overflow-hidden bg-line">
          <div
            className="h-full bg-accent-600 transition-[width] duration-500 ease-out-expo"
            style={{ width: `${Math.max(progress * 100, 8)}%` }}
          />
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            onClick={() => nudge(-1)}
            disabled={atStart}
            aria-label="Previous"
            className="grid size-11 place-items-center border border-ink/25 text-sm transition-colors duration-500 ease-out-expo hover:border-ink hover:bg-ink hover:text-cream disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-ink"
          ><ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden /></button>
          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={atEnd}
            aria-label="Next"
            className="grid size-11 place-items-center border border-ink/25 text-sm transition-colors duration-500 ease-out-expo hover:border-ink hover:bg-ink hover:text-cream disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-ink"
          ><ArrowRight className="size-4" strokeWidth={1.5} aria-hidden /></button>
        </div>
      </div>
    </div>
  );
}
