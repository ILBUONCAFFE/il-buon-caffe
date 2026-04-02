# Orders Advanced Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rozbudować wyszukiwanie zamówień o inteligentne parsowanie zapytań (email, NIP, numer śledzenia, produkty) oraz poprawić wygląd paska wyszukiwania.

**Architecture:** Backend (`apps/api/src/routes/admin/orders.ts`) otrzymuje inteligentniejsze zapytanie SQL z warunkami zależnymi od wykrytego typu wyszukiwania. Frontend (`apps/web/src/admin/views/Orders/index.tsx`) dostaje ulepszone UI paska wyszukiwania z przyciskiem clear, wskaźnikiem ładowania i podpowiedzią składni. Żadnych nowych plików — zmiany tylko w istniejących.

**Tech Stack:** Drizzle ORM (SQL raw + ILIKE), Hono.js, React 19, Tailwind CSS 4, Lucide React

---

## Obecny stan

**Backend search** (`apps/api/src/routes/admin/orders.ts:41-45`):
```sql
orders.orderNumber ILIKE $term
OR orders.customerData::text ILIKE $term
OR orders.externalId ILIKE $term
```

**Frontend search** (`apps/web/src/admin/views/Orders/index.tsx:282-291`): prosty `<input>` z ikoną, bez clear button, bez stanu ładowania.

---

## Task 1: Ulepszone UI paska wyszukiwania

**Files:**
- Modify: `apps/web/src/admin/views/Orders/index.tsx:282-303`

- [ ] **Krok 1: Zamień blok search input (linie 282–291) na nową wersję**

```tsx
<div className="relative flex-1">
  <Search
    size={15}
    className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${
      searchQuery ? 'text-[#0066CC]' : 'text-[#A3A3A3]'
    }`}
  />
  <input
    type="text"
    placeholder="Szukaj: nr zamówienia, e-mail, NIP, produkt, numer śledzenia…"
    value={searchQuery}
    onChange={(e) => handleSearchChange(e.target.value)}
    className={`admin-input w-full pl-9 pr-8 transition-all duration-200 ${
      searchQuery ? 'border-[#0066CC]/40 bg-white' : ''
    }`}
  />
  {searchQuery && (
    <button
      onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#525252] transition-colors duration-150"
      title="Wyczyść"
    >
      <X size={14} />
    </button>
  )}
  {loading && searchQuery && (
    <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A3A3A3] animate-spin" />
  )}
</div>
```

> Uwaga: `X` i `Loader2` są już importowane z lucide-react (sprawdź — `Loader2` tak, `X` może wymagać dodania do importu).

- [ ] **Krok 2: Dodaj `X` do importu z lucide-react** (linia ~13 w Orders/index.tsx)

```ts
import {
  Search, LayoutList, LayoutGrid, Package,
  Truck, RefreshCw, Loader2, AlertTriangle, Store, ShoppingBag, FileText,
  ChevronLeft, ChevronRight, Clock, X,
} from 'lucide-react'
```

- [ ] **Krok 3: Napraw konflikt — gdy `loading && searchQuery` oba widgety (X i Loader) chcą być na `right-2.5`**

Powinny być wzajemnie wykluczające: jeśli loading — pokazuj spinner, nie X. Już tak jest w kodzie z kroku 1 — dwie osobne gałęzie `{searchQuery && ...}` i `{loading && searchQuery && ...}`. Upewnij się że `loading && searchQuery` jest OSTATNI (renderuje się na wierzchu, zakrywa X).

Alternatywnie: pokaż X tylko gdy `!loading`:
```tsx
{searchQuery && !loading && (
  <button
    onClick={() => { setSearchQuery(''); setDebouncedSearch('') }}
    ...
  >
    <X size={14} />
  </button>
)}
{loading && debouncedSearch && (
  <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A3A3A3] animate-spin" />
)}
```

- [ ] **Krok 4: Zweryfikuj wizualnie w przeglądarce**

Sprawdź:
- Ikona search zmienia kolor na niebieski gdy coś wpisane
- Pojawia się X gdy jest tekst (i nie ładuje)
- Pojawia się spinner gdy ładuje z aktywnym zapytaniem
- Klik X czyści pole i resetuje wyszukiwanie
- Border zmienia się subtelnie gdy aktywne

- [ ] **Krok 5: Commit**

```bash
git add apps/web/src/admin/views/Orders/index.tsx
git commit -m "feat(admin): improve orders search bar UX — clear button, loading state, active highlight"
```

---

## Task 2: Inteligentne parsowanie zapytania na backendzie

**Files:**
- Modify: `apps/api/src/routes/admin/orders.ts:41-46`

Logika wykrywania typu zapytania:
- `#123` lub same cyfry ≤6 znaków → szukaj po `id` lub `orderNumber`
- zawiera `@` → szukaj po email w customerData
- 10 cyfr bez spacji → może być NIP → szukaj w `customerData::text`
- zaczyna od liter + cyfry (np. `IBC-`, `PL`, litery-litery-cyfry) → orderNumber + externalId + trackingNumber
- domyślnie → szerokie `ILIKE` po wszystkich polach

Nowe pola do przeszukiwania:
- `orders.trackingNumber`
- `orderItems.productName` (JOIN)
- `orders.customerData->>'email'` jako osobny extract (szybsze niż `::text ILIKE`)
- `orders.customerData->>'nip'` dla zapytań z NIPem

- [ ] **Krok 1: Zastąp blok search (linie 41–45) inteligentnym parserem**

