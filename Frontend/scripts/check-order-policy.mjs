/**
 * Smallest check for personalised-order policy helpers (no test runner in Frontend).
 * Run: node scripts/check-order-policy.mjs
 */
import assert from "node:assert/strict";

const lineHasPersonalization = (customization) => (customization?.length ?? 0) > 0;

const orderHasPersonalization = (order) =>
  (order.items ?? []).some((item) => lineHasPersonalization(item.customization));

assert.equal(lineHasPersonalization([]), false);
assert.equal(lineHasPersonalization(undefined), false);
assert.equal(lineHasPersonalization([{ name: "Note", value: "Hi" }]), true);

assert.equal(
  orderHasPersonalization({
    items: [{ productName: "Mug", customization: [{ name: "Text", value: "A" }] }],
  }),
  true,
);
assert.equal(
  orderHasPersonalization({
    items: [{ productName: "Box" }],
  }),
  false,
);

const requiresCustomization = (product) =>
  (product.customizationFields?.length ?? 0) > 0;
assert.equal(requiresCustomization({ customizationFields: [{ name: "Note", type: "TEXT" }] }), true);
assert.equal(requiresCustomization({}), false);

console.log("order-policy checks passed");
