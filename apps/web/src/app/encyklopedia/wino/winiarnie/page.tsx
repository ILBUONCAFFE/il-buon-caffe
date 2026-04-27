import Link from 'next/link'
import type { Metadata } from 'next'
import type { ProducerContent } from '@repo/types'

export const metadata: Metadata = {
  title: 'Winiarnie | Encyklopedia | Il Buon Caffe',
  description: 'Poznaj winiarnie, z których pochodzi nasza kolekcja win. Historia, filozofia i terroir najlepszych producentów.',
}

export const revalidate = 3600

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'https://api.ilbuoncaffe.pl').replace(/\/+$/, '')

async function fetchProducers(): Promise<ProducerContent[]> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/content/producers?category=wine`, {
      next: { revalidate: 3600, tags: ['producers:wine'] },
    })
    if (!res.ok) return []
    const json = await res.json() as { data: ProducerContent[] }
    return json.data ?? []
  } catch {
    return []
  }
}

export default async function WiniarniePage() {
  const producers = await fetchProducers()

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="mb-12">
          <nav className="text-sm text-brand-500 mb-4">
            <Link href="/encyklopedia" className="hover:text-brand-900">Encyklopedia</Link>
            {' / '}
            <Link href="/encyklopedia/wino" className="hover:text-brand-900">Wino</Link>
            {' / '}
            <span className="text-brand-900">Winiarnie</span>
          </nav>
          <h1 className="text-4xl font-serif text-brand-900 mb-4">Winiarnie</h1>
          <p className="text-brand-600 max-w-2xl">
            Poznaj winiarnie, z których pochodzi nasza starannie dobrana kolekcja. Każdy producent to historia, tradycja i wyjątkowe terroir.
          </p>
        </div>

        {producers.length === 0 ? (
          <p className="text-brand-500">Brak winiarni w encyklopedii.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {producers.map((p) => (
              <Link
                key={p.slug}
                href={`/encyklopedia/wino/winiarnie/${p.slug}`}
                className="bg-white rounded-2xl p-6 border border-brand-100 hover:border-brand-300 transition-colors group"
              >
                {p.images[0] && (
                  <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-brand-50">
                    <img
                      src={p.images[0].url}
                      alt={p.images[0].caption ?? p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-1">{p.region}, {p.country}</p>
                <h2 className="text-xl font-serif text-brand-900 mb-2 group-hover:text-brand-700 transition-colors">{p.name}</h2>
                {p.shortStory && <p className="text-sm text-brand-600 line-clamp-3">{p.shortStory}</p>}
                {p.founded && <p className="text-xs text-brand-400 mt-3">Zał. {p.founded}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
