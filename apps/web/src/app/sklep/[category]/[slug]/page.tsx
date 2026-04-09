import { ProductClient } from "@/components/Product/ProductClient";

import { getProductBySlug, getProducts } from "@/actions/products";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

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

const toAbsoluteUrl = (value?: string) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
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
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Produkt nieznaleziony | Sklep Il Buon Caffe",
      description: "Przepraszamy, szukany produkt nie istnieje.",
      robots: {
        index: false,
        follow: false,
      },
      alternates: {
        canonical: `/sklep/${requestedCategory}/${slug}`,
      },
    };
  }

  const normalizedCategory = normalizeCategorySlug(product.category) || requestedCategory;
  const normalizedSlug = product.slug || slug;
  const canonicalPath = `/sklep/${normalizedCategory}/${normalizedSlug}`;
  const title = `${product.name} | Sklep Il Buon Caffe`;
  const description = product.description || `Kup ${product.name} w sklepie Il Buon Caffe. Najwyższa jakość, szybka dostawa.`;
  const imageUrl = toAbsoluteUrl(product.imageUrl || product.image);
  const ogImagePath = `${canonicalPath}/opengraph-image`;

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
      images: [
        { url: ogImagePath, width: 1200, height: 630, alt: product.name },
        ...(imageUrl ? [{ url: imageUrl, alt: product.name }] : []),
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImagePath],
    },
  };
}

export default async function ProductDetailsPage({ params }: { params: Promise<ProductRouteParams> }) {
  const { slug, category } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  const parsedPrice = Number(product.price);
  const safePrice = Number.isFinite(parsedPrice) ? parsedPrice : 0;

  const normalizedCategory = normalizeCategorySlug(product.category) || normalizeCategorySlug(category);
  const normalizedSlug = product.slug || slug;
  const categoryLabel = categoryLabelMap[normalizedCategory] || normalizedCategory;
  const productUrl = `${BASE_URL}/sklep/${normalizedCategory}/${normalizedSlug}`;
  const productImage = toAbsoluteUrl(product.imageUrl || product.image);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
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
        name: product.name,
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
