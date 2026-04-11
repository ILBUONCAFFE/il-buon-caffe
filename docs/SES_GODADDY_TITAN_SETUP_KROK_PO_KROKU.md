# AWS SES + GoDaddy (Titan) - setup krok po kroku

Ten dokument opisuje wszystko, co musisz ustawic po swojej stronie, aby dzialal email transactional (np. formularz kontaktowy, reset hasla, weryfikacja email) przy zachowaniu skrzynki w GoDaddy/Titan.

## 0) Jak to ma wygladac docelowo

- Odbior poczty: GoDaddy/Titan (Twoja skrzynka `kontakt@...`)
- Wysylka z aplikacji: AWS SES
- DNS: zarzadzasz rekordami u dostawcy DNS (u Ciebie GoDaddy)

Najwazniejsze:
- NIE zmieniaj MX na SES.
- MX ma dalej wskazywac Titan.

---

## 1) Przygotuj dane przed startem

Przygotuj:

1. Dostep do AWS Console (konto z uprawnieniami SES + IAM).
2. Dostep do panelu DNS domeny (GoDaddy).
3. Adres nadawcy, np. `kontakt@ilbuoncaffe.pl`.
4. Wybrany region SES (rekomendacja: jeden staly region, np. `eu-west-1`).

---

## 2) Skonfiguruj AWS SES (identity domeny)

### Krok 2.1 - Dodaj identity domeny

1. Wejdz do AWS Console -> SES -> Verified identities.
2. Kliknij Create identity.
3. Typ: Domain.
4. Podaj domene, np. `ilbuoncaffe.pl`.
5. Wlacz Easy DKIM.
6. Zapisz.

Po zapisaniu SES wygeneruje rekordy DNS do dodania.

### Krok 2.2 - Skopiuj rekordy z SES

Z SES skopiuj:

1. Rekord TXT do weryfikacji domeny (`_amazonses...`).
2. 3 rekordy CNAME DKIM.

---

## 3) Dodaj rekordy DNS w GoDaddy

### Krok 3.1 - Dodaj TXT weryfikacyjny SES

1. GoDaddy -> DNS Management -> Add record.
2. Typ: TXT.
3. Name/Host: to, co podal SES (np. `_amazonses`).
4. Value: dokladna wartosc z SES.
5. TTL: domyslne lub 1h.

### Krok 3.2 - Dodaj 3x CNAME DKIM

Dodaj wszystkie 3 rekordy CNAME dokladnie tak, jak podaje SES.

Uwaga:
- Nie skracaj nazw.
- Nie dopisuj dodatkowych kropek, jesli panel GoDaddy robi to automatycznie.

### Krok 3.3 - Poczekaj na weryfikacje

1. Wroc do SES -> Verified identities.
2. Czekaj, az status domeny bedzie Verified.
3. Czas propagacji: zwykle od kilku minut do kilku godzin.

---

## 4) Wyjdz z SES sandbox (obowiazkowe)

Bez tego SES wysyla tylko do zweryfikowanych odbiorcow.

1. SES -> Account dashboard.
2. Kliknij Request production access.
3. Use case: transactional emails (kontakt, reset hasla, verify email, order confirmation).
4. Podaj URL sklepu i opis zastosowania.
5. Wyslij formularz i poczekaj na akceptacje.

---

## 5) Utworz IAM user tylko do wysylki email

### Krok 5.1 - Policy minimalna

Utworz policy z minimalnym zakresem:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSesSend",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

### Krok 5.2 - IAM user i access key

1. IAM -> Users -> Create user (np. `ilbuoncaffe-ses-sender`).
2. Podlacz policy z kroku 5.1.
3. Wygeneruj Access key (programmatic).
4. Zapisz:
- Access Key ID
- Secret Access Key

---

## 6) SPF, DKIM, DMARC z Titan + SES

To jest kluczowe przy polaczeniu skrzynki Titan i wysylki przez SES.

### Krok 6.1 - SPF

Musi istniec jeden rekord SPF dla domeny root.

Zasada:
- zachowaj fragment(y) dla Titan,
- dodaj `include:amazonses.com`.

Przyklad (schemat):

```txt
v=spf1 include:SPF_TITAN include:amazonses.com -all
```

