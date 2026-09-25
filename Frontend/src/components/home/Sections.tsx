"use client";

import Image from "next/image";
import Link from "next/link";
import { Carousel } from "@/components/ui/Carousel";
import { ProductArt } from "@/components/ui/ProductArt";
import { Reveal } from "@/components/ui/Reveal";
import { ProductCard } from "@/components/product/ProductCard";
import { budgetBands, makers, promoBand as fallbackPromo, recipients } from "@/data/site";
import { useTaxonomy } from "@/components/taxonomy/TaxonomyProvider";
import type { Product } from "@/lib/types";
import type { Banner } from "@/lib/banners";
import { useParallax } from "@/lib/useParallax";
import { Motif } from "@/components/ui/Motif";

export function SectionHead({
  eyebrow,
  title,
  copy,
  href,
  linkLabel = "View all",
  centered,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  href?: string;
  linkLabel?: string;
  centered?: boolean;
}) {
  if (centered) {
    return (
      <Reveal className="mb-6 flex flex-col items-center text-center sm:mb-10">
        <span className="eyebrow">{eyebrow}</span>
        <h2 className="mt-2 max-w-[22ch] text-2xl font-semibold text-balance sm:mt-3 sm:text-3xl">{title}</h2>
        {copy && <p className="mt-3 hidden max-w-[56ch] text-sm text-ink-soft text-pretty sm:block">{copy}</p>}
        <span className="mt-4 h-px w-[8vw] min-w-16 bg-accent-600 sm:mt-6" />
      </Reveal>
    );
  }
  return (
    <Reveal className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-8 sm:gap-4">
      <div>
        <span className="text-2xs font-bold tracking-[0.18em] text-accent-600 uppercase">
          {eyebrow}
        </span>
        <h2 className="mt-1.5 max-w-[20ch] text-2xl font-semibold tracking-[-0.02em] text-balance sm:mt-2 sm:text-3xl">
          {title}
        </h2>
        {copy && <p className="mt-3 hidden max-w-[52ch] text-sm text-ink-soft sm:block">{copy}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-2 rounded-xs border border-ink/15 px-4 py-2.5 text-xs font-bold transition hover:border-ink hover:gradient-accent hover:text-cream sm:px-5 sm:py-3"
        >
          {linkLabel}
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </Link>
      )}
    </Reveal>
  );
}


// Keeps the rail at two rows however many categories exist: 4 up to lg,
// 6 beyond. The rest stay behind the "All categories" link.
const twoRowsOnly = (i: number) => (i < 4 ? "" : "hidden lg:block");

