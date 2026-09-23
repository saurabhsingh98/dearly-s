import type { ApiCartCustomization, ApiOrder } from "@/lib/api-types";
import type { CartLine } from "@/lib/types";

export const PERSONALIZED_FINAL_SALE_NOTE =
  "Personalised items are final sale — they cannot be cancelled or returned unless damaged in transit.";

export function lineHasPersonalization(
  customization?: ApiCartCustomization[] | CartLine["customization"],
) {
  return (customization?.length ?? 0) > 0;
}

export function orderHasPersonalization(order: Pick<ApiOrder, "items">) {
  return (order.items ?? []).some((item) => lineHasPersonalization(item.customization));
}

export const ORDER_FINAL_STATUSES = new Set(["CANCELLED", "REFUNDED"]);
