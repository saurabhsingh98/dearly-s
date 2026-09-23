"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ProductCustomizationForm } from "@/components/product/ProductCustomizationForm";
import { ProductArt } from "@/components/ui/ProductArt";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Stars } from "@/components/ui/Stars";
import { useTaxonomy } from "@/components/taxonomy/TaxonomyProvider";
import { useCart } from "@/lib/cart";
import { discountPercent, formatMoney } from "@/lib/money";
import {
  buildCustomizationPayload,
  emptyCustomizationValues,
  validateCustomizationInput,
  type CustomizationImagePublicIds,
  type CustomizationValues,
} from "@/lib/product-customization";
import type { CartLine, Product } from "@/lib/types";
import { variantDetailRows } from "@/lib/variant-details";
import { Motif } from "@/components/ui/Motif";

const tabs = ["Description", "What's inside", "Specs", "Delivery"] as const;

export function ProductDetail({ product }: { product: Product }) {
  const { categoryById, subcategoryById, occasionById } = useTaxonomy();
  const router = useRouter();
  const { add } = useCart();
  const [variantId, setVariantId] = useState(product.variants?.[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<(typeof tabs)[number]>("Description");
  const [added, setAdded] = useState(false);
  const [view, setView] = useState(0);

  const customizationFields = useMemo(
    () => product.customizationFields ?? [],
    [product.customizationFields],
  );
  const isPersonalizedProduct = customizationFields.length > 0;
  const [customizationValues, setCustomizationValues] = useState<CustomizationValues>(() =>
    emptyCustomizationValues(customizationFields),
  );
  const [customizationImageIds, setCustomizationImageIds] = useState<CustomizationImagePublicIds>(
    {},
  );
  const [customizationUploading, setCustomizationUploading] = useState(false);
  const [customizationError, setCustomizationError] = useState<string | null>(null);

  useEffect(() => {
    setCustomizationValues(emptyCustomizationValues(customizationFields));
    setCustomizationImageIds({});
    setCustomizationUploading(false);
    setCustomizationError(null);
  }, [product.id, customizationFields]);

  const handleCustomizationImageChange = (
    fieldName: string,
    url: string,
    publicId: string | null,
  ) => {
    setCustomizationValues((prev) => ({ ...prev, [fieldName]: url }));
    setCustomizationImageIds((prev) => {
      const next = { ...prev };
      if (publicId) next[fieldName] = publicId;
      else delete next[fieldName];
      return next;
    });
  };

  const resolveCustomization = (): CartLine["customization"] | false | undefined => {
    if (!customizationFields.length) return undefined;
    if (customizationUploading) {
      setCustomizationError("Wait for your image upload to finish");
      return false;
    }
    const err = validateCustomizationInput(
      customizationFields,
      customizationValues,
      customizationImageIds,
    );
    if (err) {
      setCustomizationError(err);
      return false;
    }
    setCustomizationError(null);
    return buildCustomizationPayload(
      customizationFields,
      customizationValues,
      customizationImageIds,
    );
  };

  const handleAdd = () => {
    const customization = resolveCustomization();
    if (customization === false) return;
    add(product.id, quantity, variantId, { product, customization });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1200);
  };

  const handleBuyNow = () => {
    const customization = resolveCustomization();
    if (customization === false) return;
    add(product.id, quantity, variantId, { openDrawer: false, product, customization });
    router.push("/checkout");
  };

  const variant = product.variants?.find((v) => v.id === variantId);
  const unitPrice = product.price + (variant?.priceDelta ?? 0);
  const availableStock = variant?.stock ?? product.stock;
  const off = discountPercent(product.price, product.compareAt);
  const category = categoryById.get(product.categoryId);
  const subcategory = subcategoryById.get(product.subcategoryId);

  // Gallery views are generated from the art tokens, giving each product a
  // consistent multi-angle set without any binary assets.
  const views = [
    product.art,
    { ...product.art, pattern: "rings" as const },
    { ...product.art, from: product.art.to, to: product.art.from, pattern: "waves" as const },
    { ...product.art, motif: "ribbon", pattern: "confetti" as const },
  ];

  const photos = product.images ?? [];
  const slideCount = photos.length || views.length;
  const active = Math.min(view, slideCount - 1);

  return (
    <>
      <div className="shell grid gap-[4vh] py-[4vh] lg:grid-cols-[1.05fr_0.95fr] lg:gap-[3vw]">
        {/* gallery */}
        <div className="lg:sticky lg:top-[12vh] lg:self-start">
          <div className="relative overflow-hidden rounded-xl border border-line">
            {photos.length ? (
              <Image
                src={photos[active]}
                alt={product.name}
                width={1200}
                height={1200}
                priority
                sizes="(max-width: 1024px) 100vw, 52vw"
                className="aspect-square w-full object-cover transition-all duration-500"
              />
            ) : (
              <ProductArt
                art={views[active]}
                className="aspect-square w-full transition-all duration-500"
                motifClass="size-[20vh]"
              />
            )}
            {off > 0 && (
              <span className="absolute top-5 left-5 rounded-xs bg-ink px-4 py-2 text-2xs font-bold text-white">
                −{off}% today
              </span>
            )}
            {product.badge && (
              <span className="absolute top-5 right-5 rounded-xs bg-white/95 px-4 py-2 text-2xs font-bold tracking-wider uppercase">
                {product.badge}
              </span>
            )}
          </div>

          {/* A single photo needs no picker. */}
          {slideCount > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {(photos.length ? photos : views).map((v, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setView(i)}
                  aria-label={`View ${i + 1}`}
                  aria-current={active === i}
                  className={`overflow-hidden rounded-md border-2 transition ${
                    active === i ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  {photos.length ? (
                    <Image
                      src={v as string}
                      alt=""
                      width={240}
                      height={240}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <ProductArt
                      art={v as (typeof views)[number]}
                      className="aspect-square w-full"
                      motifClass="size-[5vh]"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* buy box */}
        <div>
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-2xs text-ink-faint">
            <Link href="/products" className="hover:text-ink">Shop</Link>
            <span aria-hidden>/</span>
            <Link href={`/products?category=${category?.slug}`} className="hover:text-ink">
              {category?.name}
            </Link>
            <span aria-hidden>/</span>
            <span className="text-ink">{subcategory?.name}</span>
          </nav>

          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-balance">
            {product.name}
          </h1>
          <p className="mt-2 text-lg text-ink-soft">{product.tagline}</p>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2">
              <Stars rating={product.rating} className="text-base" />
              <span className="text-xs font-semibold">{product.rating}</span>
              <span className="text-xs text-ink-faint">({product.reviewCount} reviews)</span>
            </span>
            <span className="text-xs text-accent-700">
              {product.stock > 20 ? "In stock" : `Only ${product.stock} left`}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-3">
            <span className="text-4xl font-semibold tracking-tight">{formatMoney(unitPrice)}</span>
            {product.compareAt && (
              <span className="text-lg text-ink-faint line-through">
                {formatMoney(product.compareAt)}
              </span>
            )}
            <span className="pb-1 text-2xs text-ink-faint">incl. all taxes</span>
          </div>

          {/* variants */}
          {product.variants && (
            <fieldset className="mt-8">
              <legend className="text-2xs font-bold tracking-[0.15em] uppercase">
                Choose an option
              </legend>
              <div className="mt-3 flex flex-wrap gap-3">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    aria-pressed={variantId === v.id}
                    className={`flex items-center gap-3 rounded-xs border px-5 py-3 text-sm font-semibold transition ${
                      variantId === v.id
                        ? "border-ink bg-ink text-cream"
                        : "border-ink/15 bg-white hover:border-ink/40"
                    }`}
                  >
                    {v.swatch && (
                      <span
                        className="size-4 rounded-full border border-white/40"
                        style={{ background: v.swatch }}
                      />
                    )}
                    {v.label}
                    {v.priceDelta ? (
                      <span className="text-2xs opacity-70">+{formatMoney(v.priceDelta)}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <ProductCustomizationForm
            fields={customizationFields}
            values={customizationValues}
            imagePublicIds={customizationImageIds}
            onChange={setCustomizationValues}
            onImageChange={handleCustomizationImageChange}
            onUploadingChange={setCustomizationUploading}
            error={customizationError}
          />

          {/* quantity + actions */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <QuantityStepper value={quantity} onChange={setQuantity} max={availableStock} />
            <p className="text-xs text-ink-faint">
              Subtotal <span className="font-bold text-ink">{formatMoney(unitPrice * quantity)}</span>
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleAdd}
              className="flex-1 rounded-xs border-2 border-ink bg-white px-8 py-4 text-sm font-bold transition hover:gradient-accent hover:text-cream active:scale-[0.98]"
            >
              {added ? "Added to bag" : "Add to bag"}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              className="flex-1 rounded-xs gradient-accent px-8 py-4 text-sm font-bold text-white shadow-soft transition hover:brightness-110 active:scale-[0.98]"
            >
              Buy now →
            </button>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["truck", `Delivered in ${product.deliveryEta}`],
                ...(!isPersonalizedProduct ? ([["returns", "14-day easy returns"]] as const) : []),
                ["lock", "Secure Razorpay checkout"],
                ["ribbon", "Gift wrapped at no charge"],
                ...(isPersonalizedProduct
                  ? ([["returns", "Final sale — no cancel or return"]] as const)
                  : []),
              ] as const
            ).map(([icon, text]) => (
              <li key={text} className="flex items-center gap-3 text-xs text-ink-soft">
                <span className="grid size-9 shrink-0 place-items-center border border-line text-ink-soft">
                  <Motif name={icon} className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>

          {/* occasion tags */}
          <div className="mt-8">
            <p className="text-2xs font-bold tracking-[0.15em] text-ink-faint uppercase">
              Good for
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.occasionIds.map((id) => {
                const o = occasionById.get(id);
                if (!o) return null;
                return (
                  <Link
                    key={id}
                    href={`/products?occasion=${o.slug}`}
                    className="rounded-xs border border-ink/15 bg-white px-4 py-2 text-xs transition hover:border-ink"
                  >
                    {o.motif} {o.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* tabs */}
          <div className="mt-10 border-t border-line pt-6">
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  aria-pressed={tab === t}
                  className={`shrink-0 rounded-xs px-5 py-2 text-xs font-bold transition ${
                    tab === t ? "bg-ink text-cream" : "text-ink-soft hover:bg-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="animate-fade mt-5 text-sm leading-relaxed text-ink-soft" key={tab}>
              {tab === "Description" && (
                <div className="grid gap-6">
                  {product.description ? (
                    <p className="text-pretty text-ink">{product.description}</p>
                  ) : (
                    <p className="text-ink-faint">No written description for this product yet.</p>
                  )}
                  {product.variants && product.variants.length > 0 && (
                    <div>
                      <p className="text-2xs font-bold tracking-[0.15em] text-ink-faint uppercase">
                        Options & details
                      </p>
                      <ul className="mt-3 grid gap-4">
                        {product.variants.map((v) => {
                          const rows = variantDetailRows(v);
                          const selected = v.id === variantId;
                          return (
                            <li
                              key={v.id}
                              className={`rounded-md border p-4 ${
                                selected ? "border-ink bg-white" : "border-line bg-cream/50"
                              }`}
                            >
                              <p className="font-semibold text-ink">
                                {v.label}
                                {selected && (
                                  <span className="ml-2 text-2xs font-normal text-ink-faint">
                                    (selected)
                                  </span>
                                )}
                              </p>
                              {rows.length > 0 ? (
                                <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                                  {rows.map((row) => (
                                    <div key={row.label}>
                                      <dt className="text-2xs text-ink-faint">{row.label}</dt>
                                      <dd className="text-sm text-ink">{row.value}</dd>
                                    </div>
                                  ))}
                                </dl>
                              ) : (
                                <p className="mt-1 text-xs text-ink-faint">Standard option</p>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {tab === "Specs" && (
                <dl className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
                  {product.specs.map((s) => (
                    <div key={s.label} className="bg-white p-4">
                      <dt className="text-2xs tracking-wider text-ink-faint uppercase">{s.label}</dt>
                      <dd className="mt-1 text-sm font-semibold text-ink">{s.value}</dd>
                    </div>
                  ))}
                  {variant &&
                    variantDetailRows(variant).map((row) => (
                      <div key={`variant-${row.label}`} className="bg-white p-4">
                        <dt className="text-2xs tracking-wider text-ink-faint uppercase">
                          {row.label} ({variant.label})
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-ink">{row.value}</dd>
                      </div>
                    ))}
                  {product.specs.length === 0 &&
                    (!variant || variantDetailRows(variant).length === 0) && (
                      <p className="col-span-full bg-white p-4 text-ink-faint">No specs listed.</p>
                    )}
                </dl>
              )}

              {tab === "What's inside" && (
                <ul className="flex flex-col gap-3">
                  {product.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-3">
                      <span className="mt-[0.15em] grid size-5 shrink-0 place-items-center rounded-full bg-accent-100 text-accent-700">
                        <Motif name="check" className="size-3" strokeWidth={2.4} />
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              )}

              {tab === "Delivery" && (
                <div className="flex flex-col gap-3">
                  <p>
                    Dispatched within 24 hours of order. Estimated delivery{" "}
                    <strong className="text-ink">{product.deliveryEta}</strong> from dispatch.
                  </p>
                  <p>
                    Free express delivery on orders over ₹1,499. Timed delivery is available at
                    checkout if the gift needs to land on an exact date.
                  </p>
                  <p>
                    {isPersonalizedProduct
                      ? "Personalised items are made to order and are final sale. They cannot be cancelled or returned unless they arrive damaged."
                      : "Returns accepted within 14 days on unopened items."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* sticky mobile buy bar */}
      <div className="sticky bottom-0 z-30 border-t border-line bg-cream/95 px-[4vw] py-3 backdrop-blur-lg lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xs text-ink-faint">{product.name}</p>
            <p className="text-base font-semibold">{formatMoney(unitPrice * quantity)}</p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            className="rounded-xs border-2 border-ink px-5 py-3 text-xs font-bold"
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleBuyNow}
            className="rounded-xs gradient-accent px-6 py-3 text-xs font-bold text-white"
          >
            Buy now
          </button>
        </div>
      </div>
    </>
  );
}
