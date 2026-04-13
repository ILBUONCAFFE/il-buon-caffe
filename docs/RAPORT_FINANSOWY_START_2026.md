# Raport Finansowy Po Uruchomieniu (Prognoza 12M)

Data: 2026-04-13  
Projekt: Il Buon Caffe  
Waluta: PLN

## 1. Zakres analizy

Raport opiera sie na aktualnej konfiguracji projektu:
- architektura monorepo (Next.js + Cloudflare Workers + Neon Postgres),
- realny schemat bazy danych (zamowienia, pozycje, platnosci, kanal `shop`/`allegro`),
- aktualny harmonogram cron i bindingi Cloudflare,
- aktualny seed cenowy katalogu produktow.

Raport to prognoza biznesowa po starcie sklepu, a nie wynik historyczny.

## 2. Wnioski techniczne, ktore wplywaja na finanse

### 2.1 Struktura i gotowosc operacyjna
- Platforma ma rozdzielony frontend i API oraz gotowa warstwe e-commerce i admin.
- W bazie sa wszystkie pola potrzebne do raportowania przychodow: `subtotal`, `shippingCost`, `taxAmount`, `total`, `currency`, `totalPln`, `source`, statusy zamowien.
- Zamowienia sa unifikowane w jednej tabeli (`shop` + `allegro`), co ulatwia raporty kanalowe i marzowosc.

### 2.2 Cloudflare i koszty infrastruktury
- Aktualne cron expressions: `0 * * * *`, `*/10 * * * *`, `5,15,25,35,45,55 * * * *`, `0 3 * * *`.
- To daje 313 wywolan scheduler/dobe (bez ruchu userow), czyli bardzo niski poziom wzgledem limitow Workers Free.
- W kodzie jest nocne "thinning" i guardy KV, wiec nocna aktywnosc DB/API jest dodatkowo ograniczana.
- Przy starcie projektu koszt Cloudflare powinien byc niski i przewidywalny (glownie storage + operacje ponad free, jesli wystapia).

### 2.3 Dane i ryzyka raportowe
- W kodzie istnieje niespojnosc progu darmowej dostawy: 150 PLN (komunikacja/sekcje UI) vs 200 PLN (checkout).
- Widok `/admin/finance` jest placeholderem (raporty finansowe nie sa jeszcze wdrozone jako UI operacyjny).
- Brakuje trwalego kosztu zakupu per SKU w modelu DB, wiec marza brutto jest liczona modelowo (procentowo), nie z realnego COGS per produkt.

## 3. Zalozenia finansowe do prognozy

### 3.1 Koszyk i kanal sprzedazy
- Srednia cena katalogowa z seedu: 110.8 PLN.
- Przyjeta srednia liczba pozycji na zamowienie: 1.6.
- Srednia wartosc zamowienia (AOV, blend): 184.5 PLN.
- Mix kanalow: 65% sklep wlasny, 35% Allegro.

### 3.2 Koszty zmienne
- COGS (koszt towaru): 61.0% GMV (modelowo, do czasu wdrozenia kosztu per SKU).
- Oplaty kanalowe i platnosci (blend): 4.89% GMV.
  - Allegro prowizje przyjete w pasmie rynkowym (ok. 8-15% dla kanalow marketplace).
  - Platnosci online (P24) przyjete modelowo jako czesc blendu.
- Pakowanie + netto doplata do logistyki: 7.5 PLN / zamowienie.

### 3.3 Koszty stale (operacyjne)
Model bazowy (12M):
- M1-M3: 16 500 PLN / mies.
- M4-M6: 17 000 PLN / mies.
- M7-M9: 17 500 PLN / mies.
- M10-M12: 18 000 PLN / mies.

W kosztach stalych sa: marketing performance, narzedzia, ksiegowosc/obsluga, koszty operacyjne i infrastruktura.

## 4. Wynik jednostkowy (na 1 zamowienie)

- Przychod: 184.50 PLN
- COGS (61%): 112.55 PLN
- Oplaty kanalowe/platnosci (4.89%): 9.02 PLN
- Pakowanie + logistyka netto: 7.50 PLN
- **Contribution margin na zamowienie: 55.43 PLN**

