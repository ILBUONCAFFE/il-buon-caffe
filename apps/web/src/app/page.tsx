import type { Metadata } from "next";
import HomeClient from "@/components/Home/HomeClient";

// ISR: rebuild home page at most every 30 minutes
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Il Buon Caffe – Włoska Kawiarnia w Koszalinie",
  description: "Prawdziwa włoska kawiarnia w Koszalinie. Zapraszamy na doskonałe espresso, świeżo palone kawy specialty i włoskie wypieki domowej roboty. Poczuj smak prawdziwego dolce vita.",
  openGraph: {
    title: "Il Buon Caffe – Włoska Kawiarnia w Koszalinie",
    description: "Prawdziwa włoska kawiarnia w Koszalinie. Doskonałe espresso, kawy specialty i włoskie wypieki.",
    type: "website",
    locale: "pl_PL",
  },
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <HomeClient />;
}
