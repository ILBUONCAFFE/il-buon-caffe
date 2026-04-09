import { ProductClient } from "@/components/Product/ProductClient";

import { getProductBySlug, getProducts } from "@/actions/products";
import type { Metadata } from "next";

const BASE_URL = "https://ilbuoncaffe.pl";

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

const categoryLabelMap: Record<string, string> = {
  kawa: "Kawa",
  wino: "Wino i Alkohole",
  slodycze: "Słodycze",
  spizarnia: "Spiżarnia i Delikatesy",
};

const normalizeCategorySlug = (category?: string) => {
  if (!category) return "";
  return categorySlugMap[category] || category;
};

const toAbsoluteUrl = (value?: unknown) => {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${BASE_URL}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
};

type ProductRouteParams = { category: string; slug: string };

// ISR: rebuild product pages at most every hour
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const allProducts = await getProducts();
    return allProducts
      .filter((product) => product.slug)
      .map((product) => ({
        category: normalizeCategorySlug(product.category) || "kawa",
        slug: product.slug!,
      }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<ProductRouteParams> }): Promise<Metadata> {
  const { slug, category } = await params;
  const requestedCategory = normalizeCategorySlug(category);
  const prettySlug = slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const safeName = prettySlug || "Produkt";
  const canonicalPath = `/sklep/${requestedCategory}/${slug}`;
  const title = `${safeName} | Sklep Il Buon Caffe`;
  const description = `Kup ${safeName} w sklepie Il Buon Caffe. Najwyższa jakość, szybka dostawa.`;
  const defaultOgImage = `${BASE_URL}/assets/kawiarnia.jpg`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "pl_PL",
      siteName: "Il Buon Caffe",
      url: canonicalPath,
      images: [{ url: defaultOgImage, width: 1920, height: 998, alt: safeName }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [defaultOgImage],
    },
  };
}

export default async function ProductDetailsPage({ params }: { params: Promise<ProductRouteParams> }) {
  const { slug, category } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return <ProductClient initialProduct={null} />;
  }

  const parsedPrice = Number(product.price);
  const safePrice = Number.isFinite(parsedPrice) ? parsedPrice : 0;
  const safeName = typeof product.name === "string" && product.name.trim() ? product.name : "Produkt";
  const safeDescription = typeof product.description === "string" ? product.description : "";

  const normalizedCategory = normalizeCategorySlug(product.category) || normalizeCategorySlug(category);
  const normalizedSlug = product.slug || slug;
  const categoryLabel = categoryLabelMap[normalizedCategory] || normalizedCategory || "Sklep";
  const productUrl = `${BASE_URL}/sklep/${normalizedCategory}/${normalizedSlug}`;
  const productImage = toAbsoluteUrl(product.imageUrl || product.image);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: safeName,
    description: safeDescription,
    sku: product.sku,
    category: categoryLabel,
    image: productImage ? [productImage] : undefined,
    brand: {
      "@type": "Brand",
      name: "Il Buon Caffe",
    },
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
      {
        "@type": "ListItem",
        position: 1,
        name: "Sklep",
        item: `${BASE_URL}/sklep`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: categoryLabel,
        item: `${BASE_URL}/sklep/${normalizedCategory}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: safeName,
        item: productUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductClient initialProduct={product} />
    </>
  );
}
