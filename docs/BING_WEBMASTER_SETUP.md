# Bing Webmaster Setup (Faza 3)

Cel: uruchomic pelna obsluge Bing Webmaster Tools dla ilbuoncaffe.pl i zbudowac powtarzalny proces diagnostyczny indeksacji.

## 1. Zakres i wymagania

1. Wlasciwosc: `https://ilbuoncaffe.pl` (kanoniczna domena).
2. Weryfikacja: DNS TXT (preferowana).
3. Sitemap glowna: `https://ilbuoncaffe.pl/sitemap.xml`.
4. Role: owner (biznes) + technical owner (dev).

## 2. Konfiguracja krok po kroku

1. Wejdz do https://www.bing.com/webmasters.
2. Dodaj nowa witryne: `https://ilbuoncaffe.pl`.
3. Wybierz metode weryfikacji `DNS TXT`.
4. Dodaj rekord TXT u operatora DNS dla domeny glownej.
5. Poczekaj na propagacje i wykonaj `Verify` w Bing Webmaster.
6. W sekcji Sitemaps dodaj `https://ilbuoncaffe.pl/sitemap.xml`.
7. Wlaczenie podstawowych raportow: Coverage, Crawl Control, URL Inspection.

## 3. URL Inspection - minimalny zestaw testowy

Po aktywacji property sprawdz URL Inspection dla:

1. `https://ilbuoncaffe.pl/`
2. `https://ilbuoncaffe.pl/sklep`
3. `https://ilbuoncaffe.pl/sklep/kawa`
4. 2 reprezentatywne karty produktowe
5. `https://ilbuoncaffe.pl/o-nas`

Kryterium sukcesu:
- URL crawlable,
- brak blokady przez robots,
- brak nieoczekiwanego canonical poza domena kanoniczna.

## 4. Crawl i index governance

1. Nie zmieniaj robots bez aktualizacji testow z [docs/SEO_REGRESSION_MATRIX.md](docs/SEO_REGRESSION_MATRIX.md).
2. Po kazdym deployu web wykonaj smoke SEO (`SEO-01`..`SEO-10`).
3. Przy wzroscie katalogu przygotuj podzial sitemap na index + sekcje (produkty/kategorie/content).

## 5. Definicja Done (Faza 3 / Bing)

1. Property zweryfikowane (DNS TXT).
2. Sitemap przyjeta i okresowo odswiezana.
3. URL Inspection pozytywne dla URL krytycznych.
4. Raport Coverage nie zawiera krytycznych bledow blokujacych indeksacje.
5. Procedura monitoringu i incydentow jest aktywna (playbook).

## 6. Typowe problemy

1. `DNS fetch failed` mimo poprawnej konfiguracji DNS:
- odczekaj 15-30 min i powtorz test,
- porownaj odpowiedzi z publicznych resolverow,
- sprawdz [docs/incidents/bing-dns-fetch-failed.md](docs/incidents/bing-dns-fetch-failed.md).

2. Niska liczba zaindeksowanych URL:
- potwierdz robots i sitemap,
- sprawdz statusy HTTP i canonical,
- przeanalizuj logi crawl i soft-404.
