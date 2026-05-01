'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  PackageCheck,
  PackagePlus,
  RefreshCcw,
  Search,
  Truck,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { adminApi, type ShippingCenterRow, type ShippingQueue, type ShippingCenterSummary } from '../../lib/adminApiClient'

const LIMIT = 50

const QUEUES: Array<{ key: ShippingQueue; label: string; metric: keyof ShippingCenterSummary; icon: typeof Truck }> = [
  { key: 'all', label: 'Wszystkie', metric: 'total', icon: Truck },
  { key: 'to_ship', label: 'Do nadania', metric: 'toShip', icon: PackagePlus },
  { key: 'label_created', label: 'Etykieta', metric: 'labelCreated', icon: FileText },
  { key: 'awaiting_pickup', label: 'Odbior', metric: 'awaitingPickup', icon: Clock3 },
  { key: 'in_transit', label: 'W drodze', metric: 'inTransit', icon: Truck },
  { key: 'problem', label: 'Problem', metric: 'problem', icon: AlertTriangle },
  { key: 'delivered', label: 'Dostarczone', metric: 'delivered', icon: CheckCircle2 },
  { key: 'stale', label: 'Nieaktualne', metric: 'stale', icon: RefreshCcw },
]

const DATE_TIME = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return DATE_TIME.format(date)
}

