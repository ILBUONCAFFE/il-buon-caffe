# Specyfikacja okna szczegółów zamówienia (admin)

Cel: jeden ekran daje pełny obraz zamówienia — historia, pieniądze, logistyka, kontakt z klientem, reklamacje, zwroty, dyskusje Allegro. Bez przełączania zakładek po pół panelu.

Zakres: zamówienia ze sklepu (`source = shop`) i z Allegro (`source = allegro`). Sekcje Allegro pokazują się tylko dla zamówień Allegro.

---

## 1. Nagłówek (sticky top)

- Numer zamówienia (`orderNumber`) + ikona źródła (sklep / Allegro) + środowisko Allegro (sandbox/prod) jeśli dotyczy
- Status wewnętrzny (badge kolorystyczny: pending / paid / processing / shipped / delivered / cancelled / refunded / returned / disputed)
- Status fulfillmentu Allegro (`allegroFulfillmentStatus`) jako osobny badge — różni się od naszego cyklu
- Data utworzenia + relatywnie ("3 godz. temu")
- Kwota całkowita (`total` + waluta) z podpowiedzią `totalPln` przy walutach obcych + kurs i data kursu
- Szybkie akcje: Odśwież z Allegro, Wyślij wiadomość, Wystaw fakturę, Generuj etykietę, Zwróć płatność, Anuluj, Drukuj, Eksport PDF
- Ostrzeżenia inline: rezerwacja wygasa za X min, brak opłaty > 24h, niezgodność rewizji Allegro, wstrzymana wypłata, otwarta dyskusja, otwarty zwrot, otwarta reklamacja, brak NIP a wymagana faktura

---

## 2. Oś czasu zamówienia

Pełny zlepek `orderStatusHistory` + zdarzenia Allegro + płatności + wysyłki w jednej osi.

Per zdarzenie:
- ikona kategorii (status / tracking / payment / allegro / admin / system)
- etykieta PL ("Zamówienie opłacone", "Paczka odebrana przez kuriera", "Klient otworzył dyskusję")
- znacznik czasu absolutny + względny
- źródło (`source` + `sourceRef`) — np. „Allegro event abc123", „Admin: jan@…", „P24 webhook", „InPost waybill 6200…"
- poprzednia → nowa wartość
- rozwijany raw payload (`metadata`) dla debugowania

Filtry: tylko płatności / tylko wysyłka / tylko Allegro / tylko admin.

---

## 3. Klient

Z `customerData` JSONB + (jeśli zalogowany) link do profilu `users`.

- Imię i nazwisko, e-mail, telefon (mailto/tel)
- Liczba wcześniejszych zamówień + LTV w PLN + średnia wartość koszyka
- Ostatnie 3 zamówienia (klikalne)
- Status RODO: zgody marketingowe (`userConsents`), retencja, czy zanonimizowany
- Dla Allegro: login kupującego, ID kupującego, czy firma, kraj rejestracji konta, badge „nowy kupujący / stały"
- Notatki o kliencie

---

## 4. Pozycje zamówienia

Tabela `orderItems` + dane produktu:

- Miniatura, nazwa (snapshot), SKU + link do edycji produktu (jeśli zmapowany)
- Dla Allegro bez mappingu: badge „Niezmapowana oferta" + ID oferty + przycisk „Zmapuj"
- Ilość, cena jednostkowa, suma
- Stan magazynowy aktualny + ostrzeżenie jeśli ujemny
- Per pozycja: ile zwrócono, ile reklamowano, pozostała ilość do wysłania
- Suma: subtotal, koszt wysyłki, podatek, rabat, total — rozbicie PLN/walutowe

---

## 5. Płatność

- Metoda (`paymentMethod`) + ikona (BLIK / karta / przelew / Allegro Pay / inne)
- Status P24 (`p24Status`) + `paidAt`
- ID transakcji P24, ID sesji, ID merchanta — kopiowalne
- Dla Allegro: status płatności Allegro, czy wypłacone, kiedy wypłata, hold flag i powód blokady
- Historia obciążeń i zwrotów: kwota, data, identyfikator, status, kto zainicjował
- Saldo: zapłacono X, zwrócono Y, do zwrotu Z
- Akcja „Zwróć kwotę" (pełna / częściowa) z polem powodu

---

## 6. Faktura

- `invoiceRequired` + dane do faktury z `customerData` (NIP, nazwa firmy, adres)
- Status: niewystawiona / wystawiona / wysłana / skorygowana
- Numer, data, link do PDF
- Dla Allegro: czy klient zaznaczył „chcę fakturę", dane fakturowe z payloadu (mogą różnić się od adresu wysyłki), żądanie wystawienia faktury po fakcie
- Korekty: lista (np. po częściowym zwrocie)
- Akcje: Wystaw, Wyślij ponownie, Wystaw korektę

