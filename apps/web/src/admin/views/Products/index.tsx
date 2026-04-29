'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi, type AdminCategory, type AdminProduct, type AdminProductsQueryParams } from '../../lib/adminApiClient'
import { MoreVertical, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { StockAdjustModal } from './StockAdjustModal'

const PAGE_LIMIT = 50

function formatPrice(value: number): string {
  return `${value.toFixed(2)} zl`
}

export const ProductsView = () => {
  const router = useRouter()

  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busySku, setBusySku] = useState<string | null>(null)
  const [adjustTarget, setAdjustTarget] = useState<AdminProduct | null>(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all')
  const [categoryFilter, setCategoryFilter] = useState('')

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCategories = useCallback(async () => {
    try {
      const res = await adminApi.getCategories()
      setCategories(res.data)
    } catch {
      // Categories filter is optional — keep list view functional on transient errors.
      setCategories([])
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params: AdminProductsQueryParams = { page, limit: PAGE_LIMIT }
      if (search.trim()) params.search = search.trim()
      if (activeFilter !== 'all') params.active = activeFilter
      if (categoryFilter) params.category = categoryFilter

      const res = await adminApi.getProducts(params)
      setProducts(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad ladowania produktow')
    } finally {
      setLoading(false)
    }
  }, [activeFilter, categoryFilter, page, search])

  useEffect(() => {
    void fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    void fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [])

  const handleSearch = (value: string) => {
    setSearchInput(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)

    searchTimer.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 350)
  }

  const handleDeactivate = async (sku: string) => {
    const accepted = window.confirm(`Czy na pewno zdezaktywowac produkt ${sku}?`)
    if (!accepted) return

    setBusySku(sku)
    setError(null)
    try {
      await adminApi.deactivateProduct(sku)
      await fetchProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie zdezaktywowac produktu')
    } finally {
      setBusySku(null)
    }
  }

  const handleDeletePermanently = async (sku: string) => {
    const typed = window.prompt(`Trwałe usunięcie jest nieodwracalne.\n\nWpisz SKU produktu (${sku}) aby potwierdzić:`)
    if (typed?.trim().toUpperCase() !== sku.toUpperCase()) return

    setBusySku(sku)
    setError(null)
    try {
      await adminApi.deleteProductPermanently(sku)
      await fetchProducts()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie usunac produktu')
    } finally {
      setBusySku(null)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-[#1A1A1A]">Produkty</h1>
          <p className="text-sm text-[#737373] mt-1">Zarządzanie katalogiem, stanem i aktywnością SKU.</p>
        </div>

        <button className="btn-primary text-sm w-full sm:w-auto" onClick={() => router.push('/admin/products/new')}>
          Nowy produkt
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
        <input
          type="text"
          placeholder="Szukaj po nazwie produktu"
          className="admin-input flex-1 min-w-0 sm:min-w-[260px]"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
        />

        <select
          className="admin-input min-w-0 sm:min-w-[170px]"
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value as 'all' | 'true' | 'false')
            setPage(1)
          }}
        >
          <option value="all">Wszystkie statusy</option>
          <option value="true">Tylko aktywne</option>
          <option value="false">Tylko nieaktywne</option>
        </select>

        <select
          className="admin-input min-w-0 sm:min-w-[200px]"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value)
            setPage(1)
          }}
        >
          <option value="">Wszystkie kategorie</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-[#E5E4E1] overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAFAF9] text-[#A3A3A3] text-[11px] uppercase tracking-wider border-b border-[#E5E4E1]">
              <th className="text-left px-4 py-3 font-medium">SKU</th>
              <th className="text-left px-4 py-3 font-medium">Nazwa</th>
              <th className="text-left px-4 py-3 font-medium">Kategoria</th>
              <th className="text-right px-4 py-3 font-medium">Cena</th>
              <th className="text-right px-4 py-3 font-medium">Dostępne</th>
              <th className="text-left px-4 py-3 font-medium">Allegro</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Stan</th>
              <th className="text-right px-4 py-3 font-medium">Akcje</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F0EFEC] last:border-0">
                  <td colSpan={9} className="px-4 py-4">
                    <div className="h-4 bg-[#F5F4F1] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-[#A3A3A3]">
                  Brak produktów dla wybranych filtrów
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.sku}
                  className={`border-b border-[#F0EFEC] last:border-0 cursor-pointer transition-colors ${
                    product.available <= 2
                      ? 'bg-[#FFFBEB] hover:bg-[#FEF9C3]'
                      : 'hover:bg-[#FAFAF9]'
                  }`}
                  onClick={() => router.push(`/admin/products/${encodeURIComponent(product.sku)}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-[#525252]">{product.sku}</td>
                  <td className="px-4 py-3 text-[#1A1A1A]">{product.name}</td>
                  <td className="px-4 py-3 text-[#525252]">{product.category?.name || '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#1A1A1A]">{formatPrice(product.price)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${
                    product.available <= 2 ? 'text-[#D97706]' : 'text-[#1A1A1A]'
                  }`}>
                    {product.available}
                    {product.available <= 2 && <span className="ml-1 text-xs">⚠</span>}
                  </td>
                  <td className="px-4 py-3">
                    {product.allegroOfferId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EEF4FF] text-[#0066CC] text-xs font-mono">
                        {product.allegroOfferId.slice(0, 8)}…
                      </span>
                    ) : (
                      <span className="text-[#A3A3A3] text-xs">–</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.isActive ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEE2E2] text-[#B91C1C]'
                      }`}
                    >
                      {product.isActive ? 'Aktywny' : 'Nieaktywny'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setAdjustTarget(product)}
                      className="px-2 py-1 text-xs rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#F5F4F1] transition-colors"
                      title="Koryguj stan"
                    >
                      Stan
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-secondary text-xs"
                        onClick={() => router.push(`/admin/products/${encodeURIComponent(product.sku)}`)}
                      >
                        Edytuj
                      </button>

                      {product.isActive ? (
                        <button
                          className="btn-secondary text-xs"
                          disabled={busySku === product.sku}
                          onClick={() => void handleDeactivate(product.sku)}
                        >
                          {busySku === product.sku ? '...' : 'Dezaktywuj'}
                        </button>
                      ) : (
                        <button
                          className="px-2 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          disabled={busySku === product.sku}
                          onClick={() => void handleDeletePermanently(product.sku)}
                        >
                          {busySku === product.sku ? '...' : 'Usuń'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-[#E5E4E1] p-4 animate-pulse space-y-3">
              <div className="flex justify-between"><div className="h-4 bg-[#F5F4F1] rounded w-32" /><div className="h-4 bg-[#F5F4F1] rounded w-16" /></div>
              <div className="h-3 bg-[#F5F4F1] rounded w-full" />
              <div className="h-8 bg-[#F5F4F1] rounded w-full" />
            </div>
          ))
        ) : products.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E5E4E1] py-16 text-center text-[#A3A3A3]">Brak produktów</div>
        ) : (
          products.map((product) => (
            <div key={product.sku} className="bg-white rounded-xl border border-[#E5E4E1] p-4 cursor-pointer active:scale-[0.99] transition-all" onClick={() => router.push(`/admin/products/${encodeURIComponent(product.sku)}`)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium text-sm text-[#1A1A1A]">{product.name}</div>
                  <div className="text-xs text-[#A3A3A3] mt-0.5">{product.category?.name || '-'} · <span className="font-mono">{product.sku}</span></div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-sm text-[#1A1A1A]">{formatPrice(product.price)}</div>
                  <div className="text-xs text-[#A3A3A3] mt-0.5">Dost: {product.available}</div>
                </div>
              </div>
              <div className="border-t border-[#F0EFEC] my-3" />
              <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${product.isActive ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
                  {product.isActive ? 'Aktywny' : 'Nieaktywny'}
                </span>
                
                <div className="flex gap-2">
                  {product.isActive ? (
                    <button className="btn-secondary text-xs" disabled={busySku === product.sku} onClick={() => void handleDeactivate(product.sku)}>
                      {busySku === product.sku ? '...' : 'Dezaktywuj'}
                    </button>
                  ) : (
                    <button
                      className="px-2 py-1 text-xs rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                      disabled={busySku === product.sku}
                      onClick={() => void handleDeletePermanently(product.sku)}
                    >
                      {busySku === product.sku ? '...' : 'Usuń'}
                    </button>
                  )}
                  <button className="btn-secondary text-xs" onClick={() => router.push(`/admin/products/${encodeURIComponent(product.sku)}`)}>
                    Edytuj
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-[#737373]">Lącznie: {total}</p>

        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 btn-secondary text-sm disabled:opacity-40"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Poprzednia</span>
          </button>
          <span className="text-sm text-[#737373] min-w-[110px] text-center">
            Strona {page} / {totalPages}
          </span>
          <button
            className="flex items-center gap-1 btn-secondary text-sm disabled:opacity-40"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <span className="hidden sm:inline">Następna</span>
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>

      {adjustTarget && (
        <StockAdjustModal
          product={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSaved={() => { setAdjustTarget(null); void fetchProducts() }}
        />
      )}
    </div>
  )
}
