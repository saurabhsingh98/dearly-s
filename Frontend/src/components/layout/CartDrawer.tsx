"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ProductArt } from "@/components/ui/ProductArt";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { freeShippingThreshold } from "@/data/site";
import { useCart, cartLineKey } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { Motif } from "@/components/ui/Motif";
import { X } from "lucide-react";

export function CartDrawer() {
  const { drawerOpen, closeDrawer, lines, summary, setQty, remove, count } = useCart();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    if (drawerOpen) window.addEventListener("keydown", onKey);
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  const toFree = Math.max(freeShippingThreshold - summary.subtotal, 0);
  const progress = Math.min((summary.subtotal / freeShippingThreshold) * 100, 100);

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Shopping bag">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={closeDrawer} />
      <aside className="animate-rise absolute inset-y-0 right-0 flex w-[92vw] max-w-lg flex-col bg-cream shadow-lift">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="text-lg font-semibold tracking-tight">
            Your bag <span className="text-ink-faint">({count})</span>
          </h2>
          <button type="button" onClick={closeDrawer} aria-label="Close bag" className="text-xl"><X className="size-4" strokeWidth={1.6} aria-hidden /></button>
        </div>

        {lines.length > 0 && (
          <div className="border-b border-line bg-white px-6 py-4">
            <p className="text-xs font-medium">
              {toFree > 0 ? (
                <>
                  <span className="font-bold text-accent-600">{formatMoney(toFree)}</span> away from free
                  express delivery
                </>
              ) : (
                <span className="font-bold text-accent-700">Free express delivery unlocked</span>
              )}
            </p>
            <div className="mt-2 h-[0.8vh] min-h-[6px] overflow-hidden rounded-xs bg-line">
              <div
                className="h-full rounded-xs bg-accent-600 transition-[width] duration-700 ease-out-expo"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <Motif name="gift" className="size-16 text-ink-faint" strokeWidth={1} />
              <p className="text-lg font-bold">Your bag is empty</p>
              <p className="max-w-[40ch] text-sm text-ink-soft">
                Nothing in here yet. The hampers are a good place to start.
              </p>
              <Link
                href="/products"
                onClick={closeDrawer}
                className="rounded-xs gradient-accent px-6 py-3 text-sm font-bold text-cream"
              >
                Browse gifts
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {lines.map((line) => (
                <li
                  key={cartLineKey(line)}
                  className="flex gap-4 rounded-md border border-line bg-white p-3"
                >
                  <Link href={`/products/${line.product.slug}`} onClick={closeDrawer} className="shrink-0">
                    <ProductArt
                      art={line.product.art}
                      className="size-24 rounded-sm"
                      motifClass="size-8"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={`/products/${line.product.slug}`}
                      onClick={closeDrawer}
                      className="truncate text-sm font-semibold hover:text-accent-600"
                    >
                      {line.product.name}
                    </Link>
                    {line.variant && (
                      <span className="text-2xs text-ink-faint">{line.variant.label}</span>
                    )}
                    {line.customization?.length ? (
                      <ul className="mt-1 space-y-0.5 text-2xs text-ink-soft">
                        {line.customization.map((c) => (
                          <li key={c.name}>
                            <span className="font-semibold text-ink-faint">{c.name}:</span>{" "}
                            {c.imageUrl || c.value}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <span className="text-sm font-bold">{formatMoney(line.unitPrice)}</span>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <QuantityStepper
                        size="sm"
                        value={line.quantity}
                        max={line.product.stock}
                        onChange={(q) => setQty(line.productId, q, line.variantId, line.customization)}
                      />
                      <button
                        type="button"
                        onClick={() => remove(line.productId, line.variantId, line.customization)}
                        className="text-2xs text-ink-faint underline underline-offset-2 hover:text-accent-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t border-line bg-white px-6 py-5">
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-semibold">{formatMoney(summary.subtotal)}</dd>
              </div>
              {summary.discount > 0 && (
                <div className="flex justify-between text-accent-700">
                  <dt>Discount</dt>
                  <dd className="font-semibold">−{formatMoney(summary.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="font-semibold">
                  {summary.shipping === 0 ? "Free" : formatMoney(summary.shipping)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base">
                <dt className="font-bold">Total</dt>
                <dd className="font-semibold">{formatMoney(summary.total)}</dd>
              </div>
            </dl>
            <p className="mt-1 text-2xs text-ink-faint">Inclusive of {formatMoney(summary.tax)} GST</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/checkout"
                onClick={closeDrawer}
                className="rounded-xs gradient-accent px-6 py-4 text-center text-sm font-bold text-white shadow-soft"
              >
                Checkout · {formatMoney(summary.total)}
              </Link>
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="rounded-xs border border-ink/15 px-6 py-3 text-center text-sm font-semibold"
              >
                View full bag
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
