import type { Metadata } from "next";
import { ShopClient } from "@/components/Shop/ShopClient";
import { getFilteredProducts } from "@/actions/products";

// ISR: rebuild shop listing every 10 minutes — matches LIST_TTL
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Sklep Online – Włoskie Delikatesy",
  description: "Przeglądaj naszą pełną ofertę: świeżo palone kawy specialty, wina z renomowanych winnic, oliwy extra virgin, sery dojrzewające i włoskie słodycze. Zamów z dostawą do całej Polski.",
  keywords: [
    "sklep włoski online", "włoskie delikatesy online", "kawa specialty sklep",
    "wino włoskie sklep", "oliwa z oliwek sklep", "włoskie produkty online",
    "kup kawę online", "włoskie słodycze sklep", "delikatesy z Włoch",
    "sklep z kawą ziarnistą", "włoskie makarony online", "prezenty z Włoch",
  ],
  openGraph: {
    title: "Sklep Online – Włoskie Delikatesy | Il Buon Caffe",
    description: "Kawa, wina, oliwy, słodycze — najwyższa jakość prosto z Włoch i Hiszpanii. Dostawa do całej Polski.",
    type: "website",
    locale: "pl_PL",
    siteName: "Il Buon Caffe",
    url: "https://ilbuoncaffe.pl/sklep",
    images: [
      {
        url: "https://ilbuoncaffe.pl/assets/kawiarnia.jpg",
        width: 1920,
        height: 998,
        alt: "Sklep Il Buon Caffe – Włoskie Delikatesy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sklep Online – Włoskie Delikatesy | Il Buon Caffe",
    description: "Kawa, wina, oliwy, słodycze — najwyższa jakość prosto z Włoch i Hiszpanii.",
    images: ["https://ilbuoncaffe.pl/assets/kawiarnia.jpg"],
  },
  alternates: {
    canonical: "/sklep",
  },
};

export default async function ShopPage() {
  const initialData = await getFilteredProducts({});
  return <ShopClient initialData={initialData} />;
}
