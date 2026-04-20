# SEO Regression Matrix (Storefront + Bing)

Cel: szybki pakiet testow regresji SEO po kazdym deployu web/app i zmianach w metadata, routingu, robots lub sitemap.

## Jak uruchamiac

- Trigger: po kazdym deployu weba.
- Trigger: po zmianach w [apps/web/src/app/robots.ts](apps/web/src/app/robots.ts), [apps/web/src/app/sitemap.ts](apps/web/src/app/sitemap.ts), [apps/web/src/app/layout.tsx](apps/web/src/app/layout.tsx), [apps/web/src/app/sklep/[slug]/page.tsx](apps/web/src/app/sklep/%5Bslug%5D/page.tsx), [apps/web/next.config.mjs](apps/web/next.config.mjs).
- Wykonanie: manualnie (curl) lub jako krok CI smoke (zalecane).

### Runner automatyczny (Faza 4)

- `npm run seo:monitor` — standardowy smoke.
- `npm run seo:monitor:strict` — smoke z ostrzejszym progiem (warnings failują build).
- Skrypt: [scripts/seo-monitoring-check.mjs](scripts/seo-monitoring-check.mjs).

## Must-pass (Faza 1)

| ID | Test | Komenda kontrolna | Oczekiwany wynik |
|---|---|---|---|
| SEO-01 | Canonical host redirect | `curl -sSI https://www.ilbuoncaffe.pl/sklep | head -n 5` | `301` + `Location: https://ilbuoncaffe.pl/sklep` |
| SEO-02 | Root host status | `curl -sSI https://ilbuoncaffe.pl | head -n 5` | `200 OK` |
| SEO-03 | Robots dostepny | `curl -sSI https://ilbuoncaffe.pl/robots.txt | head -n 5` | `200 OK`, `Content-Type: text/plain` |
| SEO-04 | Robots prywatne strefy | `curl -sS https://ilbuoncaffe.pl/robots.txt` | `Disallow` dla `/admin`, `/account`, `/auth`, `/checkout`, `/order`, `/api/` |
| SEO-05 | Sitemap dostepna | `curl -sSI https://ilbuoncaffe.pl/sitemap.xml | head -n 5` | `200 OK`, `Content-Type: application/xml` |
| SEO-06 | Sitemap ma URL | `curl -sS https://ilbuoncaffe.pl/sitemap.xml | grep -o '<url>' | wc -l` | wynik > 0 |
| SEO-07 | Home canonical | `curl -sS https://ilbuoncaffe.pl | grep -i -m1 'rel="canonical"'` | canonical wskazuje host `ilbuoncaffe.pl` |
| SEO-08 | Auth noindex | `curl -sS https://ilbuoncaffe.pl/auth | grep -i -m1 'name="robots"'` | meta robots zawiera `noindex` |
| SEO-09 | Checkout noindex/nofollow | `curl -sS https://ilbuoncaffe.pl/checkout | grep -i -m1 'name="robots"'` | meta robots zawiera `noindex, nofollow` |
| SEO-10 | Admin noindex policy | `curl -sS https://ilbuoncaffe.pl/admin | grep -i -m1 'name="robots"'` | brak indeksacji strefy admin |

## Must-pass (Faza 2+)

| ID | Test | Komenda kontrolna | Oczekiwany wynik |
|---|---|---|---|
| SEO-11 | Nieistniejacy produkt (hard/soft 404) | `curl -sSI https://ilbuoncaffe.pl/sklep/slug-ktorego-nie-ma | head -n 5` + `curl -sS https://ilbuoncaffe.pl/sklep/slug-ktorego-nie-ma | grep -i -m1 'name="robots"'` | `404` lub `200` z `meta robots: noindex` |
| SEO-12 | Product canonical | `curl -sS https://ilbuoncaffe.pl/sklep/<slug> | grep -i -m1 'rel="canonical"'` | canonical zgodny z finalnym slug URL |
| SEO-13 | Product schema | walidator schema.org + source strony produktu | `Product` + `Offer` + `BreadcrumbList` zgodne z trescia |
| SEO-14 | OG image per produkt | source strony produktu | `og:image` wskazuje obraz produktu, nie globalny fallback |

## Odczyt alarmow po deployu

1. Jesli SEO-01 fail: ryzyko duplikacji hosta i split sygnalow kanonicznych.
2. Jesli SEO-03/04 fail: ryzyko blokady crawl lub wycieku indeksacji stref prywatnych.
3. Jesli SEO-05/06 fail: ryzyko utraty odkrywalnosci URL przez Bingbot.
4. Jesli SEO-08/09/10 fail: ryzyko indeksacji stron prywatnych i thin pages.

## Integracja z monitoringiem

- Po kazdym deployu zapisuj wynik testow do changeloga release.
- Co tydzien porownuj wynik smoke z danymi z Bing Webmaster (Coverage/Crawl).
- Krytyczne testy (`SEO-01`, `SEO-03`, `SEO-05`) traktuj jako blokujace rollout.
