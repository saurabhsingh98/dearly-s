export type Money = number; // stored in paise (smallest INR unit)

export type ProductArt = {
  from: string;
  to: string;
  motif: string;
  pattern?: "dots" | "rings" | "confetti" | "waves";
};

export type ProductVariant = {
  id: string;
  label: string;
  swatch?: string;
  priceDelta?: Money;
  sku?: string;
  stock?: number;
  size?: string;
  color?: string;
  material?: string;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: Money;
  compareAt?: Money;
  categoryId: string;
  subcategoryId: string;
  occasionIds: string[];
  tags: string[];
  rating: number;
  reviewCount: number;
  stock: number;
  badge?: string;
  art: ProductArt;
  variants?: ProductVariant[];
  highlights: string[];
  specs: { label: string; value: string }[];
  personalisable: boolean;
  deliveryEta: string;
  /** Cloudinary / CDN URL when loaded from the API. */
  image?: string;
  /** Every image on the product, in order; empty falls back to generated art. */
  images?: string[];
};

export type Subcategory = {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  blurb: string;
  motif: string;
  accent: string;
  image: string;
};

export type Occasion = {
  id: string;
  name: string;
  slug: string;
  motif: string;
  accent: string;
  window: string;
  image: string;
  note: string;
};

export type CartLine = {
  productId: string;
  variantId?: string;
  quantity: number;
  giftNote?: string;
  /** Persisted when the product is not in the static demo catalog (API / Mongo id). */
  product?: Product;
};

export type CartLineView = CartLine & {
  product: Product;
  variant?: ProductVariant;
  unitPrice: Money;
  lineTotal: Money;
};

export type Address = {
  fullName: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
};

export type ShippingMethod = {
  id: string;
  name: string;
  detail: string;
  price: Money;
  eta: string;
};

export type OrderSummary = {
  subtotal: Money;
  discount: Money;
  shipping: Money;
  tax: Money;
  total: Money;
};
