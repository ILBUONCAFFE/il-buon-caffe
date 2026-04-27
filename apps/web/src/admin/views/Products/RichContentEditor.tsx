'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminApi, type ProductRichContent, type UpsertProductRichContentPayload, type RichContentAward, type RichContentPairing } from '../../lib/adminApiClient'

const CATEGORY_CONFIG = {
  wine:       { profile: ['body', 'sweetness', 'acidity', 'tannin', 'alcohol'],     sensory: ['eye', 'nose', 'palate'],         ritual: 'Serwowanie' },
  coffee:     { profile: ['acidity', 'body', 'sweetness', 'roast', 'bitterness'],   sensory: ['aroma', 'taste', 'aftertaste'],   ritual: 'Parzenie'   },
  delicacies: { profile: ['intensity', 'saltiness', 'sweetness', 'umami'],          sensory: ['aroma', 'taste', 'texture'],      ritual: 'Podanie'    },
} as const

type KnownCategory = keyof typeof CATEGORY_CONFIG

function getCategoryConfig(cat: string) {
  return CATEGORY_CONFIG[cat as KnownCategory] ?? CATEGORY_CONFIG.wine
}

function emptyContent(category: string): UpsertProductRichContentPayload {
  const cfg = getCategoryConfig(category)
  return {
    category,
    producerSlug: null,
    awards: [],
    pairing: [],
    ritual: null,
    servingTemp: null,
    profile: Object.fromEntries(cfg.profile.map((d) => [d, 50])),
    sensory: Object.fromEntries(cfg.sensory.map((d) => [d, ''])),
    extended: {},
    isPublished: false,
  }
}

type Props = {
  sku: string
  category: string
}

