const BASE_URL = "https://ilbuoncaffe.pl";

export const LLMS_TXT = `# Il Buon Caffe

> Il Buon Caffe to włoska kawiarnia w Koszalinie i sklep online z kawą specialty, włoskimi oraz hiszpańskimi winami, oliwami, makaronami, słodyczami i delikatesami premium. Strona jest w języku polskim i obsługuje klientów w Polsce.

Ten plik jest krótkim, oficjalnym przewodnikiem dla modeli AI i agentów wyszukiwania. Korzystaj z publicznych linków poniżej oraz z sitemap.xml. Pomijaj ścieżki prywatne i techniczne: /admin, /account, /auth, /checkout, /order oraz /api/.

## Najważniejsze informacje

- Marka: Il Buon Caffe
- Typ działalności: kawiarnia, sklep online i delikatesy premium
- Lokalizacja kawiarni: ul. Biskupa Czesława Domina 3/6, 75-065 Koszalin, Polska
- Godziny kawiarni: poniedziałek-piątek 09:00-16:00, sobota 11:00-14:00
- Kontakt: kontakt@ilbuoncaffe.pl, +48 664 937 937
- Rynek: Polska
- Waluta: PLN
- Dostawa: wysyłka na terenie Polski

## Główne strony

- [Strona główna](${BASE_URL}/): najkrótszy opis marki, oferty, kawiarni i danych kontaktowych.
- [Sklep online](${BASE_URL}/sklep): katalog produktów dostępnych do zakupu online.
- [Kawiarnia](${BASE_URL}/kawiarnia): informacje o kawiarni stacjonarnej w Koszalinie.
- [O nas](${BASE_URL}/o-nas): informacje o marce Il Buon Caffe.
- [Kontakt](${BASE_URL}/kontakt): dane kontaktowe i lokalizacja.
- [Encyklopedia](${BASE_URL}/encyklopedia): treści edukacyjne o kawie, winie i delikatesach.

## Oferta

- [Kawa](${BASE_URL}/sklep/kawa): kawy ziarniste specialty i kawy włoskie.
- [Wino](${BASE_URL}/sklep/wino): wina włoskie, hiszpańskie, cava, prosecco i inne alkohole dostępne dla pełnoletnich klientów.
- [Słodycze](${BASE_URL}/sklep/slodycze): włoskie słodycze i produkty deserowe.
- [Spiżarnia](${BASE_URL}/sklep/spizarnia): oliwy, makarony, sosy, sery, wędliny i delikatesy.

## Dane strukturalne i indeksowanie

- [Sitemap](${BASE_URL}/sitemap.xml): pełna lista publicznych stron i produktów do indeksowania.
- [Robots](${BASE_URL}/robots.txt): zasady dostępu crawlerów.

## Optional

- [Regulamin](${BASE_URL}/regulamin): warunki sprzedaży.
- [Polityka prywatności](${BASE_URL}/polityka-prywatnosci): informacje o prywatności i danych osobowych.
- [Polityka cookies](${BASE_URL}/polityka-cookies): informacje o plikach cookie.
`;

export const LLMS_HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "public, max-age=3600, s-maxage=86400",
};
