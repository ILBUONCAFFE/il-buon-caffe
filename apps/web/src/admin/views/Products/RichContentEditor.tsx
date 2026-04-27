'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, X, Award, Utensils, Sparkles, Wine, Thermometer, User } from 'lucide-react'
import {
  adminApi,
  type UpsertProductRichContentPayload,
  type RichContentAward,
  type RichContentPairing,
} from '../../lib/adminApiClient'

const CATEGORY_CONFIG = {
  wine:       { profile: ['body', 'sweetness', 'acidity', 'tannin'] as const,                 sensory: ['eye', 'nose', 'palate'] as const,         ritual: 'Serwowanie', alcoholField: true,  producerLabel: 'Winnica',    },
  coffee:     { profile: ['acidity', 'body', 'sweetness', 'roast', 'bitterness'] as const,    sensory: ['aroma', 'taste', 'aftertaste'] as const,  ritual: 'Parzenie',   alcoholField: false, producerLabel: 'Plantacja',  },
  delicacies: { profile: ['intensity', 'saltiness', 'sweetness', 'umami'] as const,           sensory: ['aroma', 'taste', 'texture'] as const,     ritual: 'Podanie',    alcoholField: false, producerLabel: 'Producent',  },
}

const PROFILE_LABELS: Record<string, string> = {
  body: 'Treściwość', sweetness: 'Słodycz', acidity: 'Kwasowość', tannin: 'Taniny',
  roast: 'Palenie', bitterness: 'Goryczka', intensity: 'Intensywność', saltiness: 'Słoność', umami: 'Umami',
}

const SENSORY_LABELS: Record<string, string> = {
  eye: 'Wzrok', nose: 'Nos', palate: 'Podniebienie',
  aroma: 'Aromat', taste: 'Smak', aftertaste: 'Posmak', texture: 'Tekstura',
}

const PROFILE_SCALE: Record<string, [string, string]> = {
  body:        ['Lekkie',     'Pełne'],
  sweetness:   ['Wytrawne',   'Słodkie'],
  acidity:     ['Niska',      'Wysoka'],
  tannin:      ['Łagodne',    'Mocne'],
  roast:       ['Jasne',      'Ciemne'],
  bitterness:  ['Niska',      'Wysoka'],
  intensity:   ['Delikatne',  'Intensywne'],
  saltiness:   ['Niska',      'Wysoka'],
  umami:       ['Niskie',     'Wysokie'],
}

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

type Props = { sku: string; category: string }

function Card({ icon: Icon, title, action, children }: { icon: typeof Sparkles; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-[#E5E4E1] shadow-sm overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 border-b border-[#F0EFEC]">
        <div className="flex items-center gap-3">
          <span className="p-1.5 rounded-lg bg-[#FAFAF9] text-[#525252]">
            <Icon size={16} />
          </span>
          <h3 className="text-base font-semibold text-[#1A1A1A]">{title}</h3>
        </div>
        {action}
      </header>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  )
}

function PrettySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="relative h-6 flex items-center group">
      <div className="absolute inset-x-0 h-1.5 rounded-full bg-[#E5E4E1]" />
      <div
        className="absolute h-1.5 rounded-full bg-gradient-to-r from-[#1A1A1A] to-[#525252]"
        style={{ width: `${value}%` }}
      />
      <div
        className="absolute w-4 h-4 rounded-full bg-white border-2 border-[#1A1A1A] shadow-sm pointer-events-none transition-transform group-hover:scale-110"
        style={{ left: `calc(${value}% - 8px)` }}
      />
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </div>
  )
}