```typescript
if (search) {
  const raw  = search.trim()
  const term = `%${raw.replace(/[%_]/g, '')}%`

  // Detect: pure number or #number → search by order id/number
  const isNumericId = /^#?\d{1,8}$/.test(raw)
  // Detect: email
  const isEmail = raw.includes('@')
  // Detect: NIP (10 digits, optionally with dashes)
  const isNip = /^\d{3}[-]?\d{3}[-]?\d{2}[-]?\d{2}$/.test(raw)

  if (isNumericId) {
    const numId = parseInt(raw.replace('#', ''), 10)
    conditions.push(
      sql`(${orders.orderNumber} ILIKE ${term} OR ${orders.id} = ${numId})`
    )
  } else if (isEmail) {
    conditions.push(
      sql`(${orders.customerData}->>'email' ILIKE ${term})`
    )
  } else if (isNip) {
    const cleanNip = raw.replace(/-/g, '')
    const nipTerm  = `%${cleanNip}%`
    conditions.push(
      sql`(${orders.customerData}::text ILIKE ${nipTerm})`
    )
  } else {
    // Wide search: orderNumber, externalId, trackingNumber, customer name/email, product names
    conditions.push(
      sql`(
        ${orders.orderNumber}    ILIKE ${term}
        OR ${orders.externalId}  ILIKE ${term}
        OR ${orders.trackingNumber} ILIKE ${term}
        OR ${orders.customerData}->>'name'  ILIKE ${term}
        OR ${orders.customerData}->>'email' ILIKE ${term}
        OR ${orders.customerData}->>'phone' ILIKE ${term}
        OR EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = ${orders.id}
            AND oi.product_name ILIKE ${term}
        )
      )`
    )
  }
}
```

> **Uwaga do nazw tabel SQL:** Drizzle używa snake_case w bazie (mapper `snake_case()`). Tabela `orderItems` → `order_items`, kolumna `orderId` → `order_id`, `productName` → `product_name`. Zweryfikuj w wygenerowanych migracjach lub w Drizzle Studio.

- [ ] **Krok 2: Sprawdź nazwy kolumn w schemacie**

```bash
grep -n "orderItems\|order_items\|productName\|product_name" packages/db/schema/index.ts | head -20
```

Jeśli kolumna to `productName` w TS → w SQL to `product_name`. Dostosuj EXISTS subquery jeśli inaczej.

- [ ] **Krok 3: Test manualny przez curl lub admin UI**

Sprawdź każdy typ:
```
?search=#5        → ORDER BY id=5
?search=jan@      → filtruje po email zawierającym "jan@"
?search=1234567890 → szuka NIP
?search=kawa      → szuka w nazwie produktu
?search=ALLEGRO   → szuka w externalId
?search=IBC-2024  → szuka w orderNumber
```

- [ ] **Krok 4: Commit**

```bash
git add apps/api/src/routes/admin/orders.ts
git commit -m "feat(api): smart order search — detect email/NIP/id/product patterns"
```

---

## Task 3: Aktualizacja placeholdera i podpowiedź składni na frontendzie

**Files:**
- Modify: `apps/web/src/admin/views/Orders/index.tsx`

- [ ] **Krok 1: Dodaj subtelną podpowiedź składni pod polem wyszukiwania** (opcjonalnie, pokazuje się tylko gdy pole aktywne)

Dodaj pod `<div className="relative flex-1">...</div>` warunkowo renderowany hint:

```tsx
{searchQuery.length > 0 && searchQuery.length < 3 && (
  <p className="absolute top-full left-0 mt-1 text-[11px] text-[#A3A3A3]">
    Szukaj po: e-mailu, #ID, NIP (10 cyfr), nazwie produktu, nr śledzenia
  </p>
)}
```

> Wrap cały blok search+hint w `<div className="relative flex-1">` zamiast dotychczasowego, żeby hint był pozycjonowany względem inputa. Lub po prostu umieść poniżej jako `<p className="mt-1 ...">` bez `absolute`, ale wtedy przesuwa layout.

Prostsze: Nie dodawaj hintu jeśli placeholder jest wystarczająco opisowy — zdecyduj po ocenie wizualnej z Task 1.

- [ ] **Krok 2: Commit (jeśli hint dodany)**

```bash
git add apps/web/src/admin/views/Orders/index.tsx
git commit -m "feat(admin): add search syntax hint tooltip in orders"
```

---

## Task 4: Aktualizacja `OrdersQueryParams` (types)

**Files:**
- Modify: `apps/web/src/admin/types/admin-api.ts:125-133`

Obecnie `OrdersQueryParams` jest wystarczający — pole `search` jest już obecne. Nie ma potrzeby dodawania nowych pól po stronie frontendu.

Jeśli w przyszłości chcesz dodać osobne filtry `searchType?: 'email' | 'nip' | 'id' | 'product' | 'auto'` — poczekaj aż pojawi się konkretna potrzeba (YAGNI).

- [ ] **Krok 1: Opcjonalnie zaktualizuj placeholder w `OrdersQueryParams`**

Brak zmian wymaganych — skip this task.

---

## Self-Review

### Spec coverage
- [x] Zaawansowane wyszukiwanie po email → Task 2 (isEmail branch)
- [x] Wyszukiwanie po NIP → Task 2 (isNip branch)
- [x] Wyszukiwanie po #id numerycznym → Task 2 (isNumericId branch)
- [x] Wyszukiwanie po nazwie produktu (JOIN orderItems) → Task 2 (wide search, EXISTS)
- [x] Wyszukiwanie po trackingNumber → Task 2 (wide search)
- [x] Clear button w search barze → Task 1
- [x] Loading state w search barze → Task 1
- [x] Lepszy placeholder → Task 1

### Placeholder scan
Brak TBD/TODO w kodzie. Wszystkie fragmenty kodu są kompletne.

### Type consistency
- `term` / `nipTerm` — string, używane jako parametry `sql\`\``
- Nazwy kolumn DB muszą być zweryfikowane przez krok 2 w Task 2
