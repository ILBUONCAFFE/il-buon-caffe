import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Regulamin sklepu | Il Buon Caffe",
  description:
    "Regulamin sklepu internetowego Il Buon Caffe. Warunki składania zamówień, płatności, dostawy, zwrotów i reklamacji.",
};

export default function RegulaminPage() {
  return (
    <main className="min-h-screen bg-brand-50 text-brand-950 selection:bg-brand-400/30">
      <div className="container mx-auto px-6 lg:px-12 py-24 md:py-32 max-w-3xl">
        <header className="mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-brand-500 font-semibold mb-4">
            Dokument prawny
          </p>
          <h1 className="text-4xl md:text-5xl font-serif font-medium tracking-tight mb-4">
            Regulamin sklepu
          </h1>
          <p className="text-brand-700/60 text-sm">
            Wersja 1.0 &mdash; obowiązuje od 8 kwietnia 2026 r.
          </p>
        </header>

        <article className="prose prose-brand max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-p:leading-relaxed prose-li:leading-relaxed prose-a:text-brand-700 prose-a:underline prose-a:decoration-brand-300 hover:prose-a:decoration-brand-500 prose-a:underline-offset-2">
          <Section id="postanowienia-ogolne" title="&sect; 1. Postanowienia ogólne">
            <ol>
              <li>
                Niniejszy Regulamin określa zasady korzystania ze sklepu
                internetowego dostępnego pod adresem{" "}
                <strong>ilbuoncaffe.pl</strong> (dalej: &bdquo;Sklep&rdquo;).
              </li>
              <li>
                Właścicielem i operatorem Sklepu jest{" "}
                <strong>Il Buon Caffe</strong> z siedzibą w Koszalinie, ul.
                Biskupa Czesława Domina 3/6, 75-065 Koszalin, NIP: [NIP], REGON:
                [REGON] (dalej: &bdquo;Sprzedawca&rdquo;).
              </li>
              <li>
                Kontakt ze Sprzedawcą:{" "}
                <a href="mailto:kontakt@ilbuoncaffe.pl">
                  kontakt@ilbuoncaffe.pl
                </a>
                , tel.{" "}
                <a href="tel:+48664937937">+48 664 937 937</a>, pn&ndash;pt
                09:00&ndash;16:00, sob 11:00&ndash;14:00.
              </li>
              <li>
                Sklep prowadzi sprzedaż detaliczną kawy, win, delikatesów
                włoskich i innych produktów spożywczych za pośrednictwem
                Internetu na terenie Rzeczypospolitej Polskiej.
              </li>
              <li>
                Korzystanie ze Sklepu wymaga urządzenia z dostępem do Internetu,
                aktualnej przeglądarki internetowej (Chrome, Firefox, Safari,
                Edge) z włączoną obsługą JavaScript i cookies oraz aktywnego
                adresu e-mail.
              </li>
              <li>
                Ceny podane w Sklepie są cenami brutto (zawierają podatek VAT) i
                wyrażone są w złotych polskich (PLN). Cena wiążąca to cena
                widniejąca przy produkcie w chwili składania zamówienia.
              </li>
            </ol>
          </Section>

          <Section id="definicje" title="&sect; 2. Definicje">
            <ol>
              <li>
                <strong>Klient</strong> &mdash; osoba fizyczna posiadająca pełną
                zdolność do czynności prawnych, osoba prawna lub jednostka
                organizacyjna nieposiadająca osobowości prawnej, która korzysta
                ze Sklepu.
              </li>
              <li>
                <strong>Konsument</strong> &mdash; Klient będący osobą fizyczną,
                dokonujący zakupu niezwiązanego bezpośrednio z jego
                działalnością gospodarczą lub zawodową (art. 22
                <sup>1</sup> Kodeksu cywilnego), a także osoba fizyczna
                prowadząca jednoosobową działalność gospodarczą, gdy zakup nie ma
                dla niej charakteru zawodowego (art. 385
                <sup>5</sup> k.c.).
              </li>
              <li>
                <strong>Konto</strong> &mdash; indywidualne konto Klienta w
                Sklepie, chronione adresem e-mail i hasłem, umożliwiające
                składanie zamówień, przeglądanie historii zakupów i zarządzanie
                danymi.
              </li>
              <li>
                <strong>Zamówienie</strong> &mdash; oświadczenie woli Klienta
                zmierzające do zawarcia umowy sprzedaży produktów ze
                Sprzedawcą.
              </li>
              <li>
                <strong>Produkt</strong> &mdash; rzecz ruchoma dostępna w
                Sklepie, będąca przedmiotem umowy sprzedaży.
              </li>
            </ol>
          </Section>

          <Section id="konto" title="&sect; 3. Konto użytkownika">
            <ol>
              <li>
                Rejestracja Konta jest dobrowolna i bezpłatna. Wymaga podania
                imienia, adresu e-mail, ustawienia hasła oraz zaakceptowania
                niniejszego Regulaminu i{" "}
                <Link href="/polityka-prywatnosci">Polityki prywatności</Link>.
              </li>
              <li>
                Hasło musi spełniać wymagania bezpieczeństwa: minimum 12 znaków,
                w tym wielka i mała litera, cyfra oraz znak specjalny.
              </li>
              <li>
                Klient zobowiązuje się do zachowania poufności danych
                logowania. Sprzedawca nie ponosi odpowiedzialności za
                udostępnienie danych logowania osobom trzecim przez Klienta.
              </li>
              <li>
                Klient może w każdej chwili usunąć Konto, kontaktując się ze
                Sprzedawcą. Usunięcie Konta nie ma wpływu na zamówienia złożone
                przed jego usunięciem.
              </li>
              <li>
                Sprzedawca może zablokować Konto w przypadku naruszenia
                Regulaminu, po uprzednim poinformowaniu Klienta drogą
                elektroniczną.
              </li>
            </ol>
          </Section>

          <Section id="zamowienia" title="&sect; 4. Składanie zamówień">
            <ol>
              <li>
                Zamówienia można składać 24 godziny na dobę, 7 dni w tygodniu
                za pośrednictwem Sklepu internetowego.
              </li>
              <li>
                W celu złożenia zamówienia Klient:
                <ol className="list-[lower-alpha]">
                  <li>wybiera Produkty i dodaje je do koszyka,</li>
                  <li>
                    podaje dane niezbędne do realizacji zamówienia (imię,
                    nazwisko, adres dostawy, numer telefonu, adres e-mail),
                  </li>
                  <li>wybiera sposób dostawy i metodę płatności,</li>
                  <li>
                    potwierdza zamówienie przyciskiem &bdquo;Zamawiam i
                    płacę&rdquo;.
                  </li>
                </ol>
              </li>
              <li>
                Złożenie zamówienia stanowi ofertę zawarcia umowy sprzedaży.
                Umowa zostaje zawarta z chwilą potwierdzenia przyjęcia
                zamówienia przez Sprzedawcę, przesłanego na adres e-mail
                Klienta.
              </li>
              <li>
                Sprzedawca zastrzega sobie prawo do odmowy realizacji zamówienia
                w przypadku braku dostępności Produktu, podania nieprawidłowych
                danych przez Klienta lub w przypadku uzasadnionych wątpliwości
                co do rzetelności zamówienia.
              </li>
              <li>
                Zamówienie może zostać anulowane przez Klienta do momentu
                nadania przesyłki, poprzez kontakt ze Sprzedawcą.
              </li>
            </ol>
          </Section>

          <Section id="platnosci" title="&sect; 5. Płatności">
            <ol>
              <li>
                Sklep umożliwia płatność za pośrednictwem serwisu{" "}
                <strong>Przelewy24</strong> (DialCom24 Sp. z o.o., PayPro S.A.)
                w następujących formach:
                <ul>
                  <li>karta płatnicza (Visa, Mastercard),</li>
                  <li>BLIK,</li>
                  <li>przelew bankowy online.</li>
                </ul>
              </li>
              <li>
                Klient zobowiązany jest do dokonania płatności w ciągu 24 godzin
                od złożenia zamówienia. Po upływie tego terminu zamówienie może
                zostać anulowane.
              </li>
              <li>
                Sprzedawca wystawia dowód zakupu (paragon lub fakturę VAT) do
                każdego zamówienia. Faktura VAT wystawiana jest na życzenie
                Klienta, który poda dane do faktury podczas składania
                zamówienia.
              </li>
            </ol>
          </Section>

          <Section id="dostawa" title="&sect; 6. Dostawa">
            <ol>
              <li>
                Dostawa realizowana jest na terenie Rzeczypospolitej Polskiej
                pod adres wskazany przez Klienta w zamówieniu.
              </li>
              <li>
                Koszty dostawy są podawane podczas składania zamówienia i
                zależą od wybranego sposobu dostawy, wagi oraz wartości
                zamówienia.
              </li>
              <li>
                Przewidywany czas dostawy wynosi od 1 do 5 dni roboczych od
                momentu zaksięgowania płatności, chyba że w opisie Produktu
                wskazano inny termin.
              </li>
              <li>
                W przypadku produktów spożywczych wymagających szczególnych
                warunków transportu (np. wino) Sprzedawca dołoży starań, aby
                zapewnić odpowiednie warunki przewozu.
              </li>
              <li>
                Klient powinien sprawdzić przesyłkę w obecności kuriera. W
                przypadku uszkodzenia opakowania zaleca się sporządzenie
                protokołu szkody.
              </li>
            </ol>
          </Section>

          <Section
            id="odstapienie"
            title="&sect; 7. Prawo odstąpienia od umowy"
          >
            <ol>
              <li>
                Konsument ma prawo odstąpić od umowy zawartej na odległość w
                terminie <strong>14 dni</strong> od dnia otrzymania Produktu,
                bez podania przyczyny, zgodnie z ustawą z dnia 30 maja 2014 r.
                o prawach konsumenta.
              </li>
              <li>
                Aby skorzystać z prawa odstąpienia, Konsument powinien
                poinformować Sprzedawcę o swojej decyzji w drodze jednoznacznego
                oświadczenia przesłanego na adres e-mail{" "}
                <a href="mailto:kontakt@ilbuoncaffe.pl">
                  kontakt@ilbuoncaffe.pl
                </a>{" "}
                lub pisemnie na adres siedziby Sprzedawcy.
              </li>
              <li>
                Prawo odstąpienia od umowy <strong>nie przysługuje</strong> w
                odniesieniu do umów, których przedmiotem jest:
                <ul>
                  <li>
                    rzecz ulegająca szybkiemu zepsuciu lub mająca krótki termin
                    przydatności do użycia (np. świeża kawa mielona na
                    zamówienie),
                  </li>
                  <li>
                    rzecz dostarczana w zapieczętowanym opakowaniu, której po
                    otwarciu opakowania nie można zwrócić ze względu na ochronę
                    zdrowia lub ze względów higienicznych, jeżeli opakowanie
                    zostało otwarte po dostarczeniu,
                  </li>
                  <li>
                    napoje alkoholowe (wino), których cena została uzgodniona
                    przy zawarciu umowy sprzedaży, a których dostarczenie może
                    nastąpić dopiero po upływie 30 dni i których wartość zależy
                    od wahań na rynku, nad którymi Sprzedawca nie ma kontroli.
                  </li>
                </ul>
              </li>
              <li>
                Sprzedawca zwróci Konsumentowi wszystkie otrzymane płatności,
                w tym koszty dostawy (z wyjątkiem dodatkowych kosztów
                wynikających z wybranego przez Konsumenta sposobu dostawy
                innego niż najtańszy oferowany), niezwłocznie, nie później niż
                w terminie 14 dni od dnia otrzymania oświadczenia o
                odstąpieniu.
              </li>
              <li>
                Konsument ponosi bezpośrednie koszty zwrotu Produktu.
                Produkt powinien zostać zwrócony w stanie niepogorszonym, w
                oryginalnym opakowaniu (jeśli to możliwe).
              </li>
            </ol>
          </Section>

          <Section id="reklamacje" title="&sect; 8. Reklamacje i rękojmia">
            <ol>
              <li>
                Sprzedawca jest zobowiązany dostarczyć Produkt wolny od wad.
              </li>
              <li>
                Reklamacje należy składać drogą elektroniczną na adres{" "}
                <a href="mailto:kontakt@ilbuoncaffe.pl">
                  kontakt@ilbuoncaffe.pl
                </a>{" "}
                lub pisemnie na adres siedziby Sprzedawcy.
              </li>
              <li>
                Zgłoszenie reklamacyjne powinno zawierać: opis wady, datę jej
                stwierdzenia, numer zamówienia, dane kontaktowe Klienta oraz
                żądanie (naprawa, wymiana, obniżenie ceny lub odstąpienie od
                umowy).
              </li>
              <li>
                Sprzedawca rozpatrzy reklamację w terminie{" "}
                <strong>14 dni</strong> od dnia jej otrzymania i poinformuje
                Klienta o sposobie jej rozpatrzenia drogą elektroniczną.
              </li>
              <li>
                Konsumentowi przysługuje rękojmia za wady fizyczne i prawne
                Produktu zgodnie z przepisami Kodeksu cywilnego (art. 556 i
                nast. k.c.).
              </li>
            </ol>
          </Section>

          <Section
            id="sprzedaz-alkoholu"
            title="&sect; 9. Sprzedaż napojów alkoholowych"
          >
            <ol>
              <li>
                Sprzedaż napojów alkoholowych (wina) odbywa się wyłącznie na
                rzecz osób pełnoletnich, zgodnie z ustawą z dnia 26 października
                1982 r. o wychowaniu w trzeźwości i przeciwdziałaniu
                alkoholizmowi.
              </li>
              <li>
                Składając zamówienie na napoje alkoholowe, Klient oświadcza, że
                ma ukończone 18 lat.
              </li>
              <li>
                Kurier może zweryfikować wiek odbiorcy przy doręczeniu
                przesyłki zawierającej napoje alkoholowe.
              </li>
            </ol>
          </Section>

          <Section
            id="odpowiedzialnosc"
            title="&sect; 10. Odpowiedzialność"
          >
            <ol>
              <li>
                Sprzedawca nie ponosi odpowiedzialności za niedostępność Sklepu
                spowodowaną siłą wyższą, awarią techniczną lub pracami
                konserwacyjnymi.
              </li>
              <li>
                Sprzedawca nie ponosi odpowiedzialności za nieprawidłowe
                działanie Sklepu wynikające z niewłaściwej konfiguracji
                urządzenia lub przeglądarki Klienta.
              </li>
              <li>
                Klient zobowiązuje się do korzystania ze Sklepu zgodnie z
                obowiązującym prawem i niniejszym Regulaminem, a w
                szczególności do niepodawania danych niezgodnych z
                rzeczywistością.
              </li>
            </ol>
          </Section>

          <Section id="dane-osobowe" title="&sect; 11. Dane osobowe">
            <ol>
              <li>
                Administratorem danych osobowych Klientów jest Sprzedawca.
              </li>
              <li>
                Szczegółowe informacje dotyczące przetwarzania danych osobowych,
                w tym cele, podstawy prawne, okres przechowywania i prawa
                Klientów, zawiera{" "}
                <Link href="/polityka-prywatnosci">Polityka prywatności</Link>.
              </li>
              <li>
                Informacje dotyczące plików cookies zawiera{" "}
                <Link href="/polityka-cookies">Polityka cookies</Link>.
              </li>
            </ol>
          </Section>

          <Section
            id="pozasadowe"
            title="&sect; 12. Pozasądowe rozwiązywanie sporów"
          >
            <ol>
              <li>
                Konsument ma możliwość skorzystania z pozasądowych sposobów
                rozpatrywania reklamacji i dochodzenia roszczeń, w
                szczególności:
                <ul>
                  <li>
                    złożenia wniosku o rozstrzygnięcie sporu do stałego
                    polubownego sądu konsumenckiego działającego przy
                    Wojewódzkim Inspektorze Inspekcji Handlowej,
                  </li>
                  <li>
                    zwrócenia się do Miejskiego (Powiatowego) Rzecznika
                    Konsumentów o pomoc w rozwiązaniu sporu,
                  </li>
                  <li>
                    skorzystania z platformy internetowego rozstrzygania sporów
                    (ODR) dostępnej pod adresem:{" "}
                    <a
                      href="https://ec.europa.eu/consumers/odr"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      https://ec.europa.eu/consumers/odr
                    </a>
                    .
                  </li>
                </ul>
              </li>
            </ol>
          </Section>

          <Section
            id="postanowienia-koncowe"
            title="&sect; 13. Postanowienia końcowe"
          >
            <ol>
              <li>
                Regulamin wchodzi w życie z dniem opublikowania w Sklepie.
              </li>
              <li>
                Sprzedawca zastrzega sobie prawo do zmiany Regulaminu z ważnych
                przyczyn (zmiana przepisów prawa, zmiana sposobów płatności lub
                dostaw). O zmianach Klienci zostaną poinformowani z
                wyprzedzeniem co najmniej 14 dni.
              </li>
              <li>
                Zamówienia złożone przed wejściem w życie zmian Regulaminu
                realizowane są na dotychczasowych zasadach.
              </li>
              <li>
                W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie
                mają przepisy prawa polskiego, w szczególności Kodeksu
                cywilnego, ustawy o prawach konsumenta oraz ustawy o
                świadczeniu usług drogą elektroniczną.
              </li>
              <li>
                Ewentualne spory wynikające z umów zawartych za pośrednictwem
                Sklepu będą rozstrzygane przez sąd właściwy zgodnie z
                przepisami Kodeksu postępowania cywilnego.
              </li>
            </ol>
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