Punkt rentownosci miesiecznej (orientacyjnie):
- przy kosztach stalych 17 500 PLN: ok. **316 zamowien/mies.**

## 5. Prognoza 12M - scenariusze

| Scenariusz | Zamowienia / rok | GMV (PLN) | Contribution (PLN) | Koszty stale (PLN) | EBITDA (PLN) | Marza EBITDA |
|---|---:|---:|---:|---:|---:|---:|
| Ostrozny | 2 700 | 498 150 | 149 669 | 204 000 | -54 331 | -10.9% |
| Bazowy | 4 220 | 778 590 | 233 927 | 207 000 | 26 927 | 3.5% |
| Dynamiczny | 6 400 | 1 180 800 | 354 771 | 234 000 | 120 771 | 10.2% |

## 6. Scenariusz bazowy - przebieg po starcie

### 6.1 Trajektoria (M1 -> M12)
- Zamowienia miesieczne: 160 -> 480.
- Break-even miesieczny: okolice miesiaca 5.
- Break-even skumulowany: okolice miesiaca 9.

### 6.2 Punkty kontrolne

| Miesiac | Zamowienia | Przychod (PLN) | Contribution (PLN) | Koszty stale (PLN) | EBITDA mies. (PLN) |
|---|---:|---:|---:|---:|---:|
| M1 | 160 | 29 520 | 8 869 | 16 500 | -7 631 |
| M3 | 260 | 47 970 | 14 413 | 16 500 | -2 087 |
| M6 | 360 | 66 420 | 19 956 | 17 000 | 2 956 |
| M9 | 420 | 77 490 | 23 282 | 17 500 | 5 782 |
| M12 | 480 | 88 560 | 26 608 | 18 000 | 8 608 |

## 7. Zapotrzebowanie gotowkowe po starcie

Dla scenariusza bazowego rekomendowany bufor na start:
- Deficyt operacyjny do break-even skumulowanego: ~15 tys. PLN.
- Zapas towaru i rotacja (2-3 mies.): ~90-130 tys. PLN.
- Bufor rozliczeniowo-podatkowy i zwroty: ~25-35 tys. PLN.

**Rekomendowany kapital startowy: 130-180 tys. PLN.**

## 8. Najwazniejsze ryzyka i ich wplyw finansowy

1. Niespojny prog darmowej dostawy (150 vs 200)
- Wplyw: zaburzenie konwersji i marzy logistycznej.
- Priorytet: wysoki.

2. Brak kosztu zakupu per SKU w schemacie produktowym
- Wplyw: marza liczona orientacyjnie, nie ksiegowo.
- Priorytet: wysoki.

3. Placeholder `/admin/finance`
- Wplyw: brak operacyjnego kokpitu P&L/cashflow dla decyzji tygodniowych.
- Priorytet: sredni-wysoki.

4. Rozjazd miedzy starsza dokumentacja cron a runtime
- Wplyw: ryzyko blednych decyzji kosztowych, jesli zespol opiera sie na starych estymacjach.
- Priorytet: sredni.

## 9. Rekomendowane dzialania (kolejne 2 tygodnie)

1. Ujednolicic prog darmowej dostawy w checkout + komunikacji marketingowej.
2. Dodac koszt zakupu do modelu finansowego per SKU (pole lub tabela kosztowa + historia zmian).
3. Wdrozyc MVP `/admin/finance`: dzien, miesiac, kanal, marza, prowizje, cashflow.
4. Wlaczyc codzienne snapshoty KPI do KV (sprzedaz, marza, prowizje, top SKU).
5. Ustalic tygodniowy rytm rewizji prognozy (plan vs actual, rolling forecast 90 dni).

## 10. Podsumowanie dla decyzji biznesowej

- Technicznie projekt jest gotowy do wejscia w faze monetyzacji: architektura i model danych wspieraja raportowanie finansowe.
- Przy obecnych zalozeniach **scenariusz bazowy domyka 12M na dodatnim EBITDA (+26.9 tys. PLN)**, ale wymaga dyscypliny kosztowej i kontroli marzy.
- Klucz do poprawy wyniku: precyzyjny COGS per SKU + szybkie uruchomienie realnego kokpitu finansowego admina.
