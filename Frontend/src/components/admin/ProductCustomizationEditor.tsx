"use client";

import type { ApiCustomizationField, CustomizationFieldType } from "@/lib/api-types";

const FIELD_TYPES: CustomizationFieldType[] = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "SELECT",
  "IMAGE",
];

export type CustomizationFieldDraft = {
  key: string;
  name: string;
  type: CustomizationFieldType;
  required: boolean;
  placeholder: string;
  options: string;
};

export function newCustomizationFieldDraft(): CustomizationFieldDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    type: "TEXT",
    required: false,
    placeholder: "",
    options: "",
  };
}

export function customizationFieldsFromApi(
  fields: ApiCustomizationField[] = [],
): CustomizationFieldDraft[] {
  return fields.map((f) => ({
    key: crypto.randomUUID(),
    name: f.name,
    type: f.type,
    required: Boolean(f.required),
    placeholder: f.placeholder ?? "",
    options: (f.options ?? []).join(", "),
  }));
}

export function customizationFieldsToPayload(rows: CustomizationFieldDraft[]) {
  return rows
    .filter((r) => r.name.trim())
    .map((r) => {
      const payload: Record<string, unknown> = {
        name: r.name.trim(),
        type: r.type,
        required: r.required,
      };
      if (r.placeholder.trim()) payload.placeholder = r.placeholder.trim();
      if (r.type === "SELECT") {
        const options = r.options
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean);
        if (options.length) payload.options = options;
      }
      return payload;
    });
}

type Props = {
  fields: CustomizationFieldDraft[];
  onChange: (fields: CustomizationFieldDraft[]) => void;
  disabled?: boolean;
};

export function ProductCustomizationEditor({ fields, onChange, disabled }: Props) {
  return (
    <div className="grid gap-3 rounded-md border border-line bg-white/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink">Personalisation fields</p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([...fields, newCustomizationFieldDraft()])}
          className="text-xs font-semibold text-accent-700 underline disabled:opacity-50"
        >
          Add field
        </button>
      </div>
      {fields.length === 0 ? (
        <p className="text-xs text-ink-soft">
          No customisation — customers only pick variants. Add fields for engraving, messages,
          uploads, etc.
        </p>
      ) : (
        fields.map((f) => (
          <div key={f.key} className="grid gap-2 border-t border-line/70 pt-3 first:border-0 first:pt-0">
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                placeholder="Field name (e.g. Engraving)"
                value={f.name}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    fields.map((row) =>
                      row.key === f.key ? { ...row, name: e.target.value } : row,
                    ),
                  )
                }
                className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"
              />
              <select
                value={f.type}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    fields.map((row) =>
                      row.key === f.key
                        ? { ...row, type: e.target.value as CustomizationFieldType }
                        : row,
                    ),
                  )
                }
                className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <input
              placeholder="Placeholder hint (optional)"
              value={f.placeholder}
              disabled={disabled}
              onChange={(e) =>
                onChange(
                  fields.map((row) =>
                    row.key === f.key ? { ...row, placeholder: e.target.value } : row,
                  ),
                )
              }
              className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"
            />
            {f.type === "SELECT" && (
              <input
                placeholder="Options (comma separated)"
                value={f.options}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    fields.map((row) =>
                      row.key === f.key ? { ...row, options: e.target.value } : row,
                    ),
                  )
                }
                className="rounded-md border border-line bg-white px-2 py-1.5 text-xs"
              />
            )}
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={f.required}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    fields.map((row) =>
                      row.key === f.key ? { ...row, required: e.target.checked } : row,
                    ),
                  )
                }
              />
              Required before add to cart
            </label>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(fields.filter((row) => row.key !== f.key))}
              className="text-left text-2xs font-semibold text-red-700 underline"
            >
              Remove field
            </button>
          </div>
        ))
      )}
    </div>
  );
}
