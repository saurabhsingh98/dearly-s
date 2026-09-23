"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminApi, type AdminOrder } from "@/lib/api";
import { formatInr } from "@/lib/admin-constants";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<{
    customers: number;
    activeProducts: number;
    totalOrders: number;
    revenue: number;
    pendingReviews: number;
    ordersByStatus: { _id: string; count: number }[];
  } | null>(null);
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await adminApi.dashboard();
      setStats(res.data?.stats ?? null);
      setRecentOrders(res.data?.recentOrders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }

  if (!stats) {
    return <p className="text-sm text-ink-soft">Loading dashboard…</p>;
  }

  const cards = [
    { label: "Revenue (paid)", value: formatInr(stats.revenue) },
    { label: "Orders", value: String(stats.totalOrders) },
    { label: "Customers", value: String(stats.customers) },
    { label: "Active products", value: String(stats.activeProducts) },
    { label: "Pending reviews", value: String(stats.pendingReviews) },
  ];

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-line bg-white p-4">
            <p className="text-2xs font-bold tracking-wide text-ink-faint uppercase">{c.label}</p>
            <p className="mt-2 text-xl font-semibold text-ink">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="font-semibold text-ink">Orders by status</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {stats.ordersByStatus.map((row) => (
              <li key={row._id} className="flex justify-between border-b border-line/60 py-2">
                <span className="text-ink-soft">{row._id.replace(/_/g, " ")}</span>
                <span className="font-medium">{row.count}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink">Recent orders</h2>
            <Link href="/admin/orders" className="text-xs font-semibold text-accent-700 underline">
              View all
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-2xs text-ink-faint uppercase">
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Total</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => {
                  const u = o.userId;
                  const name =
                    typeof u === "object" && u && "firstName" in u
                      ? [u.firstName, u.lastName].filter(Boolean).join(" ")
                      : "Customer";
                  const email =
                    typeof u === "object" && u && "email" in u ? u.email : null;
                  return (
                  <tr key={o._id} className="border-t border-line/60">
                    <td className="py-2 pr-2">
                      {name}
                      {email && (
                        <span className="block text-xs text-ink-faint">{email}</span>
                      )}
                    </td>
                    <td className="py-2">{formatInr(o.totalAmount)}</td>
                    <td className="py-2 text-xs">{o.orderStatus}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
