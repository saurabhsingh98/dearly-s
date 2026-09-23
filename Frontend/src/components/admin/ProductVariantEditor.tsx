"use client";

import type { ApiProductVariant } from "@/lib/api-types";
import { decimalOnly, digitsOnly } from "@/lib/validation";

export type VariantDraft = {
  key: string;
  _id?: string;
  label: string;
  sku: string;
  stock: string;
  priceDelta: string;
  size: string;
  color: string;
  material: string;
  lengthCm: string;
  breadthCm: string;
  heightCm: string;
};

export function newVariantDraft(): VariantDraft {
  return {
    key: crypto.randomUUID(),
    label: "",
    sku: "",
    stock: "0",
    priceDelta: "",
    size: "",
    color: "",
    material: "",
    lengthCm: "",
    breadthCm: "",
    heightCm: "",
  };
}

export function variantsFromApi(variants: ApiProductVariant[] = []): VariantDraft[] {
  if (!variants.length) return [];
  return variants.map((v) => ({
    key: v._id || crypto.randomUUID(),
    _id: v._id,
    label: v.label ?? "",
    sku: v.sku ?? "",
    stock: String(v.stock ?? 0),
    priceDelta: v.priceDelta != null ? String(v.priceDelta) : "",
    size: v.attributes?.size ?? "",
    color: v.attributes?.color ?? "",
    material: v.attributes?.material ?? "",
    lengthCm: v.dimensions?.lengthCm != null ? String(v.dimensions.lengthCm) : "",
    breadthCm: v.dimensions?.breadthCm != null ? String(v.dimensions.breadthCm) : "",
    heightCm: v.dimensions?.heightCm != null ? String(v.dimensions.heightCm) : "",
  }));
}

export function variantsToPayload(rows: VariantDraft[]) {
  return rows
    .filter((r) => r.label.trim() || Number(r.stock) > 0 || r.sku.trim())
    .map((r) => {
      const dimensions: Record<string, number> = {};
      if (r.lengthCm) dimensions.lengthCm = Number(r.lengthCm);
      if (r.breadthCm) dimensions.breadthCm = Number(r.breadthCm);
      if (r.heightCm) dimensions.heightCm = Number(r.heightCm);

      const attributes: Record<string, string> = {};
      if (r.size.trim()) attributes.size = r.size.trim();
      if (r.color.trim()) attributes.color = r.color.trim();
      if (r.material.trim()) attributes.material = r.material.trim();

      const payload: Record<string, unknown> = {
        label: r.label.trim(),
        sku: r.sku.trim(),
        stock: Number(r.stock) || 0,
      };
      if (r._id) payload._id = r._id;
      if (r.priceDelta) payload.priceDelta = Number(r.priceDelta);
      if (Object.keys(attributes).length) payload.attributes = attributes;
      if (Object.keys(dimensions).length) payload.dimensions = dimensions;
      return payload;
    });
}

type Props = {
  variants: VariantDraft[];
  onChange: (variants: VariantDraft[]) => void;
  disabled?: boolean;
};

export function ProductVariantEditor({ variants, onChange, disabled }: Props) {
  const update = (key: string, patch: Partial<VariantDraft>) => {
    onChange(variants.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  };

  return (
    <div className="grid gap-3 rounded-md border border-line bg-white/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink">Variants</p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...variants, newVariantDraft()])}
          className="text-xs font-semibold text-accent-700 underline disabled:opacity-50"
        >
          Add variant
        </button>
      </div>
      {variants.length === 0 ? (
        <p className="text-xs text-ink-soft">
          No variants — stock uses the product inventory field. Add a variant for size, color, or
          per-SKU stock and dimensions.
        </p>
      ) : (
        variants.map((v) => (
          <div key={v.key} className="grid gap-2 border-t border-line/70 pt-3 first:border-0 first:pt-0">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                placeholder="Label (e.g. Large / Red)"
                value={v.label}
                disabled={disabled}
                onChange={(e) => update(v.key, { label: e.target.value })}
                className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"
              />
              <input
                placeholder="SKU"
                value={v.sku}
                disabled={disabled}
                onChange={(e) => update(v.key, { sku: e.target.value })}
                className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input
                type="number"
                min={0}
                placeholder="Stock"
                value={v.stock}
                disabled={disabled}
                onChange={(e) => update(v.key, { stock: digitsOnly(e.target.value) })}
                className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"
              />
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="Price +₹"
                value={v.priceDelta}
                disabled={disabled}
                onChange={(e) => update(v.key, { priceDelta: decimalOnly(e.target.value) })}
                className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"
              />
              <input
                placeholder="Size"
                value={v.size}
                disabled={disabled}
                onChange={(e) => update(v.key, { size: e.target.value })}
                className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"
              />
              <input
                placeholder="Color"
                value={v.color}
                disabled={disabled}
                onChange={(e) => update(v.key, { color: e.target.value })}
                className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                min={0}
                step="0.1"
                placeholder="L (cm)"
                value={v.lengthCm}
                disabled={disabled}
                onChange={(e) => update(v.key, { lengthCm: decimalOnly(e.target.value) })}
                className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"
              />
              <input
                type="number"
                min={0}
                step="0.1"
                placeholder="B (cm)"
                value={v.breadthCm}
                disabled={disabled}
                onChange={(e) => update(v.key, { breadthCm: decimalOnly(e.target.value) })}
                className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"
              />
              <input
                type="number"
                min={0}
                step="0.1"
                placeholder="H (cm)"
                value={v.heightCm}
                disabled={disabled}
                onChange={(e) => update(v.key, { heightCm: decimalOnly(e.target.value) })}
                className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"
              />
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(variants.filter((row) => row.key !== v.key))}
              className="text-left text-2xs font-semibold text-red-700 underline disabled:opacity-50"
            >
              Remove variant
            </button>
          </div>
        ))
      )}
    </div>
  );
}
