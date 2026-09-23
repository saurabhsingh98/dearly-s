function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

/** Normalises env to `…/api/v1` (avoids double `/api/v1` if env already includes it). */
export function toApiV1Base(base: string) {
  const trimmed = stripTrailingSlash(base.trim());
  if (trimmed.endsWith("/api/v1")) return trimmed;
  return `${trimmed}/api/v1`;
}

/**
 * API base for fetch calls.
 * - Browser: `NEXT_PUBLIC_*` if set, else same-origin `/api/v1` (proxied in `next.config.ts`).
 * - Server: `BACKEND_BASE_URL` or localhost.
 */
function resolveApiBaseUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicUrl) return toApiV1Base(publicUrl);

  const publicBackend = process.env.NEXT_PUBLIC_BACKEND_BASE_URL?.trim();
  if (publicBackend) return toApiV1Base(publicBackend);

  if (typeof window !== "undefined") {
    return "/api/v1";
  }

  const serverBackend = process.env.BACKEND_BASE_URL?.trim();
  if (serverBackend) return toApiV1Base(serverBackend);

  return "http://localhost:5001/api/v1";
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Relative paths under `API_BASE_URL`. One entry per route in `Backend/src/routes`. */
export const API_PATHS = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    google: "/auth/google",
    config: "/auth/config",
    logout: "/auth/logout",
    me: "/auth/me",
  },
  users: {
    me: "/users/me",
    addresses: "/users/me/addresses",
    address: (id: string) => `/users/me/addresses/${id}`,
    addressDefault: (id: string) => `/users/me/addresses/${id}/default`,
  },
  /** Standalone address router — same handlers as the `users.address*` paths. */
  addresses: {
    list: "/addresses",
    create: "/addresses",
    detail: (id: string) => `/addresses/${id}`,
    setDefault: (id: string) => `/addresses/${id}/default`,
  },
  cart: {
    get: "/cart",
    clear: "/cart",
    items: "/cart/items",
    item: (itemId: string) => `/cart/items/${itemId}`,
  },
  wishlist: {
    get: "/wishlist",
    product: (productId: string) => `/wishlist/${productId}`,
  },
  orders: {
    list: "/orders",
    create: "/orders",
    detail: (id: string) => `/orders/${id}`,
    cancel: (id: string) => `/orders/${id}/cancel`,
  },
  payments: {
    create: "/payments/create",
    verify: "/payments/verify",
    config: "/payments/config",
  },
  coupons: {
    validate: "/coupons/validate",
  },
  uploads: {
    create: "/uploads",
    delete: "/uploads",
  },
  products: {
    list: "/products",
    featured: "/products/featured",
    slug: (slug: string) => `/products/slug/${slug}`,
    byCategory: (categoryId: string) => `/products/category/${categoryId}`,
    detail: (id: string) => `/products/${id}`,
    reviews: (productId: string) => `/products/${productId}/reviews`,
  },
  reviews: {
    detail: (id: string) => `/reviews/${id}`,
  },
  categories: {
    list: "/categories",
    tree: "/categories/tree",
  },
  occasions: "/occasions",
  banners: "/banners",
  admin: {
    dashboard: "/admin/dashboard",
    users: "/admin/users",
    uploads: "/admin/uploads",
    orders: "/admin/orders",
    orderStatus: (id: string) => `/admin/orders/${id}/status`,
    categories: "/admin/categories",
    category: (id: string) => `/admin/categories/${id}`,
    products: "/admin/products",
    product: (id: string) => `/admin/products/${id}`,
    coupons: "/admin/coupons",
    coupon: (id: string) => `/admin/coupons/${id}`,
  },
} as const;

export function withQuery(path: string, query: string) {
  return query ? `${path}?${query}` : path;
}

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

/** Serialises a params object, dropping empty/undefined entries. */
export function buildQuery(params: QueryParams) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  return search.toString();
}