Wazne:
- `SPF_TITAN` podstaw dokladnie wg aktualnej dokumentacji Titan/GoDaddy dla Twojej skrzynki.
- Nie tworz drugiego rekordu SPF. Ma byc jeden.

### Krok 6.2 - DKIM

DKIM z SES masz juz dodany przez 3 rekordy CNAME.

### Krok 6.3 - DMARC

Dodaj rekord TXT `_dmarc` (jesli nie masz):

Przyklad startowy (bezpieczny na start):

```txt
v=DMARC1; p=none; rua=mailto:kontakt@ilbuoncaffe.pl; adkim=s; aspf=s; pct=100
```

Po obserwacji raportow mozna przejsc na `p=quarantine`, a docelowo `p=reject`.

---

## 7) (Opcjonalnie, ale rekomendowane) Custom MAIL FROM w SES

To poprawia spojnosc SPF alignment.

1. SES -> Verified identity (Twoja domena) -> Mail From domain.
2. Ustaw subdomene, np. `mail.ilbuoncaffe.pl`.
3. SES poda rekordy DNS (zwykle MX + TXT dla tej subdomeny).
4. Dodaj je w GoDaddy.
5. Poczekaj na status success.

Uwaga:
- To nie zmienia glownego MX domeny.

---

## 8) Ustaw sekrety i zmienne w Cloudflare Worker

W projekcie uzywasz `apps/api/wrangler.json`.

### Krok 8.1 - Sekrety (w CLI)

Uruchom:

```bash
cd apps/api
npx wrangler secret put AWS_SES_ACCESS_KEY_ID
npx wrangler secret put AWS_SES_SECRET_ACCESS_KEY
```

Wklej wartosci z IAM.

### Krok 8.2 - Zmienne jawne w `wrangler.json`

W `apps/api/wrangler.json` (sekcja `vars`) ustaw:

- `AWS_SES_REGION` (np. `eu-west-1`)
- `AWS_SES_FROM_ADDRESS` (np. `kontakt@ilbuoncaffe.pl`)

Uwaga:
- Dane tajne tylko przez `wrangler secret put`, nie do `wrangler.json`.

---

## 9) Deploy i testy

### Krok 9.1 - Deploy API

```bash
cd apps/api
npx wrangler deploy
```

### Krok 9.2 - Test funkcjonalny

Sprawdz scenariusze:

1. Rejestracja konta -> czy przychodzi email weryfikacyjny.
2. Forgot password -> czy przychodzi email resetu.
3. Formularz kontaktowy (po wdrozeniu endpointu) -> czy przychodzi wiadomosc do `kontakt@...`.

### Krok 9.3 - Sprawdz naglowki dostarczonej wiadomosci

W skrzynce odbiorczej sprawdz:

- SPF: pass
- DKIM: pass
- DMARC: pass

---

## 10) Najczestsze problemy i szybkie fixy

1. SES identity dalej Pending:
- rekordy DNS sa zle skopiowane albo propagacja jeszcze trwa.

2. Brak wysylek do klientow:
- konto SES nadal w sandbox.

3. SPF fail:
- masz wiecej niz jeden rekord SPF albo brakuje include dla Titan/SES.

4. DMARC fail:
- brak alignment miedzy domena From i podpisem DKIM/SPF (rozwiazanie: popraw SPF + DKIM, rozwaz custom MAIL FROM).

5. AccessDenied z SES API:
- IAM user nie ma `ses:SendEmail`.

---

## 11) Checklista koncowa (do odhaczenia)

- [ ] Domena verified w SES.
- [ ] DKIM verified (3x CNAME).
- [ ] SES production access przyznany.
- [ ] IAM user ma tylko uprawnienia do wysylki SES.
- [ ] Access keys zapisane jako sekrety w Cloudflare.
- [ ] `AWS_SES_REGION` i `AWS_SES_FROM_ADDRESS` ustawione w `apps/api/wrangler.json`.
- [ ] SPF zawiera Titan + SES i jest tylko jeden rekord SPF.
- [ ] DMARC istnieje i raportuje.
- [ ] (Opcjonalnie) custom MAIL FROM aktywny.
- [ ] Testy wysylki przechodza end-to-end.

---

## 12) Co nie moze sie zmienic

- MX domeny ma zostac na Titan (GoDaddy mail).
- SES ma sluzyc do wysylki z aplikacji, nie do odbioru poczty.
