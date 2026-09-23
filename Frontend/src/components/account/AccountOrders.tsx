"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Package } from "lucide-react";
import { orderApi } from "@/lib/api";
import type { ApiOrder } from "@/lib/api-types";
import { formatRupees } from "@/lib/money";
import {
  orderHasPersonalization,
  PERSONALIZED_FINAL_SALE_NOTE,
} from "@/lib/order-policy";
import {
  EmptyState,
  ErrorNote,
  Panel,
  Skeleton,
  StatusPill,
  formatDate,
} from "@/components/account/AccountUI";

/** Statuses past this point are already in motion and can no longer be cancelled. */
const CANCELLABLE = new Set(["PLACED", "PAYMENT_CONFIRMED", "PROCESSING"]);

const PAGE_SIZE = 10;

export function AccountOrders() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Fetch only; the caller owns the state updates.
  const fetchPage = useCallback(async (pageNum: number) => {
    const res = await orderApi.list({ page: pageNum, limit: PAGE_SIZE });
    return {
      items: res.data?.items ?? [],
      totalPages: res.data?.pagination?.totalPages ?? 1,
    };
  }, []);

  const apply = useCallback(
    (pageNum: number, data: { items: ApiOrder[]; totalPages: number }) => {
      setOrders(data.items);
      setTotalPages(data.totalPages);
      setPage(pageNum);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchPage(1);
        if (!cancelled) apply(1, data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load your orders");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage, apply]);

  const load = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError("");
      try {
        apply(pageNum, await fetchPage(pageNum));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load your orders");
      } finally {
        setLoading(false);
      }
    },
    [fetchPage, apply],
  );

  const cancel = async (id: string) => {
    if (!confirm("Cancel this order? This cannot be undone.")) return;
    setCancelling(id);
    setError("");
    try {
      await orderApi.cancel(id);
      await load(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel the order");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <Panel
      title="My orders"
      description="Every order you have placed, newest first."
    >
      <div className="grid gap-4">
        {error && <ErrorNote>{error}</ErrorNote>}

        {loading ? (
          <Skeleton rows={3} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Package className="size-5" strokeWidth={1.5} />}
            title="No orders yet"
            body="When you place an order it will appear here with its live status and delivery details."
            cta={{ href: "/products", label: "Start shopping" }}
          />
        ) : (
          orders.map((order) => {
            const personalized = orderHasPersonalization(order);
            const canCancel = CANCELLABLE.has(order.orderStatus) && !personalized;

            return (
            <article
              key={order._id}
              className="rounded-md border border-line bg-cream p-5 transition-shadow duration-300 ease-out-expo hover:shadow-soft"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base text-ink">
                    {order.orderNumber ?? `Order ${order._id.slice(-8).toUpperCase()}`}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    Placed {formatDate(order.createdAt)}
                    {order.couponCode && ` · Coupon ${order.couponCode}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={order.orderStatus} />
                  <StatusPill status={order.paymentStatus} kind="payment" />
                </div>
              </div>

              <ul className="mt-4 grid gap-2 border-t border-line pt-4">
                {order.items.map((item, i) => (
                  <li
                    key={`${order._id}-${i}`}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="min-w-0 truncate text-ink">
                      {item.productName}
                      {item.variantLabel && (
                        <span className="text-ink-faint"> · {item.variantLabel}</span>
                      )}
                      <span className="text-ink-faint"> × {item.quantity}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-ink-soft">
                      {formatRupees(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <div className="text-sm">
                  <span className="text-ink-soft">Total </span>
                  <span className="font-semibold tabular-nums text-ink">
                    {formatRupees(order.totalAmount)}
                  </span>
                  {order.discount > 0 && (
                    <span className="ml-2 text-xs text-green-700">
                      saved {formatRupees(order.discount)}
                    </span>
                  )}
                </div>
                {canCancel ? (
                  <button
                    type="button"
                    onClick={() => cancel(order._id)}
                    disabled={cancelling === order._id}
                    className="rounded-xs border border-ink/15 bg-white px-4 py-2 text-xs font-semibold transition hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                  >
                    {cancelling === order._id ? "Cancelling…" : "Cancel order"}
                  </button>
                ) : personalized && CANCELLABLE.has(order.orderStatus) ? (
                  <p className="max-w-[28ch] text-right text-2xs text-ink-faint">
                    {PERSONALIZED_FINAL_SALE_NOTE}
                  </p>
                ) : null}
              </div>
            </article>
            );
          })
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
              className="rounded-xs border border-ink/15 bg-white px-4 py-2 text-xs font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-ink-soft">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => load(page + 1)}
              className="rounded-xs border border-ink/15 bg-white px-4 py-2 text-xs font-semibold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <p className="mt-5 text-xs text-ink-soft">
        Need help with an order?{" "}
        <Link href="/" className="link-sweep font-semibold text-accent-700">
          Contact support
        </Link>
      </p>
    </Panel>
  );
}
