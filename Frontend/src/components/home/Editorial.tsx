"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Motif } from "@/components/ui/Motif";
import { Reveal } from "@/components/ui/Reveal";
import { Stars } from "@/components/ui/Stars";
import { journalPosts, testimonials, uspStrip } from "@/data/site";
import { useTaxonomy } from "@/components/taxonomy/TaxonomyProvider";

/** Promises as one continuous line, divided by rules rather than boxed. */
export function UspLine() {
  // Doubled so the -50% translate loops seamlessly. Spacing sits on the item
  // rather than a flex gap, which would leave the two halves unequal.
  const strip = [...uspStrip, ...uspStrip];
  return (
    <section className="group border-y border-line">
      <div className="flex overflow-hidden">
        <div className="animate-marquee flex w-max group-hover:[animation-play-state:paused]">
          {strip.map((u, i) => (
            <span
              key={`${u.title}-${i}`}
              aria-hidden={i >= uspStrip.length}
              className="flex shrink-0 items-center gap-3 border-r border-line px-8 py-5 whitespace-nowrap"
            >
              <Motif name={u.motif} className="size-5 shrink-0 text-accent-600" />
              <span className="text-xs font-semibold tracking-tight">{u.title}</span>
              <span className="text-2xs text-ink-faint">{u.copy}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Occasions as a reading index rather than a grid of tiles: numbered rows
 * separated by hairlines, with the artwork following the cursor on pointer
 * devices so the section stays a single continuous flow.
 */
const FALLBACK_OCCASION_IMAGE =
  "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=72";

export function OccasionIndex() {
  const { occasions } = useTaxonomy();
  const [active, setActive] = useState<number | null>(null);
  const [point, setPoint] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (active === null) return;
    const onMove = (e: PointerEvent) => setPoint({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [active]);

  return (
    <section className="gradient-ink py-[5.5vh] sm:py-[9vh] text-cream">
      <div className="shell">
        <Reveal className="flex flex-wrap items-end justify-between gap-4 pb-8">
          <div>
            <span className="text-2xs font-semibold tracking-[0.24em] text-accent-300 uppercase">
              Occasions
            </span>
            <h2 className="mt-4 max-w-[16ch] text-4xl font-normal text-balance">
              Tell us the occasion, we will do the thinking.
            </h2>
          </div>
          <Link
            href="/products"
            className="link-sweep text-2xs font-semibold tracking-[0.18em] text-cream uppercase"
          >
            Browse everything
          </Link>
        </Reveal>

        <ul onPointerLeave={() => setActive(null)}>
          {occasions.map((o, i) => (
            <Reveal as="li" key={o.id} delay={i * 45} y={2}>
              <Link
                href={`/products?occasion=${o.slug}`}
                onPointerEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="group flex items-baseline gap-3 border-t border-cream/15 py-6 transition-colors duration-500 ease-out-expo hover:text-accent-300 sm:gap-6 lg:gap-10"
              >
                <span className="font-display w-6 shrink-0 text-sm text-cream/35 transition-colors duration-500 group-hover:text-accent-300 sm:w-8">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-display min-w-0 flex-1 text-xl transition-transform duration-500 ease-out-expo group-hover:translate-x-2 sm:text-3xl lg:text-4xl">
                  {o.name}
                </span>
                <span className="ml-auto hidden max-w-[34ch] text-right text-xs text-cream/50 md:block">
                  {o.note}
                </span>
                <span className="shrink-0 text-right text-2xs tracking-[0.14em] whitespace-nowrap text-cream/40 uppercase sm:w-24">
                  {o.window}
                </span>
                <Motif
                  name={o.motif}
                  className="hidden size-5 shrink-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 sm:block"
                />
              </Link>
            </Reveal>
          ))}
          <li className="border-t border-cream/15" />
        </ul>
      </div>

      {/* cursor-following preview, pointer devices only */}
      {active !== null && (
        <div
          className="pointer-events-none fixed z-40 hidden lg:block"
          style={{ left: point.x, top: point.y, transform: "translate(-50%, -50%)" }}
          aria-hidden
        >
          <div className="relative h-[26vh] w-[18vw] overflow-hidden shadow-lift">
            <Image
              src={occasions[active]?.image || FALLBACK_OCCASION_IMAGE}
              alt=""
              fill
              sizes="18vw"
              className="animate-fade object-cover saturate-[0.72]"
            />
            <span className="absolute inset-0 bg-ink/25" />
          </div>
        </div>
      )}
    </section>
  );
}

/** A single rotating pull-quote instead of a row of review cards. */
export function VoiceQuote() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % testimonials.length),
      7000,
    );
    return () => window.clearInterval(id);
  }, []);

  const t = testimonials[index];

  return (
    <section className="py-[6vh] sm:py-[10vh]">
      <div className="shell-tight text-center">
        <Reveal>
          <Stars rating={t.rating} className="justify-center text-lg" />
        </Reveal>
        <Reveal delay={90}>
          <blockquote
            key={t.id}
            className="animate-fade font-display mt-8 text-3xl leading-[1.25] text-balance sm:text-4xl"
          >
            “{t.quote}”
          </blockquote>
          <p className="animate-fade mt-8 text-2xs tracking-[0.2em] text-ink-faint uppercase">
            {t.name} — {t.detail}
          </p>
        </Reveal>

        <div className="mt-10 flex justify-center gap-3">
          {testimonials.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Read review ${i + 1}`}
              aria-current={i === index}
              className={`h-px w-10 transition-colors duration-500 ease-out-expo ${
                i === index ? "bg-accent-600" : "bg-line hover:bg-ink-faint"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/** A statement set as one flowing paragraph, full width, no container. */
export function StatementBand() {
  const line = "We buy from twenty-six workshops, pack every box by hand in Bengaluru, and write the note ourselves. Nothing here is drop-shipped, and nothing arrives looking like it was bought in a hurry.";
  return (
    <section className="py-[6vh] sm:py-[10vh]">
      <div className="shell">
        <Reveal y={3}>
          <p className="font-display max-w-[54ch] text-xl leading-[1.5] text-pretty sm:text-2xl">
            <span className="text-accent-600">Gifting, but thoughtful.</span>{" "}
            <span className="text-ink-soft">{line}</span>
          </p>
        </Reveal>
        <Reveal delay={120} y={3}>
          <Link
            href="/products"
            className="link-sweep mt-10 inline-block text-2xs font-semibold tracking-[0.18em] uppercase"
          >
            See how we pack them
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/** Journal as a reading list: hairline rows, thumbnail on hover. */
export function JournalList() {
  return (
    <section className="shell py-[5.5vh] sm:py-[9vh]">
      <Reveal className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div>
          <span className="eyebrow">Journal</span>
          <h2 className="mt-4 max-w-[18ch] text-3xl font-normal text-balance">
            Notes on giving things well
          </h2>
        </div>
        <Link
          href="/products"
          className="link-sweep text-2xs font-semibold tracking-[0.18em] uppercase"
        >
          Read the journal
        </Link>
      </Reveal>

      <ul>
        {journalPosts.map((p, i) => (
          <Reveal as="li" key={p.id} delay={i * 70} y={2}>
            <Link
              href="/products"
              className="group flex items-center gap-6 border-t border-line py-7 sm:gap-10"
            >
              <span className="font-display w-8 shrink-0 text-sm text-ink-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="relative size-0 shrink-0 overflow-hidden transition-all duration-700 ease-out-expo group-hover:size-20">
                <Image
                  src={p.image}
                  alt=""
                  fill
                  sizes="5rem"
                  className="object-cover saturate-[0.72]"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-display block text-xl transition-transform duration-500 ease-out-expo group-hover:translate-x-2 sm:text-2xl">
                  {p.title}
                </span>
                <span className="mt-1 block max-w-[62ch] text-xs text-ink-soft">{p.excerpt}</span>
              </span>
              <span className="shrink-0 text-2xs tracking-[0.14em] text-ink-faint uppercase">
                {p.readTime}
              </span>
            </Link>
          </Reveal>
        ))}
        <li className="border-t border-line" />
      </ul>
    </section>
  );
}
