import { API_PATHS, buildQuery, withQuery, type QueryParams } from "@/lib/api-config";
import { apiDelete, apiFetch, apiGet, apiPatch, apiPost, serverGet } from "@/lib/api-http";
import type {
  AddCartItemInput,
  AddressInput,
  AdminStats,
  ApiCart,
  ApiCategory,
  ApiCategoryTreeNode,
  ApiCoupon,
  ApiOrder,
  ApiPayment,
  ApiPaymentIntent,
  ApiProduct,
  ApiReview,
  ApiUpload,
  ApiUser,
  ApiWishlist,
  CouponValidation,
  CreateOrderInput,
  OrderStatus,
  Paginated,
  ProductListQuery,
  VerifyPaymentInput,
} from "@/lib/api-types";

export type { ApiResponse } from "@/lib/api-http";
export { API_BASE_URL, API_PATHS, buildQuery, withQuery } from "@/lib/api-config";
export { apiFetch, apiGet, apiPost, apiPatch, apiDelete, serverGet } from "@/lib/api-http";
export type * from "@/lib/api-types";

const json = (body: unknown) => JSON.stringify(body);

/** Callers may pass a pre-built query string or a params object. */
const toQuery = (query: string | QueryParams) =>
  typeof query === "string" ? query : buildQuery(query);

export type ApiAddress = {
  _id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  addressType?: string;
  isDefault: boolean;
};

/** The JWT comes back as an httpOnly cookie, so there is no token to store. */
export const authApi = {
  register: (body: Record<string, string>) =>
    apiPost<{ user: ApiUser }>(API_PATHS.auth.register, json(body)),
  login: (body: Record<string, string>) =>
    apiPost<{ user: ApiUser }>(API_PATHS.auth.login, json(body)),
  google: (credential: string) =>
    apiPost<{ user: ApiUser }>(API_PATHS.auth.google, json({ credential })),
  config: () =>
    apiGet<{ googleConfigured: boolean; googleClientId?: string }>(API_PATHS.auth.config),
  logout: () => apiPost(API_PATHS.auth.logout),
  me: () => apiGet<{ user: ApiUser }>(API_PATHS.auth.me),
};

export const userApi = {
  profile: () => apiGet<{ user: ApiUser }>(API_PATHS.users.me),
  /** Only firstName, lastName and phone are writable. */
  updateProfile: (body: { firstName?: string; lastName?: string; phone?: string }) =>
    apiPatch<{ user: ApiUser }>(API_PATHS.users.me, json(body)),

  addresses: () => apiGet<{ addresses: ApiAddress[] }>(API_PATHS.users.addresses),
  addAddress: (body: Record<string, unknown> | AddressInput) =>
    apiPost<{ address: ApiAddress }>(API_PATHS.users.addresses, json(body)),
  updateAddress: (id: string, body: Record<string, unknown> | Partial<AddressInput>) =>
    apiPatch<{ address: ApiAddress }>(API_PATHS.users.address(id), json(body)),
  setDefaultAddress: (id: string) =>
    apiPatch<{ address: ApiAddress }>(API_PATHS.users.addressDefault(id)),
  deleteAddress: (id: string) => apiDelete(API_PATHS.users.address(id)),
};

/** Server-side cart, keyed to the signed-in user. Every route returns the full cart. */
export const cartApi = {
  get: () => apiGet<{ cart: ApiCart }>(API_PATHS.cart.get),
  addItem: (body: AddCartItemInput) =>
    apiPost<{ cart: ApiCart }>(API_PATHS.cart.items, json(body)),
  updateItem: (itemId: string, body: { quantity: number }) =>
    apiPatch<{ cart: ApiCart }>(API_PATHS.cart.item(itemId), json(body)),
  removeItem: (itemId: string) =>
    apiDelete<{ cart: ApiCart }>(API_PATHS.cart.item(itemId)),
  clear: () => apiDelete<{ cart: ApiCart }>(API_PATHS.cart.clear),
};

/** Authenticated image uploads for personalisation (Cloudinary `dearlys/uploads`). */
export const uploadApi = {
  uploadImage: (formData: FormData) =>
    apiPost<ApiUpload>(API_PATHS.uploads.create, formData),
  deleteUpload: (publicId: string) =>
    apiDelete<{ publicId: string }>(
      withQuery(API_PATHS.uploads.delete, buildQuery({ publicId })),
    ),
};

