import type { Metadata } from "next";
import HomeClient from "@/components/Home/HomeClient";

// ISR: rebuild home page at most every 30 minutes
export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Il Buon Caffe | Kawa, Wino i Włoskie Specjały",
  description: "Odkryj świat luksusowych smaków. Oferujemy najwyższej jakości kawy ziarniste, wykwintne wina oraz tradycyjne włoskie słodycze i delikatesy.",
  openGraph: {
    title: "Il Buon Caffe | Kawa, Wino i Włoskie Specjały",
    description: "Odkryj świat luksusowych smaków — kawa, wino i włoskie delikatesy.",
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
