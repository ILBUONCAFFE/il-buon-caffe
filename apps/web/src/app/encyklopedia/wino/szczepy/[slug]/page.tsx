import { Metadata } from "next";
import { notFound } from "next/navigation";
import GrapeDetailClient from "@/components/WineEncyclopedia/GrapeDetailClient";
import { RED_GRAPE_VARIETIES, WHITE_GRAPE_VARIETIES } from "@/content/wineEncyclopedia";

const allGrapes = [...RED_GRAPE_VARIETIES, ...WHITE_GRAPE_VARIETIES];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const grape = allGrapes.find((g) => g.slug === slug);

  if (!grape) {
    return { title: "Szczep nieznaleziony | Encyklopedia Wina | Il Buon Caffe" };
  }

  return {
    title: `${grape.name} - Szczep Winogron | Encyklopedia Wina | Il Buon Caffe`,
    description: grape.description,
    openGraph: {
      title: `${grape.name} - Szczep Winogron`,
      description: grape.description,
      type: "article",
      locale: "pl_PL",
    },
  };
}

export function generateStaticParams() {
  return allGrapes.map((grape) => ({ slug: grape.slug }));
}

export default async function GrapeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const grape = allGrapes.find((g) => g.slug === slug);
  if (!grape) notFound();
  return <GrapeDetailClient slug={slug} />;
}
