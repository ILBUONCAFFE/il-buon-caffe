import { notFound } from "next/navigation";
import FlipbookViewer from "@/components/Flipbook/FlipbookViewer";
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface CatalogData {
  id: number;
  name: string;
  slug: string;
  pageCount: number | null;
  createdAt: string;
}

async function getApiUrl(): Promise<string> {
  if (process.env.INTERNAL_API_URL) return process.env.INTERNAL_API_URL;
  try {
    const { env } = await getCloudflareContext({ async: true });
    if ((env as any).INTERNAL_API_URL) return (env as any).INTERNAL_API_URL;
  } catch {}
  return "https://api.ilbuoncaffe.pl";
}

async function getCatalog(slug: string): Promise<CatalogData | null> {
  const apiUrl = await getApiUrl();

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

  const apiUrl = await getApiUrl();
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
