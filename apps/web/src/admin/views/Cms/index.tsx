'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Edit3, Globe, RefreshCw, Save, Search, Trash2, Utensils, X } from 'lucide-react'
import { adminApi, type DishTemplate, type UpsertDishTemplatePayload } from '../../lib/adminApiClient'

type CmsTab = 'hero' | 'products' | 'dishTemplates'

type DishTemplateForm = {
  id: number | null
  name: string
  note: string
  dishType: string
  imageUrl: string
  emoji: string
  tagsText: string
  sortOrder: string
  isActive: boolean
}

const EMPTY_DISH_FORM: DishTemplateForm = {
  id: null,
  name: '',
  note: '',
  dishType: '',
  imageUrl: '',
  emoji: '',
  tagsText: '',
  sortOrder: '0',
  isActive: true,
}

function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function toDishForm(template: DishTemplate): DishTemplateForm {
  return {
    id: template.id,
    name: template.name,
    note: template.note ?? '',
    dishType: template.dishType ?? '',
    imageUrl: template.imageUrl ?? '',
    emoji: template.emoji ?? '',
    tagsText: template.tags.join(', '),
    sortOrder: String(template.sortOrder),
    isActive: template.isActive,
  }
}

function toPayload(form: DishTemplateForm): UpsertDishTemplatePayload {
  return {
    category: 'wine',
    name: form.name.trim(),
    note: form.note.trim() || null,
    dishType: form.dishType.trim() || null,
    imageUrl: form.imageUrl.trim() || null,
    emoji: form.emoji.trim() || null,
    tags: parseTags(form.tagsText),
    isActive: form.isActive,
    sortOrder: Number.isFinite(Number(form.sortOrder)) ? Number(form.sortOrder) : 0,
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
  const [activeTab, setActiveTab] = useState<CmsTab>('dishTemplates')
  const [dishTemplates, setDishTemplates] = useState<DishTemplate[]>([])
  const [dishForm, setDishForm] = useState<DishTemplateForm>(EMPTY_DISH_FORM)
  const [dishSearch, setDishSearch] = useState('')
  const [dishLoading, setDishLoading] = useState(false)
  const [dishSaving, setDishSaving] = useState(false)
  const [dishError, setDishError] = useState<string | null>(null)
  const [dishMessage, setDishMessage] = useState<string | null>(null)

  const filteredDishTemplates = useMemo(() => {
    const query = dishSearch.trim().toLowerCase()
    if (!query) return dishTemplates

    return dishTemplates.filter((template) =>
      template.name.toLowerCase().includes(query) ||
      (template.note ?? '').toLowerCase().includes(query) ||
      (template.dishType ?? '').toLowerCase().includes(query) ||
      template.tags.some((tag) => tag.toLowerCase().includes(query))
    )
  }, [dishSearch, dishTemplates])

  const loadDishTemplates = async () => {
    setDishLoading(true)
    setDishError(null)
    try {
      const res = await adminApi.listDishTemplates({ category: 'wine' })
      setDishTemplates(res.data)
    } catch (err) {
      setDishError(err instanceof Error ? err.message : 'Nie udało się pobrać gotowców dań')
    } finally {
      setDishLoading(false)
    }
  }

  useEffect(() => {
    void loadDishTemplates()
  }, [])

  const resetDishForm = () => {
    setDishForm(EMPTY_DISH_FORM)
    setDishError(null)
    setDishMessage(null)
  }

  const saveDishTemplate = async () => {
    const payload = toPayload(dishForm)
    if (!payload.name) {
      setDishError('Nazwa dania jest wymagana')
      return
    }

    setDishSaving(true)
    setDishError(null)
    setDishMessage(null)

    try {
      if (dishForm.id) {
        await adminApi.updateDishTemplate(dishForm.id, payload)
        setDishMessage('Zapisano gotowiec dania')
      } else {
        await adminApi.createDishTemplate(payload)
        setDishMessage('Dodano gotowiec dania')
      }
      setDishForm(EMPTY_DISH_FORM)
      await loadDishTemplates()
    } catch (err) {
      setDishError(err instanceof Error ? err.message : 'Nie udało się zapisać gotowca')
    } finally {
      setDishSaving(false)
    }
  }

  const deleteDishTemplate = async (template: DishTemplate) => {
    const confirmed = window.confirm(`Usunąć gotowiec "${template.name}"?`)
    if (!confirmed) return

    setDishError(null)
    setDishMessage(null)

    try {
      await adminApi.deleteDishTemplate(template.id)
      if (dishForm.id === template.id) setDishForm(EMPTY_DISH_FORM)
      setDishMessage('Usunięto gotowiec dania')
      await loadDishTemplates()
    } catch (err) {
      setDishError(err instanceof Error ? err.message : 'Nie udało się usunąć gotowca')
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
            <TabButton active={activeTab === 'dishTemplates'} onClick={() => setActiveTab('dishTemplates')}>
              Gotowce dań
            </TabButton>
            <TabButton active={activeTab === 'hero'} onClick={() => setActiveTab('hero')}>
              Sekcja główna
            </TabButton>
            <TabButton active={activeTab === 'products'} onClick={() => setActiveTab('products')}>
              Produkty
            </TabButton>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {activeTab === 'dishTemplates' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center gap-2 text-[#1A1A1A]">
                  <Utensils size={18} />
                  <p className="text-sm font-semibold">Baza dań do pairingu win</p>
                </div>

                {dishError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{dishError}</div>
                )}
                {dishMessage && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {dishMessage}
                  </div>
                )}

                <div className="space-y-3 rounded-xl border border-[#E5E4E1] bg-[#FAFAF9] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[#1A1A1A]">
                      {dishForm.id ? 'Edycja gotowca' : 'Nowy gotowiec'}
                    </p>
                    {dishForm.id && (
                      <button
                        type="button"
                        onClick={resetDishForm}
                        className="inline-flex items-center gap-1.5 text-xs text-[#737373] hover:text-[#1A1A1A]"
                      >
                        <X size={14} /> Anuluj
                      </button>
                    )}
                  </div>

                  <input
                    className="admin-input w-full"
                    value={dishForm.name}
                    onChange={(e) => setDishForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Nazwa dania, np. Ossobuco alla milanese"
                  />
                  <textarea
                    className="admin-textarea w-full min-h-[96px]"
                    value={dishForm.note}
                    onChange={(e) => setDishForm((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="Krótki opis pairingu do treści premium"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      className="admin-input w-full"
                      value={dishForm.dishType}
                      onChange={(e) => setDishForm((prev) => ({ ...prev, dishType: e.target.value }))}
                      placeholder="Typ, np. mięso, sery"
                    />
                    <input
                      className="admin-input w-full"
                      value={dishForm.sortOrder}
                      onChange={(e) => setDishForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                      placeholder="Kolejność"
                      type="number"
                      min="0"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_90px] gap-2">
                    <input
                      className="admin-input w-full"
                      value={dishForm.imageUrl}
                      onChange={(e) => setDishForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                      placeholder="URL obrazka z daniem"
                    />
                    <input
                      className="admin-input w-full"
                      value={dishForm.emoji}
                      onChange={(e) => setDishForm((prev) => ({ ...prev, emoji: e.target.value }))}
                      placeholder="Emoji"
                    />
                  </div>
                  <input
                    className="admin-input w-full"
                    value={dishForm.tagsText}
                    onChange={(e) => setDishForm((prev) => ({ ...prev, tagsText: e.target.value }))}
                    placeholder="Tagi po przecinku, np. czerwone wino, taniny"
                  />
                  <button
                    type="button"
                    onClick={() => setDishForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                    className="flex items-center gap-3 text-left w-full px-3 py-2.5 rounded-lg border border-[#E5E4E1] bg-white hover:border-[#D4D3D0] transition-colors"
                  >
                    <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${dishForm.isActive ? 'bg-emerald-600' : 'bg-[#D4D3D0]'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dishForm.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </span>
                    <span className="text-sm font-medium text-[#1A1A1A]">
                      {dishForm.isActive ? 'Aktywny w edytorze win' : 'Ukryty w edytorze win'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveDishTemplate()}
                    disabled={dishSaving}
                    className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <Save size={15} /> {dishSaving ? 'Zapisywanie…' : dishForm.id ? 'Zapisz gotowiec' : 'Dodaj gotowiec'}
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
            {activeTab === 'dishTemplates' ? (
              <div className="p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[#1A1A1A]">Gotowce dań</h3>
                    <p className="text-sm text-[#737373] mt-1">Te wpisy pojawią się jako szybkie wstawki w edytorze treści premium win.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadDishTemplates()}
                    className="btn-secondary text-sm inline-flex items-center gap-2"
                  >
                    <RefreshCw size={14} /> Odśwież
                  </button>
                </div>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
                  <input
                    className="admin-input w-full pl-9"
                    value={dishSearch}
                    onChange={(e) => setDishSearch(e.target.value)}
                    placeholder="Szukaj po nazwie, typie, tagach lub opisie"
                  />
                </div>

                {dishLoading ? (
                  <div className="h-32 bg-[#F5F4F1] rounded-xl animate-pulse" />
                ) : filteredDishTemplates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#D4D3D0] p-10 text-center">
                    <Utensils size={24} className="mx-auto text-[#A3A3A3]" />
                    <p className="text-sm text-[#737373] mt-3">Brak gotowców dla obecnego wyszukiwania.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {filteredDishTemplates.map((template) => (
                      <div key={template.id} className="rounded-xl border border-[#E5E4E1] bg-[#FAFAF9] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-[#1A1A1A] truncate">{template.name}</h4>
                              {!template.isActive && (
                                <span className="text-[11px] rounded-full bg-[#E5E4E1] px-2 py-0.5 text-[#737373]">ukryty</span>
                              )}
                            </div>
                            {template.dishType && <p className="text-xs text-[#737373] mt-1">{template.dishType}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setDishForm(toDishForm(template))}
                              className="p-1.5 rounded-lg text-[#525252] hover:bg-white hover:text-[#1A1A1A] transition-colors"
                              aria-label="Edytuj gotowiec"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void deleteDishTemplate(template)}
                              className="p-1.5 rounded-lg text-[#A3A3A3] hover:bg-red-50 hover:text-red-600 transition-colors"
                              aria-label="Usuń gotowiec"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {template.note && <p className="text-sm text-[#525252] mt-3 leading-relaxed">{template.note}</p>}
                        {template.imageUrl && (
                          <p className="text-xs text-[#A3A3A3] mt-2 font-mono truncate">{template.imageUrl}</p>
                        )}
                        {template.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {template.tags.map((tag) => (
                              <span key={tag} className="text-[11px] rounded-full bg-white border border-[#E5E4E1] px-2 py-1 text-[#737373]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
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
