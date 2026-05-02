'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Package,
  DollarSign,
  ShoppingCart,
  Image as ImageIcon,
  Sparkles,
  ArrowLeft,
  Trash2,
  RefreshCw,
  History,
  Upload,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import {
  ApiError,
  adminApi,
  type AdminCategory,
  type AdminProduct,
  type CreateAdminProductPayload,
  type ProducerContent,
  type ProductRichContent,
  type UpdateAdminProductPayload,
  type UpsertProductRichContentPayload,
} from '../../lib/adminApiClient'
import { getWineDetailsForProduct } from '@/content/products/wineData'
import { StockHistoryModal } from './StockHistoryModal'
import { AllegroLinkModal } from './AllegroLinkModal'
import { RichContentEditor } from './RichContentEditor'
import {
  WineDetailsEditor,
  wineDetailsDraftToPayload,
  type WineFormState,
} from './WineDetailsEditor'
import { PermanentDeleteProductModal } from './PermanentDeleteProductModal'

type ProductEditorViewProps = { sku: string }

type Tab = 'podstawowe' | 'ceny' | 'allegro' | 'media' | 'tresc'

type ProductFormState = {
  sku: string
  name: string
  categoryId: string
  price: string
  compareAtPrice: string
  stock: string
  imageUrl: string
  description: string
  origin: string
  year: string
  weight: string
  isActive: boolean
  isNew: boolean
  isFeatured: boolean
  allegroOfferId: string
  allegroSyncPrice: boolean
  allegroSyncStock: boolean
}

const DEFAULT_FORM: ProductFormState = {
  sku: '', name: '', categoryId: '', price: '0', compareAtPrice: '', stock: '0',
  imageUrl: '', description: '', origin: '', year: '', weight: '',
  isActive: true, isNew: false, isFeatured: false, allegroOfferId: '',
  allegroSyncPrice: true, allegroSyncStock: true,
}

const MEDIA_ORIGINS = [
  process.env.NEXT_PUBLIC_R2_MEDIA_URL,
  process.env.NEXT_PUBLIC_MEDIA_PUBLIC_URL,
  'https://media.ilbuoncaffe.pl',
]
  .filter((value): value is string => Boolean(value))
  .map((value) => value.replace(/\/+$/, '').toLowerCase())

const MEDIA_PUBLIC_BASE_URL = (
  process.env.NEXT_PUBLIC_MEDIA_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_R2_MEDIA_URL ||
  'https://media.ilbuoncaffe.pl'
).replace(/\/+$/, '')

function trimTo(raw: string, max: number): string { return raw.trim().slice(0, max) }

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

function splitPathAndSuffix(value: string): { path: string; suffix: string } {
  const queryIdx = value.indexOf('?')
  const hashIdx = value.indexOf('#')
  const suffixIdx = [queryIdx, hashIdx].filter((idx) => idx >= 0).sort((a, b) => a - b)[0]
  if (suffixIdx == null) return { path: value, suffix: '' }
  return { path: value.slice(0, suffixIdx), suffix: value.slice(suffixIdx) }
}

function appendUrlSuffix(url: string, suffix: string): string {
  return suffix ? `${url}${suffix}` : url
}

function toUploadProxyUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, '').trim()
  if (!cleanKey) return ''
  return `/api/uploads/image/${encodeR2KeyForUrl(cleanKey)}`
}

function toPublicMediaUrl(key: string): string {
  const cleanKey = key.replace(/^\/+/, '').trim()
  if (!cleanKey) return ''
  return `${MEDIA_PUBLIC_BASE_URL}/${encodeR2KeyForUrl(cleanKey)}`
}

