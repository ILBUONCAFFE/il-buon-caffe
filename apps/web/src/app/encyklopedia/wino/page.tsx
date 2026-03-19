import { Metadata } from "next";
import WineEncyclopediaClient from "@/components/WineEncyclopedia/WineEncyclopediaClient";

export const metadata: Metadata = {
  title: "Encyklopedia Wina | Il Buon Caffe",
  description: "Kompletna encyklopedia wina - poznaj szczepy winogron, regiony winiarskie, sztukę degustacji i parowania z jedzeniem. Odkryj świat wina z Il Buon Caffe.",
  keywords: ["wino", "encyklopedia wina", "szczepy winogron", "regiony winiarskie", "degustacja wina", "parowanie wina z jedzeniem"],
  openGraph: {
    title: "Encyklopedia Wina | Il Buon Caffe",
    description: "Kompletna encyklopedia wina - poznaj szczepy winogron, regiony winiarskie, sztukę degustacji i parowania z jedzeniem.",
    type: "website",
    locale: "pl_PL",
  },
};

export default function WineEncyclopediaPage() {
  return <WineEncyclopediaClient />;
}
