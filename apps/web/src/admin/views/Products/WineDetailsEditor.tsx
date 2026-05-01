'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react'
import {
  adminApi,
  type DishTemplate,
} from '../../lib/adminApiClient'
import type {
  WineDetails as CatalogWineDetails,
  WineFoodPairing as CatalogWineFoodPairing,
  WineAward as CatalogWineAward,
} from '@/content/products/wineData'

type WinePairingDraft = {
  name: string
  description: string
  emoji: string
  imageUrl: string
  category: string
}

type WineAwardDraft = {
  year: string
  award: string
  competition: string
}

export type WineFormState = {
  grape: string
  alcohol: string
  body: string
  bodyValue: string
  tannins: string
  acidity: string
  sweetness: string
  aging: string
  servingTemp: string
  decanting: string
  agingPotential: string
  winery: string
  established: string
  altitude: string
  soil: string
  climate: string
  vinification: string
  wineryDescription: string
  countryCode: string
  eye: string
  nose: string
  palate: string
  isOrganic: boolean
  isBiodynamic: boolean
  isNatural: boolean
  awards: WineAwardDraft[]
  foodPairing: WinePairingDraft[]
}

export type WineEditorProductPreview = {
  name: string
  description?: string | null
  year?: string | null
  imageUrl?: string | null
  image?: string | null
}

const EMPTY_AWARD: WineAwardDraft = {
  year: String(new Date().getFullYear()),
  award: '',
  competition: '',
}

const EMPTY_PAIRING: WinePairingDraft = {
  name: '',
  description: '',
  emoji: '',
  imageUrl: '',
  category: '',
}

const MEDIA_PUBLIC_BASE_URL = (
  process.env.NEXT_PUBLIC_MEDIA_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_R2_MEDIA_URL ||
  'https://media.ilbuoncaffe.pl'
).replace(/\/+$/, '')

function encodeR2KeyForUrl(key: string): string {
  return key
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/')
}

function decodeUrlPath(pathname: string): string {
  return pathname
    .split('/')
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part)
      } catch {
        return part
      }
    })
    .join('/')
}

