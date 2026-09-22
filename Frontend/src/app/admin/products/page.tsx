"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, catalogApi } from "@/lib/api";
import {
  AdminProductImageUpload,
  useAdminProductImages,
} from "@/components/admin/AdminProductImageUpload";
import {
  LIMITS,
  decimalOnly,
  digitsOnly,
  validateAll,
  validateAmount,
  validateInteger,
  validateRequired,
} from "@/lib/validation";
import { formatInr } from "@/lib/admin-constants";

type CategoryNode = {
  _id: string;
  name: string;
  children?: CategoryNode[];
};

type AdminProduct = {
  _id: string;
  name: string;
  slug: string;
  price: number;
  discountPrice?: number;
  isActive: boolean;
  isFeatured: boolean;
  inventory?: { stock?: number };
  category?: { name?: string };
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const {
    items: stagedImages,
    addFiles,
    remove: removeImage,
    readyPayload,
    clearLocal: clearStagedImages,
    hasUploading,
  } = useAdminProductImages();

  const [form, setForm] = useState({
    name: "",
    description: "",
    shortDescription: "",
    category: "",
    price: "",
    discountPrice: "",
    stock: "0",
    lengthCm: "",
    breadthCm: "",
    heightCm: "",
    tags: "",
    isFeatured: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        adminApi.products("limit=50"),
        catalogApi.categories(),
      ]);
      const prodData = prodRes.data as { items?: AdminProduct[] };
      const catData = catRes.data as { categories?: CategoryNode[] };
      setProducts(prodData.items || []);
      setCategories(catData.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flatCategories = (nodes: CategoryNode[], depth = 0): { id: string; label: string }[] =>
    nodes.flatMap((n) => [
      { id: n._id, label: `${"—".repeat(depth)} ${n.name}`.trim() },
      ...(n.children ? flatCategories(n.children, depth + 1) : []),
    ]);

  const categoryOptions = flatCategories(categories);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const found = validateAll(
      {
        name: form.name,
        category: form.category,
        price: form.price,
        discountPrice: form.discountPrice,
        stock: form.stock,
        lengthCm: form.lengthCm,
        breadthCm: form.breadthCm,
        heightCm: form.heightCm,
      },
      {
        name: validateRequired("Name", 160),
        category: validateRequired("Category"),
        price: validateAmount("Price", { min: 1 }),
        discountPrice: validateAmount("Discount price", { min: 0, required: false }),
        stock: validateInteger("Stock", { min: 0, max: LIMITS.stockMax }),
        lengthCm: validateAmount("Length", { min: 0, required: false }),
        breadthCm: validateAmount("Breadth", { min: 0, required: false }),
        heightCm: validateAmount("Height", { min: 0, required: false }),
      },
    ) as Record<string, string>;
    if (form.discountPrice && Number(form.discountPrice) >= Number(form.price)) {
      found.discountPrice = "Discount price must be below the price";
    }
    setFieldErrors(found);
    if (Object.keys(found).length) {
      setError("Fix the highlighted fields");
      return;
    }

    if (hasUploading) {
      setError("Wait for image uploads to finish");
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name.trim());
    formData.append("description", form.description.trim());
    if (form.shortDescription.trim()) {
      formData.append("shortDescription", form.shortDescription.trim());
    }
    formData.append("category", form.category);
    formData.append("price", form.price);
    if (form.discountPrice) formData.append("discountPrice", form.discountPrice);
    formData.append("isFeatured", String(form.isFeatured));
    formData.append(
      "inventory",
      JSON.stringify({ stock: Number(form.stock) || 0 })
    );

    const dimensions: Record<string, number> = {};
    if (form.lengthCm) dimensions.lengthCm = Number(form.lengthCm);
    if (form.breadthCm) dimensions.breadthCm = Number(form.breadthCm);
    if (form.heightCm) dimensions.heightCm = Number(form.heightCm);
    if (Object.keys(dimensions).length) {
      formData.append("variants", JSON.stringify([{ label: "Default", dimensions }]));
    }

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length) formData.append("tags", JSON.stringify(tags));

    const imagePayload = readyPayload();
    if (imagePayload.length) {
      formData.append("images", JSON.stringify(imagePayload));
    }

    setSubmitting(true);
    try {
      await adminApi.createProduct(formData);
      setMessage("Product created.");
      clearStagedImages();
      setForm({
        name: "",
        description: "",
        shortDescription: "",
        category: form.category,
        price: "",
        discountPrice: "",
        stock: "0",
        lengthCm: "",
        breadthCm: "",
        heightCm: "",
        tags: "",
        isFeatured: false,
      });
      await load();
    } catch (err) {
      clearStagedImages();
      setError(err instanceof Error ? err.message : "Could not create product");
    } finally {
      setSubmitting(false);
    }
  };

  const deactivate = async (id: string) => {
    if (!confirm("Deactivate this product?")) return;
    setDeactivatingId(id);
    try {
      await adminApi.deleteProduct(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not deactivate product");
    } finally {
      setDeactivatingId(null);
    }
  };

  return (
    <div className="shell grid gap-8 py-10 xl:grid-cols-[1fr_1.1fr]">
      <section className="rounded-lg border border-line bg-cream p-6">
        <h2 className="text-lg font-semibold">Add product</h2>
        <p className="mt-1 text-xs text-ink-soft">
          Images upload immediately via the admin API; previews show before you create the product.
        </p>
        <form onSubmit={onCreate} className="mt-4 flex flex-col gap-3">
          <input
            required
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          />
          <input
            placeholder="Short description"
            value={form.shortDescription}
            onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          />
          <select
            required
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="">Select category</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              type="number"
              min={0}
              placeholder="Price (INR)"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: decimalOnly(e.target.value) }))}
              className={`rounded-md border bg-white px-3 py-2 text-sm ${fieldErrors.price ? "border-red-400" : "border-line"}`}
            />
            <input
              type="number"
              min={0}
              placeholder="Discount price"
              value={form.discountPrice}
              onChange={(e) => setForm((f) => ({ ...f, discountPrice: decimalOnly(e.target.value) }))}
              className={`rounded-md border bg-white px-3 py-2 text-sm ${fieldErrors.discountPrice ? "border-red-400" : "border-line"}`}
            />
          </div>
          <input
            type="number"
            min={0}
            placeholder="Stock"
            value={form.stock}
            onChange={(e) => setForm((f) => ({ ...f, stock: digitsOnly(e.target.value) }))}
            className={`rounded-md border bg-white px-3 py-2 text-sm ${fieldErrors.stock ? "border-red-400" : "border-line"}`}
          />
          <p className="text-xs font-medium text-ink">Package size (cm) — for shipping</p>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              min={0}
              step="0.1"
              placeholder="Length (L)"
              value={form.lengthCm}
              onChange={(e) => setForm((f) => ({ ...f, lengthCm: decimalOnly(e.target.value) }))}
              className={`rounded-md border bg-white px-3 py-2 text-sm ${fieldErrors.lengthCm ? "border-red-400" : "border-line"}`}
            />
            <input
              type="number"
              min={0}
              step="0.1"
              placeholder="Breadth (B)"
              value={form.breadthCm}
              onChange={(e) => setForm((f) => ({ ...f, breadthCm: decimalOnly(e.target.value) }))}
              className={`rounded-md border bg-white px-3 py-2 text-sm ${fieldErrors.breadthCm ? "border-red-400" : "border-line"}`}
            />
            <input
              type="number"
              min={0}
              step="0.1"
              placeholder="Height (H)"
              value={form.heightCm}
              onChange={(e) => setForm((f) => ({ ...f, heightCm: decimalOnly(e.target.value) }))}
              className={`rounded-md border bg-white px-3 py-2 text-sm ${fieldErrors.heightCm ? "border-red-400" : "border-line"}`}
            />
          </div>
          <input
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          />
          <AdminProductImageUpload
            items={stagedImages}
            onAddFiles={addFiles}
            onRemove={removeImage}
            disabled={submitting}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
            />
            Featured on homepage
          </label>
          {message && <p className="text-sm text-accent-700">{message}</p>}
          {error && <p className="text-sm text-accent-700">{error}</p>}
          <button
            type="submit"
            disabled={submitting || loading || hasUploading}
            className="rounded-md gradient-accent px-4 py-2.5 text-sm font-bold text-cream disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create product"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-line bg-cream p-6">
        <h2 className="text-lg font-semibold">Catalog</h2>
        {loading ? (
          <p className="mt-4 text-sm text-ink-soft">Loading…</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-2xs tracking-wide text-ink-faint uppercase">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Stock</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className="border-b border-line/70">
                    <td className="py-3 pr-4">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-ink-soft">{p.category?.name}</p>
                    </td>
                    <td className="py-3 pr-4">
                      {formatInr(p.discountPrice ?? p.price)}
                    </td>
                    <td className="py-3 pr-4">{p.inventory?.stock ?? 0}</td>
                    <td className="py-3 pr-4">
                      {p.isActive ? (
                        <span className="text-accent-700">Active</span>
                      ) : (
                        <span className="text-ink-faint">Inactive</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {p.isActive && (
                        <button
                          type="button"
                          onClick={() => deactivate(p._id)}
                          disabled={deactivatingId === p._id}
                          className="text-xs font-semibold text-accent-700 underline disabled:opacity-50"
                        >
                          {deactivatingId === p._id ? "…" : "Deactivate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
