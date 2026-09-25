import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActiveChips, Filters, MobileFilters, SortSelect } from "@/components/plp/Filters";
import { ProductCard } from "@/components/product/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { parseCatalogQuery } from "@/lib/catalog";
import { catalogServer } from "@/lib/api";
import { loadTaxonomy } from "@/lib/taxonomy-api";
import { loadBanners } from "@/lib/banners";
import { PlpBanner } from "@/components/plp/PlpBanner";
import {
  catalogQueryToApiParams,
  mapApiProductToProduct,
  sortCatalogProducts,
  type ApiProductListResult,
} from "@/lib/product-catalog";
import type { Product } from "@/lib/types";
import { Motif } from "@/components/ui/Motif";

export const metadata: Metadata = {
  title: "Shop all gifts",
  description: "Filter by category, subcategory, occasion and price.",
};

async function loadCatalogProducts(
  query: ReturnType<typeof parseCatalogQuery>,
): Promise<{ results: Product[]; error: string | null }> {
  try {
    // Every facet is resolved server-side now, including slug lookups.
    const prodRes = await catalogServer.products<ApiProductListResult>(
      catalogQueryToApiParams(query),
    );
    const items = (prodRes.data?.items ?? []).map(mapApiProductToProduct);
    return { results: sortCatalogProducts(items, query.sort), error: null };
  } catch (err) {
    return {
      results: [],
      error: err instanceof Error ? err.message : "Could not load products",
    };
  }
}

export default async function ProductListPage(props: PageProps<"/products">) {
  const sp = await props.searchParams;
  const query = parseCatalogQuery(sp);
  const [{ results, error }, taxonomy, plpBanners] = await Promise.all([
    loadCatalogProducts(query),
    loadTaxonomy(),
    loadBanners("PLP_TOP"),
  ]);

  const { occasions } = taxonomy;
  const category = taxonomy.categories.find((c) => c.slug === query.category);
  const occasion = occasions.find((o) => o.slug === query.occasion);
  const subcategory = taxonomy.subcategories.find((s) => s.slug === query.subcategory);

  const heading = subcategory?.name ?? category?.name ?? occasion?.name ?? "Every gift we make";
  const blurb =
    category?.blurb ??
    (occasion
      ? `Gifts chosen for ${occasion.name.toLowerCase()} — ${occasion.window.toLowerCase()}.`
      : undefined) ??
    "Curated gifts from our catalog — filter by category, price and more.";

  return (
    <>
      {/* PLP hero */}
      <section className="gradient-surface border-b border-line">
        <div className="shell py-[4vh] sm:py-[6vh]">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-2xs text-ink-faint">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <span aria-hidden>/</span>
            <Link href="/products" className="hover:text-ink">
              Shop
            </Link>
            {category && (
              <>
                <span aria-hidden>/</span>
                <Link href={`/products?category=${category.slug}`} className="hover:text-ink">
                  {category.name}
                </Link>
              </>
            )}
            {subcategory && (
              <>
                <span aria-hidden>/</span>
                <span className="text-ink">{subcategory.name}</span>
              </>
            )}
          </nav>

          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl lg:text-5xl">
            {heading}
          </h1>
          <p className="mt-3 max-w-[56ch] text-sm text-ink-soft text-pretty sm:text-base">{blurb}</p>

          {/* occasion quick rail */}
          <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1 sm:mt-7">
            {occasions.map((o) => {
              const active = query.occasion === o.slug;
              return (
                <Link
                  key={o.id}
                  href={active ? "/products" : `/products?occasion=${o.slug}`}
                  className={`flex shrink-0 items-center gap-2 rounded-xs border px-4 py-2.5 text-xs font-semibold transition sm:px-5 sm:py-3 ${
                    active
                      ? "border-transparent bg-ink text-cream"
                      : "border-ink/12 bg-white/80 backdrop-blur hover:border-ink/40"
                  }`}
                >
                  <Motif name={o.motif} className="size-4" />
                  {o.name}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <div className="shell grid gap-8 py-[5vh] lg:grid-cols-[18vw_1fr] lg:items-start">
        <aside className="sticky top-[12vh] hidden max-h-[80vh] overflow-y-auto pr-2 lg:block">
          <Suspense fallback={null}>
            <Filters />
          </Suspense>
        </aside>

        <section className="min-w-0">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft">
              <span className="font-bold text-ink">{results.length}</span>{" "}
              {results.length === 1 ? "gift" : "gifts"}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Suspense fallback={null}>
                <MobileFilters resultCount={results.length} />
              </Suspense>
              <Suspense fallback={null}>
                <SortSelect />
              </Suspense>
            </div>
          </div>

          {plpBanners[0] && <PlpBanner banner={plpBanners[0]} />}

          <div className="mb-6">
            <Suspense fallback={null}>
              <ActiveChips />
            </Suspense>
          </div>

          {error ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line bg-white py-[10vh] text-center">
              <p className="text-xl font-bold">Could not load products</p>
              <p className="max-w-[44ch] text-sm text-ink-soft">{error}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-line bg-white py-[10vh] text-center">
              <Motif name="search" className="size-14 text-ink-faint" strokeWidth={1.2} />
              <p className="text-xl font-bold">Nothing matches that combination</p>
              <p className="max-w-[44ch] text-sm text-ink-soft">
                Try removing a filter, or browse everything and narrow down from there.
              </p>
              <Link
                href="/products"
                className="rounded-xs gradient-accent px-6 py-3 text-sm font-bold text-cream"
              >
                Reset filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
              {results.map((p, i) => (
                <Reveal key={p.id} delay={Math.min(i, 8) * 50}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