function normalizeAdminProductImageUrl(raw: string): string {
  const input = raw.trim()
  if (!input) return ''

  if (input.startsWith('blob:') || input.startsWith('data:')) {
    return input
  }

  if (input.startsWith('/api/uploads/image/')) {
    const { path, suffix } = splitPathAndSuffix(input.replace(/^\/api\/uploads\/image\//, ''))
    const key = decodeUrlPath(path)
    return appendUrlSuffix(toPublicMediaUrl(key), suffix)
  }

  if (input.startsWith('api/uploads/image/')) {
    const { path, suffix } = splitPathAndSuffix(input.replace(/^api\/uploads\/image\//, ''))
    const key = decodeUrlPath(path)
    return appendUrlSuffix(toPublicMediaUrl(key), suffix)
  }

  if (/^https?:\/\//i.test(input)) {
    try {
      const parsed = new URL(input)
      const origin = `${parsed.protocol}//${parsed.host}`.toLowerCase()
      if (MEDIA_ORIGINS.includes(origin)) {
        const key = decodeUrlPath(parsed.pathname)
        return appendUrlSuffix(toPublicMediaUrl(key), `${parsed.search}${parsed.hash}`)
      }
    } catch {
      return input
    }
    return input
  }

  if (input.startsWith('/')) {
    return input
  }

  // Legacy values sometimes store only the raw R2 key (e.g. "products/sku/main.webp").
  const { path, suffix } = splitPathAndSuffix(input)
  return appendUrlSuffix(toPublicMediaUrl(path), suffix)
}

function uniqueNonEmpty(values: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const normalized = value.trim()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }
  return out
}

function getAdminImagePreviewCandidates(raw: string): string[] {
  const input = normalizeAdminProductImageUrl(raw)
  if (!input) return []

  if (input.startsWith('blob:') || input.startsWith('data:')) {
    return [input]
  }

  if (/^https?:\/\//i.test(input)) {
    try {
      const parsed = new URL(input)
      const origin = `${parsed.protocol}//${parsed.host}`.toLowerCase()
      if (MEDIA_ORIGINS.includes(origin)) {
        const key = decodeUrlPath(parsed.pathname)
        return uniqueNonEmpty([input, appendUrlSuffix(toUploadProxyUrl(key), `${parsed.search}${parsed.hash}`)])
      }
    } catch {
      return [input]
    }
    return [input]
  }

  if (input.startsWith('/')) {
    return [input]
  }

  return uniqueNonEmpty([toPublicMediaUrl(input), toUploadProxyUrl(input)])
}

function PreviewImage({
  srcCandidates,
  className,
}: {
  srcCandidates: string[]
  className: string
}) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    setIdx(0)
  }, [srcCandidates])

  const src = srcCandidates[idx]
  if (!src) return null

  return (
    <img
      src={src}
      alt=""
      className={className}
      onError={() => setIdx((prev) => (prev < srcCandidates.length - 1 ? prev + 1 : prev))}
    />
  )
}

function parseNonNegativeNumber(raw: string, fieldLabel: string): { ok: true; value: number } | { ok: false; error: string } {
  const parsed = Number(raw.replace(',', '.').trim())
  if (!Number.isFinite(parsed) || parsed < 0) return { ok: false, error: `${fieldLabel} musi być liczbą nieujemną` }
  return { ok: true, value: parsed }
}

function parseOptionalNonNegativeNumber(raw: string, fieldLabel: string): { ok: true; value: number | null } | { ok: false; error: string } {
  if (!raw.trim()) return { ok: true, value: null }
  const r = parseNonNegativeNumber(raw, fieldLabel)
  return r.ok ? { ok: true, value: r.value } : r
}

function parseNonNegativeInteger(raw: string, fieldLabel: string): { ok: true; value: number } | { ok: false; error: string } {
  const parsed = Number(raw.trim())
  if (!Number.isInteger(parsed) || parsed < 0) return { ok: false, error: `${fieldLabel} musi być liczbą całkowitą >= 0` }
  return { ok: true, value: parsed }
}

function isWineCategorySlug(slug: string): boolean {
  return slug === 'wino' || slug === 'wine' || slug === 'alcohol'
}

function mapProductToForm(p: AdminProduct): ProductFormState {
  return {
    sku: p.sku,
    name: p.name || '',
    categoryId: p.categoryId != null ? String(p.categoryId) : '',
    price: String(p.price),
    compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : '',
    stock: String(p.stock),
    imageUrl: normalizeAdminProductImageUrl(p.imageUrl || ''),
    description: p.description || '',
    origin: p.origin || '',
    year: p.year || '',
    weight: p.weight != null ? String(p.weight) : '',
    isActive: p.isActive,
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    allegroOfferId: p.allegroOfferId || '',
    allegroSyncPrice: p.allegroSyncPrice ?? false,
    allegroSyncStock: p.allegroSyncStock ?? false,
  }
}

const TABS: { id: Tab; label: string; icon: typeof Package; createMode?: boolean }[] = [
  { id: 'podstawowe', label: 'Dane produktu',      icon: Package,    createMode: true },
  { id: 'ceny',       label: 'Sprzedaż i magazyn', icon: DollarSign, createMode: true },
  { id: 'media',      label: 'Media',              icon: ImageIcon,  createMode: true },
  { id: 'allegro',    label: 'Allegro',            icon: ShoppingCart },
  { id: 'tresc',      label: 'Treść',              icon: Sparkles     },
]

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-[#737373] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-xl border border-[#E5E4E1] shadow-sm overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 border-b border-[#F0EFEC]">
        <h2 className="text-base font-semibold text-[#1A1A1A]">{title}</h2>
        {action}
      </header>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  )
}

