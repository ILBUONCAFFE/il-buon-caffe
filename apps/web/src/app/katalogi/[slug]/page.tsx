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

const API_ORIGIN_FALLBACK = "https://il-buon-caffe-api.ilbuoncaffe19.workers.dev";

function getApiOrigins(): string[] {
  const origins = [
    process.env.INTERNAL_API_URL,
    process.env.NEXT_PUBLIC_API_URL,
    API_ORIGIN_FALLBACK,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(origins.map((origin) => origin.replace(/\/+$/, "")))];
}

async function getCatalog(slug: string): Promise<CatalogData | null> {
  const path = `/api/catalogs/${slug}`;
  const apiOrigins = getApiOrigins();

  // Primary: service binding (Worker → Worker, no HTTP)
  try {
    const { env } = await getCloudflareContext({ async: true });
    const apiWorker = (env as any).API_WORKER;
    if (apiWorker) {
      const bindingOrigin = apiOrigins[0] ?? API_ORIGIN_FALLBACK;
      const res = await apiWorker.fetch(new Request(`${bindingOrigin}${path}`));
      if (res.ok) {
        const json = await res.json();
        return json.data || null;
      }
    }
  } catch {}

  // Fallback: direct HTTP with multiple origins (custom domain, workers.dev)
  for (const apiOrigin of apiOrigins) {
    try {
      const res = await fetch(`${apiOrigin}${path}`, { cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      return json.data || null;
    } catch {
      // Try next origin
    }
  }

  return null;
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

  // Use same-origin API proxy to avoid dependency on a public API DNS record.
  const pdfUrl = catalog.pdfUrl.startsWith('http')
    ? catalog.pdfUrl
    : catalog.pdfUrl;

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
