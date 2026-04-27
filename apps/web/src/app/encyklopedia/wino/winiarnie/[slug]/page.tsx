import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { ProducerContent } from '@repo/types'

export const revalidate = 3600
export const dynamicParams = true

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'https://api.ilbuoncaffe.pl').replace(/\/+$/, '')

async function fetchProducer(slug: string): Promise<ProducerContent | null> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/content/producer/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600, tags: [`producer:${slug}`] },
    })
    if (!res.ok) return null
    const json = await res.json() as { data: ProducerContent }
    return json.data ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const producer = await fetchProducer(slug)
  if (!producer) return { title: 'Winiarnia | Il Buon Caffe' }
  return {
    title: `${producer.name} | Winiarnie | Il Buon Caffe`,
    description: producer.shortStory ?? `Poznaj winiarnie ${producer.name} z regionu ${producer.region}.`,
  }
}

export default async function WinarniaSlugs({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const producer = await fetchProducer(slug)
  if (!producer) notFound()

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <nav className="text-sm text-brand-500 mb-8">
          <Link href="/encyklopedia" className="hover:text-brand-900">Encyklopedia</Link>
          {' / '}
          <Link href="/encyklopedia/wino" className="hover:text-brand-900">Wino</Link>
          {' / '}
          <Link href="/encyklopedia/wino/winiarnie" className="hover:text-brand-900">Winiarnie</Link>
          {' / '}
          <span className="text-brand-900">{producer.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-2">
            {producer.region}, {producer.country}
            {producer.founded && ` · Zał. ${producer.founded}`}
          </p>
          <h1 className="text-5xl font-serif text-brand-900 mb-4">{producer.name}</h1>
          {producer.shortStory && (
            <p className="text-xl text-brand-600 leading-relaxed">{producer.shortStory}</p>
          )}
        </div>

        {/* Main image */}
        {producer.images[0] && (
          <div className="aspect-video rounded-3xl overflow-hidden mb-12 bg-brand-50">
            <img
              src={producer.images[0].url}
              alt={producer.images[0].caption ?? producer.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Story */}
        {producer.story && (
          <section className="mb-12">
            <h2 className="text-2xl font-serif text-brand-900 mb-4">Historia</h2>
            <div className="prose prose-brand max-w-none text-brand-700 leading-relaxed whitespace-pre-wrap">
              {producer.story}
            </div>
          </section>
        )}

        {/* Philosophy */}
        {producer.philosophy && (
          <section className="mb-12 bg-white rounded-2xl p-8">
            <h2 className="text-2xl font-serif text-brand-900 mb-4">Filozofia</h2>
            <p className="text-brand-700 leading-relaxed">{producer.philosophy}</p>
          </section>
        )}

        {/* Estate info */}
        {producer.estateInfo.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-serif text-brand-900 mb-6">Posiadłości</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {producer.estateInfo.map((e, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-brand-100">
                  <p className="font-semibold text-brand-900 mb-2">{e.name}</p>
                  {e.hectares && <p className="text-sm text-brand-600">Powierzchnia: {e.hectares} ha</p>}
                  {e.soil && <p className="text-sm text-brand-600">Gleba: {e.soil}</p>}
                  {e.altitude && <p className="text-sm text-brand-600">Wysokość: {e.altitude} m n.p.m.</p>}
                  {e.variety && <p className="text-sm text-brand-600">Odmiany: {e.variety}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Gallery */}
        {producer.images.length > 1 && (
          <section className="mb-12">
            <h2 className="text-2xl font-serif text-brand-900 mb-6">Galeria</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {producer.images.slice(1).map((img, i) => (
                <div key={i} className="aspect-square rounded-2xl overflow-hidden bg-brand-50">
                  <img src={img.url} alt={img.caption ?? producer.name} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}

        {producer.website && (
          <a
            href={producer.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-700 hover:text-brand-900 transition-colors"
          >
            Strona producenta →
          </a>
        )}
      </div>
    </div>
  )
}
