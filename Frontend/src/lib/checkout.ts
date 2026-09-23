import { cartApi, orderApi, userApi, type ApiAddress } from "@/lib/api";
import type { ApiOrder, ApiPaymentIntent, DeliveryType } from "@/lib/api-types";
import type { Address, CartLineView } from "@/lib/types";

/** Checkout's shipping choices map onto the backend's delivery types. */
const DELIVERY_BY_SHIPPING: Record<string, DeliveryType> = {
  "ship-standard": "STANDARD",
  "ship-express": "EXPRESS",
  "ship-timed": "SCHEDULED",
};

export const toDeliveryType = (shippingMethodId?: string): DeliveryType =>
  DELIVERY_BY_SHIPPING[shippingMethodId ?? ""] ?? "STANDARD";

/**
 * Replays the browser cart onto the server cart. The client sends what was
 * chosen — product, variant, quantity — and never a price; the server prices
 * the order from its own catalogue when it builds it.
 */
async function pushCart(lines: CartLineView[]) {
  await cartApi.clear();
  for (const line of lines) {
    await cartApi.addItem({
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
      customization: line.customization,
    });
  }
}

export function checkoutAddressFromSaved(saved: ApiAddress, email: string): Address {
  return {
    fullName: saved.fullName,
    email,
    phone: saved.phone,
    line1: saved.addressLine1,
    line2: saved.addressLine2 ?? "",
    city: saved.city,
    state: saved.state,
    pincode: saved.postalCode,
  };
}

async function createAddress(address: Address) {
  const res = await userApi.addAddress({
    fullName: address.fullName,
    phone: address.phone.replace(/\s/g, ""),
    addressLine1: address.line1,
    ...(address.line2 ? { addressLine2: address.line2 } : {}),
    city: address.city,
    state: address.state,
    postalCode: address.pincode,
    country: "India",
  });

  const created = res.data?.address;
  if (!created) throw new Error("Could not save that delivery address.");
  return created;
}

export type PlacedOrderResult = { order: ApiOrder; payment: ApiPaymentIntent };

/**
 * One idempotency key per checkout attempt: a retried request returns the
 * original order instead of placing and reserving stock for a second one.
 */
export function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `ck_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function placeOrder({
  lines,
  address,
  addressId,
  couponCode,
  shippingMethodId,
  deliveryDate,
  deliverySlot,
  idempotencyKey,
}: {
  lines: CartLineView[];
  address: Address;
  addressId?: string;
  couponCode?: string | null;
  shippingMethodId?: string;
  deliveryDate?: string;
  deliverySlot?: string;
  idempotencyKey: string;
}): Promise<PlacedOrderResult> {
  await pushCart(lines);
  const id = addressId ?? (await createAddress(address))._id;

  const res = await orderApi.create(
    {
      addressId: id,
      ...(couponCode ? { couponCode } : {}),
      deliveryType: toDeliveryType(shippingMethodId),
      ...(deliveryDate ? { deliveryDate } : {}),
      ...(deliverySlot ? { deliverySlot } : {}),
    },
    idempotencyKey,
  );

  if (!res.data?.order) throw new Error(res.message || "Could not place the order.");
  return { order: res.data.order, payment: res.data.payment };
}