export const ProductEditorView = ({ sku }: ProductEditorViewProps) => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isCreateMode = useMemo(() => sku.toLowerCase() === 'new', [sku])

  const initialTab = useMemo<Tab>(() => {
    const requested = searchParams.get('tab')
    if (isCreateMode && (requested === 'allegro' || requested === 'tresc')) return 'podstawowe'
    return requested === 'ceny' || requested === 'allegro' || requested === 'media' || requested === 'tresc'
      ? requested
      : 'podstawowe'
  }, [isCreateMode, searchParams])

  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [form, setForm] = useState<ProductFormState>(DEFAULT_FORM)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [product, setProduct] = useState<AdminProduct | null>(null)
  const [productRichContent, setProductRichContent] = useState<ProductRichContent | null>(null)
  const [wineProducers, setWineProducers] = useState<ProducerContent[]>([])
  const [selectedProducerSlug, setSelectedProducerSlug] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [wineDetailsDraft, setWineDetailsDraft] = useState<WineFormState | null>(null)
  const [richContentDraft, setRichContentDraft] = useState<UpsertProductRichContentPayload | null>(null)

  const [loading, setLoading] = useState(!isCreateMode)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pushingStock, setPushingStock] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [showHistory, setShowHistory] = useState(false)
  const [showAllegroLink, setShowAllegroLink] = useState(false)
  const [showPermanentDelete, setShowPermanentDelete] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [showManualImageUrl, setShowManualImageUrl] = useState(false)

  const loadCategories = useCallback(async () => {
    try {
      const res = await adminApi.getCategories()
      setCategories(res.data.filter((c) => c.isActive))
    } catch { setCategories([]) }
  }, [])

  const loadWineProducers = useCallback(async () => {
    try {
      const res = await adminApi.listProducers({ category: 'wine' })
      setWineProducers(res.data)
    } catch {
      setWineProducers([])
    }
  }, [])

  const loadProduct = useCallback(async () => {
    if (isCreateMode) return
    setLoading(true); setError(null)
    try {
      const res = await adminApi.getProduct(sku)
      let content: ProductRichContent | null = null
      if (isWineCategorySlug(res.data.category?.slug ?? '')) {
        try {
          content = (await adminApi.getProductRichContent(sku)).data
        } catch (err) {
          const isNotFound =
            (err instanceof ApiError && (err.status === 404 || err.code === 'NOT_FOUND')) ||
            (err instanceof Error && (err.message.includes('NOT_FOUND') || err.message.includes('404')))
          if (!isNotFound) throw err
        }
      }
      setProduct(res.data); setProductRichContent(content); setSelectedProducerSlug(content?.producerSlug ?? ''); setForm(mapProductToForm(res.data)); setWineDetailsDraft(null); setRichContentDraft(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się pobrać produktu')
      setProduct(null)
      setProductRichContent(null)
      setSelectedProducerSlug('')
    } finally { setLoading(false) }
  }, [isCreateMode, sku])

  useEffect(() => { void loadCategories() }, [loadCategories])
  useEffect(() => { void loadWineProducers() }, [loadWineProducers])
  useEffect(() => {
    if (isCreateMode) { setForm(DEFAULT_FORM); setProduct(null); setProductRichContent(null); setSelectedProducerSlug(''); setLoading(false); return }
    void loadProduct()
  }, [isCreateMode, loadProduct])

  useEffect(() => {
    if (isCreateMode && (activeTab === 'allegro' || activeTab === 'tresc')) {
      setActiveTab('podstawowe')
    }
  }, [activeTab, isCreateMode])

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!selectedImage) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(selectedImage)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedImage])

  const displayedImageCandidates = useMemo(
    () => (previewUrl ? [previewUrl] : getAdminImagePreviewCandidates(form.imageUrl)),
    [previewUrl, form.imageUrl],
  )
  const savedImageCandidates = useMemo(
    () => getAdminImagePreviewCandidates(form.imageUrl),
    [form.imageUrl],
  )

  const handleFieldChange = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleWineDetailsDraftChange = useCallback((draft: WineFormState) => {
    setWineDetailsDraft(draft)
  }, [])

  const handleRichContentDraftChange = useCallback((draft: UpsertProductRichContentPayload) => {
    setRichContentDraft(draft)
  }, [])

  const saveProduct = async () => {
    setSaving(true); setError(null); setMessage(null)
    const cleanedName = trimTo(form.name, 255)
    if (!cleanedName) { setSaving(false); setError('Nazwa produktu jest wymagana'); return }

    const priceR     = parseNonNegativeNumber(form.price, 'Cena')
    if (!priceR.ok)     { setSaving(false); setError(priceR.error); return }
    const compareR   = parseOptionalNonNegativeNumber(form.compareAtPrice, 'Cena przekreślona')
    if (!compareR.ok)   { setSaving(false); setError(compareR.error); return }
    const stockR     = parseNonNegativeInteger(form.stock, 'Stan magazynowy')
    if (!stockR.ok)     { setSaving(false); setError(stockR.error); return }
    const weightR    = parseOptionalNonNegativeNumber(form.weight, 'Waga')
    if (!weightR.ok)    { setSaving(false); setError(weightR.error); return }

    const categoryId = form.categoryId ? Number(form.categoryId) : null
    if (categoryId != null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
      setSaving(false); setError('Nieprawidłowa kategoria'); return
    }

    const normalizedImageUrl = normalizeAdminProductImageUrl(trimTo(form.imageUrl, 500))

    try {
      const selectedCategorySlug = categories.find((c) => String(c.id) === form.categoryId)?.slug || product?.category?.slug || ''
      const wineDetails = !isCreateMode && isWineCategorySlug(selectedCategorySlug) && wineDetailsDraft
        ? wineDetailsDraftToPayload(wineDetailsDraft)
        : undefined
      const richContent = !isCreateMode && !isWineCategorySlug(selectedCategorySlug) && richContentDraft
        ? richContentDraft
        : null

      if (isCreateMode) {
        const normalizedSku = trimTo(form.sku.toUpperCase(), 50)

        const payload: CreateAdminProductPayload = {
          ...(normalizedSku ? { sku: normalizedSku } : {}),
          name: cleanedName, categoryId,
          price: priceR.value, compareAtPrice: compareR.value, stock: stockR.value,
          imageUrl: normalizedImageUrl,
          description: trimTo(form.description, 2000),
          origin: trimTo(form.origin, 255),
          year: trimTo(form.year, 10),
          weight: weightR.value,
          isActive: form.isActive, isNew: form.isNew, isFeatured: form.isFeatured,
          allegroOfferId: trimTo(form.allegroOfferId, 50) || null,
          allegroSyncPrice: form.allegroSyncPrice,
          allegroSyncStock: form.allegroSyncStock,
        }

        const created = await adminApi.createProduct(payload)

        if (selectedImage) {
          setUploading(true)
          const uploaded = await adminApi.uploadProductMainImage(created.data.sku, selectedImage)
          setForm((p) => ({ ...p, imageUrl: normalizeAdminProductImageUrl(uploaded.url) }))
          setUploading(false)
        }

        router.replace(`/admin/products/${encodeURIComponent(created.data.sku)}`)
        return
      }

      const updatePayload: UpdateAdminProductPayload = {
        name: cleanedName, categoryId,
        price: priceR.value, compareAtPrice: compareR.value,
        imageUrl: normalizedImageUrl,
        description: trimTo(form.description, 2000),
        origin: trimTo(form.origin, 255),
        year: trimTo(form.year, 10),
        weight: weightR.value,
        isActive: form.isActive, isNew: form.isNew, isFeatured: form.isFeatured,
        allegroOfferId: trimTo(form.allegroOfferId, 50) || null,
        allegroSyncPrice: form.allegroSyncPrice,
        allegroSyncStock: form.allegroSyncStock,
      }

      await adminApi.updateProduct(sku, updatePayload)

      if (product && stockR.value !== product.stock) {
        await adminApi.updateProductStock(sku, {
          stock: stockR.value, reason: 'manual',
          notes: 'Zmiana z panelu admin /products',
        })
      }

      if (selectedImage) {
        setUploading(true)
        const uploaded = await adminApi.uploadProductMainImage(sku, selectedImage)
        setForm((p) => ({ ...p, imageUrl: normalizeAdminProductImageUrl(uploaded.url) }))
        setUploading(false)
      }

      if (richContent) {
        await adminApi.upsertProductRichContent(sku, richContent)
      }
      if (wineDetails) {
        const updatedContent = await adminApi.upsertProductWineDetails(sku, wineDetails)
        setProductRichContent(updatedContent.data)
      }
      if (!isCreateMode && isWineCategorySlug(selectedCategorySlug)) {
        const category = productRichContent?.category || 'wine'
        const updatedContent = await adminApi.upsertProductRichContent(sku, {
          category,
          producerSlug: selectedProducerSlug || null,
          awards: productRichContent?.awards,
          ritual: productRichContent?.ritual,
          servingTemp: productRichContent?.servingTemp,
          profile: productRichContent?.profile,
          sensory: productRichContent?.sensory,
          extended: productRichContent?.extended,
          isPublished: productRichContent?.isPublished ?? true,
        })
        setProductRichContent(updatedContent.data)
      }

      await loadProduct()
      setSelectedImage(null)
      setMessage('Produkt został zapisany')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać produktu')
    } finally {
      setSaving(false); setUploading(false)
    }
  }

  const handleClearCache = async () => {
    if (!product?.sku) return
    setIsClearingCache(true); setError(null)
    try { await adminApi.clearProductCache(product.sku); setMessage('Cache produktu wyczyszczony') }
    catch { setError('Błąd czyszczenia cache') }
    finally { setIsClearingCache(false) }
  }

  const handlePermanentDelete = async () => {
    if (!product) return
    setDeleting(true); setError(null); setMessage(null)
    try {
      await adminApi.deleteProductPermanently(product.sku)
      setShowPermanentDelete(false)
      router.replace('/admin/products')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się usunąć produktu')
    } finally {
      setDeleting(false)
    }
  }

  const pushSelectedToAllegro = async () => {
    if (!form.allegroOfferId) return
    setPushingStock(true); setError(null); setMessage(null)
    try {
      await adminApi.updateProduct(sku, {
        allegroSyncPrice: form.allegroSyncPrice,
        allegroSyncStock: form.allegroSyncStock,
      })
      await adminApi.pushAllegroSync(sku)
      const synced = [
        form.allegroSyncPrice ? 'cena' : null,
        form.allegroSyncStock ? 'stan' : null,
      ].filter(Boolean).join(' i ')
      setMessage(`${synced || 'Wybrane pola'} wypchnięte na Allegro`)
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Nie udało się wypchnąć danych na Allegro') }
    finally { setPushingStock(false) }
  }

  const initialWineDetails = useMemo(
    () => (product ? getWineDetailsForProduct(product, productRichContent) : null),
    [product, productRichContent],
  )
  const wineDetailsResetKey = `${sku}:${productRichContent?.updatedAt ?? 'initial'}:${productRichContent?.version ?? '0'}`

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-56 bg-[#F5F4F1] rounded animate-pulse" />
        <div className="h-28 w-full bg-[#F5F4F1] rounded animate-pulse" />
        <div className="h-28 w-full bg-[#F5F4F1] rounded animate-pulse" />
      </div>
    )
  }

  const categoryName = product?.category?.name || categories.find((c) => String(c.id) === form.categoryId)?.name || 'Brak kategorii'
  const categorySlug = product?.category?.slug || categories.find((c) => String(c.id) === form.categoryId)?.slug || ''
  const isWineCategory = isWineCategorySlug(categorySlug)
  const prefixBySlug: Record<string, string> = {
    kawa: 'KAW',
    coffee: 'KAW',
    wino: 'WIN',
    alcohol: 'WIN',
    slodycze: 'SLO',
    sweets: 'SLO',
    spizarnia: 'SPI',
    pantry: 'SPI',
  }
  const skuPreviewNamePart = form.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'PRODUKT'
  const skuPreview = `${prefixBySlug[categorySlug] ?? 'IBC'}-${skuPreviewNamePart}`
  const visibleTabs = TABS.filter((tab) => !isCreateMode || tab.createMode)

  return (
    <div className="pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-white/85 backdrop-blur border-b border-[#E5E4E1]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/admin/products"
              className="p-1.5 rounded-lg text-[#525252] hover:bg-[#F5F4F1] transition-colors shrink-0"
              aria-label="Wróć do produktów"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-[#A3A3A3]">
                <Link href="/admin/products" className="hover:text-[#1A1A1A]">Produkty</Link>
                <span>/</span>
                <span className="font-mono">{isCreateMode ? 'nowy' : form.sku}</span>
              </div>
              <h1 className="text-lg md:text-xl font-semibold text-[#1A1A1A] truncate">
                {isCreateMode ? 'Nowy produkt' : (form.name || form.sku)}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isCreateMode && (
              <span className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${form.isActive ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${form.isActive ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                {form.isActive ? 'Aktywny' : 'Nieaktywny'}
              </span>
            )}
            {!isCreateMode && product?.sku && (
              <button
                type="button"
                onClick={() => void handleClearCache()}
                disabled={isClearingCache}
                className="p-1.5 rounded-lg text-[#737373] hover:bg-[#F5F4F1] transition-colors disabled:opacity-40"
                title="Wyczyść cache"
              >
                <RefreshCw size={16} className={isClearingCache ? 'animate-spin' : ''} />
              </button>
            )}
            <button
              className="btn-primary text-sm disabled:opacity-40"
              disabled={saving || uploading}
              onClick={() => void saveProduct()}
            >
              {saving ? 'Zapisywanie…' : uploading ? 'Wysyłanie…' : isCreateMode ? 'Utwórz produkt' : 'Zapisz zmiany'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
          </div>
        )}
        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {message}
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 self-start space-y-4">
          {/* Preview card */}
          <div className="bg-white rounded-xl border border-[#E5E4E1] p-4 shadow-sm">
            <div className="aspect-square w-full rounded-lg overflow-hidden bg-[#FAFAF9] border border-[#F0EFEC] flex items-center justify-center">
              {displayedImageCandidates.length > 0 ? (
                <PreviewImage srcCandidates={displayedImageCandidates} className="w-full h-full object-contain" />
              ) : (
                <ImageIcon size={28} className="text-[#D4D3D0]" />
              )}
            </div>
            <div className="mt-3 space-y-1">
              <p className="font-mono text-xs text-[#A3A3A3] truncate">{isCreateMode ? skuPreview : (form.sku || '—')}</p>
              <p className="text-sm font-medium text-[#1A1A1A] truncate">{form.name || 'Bez nazwy'}</p>
              <p className="text-xs text-[#737373] truncate">{categoryName}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-[#F0EFEC] grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[#A3A3A3]">Cena</div>
                <div className="font-medium text-[#1A1A1A]">{form.price || '0'} zł</div>
              </div>
              <div>
                <div className="text-[#A3A3A3]">Stan</div>
                <div className="font-medium text-[#1A1A1A]">{form.stock || '0'}</div>
              </div>
            </div>

          </div>

          {/* Section nav */}
          <nav className="bg-white rounded-xl border border-[#E5E4E1] p-2 shadow-sm">
            {visibleTabs.map((t) => {
              const Icon = t.icon
              const active = activeTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    active ? 'bg-[#1A1A1A] text-white' : 'text-[#525252] hover:bg-[#F5F4F1]'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-white' : 'text-[#737373]'} />
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="space-y-5 min-w-0">
          {activeTab === 'podstawowe' && (
            <>
              <SectionCard title="Identyfikacja">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="SKU">
                    <input
                      className="admin-input w-full font-mono"
                      value={isCreateMode ? (form.sku || skuPreview) : form.sku}
                      onChange={(e) => handleFieldChange('sku', e.target.value)}
                      disabled
                    />
                    {isCreateMode && (
                      <p className="text-[11px] text-[#A3A3A3] mt-1">SKU zostanie utworzone automatycznie przy zapisie.</p>
                    )}
                  </Field>
                  <Field label="Kategoria">
                    <select
                      className="admin-input w-full"
                      value={form.categoryId}
                      onChange={(e) => handleFieldChange('categoryId', e.target.value)}
                    >
                      <option value="">Brak kategorii</option>
                      {categories.map((c) => (
                        <option key={c.id} value={String(c.id)}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Nazwa produktu">
                      <input
                        className="admin-input w-full"
                        value={form.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Krótki opis">
                      <textarea
                        className="admin-input w-full min-h-[100px] resize-y"
                        value={form.description}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                      />
                      <p className="text-[11px] text-[#A3A3A3] mt-1 text-right">{form.description.length} / 2000</p>
                    </Field>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Widoczność">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Toggle checked={form.isActive}   onChange={(v) => handleFieldChange('isActive', v)}   label="Aktywny" />
                  <Toggle checked={form.isNew}      onChange={(v) => handleFieldChange('isNew', v)}      label="Nowość" />
                  <Toggle checked={form.isFeatured} onChange={(v) => handleFieldChange('isFeatured', v)} label="Wyróżniony" />
                </div>

                {!isCreateMode && (
                  <div className="pt-3 border-t border-[#F0EFEC] flex flex-wrap gap-2">
                    {product?.isActive && (
                      <button
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        disabled={saving || uploading}
                        onClick={async () => {
                          if (!window.confirm(`Zdezaktywować produkt ${sku}?`)) return
                          try {
                            await adminApi.deactivateProduct(sku)
                            setMessage('Produkt zdezaktywowany')
                            await loadProduct()
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Nie udało się zdezaktywować produktu')
                          }
                        }}
                      >
                        <Trash2 size={14} /> Dezaktywuj produkt
                      </button>
                    )}
                    {!product?.isActive && (
                      <button
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40"
                        disabled={saving || uploading || deleting}
                        onClick={() => setShowPermanentDelete(true)}
                      >
                        <Trash2 size={14} /> Usuń trwale
                      </button>
                    )}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Dane opcjonalne">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Pochodzenie">
                    <input
                      className="admin-input w-full"
                      value={form.origin}
                      onChange={(e) => handleFieldChange('origin', e.target.value)}
                    />
                  </Field>
                  <Field label="Rocznik">
                    <input
                      className="admin-input w-full"
                      value={form.year}
                      onChange={(e) => handleFieldChange('year', e.target.value)}
                    />
                  </Field>
                  <Field label="Waga (g)">
                    <div className="relative">
                      <input
                        className="admin-input w-full pr-10"
                        value={form.weight}
                        onChange={(e) => handleFieldChange('weight', e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A3A3A3]">g</span>
                    </div>
                  </Field>
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === 'ceny' && (
            <>
              <SectionCard title="Cennik">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Cena sprzedaży">
                    <div className="relative">
                      <input
                        className="admin-input w-full pr-12"
                        value={form.price}
                        onChange={(e) => handleFieldChange('price', e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A3A3A3]">zł</span>
                    </div>
                  </Field>
                  <Field label="Cena przekreślona">
                    <div className="relative">
                      <input
                        className="admin-input w-full pr-12"
                        value={form.compareAtPrice}
                        onChange={(e) => handleFieldChange('compareAtPrice', e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#A3A3A3]">zł</span>
                    </div>
                  </Field>
                </div>
              </SectionCard>

              <SectionCard
                title="Magazyn"
                action={!isCreateMode ? (
                  <button
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#F5F4F1]"
                    onClick={() => setShowHistory(true)}
                  >
                    <History size={14} /> Historia
                  </button>
                ) : null}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Stan magazynowy">
                    <input
                      className="admin-input w-full"
                      value={form.stock}
                      onChange={(e) => handleFieldChange('stock', e.target.value)}
                    />
                  </Field>
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === 'allegro' && (
            <SectionCard title="Integracja Allegro">
              {isCreateMode ? (
                <p className="text-sm text-[#737373]">Połączenie Allegro dostępne po utworzeniu produktu.</p>
              ) : (
                <>
                  <div className="rounded-lg border border-[#E5E4E1] bg-[#FAFAF9] p-4">
                    <p className="text-xs uppercase tracking-wider text-[#737373] mb-2">Powiązana oferta</p>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      {form.allegroOfferId ? (
                        <code className="font-mono text-sm text-[#1A1A1A] break-all">{form.allegroOfferId}</code>
                      ) : (
                        <span className="text-sm text-[#A3A3A3]">Brak połączenia</span>
                      )}
                      <button className="btn-secondary text-sm shrink-0" onClick={() => setShowAllegroLink(true)}>
                        {form.allegroOfferId ? 'Zmień połączenie' : 'Połącz z ofertą'}
                      </button>
                    </div>
                  </div>

                  {form.allegroOfferId && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Toggle
                          checked={form.allegroSyncPrice}
                          onChange={(v) => handleFieldChange('allegroSyncPrice', v)}
                          label="Synchronizuj cenę"
                        />
                        <Toggle
                          checked={form.allegroSyncStock}
                          onChange={(v) => handleFieldChange('allegroSyncStock', v)}
                          label="Synchronizuj stan"
                        />
                      </div>
                      <button
                        className="inline-flex items-center gap-2 btn-secondary text-sm disabled:opacity-40"
                        disabled={pushingStock || (!form.allegroSyncPrice && !form.allegroSyncStock)}
                        onClick={() => void pushSelectedToAllegro()}
                      >
                        <Upload size={14} />
                        {pushingStock ? 'Wysyłanie…' : 'Wypchnij wybrane pola na Allegro'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </SectionCard>
          )}

          {activeTab === 'media' && (
            <SectionCard
              title="Zdjęcie główne"
              action={
                <button
                  type="button"
                  onClick={() => setShowManualImageUrl((value) => !value)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#F5F4F1]"
                >
                  {showManualImageUrl ? 'Ukryj URL' : 'URL ręcznie'}
                </button>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: current saved image */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#737373] mb-1.5">Aktualne</p>
                  <div className="aspect-square rounded-lg border border-[#E5E4E1] bg-[#FAFAF9] flex items-center justify-center overflow-hidden">
                    {form.imageUrl ? (
                      <PreviewImage srcCandidates={savedImageCandidates} className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon size={32} className="text-[#D4D3D0]" />
                    )}
                  </div>
                </div>

                {/* Right: replace upload + live preview */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#737373] mb-1.5">
                    {selectedImage ? 'Nowe zdjęcie (podgląd)' : form.imageUrl ? 'Zastąp zdjęcie' : 'Wgraj zdjęcie'}
                  </p>
                  <label
                    onDragOver={(e) => { e.preventDefault() }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const f = e.dataTransfer.files?.[0]
                      if (f && f.type.startsWith('image/')) setSelectedImage(f)
                    }}
                    className="aspect-square rounded-lg border-2 border-dashed border-[#D4D3D0] bg-[#FAFAF9] hover:border-[#1A1A1A] transition-colors cursor-pointer flex items-center justify-center overflow-hidden relative group"
                  >
                    {previewUrl ? (
                      <>
                        <img src={previewUrl} alt="" className="w-full h-full object-contain" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="text-white text-sm font-medium">Zmień plik</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center px-4">
                        <Upload size={24} className="mx-auto text-[#737373] mb-2" />
                        <p className="text-sm text-[#525252]">Przeciągnij lub kliknij</p>
                        <p className="text-xs text-[#A3A3A3] mt-1">webp · png · jpg · avif</p>
                      </div>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/webp,image/png,image/jpeg,image/avif"
                      onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
                    />
                  </label>

                  {selectedImage && (
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-[#737373]">
                      <span className="truncate font-mono">{selectedImage.name}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="text-[#A3A3A3] hover:text-red-600 shrink-0"
                      >
                        Anuluj
                      </button>
                    </div>
                  )}

                  {selectedImage && (
                    <p className="mt-3 text-xs text-[#737373]">
                      Zdjęcie zostanie zapisane razem z produktem przez główny przycisk w nagłówku.
                    </p>
                  )}
                </div>
              </div>

              {showManualImageUrl && (
                <div className="pt-4 border-t border-[#F0EFEC] space-y-3">
                  <Field label="URL obrazu (ręcznie)">
                    <input
                      className="admin-input w-full font-mono text-xs"
                      value={form.imageUrl}
                      onChange={(e) => handleFieldChange('imageUrl', e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === 'tresc' && !isCreateMode && product && initialWineDetails && isWineCategory && (
            <div className="space-y-5">
              <SectionCard title="Winnica">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                  <Field label="Przypisana winnica z D1">
                    <select
                      className="admin-input w-full"
                      value={selectedProducerSlug}
                      onChange={(e) => setSelectedProducerSlug(e.target.value)}
                    >
                      <option value="">Brak przypisanej winnicy</option>
                      {wineProducers.map((producer) => (
                        <option key={producer.slug} value={producer.slug}>
                          {producer.name} — {producer.region}, {producer.country}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Link
                    href="/admin/content"
                    className="btn-secondary text-sm inline-flex items-center justify-center"
                  >
                    Zarządzaj winnicami
                  </Link>
                </div>
                <p className="text-xs text-[#737373]">
                  Opis i kafelki sekcji Historia & Terroir będą pobierane z rekordu winnicy w D1.
                </p>
              </SectionCard>
              <WineDetailsEditor
                sku={sku}
                product={product}
                initialWineDetails={initialWineDetails}
                embedded
                draft={wineDetailsDraft}
                resetKey={wineDetailsResetKey}
                onDraftChange={handleWineDetailsDraftChange}
              />
            </div>
          )}
          {activeTab === 'tresc' && !isCreateMode && product && !isWineCategory && (
            <RichContentEditor
              sku={sku}
              category={product.category?.slug ?? 'wine'}
              product={product}
              managedSave
              draft={richContentDraft}
              onDraftChange={handleRichContentDraftChange}
            />
          )}
          {activeTab === 'tresc' && isCreateMode && (
            <SectionCard title="Treść premium">
              <p className="text-sm text-[#737373]">Dostępne po utworzeniu produktu.</p>
            </SectionCard>
          )}
        </div>
      </div>

      {/* Modals */}
      {showHistory && product && (
        <StockHistoryModal sku={product.sku} productName={product.name || ''} onClose={() => setShowHistory(false)} />
      )}
      {showAllegroLink && product && (
        <AllegroLinkModal
          currentSku={sku}
          currentOfferId={form.allegroOfferId || null}
          currentSyncPrice={form.allegroSyncPrice}
          currentSyncStock={form.allegroSyncStock}
          onLinked={(offerId, options) => {
            setForm((p) => ({
              ...p,
              allegroOfferId: offerId,
              allegroSyncPrice: options.syncPrice,
              allegroSyncStock: options.syncStock,
            }))
            setShowAllegroLink(false)
            setMessage('Oferta Allegro została połączona')
          }}
          onClose={() => setShowAllegroLink(false)}
        />
      )}
      {showPermanentDelete && product && (
        <PermanentDeleteProductModal
          product={product}
          busy={deleting}
          onClose={() => setShowPermanentDelete(false)}
          onConfirm={() => void handlePermanentDelete()}
        />
      )}
    </div>
  )
}
