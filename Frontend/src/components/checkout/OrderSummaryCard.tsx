"use client";

import { useState } from "react";
import { ProductArt } from "@/components/ui/ProductArt";
import { shippingMethods } from "@/data/site";
import { useCart, cartLineKey } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { lineHasPersonalization, PERSONALIZED_FINAL_SALE_NOTE } from "@/lib/order-policy";

export function CouponBox() {
  const { applyCoupon, clearCoupon, couponCode, couponLabel, couponError } = useCart();
  const [code, setCode] = useState("");

  if (couponCode) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-accent-600/40 bg-accent-100/50 px-4 py-3">
        <span className="text-xs">
          <strong className="font-bold">{couponCode}</strong> · {couponLabel}
        </span>
        <button
          type="button"
          onClick={clearCoupon}
          className="text-2xs text-ink-faint underline underline-offset-2 hover:text-accent-600"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (applyCoupon(code)) setCode("");
      }}
    >
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Discount code"
          aria-label="Discount code"
          className="w-full rounded-xs border border-ink/15 bg-white px-5 py-3 text-xs tracking-wider uppercase outline-none transition focus:border-accent-600"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xs border border-ink/15 px-5 py-3 text-xs font-bold transition hover:gradient-accent hover:text-cream"
        >
          Apply
        </button>
      </div>
      {couponError && <p className="mt-2 text-2xs text-accent-600">{couponError}</p>}
      <p className="mt-2 text-2xs text-ink-faint">Try DEARLY10, FESTIVE500 or FIRSTGIFT</p>
    </form>
  );
}

export function OrderSummaryCard({
  showLines = true,
  showCoupon = true,
}: {
  showLines?: boolean;
  showCoupon?: boolean;
}) {
  const { lines, summary, shippingMethodId } = useCart();
  const method = shippingMethods.find((s) => s.id === shippingMethodId);
  const hasPersonalizedLines = lines.some((line) => lineHasPersonalization(line.customization));

  return (
    <div className="rounded-lg border border-line bg-white p-6">
      <h2 className="text-lg font-semibold tracking-tight">Order summary</h2>

      {showLines && (
        <ul className="mt-5 flex flex-col gap-4 border-b border-line pb-5">
          {lines.map((line) => (
            <li key={cartLineKey(line)} className="flex gap-3">
              <div className="relative shrink-0">
                <ProductArt art={line.product.art} className="size-16 rounded-sm" motifClass="size-6" />
                <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-ink text-2xs font-bold text-cream">
                  {line.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{line.product.name}</p>
                {line.variant && <p className="text-2xs text-ink-faint">{line.variant.label}</p>}
              </div>
              <span className="text-xs font-bold">{formatMoney(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
      )}

      {showCoupon && (
        <div className="border-b border-line py-5">
          <CouponBox />
        </div>
      )}

      <dl className="flex flex-col gap-3 py-5 text-sm">
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
          <dt className="text-ink-soft">
            Delivery
            {method && <span className="block text-2xs text-ink-faint">{method.name} · {method.eta}</span>}
          </dt>
          <dd className="font-semibold">
            {summary.shipping === 0 ? (
              <span className="text-accent-700">Free</span>
            ) : (
              formatMoney(summary.shipping)
            )}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">GST (18%)</dt>
          <dd className="font-semibold">{formatMoney(summary.tax)}</dd>
        </div>
      </dl>

      {hasPersonalizedLines && (
        <p className="border-t border-line pt-4 text-2xs text-ink-faint">{PERSONALIZED_FINAL_SALE_NOTE}</p>
      )}

      <div className="flex items-end justify-between border-t border-line pt-5">
        <span className="text-base font-bold">Total</span>
        <span className="text-2xl font-semibold tracking-tight">{formatMoney(summary.total)}</span>
      </div>
    </div>
  );
}
