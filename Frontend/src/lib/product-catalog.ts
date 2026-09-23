import type { CatalogQuery } from "@/lib/catalog";
import type { Product, ProductArt } from "@/lib/types";

export type ApiCategoryNode = {
  _id: string;
  name: string;
  slug: string;
  children?: ApiCategoryNode[];
};

type ApiTaxonomyRef = { _id: string; name: string; slug: string };

export type ApiProductListItem = {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  shortDescription?: string;
  price: number;
  discountPrice?: number;
  tags?: string[];
  rating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  inventory?: { stock?: number };
  customizationFields?: unknown[];
  images?: { url: string; alt?: string }[];
  category?: ApiTaxonomyRef;
  subCategory?: ApiTaxonomyRef;
  occasions?: ApiTaxonomyRef[];
  badge?: string;
  deliveryEta?: string;
  highlights?: string[];
  specs?: { label: string; value: string }[];
  art?: { from?: string; to?: string; motif?: string; pattern?: string };
  variants?: {
    _id: string;
    label?: string;
    swatch?: string;
    sku?: string;
    priceDelta?: number;
    price?: number;
    stock?: number;
    attributes?: { size?: string; color?: string; material?: string };
    dimensions?: { lengthCm?: number; breadthCm?: number; heightCm?: number };
  }[];
};

export type ApiProductListResult = {
  items: ApiProductListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function flattenCategories(nodes: ApiCategoryNode[]): ApiCategoryNode[] {
  return nodes.flatMap((node) => [
    node,
    ...(node.children ? flattenCategories(node.children) : []),
  ]);
}

export function findCategoryIdBySlug(
  tree: ApiCategoryNode[],
  slug: string,
): string | undefined {
  return flattenCategories(tree).find((c) => c.slug === slug)?._id;
}

function artFromSlug(slug: string): ProductArt {
  const hue = slug.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 360;
  return {
    from: `hsl(${hue} 48% 96%)`,
    to: `hsl(${hue} 52% 86%)`,
    motif: "gift",
    pattern: "dots",
  };
}

export function mapApiProductToProduct(item: ApiProductListItem): Product {
  const mrpPaise = Math.round(item.price * 100);
  const hasDiscount =
    item.discountPrice != null && item.discountPrice < item.price;
  const salePaise = hasDiscount
    ? Math.round(item.discountPrice! * 100)
    : mrpPaise;

  const fallbackArt = artFromSlug(item.slug);

  const hasVariants = (item.variants?.length ?? 0) > 0;
  const variantStock = (item.variants ?? []).reduce((sum, v) => sum + (v.stock ?? 0), 0);

  return {
    id: item._id,
    slug: item.slug,
    name: item.name,
    tagline: item.shortDescription || "",
    description: item.description || "",
    price: salePaise,
    compareAt: hasDiscount ? mrpPaise : undefined,
    categoryId: item.category?._id ?? "",
    subcategoryId: item.subCategory?._id ?? item.category?._id ?? "",
    occasionIds: (item.occasions ?? []).map((o) => o._id),
    tags: item.tags ?? [],
    rating: item.rating ?? 0,
    reviewCount: item.reviewCount ?? 0,
    stock: hasVariants ? variantStock : item.inventory?.stock ?? 0,
    badge: item.badge || (item.isFeatured ? "Featured" : undefined),
    art: {
      from: item.art?.from || fallbackArt.from,
      to: item.art?.to || fallbackArt.to,
      motif: item.art?.motif || fallbackArt.motif,
      pattern: (item.art?.pattern as ProductArt["pattern"]) || fallbackArt.pattern,
    },
    variants: hasVariants
      ? item.variants!.map((v) => ({
          id: v._id,
          label: v.label || "Option",
          swatch: v.swatch,
          sku: v.sku,
          stock: v.stock,
          size: v.attributes?.size,
          color: v.attributes?.color,
          material: v.attributes?.material,
          lengthCm: v.dimensions?.lengthCm,
          breadthCm: v.dimensions?.breadthCm,
          heightCm: v.dimensions?.heightCm,
          priceDelta: v.priceDelta ? Math.round(v.priceDelta * 100) : undefined,
        }))
      : undefined,
    highlights: item.highlights ?? [],
    specs: item.specs ?? [],
    personalisable: (item.customizationFields?.length ?? 0) > 0,
    deliveryEta: item.deliveryEta || "3–5 days",
    image: item.images?.[0]?.url,
    images: (item.images ?? []).map((i) => i.url).filter(Boolean),
  };
}

export function catalogQueryToApiParams(query: CatalogQuery): string {
  const params = new URLSearchParams();
  params.set("limit", "100");

  if (query.q) params.set("search", query.q);
  if (query.subcategory) params.set("subCategory", query.subcategory);
  else if (query.category) params.set("category", query.category);
  if (query.occasion) params.set("occasion", query.occasion);
  if (query.personalised) params.set("personalised", "true");

  if (query.min != null) params.set("minPrice", String(query.min / 100));
  if (query.max != null) params.set("maxPrice", String(query.max / 100));

  switch (query.sort) {
    case "price-asc":
      params.set("sort", "price_asc");
      break;
    case "price-desc":
      params.set("sort", "price_desc");
      break;
    case "rating":
      params.set("sort", "rating_desc");
      break;
    case "newest":
      params.set("sort", "newest");
      break;
    default:
      break;
  }

  return params.toString();
}

/** Client sort when the API has no matching sort (e.g. “featured” = boost, not filter). */
export function sortCatalogProducts(
  items: Product[],
  sort: CatalogQuery["sort"],
): Product[] {
  const list = [...items];
  if (sort === "featured") {
    return list.sort(
      (a, b) =>
        Number(Boolean(b.badge)) - Number(Boolean(a.badge)) ||
        b.rating - a.rating ||
        b.reviewCount - a.reviewCount,
    );
  }
  return list;
}
