# Pending Orders — lepsza informacja i poprawka revenue

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Naprawić zawyżony przychód w widoku Zamówień i dodać widoczny wskaźnik oczekujących (nieopłaconych) zamówień — licznik w subtitle i amber highlight wierszy.

**Architecture:** Jednorazowa zmiana frontendu w `apps/web/src/admin/views/Orders/index.tsx`. Backend jest już poprawny — API wyklucza `pending` z revenue.

**Tech Stack:** React 19, Tailwind CSS 4, lucide-react

---

### Task 1: Poprawka revenue + pending count + amber highlight

**Files:**
- Modify: `apps/web/src/admin/views/Orders/index.tsx`

- [ ] **Krok 1: Dodaj `Clock` do importu lucide-react**

W pliku `apps/web/src/admin/views/Orders/index.tsx` znajdź istniejący import z `lucide-react` i dodaj `Clock`:

```tsx
import { Search, LayoutList, LayoutGrid, Loader2, AlertTriangle, ChevronRight, Clock } from 'lucide-react'
```

(Dopasuj do istniejących importów — dopisz tylko `Clock`.)

- [ ] **Krok 2: Napraw stats — revenue i pending**

Znajdź blok `const stats = {` i zastąp:

```ts
// PRZED:
const stats = {
  paid: orders.filter(o => o.status === 'paid').length,
  processing: orders.filter(o => o.status === 'processing').length,
  shipped: orders.filter(o => o.status === 'shipped').length,
  revenue: orders.filter(o => o.status !== 'cancelled').reduce(
    (s, o) => s + Number(o.totalPln ?? (o.currency === 'PLN' ? o.total : 0)),
    0,
  ),
}

// PO:
const stats = {
  pending: orders.filter(o => o.status === 'pending').length,
  paid: orders.filter(o => o.status === 'paid').length,
  processing: orders.filter(o => o.status === 'processing').length,
  shipped: orders.filter(o => o.status === 'shipped').length,
  revenue: orders
    .filter(o => ['paid', 'processing', 'shipped', 'delivered'].includes(o.status))
    .reduce((s, o) => s + Number(o.totalPln ?? (o.currency === 'PLN' ? o.total : 0)), 0),
}
```

- [ ] **Krok 3: Dodaj pending do subtitle**

Znajdź blok `subtitleParts` i dodaj wpis dla `pending` — PRZED wpisem dla `processing`:

```ts
// PRZED:
if (stats.processing > 0) subtitleParts.push(`${stats.processing} w realizacji`)

// PO:
if (stats.pending > 0) subtitleParts.push(`${stats.pending} oczekujące`)
if (stats.processing > 0) subtitleParts.push(`${stats.processing} w realizacji`)
```

- [ ] **Krok 4: Amber highlight na wierszach pending w tabeli**

Znajdź element `<tr>` w tabeli list (widok list). Obecny kod:

```tsx
<tr
  key={order.id}
  onClick={() => { play('modal-open'); setSelectedOrder(order) }}
  className="hover:bg-[#FAFAF9] transition-colors cursor-pointer group"
>
```

Zastąp:

```tsx
<tr
  key={order.id}
  onClick={() => { play('modal-open'); setSelectedOrder(order) }}
  className={`transition-colors cursor-pointer group ${
    order.status === 'pending'
      ? 'border-l-2 border-amber-400 bg-amber-50/30 hover:bg-amber-50/50'
      : 'hover:bg-[#FAFAF9]'
  }`}
>
```

- [ ] **Krok 5: Ikona Clock przy kwocie dla pending**

Znajdź kolumnę "Kwota" w tabeli — `<td>` z `text-right pr-5`. Obecny kod:

```tsx
<td className="px-4 py-3.5 text-right pr-5">
  <span className="font-semibold text-[#1A1A1A] font-mono text-sm tabular-nums">
    {formatAmount(ord...
```

Zastąp zawartość `<td>`:

```tsx
<td className="px-4 py-3.5 text-right pr-5">
  <div className="flex items-center justify-end gap-1.5">
    {order.status === 'pending' && (
      <Clock size={12} className="text-amber-500 shrink-0" />
    )}
    <span className="font-semibold text-[#1A1A1A] font-mono text-sm tabular-nums">
      {formatAmount(order.totalPln ?? order.total, order.currency)}
    </span>
  </div>
</td>
```

- [ ] **Krok 6: Sprawdź czy aplikacja się kompiluje**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Oczekiwane: brak błędów (lub tylko istniejące wcześniej).

- [ ] **Krok 7: Commit**

```bash
git add apps/web/src/admin/views/Orders/index.tsx
git commit -m "fix(web): exclude pending orders from revenue, add pending count and amber row highlight"
```
