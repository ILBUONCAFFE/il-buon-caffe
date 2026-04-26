'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminApi,
  type AdminCategory,
  type AdminProduct,
  type CreateAdminProductPayload,
  type UpdateAdminProductPayload,
} from '../../lib/adminApiClient'
import { StockHistoryModal } from './StockHistoryModal'
import { AllegroLinkModal } from './AllegroLinkModal'

type ProductEditorViewProps = {
  sku: string
}

type Tab = 'podstawowe' | 'ceny' | 'allegro' | 'media'

type ProductFormState = {
  sku: string
  name: string
  categoryId: string
  price: string
  compareAtPrice: string
  stock: string
  imageUrl: string
  description: string
  longDescription: string
  origin: string
  year: string
  weight: string
  isActive: boolean
  isNew: boolean
  isFeatured: boolean
  allegroOfferId: string
}

const DEFAULT_FORM: ProductFormState = {
  sku: '',
  name: '',
  categoryId: '',
  price: '0',
  compareAtPrice: '',
  stock: '0',
  imageUrl: '',
  description: '',
  longDescription: '',
  origin: '',
  year: '',
  weight: '',
  isActive: true,
  isNew: false,
  isFeatured: false,
  allegroOfferId: '',
}

function trimTo(raw: string, max: number): string {
  return raw.trim().slice(0, max)
}

function parseNonNegativeNumber(raw: string, fieldLabel: string): { ok: true; value: number } | { ok: false; error: string } {
  const normalized = raw.replace(',', '.').trim()
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { ok: false, error: `${fieldLabel} musi byc liczba nieujemna` }
  }
  return { ok: true, value: parsed }
}

function parseOptionalNonNegativeNumber(raw: string, fieldLabel: string): { ok: true; value: number | null } | { ok: false; error: string } {
  if (!raw.trim()) return { ok: true, value: null }
  const result = parseNonNegativeNumber(raw, fieldLabel)
  if (!result.ok) return result
  return { ok: true, value: result.value }
}

function parseNonNegativeInteger(raw: string, fieldLabel: string): { ok: true; value: number } | { ok: false; error: string } {
  const parsed = Number(raw.trim())
  if (!Number.isInteger(parsed) || parsed < 0) {
    return { ok: false, error: `${fieldLabel} musi byc liczba calkowita >= 0` }
  }
  return { ok: true, value: parsed }
}

function mapProductToForm(product: AdminProduct): ProductFormState {
  return {
    sku: product.sku,
    name: product.name || '',
    categoryId: product.categoryId != null ? String(product.categoryId) : '',
    price: String(product.price),
    compareAtPrice: product.compareAtPrice != null ? String(product.compareAtPrice) : '',
    stock: String(product.stock),
    imageUrl: product.imageUrl || '',
    description: product.description || '',
    longDescription: product.longDescription || '',
    origin: product.origin || '',
    year: product.year || '',
    weight: product.weight != null ? String(product.weight) : '',
    isActive: product.isActive,
    isNew: product.isNew,
    isFeatured: product.isFeatured,
    allegroOfferId: product.allegroOfferId || '',
  }
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'podstawowe', label: 'Podstawowe' },
  { id: 'ceny',       label: 'Ceny & Magazyn' },
  { id: 'allegro',    label: 'Allegro' },
  { id: 'media',      label: 'Media & SEO' },
]

