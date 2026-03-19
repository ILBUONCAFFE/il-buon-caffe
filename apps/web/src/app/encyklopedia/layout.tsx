import type { Metadata } from "next";
import UnderConstruction from "@/components/Encyclopedia/UnderConstruction";

export const metadata: Metadata = {
  title: "Encyklopedia | Il Buon Caffe",
  description: "Encyklopedia smaków Il Buon Caffe — odkryj świat kawy, wina, oliwy i włoskich specjałów. Wiedza, pasja i tradycja w jednym miejscu.",
  openGraph: {
    title: "Encyklopedia | Il Buon Caffe",
    description: "Encyklopedia smaków — kawa, wino, oliwa i włoskie specjały.",
    type: "website",
    locale: "pl_PL",
  },
};

// This layout intercepts all encyclopedia routes and shows the under construction page
// This is a temporary solution until the encyclopedia section is ready

export default function EncyclopediaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Always show under construction page regardless of the route
  return <UnderConstruction />;
}
