import type { ProductVariant } from "@/lib/types";

export function variantDetailRows(v: ProductVariant): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (v.sku) rows.push({ label: "SKU", value: v.sku });
  if (v.size) rows.push({ label: "Size", value: v.size });
  if (v.color) rows.push({ label: "Color", value: v.color });
  if (v.material) rows.push({ label: "Material", value: v.material });
  const { lengthCm, breadthCm, heightCm } = v;
  if (lengthCm || breadthCm || heightCm) {
    rows.push({
      label: "Package size",
      value: [lengthCm, breadthCm, heightCm]
        .filter((n) => n != null && n > 0)
        .map((n) => `${n} cm`)
        .join(" × "),
    });
  }
  if (v.stock != null) rows.push({ label: "In stock", value: String(v.stock) });
  return rows;
}