export function RichContentEditor({ sku, category }: Props) {
  const cfg = getCategoryConfig(category)

  const [content, setContent] = useState<UpsertProductRichContentPayload>(emptyContent(category))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await adminApi.getProductRichContent(sku)
      const c = res.data
      setContent({
        category: c.category, producerSlug: c.producerSlug,
        awards: c.awards, pairing: c.pairing,
        ritual: c.ritual, servingTemp: c.servingTemp,
        profile: c.profile, sensory: c.sensory,
        extended: c.extended, isPublished: c.isPublished,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('NOT_FOUND') || msg.includes('404')) setContent(emptyContent(category))
      else setError('Nie udało się pobrać treści premium')
    } finally { setLoading(false) }
  }, [sku, category])

  useEffect(() => { void load() }, [load])

  const save = async () => {
    setSaving(true); setError(null); setMessage(null)
    try {
      await adminApi.upsertProductRichContent(sku, content)
      setMessage('Zapisano treść premium')
    } catch { setError('Błąd zapisu treści premium') }
    finally { setSaving(false) }
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

  if (loading) return <div className="h-32 bg-[#F5F4F1] rounded-xl animate-pulse" />

  const isPublished = content.isPublished ?? false
  const awards = content.awards ?? []
  const pairing = content.pairing ?? []

  return (
    <div className="space-y-5">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

      {/* Status & action bar */}
      <div className="bg-white rounded-xl border border-[#E5E4E1] shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setContent((p) => ({ ...p, isPublished: !isPublished }))}
            className="flex items-center gap-3"
          >
            <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${isPublished ? 'bg-emerald-600' : 'bg-[#D4D3D0]'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPublished ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </span>
            <span className="text-sm font-medium text-[#1A1A1A]">
              {isPublished ? 'Opublikowana' : 'Szkic'}
            </span>
          </button>
        </div>
        <button
          className="btn-primary text-sm disabled:opacity-40"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? 'Zapisywanie…' : 'Zapisz treść premium'}
        </button>
      </div>

      <Card icon={Wine} title="Podstawowe">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#737373] mb-1.5">
              <Thermometer size={12} /> Temperatura serwowania
            </label>
            <input
              className="admin-input w-full"
              value={content.servingTemp ?? ''}
              onChange={(e) => setContent((p) => ({ ...p, servingTemp: e.target.value || null }))}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#737373] mb-1.5">
              <User size={12} /> {cfg.producerLabel} (slug)
            </label>
            <input
              className="admin-input w-full font-mono"
              value={content.producerSlug ?? ''}
              onChange={(e) => setContent((p) => ({ ...p, producerSlug: e.target.value || null }))}
            />
          </div>
          {cfg.alcoholField && (
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#737373] mb-1.5">Alkohol</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="admin-input w-full pr-10"
                  value={(content.extended as Record<string, unknown>)?.alcohol as string ?? ''}
                  onChange={(e) => setContent((p) => ({
                    ...p,
                    extended: { ...(p.extended ?? {}), alcohol: e.target.value ? Number(e.target.value) : undefined },
                  }))}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A3A3A3]">%</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card icon={Sparkles} title="Profil smaku">
        <div className="space-y-5">
          {cfg.profile.map((dim) => {
            const val = (content.profile ?? {})[dim] ?? 50
            const [low, high] = PROFILE_SCALE[dim] ?? ['', '']
            return (
              <div key={dim}>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-medium text-[#1A1A1A]">{PROFILE_LABELS[dim] ?? dim}</span>
                  <span className="font-mono text-xs text-[#737373] tabular-nums">{val}</span>
                </div>
                <PrettySlider value={val} onChange={(v) => setProfile(dim, v)} />
                <div className="flex justify-between text-[11px] text-[#A3A3A3] mt-1.5">
                  <span>{low}</span>
                  <span>{high}</span>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card icon={Sparkles} title="Nuty sensoryczne">
        <div className="space-y-3">
          {cfg.sensory.map((dim) => (
            <div key={dim}>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#737373] mb-1.5">
                {SENSORY_LABELS[dim] ?? dim}
              </label>
              <textarea
                className="admin-input w-full min-h-[80px] resize-y"
                value={(content.sensory ?? {})[dim] ?? ''}
                onChange={(e) => setSensory(dim, e.target.value)}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card icon={Wine} title={cfg.ritual}>
        <textarea
          className="admin-input w-full min-h-[120px] resize-y"
          value={content.ritual ?? ''}
          onChange={(e) => setContent((p) => ({ ...p, ritual: e.target.value || null }))}
        />
      </Card>

      <Card
        icon={Award}
        title="Nagrody"
        action={
          <button
            type="button"
            onClick={addAward}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#F5F4F1] transition-colors"
          >
            <Plus size={14} /> Dodaj
          </button>
        }
      >
        {awards.length === 0 ? (
          <p className="text-sm text-[#A3A3A3] text-center py-6">Brak nagród</p>
        ) : (
          <div className="space-y-2">
            {awards.map((award, i) => (
              <div key={i} className="rounded-lg border border-[#E5E4E1] bg-[#FAFAF9] p-3">
                <div className="grid grid-cols-12 gap-2 items-start">
                  <input
                    className="admin-input col-span-12 md:col-span-5"
                    value={award.name}
                    onChange={(e) => updateAward(i, 'name', e.target.value)}
                    placeholder="Nazwa"
                  />
                  <input
                    type="number"
                    className="admin-input col-span-4 md:col-span-2"
                    value={award.year}
                    onChange={(e) => updateAward(i, 'year', Number(e.target.value))}
                    placeholder="Rok"
                  />
                  <input
                    className="admin-input col-span-7 md:col-span-4"
                    value={award.rank ?? ''}
                    onChange={(e) => updateAward(i, 'rank', e.target.value)}
                    placeholder="Punkty / wyróżnienie"
                  />
                  <button
                    type="button"
                    onClick={() => removeAward(i)}
                    className="col-span-1 flex items-center justify-center h-9 rounded-lg text-[#A3A3A3] hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Usuń nagrodę"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        icon={Utensils}
        title="Pairing"
        action={
          <button
            type="button"
            onClick={addPairing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#F5F4F1] transition-colors"
          >
            <Plus size={14} /> Dodaj
          </button>
        }
      >
        {pairing.length === 0 ? (
          <p className="text-sm text-[#A3A3A3] text-center py-6">Brak pairingu</p>
        ) : (
          <div className="space-y-2">
            {pairing.map((pair, i) => (
              <div key={i} className="rounded-lg border border-[#E5E4E1] bg-[#FAFAF9] p-3">
                <div className="grid grid-cols-12 gap-2 items-start">
                  <input
                    className="admin-input col-span-12 md:col-span-4"
                    value={pair.dish}
                    onChange={(e) => updatePairing(i, 'dish', e.target.value)}
                    placeholder="Danie"
                  />
                  <input
                    className="admin-input col-span-11 md:col-span-7"
                    value={pair.note ?? ''}
                    onChange={(e) => updatePairing(i, 'note', e.target.value)}
                    placeholder="Opis"
                  />
                  <button
                    type="button"
                    onClick={() => removePairing(i)}
                    className="col-span-1 flex items-center justify-center h-9 rounded-lg text-[#A3A3A3] hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Usuń pairing"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