---

## 7. Wysyłka i logistyka

- Metoda (`shippingMethod`), przewoźnik, koszt
- Adres dostawy + adres rozliczeniowy jeśli inny
- Dla Allegro: punkt odbioru (paczkomat / InPost / DPD pickup), ID punktu, adres
- `trackingNumber` + przycisk śledzenia (deep link)
- Snapshot paczek z `allegroShipmentsSnapshot`:
  - per paczka: numer listu, przewoźnik, status (kod + etykieta PL), data ostatniego zdarzenia, czy wybrana
  - rozwijana historia zdarzeń (`events[]`)
  - wskaźnik czasu od wysyłki, ETA jeśli dostępne
- Akcje: Odśwież z Allegro (cache 5 min — pokaż kiedy odświeżono), Generuj etykietę, Zarejestruj numer listu, Oznacz jako wysłane, Oznacz jako dostarczone
- Etykieta Allegro: dostępne usługi (rozmiary paczek, ubezpieczenie, COD), konto nadawcy, koszt

---

## 8. Komunikacja z klientem

Allegro Messaging Center udostępnia wątki rozmów per zamówienie/oferta.

- Wątek z kupującym: lista wiadomości chronologicznie, kierunek (in/out), status (nieprzeczytana / odpowiedziana), załączniki
- Pole „Odpowiedz" inline z szablonami szybkich odpowiedzi
- Badge nieprzeczytanych z licznikiem
- Historia e-maili wysyłanych ze sklepu (potwierdzenie, wysyłka, faktura) — temat, data, status (delivered / opened / bounced)
- Akcja „Wyślij wiadomość ad-hoc" (kanał: Allegro / e-mail)

---

## 9. Zwroty (Allegro Customer Returns + zwroty sklepowe)

Sekcja widoczna gdy istnieje przynajmniej jeden zwrot. Allegro: kupujący inicjuje, sprzedawca akceptuje/odrzuca.

Per zwrot:
- ID (Allegro customer return ID lub wewnętrzny)
- Status: zgłoszony / zaakceptowany / odrzucony / odebrany / rozliczony / anulowany
- Powód (z listy Allegro: niezgodny z opisem, uszkodzony, pomyłka, odstąpienie od umowy, inne) + komentarz klienta
- Pozycje objęte zwrotem (które `orderItems` + ilości) — częściowe zwroty per SKU
- Kwota do zwrotu (towar + koszt wysyłki — Allegro rozdziela)
- Sposób odesłania: paczkomat opłacony przez sprzedawcę / kupujący opłaca / odbiór osobisty
- Numer listu zwrotnego + status śledzenia
- Załączone zdjęcia / dowody
- Oś czasu zwrotu (zgłoszenie → akceptacja → wysyłka zwrotna → odebranie → przyjęcie towaru → wypłata)
- Akcje: Akceptuj, Odrzuć (z powodem), Zaproponuj częściowy zwrot, Zatwierdź odbiór towaru, Zwróć pieniądze, Wystaw korektę
- Termin na odpowiedź (Allegro narzuca SLA — licznik czasu)

---

## 10. Reklamacje (Allegro Discussions / Allegro Protect + sklep)

Allegro nie ma osobnego endpointu „complaint" — reklamacje idą przez dyskusje lub Program Ochrony Kupującego. Plus własny przepływ ze sklepu.

Per reklamacja:
- Typ: jakościowa / niezgodność z opisem / uszkodzenie w transporcie / brak dostawy / inne
- Status: otwarta / w trakcie / oczekuje na klienta / oczekuje na nas / rozwiązana / eskalowana / zamknięta
- Pochodzenie: kupujący / admin / Allegro Protect
- Czy eskalowana do Allegro (Program Ochrony Kupującego) — deadline, kara za brak odpowiedzi (Allegro może zwrócić pieniądze automatycznie kosztem sprzedawcy)
- Wątek wiadomości w ramach reklamacji (oddzielny od ogólnej komunikacji)
- Załączniki (zdjęcia uszkodzeń, protokół szkody)
- Proponowane rozwiązanie: pełny zwrot / częściowy zwrot / wymiana / rabat / odrzucenie
- Powiązane akcje finansowe (zwroty, korekty)
- Oś czasu reklamacji
- Akcje: Odpowiedz, Zaproponuj rozwiązanie, Zaakceptuj, Odrzuć, Eskaluj, Zamknij