export function RichContentEditor({ sku, category }: Props) {
  const cfg = getCategoryConfig(category)

  const [content, setContent]   = useState<UpsertProductRichContentPayload>(emptyContent(category))
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [message, setMessage]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getProductRichContent(sku)
      const c   = res.data
      setContent({
        category:     c.category,
        producerSlug: c.producerSlug,
        awards:       c.awards,
        pairing:      c.pairing,
        ritual:       c.ritual,
        servingTemp:  c.servingTemp,
        profile:      c.profile,
        sensory:      c.sensory,
        extended:     c.extended,
        isPublished:  c.isPublished,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('NOT_FOUND') || msg.includes('404')) {
        setContent(emptyContent(category))
      } else {
        setError('Nie udalo sie pobrac tresci premium')
      }
    } finally {
      setLoading(false)
    }
  }, [sku, category])

  useEffect(() => { void load() }, [load])

  const save = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await adminApi.upsertProductRichContent(sku, content)
      setMessage('Zapisano tresc premium')
    } catch {
      setError('Blad zapisu tresci premium')
    } finally {
      setSaving(false)
    }
  }

  const setProfile = (dim: string, val: number) =>
    setContent((p) => ({ ...p, profile: { ...p.profile, [dim]: val } }))

  const setSensory = (dim: string, val: string) =>
    setContent((p) => ({ ...p, sensory: { ...p.sensory, [dim]: val } }))

  const addAward = () =>
    setContent((p) => ({ ...p, awards: [...(p.awards ?? []), { name: '', year: new Date().getFullYear(), rank: '' }] }))

  const updateAward = (i: number, field: keyof RichContentAward, val: string | number) =>
    setContent((p) => {
      const awards = [...(p.awards ?? [])]
      awards[i] = { ...awards[i], [field]: val } as RichContentAward
      return { ...p, awards }
    })

  const removeAward = (i: number) =>
    setContent((p) => ({ ...p, awards: (p.awards ?? []).filter((_, idx) => idx !== i) }))

  const addPairing = () =>
    setContent((p) => ({ ...p, pairing: [...(p.pairing ?? []), { dish: '', note: '' }] }))

  const updatePairing = (i: number, field: keyof RichContentPairing, val: string) =>
    setContent((p) => {
      const pairing = [...(p.pairing ?? [])]
      pairing[i] = { ...pairing[i], [field]: val }
      return { ...p, pairing }
    })

  const removePairing = (i: number) =>
    setContent((p) => ({ ...p, pairing: (p.pairing ?? []).filter((_, idx) => idx !== i) }))

  if (loading) return <div className="h-32 bg-[#F5F4F1] rounded animate-pulse" />

  return (
    <div className="space-y-6">
      {error   && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

      {/* Published toggle + save */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-[#1A1A1A]">
          <input
            type="checkbox"
            checked={content.isPublished ?? false}
            onChange={(e) => setContent((p) => ({ ...p, isPublished: e.target.checked }))}
            className="accent-[#1A1A1A]"
          />
          Opublikowana
        </label>
        <button
          className="btn-primary text-sm disabled:opacity-40"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? 'Zapisywanie...' : 'Zapisz tresc premium'}
        </button>
      </div>

      {/* Serving temp + producer slug */}
      <div className="bg-white rounded-xl border border-[#E5E4E1] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">Podstawowe</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">Temperatura serwowania</label>
            <input
              className="admin-input w-full"
              value={content.servingTemp ?? ''}
              onChange={(e) => setContent((p) => ({ ...p, servingTemp: e.target.value || null }))}
              placeholder="np. 16–18°C"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">Slug producenta</label>
            <input
              className="admin-input w-full"
              value={content.producerSlug ?? ''}
              onChange={(e) => setContent((p) => ({ ...p, producerSlug: e.target.value || null }))}
              placeholder="np. antinori"
            />
          </div>
        </div>
      </div>

      {/* Flavor profile sliders */}
      <div className="bg-white rounded-xl border border-[#E5E4E1] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">Profil smaku</h3>
        {cfg.profile.map((dim) => (
          <div key={dim}>
            <div className="flex justify-between text-xs text-[#737373] mb-1">
              <span className="capitalize">{dim}</span>
              <span>{(content.profile ?? {})[dim] ?? 50}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={(content.profile ?? {})[dim] ?? 50}
              onChange={(e) => setProfile(dim, Number(e.target.value))}
              className="w-full accent-[#1A1A1A]"
            />
          </div>
        ))}
      </div>

      {/* Sensory notes */}
      <div className="bg-white rounded-xl border border-[#E5E4E1] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">Nuty sensoryczne</h3>
        {cfg.sensory.map((dim) => (
          <div key={dim}>
            <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1 capitalize">{dim}</label>
            <textarea
              className="admin-input w-full min-h-[80px] resize-y"
              value={(content.sensory ?? {})[dim] ?? ''}
              onChange={(e) => setSensory(dim, e.target.value)}
              placeholder={`Opis wymiaru ${dim}...`}
            />
          </div>
        ))}
      </div>

      {/* Ritual */}
      <div className="bg-white rounded-xl border border-[#E5E4E1] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">{cfg.ritual}</h3>
        <textarea
          className="admin-input w-full min-h-[120px] resize-y"
          value={content.ritual ?? ''}
          onChange={(e) => setContent((p) => ({ ...p, ritual: e.target.value || null }))}
          placeholder="Wskazowki dotyczace serwowania..."
        />
      </div>

      {/* Awards */}
      <div className="bg-white rounded-xl border border-[#E5E4E1] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">Nagrody</h3>
          <button type="button" onClick={addAward} className="text-xs text-[#1A1A1A] border border-[#D4D3D0] rounded px-2 py-1 hover:bg-[#F5F4F1]">
            + Dodaj nagrode
          </button>
        </div>
        {(content.awards ?? []).map((award, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-start">
            <input
              className="admin-input col-span-5"
              value={award.name}
              onChange={(e) => updateAward(i, 'name', e.target.value)}
              placeholder="Nazwa nagrody"
            />
            <input
              type="number"
              className="admin-input col-span-2"
              value={award.year}
              onChange={(e) => updateAward(i, 'year', Number(e.target.value))}
              placeholder="Rok"
            />
            <input
              className="admin-input col-span-4"
              value={award.rank ?? ''}
              onChange={(e) => updateAward(i, 'rank', e.target.value)}
              placeholder="Wyroznienie (opcjonalne)"
            />
            <button type="button" onClick={() => removeAward(i)} className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none">×</button>
          </div>
        ))}
        {(content.awards ?? []).length === 0 && <p className="text-sm text-[#737373]">Brak nagrod.</p>}
      </div>

      {/* Pairing */}
      <div className="bg-white rounded-xl border border-[#E5E4E1] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A1A1A] uppercase tracking-wider">Pairing</h3>
          <button type="button" onClick={addPairing} className="text-xs text-[#1A1A1A] border border-[#D4D3D0] rounded px-2 py-1 hover:bg-[#F5F4F1]">
            + Dodaj danie
          </button>
        </div>
        {(content.pairing ?? []).map((pair, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-start">
            <input
              className="admin-input col-span-4"
              value={pair.dish}
              onChange={(e) => updatePairing(i, 'dish', e.target.value)}
              placeholder="Danie"
            />
            <input
              className="admin-input col-span-7"
              value={pair.note ?? ''}
              onChange={(e) => updatePairing(i, 'note', e.target.value)}
              placeholder="Opis parowania (opcjonalne)"
            />
            <button type="button" onClick={() => removePairing(i)} className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none">×</button>
          </div>
        ))}
        {(content.pairing ?? []).length === 0 && <p className="text-sm text-[#737373]">Brak pairingu.</p>}
      </div>
    </div>
  )
}
