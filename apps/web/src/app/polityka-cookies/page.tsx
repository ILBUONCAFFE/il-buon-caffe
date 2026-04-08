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

        <article className="prose prose-brand max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-brand-700 prose-a:underline prose-a:decoration-brand-300 hover:prose-a:decoration-brand-500 prose-a:underline-offset-2">
          <Section id="czym-sa-cookies" title="&sect; 1. Czym są pliki cookies?">
            <p>
              Pliki cookies (ciasteczka) to niewielkie pliki tekstowe
              zapisywane na Twoim urządzeniu (komputerze, telefonie, tablecie)
              przez przeglądarkę internetową podczas korzystania ze stron
              internetowych. Cookies pozwalają stronie &bdquo;zapamiętać&rdquo;
              Twoje preferencje, dane logowania i inne ustawienia.
            </p>
          </Section>

          <Section
            id="rodzaje-cookies"
            title="&sect; 2. Rodzaje cookies stosowane w Sklepie"
          >
            <h3>2.1. Cookies niezbędne (wymagane)</h3>
            <p>
              Są konieczne do prawidłowego działania Sklepu. Nie wymagają
              Twojej zgody, ponieważ bez nich Sklep nie mógłby funkcjonować.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Cel</th>
                  <th>Ważność</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>__Host-access_token</code>
                  </td>
                  <td>
                    Token uwierzytelniający sesję użytkownika (JWT). Flagi:
                    HttpOnly, Secure, SameSite=Strict.
                  </td>
                  <td>2 godziny (24h z &bdquo;zapamiętaj mnie&rdquo;)</td>
                </tr>
                <tr>
                  <td>
                    <code>__Host-refresh_token</code>
                  </td>
                  <td>
                    Token odświeżający sesję. Flagi: HttpOnly, Secure,
                    SameSite=Strict.
                  </td>
                  <td>7 dni</td>
                </tr>
                <tr>
                  <td>
                    <code>ibc_consent</code>
                  </td>
                  <td>
                    Zapamiętanie Twojego wyboru dotyczącego cookies (niezbędne /
                    analityczne / wszystkie).
                  </td>
                  <td>365 dni</td>
                </tr>
              </tbody>
            </table>
            <p>
              Dodatkowo używamy <code>localStorage</code> (klucz{" "}
              <code>ibc-consent-v1</code>) do przechowywania Twojego wyboru
              zgody na cookies po stronie przeglądarki.
            </p>

            <h3>2.2. Cookies analityczne (opcjonalne)</h3>
            <p>
              Są stosowane wyłącznie po wyrażeniu przez Ciebie zgody.
              Pomagają nam zrozumieć, w jaki sposób użytkownicy korzystają ze
              Sklepu, co pozwala nam ulepszać jego działanie.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Nazwa</th>
                  <th>Dostawca</th>
                  <th>Cel</th>
                  <th>Ważność</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>_ga</code>
                  </td>
                  <td>Google Analytics 4</td>
                  <td>
                    Rozróżnianie użytkowników w celu analizy ruchu na stronie
                  </td>
                  <td>2 lata</td>
                </tr>
                <tr>
                  <td>
                    <code>_ga_9X9LN9GQYD</code>
                  </td>
                  <td>Google Analytics 4</td>
                  <td>Utrzymanie stanu sesji analitycznej</td>
                  <td>2 lata</td>
                </tr>
              </tbody>
            </table>
            <p>
              Stosujemy <strong>Google Consent Mode v2</strong>, co oznacza, że
              Google Analytics nie zapisuje żadnych cookies ani nie zbiera danych
              do celów analitycznych, dopóki nie wyrazisz na to zgody.
              Domyślny stan wszystkich opcjonalnych cookies to
              &bdquo;denied&rdquo; (odrzucone).
            </p>
          </Section>

          <Section
            id="consent-mode"
            title="&sect; 3. Google Consent Mode v2"
          >
            <p>
              Sklep implementuje mechanizm Google Consent Mode v2, który
              zarządza następującymi kategoriami zgód:
            </p>
            <table>
              <thead>
                <tr>
                  <th>Kategoria</th>
                  <th>Domyślny stan</th>
                  <th>Opis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>analytics_storage</code>
                  </td>
                  <td>denied</td>
                  <td>Cookies analityczne Google Analytics</td>
                </tr>
                <tr>
                  <td>
                    <code>ad_storage</code>
                  </td>
                  <td>denied</td>
                  <td>Cookies reklamowe (obecnie nieużywane)</td>
                </tr>
                <tr>
                  <td>
                    <code>ad_user_data</code>
                  </td>
                  <td>denied</td>
                  <td>Dane użytkownika dla celów reklamowych</td>
                </tr>
                <tr>
                  <td>
                    <code>ad_personalization</code>
                  </td>
                  <td>denied</td>
                  <td>Personalizacja reklam</td>
                </tr>
                <tr>
                  <td>
                    <code>personalization_storage</code>
                  </td>
                  <td>denied</td>
                  <td>Personalizacja treści strony</td>
                </tr>
                <tr>
                  <td>
                    <code>functionality_storage</code>
                  </td>
                  <td>granted</td>
                  <td>Funkcjonalność strony (niezbędne)</td>
                </tr>
                <tr>
                  <td>
                    <code>security_storage</code>
                  </td>
                  <td>granted</td>
                  <td>Bezpieczeństwo (niezbędne)</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section
            id="zarzadzanie"
            title="&sect; 4. Zarządzanie zgodami na cookies"
          >
            <p>
              Przy pierwszej wizycie w Sklepie wyświetlamy baner informacyjny,
              w którym możesz:
            </p>
            <ul>
              <li>
                <strong>zaakceptować tylko niezbędne cookies</strong> &mdash;
                Sklep działa bez analityki,
              </li>
              <li>
                <strong>zaakceptować cookies analityczne</strong> &mdash;
                włącza Google Analytics,
              </li>
              <li>
                <strong>zaakceptować wszystkie cookies</strong> &mdash; włącza
                pełną analitykę i personalizację.
              </li>
            </ul>
            <p>
              Swoją decyzję możesz zmienić w każdej chwili, czyszcząc pliki
              cookies w ustawieniach przeglądarki &mdash; baner pojawi się
              ponownie.
            </p>

            <h3>Zarządzanie cookies w przeglądarce</h3>
            <p>
              Większość przeglądarek pozwala na zarządzanie cookies w
              ustawieniach. Możesz:
            </p>
            <ul>
              <li>blokować wszystkie cookies,</li>
              <li>usuwać istniejące cookies,</li>
              <li>
                ustawiać powiadomienia o zapisywaniu nowych cookies.
              </li>
            </ul>
            <p>
              Pamiętaj, że zablokowanie cookies niezbędnych może uniemożliwić
              korzystanie z niektórych funkcji Sklepu (np. logowanie, koszyk).
            </p>
          </Section>

          <Section
            id="local-storage"
            title="&sect; 5. Dane w localStorage"
          >
            <p>
              Oprócz cookies Sklep wykorzystuje mechanizm localStorage
              przeglądarki do przechowywania:
            </p>
            <table>
              <thead>
                <tr>
                  <th>Klucz</th>
                  <th>Cel</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>ibc-consent-v1</code>
                  </td>
                  <td>
                    Zapamiętanie Twojego wyboru dotyczącego cookies
                    (&bdquo;necessary&rdquo;, &bdquo;analytics&rdquo; lub
                    &bdquo;all&rdquo;)
                  </td>
                </tr>
              </tbody>
            </table>
            <p>
              Dane w localStorage nie są wysyłane do serwera automatycznie i
              pozostają wyłącznie na Twoim urządzeniu. Możesz je usunąć w
              ustawieniach przeglądarki (Narzędzia deweloperskie &rarr;
              Aplikacja &rarr; localStorage).
            </p>
          </Section>

          <Section id="zmiany-cookies" title="&sect; 6. Zmiany polityki cookies">
            <p>
              Zastrzegamy sobie prawo do zmiany niniejszej Polityki cookies.
              Aktualna wersja jest zawsze dostępna pod adresem{" "}
              <Link href="/polityka-cookies">
                ilbuoncaffe.pl/polityka-cookies
              </Link>
              . O istotnych zmianach poinformujemy poprzez ponowne wyświetlenie
              banera cookies.
            </p>
          </Section>

          <Section id="kontakt-cookies" title="&sect; 7. Kontakt">
            <p>
              W razie pytań dotyczących plików cookies skontaktuj się z nami:
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
            </ul>
            <p>
              Więcej informacji o ochronie danych osobowych znajdziesz w
              naszej{" "}
              <Link href="/polityka-prywatnosci">Polityce prywatności</Link>.
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
