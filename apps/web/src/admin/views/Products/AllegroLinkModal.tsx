'use client'

import { useEffect, useState, useRef } from 'react'
import { X, Search, Link, ChevronLeft, ChevronRight } from 'lucide-react'
import { adminApi } from '../../lib/adminApiClient'
import type { AllegroOffer } from '../../types/admin-api'

type Props = {
  currentSku: string
  currentOfferId: string | null
  currentSyncPrice?: boolean
  currentSyncStock?: boolean
  onLinked: (offerId: string, options: { syncPrice: boolean; syncStock: boolean }) => void
  onClose: () => void
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE:   { label: 'Aktywna',    cls: 'bg-[#ECFDF5] text-[#047857]' },
  INACTIVE: { label: 'Nieaktywna', cls: 'bg-[#F5F4F1] text-[#737373]' },
  ENDED:    { label: 'Zakończona', cls: 'bg-[#FEE2E2] text-[#B91C1C]' },
}

export function AllegroLinkModal({
  currentSku,
  currentOfferId,
  currentSyncPrice = true,
  currentSyncStock = true,
  onLinked,
  onClose,
}: Props) {
  const [offers,  setOffers]  = useState<AllegroOffer[]>([])
  const [total,   setTotal]   = useState(0)
  const [search,  setSearch]  = useState('')
  const [offset,  setOffset]  = useState(0)
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [syncPrice, setSyncPrice] = useState(currentSyncPrice)
  const [syncStock, setSyncStock] = useState(currentSyncStock)
  const LIMIT = 20
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchOffers = (q: string, off: number) => {
    setLoading(true)
    setError(null)
    adminApi.getAllegroOffers({ search: q, limit: LIMIT, offset: off })
      .then(res => { setOffers(res.data); setTotal(res.meta.total) })
      .catch(err => setError(err instanceof Error ? err.message : 'Błąd'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchOffers('', 0)
  }, [])

  const handleSearch = (val: string) => {
    setSearch(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setOffset(0)
      fetchOffers(val, 0)
    }, 400)
  }

  const handleLink = async (offer: AllegroOffer) => {
    setLinking(offer.id)
    setError(null)
    try {
      await adminApi.linkAllegroOffer({ sku: currentSku, offerId: offer.id, syncPrice, syncStock })
      onLinked(offer.id, { syncPrice, syncStock })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd łączenia')
    } finally {
      setLinking(null)
    }
  }

  const totalPages  = Math.ceil(total / LIMIT)
  const currentPage = Math.floor(offset / LIMIT) + 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-[#E5E4E1] flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E4E1] flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[#1A1A1A]">Połącz z ofertą Allegro</h2>
            <p className="text-xs text-[#737373]">SKU: <span className="font-mono">{currentSku}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#F5F4F1] text-[#737373] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-[#E5E4E1] flex-shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Szukaj oferty po tytule…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E5E4E1] text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0066CC]/20 focus:border-[#0066CC]"
            />
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-start gap-2 rounded-xl border border-[#E5E4E1] bg-[#FAFAF9] px-3 py-2 text-sm text-[#525252] cursor-pointer">
              <input
                type="checkbox"
                checked={syncPrice}
                onChange={(event) => setSyncPrice(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#1A1A1A]"
              />
              <span>
                Synchronizuj cenę
                <span className="block text-xs text-[#A3A3A3]">Cena sklepu nadpisze Allegro przy łączeniu.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 rounded-xl border border-[#E5E4E1] bg-[#FAFAF9] px-3 py-2 text-sm text-[#525252] cursor-pointer">
              <input
                type="checkbox"
                checked={syncStock}
                onChange={(event) => setSyncStock(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#1A1A1A]"
              />
              <span>
                Synchronizuj stan
                <span className="block text-xs text-[#A3A3A3]">Dostępna ilość sklepu nadpisze Allegro.</span>
              </span>
            </label>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="m-4 p-3 rounded-xl bg-[#FEE2E2] text-sm text-[#B91C1C]">{error}</div>
          )}
          {loading ? (
            <div className="p-8 text-center text-[#737373] text-sm">Ładowanie ofert…</div>
          ) : offers.length === 0 ? (
            <div className="p-8 text-center text-[#A3A3A3] text-sm">Brak ofert</div>
          ) : (
            <div className="divide-y divide-[#F0EFEC]">
              {offers.map(offer => {
                const isCurrentlyLinked = offer.id === currentOfferId
                const isLinkedElsewhere = offer.linkedSku !== null && offer.linkedSku !== currentSku
                const statusInfo = STATUS_LABEL[offer.status] ?? { label: offer.status, cls: 'bg-[#F5F4F1] text-[#737373]' }

                return (
                  <div
                    key={offer.id}
                    className={`flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAF9] transition-colors ${
                      isCurrentlyLinked ? 'bg-[#EEF4FF]' : ''
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{offer.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-mono text-xs text-[#737373]">{offer.id}</span>
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${statusInfo.cls}`}>
                          {statusInfo.label}
                        </span>
                        {offer.stock !== null && (
                          <span className="text-xs text-[#737373]">Stan: {offer.stock}</span>
                        )}
                        {offer.price !== null && (
                          <span className="text-xs text-[#737373]">{offer.price.toFixed(2)} PLN</span>
                        )}
                      </div>
                      {isLinkedElsewhere && (
                        <p className="text-xs text-[#D97706] mt-0.5">
                          Połączone z: <span className="font-mono">{offer.linkedSku}</span>
                        </p>
                      )}
                      {isCurrentlyLinked && (
                        <p className="text-xs text-[#0066CC] mt-0.5">✓ Aktualnie powiązane</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleLink(offer)}
                      disabled={linking !== null || isCurrentlyLinked}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isCurrentlyLinked
                          ? 'bg-[#EEF4FF] text-[#0066CC] cursor-default'
                          : 'bg-[#F5F4F1] text-[#525252] hover:bg-[#EEF4FF] hover:text-[#0066CC] disabled:opacity-50'
                      }`}
                    >
                      {linking === offer.id ? (
                        'Łączę…'
                      ) : isCurrentlyLinked ? (
                        <><Link size={12} /> Połączone</>
                      ) : (
                        <><Link size={12} /> Połącz</>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-[#E5E4E1] text-sm text-[#737373] flex-shrink-0">
            <span>{total} ofert</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { const o = Math.max(0, offset - LIMIT); setOffset(o); fetchOffers(search, o) }}
                disabled={offset === 0}
                className="p-1.5 rounded-lg border border-[#E5E4E1] hover:bg-[#F5F4F1] disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span>{currentPage} / {totalPages}</span>
              <button
                onClick={() => { const o = offset + LIMIT; setOffset(o); fetchOffers(search, o) }}
                disabled={offset + LIMIT >= total}
                className="p-1.5 rounded-lg border border-[#E5E4E1] hover:bg-[#F5F4F1] disabled:opacity-40 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
