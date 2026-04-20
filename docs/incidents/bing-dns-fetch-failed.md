# Incydent: Bing URL Inspection pokazuje "DNS fetch failed"

Cel: szybkie odroznienie chwilowego problemu propagacji od realnej awarii DNS/routingu.

## Objaw

W Bing URL Inspection pojawia sie blad typu `DNS fetch failed` dla URL, ktory z perspektywy przegladarki dziala poprawnie.

## Diagnostyka (kolejnosc)

1. Potwierdz URL i host:
- czy testujesz `https://ilbuoncaffe.pl/...` (kanoniczny host),
- czy URL nie przekierowuje cyklicznie.

2. Sprawdz publiczne resolvery DNS:
- porownaj odpowiedzi dla kilku resolverow (A/AAAA),
- wyklucz lokalny cache DNS.

3. Sprawdz endpointy bazowe:
- `https://ilbuoncaffe.pl/robots.txt` -> 200,
- `https://ilbuoncaffe.pl/sitemap.xml` -> 200.

4. Sprawdz Cloudflare status i zmiany DNS:
- ostatnie zmiany rekordow,
- TTL i propagacja.

## Znana obserwacja operacyjna

Ten blad moze byc przejsciowy nawet przy poprawnym DNS i znika po ponownej inspekcji po 15-30 minutach.

## Dzialania naprawcze

1. Odczekaj 15-30 minut i powtorz URL Inspection.
2. Jesli blad utrzymuje sie >2h:
- porownaj DNS z konfiguracja produkcyjna,
- sprawdz czy nie ma konfliktu hosta www/non-www,
- potwierdz ze robots/sitemap odpowiadaja poprawnie.

## Eskalacja

Eskaluj do ownera infra gdy:

1. kilka niezaleznych URL ma ten sam blad >2h,
2. publiczne resolvery zwracaja niespojne rekordy,
3. dodatkowo pojawiaja sie wzrosty 5xx/crawl drop.
