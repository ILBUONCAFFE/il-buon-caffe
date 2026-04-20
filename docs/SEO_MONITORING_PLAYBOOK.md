# SEO Monitoring Playbook (Bing + Storefront)

Cel: stale utrzymanie crawlability, indeksacji i jakosci sygnalow SEO po wdrozeniu Fazy 3.

## 1. Rytm operacyjny

1. Po kazdym deployu:
- uruchom smoke z [docs/SEO_REGRESSION_MATRIX.md](docs/SEO_REGRESSION_MATRIX.md),
- zapisz wynik i ewentualne odchylenia.

2. Co tydzien:
- przeglad Coverage i Crawl stats w Bing Webmaster,
- analiza 4xx/5xx dla URL publicznych,
- kontrola czy sitemap jest aktualna i dostępna.

3. Co miesiac:
- przeglad trendu liczby indeksowanych URL,
- audyt canonical i soft-404,
- rewizja internal linking i content gaps.

## 2. KPI i progi alarmowe

1. Bledy krytyczne Coverage: docelowo `0`.
2. 5xx na URL indeksowalnych: `0` stale; alarm przy kazdym skoku.
3. Crawlability URL testowych: >= 98%.
4. Soft-404/thin pages: trend malejacy m/m.

## 3. Zrodla danych

1. Bing Webmaster: Coverage, URL Inspection, Crawl.
2. Cloudflare logs/analytics: statusy odpowiedzi i trendy ruchu botow.
3. Sitemapy i robots endpointy: kontrola dostepnosci i spojnosc policy.

## 4. Automatyzacja (Faza 4)

1. Lokalnie / ad-hoc:
- `npm run seo:monitor`
- `npm run seo:monitor:strict`

2. Po deployu produkcyjnym:
- workflow [ .github/workflows/deploy.yml ] uruchamia smoke SEO po deployu weba,
- raport zapisuje jako artifact `seo-monitoring-postdeploy`.

3. Monitoring cykliczny:
- workflow [ .github/workflows/seo-monitoring.yml ] uruchamia monitoring codzienny,
- raport zapisuje jako artifact `seo-monitoring-daily`.

4. Kryterium alarmu:
- fail dowolnego checku `critical` = alert natychmiast,
- fail checku `warning` przy trybie `--strict` = alert i przeglad manualny.

## 5. Runbook szybkiej reakcji

1. Spike 5xx:
- potwierdz scope (pojedynczy URL vs wzorzec),
- sprawdz ostatni deploy i middleware/headers,
- wykonaj rollback lub hotfix jesli bledy dotycza URL indeksowalnych.

2. Nagly spadek crawl:
- sprawdz robots i sitemap status,
- sprawdz canonical host redirect,
- zweryfikuj odpowiedzi dla user-agent bingbot.

3. Spadek indeksacji:
- sprawdz URL Inspection dla reprezentatywnych URL,
- porownaj nowy content i linkowanie wewnetrzne,
- usun z sitemap URL noindex/404.

## 6. Wlascicielstwo

1. SEO owner: monitoring Bing Webmaster i KPI.
2. Tech owner: regressions techniczne (headers, robots, sitemap, routing).
3. Content owner: internal linking i publikacje long-tail.
