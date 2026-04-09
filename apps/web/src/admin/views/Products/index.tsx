'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi, type AdminCategory, type AdminProduct, type AdminProductsQueryParams } from '../../lib/adminApiClient'

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">Produkty</h1>
          <p className="text-sm text-[#737373] mt-1">Zarzadzanie katalogiem, stanem i aktywnoscia SKU.</p>
        </div>

        <button className="btn-primary text-sm" onClick={() => router.push('/admin/products/new')}>
          Nowy produkt
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Szukaj po nazwie produktu"
          className="admin-input min-w-[260px] flex-1"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
        />

        <select
          className="admin-input min-w-[170px]"
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
          className="admin-input min-w-[200px]"
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

      <div className="bg-white rounded-xl border border-[#E5E4E1] overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAFAF9] text-[#A3A3A3] text-[11px] uppercase tracking-wider border-b border-[#E5E4E1]">
              <th className="text-left px-4 py-3 font-medium">SKU</th>
              <th className="text-left px-4 py-3 font-medium">Nazwa</th>
              <th className="text-left px-4 py-3 font-medium">Kategoria</th>
              <th className="text-right px-4 py-3 font-medium">Cena</th>
              <th className="text-right px-4 py-3 font-medium">Dostepne</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-right px-4 py-3 font-medium">Akcje</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F0EFEC] last:border-0">
                  <td colSpan={7} className="px-4 py-4">
                    <div className="h-4 bg-[#F5F4F1] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-[#A3A3A3]">
                  Brak produktow dla wybranych filtrow
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.sku}
                  className="border-b border-[#F0EFEC] last:border-0 hover:bg-[#FAFAF9] cursor-pointer"
                  onClick={() => router.push(`/admin/products/${encodeURIComponent(product.sku)}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-[#525252]">{product.sku}</td>
                  <td className="px-4 py-3 text-[#1A1A1A]">{product.name}</td>
                  <td className="px-4 py-3 text-[#525252]">{product.category?.name || '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#1A1A1A]">{formatPrice(product.price)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#1A1A1A]">{product.available}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        product.isActive ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FEE2E2] text-[#B91C1C]'
                      }`}
                    >
                      {product.isActive ? 'Aktywny' : 'Nieaktywny'}
                    </span>
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
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-[#737373]">Lacznie: {total}</p>

        <div className="flex items-center gap-2">
          <button
            className="btn-secondary text-sm disabled:opacity-40"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Poprzednia
          </button>
          <span className="text-sm text-[#737373] min-w-[110px] text-center">
            Strona {page} / {totalPages}
          </span>
          <button
            className="btn-secondary text-sm disabled:opacity-40"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Nastepna
          </button>
        </div>
      </div>
    </div>
  )
}
