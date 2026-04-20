import { ProductClient } from "@/components/Product/ProductClient";
import { ShopClient } from "@/components/Shop/ShopClient";
import { getProductBySlug, getProducts, getFilteredProducts } from "@/actions/products";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const BASE_URL = "https://ilbuoncaffe.pl";

const KNOWN_CATEGORIES = new Set(["kawa", "wino", "slodycze", "spizarnia", "coffee", "alcohol", "sweets", "pantry"]);

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

const categoryNameMap: Record<string, string> = {
  kawa: "Kawa",
  wino: "Wino i Alkohole",
  slodycze: "Słodycze",
  spizarnia: "Spiżarnia i Delikatesy",
};

const categoryDescriptionMap: Record<string, string> = {
  kawa: "Odkryj naszą kolekcję świeżo palonych kaw specialty z najlepszych plantacji świata.",
  wino: "Ekskluzywne wina z Włoch, Hiszpanii i Francji. Wyselekcjonowane trunki dla koneserów.",
  slodycze: "Tradycyjne włoskie słodycze — cantuccini, panettone, ciocolato i wiele więcej.",
  spizarnia: "Oliwy, sery, pasty i inne delikatesy prosto z włoskiej i hiszpańskiej spiżarni.",
};

const normalizeCategorySlug = (slug: string) => categorySlugMap[slug] || slug;

const toAbsoluteUrl = (value?: unknown) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${BASE_URL}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
};

// ISR: rebuild at most every hour
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const categorySlugs = ["kawa", "wino", "slodycze", "spizarnia"].map((slug) => ({ slug }));
  try {
    const allProducts = await getProducts();
    const productSlugs = allProducts
      .filter((p) => p.slug)
      .map((p) => ({ slug: p.slug! }));
    return [...categorySlugs, ...productSlugs];
  } catch {
    return categorySlugs;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = normalizeCategorySlug(slug);

  if (KNOWN_CATEGORIES.has(slug)) {
    const title = categoryNameMap[normalizedSlug] || "Kategoria";
    const description = categoryDescriptionMap[normalizedSlug] || `Odkryj naszą ofertę w kategorii ${title}. Najwyższa jakość, prosto z Włoch i Hiszpanii.`;
    return {
      title: `${title} – Sklep Online`,
      description,
      openGraph: {
        title: `${title} | Sklep Il Buon Caffe`,
        description,
        type: "website",
        locale: "pl_PL",
        siteName: "Il Buon Caffe",
        url: `${BASE_URL}/sklep/${normalizedSlug}`,
        images: [{ url: `${BASE_URL}/assets/kawiarnia.jpg`, width: 1920, height: 998, alt: `${title} – Il Buon Caffe` }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | Sklep Il Buon Caffe`,
        description,
        images: [`${BASE_URL}/assets/kawiarnia.jpg`],
      },
      alternates: { canonical: `/sklep/${normalizedSlug}` },
    };
  }

  // Product metadata: best-effort DB lookup with safe fallback to slug-based metadata.
  // All failures are swallowed to avoid metadata exceptions taking down requests.
  let product: Awaited<ReturnType<typeof getProductBySlug>> = null;
  try {
    product = await getProductBySlug(slug);
  } catch {
    product = null;
  }

  const prettySlug = slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const safeName =
    typeof product?.name === "string" && product.name.trim()
      ? product.name.trim()
      : prettySlug || "Produkt";
  const canonicalSlug =
    typeof product?.slug === "string" && product.slug.trim()
      ? product.slug
      : slug;
  const canonicalPath = `/sklep/${canonicalSlug}`;
  const title = `${safeName} | Sklep Il Buon Caffe`;
  const description =
    typeof product?.description === "string" && product.description.trim()
      ? product.description.trim()
      : `Kup ${safeName} w sklepie Il Buon Caffe. Najwyższa jakość, szybka dostawa.`;
  const productImage = toAbsoluteUrl(product?.imageUrl || product?.image) || `${BASE_URL}/assets/kawiarnia.jpg`;

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: product
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "pl_PL",
      siteName: "Il Buon Caffe",
      url: `${BASE_URL}${canonicalPath}`,
      images: [{ url: productImage, width: 1920, height: 998, alt: safeName }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [productImage],
    },
  };
}

export default async function ShopRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalizedSlug = normalizeCategorySlug(slug);

  // Category page
  if (KNOWN_CATEGORIES.has(slug)) {
    const initialData = await getFilteredProducts({ category: normalizedSlug });
    return <ShopClient initialData={initialData} />;
  }

  // Product page
  let product = null;
  try {
    product = await getProductBySlug(slug);
  } catch {
    // fall through to null render
  }

  if (!product) {
    notFound();
  }

  const parsedPrice = Number(product.price);
  const safePrice = Number.isFinite(parsedPrice) ? parsedPrice : 0;
  const safeName = typeof product.name === "string" && product.name.trim() ? product.name : "Produkt";
  const safeDescription = typeof product.description === "string" ? product.description : "";
  const normalizedCategory = normalizeCategorySlug(product.category || "");
  const categoryLabel = categoryNameMap[normalizedCategory] || normalizedCategory || "Sklep";
  const categoryUrl = normalizedCategory ? `${BASE_URL}/sklep/${normalizedCategory}` : `${BASE_URL}/sklep`;
  const productUrl = `${BASE_URL}/sklep/${product.slug || slug}`;
  const productImage = toAbsoluteUrl(product.imageUrl || product.image);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: safeName,
    description: safeDescription,
    sku: product.sku,
    category: categoryLabel,
    image: productImage ? [productImage] : undefined,
    brand: { "@type": "Brand", name: "Il Buon Caffe" },
    offers: {
      "@type": "Offer",
      priceCurrency: "PLN",
      price: safePrice.toFixed(2),
      availability:
        typeof product.stock === "number" && product.stock <= 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      url: productUrl,
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Sklep", item: `${BASE_URL}/sklep` },
      { "@type": "ListItem", position: 2, name: categoryLabel, item: categoryUrl },
      { "@type": "ListItem", position: 3, name: safeName, item: productUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <ProductClient initialProduct={product} />
    </>
  );
}
