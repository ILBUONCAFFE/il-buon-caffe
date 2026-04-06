# Returns Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/admin/orders/returns` page matching the Orders page style — full UI with tabs, filters, table, context menu, detail modal, and bulk bar — stubbed against a not-yet-existing API.

**Architecture:** Pure frontend — all components mirror the Orders pattern exactly (tab bar, checkbox table, context menu via portal, slide-in detail modal). A `getReturns` stub in `adminApiClient` returns empty data until the API endpoint is built. Types live in `admin-api.ts` alongside `AdminOrder`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, lucide-react, `createPortal`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `apps/web/src/admin/types/admin-api.ts` | Add `AdminReturn`, `ReturnItem`, `ReturnsResponse`, `ReturnsQueryParams`, `ReturnStatus`, `ReturnReason` types |
| Modify | `apps/web/src/admin/lib/adminApiClient.ts` | Add stub `getReturns()` method |
| Create | `apps/web/src/admin/components/ReturnStatusBadge.tsx` | Status badge — mirrors `OrderStatusBadge` |
| Create | `apps/web/src/admin/components/ReturnContextMenu.tsx` | Right-click / 3-dot menu — mirrors `OrderContextMenu` |
| Create | `apps/web/src/admin/components/ReturnDetailModal.tsx` | Slide-in detail modal — mirrors `OrderDetailModal` |
| Create | `apps/web/src/admin/views/Returns/index.tsx` | Full view: tabs, filters, table, pagination, bulk bar |
| Create | `apps/web/src/app/admin/orders/returns/page.tsx` | Next.js page shell |

> **Not needed:** Breadcrumb and Sidebar already handle `/admin/orders/returns` — verified in code.

---

### Task 1: Add shared types to `admin-api.ts`

**Files:**
- Modify: `apps/web/src/admin/types/admin-api.ts` — append after existing types

- [ ] **Step 1: Append the Return types**

Open `apps/web/src/admin/types/admin-api.ts` and add at the end of the file:

```typescript
// ── Returns ──────────────────────────────────────────────────────────────────

export type ReturnStatus = 'new' | 'in_review' | 'approved' | 'rejected' | 'refunded' | 'closed'

export type ReturnReason =
  | 'damaged'
  | 'wrong_item'
  | 'not_as_described'
  | 'change_of_mind'
  | 'other'

export interface ReturnItem {
  productSku: string
  productName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface AdminReturn {
  id: number
  returnNumber: string
  orderId: number
  orderNumber: string
  createdAt: string
  updatedAt: string
  status: ReturnStatus
  reason: ReturnReason
  reasonNote: string | null
  items: ReturnItem[]
  totalRefundAmount: number | null
  currency: string
  customerData: {
    name: string
    email: string
    phone?: string
  } | null
}

export interface ReturnsQueryParams {
  page?: number
  limit?: number
  status?: string
  search?: string
  from?: string
  to?: string
}

export interface ReturnsResponse {
  data: AdminReturn[]
  meta: { total: number; page: number; limit: number }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/admin/types/admin-api.ts
git commit -m "feat(types): add AdminReturn types to admin-api"
```

---

### Task 2: Add `getReturns` stub to `adminApiClient.ts`

**Files:**
- Modify: `apps/web/src/admin/lib/adminApiClient.ts`

- [ ] **Step 1: Add import for new types**

In `adminApiClient.ts`, find the existing import from `../types/admin-api` and add `AdminReturn`, `ReturnsQueryParams`, `ReturnsResponse` to it:

```typescript
import type {
  // ...existing imports...,
  AdminReturn,
  ReturnsQueryParams,
  ReturnsResponse,
} from '../types/admin-api'
```

- [ ] **Step 2: Add stub method**

Inside the `adminApi` object, after the shipment section, add:

```typescript
// ── Returns ──────────────────────────────────────────────────────────────────
// TODO: wire up to GET /api/admin/returns when the API endpoint exists
getReturns: (_params?: ReturnsQueryParams): Promise<ReturnsResponse> =>
  Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 50 } }),

updateReturnStatus: (_id: number, _status: string): Promise<void> =>
  Promise.resolve(),
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/admin/lib/adminApiClient.ts
git commit -m "feat(admin): add getReturns stub to adminApiClient"
```

---

### Task 3: `ReturnStatusBadge` component

