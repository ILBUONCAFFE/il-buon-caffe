import { notFound } from "next/navigation";
import FlipbookViewer from "@/components/Flipbook/FlipbookViewer";

interface CatalogData {
  id: number;
  name: string;
  slug: string;
  pageCount: number | null;
  createdAt: string;
}

async function getCatalog(slug: string): Promise<CatalogData | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:8787";
  
  try {
    const res = await fetch(`${apiUrl}/api/catalogs/${slug}`, {
      next: { revalidate: 3600 },
    });
    
    if (!res.ok) return null;
    
    const json = await res.json();
    return json.data || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCatalog(slug);
  
  return {
    title: catalog ? `${catalog.name} | Il Buon Caffe` : "Katalog | Il Buon Caffe",
    robots: { index: false, follow: false },
  };
}

export default async function CatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await getCatalog(slug);

  if (!catalog) {
    notFound();
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:8787";
  const pdfUrl = `${apiUrl}/api/catalogs/${slug}/pdf`;

  return (
    <div className="catalog-page">
      <FlipbookViewer
        pdfUrl={pdfUrl}
        catalogName={catalog.name}
        pageCount={catalog.pageCount}
      />
    </div>
  );
}
