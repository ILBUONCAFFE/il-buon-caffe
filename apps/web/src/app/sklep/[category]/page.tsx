import type { Metadata } from "next";
import { ShopClient } from "@/components/Shop/ShopClient";
import { getFilteredProducts } from "@/actions/products";

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

const normalizeCategorySlug = (category: string) => categorySlugMap[category] || category;

const categoryNames: Record<string, string> = {
  coffee: "Kawa",
  alcohol: "Wino i Alkohole",
  sweets: "Słodycze",
  pantry: "Spiżarnia i Delikatesy",
  kawa: "Kawa",
  wino: "Wino i Alkohole",
  slodycze: "Słodycze",
  spizarnia: "Spiżarnia i Delikatesy",
};

const categoryDescriptions: Record<string, string> = {
  coffee: "Odkryj naszą kolekcję świeżo palonych kaw specialty z najlepszych plantacji świata.",
  alcohol: "Ekskluzywne wina z Włoch, Hiszpanii i Francji. Wyselekcjonowane trunki dla koneserów.",
  sweets: "Tradycyjne włoskie słodycze — cantuccini, panettone, ciocolato i wiele więcej.",
  pantry: "Oliwy, sery, pasty i inne delikatesy prosto z włoskiej i hiszpańskiej spiżarni.",
  kawa: "Odkryj naszą kolekcję świeżo palonych kaw specialty z najlepszych plantacji świata.",
  wino: "Ekskluzywne wina z Włoch, Hiszpanii i Francji. Wyselekcjonowane trunki dla koneserów.",
  slodycze: "Tradycyjne włoskie słodycze — cantuccini, panettone, ciocolato i wiele więcej.",
  spizarnia: "Oliwy, sery, pasty i inne delikatesy prosto z włoskiej i hiszpańskiej spiżarni.",
};

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const normalizedCategory = normalizeCategorySlug(category);
  const title = categoryNames[normalizedCategory] || "Kategoria";
  const description = categoryDescriptions[normalizedCategory] || `Odkryj naszą ofertę w kategorii ${title}. Najwyższa jakość, prosto z Włoch i Hiszpanii.`;
  return {
    title: `${title} | Sklep Il Buon Caffe`,
    description,
    openGraph: {
      title: `${title} | Sklep Il Buon Caffe`,
      description,
      type: "website",
      locale: "pl_PL",
      url: `/sklep/${normalizedCategory}`,
    },
    twitter: {
      card: "summary",
      title: `${title} | Sklep Il Buon Caffe`,
      description,
    },
    alternates: {
      canonical: `/sklep/${normalizedCategory}`,
    },
  };
}

// ISR: rebuild category pages every 5 minutes
export const revalidate = 300;

export async function generateStaticParams() {
  return [
    { category: 'kawa' },
    { category: 'wino' },
    { category: 'slodycze' },
    { category: 'spizarnia' },
  ];
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const normalizedCategory = normalizeCategorySlug(category);
  const initialData = await getFilteredProducts({ category: normalizedCategory });
  return <ShopClient initialData={initialData} />;
}
