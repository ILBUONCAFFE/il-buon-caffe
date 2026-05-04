'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
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
} from '../../lib/adminApiClient'
import type {
  WineDetails as CatalogWineDetails,
  WineAward as CatalogWineAward,
  WineColor,
  WineSweetness,
  WineType,
  GlassType,
} from '@/content/products/wineData'

type WineAwardDraft = {
  year: string
  award: string
  competition: string
}

export type WineDetailsDraftSource = Partial<Omit<CatalogWineDetails, 'awards' | 'tastingNotes'>> & {
  awards?: CatalogWineAward[]
  tastingNotes?: Partial<CatalogWineDetails['tastingNotes']>
}

export type WineFormState = {
  grape: string
  alcohol: string
  capacity: string
  wineColor: string
  wineType: string
  wineSweetness: string
  body: string
  bodyValue: string
  tannins: string
  acidity: string
  sweetness: string
  aging: string
  servingTemp: string
  decanting: string
  agingPotential: string
  eye: string
  nose: string
  palate: string
  foodPairing: string
  glassType: string
  funFact: string
  isOrganic: boolean
  isBiodynamic: boolean
  isNatural: boolean
  awards: WineAwardDraft[]
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

const WINE_COLOR_OPTIONS: WineColor[] = ['Czerwone', 'Białe', 'Różowe', 'Pomarańczowe']
const WINE_TYPE_OPTIONS: WineType[] = ['Spokojne', 'Musujące', 'Półmusujące']
const WINE_SWEETNESS_OPTIONS: WineSweetness[] = ['Wytrawne', 'Półwytrawne', 'Półsłodkie', 'Słodkie']
const GLASS_TYPE_OPTIONS: { value: GlassType; label: string }[] = [
  { value: 'bordeaux', label: 'Bordeaux (czerwone pełne)' },
  { value: 'burgundy', label: 'Burgund (czerwone aromatyczne)' },
  { value: 'white', label: 'Białe wino' },
  { value: 'rose', label: 'Różowe' },
  { value: 'flute', label: 'Flute (musujące)' },
  { value: 'tulip', label: 'Tulipan (musujące premium)' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'iso', label: 'ISO uniwersalny' },
]

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

export function createWineDetailsDraft(details: WineDetailsDraftSource): WineFormState {
  return {
    grape: details.grape ?? '',
    alcohol: details.alcohol ?? '',
    capacity: details.capacity ?? '',
    wineColor: details.wineColor ?? '',
    wineType: details.wineType ?? '',
    wineSweetness: details.wineSweetness ?? '',
    body: details.body ?? '',
    bodyValue: String(details.bodyValue ?? ''),
    tannins: String(details.tannins ?? ''),
    acidity: String(details.acidity ?? ''),
    sweetness: String(details.sweetness ?? ''),
    aging: details.aging ?? '',
    servingTemp: details.servingTemp ?? '',
    decanting: details.decanting ?? '',
    agingPotential: details.agingPotential ?? '',
    eye: details.tastingNotes?.eye ?? '',
    nose: details.tastingNotes?.nose ?? '',
    palate: details.tastingNotes?.palate ?? '',
    foodPairing: details.foodPairing ?? '',
    glassType: details.glassType ?? '',
    funFact: details.funFact ?? '',
    isOrganic: Boolean(details.isOrganic),
    isBiodynamic: Boolean(details.isBiodynamic),
    isNatural: Boolean(details.isNatural),
    awards: (details.awards ?? []).map(toAwardDraft),
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

  const tastingNotes = {
    ...(trimText(form.eye) ? { eye: trimText(form.eye) } : {}),
    ...(trimText(form.nose) ? { nose: trimText(form.nose) } : {}),
    ...(trimText(form.palate) ? { palate: trimText(form.palate) } : {}),
  }

  return {
    ...(trimText(form.grape) ? { grape: trimText(form.grape) } : {}),
    ...(trimText(form.alcohol) ? { alcohol: trimText(form.alcohol) } : {}),
    ...(trimText(form.capacity) ? { capacity: trimText(form.capacity) } : {}),
    ...(trimText(form.wineColor) ? { wineColor: trimText(form.wineColor) } : {}),
    ...(trimText(form.wineType) ? { wineType: trimText(form.wineType) } : {}),
    ...(trimText(form.wineSweetness) ? { wineSweetness: trimText(form.wineSweetness) } : {}),
    ...(trimText(form.body) ? { body: trimText(form.body) } : {}),
    ...(toOptionalNumber(form.bodyValue, 'Body value') !== undefined ? { bodyValue: toOptionalNumber(form.bodyValue, 'Body value') } : {}),
    ...(toOptionalNumber(form.tannins, 'Taniny') !== undefined ? { tannins: toOptionalNumber(form.tannins, 'Taniny') } : {}),
    ...(toOptionalNumber(form.acidity, 'Kwasowość') !== undefined ? { acidity: toOptionalNumber(form.acidity, 'Kwasowość') } : {}),
    ...(toOptionalNumber(form.sweetness, 'Słodycz') !== undefined ? { sweetness: toOptionalNumber(form.sweetness, 'Słodycz') } : {}),
    ...(trimText(form.aging) ? { aging: trimText(form.aging) } : {}),
    ...(trimText(form.servingTemp) ? { servingTemp: trimText(form.servingTemp) } : {}),
    ...(trimText(form.decanting) ? { decanting: trimText(form.decanting) } : {}),
    ...(trimText(form.agingPotential) ? { agingPotential: trimText(form.agingPotential) } : {}),
    ...(Object.keys(tastingNotes).length > 0 ? { tastingNotes } : {}),
    ...(trimText(form.foodPairing) ? { foodPairing: trimText(form.foodPairing) } : {}),
    ...(trimText(form.glassType) ? { glassType: trimText(form.glassType) } : {}),
    ...(trimText(form.funFact) ? { funFact: trimText(form.funFact) } : {}),
    ...(form.isOrganic ? { isOrganic: true } : {}),
    ...(form.isBiodynamic ? { isBiodynamic: true } : {}),
    ...(form.isNatural ? { isNatural: true } : {}),
    ...(awards.length > 0 ? { awards } : {}),
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

function SegmentedSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-2 rounded-lg border border-[#E5E4E1] bg-[#FAFAF9] p-1.5">
        <button
          type="button"
          onClick={() => onChange('')}
          className={`min-h-9 rounded-md px-3 text-sm font-medium transition-colors ${
            value === ''
              ? 'bg-white text-[#1A1A1A] shadow-sm'
              : 'text-[#737373] hover:bg-white/70 hover:text-[#1A1A1A]'
          }`}
        >
          Puste
        </button>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`min-h-9 rounded-md px-3 text-sm font-medium transition-colors ${
              value === option
                ? 'bg-[#1A1A1A] text-white shadow-sm'
                : 'text-[#525252] hover:bg-white hover:text-[#1A1A1A]'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </Field>
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
  resetKey,
  onDraftChange,
}: {
  sku: string
  product: WineEditorProductPreview
  initialWineDetails: WineDetailsDraftSource
  embedded?: boolean
  draft?: WineFormState | null
  resetKey?: string
  onDraftChange?: (draft: WineFormState) => void
}) {
  const router = useRouter()
  const [form, setForm] = useState<WineFormState>(() => draft ?? createWineDetailsDraft(initialWineDetails))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const initialForm = useMemo(() => createWineDetailsDraft(initialWineDetails), [initialWineDetails])
  const effectiveResetKey = resetKey ?? sku
  const isHydratingRef = useRef(true)

  useEffect(() => {
    isHydratingRef.current = true
    setForm(draft ?? initialForm)
    setError(null)
    setMessage(null)
  }, [effectiveResetKey])

  useEffect(() => {
    if (isHydratingRef.current) {
      isHydratingRef.current = false
      return
    }
    onDraftChange?.(form)
  }, [form, onDraftChange])

  const productImage = useMemo(
    () => product.imageUrl || product.image || '',
    [product.image, product.imageUrl],
  )

  const resetToInitial = () => {
    setForm(initialForm)
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
          <Field label="Pojemność">
            <input
              className="admin-input w-full"
              value={form.capacity}
              onChange={(e) => setField('capacity', e.target.value)}
              placeholder="np. 750 ml"
            />
          </Field>
          <Field label="Body label">
            <input className="admin-input w-full" value={form.body} onChange={(e) => setField('body', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 pt-2">
          <SegmentedSelect
            label="Kolor"
            value={form.wineColor}
            options={WINE_COLOR_OPTIONS}
            onChange={(value) => setField('wineColor', value)}
          />
          <SegmentedSelect
            label="Styl"
            value={form.wineType}
            options={WINE_TYPE_OPTIONS}
            onChange={(value) => setField('wineType', value)}
          />
          <SegmentedSelect
            label="Słodycz"
            value={form.wineSweetness}
            options={WINE_SWEETNESS_OPTIONS}
            onChange={(value) => setField('wineSweetness', value)}
          />
        </div>
      </SectionCard>

      <SectionCard title="Profil degustacyjny" description="Sekcja z intensywnością i opowieścią sensoryczną.">
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
          <Field label="Typ kieliszka">
            <select
              className="admin-input w-full"
              value={form.glassType}
              onChange={(e) => setField('glassType', e.target.value)}
            >
              <option value="">— wybierz —</option>
              {GLASS_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
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
              <div key={index} className="rounded-lg border border-[#E5E4E1] bg-[#FAFAF9] p-3">
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
        title="Ciekawostka"
        description="Anegdota o winie, producencie lub regionie. Pole obsługuje dłuższy tekst i zachowuje podział na akapity na stronie produktu."
      >
        <Field label="Tekst ciekawostki">
          <textarea
            className="admin-input w-full min-h-[160px] resize-y"
            value={form.funFact}
            onChange={(e) => setField('funFact', e.target.value)}
            placeholder="Np. Winnica korzysta z 80-letnich krzewów Tempranillo zasadzonych jeszcze przez dziadka obecnego enologa. Możesz dodać dłuższą historię lub drugi akapit."
          />
        </Field>
      </SectionCard>

      <SectionCard
        title="Z czym podać"
        description="Ogólne kategorie żywności, do których pasuje wino — np. „Czerwone mięsa, dziczyzna, dojrzewające sery”. Bez konkretnych dań."
      >
        <Field label="Pairing">
          <textarea
            className="admin-input w-full min-h-[90px] resize-y"
            value={form.foodPairing}
            onChange={(e) => setField('foodPairing', e.target.value)}
            placeholder="Czerwone mięsa, dziczyzna, dojrzewające sery"
          />
        </Field>
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