export const wishlistApi = {
  get: () => apiGet<{ wishlist: ApiWishlist }>(API_PATHS.wishlist.get),
  add: (productId: string) =>
    apiPost<{ wishlist: ApiWishlist }>(API_PATHS.wishlist.product(productId)),
  remove: (productId: string) =>
    apiDelete<{ wishlist: ApiWishlist }>(API_PATHS.wishlist.product(productId)),
};

export const orderApi = {
  /** Builds the order from the server cart and returns a payment intent with it. */
  create: (body: CreateOrderInput, idempotencyKey?: string) =>
    apiFetch<{ order: ApiOrder; payment: ApiPaymentIntent }>(API_PATHS.orders.create, {
      method: "POST",
      body: json(body),
      ...(idempotencyKey ? { headers: { "Idempotency-Key": idempotencyKey } } : {}),
    }),
  list: (query: string | { page?: number; limit?: number } = "") =>
    apiGet<Paginated<ApiOrder>>(withQuery(API_PATHS.orders.list, toQuery(query))),
  detail: (id: string) => apiGet<{ order: ApiOrder }>(API_PATHS.orders.detail(id)),
  cancel: (id: string) => apiPatch<{ order: ApiOrder }>(API_PATHS.orders.cancel(id)),
};

export const paymentApi = {
  /** Re-issues a Razorpay order for an order that already exists. */
  create: (orderId: string) =>
    apiPost<ApiPaymentIntent>(API_PATHS.payments.create, json({ orderId })),
  verify: (body: VerifyPaymentInput) =>
    apiPost<{ payment: ApiPayment; order: ApiOrder }>(
      API_PATHS.payments.verify,
      json(body),
    ),
  /** Public — lets the client know whether to expect a real checkout. */
  config: () => apiGet<{ razorpayConfigured: boolean }>(API_PATHS.payments.config),
};

export const couponApi = {
  /** Public; returns the computed discount for the given subtotal. */
  validate: (body: {
    code: string;
    subtotal: number;
    cartItems?: { productId: string; quantity: number }[];
  }) => apiPost<CouponValidation>(API_PATHS.coupons.validate, json(body)),
};

export const reviewApi = {
  /** Public; only approved reviews are returned. */
  listForProduct: (
    productId: string,
    query: string | { page?: number; limit?: number } = "",
  ) =>
    apiGet<{
      reviews: ApiReview[];
      pagination: Paginated<ApiReview>["pagination"];
    }>(withQuery(API_PATHS.products.reviews(productId), toQuery(query))),
  /** Requires a DELIVERED order that contains the product. */
  create: (
    productId: string,
    body: { orderId: string; rating: number; comment?: string; images?: string[] },
  ) => apiPost<{ review: ApiReview }>(API_PATHS.products.reviews(productId), json(body)),
  update: (id: string, body: { rating?: number; comment?: string }) =>
    apiPatch<{ review: ApiReview }>(API_PATHS.reviews.detail(id), json(body)),
  remove: (id: string) => apiDelete(API_PATHS.reviews.detail(id)),
};

export const catalogApi = {
  products: (query: string | ProductListQuery = "") =>
    apiGet(withQuery(API_PATHS.products.list, toQuery(query))),
  productBySlug: (slug: string) => apiGet(API_PATHS.products.slug(slug)),
  productById: (id: string) =>
    apiGet<{ product: ApiProduct }>(API_PATHS.products.detail(id)),
  productsByCategory: (
    categoryId: string,
    query: string | { page?: number; limit?: number } = "",
  ) =>
    apiGet<Paginated<ApiProduct>>(
      withQuery(API_PATHS.products.byCategory(categoryId), toQuery(query)),
    ),
  featured: () => apiGet(API_PATHS.products.featured),
  /** Nested tree. Use `categoriesFlat` for the ungrouped list. */
  categories: () =>
    apiGet<{ categories: ApiCategoryTreeNode[] }>(API_PATHS.categories.tree),
  categoriesFlat: () => apiGet<{ categories: ApiCategory[] }>(API_PATHS.categories.list),
};

/** Server Components: ISR-cached, no cookies. Same routes as `catalogApi`. */
export const catalogServer = {
  products: <T>(query: string) => serverGet<T>(withQuery(API_PATHS.products.list, query)),
  categories: <T>() => serverGet<T>(API_PATHS.categories.tree),
  occasions: <T>() => serverGet<T>(API_PATHS.occasions),
  banners: <T>(placement?: string) =>
    serverGet<T>(withQuery(API_PATHS.banners, buildQuery({ placement }))),
  productBySlug: <T>(slug: string) => serverGet<T>(API_PATHS.products.slug(slug)),
  featured: <T>(limit?: number) =>
    serverGet<T>(withQuery(API_PATHS.products.featured, buildQuery({ limit }))),
};

