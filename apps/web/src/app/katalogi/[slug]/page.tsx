import { notFound } from "next/navigation";
import FlipbookViewer from "@/components/Flipbook/FlipbookViewer";
import { getCloudflareContext } from "@opennextjs/cloudflare";

interface CatalogData {
  id: number;
  name: string;
  slug: string;
  pageCount: number | null;
  pdfUrl: string;
}

async function getCatalog(slug: string): Promise<CatalogData | null> {
  const path = `/api/catalogs/${slug}`;

  // Primary: service binding (Worker → Worker, no HTTP)
  try {
    const { env } = await getCloudflareContext({ async: true });
    const apiWorker = (env as any).API_WORKER;
    if (apiWorker) {
      const res = await apiWorker.fetch(new Request(`https://api.ilbuoncaffe.pl${path}`));
      if (res.ok) {
        const json = await res.json();
        return json.data || null;
      }
    }
  } catch {}

  // Fallback: direct HTTP
  try {
    const res = await fetch(`https://api.ilbuoncaffe.pl${path}`, { cache: "no-store" });
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

  if (!catalog) notFound();

  return (
    <div className="catalog-page">
      <FlipbookViewer
        pdfUrl={catalog.pdfUrl}
        catalogName={catalog.name}
        pageCount={catalog.pageCount}
      />
    </div>
  );
}
