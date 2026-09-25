"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { heroSlides as fallbackSlides } from "@/data/site";
import type { Banner } from "@/lib/banners";
import { ArrowLeft, ArrowRight } from "lucide-react";

const AUTOPLAY_MS = 7000;

/**
 * One full-bleed banner, not a split layout. The whole panel is a link through
 * to a filtered product list; the arrows sit above it so they stay clickable.
 */
export function Hero({ banners = [] }: { banners?: Banner[] }) {
  const heroSlides = banners.length ? banners : fallbackSlides;
  const slideCount = heroSlides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = heroSlides[index];

  const go = useCallback(
    (next: number) => setIndex((next + slideCount) % slideCount),
    [slideCount],
  );

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => go(index + 1), AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [index, paused, go]);

  return (
    <section
      className="relative isolate h-[35vh] min-h-[13rem] w-full overflow-hidden sm:mx-[4vw] sm:mt-[2vh] sm:h-[50vh] sm:min-h-[17rem] sm:w-auto sm:rounded-[1.25rem] sm:border sm:border-line"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured collections"
    >
      {/* images cross-fade and settle out of a slow zoom */}
      {heroSlides.map((s, i) => (
        <div
          key={s.id}
          aria-hidden={i !== index}
          className="absolute inset-0 transition-opacity duration-[1200ms] ease-out-expo"
          style={{ opacity: i === index ? 1 : 0 }}
        >
          <Image
            src={s.image}
            alt=""
            fill
            // `priority` is deprecated in Next 16; the docs recommend eager
            // loading + fetchPriority when only one image is the LCP candidate.
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            sizes="100vw"
            className="object-cover saturate-[0.72] transition-transform duration-[7000ms] ease-out"
            style={{ transform: i === index ? "scale(1.06)" : "scale(1)" }}
          />
        </div>
      ))}

      {/* scrim keeps the type legible whatever the photograph does */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink/92 via-ink/65 to-accent-700/40" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/70 to-transparent" />

      {/* the banner itself is the link to the PLP */}
      <Link
        href={slide.cta.href}
        aria-label={`${slide.title} ${slide.accent} — ${slide.cta.label}`}
        className="absolute inset-0 z-10"
      />

      <div className="pointer-events-none relative z-20 flex h-full items-center pb-[5vh]">
        <div
          className={`shell sm:px-[3vw] ${slide.align === "center" ? "text-center" : "text-left"}`}
        >
          <div
            key={slide.id}
            className={`animate-rise max-w-[46ch] ${
              slide.align === "center" ? "mx-auto" : ""
            }`}
          >
            <p className="text-2xs font-semibold tracking-[0.24em] text-accent-300 uppercase">
              {slide.eyebrow}
            </p>

            <h1 className="mt-3 text-2xl font-normal text-cream text-balance sm:mt-4 sm:text-3xl lg:text-4xl">
              {slide.title}{" "}
              <em className="text-accent-300 not-italic">{slide.accent}</em>
            </h1>

            <p className="mt-3 hidden max-w-[44ch] text-sm text-cream/80 text-pretty sm:mt-4 sm:block">
              {slide.copy}
            </p>

            <div
              className={`mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-6 ${
                slide.align === "center" ? "justify-center" : ""
              }`}
            >
              {/* rendered as spans: the whole banner is already an anchor */}
              <span className="gradient-accent inline-flex items-center gap-3 px-6 py-3 text-2xs font-semibold tracking-[0.18em] text-cream uppercase sm:px-7">
                {slide.cta.label}
                <span aria-hidden><ArrowRight className="size-4" strokeWidth={1.5} aria-hidden /></span>
              </span>
              {slide.altCta && (
                <Link
                  href={slide.altCta.href}
                  className="link-sweep pointer-events-auto relative z-30 text-2xs font-semibold tracking-[0.18em] text-cream uppercase"
                >
                  {slide.altCta.label}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* controls sit above the banner link */}
      <div className="shell pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 pb-[3vh] sm:px-[3vw]">
        <div className="pointer-events-auto flex items-center">
          {heroSlides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className="grid place-items-center p-1.5"
            >
              {/* the dot stays small; the padding above carries the tap target */}
              <span
                className={`size-2 rounded-full transition-colors duration-500 ease-out-expo ${
                  i === index ? "bg-cream" : "bg-cream/40"
                }`}
              />
            </button>
          ))}
        </div>

        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="grid size-7 place-items-center rounded-full border border-cream/40 text-cream transition-colors duration-500 ease-out-expo hover:bg-cream hover:text-ink sm:size-8"
          ><ArrowLeft className="size-3.5" strokeWidth={1.5} aria-hidden /></button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="grid size-7 place-items-center rounded-full border border-cream/40 text-cream transition-colors duration-500 ease-out-expo hover:bg-cream hover:text-ink sm:size-8"
          ><ArrowRight className="size-3.5" strokeWidth={1.5} aria-hidden /></button>
        </div>
      </div>
    </section>
  );
}
