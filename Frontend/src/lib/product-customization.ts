import type { ProductCustomizationField } from "@/lib/types";
import type { ApiCartCustomization } from "@/lib/api-types";

export type CustomizationValues = Record<string, string>;

export type CustomizationImagePublicIds = Record<string, string>;

export function validateCustomizationInput(
  fields: ProductCustomizationField[],
  values: CustomizationValues,
  imagePublicIds?: CustomizationImagePublicIds,
): string | null {
  for (const field of fields) {
    const raw = values[field.name]?.trim() ?? "";
    if (field.type === "IMAGE") {
      if (field.required && !raw) {
        return `"${field.name}" is required`;
      }
      if (raw && !imagePublicIds?.[field.name]) {
        return `Wait for "${field.name}" to finish uploading, or choose a new image`;
      }
      continue;
    }
    if (field.required && !raw) {
      return `"${field.name}" is required`;
    }
    if (field.type === "SELECT" && raw && field.options?.length && !field.options.includes(raw)) {
      return `Pick a valid option for "${field.name}"`;
    }
  }
  return null;
}

export function buildCustomizationPayload(
  fields: ProductCustomizationField[],
  values: CustomizationValues,
  imagePublicIds?: CustomizationImagePublicIds,
): ApiCartCustomization[] {
  return fields
    .map((field) => {
      const value = values[field.name]?.trim();
      if (!value) return null;
      const entry: ApiCartCustomization = {
        name: field.name,
        type: field.type,
        value,
      };
      if (field.type === "IMAGE") {
        entry.imageUrl = value;
        const publicId = imagePublicIds?.[field.name];
        if (publicId) entry.imagePublicId = publicId;
      }
      return entry;
    })
    .filter(Boolean) as ApiCartCustomization[];
}

export function emptyCustomizationValues(fields: ProductCustomizationField[]): CustomizationValues {
  return Object.fromEntries(fields.map((f) => [f.name, ""]));
}

export function productRequiresCustomization(product: {
  customizationFields?: ProductCustomizationField[];
}): boolean {
  return (product.customizationFields?.length ?? 0) > 0;
}
