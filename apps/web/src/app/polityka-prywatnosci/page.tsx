import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Polityka prywatności | Il Buon Caffe",
  description:
    "Polityka prywatności sklepu Il Buon Caffe. Informacje o przetwarzaniu danych osobowych zgodnie z RODO.",
};

export default function PolitykaPrywatnosciPage() {
  return (
    <main className="min-h-screen bg-brand-50 text-brand-950 selection:bg-brand-400/30">
      <div className="container mx-auto px-6 lg:px-12 py-24 md:py-32 max-w-3xl">
        <header className="mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-500 font-semibold mb-4">
            Dokument prawny
          </p>
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight mb-4">
            Polityka prywatności
          </h1>
          <p className="text-brand-700/60 text-sm">
            Wersja 1.0 &mdash; obowiązuje od 8 kwietnia 2026 r.
          </p>
        </header>

        <article className="prose prose-brand max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-brand-700 prose-a:underline prose-a:decoration-brand-300 hover:prose-a:decoration-brand-500 prose-a:underline-offset-2">
          <Section id="administrator" title="&sect; 1. Administrator danych">
            <p>
              Administratorem Twoich danych osobowych jest{" "}
              <strong>Il Buon Caffe</strong> z siedzibą w Koszalinie, ul.
              Biskupa Czesława Domina 3/6, 75-065 Koszalin, NIP: [NIP], REGON:
              [REGON] (dalej: &bdquo;Administrator&rdquo;).
            </p>
            <p>
              W sprawach związanych z ochroną danych osobowych możesz
              skontaktować się z nami:
            </p>
            <ul>
              <li>
                e-mail:{" "}
                <a href="mailto:kontakt@ilbuoncaffe.pl">
                  kontakt@ilbuoncaffe.pl
                </a>
              </li>
              <li>
                telefon: <a href="tel:+48664937937">+48 664 937 937</a>
              </li>
              <li>
                pisemnie: ul. Biskupa Czesława Domina 3/6, 75-065 Koszalin
              </li>
            </ul>
          </Section>

          <Section
            id="jakie-dane"
            title="&sect; 2. Jakie dane zbieramy i w jakim celu"
          >
            <h3>2.1. Rejestracja konta</h3>
            <p>Podczas rejestracji zbieramy:</p>
            <ul>
              <li>
                <strong>imię</strong> &mdash; aby personalizować komunikację,
              </li>
              <li>
                <strong>adres e-mail</strong> &mdash; jako identyfikator konta i
                kanał kontaktu,
              </li>
              <li>
                <strong>hasło</strong> &mdash; przechowywane wyłącznie w postaci
                zahashowanej (bcrypt); nigdy nie przechowujemy hasła w jawnej
                formie.
              </li>
            </ul>
            <p>
              <strong>Podstawa prawna:</strong> art. 6 ust. 1 lit. b RODO
              (wykonanie umowy &mdash; świadczenie usługi konta).
            </p>

            <h3>2.2. Składanie zamówienia</h3>
            <p>
              Podczas składania zamówienia zbieramy dane niezbędne do jego
              realizacji:
            </p>
            <ul>
              <li>imię i nazwisko,</li>
              <li>adres dostawy (ulica, miasto, kod pocztowy, kraj),</li>
              <li>numer telefonu,</li>
              <li>adres e-mail,</li>
              <li>
                opcjonalnie: nazwa firmy, NIP (w przypadku faktury VAT).
              </li>
            </ul>
            <p>
              <strong>Podstawa prawna:</strong> art. 6 ust. 1 lit. b RODO
              (wykonanie umowy sprzedaży).
            </p>

            <h3>2.3. Płatności</h3>
            <p>
              Płatności obsługuje operator{" "}
              <strong>
                Przelewy24 (DialCom24 Sp. z o.o. / PayPro S.A.)
              </strong>
              . Przekazujemy operatorowi: numer zamówienia, kwotę, adres e-mail
              Klienta. Nie przechowujemy danych kart płatniczych &mdash; są one
              przetwarzane wyłącznie przez Przelewy24 zgodnie z ich{" "}
              <a
                href="https://www.przelewy24.pl/regulamin"
                target="_blank"
                rel="noopener noreferrer"
              >
                regulaminem
              </a>
              .
            </p>
            <p>
              <strong>Podstawa prawna:</strong> art. 6 ust. 1 lit. b RODO
              (wykonanie umowy), art. 6 ust. 1 lit. c RODO (obowiązek prawny
              &mdash; rachunkowość).
            </p>

            <h3>2.4. Bezpieczeństwo i logi</h3>
            <p>W celach bezpieczeństwa rejestrujemy:</p>
            <ul>
              <li>adres IP,</li>
              <li>typ przeglądarki (user agent),</li>
              <li>datę i godzinę logowania,</li>
              <li>liczbę nieudanych prób logowania.</li>
            </ul>
            <p>
              <strong>Podstawa prawna:</strong> art. 6 ust. 1 lit. f RODO
              (prawnie uzasadniony interes Administratora &mdash; ochrona przed
              nieuprawnionym dostępem).
            </p>

            <h3>2.5. Zgody (consent)</h3>
            <p>
              Przy udzielaniu zgód (regulamin, polityka prywatności, marketing,
              analityka) rejestrujemy: rodzaj zgody, wersję dokumentu, datę, adres
              IP i user agent. Dane te służą do wykazania spełnienia obowiązku
              informacyjnego.
            </p>
            <p>
              <strong>Podstawa prawna:</strong> art. 6 ust. 1 lit. c RODO
              (obowiązek prawny &mdash; rozliczalność zgód), art. 7 ust. 1
              RODO.
            </p>

            <h3>2.6. Newsletter</h3>
            <p>
              Jeśli zapiszesz się do newslettera, zbieramy Twój adres e-mail w
              celu przesyłania informacji handlowych.
            </p>
            <p>
              <strong>Podstawa prawna:</strong> art. 6 ust. 1 lit. a RODO
              (zgoda). Zgodę możesz wycofać w każdej chwili.
            </p>
          </Section>

          <Section
            id="odbiorcy"
            title="&sect; 3. Odbiorcy danych (podmioty przetwarzające)"
          >
            <p>
              Twoje dane osobowe mogą być przekazywane następującym kategoriom
              odbiorców:
            </p>
            <table>
              <thead>
                <tr>
                  <th>Odbiorca</th>
                  <th>Cel</th>
                  <th>Dane</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Przelewy24</strong> (DialCom24 / PayPro S.A.)
                  </td>
                  <td>Obsługa płatności</td>
                  <td>E-mail, kwota zamówienia, nr zamówienia</td>
                </tr>
                <tr>
                  <td>
                    <strong>Google LLC</strong> (Google Analytics 4)
                  </td>
                  <td>Analiza ruchu na stronie (po wyrażeniu zgody)</td>
                  <td>
                    Zanonimizowane dane o wizytach, identyfikator cookie
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Cloudflare, Inc.</strong>
                  </td>
                  <td>Hosting, CDN, ochrona DDoS</td>
                  <td>Adres IP, dane żądań HTTP</td>
                </tr>
                <tr>
                  <td>
                    <strong>Neon, Inc.</strong>
                  </td>
                  <td>Hosting bazy danych</td>
                  <td>Dane przechowywane w bazie (szyfrowane w tranzycie)</td>
                </tr>
                <tr>
                  <td>
                    <strong>Allegro.pl</strong> (Allegro sp. z o.o.)
                  </td>
                  <td>Realizacja zamówień z marketplace</td>
                  <td>Dane zamówień składanych przez Allegro</td>
                </tr>
                <tr>
                  <td>
                    <strong>Firmy kurierskie</strong>
                  </td>
                  <td>Dostawa zamówień</td>
                  <td>Imię, nazwisko, adres dostawy, telefon</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section
            id="transfer"
            title="&sect; 4. Przekazywanie danych poza EOG"
          >
            <p>
              Niektórzy z naszych podwykonawców (Google LLC, Cloudflare, Inc.)
              mogą przetwarzać dane w Stanach Zjednoczonych. Transfer odbywa się
              na podstawie:
            </p>
            <ul>
              <li>
                decyzji Komisji Europejskiej o adekwatności (EU-U.S. Data
                Privacy Framework), lub
              </li>
              <li>
                standardowych klauzul umownych (SCC) zatwierdzonych przez
                Komisję Europejską.
              </li>
            </ul>
          </Section>

          <Section
            id="okres-przechowywania"
            title="&sect; 5. Okres przechowywania danych"
          >
            <table>
              <thead>
                <tr>
                  <th>Kategoria danych</th>
                  <th>Okres przechowywania</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Dane konta użytkownika</td>
                  <td>Do usunięcia konta lub anonimizacji na żądanie</td>
                </tr>
                <tr>
                  <td>Dane zamówień (faktury, transakcje)</td>
                  <td>5 lat od końca roku podatkowego (obowiązek rachunkowy)</td>
                </tr>
                <tr>
                  <td>Logi bezpieczeństwa (IP, logowania)</td>
                  <td>1 rok</td>
                </tr>
                <tr>
                  <td>Zgody (consent records)</td>
                  <td>
                    Do czasu wycofania zgody + 3 lata (przedawnienie roszczeń)
                  </td>
                </tr>
                <tr>
                  <td>Dane analityczne (GA4)</td>
                  <td>14 miesięcy (domyślne ustawienie Google Analytics)</td>
                </tr>
                <tr>
                  <td>Sesje wygasłe</td>
                  <td>30 dni po wygaśnięciu</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section id="prawa" title="&sect; 6. Twoje prawa">
            <p>Na podstawie RODO przysługują Ci następujące prawa:</p>
            <ol>
              <li>
                <strong>Prawo dostępu</strong> (art. 15 RODO) &mdash; możesz
                uzyskać informację, czy i jakie Twoje dane przetwarzamy, oraz
                otrzymać ich kopię.
              </li>
              <li>
                <strong>Prawo do sprostowania</strong> (art. 16 RODO) &mdash;
                możesz żądać poprawienia nieprawidłowych lub uzupełnienia
                niekompletnych danych.
              </li>
              <li>
                <strong>Prawo do usunięcia (&bdquo;prawo do bycia zapomnianym&rdquo;)</strong>{" "}
                (art. 17 RODO) &mdash; możesz żądać usunięcia swoich danych.
                Realizujemy to prawo poprzez anonimizację &mdash; Twoje dane
                osobowe zostają trwale zastąpione danymi zanonimizowanymi,
                uniemożliwiającymi identyfikację, przy zachowaniu danych
                transakcyjnych wymaganych przepisami prawa.
              </li>
              <li>
                <strong>Prawo do ograniczenia przetwarzania</strong> (art. 18
                RODO) &mdash; w określonych sytuacjach możesz żądać
                ograniczenia przetwarzania Twoich danych.
              </li>
              <li>
                <strong>Prawo do przenoszenia danych</strong> (art. 20 RODO)
                &mdash; możesz otrzymać swoje dane w ustrukturyzowanym,
                powszechnie używanym formacie (JSON) i przesłać je innemu
                administratorowi.
              </li>
              <li>
                <strong>Prawo do sprzeciwu</strong> (art. 21 RODO) &mdash;
                możesz wnieść sprzeciw wobec przetwarzania danych opartego na
                prawnie uzasadnionym interesie Administratora.
              </li>
              <li>
                <strong>Prawo do wycofania zgody</strong> (art. 7 ust. 3 RODO)
                &mdash; jeśli przetwarzanie opiera się na zgodzie, możesz ją
                wycofać w dowolnym momencie. Wycofanie zgody nie wpływa na
                zgodność z prawem przetwarzania dokonanego przed jej
                wycofaniem.
              </li>
              <li>
                <strong>Prawo do skargi</strong> &mdash; masz prawo wniesienia
                skargi do Prezesa Urzędu Ochrony Danych Osobowych (PUODO), ul.
                Stawki 2, 00-193 Warszawa,{" "}
                <a
                  href="https://uodo.gov.pl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  uodo.gov.pl
                </a>
                .
              </li>
            </ol>
            <p>
              W celu skorzystania z powyższych praw skontaktuj się z nami
              mailowo:{" "}
              <a href="mailto:kontakt@ilbuoncaffe.pl">
                kontakt@ilbuoncaffe.pl
              </a>
              . Odpowiemy na Twoje żądanie w terminie 30 dni.
            </p>
          </Section>

          <Section
            id="bezpieczenstwo"
            title="&sect; 7. Bezpieczeństwo danych"
          >
            <p>Stosujemy następujące środki ochrony danych:</p>
            <ul>
              <li>
                szyfrowanie połączeń (HTTPS/TLS) na wszystkich stronach Sklepu,
              </li>
              <li>
                hashowanie haseł algorytmem bcrypt (nieodwracalne),
              </li>
              <li>
                szyfrowanie tokenów uwierzytelniających algorytmem AES-256-GCM,
              </li>
              <li>
                tokeny dostępu (JWT) z krótkim czasem życia i rotacją tokenów
                odświeżania,
              </li>
              <li>
                cookies z flagami HttpOnly, Secure, SameSite=Strict,
              </li>
              <li>
                blokada konta po 5 nieudanych próbach logowania (na 1 godzinę),
              </li>
              <li>
                audyt logów dostępu administratorów,
              </li>
              <li>
                hosting na infrastrukturze Cloudflare (ochrona DDoS, WAF).
              </li>
            </ul>
          </Section>

          <Section id="cookies" title="&sect; 8. Pliki cookies">
            <p>
              Szczegółowe informacje o plikach cookies wykorzystywanych w
              Sklepie znajdziesz w{" "}
              <Link href="/polityka-cookies">Polityce cookies</Link>.
            </p>
          </Section>

          <Section id="zmiany" title="&sect; 9. Zmiany polityki prywatności">
            <p>
              Administrator zastrzega sobie prawo do zmiany niniejszej Polityki
              prywatności. O istotnych zmianach poinformujemy poprzez
              komunikat w Sklepie lub drogą e-mailową. Aktualna wersja
              Polityki prywatności jest zawsze dostępna pod adresem{" "}
              <Link href="/polityka-prywatnosci">
                ilbuoncaffe.pl/polityka-prywatnosci
              </Link>
              .
            </p>
          </Section>
        </article>
      </div>
    </main>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