---

## 11. Dyskusje Allegro

Niezależnie od reklamacji — kupujący może otworzyć dyskusję o problemie z transakcją.

- Lista otwartych i zamkniętych dyskusji powiązanych z zamówieniem
- Per dyskusja: ID, temat, ostatnia aktywność, liczba wiadomości, status (open / pending_seller / pending_buyer / resolved / escalated)
- Termin reakcji (SLA Allegro) z licznikiem
- Wskaźnik wpływu: czy może zaszkodzić ocenie sprzedawcy, czy uruchomi automatyczny zwrot

---

## 12. Oceny i opinie

- Czy kupujący wystawił ocenę (Allegro feedback / opinia sklepowa)
- Gwiazdki + treść + data
- Status odpowiedzi sprzedawcy
- Akcje: Odpowiedz, Zgłoś nadużycie

---

## 13. Allegro — meta zamówienia

Tylko `source = allegro`:

- ID zamówienia Allegro (`externalId`)
- Aktualna rewizja (`allegroRevision`) + przycisk „pobierz najnowszą" (gdy serwer pokazuje wyższą rewizję — pobierz pełny obiekt)
- Status checkout-form Allegro
- Smart! / nie-Smart!
- Czy Allegro Pay
- Czy Allegro Lokalnie / One Box / Smart Strefa
- Linki głębokie: do oferty, do zamówienia w panelu Allegro, do kupującego
- Ostrzeżenia o niezgodnościach: różnica rewizji lokalnej vs serwer, różnica kwot, różnica adresu (jeśli kupujący zmienił po opłaceniu)

---

## 14. Notatki

- `notes` (widoczne klientowi w niektórych ścieżkach) — edytowalne
- `internalNotes` — czerwona ramka, „tylko admin"
- Lista komentarzy adminów w stylu czatu (kto, kiedy, co) — z `auditLog` filtrowanym po `orderId`
- @mentions innych adminów

---

## 15. Audyt i RODO

- `retentionStatus` — aktywne / do anonimizacji / zanonimizowane
- Data planowanej anonimizacji
- Pełny `auditLog` zdarzeń tego zamówienia (kto przeglądał, edytował, eksporty)
- Idempotency key (debug)
- Powiązane zmiany stanów magazynowych (`stockChanges` po `orderId`) — co rezerwowano, co zwolniło

---

## 16. Powiązane wątki

- Powiązane zamówienia (ten sam klient, ta sama paczka, ta sama oferta Allegro)
- Powiązany koszyk porzucony jeśli istnieje
- Powiązane zgłoszenia z formularza kontaktowego (po e-mailu klienta)

---

## 17. Wzorce UX

- Layout: dwie kolumny — lewa wąska (status, pieniądze, klient), prawa szeroka (timeline, items, zwroty, reklamacje, wiadomości w zakładkach)
- Sticky: nagłówek + kwoty zawsze widoczne przy scrollu
- Skróty: R = odśwież, M = wiadomość, Z = zwrot, F = faktura, Esc = zamknij
- Auto-refresh dla aktywnych zamówień (otwarta dyskusja / niewysłana paczka): polling 60s lub WebSocket
- Linkowalne sekcje: deep link `/admin/orders/{id}#returns`
- Stan pusty: brak zwrotów/reklamacji — sekcja zwinięta z licznikiem „0", nie pokazuj pustego pudła

---

## 18. Dane do dociągnięcia z Allegro (referencyjnie)

Aby wszystko powyższe miało źródło prawdy, panel powinien czerpać z Allegro REST API m.in.: szczegóły zamówienia (order details + revision), statusy fulfillmentu, wiadomości (messaging center), zwroty kupujących (customer returns), dyskusje (disputes), żądania faktur (invoice requests), paczki i etykiety wysyłkowe, oceny (feedback), informacje o kupującym, zgłoszenia Programu Ochrony Kupującego. Część danych (komunikacja, zwroty, dyskusje) cache'owana lokalnie + sync cron job z guardem KV (patrz CLAUDE.md — wzorzec idle guard).

---

## 19. Priorytet wdrożenia

1. **MVP**: nagłówek, timeline, klient, pozycje, płatność, wysyłka, faktura, notatki — z istniejącej bazy
2. **Faza 2**: zwroty Allegro + reklamacje + komunikacja (sync z API)
3. **Faza 3**: dyskusje, oceny, deep linki Allegro, auto-refresh
4. **Faza 4**: powiązane wątki, mentions, skróty klawiszowe