export function CategoryRail() {
  const { categories } = useTaxonomy();
  return (
    <section className="shell py-[4.5vh] sm:py-[7vh]">
      <SectionHead
        eyebrow="Browse"
        title="Start with what kind of gift it is"
        copy="Six edits, each one curated by hand. Every category drills into subcategories on the next page."
        href="/products"
        linkLabel="All categories"
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {categories.slice(0, 6).map((c, i) => (
          <Reveal key={c.id} delay={i * 90} y={5} className={twoRowsOnly(i)}>
            <Link
              href={`/products?category=${c.slug}`}
              className="group relative flex h-full min-h-[23vh] flex-col justify-end overflow-hidden border border-line p-4 sm:min-h-[30vh] sm:p-6 lg:min-h-[34vh]"
            >
              {/* Categories added through the admin may have no artwork yet. */}
              {c.image ? (
                <Image
                  src={c.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 46vw, (max-width: 1024px) 46vw, 30vw"
                  className="object-cover saturate-[0.72] transition-transform duration-[1200ms] ease-out-expo group-hover:scale-105"
                />
              ) : (
                <span className="absolute inset-0 bg-gradient-to-br from-accent-700 to-ink" />
              )}
              <span className="absolute inset-0 bg-gradient-to-t from-ink/92 via-ink/60 to-accent-700/35 transition-opacity duration-700" />
              <span className="absolute top-3 right-3 text-cream/90 sm:top-5 sm:right-5">
                <Motif name={c.motif} className="size-5 sm:size-7" />
              </span>
              <h3 className="relative text-base font-semibold tracking-tight text-cream sm:text-xl">
                {c.name}
              </h3>
              <p className="relative mt-2 hidden max-w-[30ch] text-xs text-cream/75 sm:block">{c.blurb}</p>
              <span className="relative mt-3 inline-flex items-center gap-2 text-2xs font-semibold tracking-wider text-cream uppercase sm:mt-4">
                Explore
                <span className="transition-transform duration-500 ease-out-expo group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}


export function ProductRail({
  eyebrow,
  title,
  copy,
  href,
  items,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  href: string;
  items: Product[];
}) {
  return (
    <section className="shell py-[4.5vh] sm:py-[7vh]">
      <SectionHead eyebrow={eyebrow} title={title} copy={copy} href={href} />
      <Reveal delay={120} y={5}>
        <Carousel ariaLabel={title}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </Carousel>
      </Reveal>
    </section>
  );
}

export function PersonalisedBanner({ product }: { product: Product }) {
  return (
    <section className="shell py-[4.5vh] sm:py-[7vh]">
      <Reveal className="grid overflow-hidden rounded-xl border border-line bg-white lg:grid-cols-2">
        <div className="flex flex-col justify-center p-[5vw] lg:p-[3vw]">
          <span className="text-2xs font-bold tracking-[0.18em] text-accent-600 uppercase">
            Personalisation
          </span>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-balance sm:text-3xl lg:text-4xl">
            Put their name on it, free.
          </h2>
          <p className="mt-4 max-w-[46ch] text-sm text-ink-soft">
            Engraving, star maps plotted to a date, photo games printed from your camera roll. Add
            personalisation at checkout — it costs nothing and takes the gift somewhere else entirely.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {[ "Up to 40 characters engraved at no charge", "Proof sent to you before anything is cut", "Made to order, dispatched in 5 working days",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 text-sm">
                <span className="mt-[0.2em] grid size-5 shrink-0 place-items-center rounded-full bg-accent-100 text-accent-700">
                  <Motif name="check" className="size-3" strokeWidth={2.4} />
                </span>
                {t}
              </li>
            ))}
          </ul>
          <Link
            href="/products?personalised=1"
            className="mt-8 w-fit rounded-xs gradient-accent px-6 py-3.5 text-sm font-bold text-cream transition hover:brightness-110 sm:px-8 sm:py-4"
          >
            Shop personalised gifts
          </Link>
        </div>
        <Link href={`/products/${product.slug}`} className="group relative min-h-[28vh] sm:min-h-[40vh]">
          <ProductArt
            art={product.art}
            className="h-full w-full"
            motifClass="size-[12vh] transition-transform duration-700 ease-out-expo group-hover:scale-110 sm:size-[18vh]"/>
          <span className="absolute bottom-6 left-6 rounded-xs bg-white/95 px-5 py-3 text-xs font-bold">
            {product.name} →
          </span>
        </Link>
      </Reveal>
    </section>
  );
}


/** Full-bleed offer band, linking straight through to the filtered list. */
export function PromoBand({ banner }: { banner?: Banner }) {
  const promoBand = banner ?? fallbackPromo;
  const { ref, offset } = useParallax<HTMLElement>(0.16);
  return (
    <section
      ref={ref}
      className="relative isolate my-[6vh] h-[46vh] min-h-[17rem] w-full overflow-hidden sm:h-[62vh] sm:min-h-[22rem]"
    >
      {/* image drifts against the scroll, hence the oversized frame */}
      <div
        className="absolute inset-x-0 -top-[12%] h-[124%] will-change-transform"
        style={{ transform: `translate3d(0, ${offset}px, 0)` }}
      >
        <Image
          src={promoBand.image}
          alt=""
          fill
          sizes="100vw"
          className="object-cover saturate-[0.72]"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-ink/92 via-ink/68 to-accent-700/40" />
      <Link href={promoBand.cta.href} aria-label={promoBand.title} className="absolute inset-0 z-10" />
      <div className="pointer-events-none relative z-20 flex h-full items-center">
        <div className="shell">
          <Reveal y={5} className="max-w-[48ch]">
            <p className="text-2xs font-semibold tracking-[0.24em] text-accent-300 uppercase">
              {promoBand.eyebrow}
            </p>
            <h2 className="mt-4 text-2xl font-normal text-cream text-balance sm:mt-5 sm:text-3xl lg:text-4xl">
              {promoBand.title}
            </h2>
            <p className="mt-4 text-sm text-cream/80 text-pretty sm:mt-5 sm:text-base">{promoBand.copy}</p>
            <span className="gradient-accent mt-6 inline-flex items-center gap-3 px-6 py-3.5 text-2xs font-semibold tracking-[0.18em] text-cream uppercase sm:mt-8 sm:px-9 sm:py-4">
              {promoBand.cta.label}
              <span aria-hidden>→</span>
            </span>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** Recipient rail — a preset view of the list for each kind of person. */
export function ShopByRecipient() {
  return (
    <section className="shell py-[4.5vh] sm:py-[7vh]">
      <SectionHead
        centered
        eyebrow="Shop by recipient"
        title="Who is it for?"
        copy="Tell us the person and we will narrow two dozen gifts down to the handful that actually suit them."
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {recipients.map((r, i) => (
          <Reveal key={r.id} delay={i * 80} y={4}>
            <Link
              href={r.href}
              className="group relative flex h-[17vh] min-h-[8rem] items-end overflow-hidden border border-line p-4 sm:h-[26vh] sm:min-h-[11rem] sm:p-6"
            >
              <Image
                src={r.image}
                alt=""
                fill
                sizes="(max-width: 640px) 46vw, (max-width: 1024px) 46vw, 30vw"
                className="object-cover saturate-[0.72] transition-transform duration-[1200ms] ease-out-expo group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/92 via-ink/55 to-accent-700/30" />
              <span className="relative">
                <span className="font-display block text-lg text-cream sm:text-2xl">{r.label}</span>
                <span className="mt-1 block text-2xs tracking-[0.12em] text-cream/70 uppercase">
                  {r.note}
                </span>
              </span>
              <span className="relative ml-auto hidden text-cream transition-transform duration-500 ease-out-expo group-hover:translate-x-1 sm:block">
                →
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** Budget bands, typographic rather than photographic. */
export function ShopByBudget() {
  return (
    <section className="bg-cream-deep py-[4.5vh] sm:py-[7vh]">
      <div className="shell">
        <SectionHead
          centered
          eyebrow="Shop by budget"
          title="Pick a number, we will do the rest"
        />
        <div className="grid grid-cols-2 gap-px overflow-hidden border border-line bg-line lg:grid-cols-4">
          {budgetBands.map((b, i) => (
            <Reveal key={b.label} delay={i * 90} y={3}>
              <Link
                href={b.href}
                className="group flex h-full flex-col justify-between gap-6 bg-cream p-5 transition-colors duration-500 ease-out-expo hover:bg-accent-50 sm:gap-8 sm:p-7"
              >
                <span className="font-display text-lg sm:text-2xl">{b.label}</span>
                <span className="flex items-center justify-between gap-4">
                  <span className="text-2xs tracking-[0.12em] text-ink-faint uppercase">
                    {b.note}
                  </span>
                  <span className="text-accent-600 transition-transform duration-500 ease-out-expo group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Makers marquee — scrolls continuously, pauses on hover. */
export function MakersStrip() {
  const strip = [...makers, ...makers];
  return (
    <section className="gradient-ink overflow-hidden py-[3.5vh] sm:py-[5vh] text-cream">
      <p className="shell mb-6 text-center text-2xs font-semibold tracking-[0.24em] text-accent-300 uppercase">
        The workshops behind the boxes
      </p>
      <div className="group relative flex overflow-hidden">
        <div className="animate-marquee flex w-max gap-14 group-hover:[animation-play-state:paused]">
          {strip.map((m, i) => (
            <span
              key={`${m.name}-${i}`}
              className="flex shrink-0 items-baseline gap-3 whitespace-nowrap"
            >
              <span className="font-display text-xl">{m.name}</span>
              <span className="text-2xs tracking-[0.18em] text-cream/50 uppercase">{m.craft}</span>
              <span className="text-2xs text-accent-300">{m.note}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

