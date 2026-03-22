import type { Metadata } from "next";
import { ShopClient } from "@/components/Shop/ShopClient";
import { getFilteredProducts } from "@/actions/products";

// ISR: rebuild shop listing every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sklep Online | Il Buon Caffe",
  description: "Przeglądaj naszą pełną ofertę: świeżo palone kawy, wina z renomowanych winnic, oliwy, sery i włoskie słodycze. Zamów z dostawą do domu.",
  openGraph: {
    title: "Sklep Online | Il Buon Caffe",
    description: "Kawa, wina, oliwy, słodycze — najwyższa jakość prosto z Włoch i Hiszpanii.",
    type: "website",
    locale: "pl_PL",
  },
  alternates: {
    canonical: "/sklep",
  },
};

export default async function ShopPage() {
  const initialData = await getFilteredProducts({});
  return <ShopClient initialData={initialData} />;
}
