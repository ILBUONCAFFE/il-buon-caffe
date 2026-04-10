import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Polityka cookies | Il Buon Caffe",
  description:
    "Polityka plików cookies sklepu Il Buon Caffe. Informacje o rodzajach cookies, celach ich stosowania i zarządzaniu zgodami.",
};

export default function PolitykaCookiesPage() {
  return (
    <main className="min-h-screen bg-brand-50 text-brand-950 selection:bg-brand-400/30">
      <div className="container mx-auto px-6 lg:px-12 py-24 md:py-32 max-w-3xl">
        <header className="mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-500 font-semibold mb-4">
            Dokument prawny
          </p>
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight mb-4">
            Polityka cookies
          </h1>
          <p className="text-brand-700/60 text-sm">
            Wersja 1.0 &mdash; obowiązuje od 8 kwietnia 2026 r.
          </p>
        </header>

        <div className="space-y-10">
          <Section id="czym-sa-cookies" title="§ 1. Czym są pliki cookies?">
            <P>
              Pliki cookies (ciasteczka) to niewielkie pliki tekstowe zapisywane
              na Twoim urządzeniu (komputerze, telefonie, tablecie) przez
              przeglądarkę internetową podczas korzystania ze stron
              internetowych. Cookies pozwalają stronie „zapamiętać" Twoje
              preferencje, dane logowania i inne ustawienia.
            </P>
          </Section>

          <Section
            id="rodzaje-cookies"
            title="§ 2. Rodzaje cookies stosowane w Sklepie"
          >
            <H3>2.1. Cookies niezbędne (wymagane)</H3>
            <P>
              Są konieczne do prawidłowego działania Sklepu. Nie wymagają
              Twojej zgody, ponieważ bez nich Sklep nie mógłby funkcjonować.
            </P>
            <Table
              headers={["Nazwa", "Cel", "Ważność"]}
              rows={[
                [
                  "__Host-access_token",
                  "Token uwierzytelniający sesję użytkownika (JWT). Flagi: HttpOnly, Secure, SameSite=Strict.",
                  '2 godziny (24h z \u201Ezapamiętaj mnie\u201D)',
                ],
                [
                  "__Host-refresh_token",
                  "Token odświeżający sesję. Flagi: HttpOnly, Secure, SameSite=Strict.",
                  "7 dni",
                ],
                [
                  "ibc_consent",
                  "Zapamiętanie Twojego wyboru dotyczącego cookies (niezbędne / analityczne / wszystkie).",
                  "365 dni",
                ],
              ]}
            />
            <P>
              Dodatkowo używamy <Code>localStorage</Code> (klucz{" "}
              <Code>ibc-consent-v1</Code>) do przechowywania Twojego wyboru
              zgody na cookies po stronie przeglądarki.
            </P>

            <H3>2.2. Cookies analityczne (opcjonalne)</H3>
            <P>
              Są stosowane wyłącznie po wyrażeniu przez Ciebie zgody. Pomagają
              nam zrozumieć, w jaki sposób użytkownicy korzystają ze Sklepu, co
              pozwala nam ulepszać jego działanie.
            </P>
            <Table
              headers={["Nazwa", "Dostawca", "Cel", "Ważność"]}
              rows={[
                [
                  "_ga",
                  "Google Analytics 4",
                  "Rozróżnianie użytkowników w celu analizy ruchu na stronie",
                  "2 lata",
                ],
                [
                  "_ga_9X9LN9GQYD",
                  "Google Analytics 4",
                  "Utrzymanie stanu sesji analitycznej",
                  "2 lata",
                ],
              ]}
            />
            <P>
              Stosujemy <strong>Google Consent Mode v2</strong>, co oznacza, że
              Google Analytics nie zapisuje żadnych cookies ani nie zbiera danych
              do celów analitycznych, dopóki nie wyrazisz na to zgody. Domyślny
              stan wszystkich opcjonalnych cookies to „denied" (odrzucone).
            </P>
          </Section>

          <Section
            id="consent-mode"
            title="§ 3. Google Consent Mode v2 — szczegóły"
          >
            <P>
              Sklep implementuje mechanizm Google Consent Mode v2, który
              zarządza następującymi kategoriami zgód:
            </P>
            <Table
              headers={["Kategoria", "Stan domyślny", "Opis"]}
              rows={[
                [
                  "analytics_storage",
                  "denied",
                  "Cookies analityczne Google Analytics",
                ],
                [
                  "ad_storage",
                  "denied",
                  "Cookies reklamowe (obecnie nieużywane)",
                ],
                [
                  "ad_user_data",
                  "denied",
                  "Dane użytkownika dla celów reklamowych",
                ],
                [
                  "ad_personalization",
                  "denied",
                  "Personalizacja reklam",
                ],
                [
                  "personalization_storage",
                  "denied",
                  "Personalizacja treści strony",
                ],
                [
                  "functionality_storage",
                  "granted",
                  "Funkcjonalność strony (niezbędne cookies)",
                ],
                [
                  "security_storage",
                  "granted",
                  "Bezpieczeństwo (niezbędne cookies)",
                ],
              ]}
            />
          </Section>

          <Section
            id="zarzadzanie"
            title="§ 4. Zarządzanie zgodami na cookies"
          >
            <P>
              Przy pierwszej wizycie w Sklepie wyświetlamy baner informacyjny,
              w którym możesz:
            </P>
            <Ul>
              <li>
                <strong>zaakceptować tylko niezbędne cookies</strong> — Sklep
                działa bez analityki,
              </li>
              <li>
                <strong>zaakceptować cookies analityczne</strong> — włącza
                Google Analytics,
              </li>
              <li>
                <strong>zaakceptować wszystkie cookies</strong> — włącza pełną
                analitykę i personalizację.
              </li>
            </Ul>
            <P>
              Swoją decyzję możesz zmienić w każdej chwili, czyszcząc pliki
              cookies w ustawieniach przeglądarki — baner pojawi się ponownie.
            </P>
            <H3>Zarządzanie cookies w przeglądarce</H3>
            <P>
              Większość przeglądarek pozwala na zarządzanie cookies w
              ustawieniach. Możesz blokować wszystkie cookies, usuwać istniejące
              lub ustawiać powiadomienia o ich zapisywaniu. Pamiętaj, że
              zablokowanie cookies niezbędnych może uniemożliwić korzystanie z
              niektórych funkcji Sklepu (np. logowanie, koszyk).
            </P>
          </Section>

          <Section
            id="local-storage"
            title="§ 5. Dane w localStorage"
          >
            <P>
              Oprócz cookies Sklep wykorzystuje mechanizm localStorage
              przeglądarki:
            </P>
            <Table
              headers={["Klucz", "Cel"]}
              rows={[
                [
                  "ibc-consent-v1",
                  'Zapamiętanie Twojego wyboru dotyczącego cookies (\u201Enecessary\u201D, \u201Eanalytics\u201D lub \u201Eall\u201D)',
                ],
              ]}
            />
            <P>
              Dane w localStorage nie są wysyłane do serwera automatycznie i
              pozostają wyłącznie na Twoim urządzeniu. Możesz je usunąć w
              ustawieniach przeglądarki (Narzędzia deweloperskie → Aplikacja →
              localStorage).
            </P>
          </Section>

          <Section
            id="zmiany-cookies"
            title="§ 6. Zmiany polityki cookies"
          >
            <P>
              Zastrzegamy sobie prawo do zmiany niniejszej Polityki cookies.
              Aktualna wersja jest zawsze dostępna pod adresem{" "}
              <Link
                href="/polityka-cookies"
                className="text-brand-600 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-500 transition-colors"
              >
                ilbuoncaffe.pl/polityka-cookies
              </Link>
              . O istotnych zmianach poinformujemy poprzez ponowne wyświetlenie
              banera cookies.
            </P>
          </Section>

          <Section id="kontakt-cookies" title="§ 7. Kontakt">
            <P>
              W razie pytań dotyczących plików cookies skontaktuj się z nami:
            </P>
            <Ul>
              <li>
                e-mail:{" "}
                <A href="mailto:kontakt@ilbuoncaffe.pl">
                  kontakt@ilbuoncaffe.pl
                </A>
              </li>
              <li>
                <strong>Il Buon Caffe Dariusz Praczyk</strong>, NIP 6692036051,
                ul. Biskupa Czesława Domina 3/6, 75-065 Koszalin
              </li>
            </Ul>
            <P className="mt-4">
              Więcej informacji o ochronie danych osobowych znajdziesz w naszej{" "}
              <Link
                href="/polityka-prywatnosci"
                className="text-brand-600 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-500 transition-colors"
              >
                Polityce prywatności
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

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5 text-brand-700 leading-relaxed text-[15px] mb-3">
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

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded text-[13px] font-mono">
      {children}
    </code>
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
                className="text-left px-4 py-3 font-semibold text-brand-800 text-xs uppercase tracking-wider border-b border-brand-200 whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-brand-50/60"}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3 text-brand-700 align-top border-b border-brand-100"
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
