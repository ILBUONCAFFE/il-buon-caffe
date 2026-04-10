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

        <div className="space-y-10">
          <Section id="administrator" title="§ 1. Administrator danych">
            <P>
              Administratorem Twoich danych osobowych jest{" "}
              <strong>Il Buon Caffe Dariusz Praczyk</strong> z siedzibą przy
              ul. Biskupa Czesława Domina 3/6, 75-065 Koszalin, NIP:{" "}
              <strong>6692036051</strong>, REGON: <strong>330511794</strong>{" "}
              (dalej: „Administrator").
            </P>
            <P>
              W sprawach związanych z ochroną danych osobowych możesz
              skontaktować się z nami:
            </P>
            <Ul>
              <li>
                e-mail:{" "}
                <A href="mailto:kontakt@ilbuoncaffe.pl">
                  kontakt@ilbuoncaffe.pl
                </A>
              </li>
              <li>
                pisemnie: ul. Biskupa Czesława Domina 3/6, 75-065 Koszalin
              </li>
            </Ul>
          </Section>

          <Section
            id="jakie-dane"
            title="§ 2. Jakie dane zbieramy i w jakim celu"
          >
            <H3>2.1. Rejestracja konta</H3>
            <P>Podczas rejestracji zbieramy:</P>
            <Ul>
              <li>
                <strong>imię</strong> — aby personalizować komunikację,
              </li>
              <li>
                <strong>adres e-mail</strong> — jako identyfikator konta i kanał
                kontaktu,
              </li>
              <li>
                <strong>hasło</strong> — przechowywane wyłącznie w postaci
                zahashowanej (bcrypt); nigdy nie przechowujemy hasła w jawnej
                formie.
              </li>
            </Ul>
            <P>
              <strong>Podstawa prawna:</strong> art. 6 ust. 1 lit. b RODO
              (wykonanie umowy — świadczenie usługi konta).
            </P>

            <H3>2.2. Składanie zamówienia</H3>
            <P>Podczas składania zamówienia zbieramy:</P>
            <Ul>
              <li>imię i nazwisko,</li>
              <li>adres dostawy (ulica, miasto, kod pocztowy, kraj),</li>
              <li>numer telefonu,</li>
              <li>adres e-mail,</li>
              <li>
                opcjonalnie: nazwa firmy, NIP (w przypadku faktury VAT).
              </li>
            </Ul>
            <P>
              <strong>Podstawa prawna:</strong> art. 6 ust. 1 lit. b RODO
              (wykonanie umowy sprzedaży).
            </P>

            <H3>2.3. Płatności</H3>
            <P>
              Płatności obsługuje operator{" "}
              <strong>
                Przelewy24 (DialCom24 Sp. z o.o. / PayPro S.A.)
              </strong>
              . Przekazujemy operatorowi: numer zamówienia, kwotę, adres e-mail
              Klienta. Nie przechowujemy danych kart płatniczych — są one
              przetwarzane wyłącznie przez Przelewy24 zgodnie z ich{" "}
              <A
                href="https://www.przelewy24.pl/regulamin"
                target="_blank"
                rel="noopener noreferrer"
              >
                regulaminem
              </A>
              .
            </P>
            <P>
              <strong>Podstawa prawna:</strong> art. 6 ust. 1 lit. b RODO
              (wykonanie umowy), art. 6 ust. 1 lit. c RODO (obowiązek prawny —
              rachunkowość).
            </P>

            <H3>2.4. Bezpieczeństwo i logi</H3>
            <P>W celach bezpieczeństwa rejestrujemy:</P>
            <Ul>
              <li>adres IP,</li>
              <li>typ przeglądarki (user agent),</li>
              <li>datę i godzinę logowania,</li>
              <li>liczbę nieudanych prób logowania.</li>
            </Ul>
            <P>
              <strong>Podstawa prawna:</strong> art. 6 ust. 1 lit. f RODO
              (prawnie uzasadniony interes Administratora — ochrona przed
              nieuprawnionym dostępem).
            </P>

            <H3>2.5. Zgody (consent records)</H3>
            <P>
              Przy udzielaniu zgód (regulamin, polityka prywatności, marketing,
              analityka) rejestrujemy: rodzaj zgody, wersję dokumentu, datę,
              adres IP i user agent. Dane te służą do wykazania spełnienia
              obowiązku informacyjnego.
            </P>
            <P>
              <strong>Podstawa prawna:</strong> art. 6 ust. 1 lit. c RODO
              (obowiązek prawny — rozliczalność zgód), art. 7 ust. 1 RODO.
            </P>

            <H3>2.6. Newsletter</H3>
            <P>
              Jeśli zapiszesz się do newslettera, zbieramy Twój adres e-mail w
              celu przesyłania informacji handlowych.
            </P>
            <P>
              <strong>Podstawa prawna:</strong> art. 6 ust. 1 lit. a RODO
              (zgoda). Zgodę możesz wycofać w każdej chwili.
            </P>
          </Section>

          <Section
            id="odbiorcy"
            title="§ 3. Odbiorcy danych (podmioty przetwarzające)"
          >
            <P>
              Twoje dane osobowe mogą być przekazywane następującym kategoriom
              odbiorców:
            </P>
            <Table
              headers={["Odbiorca", "Cel", "Przekazywane dane"]}
              rows={[
                [
                  "Przelewy24 (DialCom24 / PayPro S.A.)",
                  "Obsługa płatności",
                  "E-mail, kwota zamówienia, nr zamówienia",
                ],
                [
                  "Google LLC (Google Analytics 4)",
                  "Analiza ruchu na stronie (po wyrażeniu zgody)",
                  "Zanonimizowane dane o wizytach, identyfikator cookie",
                ],
                [
                  "Cloudflare, Inc.",
                  "Hosting, CDN, ochrona DDoS",
                  "Adres IP, dane żądań HTTP",
                ],
                [
                  "Neon, Inc.",
                  "Hosting bazy danych",
                  "Dane przechowywane w bazie (szyfrowane w tranzycie)",
                ],
                [
                  "Allegro sp. z o.o.",
                  "Realizacja zamówień z marketplace",
                  "Dane zamówień składanych przez Allegro",
                ],
                [
                  "Firmy kurierskie",
                  "Dostawa zamówień",
                  "Imię, nazwisko, adres dostawy, telefon",
                ],
              ]}
            />
          </Section>

          <Section
            id="transfer"
            title="§ 4. Przekazywanie danych poza EOG"
          >
            <P>
              Niektórzy z naszych podwykonawców (Google LLC, Cloudflare, Inc.)
              mogą przetwarzać dane w Stanach Zjednoczonych. Transfer odbywa się
              na podstawie:
            </P>
            <Ul>
              <li>
                decyzji Komisji Europejskiej o adekwatności (EU-U.S. Data
                Privacy Framework), lub
              </li>
              <li>
                standardowych klauzul umownych (SCC) zatwierdzonych przez
                Komisję Europejską.
              </li>
            </Ul>
          </Section>

          <Section
            id="okres-przechowywania"
            title="§ 5. Okres przechowywania danych"
          >
            <Table
              headers={["Kategoria danych", "Okres przechowywania"]}
              rows={[
                [
                  "Dane konta użytkownika",
                  "Do usunięcia konta lub anonimizacji na żądanie",
                ],
                [
                  "Dane zamówień (faktury, transakcje)",
                  "5 lat od końca roku podatkowego (obowiązek rachunkowy)",
                ],
                [
                  "Logi bezpieczeństwa (IP, logowania)",
                  "1 rok",
                ],
                [
                  "Zgody (consent records)",
                  "Do czasu wycofania zgody + 3 lata (przedawnienie roszczeń)",
                ],
                [
                  "Dane analityczne (GA4)",
                  "14 miesięcy (domyślne ustawienie Google Analytics)",
                ],
                [
                  "Sesje wygasłe",
                  "30 dni po wygaśnięciu",
                ],
              ]}
            />
          </Section>

          <Section id="prawa" title="§ 6. Twoje prawa">
            <P>Na podstawie RODO przysługują Ci następujące prawa:</P>
            <Ol>
              <li>
                <strong>Prawo dostępu</strong> (art. 15 RODO) — możesz uzyskać
                informację, czy i jakie Twoje dane przetwarzamy, oraz otrzymać
                ich kopię.
              </li>
              <li>
                <strong>Prawo do sprostowania</strong> (art. 16 RODO) — możesz
                żądać poprawienia nieprawidłowych lub uzupełnienia niekompletnych
                danych.
              </li>
              <li>
                <strong>
                  Prawo do usunięcia („prawo do bycia zapomnianym")
                </strong>{" "}
                (art. 17 RODO) — możesz żądać usunięcia swoich danych.
                Realizujemy to prawo poprzez anonimizację — Twoje dane osobowe
                zostają trwale zastąpione danymi zanonimizowanymi, przy
                zachowaniu danych transakcyjnych wymaganych przepisami prawa.
              </li>
              <li>
                <strong>Prawo do ograniczenia przetwarzania</strong> (art. 18
                RODO) — w określonych sytuacjach możesz żądać ograniczenia
                przetwarzania Twoich danych.
              </li>
              <li>
                <strong>Prawo do przenoszenia danych</strong> (art. 20 RODO) —
                możesz otrzymać swoje dane w ustrukturyzowanym, powszechnie
                używanym formacie (JSON) i przesłać je innemu administratorowi.
              </li>
              <li>
                <strong>Prawo do sprzeciwu</strong> (art. 21 RODO) — możesz
                wnieść sprzeciw wobec przetwarzania danych opartego na prawnie
                uzasadnionym interesie Administratora.
              </li>
              <li>
                <strong>Prawo do wycofania zgody</strong> (art. 7 ust. 3 RODO)
                — jeśli przetwarzanie opiera się na zgodzie, możesz ją wycofać w
                dowolnym momencie bez wpływu na zgodność wcześniejszego
                przetwarzania z prawem.
              </li>
              <li>
                <strong>Prawo do skargi</strong> — masz prawo wniesienia skargi
                do Prezesa Urzędu Ochrony Danych Osobowych (PUODO), ul. Stawki
                2, 00-193 Warszawa,{" "}
                <A
                  href="https://uodo.gov.pl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  uodo.gov.pl
                </A>
                .
              </li>
            </Ol>
            <P className="mt-4">
              W celu skorzystania z powyższych praw skontaktuj się z nami
              mailowo:{" "}
              <A href="mailto:kontakt@ilbuoncaffe.pl">
                kontakt@ilbuoncaffe.pl
              </A>
              . Odpowiemy na Twoje żądanie w terminie 30 dni.
            </P>
          </Section>

          <Section
            id="bezpieczenstwo"
            title="§ 7. Bezpieczeństwo danych"
          >
            <P>Stosujemy następujące środki ochrony danych:</P>
            <Ul>
              <li>szyfrowanie połączeń (HTTPS/TLS) na wszystkich stronach Sklepu,</li>
              <li>hashowanie haseł algorytmem bcrypt (nieodwracalne),</li>
              <li>szyfrowanie tokenów uwierzytelniających algorytmem AES-256-GCM,</li>
              <li>
                tokeny dostępu (JWT) z krótkim czasem życia i rotacją tokenów
                odświeżania,
              </li>
              <li>cookies z flagami HttpOnly, Secure, SameSite=Strict,</li>
              <li>
                blokada konta po 5 nieudanych próbach logowania (na 1 godzinę),
              </li>
              <li>audyt logów dostępu administratorów,</li>
              <li>hosting na infrastrukturze Cloudflare (ochrona DDoS, WAF).</li>
            </Ul>
          </Section>

          <Section id="cookies" title="§ 8. Pliki cookies">
            <P>
              Szczegółowe informacje o plikach cookies wykorzystywanych w
              Sklepie znajdziesz w{" "}
              <Link
                href="/polityka-cookies"
                className="text-brand-600 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-500 transition-colors"
              >
                Polityce cookies
              </Link>
              .
            </P>
          </Section>

          <Section
            id="zmiany"
            title="§ 9. Zmiany polityki prywatności"
          >
            <P>
              Administrator zastrzega sobie prawo do zmiany niniejszej Polityki
              prywatności. O istotnych zmianach poinformujemy poprzez komunikat
              w Sklepie lub drogą e-mailową. Aktualna wersja jest zawsze
              dostępna pod adresem{" "}
              <Link
                href="/polityka-prywatnosci"
                className="text-brand-600 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-500 transition-colors"
              >
                ilbuoncaffe.pl/polityka-prywatnosci
              </Link>
              .
            </P>
          </Section>
        </div>
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
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-serif font-semibold text-brand-900 mb-4 pb-2 border-b border-brand-200">
        {title}
      </h2>
      {children}
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-brand-800 mt-5 mb-2">
      {children}
    </h3>
  );
}

function P({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-brand-700 leading-relaxed text-[15px] mb-3 ${className ?? ""}`}
    >
      {children}
    </p>
  );
}

function Ol({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-decimal pl-5 space-y-2.5 text-brand-700 leading-relaxed text-[15px]">
      {children}
    </ol>
  );
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 text-brand-700 leading-relaxed text-[15px]">
      {children}
    </ul>
  );
}

function A({
  href,
  children,
  target,
  rel,
}: {
  href: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
}) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className="text-brand-600 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-500 transition-colors"
    >
      {children}
    </a>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-brand-200 my-4">
      <table className="w-full text-[14px] border-collapse">
        <thead>
          <tr className="bg-brand-100">
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 font-semibold text-brand-800 text-xs uppercase tracking-wider border-b border-brand-200"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-white" : "bg-brand-50/60"}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3 text-brand-700 border-b border-brand-100 last:border-b-0 align-top"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
