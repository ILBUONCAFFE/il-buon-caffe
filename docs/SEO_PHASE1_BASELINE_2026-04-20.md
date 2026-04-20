# SEO Phase 1 Baseline (Bing) - 2026-04-20

Cel: ustalic punkt startowy dla indeksacji i crawl quality przed kolejnymi etapami optymalizacji pod Bing Webmaster Tools.

## Snapshot techniczny (T0)

Data pomiaru: 2026-04-20

1. Host canonical
- `https://ilbuoncaffe.pl` -> `200 OK`
- `https://www.ilbuoncaffe.pl` -> `301 Moved Permanently` -> `https://ilbuoncaffe.pl/`

2. Robots
- `https://ilbuoncaffe.pl/robots.txt` -> `200 OK`
- Aktywne blokady stref prywatnych:
  - `/admin`
  - `/account`
  - `/auth`
  - `/checkout`
  - `/order`
  - `/api/`
- Uwaga operacyjna: w robots widoczne sa tez sekcje Cloudflare Managed Content.

3. Sitemap
- `https://ilbuoncaffe.pl/sitemap.xml` -> `200 OK`
- Wykryta liczba wpisow `<url>`: `10`

4. Canonical signal
- Strona glowna zawiera canonical do hosta produkcyjnego (`https://ilbuoncaffe.pl`).

## KPI 30/60/90 dni

Uwaga: metryki "Coverage/Index" wymagaja aktywnej i zweryfikowanej uslugi Bing Webmaster Tools.

| KPI | T0 (2026-04-20) | Cel 30 dni | Cel 60 dni | Cel 90 dni | Zrodlo |
|---|---:|---:|---:|---:|---|
| Crawlability kluczowych URL (home, sklep, kategorie, produkty) | baseline techniczny: OK | >= 95% | >= 97% | >= 98% | Bing URL Inspection + smoke test |
| Odsetek odpowiedzi 2xx dla URL indeksowalnych | do pomiaru po podpieciu logow | >= 95% | >= 97% | >= 98% | CF logs / monitoring |
| Bledy krytyczne Coverage (5xx, blokada robots, redirect loops) | pending | 0 | 0 | 0 | Bing Webmaster Coverage |
| Duplikacja hosta (www vs non-www) | 301 aktywne | 0 zduplikowanych URL | 0 | 0 | Bing index sample |
| Liczba zaindeksowanych URL storefront | pending | rosnacy trend | rosnacy trend | rosnacy trend | Bing index report |
| Soft-404/thin pages | pending | malejacy trend | <= T0 | <= T0 | Bing Coverage + manual QA |

## Ryzyka wykryte na starcie

1. Robots zawiera sekcje zarzadzane przez Cloudflare oraz sekcje aplikacji; trzeba pilnowac spojnosc po deployu.
2. Baseline indeksacji w Bing jest niepelny bez aktywnej konfiguracji Bing Webmaster Tools (to faza 3, ale monitorowanie KPI uruchamiamy od razu po podpieciu).

## Decyzje fazy 1

1. Jedyna domena kanoniczna: `https://ilbuoncaffe.pl`.
2. Scope: SEO techniczne + tresci + internal linking (zgodnie z decyzja produktowa).
3. Narzedzia Microsoft: Clarity tak, UET poza zakresem obecnego etapu.

## Rytm aktualizacji

- Tygodniowo: crawl quality i bledy techniczne.
- Miesiecznie: indeksacja i trendy pokrycia URL.
- Po kazdym deployu: pelny smoke test z macierzy regresji SEO.
