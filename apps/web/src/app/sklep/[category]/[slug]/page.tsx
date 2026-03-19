import { ProductClient } from "@/components/Product/ProductClient";

import { getProductBySlug } from "@/actions/products";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return {
      title: "Produkt nieznaleziony | Sklep Il Buon Caffe",
      description: "Przepraszamy, szukany produkt nie istnieje.",
    };
  }

  const title = `${product.name} | Sklep Il Buon Caffe`;
  const description = product.description || `Kup ${product.name} w sklepie Il Buon Caffe. Najwyższa jakość, szybka dostawa.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.imageUrl ? [{ url: product.imageUrl }] : [],
    },
  };
}

export default async function ProductDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return <ProductClient initialProduct={product} />;
}