function normalizeDishImageUrl(raw: string): string {
  const input = raw.trim()
  if (!input) return ''

  if (input.startsWith('/api/uploads/image/')) {
    const key = decodeUrlPath(input.replace(/^\/api\/uploads\/image\//, ''))
    return `${MEDIA_PUBLIC_BASE_URL}/${encodeR2KeyForUrl(key)}`
  }

  if (input.startsWith('api/uploads/image/')) {
    const key = decodeUrlPath(input.replace(/^api\/uploads\/image\//, ''))
    return `${MEDIA_PUBLIC_BASE_URL}/${encodeR2KeyForUrl(key)}`
  }

  if (/^https?:\/\//i.test(input)) {
    try {
      const parsed = new URL(input)
      if (parsed.hostname.toLowerCase() === 'media.ilbuoncaffe.pl') {
        const key = decodeUrlPath(parsed.pathname)
        return `${MEDIA_PUBLIC_BASE_URL}/${encodeR2KeyForUrl(key)}`
      }
    } catch {
      return input
    }
    return input
  }

  return `${MEDIA_PUBLIC_BASE_URL}/${encodeR2KeyForUrl(input.replace(/^\/+/, ''))}`
}

function trimText(value: string): string {
  return value.trim()
}

function toStringValue(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function toAwardDraft(value: CatalogWineAward): WineAwardDraft {
  return {
    year: String(value.year ?? ''),
    award: value.award ?? '',
    competition: value.competition ?? '',
  }
}

function toPairingDraft(value: CatalogWineFoodPairing): WinePairingDraft {
  return {
    name: value.name ?? '',
    description: value.description ?? '',
    emoji: value.emoji ?? '',
    imageUrl: value.imageUrl ? normalizeDishImageUrl(value.imageUrl) : '',
    category: value.category ?? '',
  }
}

export function createWineDetailsDraft(details: CatalogWineDetails): WineFormState {
  return {
    grape: details.grape ?? '',
    alcohol: details.alcohol ?? '',
    body: details.body ?? '',
    bodyValue: String(details.bodyValue ?? ''),
    tannins: String(details.tannins ?? ''),
    acidity: String(details.acidity ?? ''),
    sweetness: String(details.sweetness ?? ''),
    aging: details.aging ?? '',
    servingTemp: details.servingTemp ?? '',
    decanting: details.decanting ?? '',
    agingPotential: details.agingPotential ?? '',
    winery: details.winery ?? '',
    established: details.established ?? '',
    altitude: details.altitude ?? '',
    soil: details.soil ?? '',
    climate: details.climate ?? '',
    vinification: details.vinification ?? '',
    wineryDescription: details.wineryDescription ?? '',
    countryCode: details.countryCode ?? '',
    eye: details.tastingNotes?.eye ?? '',
    nose: details.tastingNotes?.nose ?? '',
    palate: details.tastingNotes?.palate ?? '',
    isOrganic: Boolean(details.isOrganic),
    isBiodynamic: Boolean(details.isBiodynamic),
    isNatural: Boolean(details.isNatural),
    awards: (details.awards ?? []).map(toAwardDraft),
    foodPairing: (details.foodPairing ?? []).map(toPairingDraft),
  }
}

function toOptionalNumber(value: string, label: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed.replace(',', '.'))
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} musi być liczbą`)
  }
  return parsed
}

export function wineDetailsDraftToPayload(form: WineFormState): Record<string, unknown> {
  const awards = form.awards
    .map((award) => ({
      year: String(award.year).trim(),
      award: trimText(award.award),
      competition: trimText(award.competition),
    }))
    .filter((award) => Boolean(award.year) && Boolean(award.award))

  const foodPairing = form.foodPairing
    .map((item) => ({
      name: trimText(item.name),
      description: trimText(item.description),
      emoji: trimText(item.emoji),
      imageUrl: item.imageUrl.trim() ? normalizeDishImageUrl(item.imageUrl) : '',
      category: trimText(item.category),
    }))
    .filter((item) => item.name || item.description || item.emoji || item.imageUrl || item.category)
    .map((item) => ({
      name: item.name,
      description: item.description,
      ...(item.emoji ? { emoji: item.emoji } : {}),
      ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
      ...(item.category ? { category: item.category } : {}),
    }))

  return {
    grape: trimText(form.grape) || undefined,
    alcohol: trimText(form.alcohol) || undefined,
    body: trimText(form.body) || undefined,
    bodyValue: toOptionalNumber(form.bodyValue, 'Body value'),
    tannins: toOptionalNumber(form.tannins, 'Taniny'),
    acidity: toOptionalNumber(form.acidity, 'Kwasowość'),
    sweetness: toOptionalNumber(form.sweetness, 'Słodycz'),
    aging: trimText(form.aging) || undefined,
    servingTemp: trimText(form.servingTemp) || undefined,
    decanting: trimText(form.decanting) || undefined,
    agingPotential: trimText(form.agingPotential) || undefined,
    winery: trimText(form.winery) || undefined,
    established: trimText(form.established) || undefined,
    altitude: trimText(form.altitude) || undefined,
    soil: trimText(form.soil) || undefined,
    climate: trimText(form.climate) || undefined,
    vinification: trimText(form.vinification) || undefined,
    wineryDescription: trimText(form.wineryDescription) || undefined,
    countryCode: trimText(form.countryCode) || undefined,
    tastingNotes: {
      eye: trimText(form.eye),
      nose: trimText(form.nose),
      palate: trimText(form.palate),
    },
    isOrganic: form.isOrganic,
    isBiodynamic: form.isBiodynamic,
    isNatural: form.isNatural,
    awards,
    foodPairing,
  }
}

function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string
  description?: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="bg-white rounded-xl border border-[#E5E4E1] shadow-sm overflow-hidden">
      <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-[#F0EFEC]">
        <div>
          <h2 className="text-base font-semibold text-[#1A1A1A]">{title}</h2>
          {description && <p className="text-sm text-[#737373] mt-1">{description}</p>}
        </div>
        {action}
      </header>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-[#737373] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left w-full px-3 py-2.5 rounded-lg border border-[#E5E4E1] bg-white hover:border-[#D4D3D0] transition-colors"
    >
      <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-[#1A1A1A]' : 'bg-[#D4D3D0]'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </span>
      <span className="text-sm font-medium text-[#1A1A1A]">{label}</span>
    </button>
  )
}

function ArrayToolbar({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-medium text-[#1A1A1A]">{title}</p>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#F5F4F1] transition-colors"
      >
        <Plus size={14} /> Dodaj
      </button>
    </div>
  )
}

export function WineDetailsEditor({
  sku,
  product,
  initialWineDetails,
  embedded = false,
  draft,
  onDraftChange,
}: {
  sku: string
  product: WineEditorProductPreview
  initialWineDetails: CatalogWineDetails
  embedded?: boolean
  draft?: WineFormState | null
  onDraftChange?: (draft: WineFormState) => void
}) {
  const router = useRouter()
  const [form, setForm] = useState<WineFormState>(() => draft ?? createWineDetailsDraft(initialWineDetails))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [dishTemplates, setDishTemplates] = useState<DishTemplate[]>([])
  const [selectedDishTemplateId, setSelectedDishTemplateId] = useState('')

  useEffect(() => {
    setForm(draft ?? createWineDetailsDraft(initialWineDetails))
  }, [draft, initialWineDetails])

  useEffect(() => {
    onDraftChange?.(form)
  }, [form, onDraftChange])

  useEffect(() => {
    adminApi
      .listDishTemplates({ category: 'wine', active: 'true' })
      .then((res) => setDishTemplates(res.data))
      .catch(() => setDishTemplates([]))
  }, [])

  const productImage = useMemo(
    () => product.imageUrl || product.image || '',
    [product.image, product.imageUrl],
  )

  const resetToInitial = () => {
    setForm(createWineDetailsDraft(initialWineDetails))
    setMessage('Przywrócono bieżące dane z katalogu i overrideów')
    setError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const payload = wineDetailsDraftToPayload(form)
      await adminApi.upsertProductWineDetails(sku, payload)
      setMessage('Zapisano wine details produktu')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Nie udało się zapisać wine details')
      }
    } finally {
      setSaving(false)
    }
  }

  const setField = <K extends keyof WineFormState>(field: K, value: WineFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addAward = () => setForm((prev) => ({ ...prev, awards: [...prev.awards, { ...EMPTY_AWARD }] }))
  const removeAward = (index: number) => setForm((prev) => ({ ...prev, awards: prev.awards.filter((_, itemIndex) => itemIndex !== index) }))
  const updateAward = (index: number, field: keyof WineAwardDraft, value: string) => {
    setForm((prev) => {
      const next = prev.awards.slice()
      next[index] = { ...next[index], [field]: value }
      return { ...prev, awards: next }
    })
  }

  const addPairing = () => setForm((prev) => ({ ...prev, foodPairing: [...prev.foodPairing, { ...EMPTY_PAIRING }] }))
  const removePairing = (index: number) => setForm((prev) => ({ ...prev, foodPairing: prev.foodPairing.filter((_, itemIndex) => itemIndex !== index) }))
  const updatePairing = (index: number, field: keyof WinePairingDraft, value: string) => {
    setForm((prev) => {
      const next = prev.foodPairing.slice()
      next[index] = { ...next[index], [field]: value }
      return { ...prev, foodPairing: next }
    })
  }

  const insertDishTemplate = (templateId: string) => {
    setSelectedDishTemplateId(templateId)
    const template = dishTemplates.find((item) => String(item.id) === templateId)
    if (!template) return

    setForm((prev) => ({
      ...prev,
      foodPairing: [
        ...prev.foodPairing,
        {
          name: template.name,
          description: template.note ?? '',
          emoji: template.emoji ?? '',
          imageUrl: template.imageUrl ? normalizeDishImageUrl(template.imageUrl) : '',
          category: template.dishType ?? '',
        },
      ],
    }))
    setSelectedDishTemplateId('')
  }

  return (
    <div className={`space-y-5 ${embedded ? '' : 'pb-20'}`}>
      {!embedded && (
        <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-white/85 backdrop-blur border-b border-[#E5E4E1]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => router.back()}
                className="p-1.5 rounded-lg text-[#525252] hover:bg-[#F5F4F1] transition-colors shrink-0"
                aria-label="Wróć"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
                  <Link href="/admin/products" className="hover:text-[#1A1A1A]">Produkty</Link>
                  <span>/</span>
                  <Link href={`/admin/products/${encodeURIComponent(sku)}`} className="hover:text-[#1A1A1A] font-mono">
                    {sku}
                  </Link>
                  <span>/</span>
                  <span>Wine Details</span>
                </div>
                <h1 className="text-lg md:text-xl font-semibold text-[#1A1A1A] truncate">
                  {product.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={resetToInitial}
                className="btn-secondary text-sm inline-flex items-center gap-2"
              >
                <RefreshCw size={14} /> Przywróć bieżący stan
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="btn-primary text-sm disabled:opacity-40 inline-flex items-center gap-2"
              >
                <Save size={14} /> {saving ? 'Zapisywanie…' : 'Zapisz wine details'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
          <Sparkles size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 flex items-start gap-2">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {message}
        </div>
      )}

      <SectionCard
        title="Podgląd produktu"
        description="Nazwa, opis krótki i zdjęcie główne edytujesz w standardowym formularzu produktu. Tutaj dopinasz wine design."
        action={
          embedded ? null : (
            <Link
              href={`/admin/products/${encodeURIComponent(sku)}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#F5F4F1] transition-colors"
            >
              <ExternalLink size={14} /> Edytuj produkt
            </Link>
          )
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5 items-start">
          <div className="rounded-xl border border-[#E5E4E1] bg-[#FAFAF9] overflow-hidden aspect-square flex items-center justify-center">
            {productImage ? (
              <img src={productImage} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <ImageIcon size={28} className="text-[#D4D3D0]" />
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nazwa">
                <input className="admin-input w-full" value={product.name} disabled />
              </Field>
              <Field label="Rocznik">
                <input className="admin-input w-full" value={product.year ?? ''} disabled />
              </Field>
            </div>
            <Field label="Krótki opis">
              <textarea className="admin-input w-full min-h-[100px] resize-y" value={product.description ?? ''} disabled />
            </Field>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Tożsamość wina" description="Najważniejsze parametry prezentowane w hero i sekcjach degustacyjnych.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Szczep / kupaż">
            <input className="admin-input w-full" value={form.grape} onChange={(e) => setField('grape', e.target.value)} />
          </Field>
          <Field label="Alkohol">
            <input className="admin-input w-full" value={form.alcohol} onChange={(e) => setField('alcohol', e.target.value)} />
          </Field>
          <Field label="Body label">
            <input className="admin-input w-full" value={form.body} onChange={(e) => setField('body', e.target.value)} />
          </Field>
          <Field label="Kod kraju">
            <input className="admin-input w-full font-mono" value={form.countryCode} onChange={(e) => setField('countryCode', e.target.value)} />
          </Field>
          <Field label="Winnica">
            <input className="admin-input w-full" value={form.winery} onChange={(e) => setField('winery', e.target.value)} />
          </Field>
          <Field label="Rocznik / założenie">
            <input className="admin-input w-full" value={form.established} onChange={(e) => setField('established', e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Profil degustacyjny" description="Barahonda-style sekcja z intensywnością i opowieścią sensoryczną.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Ciało (opis)">
            <input className="admin-input w-full" value={form.body} onChange={(e) => setField('body', e.target.value)} />
          </Field>
          <Field label="Ciało (0-100)">
            <input type="number" min="0" max="100" className="admin-input w-full" value={form.bodyValue} onChange={(e) => setField('bodyValue', e.target.value)} />
          </Field>
          <Field label="Taniny (0-100)">
            <input type="number" min="0" max="100" className="admin-input w-full" value={form.tannins} onChange={(e) => setField('tannins', e.target.value)} />
          </Field>
          <Field label="Kwasowość (0-100)">
            <input type="number" min="0" max="100" className="admin-input w-full" value={form.acidity} onChange={(e) => setField('acidity', e.target.value)} />
          </Field>
          <Field label="Słodycz (0-100)">
            <input type="number" min="0" max="100" className="admin-input w-full" value={form.sweetness} onChange={(e) => setField('sweetness', e.target.value)} />
          </Field>
          <Field label="Dojrzewanie">
            <input className="admin-input w-full" value={form.aging} onChange={(e) => setField('aging', e.target.value)} />
          </Field>
          <Field label="Temperatura serwowania">
            <input className="admin-input w-full" value={form.servingTemp} onChange={(e) => setField('servingTemp', e.target.value)} />
          </Field>
          <Field label="Dekantacja">
            <input className="admin-input w-full" value={form.decanting} onChange={(e) => setField('decanting', e.target.value)} />
          </Field>
          <Field label="Potencjał starzenia">
            <input className="admin-input w-full" value={form.agingPotential} onChange={(e) => setField('agingPotential', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <Field label="Nuty oka">
            <textarea className="admin-input w-full min-h-[110px] resize-y" value={form.eye} onChange={(e) => setField('eye', e.target.value)} />
          </Field>
          <Field label="Nuty nosa">
            <textarea className="admin-input w-full min-h-[110px] resize-y" value={form.nose} onChange={(e) => setField('nose', e.target.value)} />
          </Field>
          <Field label="Nuty podniebienia">
            <textarea className="admin-input w-full min-h-[110px] resize-y" value={form.palate} onChange={(e) => setField('palate', e.target.value)} />
          </Field>
          <Field label="Wino / opis krótkiego body">
            <textarea className="admin-input w-full min-h-[110px] resize-y" value={form.wineryDescription} onChange={(e) => setField('wineryDescription', e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Terroir i produkcja" description="Sekcja o winie i miejscu powstania w stylu Barahondy.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Wysokość">
            <input className="admin-input w-full" value={form.altitude} onChange={(e) => setField('altitude', e.target.value)} />
          </Field>
          <Field label="Gleba">
            <input className="admin-input w-full" value={form.soil} onChange={(e) => setField('soil', e.target.value)} />
          </Field>
          <Field label="Klimat">
            <input className="admin-input w-full" value={form.climate} onChange={(e) => setField('climate', e.target.value)} />
          </Field>
          <Field label="Winifikacja">
            <input className="admin-input w-full" value={form.vinification} onChange={(e) => setField('vinification', e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Nagrody"
        description="Karty nagród, które pojawiają się w sekcji premium w stylu Barahondy."
        action={<ArrayToolbar title="Lista nagród" onAdd={addAward} />}
      >
        {form.awards.length === 0 ? (
          <p className="text-sm text-[#A3A3A3] text-center py-6">Brak nagród. Kliknij Dodaj, aby dodać pierwszą.</p>
        ) : (
          <div className="space-y-2">
            {form.awards.map((award, index) => (
              <div key={`${index}-${award.year}`} className="rounded-lg border border-[#E5E4E1] bg-[#FAFAF9] p-3">
                <div className="grid grid-cols-12 gap-2 items-start">
                  <input
                    className="admin-input col-span-12 md:col-span-2"
                    value={award.year}
                    onChange={(e) => updateAward(index, 'year', e.target.value)}
                    placeholder="Rok"
                  />
                  <input
                    className="admin-input col-span-12 md:col-span-5"
                    value={award.award}
                    onChange={(e) => updateAward(index, 'award', e.target.value)}
                    placeholder="Nagroda"
                  />
                  <input
                    className="admin-input col-span-11 md:col-span-4"
                    value={award.competition}
                    onChange={(e) => updateAward(index, 'competition', e.target.value)}
                    placeholder="Konkurs / opis"
                  />
                  <button
                    type="button"
                    onClick={() => removeAward(index)}
                    className="col-span-1 flex items-center justify-center h-9 rounded-lg text-[#A3A3A3] hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Usuń nagrodę"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Pairing"
        description="Potrawy i menu, które mają prowadzić klienta do zakupu wina."
        action={<ArrayToolbar title="Lista pairingów" onAdd={addPairing} />}
      >
        {dishTemplates.length > 0 && (
          <div className="rounded-lg border border-[#E5E4E1] bg-[#FAFAF9] p-3">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#737373] mb-1.5">
              Wstaw gotowiec dania
            </label>
            <select
              className="admin-input w-full"
              value={selectedDishTemplateId}
              onChange={(e) => insertDishTemplate(e.target.value)}
            >
              <option value="">Wybierz gotowiec z bazy</option>
              {dishTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}{template.dishType ? ` · ${template.dishType}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.foodPairing.length === 0 ? (
          <p className="text-sm text-[#A3A3A3] text-center py-6">Brak pairingów. Dodaj pierwsze danie lub set smakowy.</p>
        ) : (
          <div className="space-y-2">
            {form.foodPairing.map((pairing, index) => (
              <div key={`${index}-${pairing.name}`} className="rounded-lg border border-[#E5E4E1] bg-[#FAFAF9] p-3">
                <div className="grid grid-cols-12 gap-2 items-start">
                  <input
                    className="admin-input col-span-12 md:col-span-4"
                    value={pairing.name}
                    onChange={(e) => updatePairing(index, 'name', e.target.value)}
                    placeholder="Nazwa dania"
                  />
                  <input
                    className="admin-input col-span-12 md:col-span-5"
                    value={pairing.description}
                    onChange={(e) => updatePairing(index, 'description', e.target.value)}
                    placeholder="Opis"
                  />
                  <input
                    className="admin-input col-span-6 md:col-span-1"
                    value={pairing.emoji}
                    onChange={(e) => updatePairing(index, 'emoji', e.target.value)}
                    placeholder="Emoji"
                  />
                  <input
                    className="admin-input col-span-5 md:col-span-1"
                    value={pairing.category}
                    onChange={(e) => updatePairing(index, 'category', e.target.value)}
                    placeholder="Typ"
                  />
                  <button
                    type="button"
                    onClick={() => removePairing(index)}
                    className="col-span-1 flex items-center justify-center h-9 rounded-lg text-[#A3A3A3] hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Usuń pairing"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="col-span-12">
                    <input
                      className="admin-input w-full"
                      value={pairing.imageUrl}
                      onChange={(e) => updatePairing(index, 'imageUrl', e.target.value)}
                      placeholder="URL obrazka (opcjonalnie)"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Cechy specjalne" description="Dodatkowe flagi, które mogą sterować wyglądem i komunikacją produktu.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Toggle checked={form.isOrganic} onChange={(value) => setField('isOrganic', value)} label="Organiczne" />
          <Toggle checked={form.isBiodynamic} onChange={(value) => setField('isBiodynamic', value)} label="Biodynamiczne" />
          <Toggle checked={form.isNatural} onChange={(value) => setField('isNatural', value)} label="Naturalne" />
        </div>
      </SectionCard>

      {!embedded && (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.push(`/admin/products/${encodeURIComponent(sku)}`)}
            className="btn-secondary text-sm inline-flex items-center gap-2"
          >
            <ExternalLink size={14} /> Wróć do produktu
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="btn-primary text-sm disabled:opacity-40 inline-flex items-center gap-2"
          >
            <Save size={14} /> {saving ? 'Zapisywanie…' : 'Zapisz wine details'}
          </button>
        </div>
      )}
    </div>
  )
}
