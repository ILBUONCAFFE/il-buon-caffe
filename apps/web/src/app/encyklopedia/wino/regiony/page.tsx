import { Metadata } from "next";
import WineRegionsSection from "@/components/WineEncyclopedia/WineRegionsSection";

export const metadata: Metadata = {
  title: "Regiony Winiarskie | Encyklopedia Wina | Il Buon Caffe",
  description: "Odkryj najważniejsze regiony winiarskie świata - Bordeaux, Toskania, Rioja, Napa Valley i więcej. Terroir, klimat i flagowe wina.",
  keywords: [
    "regiony winiarskie",
    "Bordeaux",
    "Toskania",
    "Burgundia",
    "Rioja",
    "Napa Valley",
    "terroir",
    "encyklopedia wina",
  ],
  openGraph: {
    title: "Regiony Winiarskie | Encyklopedia Wina | Il Buon Caffe",
    description: "Odkryj najważniejsze regiony winiarskie świata - Bordeaux, Toskania, Rioja, Napa Valley i więcej.",
    type: "website",
    locale: "pl_PL",
  },
};

export default function WineRegionsPage() {
  return <WineRegionsSection />;
}
