# WebAdmin — Specyfikacja Menu & Nawigacji

> **Wersja:** 1.0  
> **Data:** 2026-02-20  
> **Dotyczy:** `apps/web/src/app/admin/*`

---

## Układ (Layout)

```
┌──────────────────────────────────────────────────────────┐
│  Logo + "Admin"                              👤 Admin ▼  │
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│  SIDEBAR │              CONTENT AREA                     │
│  (fixed) │          (scrollable, main slot)              │
│  240px   │                                               │
│          │                                               │
│  ┌─────┐ │                                               │
│  │ 1.  │ │                                               │
│  │ 2.  │ │                                               │
│  │ 3.  │ │                                               │
│  │ ...│ │                                               │
│  │ 9.  │ │                                               │
│  └─────┘ │                                               │
│          │                                               │
├──────────┴───────────────────────────────────────────────┤
│  © Il Buon Caffè Admin v2.1                              │
└──────────────────────────────────────────────────────────┘
```

- Sidebar: pionowe menu, zawsze widoczne (desktop), drawer na mobile
- Ikony: Lucide React (już w projekcie)
- Aktywna pozycja: podświetlenie + bold
- Rozwijane grupy: chevron down/up, animacja

---

## Menu — Pozycje i Rozwinięcia

### 1. Dashboard
| | |
|---|---|
| **Route** | `/admin` |
| **Ikona** | `LayoutDashboard` |
| **Rozwinięcia** | brak — to strona główna panelu |

**Zawartość:**
- KPI karty: zamówienia dziś, przychód dziś/miesiąc, niski stan (<5), oczekujące
- Ostatnie zamówienia (5)
- Alerty: stock < 5, niesynchronizowane Allegro, wygasające zgody RODO
- Quick actions: dodaj produkt, nowe zamówienie ręczne

---

### 2. Zamówienia
| | |
|---|---|
| **Route** | `/admin/orders` |
| **Ikona** | `ShoppingBag` |

**Rozwinięcia (sub-items):**
| Pozycja | Route | Opis |
|---------|-------|------|
| Wszystkie | `/admin/orders` | Lista z filtrami (status, źródło, data) |
| Do realizacji | `/admin/orders?status=paid` | Opłacone, czekają na wysyłkę |
| Allegro | `/admin/orders?source=allegro` | Tylko z Allegro |
| Zwroty/Anulowane | `/admin/orders?status=cancelled` | Cancelled + returns |

**Widok szczegółowy:** `/admin/orders/[id]`
- Dane klienta, produkty, historia statusów, przycisk zmiany statusu
- Faktura PDF (generowanie)
- Timeline zdarzeń (audit log)

---

### 3. Produkty
| | |
|---|---|
| **Route** | `/admin/products` |
| **Ikona** | `Package` |

**Rozwinięcia (sub-items):**
| Pozycja | Route | Opis |
|---------|-------|------|
| Lista produktów | `/admin/products` | Tabela z search, filtr kategorii |
| Dodaj produkt | `/admin/products/new` | Formularz tworzenia |
| Kategorie | `/admin/products/categories` | CRUD kategorii + layout config |
| Stany magazynowe | `/admin/products/stock` | Widok stanów, bulk edit, alerty |

**Widok szczegółowy:** `/admin/products/[sku]`
- Edycja: nazwa, opis, cena, zdjęcia (R2 upload), origin, year
- Zakładka "Wino": `/admin/products/[sku]/wine` — edytor `wine_details` JSONB
  - Grape, region, tasting (eye/nose/palate), food pairing, awards
  - Slider: body, tannins, acidity, sweetness (0-100)
  - Winery info, vinification, aging
- Zakładka "Allegro": mapowanie offer ID, sync status
- Historia zmian stock (stock_changes)

---

### 4. Allegro
| | |
|---|---|
| **Route** | `/admin/allegro` |
| **Ikona** | `ShoppingCart` |

**Rozwinięcia (sub-items):**
| Pozycja | Route | Opis |
|---------|-------|------|
| Mapowanie ofert | `/admin/allegro/mapping` | SKU ↔ offerId, bulk mapping |
| Status synchronizacji | `/admin/allegro/sync` | Circuit breaker status, last poll |
| Logi | `/admin/allegro/logs` | allegro_sync_log tabela, filtry |
| Ustawienia API | `/admin/allegro/settings` | Env (sandbox/prod), credentials |

---

### 5. Finanse
| | |
|---|---|
| **Route** | `/admin/finance` |
| **Ikona** | `Wallet` |

**Rozwinięcia (sub-items):**
| Pozycja | Route | Opis |
|---------|-------|------|
| Transakcje P24 | `/admin/finance/transactions` | Lista płatności, statusy |
| Raporty | `/admin/finance/reports` | Dzienny/tygodniowy/miesięczny breakdown |
| Faktury | `/admin/finance/invoices` | Generowanie + pdf |
| Przychody wg kategorii | `/admin/finance/by-category` | Breakdown per category |

---

### 6. Klienci
| | |
|---|---|
| **Route** | `/admin/customers` |
| **Ikona** | `Users` |

**Rozwinięcia (sub-items):**
| Pozycja | Route | Opis |
|---------|-------|------|
| Lista klientów | `/admin/customers` | Tabela + search (email, name) |
| RODO panel | `/admin/customers/gdpr` | Pending data requests, retention |

**Widok szczegółowy:** `/admin/customers/[id]`
- Dane osobowe (z redakcją dla non-admin)
- Historia zamówień
- Zgody (consents) z datami i IP
- Akcje RODO:
  - 📥 Eksport danych (Art. 20) — JSON/CSV download
  - 🗑️ Anonimizacja (Art. 17) — z potwierdzeniem + audit log
  - 📋 Historia retencji