export type AdminCategory = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
  parentCategory?: { _id: string; name: string; slug: string } | string | null;
};

export type AdminCoupon = {
  _id: string;
  code: string;
  discountType: "PERCENTAGE" | "FLAT";
  discountValue: number;
  minimumAmount?: number;
  maximumDiscount?: number;
  startDate: string;
  expiryDate: string;
  usageLimit?: number;
  usedCount?: number;
  isActive: boolean;
};

export type AdminOrder = ApiOrder;

export const adminApi = {
  dashboard: () =>
    apiGet<{ stats: AdminStats; recentOrders: AdminOrder[] }>(API_PATHS.admin.dashboard),
  /** Capped at 100 by the backend, passwords stripped. */
  users: () => apiGet<{ users: ApiUser[] }>(API_PATHS.admin.users),

  /** `multipart/form-data` with a single `image` field; 503 if Cloudinary is unset. */
  uploadImage: (formData: FormData) =>
    apiPost<ApiUpload>(API_PATHS.admin.uploads, formData),
  uploadProductImage: (formData: FormData) =>
    apiPost<ApiUpload>(withQuery(API_PATHS.admin.uploads, "purpose=product"), formData),
  deleteUpload: (publicId: string) =>
    apiDelete<{ publicId: string }>(
      withQuery(API_PATHS.admin.uploads, buildQuery({ publicId })),
    ),

  orders: (query: string | QueryParams = "") =>
    apiGet<{
      items: AdminOrder[];
      pagination?: { page: number; totalPages: number; total: number };
    }>(withQuery(API_PATHS.admin.orders, toQuery(query))),
  /** Accepts a bare status string, or a body when you need to attach a note. */
  updateOrderStatus: (
    id: string,
    orderStatus: string | { orderStatus: OrderStatus; note?: string },
  ) =>
    apiPatch<{ order: AdminOrder }>(
      API_PATHS.admin.orderStatus(id),
      json(typeof orderStatus === "string" ? { orderStatus } : orderStatus),
    ),

  categories: (query: string | QueryParams = "") =>
    apiGet<{ categories: AdminCategory[] }>(
      withQuery(API_PATHS.admin.categories, toQuery(query)),
    ),
  createCategory: (body: Record<string, unknown>) =>
    apiPost<{ category: ApiCategory }>(API_PATHS.admin.categories, json(body)),
  updateCategory: (id: string, body: Record<string, unknown>) =>
    apiPatch<{ category: ApiCategory }>(API_PATHS.admin.category(id), json(body)),
  deleteCategory: (id: string) => apiDelete(API_PATHS.admin.category(id)),

  products: (query: string | ProductListQuery = "") =>
    apiGet<{ items: unknown[]; pagination?: unknown }>(
      withQuery(API_PATHS.admin.products, toQuery(query)),
    ),
  product: (id: string) => apiGet<{ product: ApiProduct }>(API_PATHS.admin.product(id)),
  /** `multipart/form-data`; nested fields are JSON-encoded per field by the caller. */
  createProduct: (formData: FormData) =>
    apiPost<{ product: unknown }>(API_PATHS.admin.products, formData),
  updateProduct: (id: string, formData: FormData) =>
    apiPatch<{ product: ApiProduct }>(API_PATHS.admin.product(id), formData),
  /** Soft delete — the backend deactivates rather than removing the row. */
  deleteProduct: (id: string) => apiDelete(API_PATHS.admin.product(id)),

  coupons: () => apiGet<{ coupons: AdminCoupon[] }>(API_PATHS.admin.coupons),
  createCoupon: (body: Record<string, unknown> | Partial<ApiCoupon>) =>
    apiPost<{ coupon: AdminCoupon }>(API_PATHS.admin.coupons, json(body)),
  updateCoupon: (id: string, body: Record<string, unknown> | Partial<ApiCoupon>) =>
    apiPatch<{ coupon: AdminCoupon }>(API_PATHS.admin.coupon(id), json(body)),
  /** Also a soft delete — sets `isActive: false`. */
  deleteCoupon: (id: string) =>
    apiDelete<{ coupon: AdminCoupon }>(API_PATHS.admin.coupon(id)),
};
