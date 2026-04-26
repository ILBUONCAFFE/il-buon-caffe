'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link2Off, ArrowUpFromLine, ExternalLink } from 'lucide-react'
import { adminApi } from '../../lib/adminApiClient'
import type { AdminProduct } from '../../types/admin-api'

export function ConnectionsView() {
  const router = useRouter()
  const [products,  setProducts]  = useState<AdminProduct[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [pushing,   setPushing]   = useState<string | null>(null)
  const [pushMsg,   setPushMsg]   = useState<{ sku: string; msg: string } | null>(null)
  const [filter,    setFilter]    = useState<'all' | 'linked' | 'unlinked'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getProducts({ limit: 200 })
      setProducts(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const handlePushStock = async (sku: string) => {
    setPushing(sku)
    setPushMsg(null)
    try {
      const res = await adminApi.pushStockToAllegro(sku)
      setPushMsg({ sku, msg: `✓ Wysłano stan ${res.data.pushed} szt.` })
    } catch (err) {
      setPushMsg({ sku, msg: `✗ ${err instanceof Error ? err.message : 'Błąd'}` })
    } finally {
      setPushing(null)
    }
  }

  const handleUnlink = async (sku: string) => {
    try {
      await adminApi.unlinkAllegroOffer(sku)
      setProducts(prev => prev.map(p => p.sku === sku ? { ...p, allegroOfferId: null } : p))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd odłączania')
    }
  }

  const filtered     = products.filter(p => {
    if (filter === 'linked')   return !!p.allegroOfferId
    if (filter === 'unlinked') return !p.allegroOfferId
    return true
  })
  const linkedCount   = products.filter(p => !!p.allegroOfferId).length
  const unlinkedCount = products.filter(p => !p.allegroOfferId).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Połączenia Allegro</h1>
        <p className="text-sm text-[#737373] mt-1">Zarządzaj mapowaniem SKU → oferta Allegro</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Wszystkich produktów', value: products.length },
          { label: 'Połączonych z Allegro', value: linkedCount },
          { label: 'Bez połączenia',        value: unlinkedCount },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E5E4E1] p-5 shadow-sm">
            <p className="text-2xl font-semibold text-[#1A1A1A] tabular-nums">{value}</p>
            <p className="text-xs text-[#737373] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {([
          { id: 'all',      label: `Wszystkie (${products.length})` },
          { id: 'linked',   label: `Połączone (${linkedCount})` },
          { id: 'unlinked', label: `Bez połączenia (${unlinkedCount})` },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.id
                ? 'bg-[#EEF4FF] text-[#0066CC]'
                : 'text-[#737373] hover:bg-[#F5F4F1] hover:text-[#1A1A1A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#E5E4E1] overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAFAF9] text-[#A3A3A3] text-[11px] uppercase tracking-wider border-b border-[#E5E4E1]">
              <th className="text-left px-4 py-3 font-medium">SKU</th>
              <th className="text-left px-4 py-3 font-medium">Nazwa</th>
              <th className="text-right px-4 py-3 font-medium">Dostępne</th>
              <th className="text-left px-4 py-3 font-medium">Oferta Allegro</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#F0EFEC]">
                  <td colSpan={5} className="px-4 py-4">
                    <div className="h-4 bg-[#F5F4F1] rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-[#A3A3A3]">Brak produktów</td>
              </tr>
            ) : filtered.map(product => {
              const msg = pushMsg?.sku === product.sku ? pushMsg.msg : null

              return (
                <tr key={product.sku} className="border-b border-[#F0EFEC] last:border-0 hover:bg-[#FAFAF9]">
                  <td
                    className="px-4 py-3 font-mono text-xs text-[#525252] cursor-pointer hover:text-[#0066CC]"
                    onClick={() => router.push(`/admin/products/${encodeURIComponent(product.sku)}`)}
                  >
                    {product.sku}
                  </td>
                  <td className="px-4 py-3 text-[#1A1A1A]">{product.name}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-medium ${
                    product.available <= 2 ? 'text-[#D97706]' : 'text-[#1A1A1A]'
                  }`}>
                    {product.available}
                  </td>
                  <td className="px-4 py-3">
                    {product.allegroOfferId ? (
                      <div>
                        <span className="font-mono text-xs text-[#0066CC] bg-[#EEF4FF] px-2 py-0.5 rounded-md">
                          {product.allegroOfferId}
                        </span>
                        {msg && (
                          <p className={`text-xs mt-1 ${msg.startsWith('✓') ? 'text-[#047857]' : 'text-[#B91C1C]'}`}>
                            {msg}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#A3A3A3] text-xs">Nie połączono</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {product.allegroOfferId && (
                        <>
                          <button
                            onClick={() => handlePushStock(product.sku)}
                            disabled={pushing === product.sku}
                            title="Wypchnij stan na Allegro"
                            className="p-1.5 rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#EEF4FF] hover:text-[#0066CC] hover:border-[#BFDBFE] disabled:opacity-40 transition-colors"
                          >
                            <ArrowUpFromLine size={14} />
                          </button>
                          <button
                            onClick={() => handleUnlink(product.sku)}
                            title="Odłącz od Allegro"
                            className="p-1.5 rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#FEE2E2] hover:text-[#B91C1C] hover:border-red-200 transition-colors"
                          >
                            <Link2Off size={14} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => router.push(`/admin/products/${encodeURIComponent(product.sku)}`)}
                        title="Edytuj produkt"
                        className="p-1.5 rounded-lg border border-[#E5E4E1] text-[#525252] hover:bg-[#F5F4F1] transition-colors"
                      >
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
