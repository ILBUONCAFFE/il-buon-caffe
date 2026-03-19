import { Metadata } from "next";
import { notFound } from "next/navigation";
import RegionDetailClient from "@/components/WineEncyclopedia/RegionDetailClient";
import { ALL_WINE_REGIONS } from "@/content/wineEncyclopedia";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const region = ALL_WINE_REGIONS.find((r) => r.slug === slug);

  if (!region) {
    return { title: "Region nieznaleziony | Encyklopedia Wina | Il Buon Caffe" };
  }

  return {
    title: `${region.namePl || region.name} - Region Winiarski | Encyklopedia Wina | Il Buon Caffe`,
    description: region.description,
    openGraph: {
      title: `${region.namePl || region.name} - Region Winiarski`,
      description: region.description,
      type: "article",
      locale: "pl_PL",
    },
  };
}

export function generateStaticParams() {
  return ALL_WINE_REGIONS.map((region) => ({ slug: region.slug }));
}

export default async function RegionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const region = ALL_WINE_REGIONS.find((r) => r.slug === slug);
  if (!region) notFound();
  return <RegionDetailClient slug={slug} />;
}
