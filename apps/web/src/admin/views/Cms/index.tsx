'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building2, CheckCircle2, Edit3, Globe, RefreshCw, Save, Search, X } from 'lucide-react'
import {
  adminApi,
  type ProducerContent,
  type UpsertProducerPayload,
} from '../../lib/adminApiClient'

type CmsTab = 'wineries' | 'hero' | 'products'

type WineryForm = {
  slug: string
  name: string
  country: string
  countryCode: string
  region: string
  established: string
  altitude: string
  soil: string
  climate: string
  shortStory: string
  story: string
  website: string
}

const EMPTY_WINERY_FORM: WineryForm = {
  slug: '',
  name: '',
  country: '',
  countryCode: '',
  region: '',
  established: '',
  altitude: '',
  soil: '',
  climate: '',
  shortStory: '',
  story: '',
  website: '',
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

function toWineryForm(producer: ProducerContent): WineryForm {
  return {
    slug: producer.slug,
    name: producer.name,
    country: producer.country,
    countryCode: producer.countryCode ?? '',
    region: producer.region,
    established: producer.established ?? (producer.founded ? String(producer.founded) : ''),
    altitude: producer.altitude ?? '',
    soil: producer.soil ?? '',
    climate: producer.climate ?? '',
    shortStory: producer.shortStory ?? '',
    story: producer.story ?? '',
    website: producer.website ?? '',
  }
}

function normalizeWebsiteUrl(raw: string): string | null {
  const input = raw.trim()
  if (!input) return null
  if (/^https?:\/\//i.test(input)) return input
  return `https://${input}`
}

function toWineryPayload(form: WineryForm): UpsertProducerPayload {
  const founded = Number(form.established.trim())
  return {
    category: 'wine',
    name: form.name.trim(),
    region: form.region.trim(),
    country: form.country.trim(),
    founded: Number.isInteger(founded) && founded >= 1000 && founded <= 2100 ? founded : null,
    countryCode: form.countryCode.trim().toLowerCase() || null,
    established: form.established.trim() || null,
    altitude: form.altitude.trim() || null,
    soil: form.soil.trim() || null,
    climate: form.climate.trim() || null,
    shortStory: form.shortStory.trim() || null,
    story: form.story.trim() || null,
    philosophy: null,
    estateInfo: [],
    images: [],
    website: normalizeWebsiteUrl(form.website),
  }
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all duration-200 hover:bg-gray-50/50 ${
        active ? 'border-[#0066CC] text-[#0066CC]' : 'border-transparent text-[#525252] hover:text-[#1A1A1A]'
      }`}
    >
      {children}
    </button>
  )
}

export const CmsView = () => {
  const [activeTab, setActiveTab] = useState<CmsTab>('wineries')
  const [wineries, setWineries] = useState<ProducerContent[]>([])
  const [wineryForm, setWineryForm] = useState<WineryForm>(EMPTY_WINERY_FORM)
  const [editingWinerySlug, setEditingWinerySlug] = useState<string | null>(null)
  const [winerySearch, setWinerySearch] = useState('')
  const [wineryLoading, setWineryLoading] = useState(false)
  const [winerySaving, setWinerySaving] = useState(false)
  const [wineryError, setWineryError] = useState<string | null>(null)
  const [wineryMessage, setWineryMessage] = useState<string | null>(null)

  const filteredWineries = useMemo(() => {
    const query = winerySearch.trim().toLowerCase()
    if (!query) return wineries

    return wineries.filter((producer) =>
      producer.name.toLowerCase().includes(query) ||
      producer.slug.toLowerCase().includes(query) ||
      producer.region.toLowerCase().includes(query) ||
      producer.country.toLowerCase().includes(query) ||
      (producer.shortStory ?? '').toLowerCase().includes(query)
    )
  }, [winerySearch, wineries])

  const loadWineries = async () => {
    setWineryLoading(true)
    setWineryError(null)
    try {
      const res = await adminApi.listProducers({ category: 'wine' })
      setWineries(res.data)
    } catch (err) {
      setWineryError(err instanceof Error ? err.message : 'Nie udało się pobrać winnic')
    } finally {
      setWineryLoading(false)
    }
  }

  useEffect(() => {
    void loadWineries()
  }, [])

  const resetWineryForm = () => {
    setWineryForm(EMPTY_WINERY_FORM)
    setEditingWinerySlug(null)
    setWineryError(null)
    setWineryMessage(null)
  }

  const saveWinery = async () => {
    const slug = (editingWinerySlug ?? (wineryForm.slug.trim() || slugify(wineryForm.name))).trim()
    if (!slug) {
      setWineryError('Slug winnicy jest wymagany')
      return
    }

    const payload = toWineryPayload(wineryForm)
    if (!payload.name || !payload.region || !payload.country) {
      setWineryError('Nazwa, region i kraj są wymagane')
      return
    }

    setWinerySaving(true)
    setWineryError(null)
    setWineryMessage(null)

    try {
      await adminApi.upsertProducer(slug, payload)
      setWineryMessage(editingWinerySlug ? 'Zapisano winnicę' : 'Dodano winnicę')
      setWineryForm(EMPTY_WINERY_FORM)
      setEditingWinerySlug(null)
      await loadWineries()
    } catch (err) {
      setWineryError(err instanceof Error ? err.message : 'Nie udało się zapisać winnicy')
    } finally {
      setWinerySaving(false)
    }
  }

  return (
    <div className="animate-in fade-in duration-300 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-h2 text-[#1A1A1A]">Treści strony</h2>
          <p className="text-sm text-[#737373] mt-1">Zarządzaj CMS-em i gotowcami używanymi w treściach premium produktów.</p>
        </div>
        <button className="btn-accent">
          Opublikuj zmiany
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        <div className="lg:col-span-4 flex flex-col bg-white border border-[#E5E4E1] rounded-2xl overflow-hidden">
          <div className="flex border-b border-[#E5E4E1] bg-[#FAF9F7]">
            <TabButton active={activeTab === 'wineries'} onClick={() => setActiveTab('wineries')}>
              Winnice
            </TabButton>
            <TabButton active={activeTab === 'hero'} onClick={() => setActiveTab('hero')}>
              Sekcja główna
            </TabButton>
            <TabButton active={activeTab === 'products'} onClick={() => setActiveTab('products')}>
              Produkty
            </TabButton>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {activeTab === 'wineries' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2 text-[#1A1A1A]">
                  <Building2 size={18} />
                  <p className="text-sm font-semibold">Baza winnic do stron produktów</p>
                </div>

                {wineryError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{wineryError}</div>
                )}
                {wineryMessage && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {wineryMessage}
                  </div>
                )}

                <div className="space-y-3 rounded-xl border border-[#E5E4E1] bg-[#FAFAF9] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      {editingWinerySlug ? 'Edycja winnicy' : 'Nowa winnica'}
                    </p>
                    {editingWinerySlug && (
                      <button
                        type="button"
                        onClick={resetWineryForm}
                        className="inline-flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#1A1A1A]"
                      >
                        <X size={14} /> Anuluj
                      </button>
                    )}
                  </div>

                  <input
                    className="admin-input w-full"
                    value={wineryForm.name}
                    onChange={(e) => setWineryForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                      slug: editingWinerySlug ? prev.slug : slugify(e.target.value),
                    }))}
                    placeholder="Nazwa, np. Castello di Greve"
                  />
                  <input
                    className="admin-input w-full font-mono text-xs"
                    value={wineryForm.slug}
                    disabled={Boolean(editingWinerySlug)}
                    onChange={(e) => setWineryForm((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                    placeholder="slug-winnicy"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_90px] gap-2">
                    <input
                      className="admin-input w-full"
                      value={wineryForm.country}
                      onChange={(e) => setWineryForm((prev) => ({ ...prev, country: e.target.value }))}
                      placeholder="Kraj, np. Hiszpania"
                    />
                    <input
                      className="admin-input w-full uppercase"
                      value={wineryForm.countryCode}
                      onChange={(e) => setWineryForm((prev) => ({ ...prev, countryCode: e.target.value.slice(0, 2).toLowerCase() }))}
                      placeholder="es"
                    />
                  </div>
                  <input
                    className="admin-input w-full"
                    value={wineryForm.region}
                    onChange={(e) => setWineryForm((prev) => ({ ...prev, region: e.target.value }))}
                    placeholder="Region / apelacja, np. D.O. Yecla"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      className="admin-input w-full"
                      value={wineryForm.established}
                      onChange={(e) => setWineryForm((prev) => ({ ...prev, established: e.target.value }))}
                      placeholder="Rok założenia, np. 1925 / 2006"
                    />
                    <input
                      className="admin-input w-full"
                      value={wineryForm.altitude}
                      onChange={(e) => setWineryForm((prev) => ({ ...prev, altitude: e.target.value }))}
                      placeholder="Wysokość, np. 700-800 m n.p.m."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      className="admin-input w-full"
                      value={wineryForm.soil}
                      onChange={(e) => setWineryForm((prev) => ({ ...prev, soil: e.target.value }))}
                      placeholder="Gleba"
                    />
                    <input
                      className="admin-input w-full"
                      value={wineryForm.climate}
                      onChange={(e) => setWineryForm((prev) => ({ ...prev, climate: e.target.value }))}
                      placeholder="Klimat"
                    />
                  </div>
                  <textarea
                    className="admin-textarea w-full min-h-[84px]"
                    value={wineryForm.shortStory}
                    onChange={(e) => setWineryForm((prev) => ({ ...prev, shortStory: e.target.value }))}
                    placeholder="Krótki opis winnicy"
                  />
                  <textarea
                    className="admin-textarea w-full min-h-[180px]"
                    value={wineryForm.story}
                    onChange={(e) => setWineryForm((prev) => ({ ...prev, story: e.target.value }))}
                    placeholder="Pełny opis do sekcji Historia & Terroir. Akapity oddziel pustą linią."
                  />
                  <input
                    className="admin-input w-full"
                    value={wineryForm.website}
                    onChange={(e) => setWineryForm((prev) => ({ ...prev, website: e.target.value }))}
                    placeholder="Strona WWW"
                  />
                  <button
                    type="button"
                    onClick={() => void saveWinery()}
                    disabled={winerySaving}
                    className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <Save size={15} /> {winerySaving ? 'Zapisywanie…' : editingWinerySlug ? 'Zapisz winnicę' : 'Dodaj winnicę'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'hero' && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Nagłówek główny (H1)</label>
                  <input type="text" defaultValue="Odkryj nową kolekcję" className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Tekst pomocniczy</label>
                  <textarea rows={3} defaultValue="Najwyższa jakość i nowoczesny design. Sprawdź nasze nowości i wybierz coś dla siebie." className="admin-textarea"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Tekst przycisku (CTA)</label>
                  <input type="text" defaultValue="Kup teraz" className="admin-input w-full" />
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-4 animate-in fade-in">
                <p className="text-sm text-[#737373]">Wybierz produkty do sekcji polecanych na stronie głównej.</p>
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[#E5E4E1] bg-[#FAF9F7]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#E5E4E1] rounded-lg"></div>
                        <span className="text-sm font-medium">Produkt polecany #{i}</span>
                      </div>
                      <button className="text-[#0066CC] text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95">Zmień</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-8 bg-[#F5F4F1] border border-[#E5E4E1] rounded-2xl overflow-hidden flex flex-col relative">
          <div className="bg-white border-b border-[#E5E4E1] px-4 py-2 flex items-center justify-center gap-2">
            <div className="flex gap-1.5 absolute left-4">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
              <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
            </div>
            <div className="bg-[#F5F4F1] px-4 py-1 rounded-md text-xs text-[#737373] font-mono flex items-center gap-2">
              <Globe size={12} /> ilbuoncaffe.pl/admin/content
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white">
            {activeTab === 'wineries' ? (
              <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1A1A1A]">Winnice</h3>
                    <p className="text-sm text-[#737373] mt-1">Te wpisy zasilają sekcję Historia & Terroir na stronach win.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadWineries()}
                    className="btn-secondary text-sm inline-flex items-center gap-2"
                  >
                    <RefreshCw size={14} /> Odśwież
                  </button>
                </div>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
                  <input
                    className="admin-input w-full pl-9"
                    value={winerySearch}
                    onChange={(e) => setWinerySearch(e.target.value)}
                    placeholder="Szukaj po nazwie, slugu, kraju, regionie lub opisie"
                  />
                </div>

                {wineryLoading ? (
                  <div className="h-32 bg-[#F5F4F1] rounded-xl animate-pulse" />
                ) : filteredWineries.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D4D3D0] p-10 text-center">
                    <Building2 size={24} className="mx-auto text-[#A3A3A3]" />
                    <p className="text-sm text-[#737373] mt-3">Brak winnic dla obecnego wyszukiwania.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {filteredWineries.map((producer) => (
                      <div key={producer.slug} className="rounded-xl border border-[#E5E4E1] bg-[#FAFAF9] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-[#1A1A1A] truncate">{producer.name}</h4>
                            <p className="text-xs text-[#737373] mt-1">
                              {[producer.region, producer.country].filter(Boolean).join(' · ')}
                            </p>
                            <p className="text-[11px] text-[#A3A3A3] mt-1 font-mono truncate">{producer.slug}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setWineryForm(toWineryForm(producer))
                              setEditingWinerySlug(producer.slug)
                              setWineryError(null)
                              setWineryMessage(null)
                            }}
                            className="p-1.5 rounded-lg text-[#525252] hover:bg-white hover:text-[#1A1A1A] transition-colors shrink-0"
                            aria-label="Edytuj winnicę"
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>

                        {producer.shortStory && <p className="text-sm text-[#525252] mt-3 leading-relaxed">{producer.shortStory}</p>}
                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                          {producer.established && (
                            <span className="rounded-lg bg-white border border-[#E5E4E1] px-2 py-1 text-[#737373]">{producer.established}</span>
                          )}
                          {producer.altitude && (
                            <span className="rounded-lg bg-white border border-[#E5E4E1] px-2 py-1 text-[#737373]">{producer.altitude}</span>
                          )}
                          {producer.soil && (
                            <span className="rounded-lg bg-white border border-[#E5E4E1] px-2 py-1 text-[#737373]">{producer.soil}</span>
                          )}
                          {producer.climate && (
                            <span className="rounded-lg bg-white border border-[#E5E4E1] px-2 py-1 text-[#737373]">{producer.climate}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="min-h-full">
                <header className="px-8 py-4 border-b border-gray-100 flex justify-between items-center">
                  <div className="font-serif font-bold text-xl">Il Buon Caffe</div>
                  <div className="flex gap-6 text-sm font-medium text-gray-600">
                    <span>Nowości</span>
                    <span>Katalog</span>
                    <span>O nas</span>
                  </div>
                </header>
                <div className="px-8 py-20 flex flex-col items-center text-center max-w-2xl mx-auto">
                  <span className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4">Nowa kolekcja 2026</span>
                  <h1 className="text-5xl font-serif font-bold text-gray-900 mb-6 leading-tight">Odkryj nową kolekcję</h1>
                  <p className="text-lg text-gray-500 mb-8">Najwyższa jakość i nowoczesny design. Sprawdź nasze nowości i wybierz coś dla siebie.</p>
                  <button className="px-8 py-4 bg-gray-900 text-white rounded-full font-medium transition-all duration-300 hover:bg-gray-800 hover:scale-105 hover:-translate-y-1 hover:shadow-lg active:scale-95 active:translate-y-0 active:shadow-none">
                    Kup teraz
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
