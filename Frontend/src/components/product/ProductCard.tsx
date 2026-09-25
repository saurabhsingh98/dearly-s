"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ProductArt } from "@/components/ui/ProductArt";
import { Stars } from "@/components/ui/Stars";
import { useCart } from "@/lib/cart";
import { discountPercent, formatMoney } from "@/lib/money";
import { useTaxonomy } from "@/components/taxonomy/TaxonomyProvider";
import type { Product } from "@/lib/types";
import { Motif } from "@/components/ui/Motif";
import { Heart } from "lucide-react";

export function ProductCard({ product }: { product: Product }) {
  const { occasionById } = useTaxonomy();
  const { add } = useCart();
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);
  const off = discountPercent(product.price, product.compareAt);
  const firstOccasion = occasionById.get(product.occasionIds[0]);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white transition-all duration-500 ease-out-expo hover:-translate-y-[0.8vh] hover:border-accent-300 hover:shadow-lift">
      <Link href={`/products/${product.slug}`} className="relative block">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            width={600}
            height={750}
            className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-105"
          />
        ) : (
          <ProductArt
            art={product.art}
            className="aspect-[4/5] w-full"
            motifClass="size-[7vh] sm:size-[9vh] transition-transform duration-700 ease-out-expo group-hover:scale-110"
          />
        )}

        <div className="absolute top-0 left-0 flex w-full items-start justify-between p-2 sm:p-3">
          <div className="flex flex-col gap-1">
            {product.badge && (
              <span className="rounded-xs bg-white/95 px-2 py-0.5 text-2xs font-bold tracking-wider text-ink uppercase sm:px-3 sm:py-1">
                {product.badge}
              </span>
            )}
            {off > 0 && (
              <span className="w-fit rounded-xs bg-ink px-2 py-0.5 text-2xs font-bold text-white sm:px-3 sm:py-1">
                −{off}%
              </span>
            )}
          </div>
        </div>

        {/* low-stock chip sits bottom-left: top-right belongs to the wishlist */}
        {product.stock < 20 && (
          <span className="absolute bottom-2 left-2 rounded-xs bg-accent-600/95 px-2 py-0.5 text-2xs font-semibold text-white sm:bottom-3 sm:left-3 sm:px-3 sm:py-1">
            {product.stock} left
          </span>
        )}

        {/* hover-only, so it is pointless on touch and would cover half a 2-up card */}
        <div className="absolute inset-x-0 bottom-0 hidden translate-y-full sm:block bg-gradient-to-t from-black/75 to-transparent p-4 pt-8 opacity-0 transition-all duration-500 ease-out-expo group-hover:translate-y-0 group-hover:opacity-100">
          <p className="text-xs leading-snug text-white/95">{product.tagline}</p>
        </div>
      </Link>

      <button
        type="button"
        aria-pressed={saved}
        aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        onClick={(e) => {
          e.preventDefault();
          setSaved((v) => !v);
        }}
        className="absolute top-2 right-2 z-10 grid size-8 place-items-center rounded-full bg-cream/85 sm:top-3 sm:right-3 sm:size-9 text-sm backdrop-blur transition-colors duration-500 ease-out-expo hover:bg-cream"
      >
        <Heart
          strokeWidth={1.5}
          className={`size-4 ${saved ? "fill-accent-600 text-accent-600" : "fill-none text-ink-faint"}`}
        />
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs font-semibold tracking-wide text-ink-faint uppercase">
          {firstOccasion && (
            <span className="inline-flex items-center gap-1.5">
              <Motif name={firstOccasion.motif} className="size-3.5" />
              {firstOccasion.name}
            </span>
          )}
          {product.personalisable && <span className="text-accent-600">· Personalised</span>}
        </div>

        <h3 className="text-sm leading-tight font-semibold tracking-tight sm:text-base">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h3>

        <div className="flex items-center gap-2 text-2xs text-ink-faint">
          <Stars rating={product.rating} className="text-xs" />
          <span>
            {product.rating} · {product.reviewCount}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight sm:text-lg">{formatMoney(product.price)}</span>
            {product.compareAt && (
              <span className="text-2xs text-ink-faint line-through">
                {formatMoney(product.compareAt)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              add(product.id, 1, product.variants?.[0]?.id, { product });
              setAdding(true);
              window.setTimeout(() => setAdding(false), 900);
            }}
            className="relative z-10 shrink-0 rounded-xs bg-ink px-3 py-2 text-2xs font-bold sm:px-4 tracking-wide text-cream uppercase transition-all duration-300 hover:bg-accent-600 active:scale-95"
          >
            {adding ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </article>
  );
}
