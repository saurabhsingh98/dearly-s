"use client";

import Link from "next/link";
import { ProductArt } from "@/components/ui/ProductArt";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { OrderSummaryCard } from "@/components/checkout/OrderSummaryCard";
import { useCart, cartLineKey } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { Motif } from "@/components/ui/Motif";

export default function CartPage() {
  const { lines, setQty, remove, count, hydrated } = useCart();

  if (!hydrated) {
    return (
      <div className="shell py-[12vh]">
        <div className="h-[30vh] animate-pulse rounded-lg bg-white" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="shell flex flex-col items-center gap-5 py-[14vh] text-center">
        <Motif name="bag" className="size-20 text-ink-faint" strokeWidth={1} />
        <h1 className="text-4xl font-semibold tracking-tight">Your bag is empty</h1>
        <p className="max-w-[46ch] text-base text-ink-soft">
          Nothing here yet. The trending rail on the home page is the fastest way in.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/products"
            className="rounded-xs gradient-accent px-8 py-4 text-sm font-bold text-white shadow-soft"
          >
            Shop all gifts
          </Link>
          <Link href="/" className="rounded-xs border border-ink/15 px-8 py-4 text-sm font-bold">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell py-[5vh]">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-2xs text-ink-faint">
        <Link href="/" className="hover:text-ink">Home</Link>
        <span aria-hidden>/</span>
        <span className="text-ink">Bag</span>
      </nav>

      <h1 className="mt-4 text-5xl font-semibold tracking-[-0.03em]">
        Your bag <span className="text-ink-faint">({count})</span>
      </h1>

      <div className="mt-[4vh] grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <ul className="flex flex-col gap-4">
          {lines.map((line) => (
            <li
              key={cartLineKey(line)}
              className="grid gap-4 rounded-lg border border-line bg-white p-4 sm:grid-cols-[auto_1fr]"
            >
              <Link href={`/products/${line.product.slug}`} className="shrink-0">
                <ProductArt
                  art={line.product.art}
                  className="aspect-square w-full rounded-md sm:w-[18vw] sm:max-w-40"
                  motifClass="size-10"
                />
              </Link>

              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/products/${line.product.slug}`}
                      className="text-lg font-bold tracking-tight hover:text-accent-600"
                    >
                      {line.product.name}
                    </Link>
                    {line.variant && (
                      <p className="text-xs text-ink-faint">{line.variant.label}</p>
                    )}
                    <p className="mt-1 text-xs text-ink-soft">
                      Delivered in {line.product.deliveryEta}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{formatMoney(line.lineTotal)}</p>
                    {line.quantity > 1 && (
                      <p className="text-2xs text-ink-faint">{formatMoney(line.unitPrice)} each</p>
                    )}
                  </div>
                </div>

                {line.customization?.length ? (
                  <ul className="rounded-sm border border-line bg-cream/80 px-4 py-3 text-xs text-ink-soft">
                    {line.customization.map((c) => (
                      <li key={c.name}>
                        <span className="font-semibold text-ink">{c.name}:</span>{" "}
                        {c.imageUrl || c.value}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                  <QuantityStepper
                    value={line.quantity}
                    max={line.product.stock}
                    onChange={(q) => setQty(line.productId, q, line.variantId, line.customization)}
                  />
                  <button
                    type="button"
                    onClick={() => remove(line.productId, line.variantId, line.customization)}
                    className="text-xs text-ink-faint underline underline-offset-2 transition hover:text-accent-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-4 lg:sticky lg:top-[12vh]">
          <OrderSummaryCard showLines={false} />
          <Link
            href="/checkout"
            className="rounded-xs gradient-accent px-8 py-4 text-center text-sm font-bold text-white shadow-soft transition hover:brightness-110"
          >
            Proceed to checkout →
          </Link>
          <Link
            href="/products"
            className="rounded-xs border border-ink/15 px-8 py-4 text-center text-sm font-bold transition hover:border-ink"
          >
            Continue shopping
          </Link>
          <p className="text-center text-2xs text-ink-faint">
            Secure payment by Razorpay · UPI, cards, netbanking, wallets
          </p>
        </div>
      </div>
    </div>
  );
}
