# Pending Orders — lepsza informacja i poprawka revenue

**Data:** 2026-03-30
**Scope:** `apps/web/src/admin/views/Orders/index.tsx` (tylko frontend)

---

## Problem

1. **Bug — revenue w subtitle:** `stats.revenue` liczy wszystkie zamówienia poza `cancelled`, co zawyża przychód o wartość zamówień oczekujących na płatność (`pending`). Powinno liczyć tylko opłacone stany: `paid`, `processing`, `shipped`, `delivered`.

2. **Brak informacji o oczekujących:** Liczba zamówień `pending` nie pojawia się nigdzie w widoku — admin nie wie ile zamówień czeka na płatność bez przełączania się na zakładkę "Oczekujące".

3. **Brak wizualnego wyróżnienia:** Wiersze pending w tabeli wyglądają identycznie jak opłacone — trudno je szybko dostrzec.

---

## Rozwiązanie

### 1. Poprawka revenue

**Plik:** `apps/web/src/admin/views/Orders/index.tsx`

```ts
// przed (błąd — liczy pending):
revenue: orders.filter(o => o.status !== 'cancelled').reduce(...)

// po (tylko faktycznie opłacone):
revenue: orders
  .filter(o => ['paid', 'processing', 'shipped', 'delivered'].includes(o.status))
  .reduce((s, o) => s + Number(o.totalPln ?? (o.currency === 'PLN' ? o.total : 0)), 0)
```

### 2. Pending count w stats i subtitle

Dodać `pending` do obiektu `stats`:

```ts
const stats = {
  pending: orders.filter(o => o.status === 'pending').length,
  paid: ...,
  processing: ...,
  shipped: ...,
  revenue: ..., // poprawiony jak wyżej
}
```

Subtitle (`subtitleParts`) — dodać przed "w realizacji":

```ts
if (stats.pending > 0) subtitleParts.push(`${stats.pending} oczekujące`)
```

Kolejność: `47 zamówień · 3 oczekujące · 5 w realizacji · 4 500,00 zł przychodu`

### 3. Amber highlight na wierszach pending

W tabeli list (widok `list`), wiersz `<tr>` dla zamówienia z `status === 'pending'` otrzymuje:

- **lewy border:** `border-l-2 border-amber-400` (2px, bursztynowy)
- **tło:** `bg-amber-50/30` zamiast domyślnego `hover:bg-[#FAFAF9]`
- **ikona Clock** (lucide-react, size=12, kolor `text-amber-500`) obok kwoty w kolumnie "Kwota"

Przykład klasy na `<tr>`:
```tsx
className={`transition-colors cursor-pointer group ${
  order.status === 'pending'
    ? 'border-l-2 border-amber-400 bg-amber-50/30 hover:bg-amber-50/50'
    : 'hover:bg-[#FAFAF9]'
}`}
```

Ikona przy kwocie:
```tsx
<td className="px-4 py-3.5 text-right pr-5">
  <div className="flex items-center justify-end gap-1.5">
    {order.status === 'pending' && <Clock size={12} className="text-amber-500 shrink-0" />}
    <span className="font-semibold text-[#1A1A1A] font-mono text-sm tabular-nums">
      {formatAmount(...)}
    </span>
  </div>
</td>
```

### Widok kanban

Bez zmian — kolumna "Oczekujące" jest już wyraźnie oddzielona.

---

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `apps/web/src/admin/views/Orders/index.tsx` | stats.pending, poprawka revenue, amber highlight w tabeli |

---

## Co NIE jest częścią tego zakresu

- Zmiany w API (backend jest już poprawny — wyklucza pending z revenue)
- Dashboard / HeroMetrics (API już poprawnie filtruje po `paidAt` i statusach)
- Kanban view
- OrderDetailModal
