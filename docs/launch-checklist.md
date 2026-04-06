# Launch Checklist — Il Buon Caffè

> Cel: wypuścić działający sklep online jak najszybciej, bezpiecznie, zgodnie z polskim prawem.
> Dwa tory biegną równolegle. Zacznij oba w Dniu 1.

---

## TOR A — Biznes i formalności (Ty, poza kodem)

### Dzień 1 — zacznij natychmiast

- [ ] **Zarejestruj konto merchantowe w Przelewy24**
  - Wejdź na merchants.przelewy24.pl
  - Potrzebujesz: NIP, REGON, konto bankowe, dane firmy
  - Czas oczekiwania: 3–7 dni roboczych — im szybciej wyślesz, tym szybciej dostaniesz credentials
  - Po weryfikacji otrzymasz: Merchant ID, API Key, CRC Key

- [ ] **Zarejestruj konto InPost API**
  - Wejdź na inpost.pl → strefa biznesowa → API SendingMethod
  - Potrzebujesz konta firmowego InPost
  - Po rejestracji otrzymasz: API Token

- [ ] **Zweryfikuj domenę nadawczą w AWS SES**
  - AWS Console → SES → Verified Identities → Add domain
  - Dodaj TXT rekordy DNS dla domeny (np. `ilbuoncaffe.pl`)
  - Ustaw adres nadawcy np. `kontakt@ilbuoncaffe.pl`
  - Czas weryfikacji DNS: do 24h
  - Jeśli konto SES jest nowe: złóż wniosek o wyjście z sandbox (Production Access)

### Równolegle — prawnik

- [ ] **Zlecić prawnikowi napisanie dokumentów** (wymagane prawnie przed launchem):
  - Regulamin sklepu
  - Polityka prywatności (RODO)
  - Polityka zwrotów i reklamacji (uwzględnij 14-dniowy zwrot — prawo konsumenckie)
  - Wzór formularza odstąpienia od umowy

### Kiedy credentials z P24 przyjdą

- [ ] Wpisz do Cloudflare Workers secrets: `P24_MERCHANT_ID`, `P24_API_KEY`, `P24_CRC_KEY`
- [ ] Wpisz do Cloudflare Workers secrets: `INPOST_API_TOKEN`

---

## TOR B — Techniczny (programowanie)

> Kolejność odzwierciedla priorytety. Każdy punkt to oddzielne zadanie developerskie.

### Faza 1 — Fundament (blokuje wszystko inne)

- [ ] **1.1 Infrastruktura i deploy**
  - Ustawić wszystkie sekrety w Cloudflare Workers (`wrangler secret put ...`)
  - Uruchomić migracje DB na produkcji (`drizzle-kit migrate`)
  - Zdeployować API (`wrangler deploy` w `apps/api`)
  - Zdeployować Web (`npm run cf:deploy` w `apps/web`)
  - Skonfigurować domenę produkcyjną + SSL
  - → Plan: `docs/superpowers/plans/2026-04-03-infrastructure-deploy.md`

- [ ] **1.2 Kreator produktów w adminie**
  - Pełny CRUD produktów: nazwa, opis, cena, SKU, kategoria, stan, waga
  - Upload zdjęć do R2 z podglądem
  - Ręczna korekta stanu magazynowego
  - Bez tego nie ma co sprzedawać

- [ ] **1.3 Email — AWS SES**
  - Instalacja `aws4fetch`, stworzenie `apps/api/src/lib/email.ts`
  - Szablony PL: weryfikacja konta, reset hasła, potwierdzenie zamówienia
  - Podpięcie do routes auth + orders
  - → Plan: `docs/superpowers/plans/2026-04-03-email-aws-ses.md`

- [ ] **1.4 Checkout → Przelewy24 (wymaga credentials z Toru A)**
  - Zastąpić mock prawdziwym wywołaniem `/api/payments/p24/initiate`
  - Obsługa redirect po płatności + weryfikacja statusu
  - Weryfikacja istniejącego webhook handlera
  - Email potwierdzenia po udanej płatności

- [ ] **1.5 InPost w checkout**
  - Widget paczkomat picker na etapie adresu dostawy
  - Opcja dostawy kurierskiej (adres)
  - Kalkulacja kosztu dostawy na podstawie wagi/wartości koszyka
  - Zapis wybranej metody/punktu do zamówienia

- [ ] **1.6 Strony prawne + cookie consent**
  - Statyczne strony: `/regulamin`, `/polityka-prywatnosci`, `/polityka-zwrotow`
  - Baner cookie consent (RODO) — pojawia się przy pierwszej wizycie
  - Linki w stopce
  - Treść dostarcza prawnik z Toru A

### Faza 2 — Launch-quality (bez tego sklep kuleje po starcie)

- [ ] **2.1 Fulfillment InPost z admina**
  - Z widoku zamówienia w adminie: utwórz przesyłkę InPost via API
  - Pobierz i wydrukuj etykietę (PDF)
  - Zapisz numer śledzenia do zamówienia

- [ ] **2.2 Email powiadomienie o wysyłce**
  - Szablon PL: numer zamówienia + numer śledzenia InPost + link do śledzenia
  - Wysłać gdy admin zapisuje numer śledzenia

- [ ] **2.3 Zwroty — flow dla klienta i admina**
  - Formularz zwrotu w koncie klienta (`/konto/zamowienia/[id]/zwrot`)
  - Lista zwrotów w adminie: akceptuj / odrzuć / odebrane
  - Refund: zatwierdzone zwroty → P24 refund API

- [ ] **2.4 Faktury VAT**
  - Generowanie PDF faktury do każdego zamówienia
  - Dostępne do pobrania w koncie klienta i w adminie
  - Stawki: 23% standard, 8% produkty spożywcze

---

## Ostateczny smoke test przed launch'em

Przed ogłoszeniem sklepu publicznie:

- [ ] Rejestracja konta → email weryfikacyjny przychodzi → konto potwierdzone
- [ ] Login / logout działa
- [ ] Przeglądanie sklepu, filtrowanie, strona produktu
- [ ] Dodanie do koszyka → checkout → wybór Paczkomatu → płatność P24 → potwierdzenie
- [ ] Email potwierdzenia zamówienia przychodzi
- [ ] Admin widzi zamówienie, może zmienić status
- [ ] Strony: `/regulamin`, `/polityka-prywatnosci`, `/polityka-zwrotow` dostępne
- [ ] Cookie consent wyświetla się przy pierwszej wizycie
- [ ] Na telefonie (responsywność) wszystko działa

---

## Co NIE jest potrzebne do launch'u

_(zostaw na po starcie)_

- Allegro integration
- Kody rabatowe / promocje
- System ocen produktów
- Analytics dashboard
- Porzucony koszyk (email reminder)
