"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LayoutDashboard, FolderTree, LogOut, Package, ShoppingBag, Ticket } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { brand } from "@/data/site";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/admin")}`);
      return;
    }
    if (user.role !== "ADMIN") {
      router.replace("/");
    }
  }, [user, loading, router, pathname]);

  if (loading || !user || user.role !== "ADMIN") {
    return (
      <div className="grid min-h-screen place-items-center bg-cream text-sm text-ink-soft">
        Loading admin…
      </div>
    );
  }

  const onLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-ink text-cream">
        <div className="border-b border-white/10 px-5 py-6">
          <p className="text-2xs font-bold tracking-[0.2em] text-white/50 uppercase">
            {brand.name}
          </p>
          <p className="mt-1 font-display text-lg">Admin</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm transition ${
                  active ? "bg-white/15 font-semibold" : "hover:bg-white/10"
                }`}
              >
                <Icon className="size-4 opacity-80" strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-white/70">
          <p className="truncate font-medium text-white">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate">{user.email}</p>
          <button
            type="button"
            onClick={onLogout}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-white/20 py-2 text-xs font-semibold transition hover:bg-white/10"
          >
            <LogOut className="size-3.5" />
            Log out
          </button>
          <Link href="/" className="mt-2 block text-center text-2xs underline underline-offset-2">
            Back to shop
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line bg-cream/90 px-6 py-4 backdrop-blur">
          <h1 className="font-display text-xl text-ink">Store operations</h1>
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}
