"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminApi, type AdminCategory } from "@/lib/api";
import { digitsOnly, validateAll, validateInteger, validateRequired } from "@/lib/validation";

const defaultForm = {
  name: "",
  description: "",
  parentCategory: "",
  sortOrder: "0",
};

function parentId(category: AdminCategory): string | null {
  if (!category.parentCategory) return null;
  if (typeof category.parentCategory === "string") return category.parentCategory;
  return category.parentCategory._id;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showInactive, setShowInactive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.categories({
        includeInactive: showInactive ? "true" : undefined,
        kind: "CATEGORY",
      });
      setCategories(res.data?.categories ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    void load();
  }, [load]);

  const parentOptions = useMemo(() => {
    return categories.filter((c) => c.isActive !== false && (!editingId || c._id !== editingId));
  }, [categories, editingId]);

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const startEdit = (c: AdminCategory) => {
    setEditingId(c._id);
    setForm({
      name: c.name,
      description: c.description ?? "",
      parentCategory: parentId(c) ?? "",
      sortOrder: String(c.sortOrder ?? 0),
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const found = validateAll(
      { name: form.name, sortOrder: form.sortOrder },
      {
        name: validateRequired("Name", 120),
        sortOrder: validateInteger("Sort order", { min: 0, max: 9999 }),
      },
    ) as Record<string, string>;
    setFieldErrors(found);
    if (Object.keys(found).length) {
      setError("Fix the highlighted fields");
      return;
    }

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim(),
      sortOrder: Number(form.sortOrder) || 0,
      kind: "CATEGORY",
      parentCategory: form.parentCategory || null,
    };

    setSubmitting(true);
    try {
      if (editingId) {
        await adminApi.updateCategory(editingId, body);
        setMessage("Category updated.");
      } else {
        await adminApi.createCategory(body);
        setMessage("Category created.");
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save category");
    } finally {
      setSubmitting(false);
    }
  };

  const deactivate = async (id: string) => {
    if (!confirm("Deactivate this category?")) return;
    try {
      await adminApi.deleteCategory(id);
      if (editingId === id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not deactivate category");
    }
  };

  return (
    <div className="shell grid gap-8 py-4 xl:grid-cols-[1fr_1.2fr]">
      <section className="rounded-lg border border-line bg-cream p-6">
        <h2 className="text-lg font-semibold">{editingId ? "Edit category" : "Add category"}</h2>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={`rounded-md border bg-white px-3 py-2 text-sm ${fieldErrors.name ? "border-red-400" : "border-line"}`}
          />
          <textarea
            placeholder="Description"
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          />
          <select
            value={form.parentCategory}
            onChange={(e) => setForm((f) => ({ ...f, parentCategory: e.target.value }))}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="">No parent (top level)</option>
            {parentOptions.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            placeholder="Sort order"
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: digitsOnly(e.target.value) }))}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          {message && <p className="text-sm text-accent-700">{message}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md gradient-accent px-4 py-2 text-sm font-bold text-cream disabled:opacity-60"
            >
              {submitting ? "Saving…" : editingId ? "Update" : "Create"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-line bg-white px-4 py-2 text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-line bg-cream p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Categories</h2>
          <label className="flex items-center gap-2 text-xs text-ink-soft">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show inactive
          </label>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-ink-soft">Loading…</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-2xs uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Parent</th>
                  <th className="py-2 pr-3">Order</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => {
                  const parent =
                    typeof c.parentCategory === "object" && c.parentCategory
                      ? c.parentCategory.name
                      : "—";
                  return (
                    <tr key={c._id} className="border-b border-line/70">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-ink-faint">{c.slug}</p>
                      </td>
                      <td className="py-3 pr-3 text-xs text-ink-soft">{parent}</td>
                      <td className="py-3 pr-3">{c.sortOrder ?? 0}</td>
                      <td className="py-3 pr-3">
                        {c.isActive !== false ? (
                          <span className="text-accent-700">Active</span>
                        ) : (
                          <span className="text-ink-faint">Inactive</span>
                        )}
                      </td>
                      <td className="py-3 text-right text-xs">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="font-semibold text-accent-700 underline"
                        >
                          Edit
                        </button>
                        {c.isActive !== false && (
                          <>
                            {" · "}
                            <button
                              type="button"
                              onClick={() => deactivate(c._id)}
                              className="font-semibold text-red-700 underline"
                            >
                              Deactivate
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
