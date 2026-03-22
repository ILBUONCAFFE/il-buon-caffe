import type { Metadata } from "next";
import { ShopClient } from "@/components/Shop/ShopClient";
import { getFilteredProducts } from "@/actions/products";

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
  const title = categoryNames[category] || "Kategoria";
  const description = categoryDescriptions[category] || `Odkryj naszą ofertę w kategorii ${title}. Najwyższa jakość, prosto z Włoch i Hiszpanii.`;
  return {
    title: `${title} | Sklep Il Buon Caffe`,
    description,
    openGraph: {
      title: `${title} | Sklep Il Buon Caffe`,
      description,
      type: "website",
      locale: "pl_PL",
    },
    alternates: {
      canonical: `/sklep/${category}`,
    },
  };
}

// ISR: rebuild category pages every 5 minutes
export const revalidate = 300;

export async function generateStaticParams() {
  return [
    { category: 'coffee' },
    { category: 'alcohol' },
    { category: 'sweets' },
    { category: 'pantry' },
  ];
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const initialData = await getFilteredProducts({ category });
  return <ShopClient initialData={initialData} />;
}