function age(value: string | null): string {
  if (!value) return '-'
  const then = new Date(value).getTime()
  if (!Number.isFinite(then)) return '-'
  const minutes = Math.max(0, Math.floor((Date.now() - then) / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} h`
  return `${Math.floor(hours / 24)} dni`
}

function queueBadgeClass(queue: ShippingQueue): string {
  if (queue === 'problem') return 'bg-red-50 text-red-700 border-red-200'
  if (queue === 'stale') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (queue === 'delivered') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  if (queue === 'in_transit') return 'bg-sky-50 text-sky-700 border-sky-200'
  if (queue === 'to_ship') return 'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]'
  return 'bg-[#F5F4F1] text-[#525252] border-[#E5E4E1]'
}

function queueLabel(queue: ShippingQueue): string {
  return QUEUES.find((q) => q.key === queue)?.label ?? queue
}

function uniqueOrderIds(rows: ShippingCenterRow[]): number[] {
  return Array.from(new Set(rows.map((row) => row.orderId)))
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

function ShipmentDrawer({
  row,
  onClose,
  onRefresh,
  actionBusy,
}: {
  row: ShippingCenterRow | null
  onClose: () => void
  onRefresh: (rows: ShippingCenterRow[], force?: boolean) => Promise<void>
  actionBusy: boolean
}) {
  const router = useRouter()
  if (!row) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-[#1A1A1A]/30" onClick={onClose} />
      <aside className="relative h-full w-full max-w-xl bg-white border-l border-[#E5E4E1] shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#E5E4E1] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#737373]">Przesylka</p>
            <h2 className="text-lg font-semibold text-[#1A1A1A]">{row.orderNumber}</h2>
          </div>
          <button className="p-2 rounded-lg text-[#737373] hover:bg-[#F5F4F1]" onClick={onClose} aria-label="Zamknij">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <div className="flex items-center justify-between gap-3">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${queueBadgeClass(row.queue)}`}>
                {queueLabel(row.queue)}
              </span>
              <span className="text-sm text-[#737373]">Aktualizacja: {formatDate(row.occurredAt)}</span>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[#A3A3A3]">Waybill</dt>
                <dd className="font-mono text-[#1A1A1A] break-all">{row.waybill ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-[#A3A3A3]">Shipment ID WzA</dt>
                <dd className="font-mono text-[#1A1A1A] break-all">{row.allegroShipmentId ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-[#A3A3A3]">Przewoznik</dt>
                <dd className="text-[#1A1A1A]">{row.carrierName ?? row.carrierId ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-[#A3A3A3]">Fulfillment</dt>
                <dd className="text-[#1A1A1A]">{row.fulfillmentStatus ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-[#A3A3A3]">Klient</dt>
                <dd className="text-[#1A1A1A]">{row.customerName ?? row.buyerLogin ?? '-'}</dd>
              </div>
              <div>
                <dt className="text-[#A3A3A3]">Metoda dostawy</dt>
                <dd className="text-[#1A1A1A]">{row.shippingMethod ?? '-'}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Timeline</h3>
            <div className="space-y-3">
              {(row.events.length > 0 ? [...row.events].reverse() : [{ code: row.statusCode, label: row.statusLabel, occurredAt: row.occurredAt }]).map((event, index) => (
                <div key={`${event.code}-${event.occurredAt ?? index}`} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-[#1A1A1A]" />
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{event.label ?? event.code}</p>
                    <p className="text-xs text-[#737373]">{event.code} · {formatDate(event.occurredAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-wrap gap-2">
            <button className="btn-secondary text-sm inline-flex items-center gap-2" onClick={() => onRefresh([row], true)} disabled={actionBusy}>
              <RefreshCcw size={15} /> Odswiez
            </button>
            <button className="btn-secondary text-sm inline-flex items-center gap-2" onClick={() => router.push(`/admin/orders/${row.orderId}`)}>
              <ExternalLink size={15} /> Zamowienie
            </button>
          </section>
        </div>
      </aside>
    </div>
  )
}

export function ShippingView() {
  const router = useRouter()
  const [rows, setRows] = useState<ShippingCenterRow[]>([])
  const [summary, setSummary] = useState<ShippingCenterSummary>({
    total: 0,
    toShip: 0,
    labelCreated: 0,
    awaitingPickup: 0,
    inTransit: 0,
    problem: 0,
    delivered: 0,
    stale: 0,
  })
  const [carriers, setCarriers] = useState<string[]>([])
  const [queue, setQueue] = useState<ShippingQueue>('all')
  const [carrierId, setCarrierId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [drawerRow, setDrawerRow] = useState<ShippingCenterRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedRows = useMemo(() => rows.filter((row) => selected.has(row.id)), [rows, selected])
  const selectedShipmentIds = selectedRows.map((row) => row.allegroShipmentId).filter((id): id is string => !!id)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await adminApi.getShippingCenter({
        page: 1,
        limit: LIMIT,
        queue,
        search,
        carrierId,
      })
      setRows(res.data)
      setSummary(res.summary)
      setCarriers(res.filters.carriers)
      setSelected(new Set())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad ladowania centrum przesylek')
    } finally {
      setLoading(false)
    }
  }, [carrierId, queue, search])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [])

  const handleSearch = (value: string) => {
    setSearchInput(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(value.trim()), 350)
  }

  const refreshRows = async (targetRows: ShippingCenterRow[], force = false) => {
    if (targetRows.length === 0) return
    setActionBusy(true)
    setNotice(null)
    setError(null)
    try {
      await adminApi.refreshShippingOrders(uniqueOrderIds(targetRows), force)
      setNotice('Tracking zostal odswiezony.')
      await fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie odswiezyc przesylek')
    } finally {
      setActionBusy(false)
    }
  }

  const downloadLabels = async () => {
    const orderIds = uniqueOrderIds(selectedRows)
    if (orderIds.length === 0) return
    setActionBusy(true)
    setError(null)
    try {
      for (const orderId of orderIds) {
        const blob = await adminApi.getShipmentLabel(orderId, 'all')
        downloadBlob(blob, `etykiety-${orderId}.pdf`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie pobrac etykiet')
    } finally {
      setActionBusy(false)
    }
  }

  const downloadProtocol = async () => {
    if (selectedShipmentIds.length === 0) return
    setActionBusy(true)
    setError(null)
    try {
      const blob = await adminApi.getShipmentProtocol(selectedShipmentIds)
      downloadBlob(blob, 'protokol-nadania.pdf')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie pobrac protokolu')
    } finally {
      setActionBusy(false)
    }
  }

  const cancelFirstShipment = async () => {
    const shipmentId = selectedShipmentIds[0]
    if (!shipmentId) return
    setActionBusy(true)
    setError(null)
    try {
      const res = await adminApi.cancelAllegroShipment(shipmentId)
      setNotice(`Anulowanie przesylki: ${res.data.status}`)
      await fetchRows()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udalo sie anulowac przesylki')
    } finally {
      setActionBusy(false)
    }
  }

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1A1A1A]">Centrum przesylek</h1>
          <p className="text-sm text-[#737373] mt-1">Allegro, Wysylam z Allegro i tracking przewoznikow</p>
        </div>
        <button
          className="btn-primary inline-flex items-center gap-2 text-sm"
          onClick={() => refreshRows(rows, true)}
          disabled={actionBusy || rows.length === 0}
        >
          <RefreshCcw size={16} /> Odswiez widok
        </button>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {QUEUES.map((item) => {
          const Icon = item.icon
          const active = queue === item.key
          return (
            <button
              key={item.key}
              className={`h-24 rounded-lg border px-3 py-3 text-left transition-colors ${
                active ? 'border-[#1A1A1A] bg-[#F5F4F1]' : 'border-[#E5E4E1] bg-white hover:bg-[#FAFAF9]'
              }`}
              onClick={() => setQueue(item.key)}
            >
              <div className="flex items-center justify-between">
                <Icon size={17} className={active ? 'text-[#1A1A1A]' : 'text-[#737373]'} />
                <span className="text-xl font-semibold text-[#1A1A1A]">{summary[item.metric]}</span>
              </div>
              <p className="mt-3 text-xs font-medium text-[#525252]">{item.label}</p>
            </button>
          )
        })}
      </section>

      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
          <input
            value={searchInput}
            onChange={(event) => handleSearch(event.target.value)}
            className="admin-input w-full pl-9"
            placeholder="Szukaj: zamowienie, waybill, klient, Allegro ID"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="admin-input h-10 text-sm" value={carrierId} onChange={(event) => setCarrierId(event.target.value)}>
            <option value="">Wszyscy przewoznicy</option>
            {carriers.map((carrier) => (
              <option key={carrier} value={carrier}>{carrier}</option>
            ))}
          </select>
          {selectedRows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-secondary text-sm inline-flex items-center gap-2" onClick={() => refreshRows(selectedRows, true)} disabled={actionBusy}>
                <RefreshCcw size={15} /> Odswiez ({selectedRows.length})
              </button>
              <button className="btn-secondary text-sm inline-flex items-center gap-2" onClick={downloadLabels} disabled={actionBusy || selectedShipmentIds.length === 0}>
                <Download size={15} /> Etykiety
              </button>
              <button className="btn-secondary text-sm inline-flex items-center gap-2" onClick={downloadProtocol} disabled={actionBusy || selectedShipmentIds.length === 0}>
                <FileText size={15} /> Protokol
              </button>
              <button className="btn-secondary text-sm inline-flex items-center gap-2 text-red-700" onClick={cancelFirstShipment} disabled={actionBusy || selectedShipmentIds.length !== 1}>
                <X size={15} /> Anuluj
              </button>
            </div>
          )}
        </div>
      </section>

      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="overflow-hidden rounded-lg border border-[#E5E4E1] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F5F4F1] text-xs text-[#737373]">
              <tr>
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={(event) => setSelected(event.target.checked ? new Set(rows.map((row) => row.id)) : new Set())}
                    className="rounded border-[#D4D3D0]"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Zamowienie</th>
                <th className="px-4 py-3 text-left font-medium">Klient</th>
                <th className="px-4 py-3 text-left font-medium">Waybill</th>
                <th className="px-4 py-3 text-left font-medium">Przewoznik</th>
                <th className="px-4 py-3 text-left font-medium">Fulfillment</th>
                <th className="px-4 py-3 text-left font-medium">Ostatnie zdarzenie</th>
                <th className="px-4 py-3 text-right font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EFEC]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[#737373]">Ladowanie przesylek...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-[#737373]">Brak przesylek dla wybranych filtrow.</td>
                </tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#FAFAF9]">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelected(row.id)}
                      className="rounded border-[#D4D3D0]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${queueBadgeClass(row.queue)}`}>
                      {queueLabel(row.queue)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="font-semibold text-[#1A1A1A] hover:underline" onClick={() => setDrawerRow(row)}>
                      {row.orderNumber}
                    </button>
                    <div className="font-mono text-xs text-[#A3A3A3]">{row.externalOrderId ?? '-'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[#1A1A1A]">{row.customerName ?? row.buyerLogin ?? '-'}</div>
                    <div className="text-xs text-[#A3A3A3]">{row.customerEmail ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#1A1A1A] max-w-[180px] truncate">{row.waybill ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div>{row.carrierName ?? row.carrierId ?? '-'}</div>
                    <div className="text-xs text-[#A3A3A3]">{row.shippingMethod ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#525252]">{row.fulfillmentStatus ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="text-[#1A1A1A]">{row.statusLabel ?? row.statusCode}</div>
                    <div className="text-xs text-[#A3A3A3]">{formatDate(row.occurredAt)} · {age(row.occurredAt)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-2 rounded-lg text-[#737373] hover:bg-[#F5F4F1]" onClick={() => refreshRows([row], true)} title="Odswiez tracking">
                        <RefreshCcw size={15} />
                      </button>
                      <button className="p-2 rounded-lg text-[#737373] hover:bg-[#F5F4F1]" onClick={() => router.push(`/admin/orders/${row.orderId}`)} title="Przejdz do zamowienia">
                        <ExternalLink size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ShipmentDrawer row={drawerRow} onClose={() => setDrawerRow(null)} onRefresh={refreshRows} actionBusy={actionBusy} />
    </div>
  )
}
