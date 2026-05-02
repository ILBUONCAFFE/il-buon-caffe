import { Metadata } from "next";
import GrapeVarietiesSection from "@/components/WineEncyclopedia/GrapeVarietiesSection";

export const metadata: Metadata = {
  title: "Szczepy Winogron | Encyklopedia Wina | Il Buon Caffe",
  description: "Poznaj najważniejsze odmiany winogron - od Cabernet Sauvignon po Chardonnay. Charakterystyki, pochodzenie i aromaty.",
  keywords: [
    "szczepy winogron",
    "odmiany winogron",
    "Cabernet Sauvignon",
    "Pinot Noir",
    "Chardonnay",
    "Sauvignon Blanc",
    "encyklopedia wina",
  ],
  openGraph: {
    title: "Szczepy Winogron | Encyklopedia Wina | Il Buon Caffe",
    description: "Poznaj najważniejsze odmiany winogron - od Cabernet Sauvignon po Chardonnay.",
    type: "website",
    locale: "pl_PL",
  },
};

export default function GrapeVarietiesPage() {
  return <GrapeVarietiesSection />;
}
