import type { ProductRichContent } from '@repo/types'

const CATEGORY_CONFIG = {
  wine:       { profile: ['body', 'sweetness', 'acidity', 'tannin', 'alcohol'],    sensory: ['eye', 'nose', 'palate'],       ritual: 'Serwowanie' },
  coffee:     { profile: ['acidity', 'body', 'sweetness', 'roast', 'bitterness'],  sensory: ['aroma', 'taste', 'aftertaste'], ritual: 'Parzenie'   },
  delicacies: { profile: ['intensity', 'saltiness', 'sweetness', 'umami'],         sensory: ['aroma', 'taste', 'texture'],    ritual: 'Podanie'    },
} as const

type KnownCategory = keyof typeof CATEGORY_CONFIG

function getConfig(cat: string) {
  return CATEGORY_CONFIG[cat as KnownCategory] ?? CATEGORY_CONFIG.wine
}

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'https://api.ilbuoncaffe.pl').replace(/\/+$/, '')

export async function fetchProductRichContent(sku: string): Promise<ProductRichContent | null> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/content/product/${encodeURIComponent(sku)}`, {
      next: { revalidate: 600, tags: [`product-content:${sku}`] },
    })
    if (!res.ok) return null
    const json = await res.json() as { data: ProductRichContent }
    return json.data ?? null
  } catch {
    return null
  }
}

type Props = {
  content: ProductRichContent
}

export function ProductRichContentSection({ content }: Props) {
  const cfg = getConfig(content.category)

  const hasProfile = Object.keys(content.profile).length > 0
  const hasSensory  = Object.values(content.sensory).some(Boolean)
  const hasAwards   = content.awards.length > 0
  const hasPairing  = content.pairing.length > 0
  const hasRitual   = Boolean(content.ritual)

  if (!hasProfile && !hasSensory && !hasAwards && !hasPairing && !hasRitual) return null

  return (
    <div className="mt-16 space-y-12">

      {/* Flavor profile */}
      {hasProfile && (
        <section>
          <h2 className="text-2xl font-serif text-brand-900 mb-6">Profil smaku</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cfg.profile.map((dim) => {
              const val = content.profile[dim] ?? 0
              return (
                <div key={dim}>
                  <div className="flex justify-between text-sm text-brand-700 mb-1">
                    <span className="capitalize font-medium">{dim}</span>
                    <span>{val}/100</span>
                  </div>
                  <div className="h-2 bg-brand-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-700 rounded-full transition-all" style={{ width: `${val}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Sensory notes */}
      {hasSensory && (
        <section>
          <h2 className="text-2xl font-serif text-brand-900 mb-6">Nuty sensoryczne</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cfg.sensory.map((dim) => {
              const note = content.sensory[dim]
              if (!note) return null
              return (
                <div key={dim} className="bg-white rounded-2xl p-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3 capitalize">{dim}</p>
                  <p className="text-brand-800 leading-relaxed text-sm">{note}</p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Serving / ritual */}
      {hasRitual && (
        <section>
          <h2 className="text-2xl font-serif text-brand-900 mb-6">{cfg.ritual}</h2>
          <div className="bg-white rounded-2xl p-6">
            <p className="text-brand-800 leading-relaxed whitespace-pre-wrap">{content.ritual}</p>
            {content.servingTemp && (
              <p className="mt-3 text-sm text-brand-600">
                <span className="font-semibold">Temperatura serwowania:</span> {content.servingTemp}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Pairing */}
      {hasPairing && (
        <section>
          <h2 className="text-2xl font-serif text-brand-900 mb-6">Pasuje do</h2>
          <div className="flex flex-wrap gap-3">
            {content.pairing.map((p, i) => (
              <div key={i} className="bg-white rounded-xl px-4 py-3">
                <p className="font-medium text-brand-900 text-sm">{p.dish}</p>
                {p.note && <p className="text-xs text-brand-600 mt-1">{p.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Awards */}
      {hasAwards && (
        <section>
          <h2 className="text-2xl font-serif text-brand-900 mb-6">Nagrody i wyroznienia</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {content.awards.map((a, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-brand-100">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-500 mb-1">{a.year}</p>
                <p className="font-semibold text-brand-900">{a.name}</p>
                {a.rank && <p className="text-sm text-brand-600 mt-1">{a.rank}</p>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