**Files:**
- Create: `apps/web/src/admin/components/ReturnStatusBadge.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import type { ReturnStatus } from '../types/admin-api'

interface ReturnStatusBadgeProps {
  status: ReturnStatus
}

const STATUS_CONFIG: Record<ReturnStatus, { label: string; className: string }> = {
  new:       { label: 'Nowy',              className: 'badge-warning' },
  in_review: { label: 'W rozpatrzeniu',    className: 'badge-info' },
  approved:  { label: 'Zaakceptowany',     className: 'badge-success' },
  rejected:  { label: 'Odrzucony',         className: 'badge-neutral text-[#DC2626] bg-[#FEF2F2]' },
  refunded:  { label: 'Zwrot wyslany',     className: 'badge-neutral text-[#9333EA] bg-[#FAF5FF]' },
  closed:    { label: 'Zamkniety',         className: 'badge-neutral' },
}

export function ReturnStatusBadge({ status }: ReturnStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'badge-neutral' }
  return <span className={config.className}>{config.label}</span>
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/admin/components/ReturnStatusBadge.tsx
git commit -m "feat(admin): add ReturnStatusBadge component"
```

---

### Task 4: `ReturnContextMenu` component

**Files:**
- Create: `apps/web/src/admin/components/ReturnContextMenu.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { AdminReturn, ReturnStatus } from '../types/admin-api'

interface ReturnContextMenuProps {
  ret: AdminReturn
  position: { x: number; y: number }
  onClose: () => void
  onOpenDetails: (ret: AdminReturn) => void
  onChangeStatus: (ret: AdminReturn, status: ReturnStatus) => void
}

const STATUS_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  new:       ['in_review', 'rejected'],
  in_review: ['approved', 'rejected'],
  approved:  ['refunded'],
  rejected:  ['closed'],
  refunded:  ['closed'],
  closed:    [],
}

const STATUS_LABELS: Record<ReturnStatus, string> = {
  new:       'Nowy',
  in_review: 'W rozpatrzeniu',
  approved:  'Zaakceptowany',
  rejected:  'Odrzucony',
  refunded:  'Zwrot wyslany',
  closed:    'Zamkniety',
}

const ALL_STATUSES: ReturnStatus[] = ['new', 'in_review', 'approved', 'rejected', 'refunded', 'closed']

export function ReturnContextMenu({
  ret,
  position,
  onClose,
  onOpenDetails,
  onChangeStatus,
}: ReturnContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuRef.current) return
    const rect = menuRef.current.getBoundingClientRect()
    const menu = menuRef.current
    if (rect.right > window.innerWidth) {
      menu.style.left = `${Math.max(8, position.x - rect.width)}px`
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${Math.max(8, position.y - rect.height)}px`
    }
  }, [position])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('click', onClose)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', onClose)
    }
  }, [handleKeyDown, onClose])

  const allowed = STATUS_TRANSITIONS[ret.status] ?? []

  const copyToClipboard = (text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    onClose()
  }

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[220px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E4E1] py-1 text-sm text-[#1A1A1A] animate-in fade-in zoom-in-95 duration-100"
      style={{ left: position.x, top: position.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1] flex items-center justify-between"
        onClick={() => { onOpenDetails(ret); onClose() }}
      >
        Otworz szczegoly
        <span className="text-xs text-[#A3A3A3]">Enter</span>
      </button>

      <div className="h-px bg-[#F0EFEC] my-1" />

      <div className="group relative">
        <button className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1] flex items-center justify-between">
          Zmien status
          <span className="text-xs text-[#A3A3A3]">&gt;</span>
        </button>

        <div className="hidden group-hover:block absolute left-full top-0 ml-1 min-w-[180px] bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E5E4E1] py-1">
          {ALL_STATUSES.map((status) => {
            const isAllowed = allowed.includes(status)
            const isCurrent = status === ret.status
            return (
              <button
                key={status}
                disabled={!isAllowed}
                className={`w-full px-3 py-1.5 text-left flex items-center gap-2 ${
                  isCurrent
                    ? 'text-[#1A1A1A] font-medium'
                    : isAllowed
                      ? 'hover:bg-[#F5F4F1] text-[#1A1A1A]'
                      : 'text-[#D4D3D0] cursor-not-allowed'
                }`}
                onClick={() => {
                  if (isAllowed) { onChangeStatus(ret, status); onClose() }
                }}
              >
                {isCurrent && <span className="text-xs">✓</span>}
                {STATUS_LABELS[status]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="h-px bg-[#F0EFEC] my-1" />

      <button
        className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1]"
        onClick={() => copyToClipboard(ret.returnNumber)}
      >
        Kopiuj nr zwrotu
      </button>

      <button
        className="w-full px-3 py-2 text-left hover:bg-[#F5F4F1]"
        onClick={() => copyToClipboard(ret.customerData?.email ?? '')}
      >
        Kopiuj email klienta
      </button>
    </div>
  )

  return createPortal(menuContent, document.body)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/admin/components/ReturnContextMenu.tsx
git commit -m "feat(admin): add ReturnContextMenu component"
```

---

### Task 5: `ReturnDetailModal` component

**Files:**
- Create: `apps/web/src/admin/components/ReturnDetailModal.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { ReturnStatusBadge } from './ReturnStatusBadge'
import type { AdminReturn, ReturnStatus } from '../types/admin-api'

interface ReturnDetailModalProps {
  ret: AdminReturn | null
  isOpen: boolean
  onClose: () => void
  onChangeStatus?: (ret: AdminReturn, status: ReturnStatus) => void
}

const REASON_LABELS: Record<string, string> = {
  damaged:          'Uszkodzony produkt',
  wrong_item:       'Bledny produkt',
  not_as_described: 'Niezgodny z opisem',
  change_of_mind:   'Zmiana decyzji',
  other:            'Inne',
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatAmount(value: number | undefined | null, currency = 'PLN'): string {
  if (value == null) return '-'
  const symbol: Record<string, string> = { PLN: 'zl', EUR: 'EUR' }
  return `${Number(value).toFixed(2)} ${symbol[currency] ?? currency}`
}

function InfoRow({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <div className="flex justify-between py-1 gap-4">
      <span className="text-[#666] text-sm shrink-0">{label}</span>
      <span className="text-sm text-[#1A1A1A] text-right max-w-[65%] break-words">{value}</span>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-[#A3A3A3] uppercase tracking-wider mb-2 mt-5 first:mt-0">
      {children}
    </h3>
  )
}

export function ReturnDetailModal({ ret, isOpen, onClose, onChangeStatus }: ReturnDetailModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen || !ret) return null

  const canApprove = ret.status === 'in_review'
  const canReject  = ret.status === 'new' || ret.status === 'in_review'
  const canRefund  = ret.status === 'approved'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#1A1A1A]/30 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.12)] border border-[#E5E4E1] animate-in slide-in-from-bottom-3 fade-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EFEC] shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg font-semibold text-[#1A1A1A] tabular-nums">{ret.returnNumber}</h2>
            <ReturnStatusBadge status={ret.status} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#A3A3A3]">{formatDate(ret.createdAt)}</span>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1.5 rounded-lg text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#F5F4F1] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-5 gap-8 px-6 py-5">

            {/* Left col */}
            <div className="col-span-2 space-y-1">
              <SectionLabel>Klient</SectionLabel>
              <InfoRow label="Imie" value={ret.customerData?.name ?? '-'} />
              <InfoRow label="Email" value={ret.customerData?.email ?? '-'} />
              {ret.customerData?.phone && <InfoRow label="Telefon" value={ret.customerData.phone} />}

              <SectionLabel>Zamowienie</SectionLabel>
              <InfoRow label="Nr zamowienia" value={ret.orderNumber} />
              <InfoRow label="Data zgłoszenia" value={formatDate(ret.createdAt)} />
              <InfoRow label="Ostatnia zmiana" value={formatDate(ret.updatedAt)} />

              <SectionLabel>Powod zwrotu</SectionLabel>
              <InfoRow label="Kategoria" value={REASON_LABELS[ret.reason] ?? ret.reason} />
              {ret.reasonNote && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 mt-2">
                  {ret.reasonNote}
                </div>
              )}
            </div>

            {/* Right col */}
            <div className="col-span-3 space-y-1">
              <SectionLabel>Produkty do zwrotu</SectionLabel>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#A3A3A3] text-xs">
                    <th className="text-left py-1 font-normal">Produkt</th>
                    <th className="text-right py-1 font-normal w-20">Cena</th>
                    <th className="text-right py-1 font-normal w-12">Ilosc</th>
                    <th className="text-right py-1 font-normal w-24">Razem</th>
                  </tr>
                </thead>
                <tbody>
                  {ret.items.map((item, i) => (
                    <tr key={`${item.productSku}-${i}`} className="border-t border-[#F0EFEC]">
                      <td className="py-2">
                        <div className="font-medium text-[#1A1A1A]">{item.productName}</div>
                        <div className="text-xs text-[#A3A3A3]">{item.productSku}</div>
                      </td>
                      <td className="text-right tabular-nums">{formatAmount(item.unitPrice, ret.currency)}</td>
                      <td className="text-right tabular-nums">x{item.quantity}</td>
                      <td className="text-right tabular-nums font-medium">{formatAmount(item.totalPrice, ret.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                {ret.totalRefundAmount != null && (
                  <tfoot>
                    <tr className="border-t-2 border-[#1A1A1A]">
                      <td colSpan={3} className="py-2 font-semibold">Kwota zwrotu</td>
                      <td className="text-right tabular-nums font-semibold">
                        {formatAmount(ret.totalRefundAmount, ret.currency)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>

              <SectionLabel>Historia statusow</SectionLabel>
              <p className="text-sm text-[#A3A3A3]">
                Historia statusow bedzie dostepna po podlaczeniu API.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#F0EFEC] shrink-0">
          {canReject && onChangeStatus && (
            <button
              className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
              onClick={() => { onChangeStatus(ret, 'rejected'); onClose() }}
            >
              Odrzuc zwrot
            </button>
          )}
          {canApprove && onChangeStatus && (
            <button
              className="btn-secondary text-sm"
              onClick={() => { onChangeStatus(ret, 'approved'); onClose() }}
            >
              Zaakceptuj
            </button>
          )}
          {canRefund && onChangeStatus && (
            <button
              className="btn-primary text-sm"
              onClick={() => { onChangeStatus(ret, 'refunded'); onClose() }}
            >
              Potwierdz wyslanie zwrotu
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/admin/components/ReturnStatusBadge.tsx \
        apps/web/src/admin/components/ReturnDetailModal.tsx
git commit -m "feat(admin): add ReturnDetailModal component"
```

---

### Task 6: `ReturnsView` — main view

**Files:**
- Create: `apps/web/src/admin/views/Returns/index.tsx`

- [ ] **Step 1: Create the view**

```typescript
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { adminApi } from '../../lib/adminApiClient'
import { ReturnStatusBadge } from '../../components/ReturnStatusBadge'
import { ReturnContextMenu } from '../../components/ReturnContextMenu'
import { ReturnDetailModal } from '../../components/ReturnDetailModal'
import { Dropdown } from '../../components/ui/Dropdown'
import { DateRangePicker } from '../../components/ui/DateRangePicker'
import type { AdminReturn, ReturnStatus, ReturnsQueryParams } from '../../types/admin-api'

const DATE_FORMATTER = new Intl.DateTimeFormat('pl-PL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '-'
  return DATE_FORMATTER.format(new Date(iso))
}

function formatAmount(value: number | undefined | null, currency = 'PLN'): string {
  if (value == null) return '-'
  const symbol: Record<string, string> = { PLN: 'zl', EUR: 'EUR' }
  return `${Number(value).toFixed(2)} ${symbol[currency] ?? currency}`
}

const REASON_LABELS: Record<string, string> = {
  damaged:          'Uszkodzony produkt',
  wrong_item:       'Bledny produkt',
  not_as_described: 'Niezgodny z opisem',
  change_of_mind:   'Zmiana decyzji',
  other:            'Inne',
}

const STATUS_TABS = [
  { key: 'all',       label: 'Wszystkie' },
  { key: 'new',       label: 'Nowe' },
  { key: 'in_review', label: 'W rozpatrzeniu' },
  { key: 'approved',  label: 'Zaakceptowane' },
  { key: 'rejected',  label: 'Odrzucone' },
  { key: 'refunded',  label: 'Zwrot wyslany' },
  { key: 'closed',    label: 'Zamkniete' },
]

const LIMIT = 50

export const ReturnsView = () => {
  const [returns, setReturns]     = useState<AdminReturn[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState('all')
  const [searchInput, setSearchInput]   = useState('')
  const [search, setSearch]             = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [page, setPage]                 = useState(1)

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [contextMenu, setContextMenu] = useState<{ ret: AdminReturn; x: number; y: number } | null>(null)
  const [detailReturn, setDetailReturn] = useState<AdminReturn | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchReturns = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: ReturnsQueryParams = { page, limit: LIMIT }
      if (statusFilter !== 'all') params.status = statusFilter
      if (search)   params.search = search
      if (dateFrom) params.from   = dateFrom
      if (dateTo)   params.to     = dateTo

      const res = await adminApi.getReturns(params)
      setReturns(res.data)
      setTotal(res.meta.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blad ladowania zwrotow')
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, page, search, statusFilter])

  useEffect(() => { fetchReturns() }, [fetchReturns])

  useEffect(() => {
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [])

  const handleSearch = (value: string) => {
    setSearchInput(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setSearch(value); setPage(1) }, 400)
  }

  const handleStatusFilter = (key: string) => {
    setStatusFilter(key)
    setPage(1)
    setSelectedIds(new Set())
  }

  const handleChangeStatus = async (ret: AdminReturn, status: ReturnStatus) => {
    try {
      await adminApi.updateReturnStatus(ret.id, status)
      await fetchReturns()
    } catch {
      // silent — toast/notification can be added in next iteration
    }
  }

  const handleContextMenu = (e: React.MouseEvent, ret: AdminReturn) => {
    e.preventDefault()
    setContextMenu({ ret, x: e.clientX, y: e.clientY })
  }

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === returns.length) { setSelectedIds(new Set()); return }
    setSelectedIds(new Set(returns.map((r) => r.id)))
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Zwroty</h1>
        <span className="text-sm text-[#A3A3A3] tabular-nums">{total}</span>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-[#F0EFEC] overflow-x-auto">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px whitespace-nowrap ${
              statusFilter === key
                ? 'border-[#1A1A1A] text-[#1A1A1A] font-medium'
                : 'border-transparent text-[#A3A3A3] hover:text-[#666]'
            }`}
            onClick={() => handleStatusFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Szukaj: nr zwrotu, zamowienie, email..."
          className="admin-input flex-1 min-w-[260px]"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={(newFrom, newTo) => {
            setDateFrom(newFrom)
            setDateTo(newTo)
            setPage(1)
          }}
        />
      </div>

      {/* Table or error */}
      {error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-3">{error}</p>
          <button className="btn-primary text-sm" onClick={fetchReturns}>Ponow</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E5E4E1] overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAFAF9] text-[#A3A3A3] text-[11px] uppercase tracking-wider border-b border-[#E5E4E1]">
                <th className="w-[48px] px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={returns.length > 0 && selectedIds.size === returns.length}
                    onChange={handleSelectAll}
                    className="rounded border-[#D4D3D0] focus:ring-1 focus:ring-[#1A1A1A]"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium">Zwrot</th>
                <th className="text-left px-4 py-3 font-medium">Zamowienie</th>
                <th className="text-left px-4 py-3 font-medium">Klient</th>
                <th className="text-left px-4 py-3 font-medium">Powod</th>
                <th className="text-right px-4 py-3 font-medium">Kwota</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="w-[48px] px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F0EFEC] last:border-0">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="h-4 bg-[#F5F4F1] rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[#A3A3A3]">
                    Brak zwrotow
                  </td>
                </tr>
              ) : (
                returns.map((ret) => {
                  const firstItem = ret.items?.[0]
                  const extraCount = (ret.items?.length ?? 0) - 1

                  return (
                    <tr
                      key={ret.id}
                      className="border-b border-[#F0EFEC] last:border-0 hover:bg-[#FAFAF9] cursor-pointer group"
                      onClick={() => setDetailReturn(ret)}
                      onContextMenu={(e) => handleContextMenu(e, ret)}
                    >
                      <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(ret.id)}
                          onChange={() => handleToggleSelect(ret.id)}
                          className="rounded border-[#D4D3D0] focus:ring-1 focus:ring-[#1A1A1A] opacity-0 group-hover:opacity-100 checked:opacity-100"
                        />
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <span className="font-semibold text-[#1A1A1A]">{ret.returnNumber}</span>
                        <div className="text-xs text-[#A3A3A3] mt-1">{formatDateShort(ret.createdAt)}</div>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <span className="text-[#1A1A1A]">{ret.orderNumber}</span>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <div className="text-[#1A1A1A] font-medium">{ret.customerData?.name ?? '-'}</div>
                        <div className="text-xs text-[#A3A3A3] mt-0.5 truncate max-w-[180px]">{ret.customerData?.email ?? ''}</div>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <span className="text-[#1A1A1A]">{REASON_LABELS[ret.reason] ?? ret.reason}</span>
                        {firstItem && (
                          <div className="text-xs text-[#A3A3A3] mt-0.5 truncate max-w-[200px]">{firstItem.productName}{extraCount > 0 && <span className="ml-1 text-[10px] font-medium bg-[#F5F4F1] px-1.5 py-0.5 rounded-full">+{extraCount}</span>}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right align-middle">
                        <span className="font-semibold text-[#1A1A1A]">
                          {formatAmount(ret.totalRefundAmount, ret.currency)}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <ReturnStatusBadge status={ret.status} />
                      </td>

                      <td className="px-4 py-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#E5E4E1] opacity-0 group-hover:opacity-100"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setContextMenu({ ret, x: rect.left, y: rect.bottom + 4 })
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1"/>
                            <circle cx="12" cy="5" r="1"/>
                            <circle cx="12" cy="19" r="1"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#A3A3A3]">Strona {page} z {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              className="btn-secondary text-sm disabled:opacity-40"
              onClick={() => setPage((prev) => prev - 1)}
            >
              Poprzednia
            </button>
            <button
              disabled={page >= totalPages}
              className="btn-secondary text-sm disabled:opacity-40"
              onClick={() => setPage((prev) => prev + 1)}
            >
              Nastepna
            </button>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-3 fade-in duration-200">
          <span className="text-sm font-medium tabular-nums">{selectedIds.size} zaznaczonych</span>
          <div className="h-4 w-px bg-white/20" />
          <button
            className="text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setSelectedIds(new Set())}
          >
            Anuluj zaznaczenie
          </button>
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ReturnContextMenu
          ret={contextMenu.ret}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onOpenDetails={(ret) => setDetailReturn(ret)}
          onChangeStatus={handleChangeStatus}
        />
      )}

      {/* Detail modal */}
      <ReturnDetailModal
        ret={detailReturn}
        isOpen={!!detailReturn}
        onClose={() => setDetailReturn(null)}
        onChangeStatus={handleChangeStatus}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/admin/views/Returns/index.tsx
git commit -m "feat(admin): add ReturnsView component"
```

---

### Task 7: Next.js page

**Files:**
- Create: `apps/web/src/app/admin/orders/returns/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
import { ReturnsView } from '@/admin/views/Returns'

export const metadata = { title: 'Zwroty — Il Buon Caffè Admin' }

export default function ReturnsPage() {
  return <ReturnsView />
}
```

- [ ] **Step 2: Verify the dev server renders the page**

```bash
cd apps/web && npm run dev
```

Navigate to `http://localhost:3000/admin/orders/returns` — page should render with tab bar, empty state "Brak zwrotow", and no console errors.

- [ ] **Step 3: Verify TypeScript compiles clean across the whole project**

```bash
cd ../.. && turbo type-check 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/orders/returns/page.tsx
git commit -m "feat(admin): add Returns page at /admin/orders/returns"
```

---

## Self-Review

**Spec coverage:**
- ✅ Tab bar with all 7 status tabs (all/new/in_review/approved/rejected/refunded/closed)
- ✅ Search + date range filters
- ✅ Table with checkbox, return number, linked order, customer, reason, amount, status, 3-dot menu
- ✅ Skeleton loading (8 rows), empty state, error state with retry
- ✅ Pagination
- ✅ Context menu (open details, change status with transitions, copy)
- ✅ Detail modal (customer, order link, reason/note, items table, action buttons per status)
- ✅ Bulk action bar (count + deselect)
- ✅ No mock data — stub returns `[]` until API exists
- ✅ No backend implementation — `getReturns` / `updateReturnStatus` are stubs
- ✅ Breadcrumb already handles the route (verified)
- ✅ Sidebar already has the nav entry (verified)

**Placeholder scan:** No TBD/TODO in component code. History section has an explicit "available after API" message — intentional.

**Type consistency:** `AdminReturn` / `ReturnStatus` / `ReturnItem` defined once in Task 1, imported by all subsequent tasks. `onChangeStatus: (ret: AdminReturn, status: ReturnStatus) => void` signature consistent across ReturnContextMenu → ReturnDetailModal → ReturnsView.