export const ProductEditorView = ({ sku }: ProductEditorViewProps) => {
  const router = useRouter()
  const isCreateMode = useMemo(() => sku.toLowerCase() === 'new', [sku])

  const [activeTab, setActiveTab] = useState<Tab>('podstawowe')
  const [form, setForm] = useState<ProductFormState>(DEFAULT_FORM)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [product, setProduct] = useState<AdminProduct | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)

  const [loading, setLoading] = useState(!isCreateMode)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pushingStock, setPushingStock] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [showHistory, setShowHistory] = useState(false)
  const [showAllegroLink, setShowAllegroLink] = useState(false)

  const loadCategories = useCallback(async () => {
    try {
      const res = await adminApi.getCategories()
      setCategories(res.data.filter((category) => category.isActive))
    } catch {
      setCategories([])
    }
  }, [])

  const loadProduct = useCallback(async () => {
    if (isCreateMode) return
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getProduct(sku)
      setProduct(res.data)
      setForm(mapProductToForm(res.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie pobrac produktu')
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }, [isCreateMode, sku])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  useEffect(() => {
    if (isCreateMode) {
      setForm(DEFAULT_FORM)
      setProduct(null)
      setLoading(false)
      return
    }
    void loadProduct()
  }, [isCreateMode, loadProduct])

  const handleFieldChange = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const saveProduct = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)

    const cleanedName = trimTo(form.name, 255)
    if (!cleanedName) { setSaving(false); setError('Nazwa produktu jest wymagana'); return }

    const priceResult = parseNonNegativeNumber(form.price, 'Cena')
    if (!priceResult.ok) { setSaving(false); setError(priceResult.error); return }

    const compareAtResult = parseOptionalNonNegativeNumber(form.compareAtPrice, 'Cena przekreslona')
    if (!compareAtResult.ok) { setSaving(false); setError(compareAtResult.error); return }

    const stockResult = parseNonNegativeInteger(form.stock, 'Stan magazynowy')
    if (!stockResult.ok) { setSaving(false); setError(stockResult.error); return }

    const weightResult = parseOptionalNonNegativeNumber(form.weight, 'Waga')
    if (!weightResult.ok) { setSaving(false); setError(weightResult.error); return }

    const categoryId = form.categoryId ? Number(form.categoryId) : null
    if (categoryId != null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
      setSaving(false); setError('Nieprawidlowa kategoria'); return
    }

    try {
      if (isCreateMode) {
        const normalizedSku = trimTo(form.sku.toUpperCase(), 50)
        if (!normalizedSku) { setError('SKU produktu jest wymagane'); return }

        const createPayload: CreateAdminProductPayload = {
          sku: normalizedSku,
          name: cleanedName,
          categoryId,
          price: priceResult.value,
          compareAtPrice: compareAtResult.value,
          stock: stockResult.value,
          imageUrl: trimTo(form.imageUrl, 500),
          description: trimTo(form.description, 2000),
          longDescription: trimTo(form.longDescription, 50000),
          origin: trimTo(form.origin, 255),
          year: trimTo(form.year, 10),
          weight: weightResult.value,
          isActive: form.isActive,
          isNew: form.isNew,
          isFeatured: form.isFeatured,
          allegroOfferId: trimTo(form.allegroOfferId, 50) || null,
        }

        const created = await adminApi.createProduct(createPayload)

        if (selectedImage) {
          setUploading(true)
          const uploaded = await adminApi.uploadProductMainImage(created.data.sku, selectedImage)
          setForm((prev) => ({ ...prev, imageUrl: uploaded.url }))
          setUploading(false)
        }

        router.replace(`/admin/products/${encodeURIComponent(created.data.sku)}`)
        return
      }

      const updatePayload: UpdateAdminProductPayload = {
        name: cleanedName,
        categoryId,
        price: priceResult.value,
        compareAtPrice: compareAtResult.value,
        imageUrl: trimTo(form.imageUrl, 500),
        description: trimTo(form.description, 2000),
        longDescription: trimTo(form.longDescription, 50000),
        origin: trimTo(form.origin, 255),
        year: trimTo(form.year, 10),
        weight: weightResult.value,
        isActive: form.isActive,
        isNew: form.isNew,
        isFeatured: form.isFeatured,
        allegroOfferId: trimTo(form.allegroOfferId, 50) || null,
      }

      await adminApi.updateProduct(sku, updatePayload)

      if (product && stockResult.value !== product.stock) {
        await adminApi.updateProductStock(sku, {
          stock: stockResult.value,
          reason: 'manual',
          notes: 'Zmiana z panelu admin /products',
        })
      }

      if (selectedImage) {
        setUploading(true)
        const uploaded = await adminApi.uploadProductMainImage(sku, selectedImage)
        setForm((prev) => ({ ...prev, imageUrl: uploaded.url }))
        setUploading(false)
      }

      await loadProduct()
      setSelectedImage(null)
      setMessage('Produkt zostal zapisany')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie zapisac produktu')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  const uploadImageOnly = async () => {
    if (!selectedImage || isCreateMode) return
    setUploading(true)
    setError(null)
    setMessage(null)
    try {
      const uploaded = await adminApi.uploadProductMainImage(sku, selectedImage)
      setForm((prev) => ({ ...prev, imageUrl: uploaded.url }))
      setSelectedImage(null)
      await loadProduct()
      setMessage('Zdjecie zostalo wyslane i zapisane w bazie')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie wyslac zdjecia')
    } finally {
      setUploading(false)
    }
  }

  const pushStockToAllegro = async () => {
    if (!form.allegroOfferId) return
    setPushingStock(true)
    setError(null)
    setMessage(null)
    try {
      await adminApi.pushStockToAllegro(sku)
      setMessage('Stan magazynowy wypchniety na Allegro')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie wypchnac stanu na Allegro')
    } finally {
      setPushingStock(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-56 bg-[#F5F4F1] rounded animate-pulse" />
        <div className="h-28 w-full bg-[#F5F4F1] rounded animate-pulse" />
        <div className="h-28 w-full bg-[#F5F4F1] rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">
            {isCreateMode ? 'Nowy produkt' : `Edycja: ${form.sku}`}
          </h1>
          <p className="text-sm text-[#737373] mt-1">
            {isCreateMode ? 'Wypelnij dane i zapisz nowy produkt.' : `${form.name || '—'} · ${product?.category?.name || 'brak kategorii'}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/products" className="btn-secondary text-sm">Wroc</Link>
          <button
            className="btn-primary text-sm disabled:opacity-40"
            disabled={saving || uploading}
            onClick={() => void saveProduct()}
          >
            {saving ? 'Zapisywanie...' : isCreateMode ? 'Utworz produkt' : 'Zapisz zmiany'}
          </button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}

      {/* Tabs */}
      <div className="border-b border-[#E5E4E1]">
        <nav className="flex gap-1 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1A1A1A] text-[#1A1A1A]'
                  : 'border-transparent text-[#737373] hover:text-[#1A1A1A] hover:border-[#D4D3D0]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab: Podstawowe */}
      {activeTab === 'podstawowe' && (
        <div className="bg-white rounded-xl border border-[#E5E4E1] p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">SKU</label>
              <input
                className="admin-input w-full"
                value={form.sku}
                onChange={(e) => handleFieldChange('sku', e.target.value)}
                disabled={!isCreateMode}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">Kategoria</label>
              <select
                className="admin-input w-full"
                value={form.categoryId}
                onChange={(e) => handleFieldChange('categoryId', e.target.value)}
              >
                <option value="">Brak kategorii</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">Nazwa</label>
              <input
                className="admin-input w-full"
                value={form.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">Opis krotki</label>
              <textarea
                className="admin-input w-full min-h-[80px]"
                value={form.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">Opis dlugi</label>
              <textarea
                className="admin-input w-full min-h-[160px]"
                value={form.longDescription}
                onChange={(e) => handleFieldChange('longDescription', e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-[#525252]">
              <input type="checkbox" checked={form.isActive} onChange={(e) => handleFieldChange('isActive', e.target.checked)} />
              Aktywny
            </label>
            <label className="flex items-center gap-2 text-sm text-[#525252]">
              <input type="checkbox" checked={form.isNew} onChange={(e) => handleFieldChange('isNew', e.target.checked)} />
              Nowosc
            </label>
            <label className="flex items-center gap-2 text-sm text-[#525252]">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => handleFieldChange('isFeatured', e.target.checked)} />
              Wyrozniony
            </label>
          </div>

          {!isCreateMode && product?.isActive ? (
            <div className="pt-2 border-t border-[#F0EFEC]">
              <button
                className="btn-secondary text-sm disabled:opacity-40"
                disabled={saving || uploading}
                onClick={async () => {
                  if (!window.confirm(`Zdezaktywowac produkt ${sku}?`)) return
                  try {
                    await adminApi.deactivateProduct(sku)
                    setMessage('Produkt zdezaktywowany')
                    await loadProduct()
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Nie udalo sie zdezaktywowac produktu')
                  }
                }}
              >
                Dezaktywuj
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Tab: Ceny & Magazyn */}
      {activeTab === 'ceny' && (
        <div className="bg-white rounded-xl border border-[#E5E4E1] p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">Cena (PLN)</label>
              <input
                className="admin-input w-full"
                value={form.price}
                onChange={(e) => handleFieldChange('price', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">Cena przekreslona</label>
              <input
                className="admin-input w-full"
                value={form.compareAtPrice}
                onChange={(e) => handleFieldChange('compareAtPrice', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">Stan magazynowy</label>
              <input
                className="admin-input w-full"
                value={form.stock}
                onChange={(e) => handleFieldChange('stock', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">Waga (g)</label>
              <input
                className="admin-input w-full"
                value={form.weight}
                onChange={(e) => handleFieldChange('weight', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">Pochodzenie</label>
              <input
                className="admin-input w-full"
                value={form.origin}
                onChange={(e) => handleFieldChange('origin', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">Rok</label>
              <input
                className="admin-input w-full"
                value={form.year}
                onChange={(e) => handleFieldChange('year', e.target.value)}
              />
            </div>
          </div>

          {!isCreateMode ? (
            <div className="pt-2 border-t border-[#F0EFEC]">
              <button
                className="btn-secondary text-sm"
                onClick={() => setShowHistory(true)}
              >
                Historia stanów magazynowych
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Tab: Allegro */}
      {activeTab === 'allegro' && (
        <div className="bg-white rounded-xl border border-[#E5E4E1] p-5 space-y-5">
          {isCreateMode ? (
            <p className="text-sm text-[#737373]">Połączenie Allegro dostępne po utworzeniu produktu.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#737373] mb-1">Powiązana oferta Allegro</p>
                  {form.allegroOfferId ? (
                    <p className="font-mono text-sm text-[#1A1A1A] break-all">{form.allegroOfferId}</p>
                  ) : (
                    <p className="text-sm text-[#A3A3A3]">Brak połączenia</p>
                  )}
                </div>
                <button
                  className="btn-secondary text-sm shrink-0"
                  onClick={() => setShowAllegroLink(true)}
                >
                  {form.allegroOfferId ? 'Zmień połączenie' : 'Połącz z ofertą'}
                </button>
              </div>

              {form.allegroOfferId ? (
                <div className="pt-3 border-t border-[#F0EFEC] flex flex-wrap gap-2">
                  <button
                    className="btn-secondary text-sm disabled:opacity-40"
                    disabled={pushingStock}
                    onClick={() => void pushStockToAllegro()}
                  >
                    {pushingStock ? 'Wysyłanie...' : 'Wypchnij stan na Allegro'}
                  </button>
                </div>
              ) : null}

              <div className="rounded-lg bg-[#FAFAF9] border border-[#E5E4E1] p-4 text-xs text-[#737373] space-y-1">
                <p>Zmiana połączenia aktualizuje <code>allegroOfferId</code> w bazie.</p>
                <p>Wypchnięcie stanu wysyła PATCH do Allegro <code>sale/product-offers/{'{id}'}</code>.</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Media & SEO */}
      {activeTab === 'media' && (
        <div className="bg-white rounded-xl border border-[#E5E4E1] p-5 space-y-4">
          <h2 className="text-base font-semibold text-[#1A1A1A]">Zdjecie glowne</h2>

          {form.imageUrl ? (
            <div className="rounded-lg border border-[#E5E4E1] p-2 bg-[#FAFAF9]">
              <img src={form.imageUrl} alt="Podglad produktu" className="w-full max-h-64 object-contain" />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#D4D3D0] p-8 text-center text-sm text-[#A3A3A3]">
              Brak przypisanego zdjecia
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">URL obrazu (manualnie)</label>
            <input
              className="admin-input w-full"
              value={form.imageUrl}
              onChange={(e) => handleFieldChange('imageUrl', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#737373] mb-1">Upload pliku</label>
            <input
              type="file"
              accept="image/webp,image/png,image/jpeg,image/avif"
              onChange={(e) => setSelectedImage(e.target.files?.[0] ?? null)}
            />
            {selectedImage ? (
              <p className="text-xs text-[#737373] mt-2 break-all">Wybrano: {selectedImage.name}</p>
            ) : null}
          </div>

          {!isCreateMode ? (
            <>
              <button
                className="btn-secondary text-sm disabled:opacity-40"
                disabled={!selectedImage || uploading || saving}
                onClick={() => void uploadImageOnly()}
              >
                {uploading ? 'Wysylanie...' : 'Wyslij zdjecie i zapisz URL w DB'}
              </button>
              <p className="text-xs text-[#A3A3A3]">
                Upload zapisuje plik w R2 pod kluczem <code>products/&lt;sku&gt;/main.*</code> i ustawia <code>image_url</code> w Neon.
              </p>
            </>
          ) : (
            <p className="text-xs text-[#737373]">
              W trybie tworzenia upload uruchomi sie automatycznie po utworzeniu produktu.
            </p>
          )}
        </div>
      )}

      {/* Modals */}
      {showHistory && product ? (
        <StockHistoryModal product={product} onClose={() => setShowHistory(false)} />
      ) : null}

      {showAllegroLink && product ? (
        <AllegroLinkModal
          currentSku={sku}
          currentOfferId={form.allegroOfferId || null}
          onLinked={(offerId) => {
            setForm((prev) => ({ ...prev, allegroOfferId: offerId }))
            setShowAllegroLink(false)
            setMessage('Oferta Allegro została połączona')
          }}
          onClose={() => setShowAllegroLink(false)}
        />
      ) : null}
    </div>
  )
}
