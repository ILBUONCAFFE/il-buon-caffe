import type { Metadata } from "next";
import HomeClient from "@/components/Home/HomeClient";

// ISR: rebuild home page at most every 30 minutes
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Il Buon Caffe – Włoska Kawiarnia w Koszalinie",
  description: "Prawdziwa włoska kawiarnia w Koszalinie. Zapraszamy na doskonałe espresso, świeżo palone kawy specialty i włoskie wypieki domowej roboty. Poczuj smak prawdziwego dolce vita.",
  keywords: [
    "kawiarnia Koszalin", "włoska kawiarnia Koszalin", "espresso Koszalin",
    "kawa specialty Koszalin", "cappuccino Koszalin", "Il Buon Caffe",
    "kawa Koszalin", "sklep włoski Koszalin", "delikatesy włoskie Koszalin",
  ],
  openGraph: {
    title: "Il Buon Caffe – Włoska Kawiarnia i Sklep Online w Koszalinie",
    description: "Prawdziwa włoska kawiarnia w Koszalinie. Doskonałe espresso, kawy specialty, sklep z włoskimi delikatesami i dostawa do całej Polski.",
    type: "website",
    locale: "pl_PL",
    siteName: "Il Buon Caffe",
    url: "https://ilbuoncaffe.pl",
    images: [
      {
        url: "https://ilbuoncaffe.pl/assets/kawiarnia.jpg",
        width: 1920,
        height: 998,
        alt: "Wnętrze kawiarni Il Buon Caffe w Koszalinie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Il Buon Caffe – Włoska Kawiarnia w Koszalinie",
    description: "Prawdziwa włoska kawiarnia w Koszalinie. Espresso, kawy specialty i włoskie wypieki.",
    images: ["https://ilbuoncaffe.pl/assets/kawiarnia.jpg"],
  },
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <HomeClient />;
}