---

### 7. Treści (CMS)
| | |
|---|---|
| **Route** | `/admin/content` |
| **Ikona** | `FileText` |

**Rozwinięcia (sub-items):**
| Pozycja | Route | Opis |
|---------|-------|------|
| Strony statyczne | `/admin/content/pages` | O nas, kontakt, regulamin |
| Encyklopedia | `/admin/content/encyclopedia` | Artykuły o winach, regionach, szczepach |
| Banery / Hero | `/admin/content/banners` | Hero slider, sezonowe bannery |
| Dokumenty prawne | `/admin/content/legal` | Wersjonowane polityki (RODO wymaga!) |

**Dokumenty prawne** — specjalne:
- Widok: tabela wersji (type, version, effective_from)
- Edytor: rich text / markdown
- Publikacja: nowa wersja = auto-notify users (consents require re-acceptance)

---

### 8. Audyt & RODO
| | |
|---|---|
| **Route** | `/admin/audit` |
| **Ikona** | `Shield` |

**Rozwinięcia (sub-items):**
| Pozycja | Route | Opis |
|---------|-------|------|
| Dziennik audytu | `/admin/audit/log` | Tabela audit_log (Art. 30) |
| Zgody użytkowników | `/admin/audit/consents` | Przegląd all consents |
| Retencja danych | `/admin/audit/retention` | Auto-anonimizacja: status, pending |
| Rejestr przetwarzania | `/admin/audit/registry` | Art. 30 RODO — formal registry |

---

### 9. Ustawienia
| | |
|---|---|
| **Route** | `/admin/settings` |
| **Ikona** | `Settings` |

**Rozwinięcia (sub-items):**
| Pozycja | Route | Opis |
|---------|-------|------|
| Ogólne | `/admin/settings/general` | Nazwa sklepu, waluta, język |
| Użytkownicy admin | `/admin/settings/users` | CRUD kont admin |
| Bezpieczeństwo | `/admin/settings/security` | IP whitelist, session timeout |
| Przelewy24 | `/admin/settings/payments` | Merchant ID, CRC key, env |
| Email (Resend) | `/admin/settings/email` | API key, szablony |
| Backup & Export | `/admin/settings/backup` | DB dump, scheduled exports |

---

## Podsumowanie Route'ów

```
/admin                              → Dashboard
/admin/orders                       → Lista zamówień
/admin/orders?status=paid           → Do realizacji
/admin/orders?source=allegro        → Zamówienia Allegro
/admin/orders?status=cancelled      → Zwroty
/admin/orders/[id]                  → Szczegóły zamówienia
/admin/products                     → Lista produktów
/admin/products/new                 → Nowy produkt
/admin/products/categories          → Kategorie
/admin/products/stock               → Stany magazynowe
/admin/products/[sku]               → Edycja produktu
/admin/products/[sku]/wine          → Edytor wine_details
/admin/allegro                      → Dashboard Allegro
/admin/allegro/mapping              → SKU ↔ offerId
/admin/allegro/sync                 → Status synchronizacji
/admin/allegro/logs                 → Logi sync
/admin/allegro/settings             → API credentials
/admin/finance                      → Przegląd finansów
/admin/finance/transactions         → Transakcje P24
/admin/finance/reports              → Raporty
/admin/finance/invoices             → Faktury
/admin/finance/by-category          → Wg kategorii
/admin/customers                    → Lista klientów
/admin/customers/gdpr               → Panel RODO
/admin/customers/[id]               → Profil klienta
/admin/content                      → Dashboard treści
/admin/content/pages                → Strony statyczne
/admin/content/encyclopedia         → Encyklopedia win
/admin/content/banners              → Banery / Hero
/admin/content/legal                → Dokumenty prawne (wersjonowane)
/admin/audit                        → Dashboard audytu
/admin/audit/log                    → Dziennik (Art. 30)
/admin/audit/consents               → Zgody
/admin/audit/retention              → Retencja danych
/admin/audit/registry               → Rejestr przetwarzania
/admin/settings                     → Dashboard ustawień
/admin/settings/general             → Ogólne
/admin/settings/users               → Konta admin
/admin/settings/security            → IP whitelist, sesje
/admin/settings/payments            → Przelewy24
/admin/settings/email               → Resend config
/admin/settings/backup              → Backup & export
```

**Łącznie:** 9 głównych pozycji menu, ~36 route'ów

---

## Decyzje Techniczne

### Nowa domena?
**NIE.** WebAdmin działa pod `ilbuoncaffe.pl/admin/*` — ten sam Next.js deploy.
Edge middleware (`middleware.ts`) chroni te route'y. `robots: noindex, nofollow`.

### Co z apps/api (Hono Workers)?
**ZOSTAJE** — ale rola się zmienia:
- **Public REST**: produkty, koszyk, zamówienia (klient)
- **Webhooks**: Przelewy24 callback (CRC verify), Allegro events
- **Cron triggers**: Allegro polling (60s), RODO anonymization (weekly), stock sync

**Admin NIE używa apps/api** — Server Actions dają bezpośredni dostęp do DB (Drizzle).
Zero API roundtrip, zero dodatkowego stanu, zero auth middleware po stronie Hono.

### Auth flow (admin)
1. Login: `/admin` → jeśli brak sesji → redirect `/auth?redirect=/admin`
2. Po loginie: httpOnly cookie z JWT (`role: "admin"`)
3. Edge middleware: na każdy request `/admin/*` sprawdza JWT + rolę + IP
4. Session: 2h TTL, refresh on activity

---

> **Następne kroki:** User dostarczy UI design → implementacja komponentów Shell/Sidebar
