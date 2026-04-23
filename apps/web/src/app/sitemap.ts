import type { MetadataRoute } from "next";
import { getProducts } from "@/actions/products";

const BASE_URL = "https://ilbuoncaffe.pl";

// Site launch date — used as stable lastModified for static routes so Bing
// doesn't see them as "updated" on every rebuild. Update when content changes.
const SITE_LAUNCH_DATE = new Date("2025-03-01T00:00:00.000Z");

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
  lastModified?: Date;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/sklep", changeFrequency: "daily", priority: 0.9 },
  { path: "/kawiarnia", changeFrequency: "weekly", priority: 0.9 },
  { path: "/o-nas", changeFrequency: "monthly", priority: 0.6 },
  { path: "/kontakt", changeFrequency: "monthly", priority: 0.5 },
  { path: "/regulamin", changeFrequency: "monthly", priority: 0.4 },
  { path: "/polityka-prywatnosci", changeFrequency: "monthly", priority: 0.4 },
  { path: "/polityka-cookies", changeFrequency: "monthly", priority: 0.4 },
];

const DEFAULT_CATEGORY_SLUGS = ["kawa", "wino", "slodycze", "spizarnia"];

const categorySlugMap: Record<string, string> = {
  coffee: "kawa",
  alcohol: "wino",
  sweets: "slodycze",
  pantry: "spizarnia",
  kawa: "kawa",
  wino: "wino",
  slodycze: "slodycze",
  spizarnia: "spizarnia",
};

const normalizeCategorySlug = (category?: string) => {
  if (!category) return "";
  return categorySlugMap[category] || category;
};

const parseDateOrFallback = (value: unknown, fallback: Date): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return fallback;
};

const toAbsoluteUrl = (value?: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${BASE_URL}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
};

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const products = await getProducts();

  const categorySlugs = new Set<string>(DEFAULT_CATEGORY_SLUGS);
  const categoryLastModified = new Map<string, Date>();

  const productEntries: MetadataRoute.Sitemap = products
    .filter((product) => product.slug)
    .map((product) => {
      const category = normalizeCategorySlug(product.category) || "kawa";
      const lastModified = parseDateOrFallback(product.updatedAt ?? product.createdAt, now);

      categorySlugs.add(category);
      const prevCategoryLastModified = categoryLastModified.get(category);
      if (!prevCategoryLastModified || lastModified > prevCategoryLastModified) {
        categoryLastModified.set(category, lastModified);
      }

      const imageUrl = toAbsoluteUrl(product.imageUrl || product.image);

      return {
        url: `${BASE_URL}/sklep/${product.slug}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        // images field helps Bing discover and index product images
        ...(imageUrl && {
          images: [imageUrl],
        }),
      };
    });

  const categoryEntries: MetadataRoute.Sitemap = Array.from(categorySlugs).map((category) => ({
    url: `${BASE_URL}/sklep/${category}`,
    lastModified: categoryLastModified.get(category) ?? now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    // Use stable launch date for pages that don't change dynamically,
    // so Bing doesn't treat every build as a content update.
    lastModified: route.lastModified ?? SITE_LAUNCH_DATE,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const uniqueEntries = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of [...staticEntries, ...categoryEntries, ...productEntries]) {
    uniqueEntries.set(entry.url, entry);
  }

  return Array.from(uniqueEntries.values());
}
