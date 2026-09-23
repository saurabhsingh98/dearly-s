"use client";

import Image from "next/image";
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
import {
  ProductVariantEditor,
  variantsFromApi,
  variantsToPayload,
  type VariantDraft,
} from "@/components/admin/ProductVariantEditor";
import type { ApiProduct } from "@/lib/api-types";
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
  images?: { url: string; alt?: string }[];
  inventory?: { stock?: number };
  variants?: ApiProduct["variants"];
  category?: { name?: string };
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [catalogFilters, setCatalogFilters] = useState({
    search: "",
    category: "",
    isActive: "",
    isFeatured: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [createVariants, setCreateVariants] = useState<VariantDraft[]>([]);
  const [editingProduct, setEditingProduct] = useState<ApiProduct | null>(null);
  const [editVariants, setEditVariants] = useState<VariantDraft[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
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
    tags: "",
    isFeatured: false,
  });

  const loadCatalog = useCallback(
    async (pageNum = page) => {
      setCatalogLoading(true);
      try {
        const query: Record<string, string | number> = { page: pageNum, limit: 20 };
        if (catalogFilters.search.trim()) query.search = catalogFilters.search.trim();
        if (catalogFilters.category) query.category = catalogFilters.category;
        if (catalogFilters.isActive) query.isActive = catalogFilters.isActive;
        if (catalogFilters.isFeatured === "true") query.isFeatured = "true";

        const prodRes = await adminApi.products(query);
        const prodData = prodRes.data as {
          items?: AdminProduct[];
          pagination?: { totalPages?: number };
        };
        setProducts(prodData.items || []);
        setTotalPages(prodData.pagination?.totalPages ?? 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setCatalogLoading(false);
        setLoading(false);
      }
    },
    [page, catalogFilters],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const catRes = await catalogApi.categories();
        if (!cancelled) {
          const catData = catRes.data as { categories?: CategoryNode[] };
          setCategories(catData.categories || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load categories");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadCatalog(page);
  }, [page, loadCatalog]);

  const applyCatalogFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void loadCatalog(1);
  };

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
      },
      {
        name: validateRequired("Name", 160),
        category: validateRequired("Category"),
        price: validateAmount("Price", { min: 1 }),
        discountPrice: validateAmount("Discount price", { min: 0, required: false }),
        stock: validateInteger("Stock", { min: 0, max: LIMITS.stockMax }),
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

    const variantPayload = variantsToPayload(createVariants);
    if (variantPayload.length) {
      formData.append("variants", JSON.stringify(variantPayload));
      formData.append("inventory", JSON.stringify({ stock: 0 }));
    } else {
      formData.append(
        "inventory",
        JSON.stringify({ stock: Number(form.stock) || 0 }),
      );
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
        tags: "",
        isFeatured: false,
      });
      setCreateVariants([]);
      await loadCatalog(page);
    } catch (err) {
      clearStagedImages();
      setError(err instanceof Error ? err.message : "Could not create product");
    } finally {
      setSubmitting(false);
    }
  };

  const startEditProduct = async (id: string) => {
    setEditLoading(true);
    setError("");
    try {
      const res = await adminApi.product(id);
      const product = res.data?.product;
      if (!product) throw new Error("Product not found");
      setEditingProduct(product);
      setEditVariants(variantsFromApi(product.variants));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load product");
    } finally {
      setEditLoading(false);
    }
  };

  const saveEditVariants = async () => {
    if (!editingProduct) return;
    setEditSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("variants", JSON.stringify(variantsToPayload(editVariants)));
      await adminApi.updateProduct(editingProduct._id, formData);
      setMessage("Variants updated.");
      setEditingProduct(null);
      setEditVariants([]);
      await loadCatalog(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save variants");
    } finally {
      setEditSaving(false);
    }
  };

  const deactivate = async (id: string) => {
    if (!confirm("Deactivate this product?")) return;
    setDeactivatingId(id);
    try {
      await adminApi.deleteProduct(id);
      await loadCatalog(page);
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
          {createVariants.length === 0 && (
            <input
              type="number"
              min={0}
              placeholder="Stock (product-level)"
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: digitsOnly(e.target.value) }))}
              className={`rounded-md border bg-white px-3 py-2 text-sm ${fieldErrors.stock ? "border-red-400" : "border-line"}`}
            />
          )}
          <ProductVariantEditor
            variants={createVariants}
            onChange={setCreateVariants}
            disabled={submitting}
          />
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
        <form
          onSubmit={applyCatalogFilters}
          className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input
            type="search"
            placeholder="Search products"
            value={catalogFilters.search}
            onChange={(e) => setCatalogFilters((f) => ({ ...f, search: e.target.value }))}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm lg:col-span-2"
          />
          <select
            value={catalogFilters.category}
            onChange={(e) => setCatalogFilters((f) => ({ ...f, category: e.target.value }))}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={catalogFilters.isActive}
            onChange={(e) => setCatalogFilters((f) => ({ ...f, isActive: e.target.value }))}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select
            value={catalogFilters.isFeatured}
            onChange={(e) => setCatalogFilters((f) => ({ ...f, isFeatured: e.target.value }))}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="">All products</option>
            <option value="true">Featured only</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold sm:col-span-2 lg:col-span-5"
          >
            Apply filters
          </button>
        </form>
        {catalogLoading && products.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">Loading…</p>
        ) : products.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">No products match your filters.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-2xs tracking-wide text-ink-faint uppercase">
                  <th className="py-2 pr-3">Image</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Stock</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const thumb = p.images?.[0]?.url;
                  const variantStock = p.variants?.reduce((sum, v) => sum + (v.stock ?? 0), 0);
                  const stock =
                    p.variants && p.variants.length > 0
                      ? variantStock
                      : p.inventory?.stock ?? 0;
                  return (
                  <tr key={p._id} className="border-b border-line/70">
                    <td className="py-3 pr-3">
                      <div className="relative size-12 overflow-hidden rounded-md border border-line/80 bg-white">
                        {thumb ? (
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-2xs text-ink-faint">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-ink-soft">{p.category?.name}</p>
                      {p.isFeatured && (
                        <span className="text-2xs font-semibold text-accent-700">Featured</span>
                      )}
                      {(p.variants?.length ?? 0) > 0 && (
                        <p className="text-2xs text-ink-faint">
                          {p.variants!.length} variant{p.variants!.length === 1 ? "" : "s"}
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      {formatInr(p.discountPrice ?? p.price)}
                    </td>
                    <td className="py-3 pr-4">{stock ?? 0}</td>
                    <td className="py-3 pr-4">
                      {p.isActive ? (
                        <span className="text-accent-700">Active</span>
                      ) : (
                        <span className="text-ink-faint">Inactive</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEditProduct(p._id)}
                          disabled={editLoading}
                          className="text-xs font-semibold text-accent-700 underline disabled:opacity-50"
                        >
                          Variants
                        </button>
                        {p.isActive && (
                          <button
                            type="button"
                            onClick={() => deactivate(p._id)}
                            disabled={deactivatingId === p._id}
                            className="text-xs font-semibold text-red-700 underline disabled:opacity-50"
                          >
                            {deactivatingId === p._id ? "…" : "Deactivate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={page <= 1 || catalogLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-line px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-ink-soft">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || catalogLoading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-line px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>

      {editingProduct && (
        <section className="rounded-lg border border-line bg-cream p-6 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">
              Variants — {editingProduct.name}
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setEditVariants([]);
              }}
              className="text-sm text-ink-soft underline"
            >
              Close
            </button>
          </div>
          <div className="mt-4">
            <ProductVariantEditor
              variants={editVariants}
              onChange={setEditVariants}
              disabled={editSaving}
            />
          </div>
          <button
            type="button"
            disabled={editSaving}
            onClick={() => void saveEditVariants()}
            className="mt-4 rounded-md gradient-accent px-4 py-2 text-sm font-bold text-cream disabled:opacity-60"
          >
            {editSaving ? "Saving…" : "Save variants"}
          </button>
        </section>
      )}
    </div>
  );
}
