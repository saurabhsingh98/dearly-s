"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { adminApi, type AdminOrder } from "@/lib/api";
import { formatInr, ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/admin-constants";
import { orderHasPersonalization, ORDER_FINAL_STATUSES } from "@/lib/order-policy";
import type { ApiOrderItem } from "@/lib/api-types";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function customerName(order: AdminOrder) {
  const u = order.userId;
  if (typeof u === "object" && u && "firstName" in u) {
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
    if (name) return name;
    if (u.email) return u.email;
  }
  return order.shippingAddress?.fullName ?? "Customer";
}

function customerEmail(order: AdminOrder) {
  const u = order.userId;
  if (typeof u === "object" && u && "email" in u && u.email) return u.email;
  return null;
}

function formatAddress(order: AdminOrder) {
  const a = order.shippingAddress;
  if (!a) return "—";
  const lines = [
    a.fullName,
    a.phone,
    [a.addressLine1, a.addressLine2].filter(Boolean).join(", "),
    [a.landmark, a.city, a.state, a.postalCode].filter(Boolean).join(", "),
    a.country,
  ].filter(Boolean);
  return lines.join(" · ");
}

function OrderLineItems({ items }: { items: ApiOrderItem[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((item, i) => (
        <li
          key={`${item.productName}-${i}`}
          className="rounded-md border border-line/80 bg-cream/40 px-3 py-2 text-xs"
        >
          <div className="flex items-start gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-line/60 bg-white">
              {item.image ? (
                <Image
                  src={item.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <span className="flex size-full items-center justify-center text-2xs text-ink-faint">
                  No img
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{item.productName}</p>
                  {item.variantLabel && (
                    <p className="text-ink-faint">Variant: {item.variantLabel}</p>
                  )}
                  <p className="text-ink-soft">
                    Qty {item.quantity} × {formatInr(item.price)}
                  </p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums text-ink">
                  {formatInr(item.price * item.quantity)}
                </p>
              </div>
              {item.customization?.length ? (
                <ul className="mt-2 grid gap-0.5 border-t border-line/60 pt-2 text-ink-faint">
                  {item.customization.map((c, j) => (
                    <li key={j}>
                      {c.name}: {c.value ?? "—"}
                      {c.imageUrl && (
                        <a
                          href={c.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-accent-700 underline"
                        >
                          image
                        </a>
                      )}
                    </li>
                  ))}
                  <li className="pt-1 text-2xs font-medium text-amber-900">Final sale item</li>
                </ul>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    orderStatus: "",
    paymentStatus: "",
    fromDate: "",
    toDate: "",
  });
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const buildQuery = useCallback(
    (pageNum = page) => {
      const params = new URLSearchParams({ page: String(pageNum), limit: "20" });
      if (filters.orderStatus) params.set("orderStatus", filters.orderStatus);
      if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
      if (filters.fromDate) params.set("fromDate", filters.fromDate);
      if (filters.toDate) params.set("toDate", filters.toDate);
      return params.toString();
    },
    [page, filters],
  );

  const load = useCallback(
    async (pageNum?: number) => {
      const p = pageNum ?? page;
      setLoading(true);
      setError("");
      try {
        const res = await adminApi.orders(buildQuery(p));
        setOrders(res.data?.items ?? []);
        setTotalPages(res.data?.pagination?.totalPages ?? 1);
        if (pageNum !== undefined) setPage(pageNum);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    },
    [buildQuery, page],
  );

  useEffect(() => {
    void load(page);
  }, [page, load]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load(1);
  };

  const changeStatus = async (id: string, orderStatus: string) => {
    setUpdatingId(id);
    try {
      await adminApi.updateOrderStatus(id, orderStatus);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="grid gap-6">
      <form
        onSubmit={applyFilters}
        className="grid gap-3 rounded-lg border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <select
          value={filters.orderStatus}
          onChange={(e) => setFilters((f) => ({ ...f, orderStatus: e.target.value }))}
          className="rounded-md border border-line px-3 py-2 text-sm"
        >
          <option value="">All order statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          value={filters.paymentStatus}
          onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value }))}
          className="rounded-md border border-line px-3 py-2 text-sm"
        >
          <option value="">All payment statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.fromDate}
          onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
          className="rounded-md border border-line px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={filters.toDate}
          onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
          className="rounded-md border border-line px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-cream"
        >
          Apply filters
        </button>
      </form>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="grid gap-4">
        {loading && orders.length === 0 ? (
          <p className="rounded-lg border border-line bg-white px-4 py-8 text-sm text-ink-soft">
            Loading…
          </p>
        ) : orders.length === 0 ? (
          <p className="rounded-lg border border-line bg-white px-4 py-8 text-sm text-ink-soft">
            No orders match your filters.
          </p>
        ) : (
          orders.map((o) => {
            const expanded = expandedId === o._id;
            const email = customerEmail(o);
            const personalized = orderHasPersonalization(o);
            return (
              <article
                key={o._id}
                className="rounded-lg border border-line bg-white text-sm shadow-soft"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 px-4 py-3">
                  <div>
                    <p className="font-semibold text-ink">
                      {o.orderNumber ?? o._id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-xs text-ink-faint">{formatDate(o.createdAt)}</p>
                    <p className="mt-1 text-ink">{customerName(o)}</p>
                    {email && <p className="text-xs text-ink-faint">{email}</p>}
                    {personalized && (
                      <p className="mt-1 text-2xs font-semibold text-amber-900">
                        Final sale — cannot cancel or refund online
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-lg font-semibold tabular-nums">{formatInr(o.totalAmount)}</p>
                    <p className="text-xs text-ink-soft">{o.paymentStatus}</p>
                    <select
                      value={o.orderStatus}
                      disabled={updatingId === o._id}
                      onChange={(e) => changeStatus(o._id, e.target.value)}
                      className="max-w-[200px] rounded border border-line px-2 py-1 text-xs"
                    >
                      {ORDER_STATUSES.map((s) => {
                        const blockFinal =
                          personalized && ORDER_FINAL_STATUSES.has(s) && s !== o.orderStatus;
                        return (
                          <option key={s} value={s} disabled={blockFinal}>
                            {s.replace(/_/g, " ")}
                            {blockFinal ? " (not for personalised orders)" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="px-4 py-3">
                  <OrderLineItems items={o.items ?? []} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/70 px-4 py-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : o._id)}
                    className="text-xs font-semibold text-accent-700 underline"
                  >
                    {expanded ? "Hide details" : "Show full details"}
                  </button>
                  <div className="text-xs text-ink-soft">
                    {o.items?.length ?? 0} item{(o.items?.length ?? 0) === 1 ? "" : "s"}
                    {o.couponCode ? ` · ${o.couponCode}` : ""}
                  </div>
                </div>

                {expanded && (
                  <div className="grid gap-4 border-t border-line/70 bg-cream/30 px-4 py-4 text-xs sm:grid-cols-2">
                    <div>
                      <p className="mb-1 font-semibold uppercase tracking-wide text-ink-faint">
                        Shipping
                      </p>
                      <p className="text-ink">{formatAddress(o)}</p>
                      {o.deliveryType && (
                        <p className="mt-2 text-ink-soft">
                          Delivery: {o.deliveryType.replace(/_/g, " ")}
                          {o.deliverySlot ? ` · ${o.deliverySlot}` : ""}
                          {o.deliveryDate ? ` · ${formatDate(o.deliveryDate)}` : ""}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 font-semibold uppercase tracking-wide text-ink-faint">
                        Totals
                      </p>
                      <dl className="grid gap-1 tabular-nums">
                        <div className="flex justify-between">
                          <dt className="text-ink-soft">Subtotal</dt>
                          <dd>{formatInr(o.subtotal)}</dd>
                        </div>
                        {o.discount > 0 && (
                          <div className="flex justify-between text-green-800">
                            <dt>Discount</dt>
                            <dd>−{formatInr(o.discount)}</dd>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <dt className="text-ink-soft">Delivery</dt>
                          <dd>{formatInr(o.deliveryFee)}</dd>
                        </div>
                        {o.tax != null && o.tax > 0 && (
                          <div className="flex justify-between">
                            <dt className="text-ink-soft">Tax</dt>
                            <dd>{formatInr(o.tax)}</dd>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-line/60 pt-1 font-semibold">
                          <dt>Total</dt>
                          <dd>{formatInr(o.totalAmount)}</dd>
                        </div>
                      </dl>
                    </div>
                    {o.statusHistory?.length ? (
                      <div className="sm:col-span-2">
                        <p className="mb-2 font-semibold uppercase tracking-wide text-ink-faint">
                          Status history
                        </p>
                        <ol className="grid gap-1">
                          {o.statusHistory.map((entry, i) => (
                            <li key={i} className="flex flex-wrap gap-2 text-ink-soft">
                              <span className="font-medium text-ink">
                                {entry.status.replace(/_/g, " ")}
                              </span>
                              <span>{formatDate(entry.at)}</span>
                              {entry.note && <span className="text-ink-faint">— {entry.note}</span>}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded border border-line px-3 py-1 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-ink-soft">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => setPage((p) => p + 1)}
          className="rounded border border-line px-3 py-1 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
