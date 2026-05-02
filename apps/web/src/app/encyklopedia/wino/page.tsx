import { Metadata } from "next";
import WineEncyclopediaClient from "@/components/WineEncyclopedia/WineEncyclopediaClient";

export const metadata: Metadata = {
  title: "Encyklopedia Wina | Il Buon Caffe",
  description: "Kompletna encyklopedia wina - poznaj szczepy winogron, regiony winiarskie, sztukę degustacji i serwowania. Odkryj świat wina z Il Buon Caffe.",
  keywords: ["wino", "encyklopedia wina", "szczepy winogron", "regiony winiarskie", "degustacja wina", "serwowanie wina"],
  openGraph: {
    title: "Encyklopedia Wina | Il Buon Caffe",
    description: "Kompletna encyklopedia wina - poznaj szczepy winogron, regiony winiarskie, sztukę degustacji i serwowania.",
    type: "website",
    locale: "pl_PL",
  },
};

export default function WineEncyclopediaPage() {
  return <WineEncyclopediaClient />;
}
