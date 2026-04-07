import type { MetadataRoute } from "next";
import { getProducts } from "@/actions/products";

const BASE_URL = "https://ilbuoncaffe.pl";

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/sklep", changeFrequency: "daily", priority: 0.9 },
  { path: "/kawiarnia", changeFrequency: "weekly", priority: 0.9 },
  { path: "/encyklopedia", changeFrequency: "weekly", priority: 0.5 },
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

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const products = await getProducts();

  const categorySlugs = new Set<string>(DEFAULT_CATEGORY_SLUGS);

  const productEntries: MetadataRoute.Sitemap = products
    .filter((product) => product.slug)
    .map((product) => {
      const category = normalizeCategorySlug(product.category) || "kawa";
      categorySlugs.add(category);

      return {
        url: `${BASE_URL}/sklep/${category}/${product.slug}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.8,
      };
    });

  const categoryEntries: MetadataRoute.Sitemap = Array.from(categorySlugs).map((category) => ({
    url: `${BASE_URL}/sklep/${category}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const uniqueEntries = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const entry of [...staticEntries, ...categoryEntries, ...productEntries]) {
    uniqueEntries.set(entry.url, entry);
  }

  return Array.from(uniqueEntries.values());
}
