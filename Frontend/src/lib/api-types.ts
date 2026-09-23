// Wire types for `Backend/src/models` as the API serialises them.
// Amounts are whole rupees here; `@/lib/types` uses paise.

export type Id = string;

/** Populated by some routes and left as a bare id by others. */
export type Ref<T> = Id | T;

export type Paginated<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type Role = "CUSTOMER" | "ADMIN";

export type OrderStatus =
  | "PLACED"
  | "PAYMENT_CONFIRMED"
  | "PROCESSING"
  | "CUSTOMIZATION"
  | "READY_TO_SHIP"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "FAILED";

export type PaymentStatus =
  | "PENDING"
  | "AUTHORIZED"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export type DeliveryType = "STANDARD" | "SAME_DAY" | "EXPRESS" | "SCHEDULED";

export type DiscountType = "PERCENTAGE" | "FLAT";

export type AddressType = "HOME" | "WORK" | "OTHER";

export type CustomizationFieldType =
  | "TEXT"
  | "IMAGE"
  | "NUMBER"
  | "SELECT"
  | "TEXTAREA";

export type ApiImage = {
  url: string;
  publicId?: string;
  alt?: string;
};

export type ApiUser = {
  _id: Id;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiCategory = {
  _id: Id;
  name: string;
  slug: string;
  description?: string;
  image?: ApiImage;
  parentCategory?: Ref<ApiCategory> | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// `/categories/tree` nests children under each root. Named distinctly from the
// looser `ApiCategoryNode` that `@/lib/product-catalog` uses for its mappers.
export type ApiCategoryTreeNode = ApiCategory & {
  children?: ApiCategoryTreeNode[];
};

export type ApiProductVariantDimensions = {
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
};

export type ApiProductVariant = {
  _id?: Id;
  label?: string;
  attributes?: { size?: string; color?: string; material?: string };
  sku?: string;
  priceDelta?: number;
  price?: number;
  stock?: number;
  reservedStock?: number;
  dimensions?: ApiProductVariantDimensions;
  images?: ApiImage[];
};

export type ApiCustomizationField = {
  name: string;
  type: CustomizationFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type ApiProduct = {
  _id: Id;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  category: Ref<ApiCategory>;
  subCategory?: Ref<ApiCategory>;
  images: ApiImage[];
  price: number;
  discountPrice?: number;
  variants?: ApiProductVariant[];
  customizationFields?: ApiCustomizationField[];
  inventory?: { stock?: number; reservedStock?: number };
  rating?: number;
  reviewCount?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type ApiCartCustomization = {
  name: string;
  type?: string;
  value?: string;
  imageUrl?: string;
  imagePublicId?: string;
};

export type ApiCartItem = {
  _id: Id;
  productId: Ref<ApiProduct>;
  variantId?: Id;
  quantity: number;
  unitPrice: number;
  customization?: ApiCartCustomization[];
};

export type ApiCart = {
  _id: Id;
  userId: Id;
  items: ApiCartItem[];
  totalAmount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type AddCartItemInput = {
  productId: Id;
  quantity?: number;
  variantId?: Id;
  customization?: ApiCartCustomization[];
};

export type ApiWishlist = {
  _id: Id;
  userId: Id;
  /** Populated on every wishlist route. */
  products: ApiProduct[];
  createdAt?: string;
  updatedAt?: string;
};

export type ApiAddress = {
  _id: Id;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  addressType?: AddressType;
  isDefault: boolean;
};

/** `POST` requires the full set; `PATCH` takes any subset. */
export type AddressInput = Omit<ApiAddress, "_id" | "isDefault"> & {
  isDefault?: boolean;
};

export type ApiOrderItem = {
  productId: Ref<ApiProduct>;
  productName: string;
  image?: string;
  price: number;
  quantity: number;
  variantId?: Id;
  variantLabel?: string;
  customization?: ApiCartCustomization[];
};

export type ApiShippingAddress = {
  fullName: string;
  phone: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  addressType?: string;
};

export type ApiOrder = {
  _id: Id;
  orderNumber?: string;
  userId: Ref<ApiUser>;
  items: ApiOrderItem[];
  shippingAddress: ApiShippingAddress;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  /** 18% of the discounted goods value; absent on orders placed before it existed. */
  tax?: number;
  totalAmount: number;
  couponId?: Id;
  couponCode?: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  deliveryType?: DeliveryType;
  deliveryDate?: string;
  deliverySlot?: string;
  statusHistory?: { status: OrderStatus; at: string; by?: Id; note?: string }[];
  reservationExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

/** The order is built from the server-side cart; only the address is required. */
export type CreateOrderInput = {
  addressId: Id;
  couponCode?: string;
  deliveryType?: DeliveryType;
  deliveryDate?: string;
  deliverySlot?: string;
};

// Discriminated on `providerConfigured`: without Razorpay keys the backend
// still creates the order and reports the payment as pending.
export type ApiPaymentIntent =
  | {
      providerConfigured: false;
      amount: number;
      currency: string;
      orderId: Id;
      message: string;
    }
  | {
      providerConfigured: true;
      keyId: string;
      amount: number;
      currency: string;
      orderId: Id;
      paymentId: Id;
      razorpayOrderId: string;
    };

/** Snake_case because these come straight from the Razorpay checkout handler. */
export type VerifyPaymentInput = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export type ApiPayment = {
  _id: Id;
  orderId: Id;
  userId: Id;
  amount: number;
  currency?: string;
  status: PaymentStatus;
  provider?: string;
  providerOrderId?: string;
  providerPaymentId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiCoupon = {
  _id: Id;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minimumAmount?: number;
  maximumDiscount?: number;
  startDate: string;
  expiryDate: string;
  usageLimit?: number;
  usedCount?: number;
  applicableCategories?: Id[];
  applicableProducts?: Id[];
  isActive: boolean;
};

/** `POST /coupons/validate` returns the computed discount, not the coupon. */
export type CouponValidation = {
  code: string;
  discount: number;
  discountType: DiscountType;
};

export type ApiReview = {
  _id: Id;
  userId: Ref<Pick<ApiUser, "_id" | "firstName" | "lastName">>;
  productId: Id;
  orderId: Id;
  rating: number;
  comment?: string;
  images?: string[];
  isApproved?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiUpload = {
  url: string;
  publicId?: string;
  [key: string]: unknown;
};

export type AdminStats = {
  customers: number;
  activeProducts: number;
  totalOrders: number;
  revenue: number;
  pendingReviews: number;
  ordersByStatus: { _id: OrderStatus; count: number }[];
};

/** Filters accepted by `GET /products` and `GET /admin/products`. */
export type ProductListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subCategory?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  isFeatured?: boolean;
  isActive?: boolean;
};
