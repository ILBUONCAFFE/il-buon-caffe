import type { Metadata } from "next";
import { Playfair_Display, Lato, Pinyon_Script } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import { headers } from "next/headers";
import "./globals.css";
import { Shell } from "@/components/layout/Shell";
import ChunkLoadRecovery from "@/components/ChunkLoadRecovery";

const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-playfair', display: 'swap' });
const lato = Lato({ subsets: ["latin"], weight: ['300', '400', '700'], variable: '--font-lato', display: 'swap' });
// preload: false — dekoracyjna czcionka, nieużywana na wszystkich stronach, unika preload warning
const pinyon = Pinyon_Script({ weight: ['400'], subsets: ["latin"], variable: '--font-pinyon', display: 'swap', preload: false });

const CONSENT_STORAGE_KEY = "ibc-consent-v2";
const LEGACY_CONSENT_STORAGE_KEY = "ibc-consent-v1";
const CONSENT_COOKIE_KEY = "ibc_consent";
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID?.trim() ?? "";

const consentBootstrapScript = `
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments);};
window.__ibcClarityLoaded = window.__ibcClarityLoaded || false;

const CLARITY_PROJECT_ID = ${JSON.stringify(CLARITY_PROJECT_ID)};

function normalizeLegacyConsent(value) {
  if (value === "all") return { analytics: true, marketing: true };
  if (value === "analytics") return { analytics: true, marketing: false };
  if (value === "necessary") return { analytics: false, marketing: false };
  return null;
}

function parseStoredConsent(rawValue) {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);
    if (
      parsed &&
      typeof parsed === "object" &&
      parsed.version === 2 &&
      typeof parsed.analytics === "boolean" &&
      typeof parsed.marketing === "boolean"
    ) {
      return { analytics: parsed.analytics, marketing: parsed.marketing };
    }
  } catch (_err) {
    // ignore parse failure and continue to legacy parser
  }

  return normalizeLegacyConsent(rawValue);
}

function readConsentCookie() {
  const prefix = "${CONSENT_COOKIE_KEY}=";
  const consentCookie = document.cookie
    .split(";")
    .map(function(part) { return part.trim(); })
    .find(function(part) { return part.startsWith(prefix); });

  if (!consentCookie) return null;
  return parseStoredConsent(decodeURIComponent(consentCookie.slice(prefix.length)));
}

function readStoredConsent() {
  try {
    const localStorageChoice = window.localStorage.getItem("${CONSENT_STORAGE_KEY}");
    const parsedV2 = parseStoredConsent(localStorageChoice);
    if (parsedV2) return parsedV2;

    const legacyChoice = window.localStorage.getItem("${LEGACY_CONSENT_STORAGE_KEY}");
    const parsedLegacy = parseStoredConsent(legacyChoice);
    if (parsedLegacy) return parsedLegacy;
  } catch (_err) {
    // Ignore storage access failures and fallback to cookie.
  }

  return readConsentCookie();
}

function maybeLoadClarity(consent) {
  if (!consent || !consent.analytics) return;
  if (!CLARITY_PROJECT_ID) return;
  if (window.__ibcClarityLoaded) return;

  window.__ibcClarityLoaded = true;

  (function(c, l, a, r, i, t, y) {
    c[a] = c[a] || function() { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r);
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", CLARITY_PROJECT_ID);
}

function applyConsent(consent) {
  if (!consent) return;

  window.gtag("consent", "update", {
    ad_storage: consent.marketing ? "granted" : "denied",
    ad_user_data: consent.marketing ? "granted" : "denied",
    ad_personalization: consent.marketing ? "granted" : "denied",
    analytics_storage: consent.analytics ? "granted" : "denied",
    functionality_storage: "granted",
    personalization_storage: consent.marketing ? "granted" : "denied",
    security_storage: "granted",
  });

  maybeLoadClarity(consent);
}

window.gtag("consent", "default", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  functionality_storage: "granted",
  personalization_storage: "denied",
  security_storage: "granted",
  wait_for_update: 500,
});

try {
  const storedConsent = readStoredConsent();
  applyConsent(storedConsent);
} catch (_err) {
  // Ignore storage access failures (private mode / restricted browser settings).
}

window.addEventListener("ibc:consent-updated", function(event) {
  const detail = event && event.detail;
  if (!detail || typeof detail !== "object") return;

  applyConsent({
    analytics: !!detail.analytics,
    marketing: !!detail.marketing,
  });
});
`;

const storeJsonLd = {
  "@context": "https://schema.org",
  "@type": ["Store", "OnlineStore"],
  name: "Il Buon Caffe",
  url: "https://ilbuoncaffe.pl",
  logo: {
    "@type": "ImageObject",
    url: "https://ilbuoncaffe.pl/assets/logo.png",
  },
  image: "https://ilbuoncaffe.pl/assets/logo.png",
  description: "Sklep internetowy z włoskimi delikatesami premium. Kawa ziarnista specialty, wina, oliwy, makarony rzemieślnicze i słodycze. Wysyłka na terenie całej Polski.",
  email: "kontakt@ilbuoncaffe.pl",
  telephone: "+48664937937",
  address: {
    "@type": "PostalAddress",
    streetAddress: "ul. Biskupa Czesława Domina 3/6",
    addressLocality: "Koszalin",
    postalCode: "75-065",
    addressCountry: "PL",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "16:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Saturday"],
      opens: "11:00",
      closes: "14:00",
    },
  ],
  areaServed: {
    "@type": "Country",
    name: "PL",
  },
  currenciesAccepted: "PLN",
  paymentAccepted: "Przelewy24, BLIK, karta płatnicza, przelew bankowy",
  sameAs: [
    "https://www.instagram.com/il_buoncaffe/",
    "https://www.facebook.com/IlBuonCaffeKoszalin",
  ],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Ile kosztuje dostawa?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Realizujemy dostawę kurierem na terenie całej Polski. Bezpłatna dostawa przy zakupach powyżej 200 zł. Poniżej tej kwoty koszt wysyłki wynosi 15 zł. Czas dostawy: 1–2 dni robocze.",
      },
    },
    {
      "@type": "Question",
      name: "Jak szybko wysyłacie zamówienia?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Zamówienia złożone w dni robocze do godziny 14:00 wysyłamy tego samego dnia. Standardowy czas dostawy wynosi 1–2 dni robocze.",
      },
    },
    {
      "@type": "Question",
      name: "Czy można kupić prawdziwą włoską kawę specialty online?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Tak! Il Buon Caffe oferuje szeroki wybór kaw ziarnistych specialty od najlepszych włoskich palarni. Zamów przez ilbuoncaffe.pl z dostawą na terenie całej Polski.",
      },
    },
    {
      "@type": "Question",
      name: "Jakie produkty włoskie można zamówić przez internet?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "W sklepie Il Buon Caffe online znajdziesz: kawy ziarniste specialty, wina włoskie i hiszpańskie, oliwy z oliwek extra virgin, makarony rzemieślnicze, sery, wędliny oraz tradycyjne włoskie słodycze.",
      },
    },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "Il Buon Caffe – Włoska Kawiarnia i Sklep Online w Koszalinie",
    template: "%s | Il Buon Caffe",
  },
  description: "Prawdziwa włoska kawiarnia w Koszalinie. Zapraszamy na doskonałe espresso, świeżo palone kawy specialty i włoskie wypieki. Sklep online z włoskimi delikatesami — kawa, wino, oliwy. Il Buon Caffe – ul. Biskupa Czesława Domina 3/6.",
  metadataBase: new URL("https://ilbuoncaffe.pl"),
  icons: {
    icon: [{ url: "/assets/logo.png" }],
    shortcut: ["/assets/logo.png"],
    apple: [{ url: "/assets/logo.png" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "pl_PL",
    siteName: "Il Buon Caffe",
    url: "https://ilbuoncaffe.pl",
    title: "Il Buon Caffe – Włoska Kawiarnia i Sklep Online w Koszalinie",
    description: "Prawdziwa włoska kawiarnia i sklep online z włoskimi delikatesami. Espresso, kawy specialty, wina, oliwy i słodycze — z dostawą do całej Polski.",
    images: [
      {
        url: "https://ilbuoncaffe.pl/assets/kawiarnia.jpg",
        width: 1920,
        height: 998,
        alt: "Wnętrze kawiarni Il Buon Caffe w Koszalinie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Il Buon Caffe – Włoska Kawiarnia i Sklep Online w Koszalinie",
    description: "Prawdziwa włoska kawiarnia i sklep online z włoskimi delikatesami. Espresso, kawy specialty, wina, oliwy — dostawa do całej Polski.",
    images: ["https://ilbuoncaffe.pl/assets/kawiarnia.jpg"],
  },
  keywords: [
    "kawiarnia Koszalin", "kawa Koszalin", "włoska kawiarnia", "espresso Koszalin",
    "kawa specialty", "cappuccino", "Il Buon Caffe", "kawiarnia włoska",
    "kawa ziarnista", "wypieki włoskie", "delikatesy włoskie", "wino włoskie",
    "sklep włoski online", "włoskie produkty", "kawa online", "wino włoskie online",
    "oliwa z oliwek", "włoskie słodycze", "sklep internetowy delikatesy",
  ],
  authors: [{ name: "Il Buon Caffe" }],
  creator: "Il Buon Caffe",
  publisher: "Il Buon Caffe",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Middleware ustawia x-nonce tylko dla /admin/* — jeśli nagłówek jest obecny, jesteśmy na admin route.
  // Na admin stronach pomijamy GA: nonce-based CSP i tak by je zablokował, a tracking admina jest niepożądany.
  const headersList = await headers();
  const isAdminRoute = !!headersList.get('x-nonce');

  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={`${lato.variable} ${playfair.variable} ${pinyon.variable} font-sans antialiased`} suppressHydrationWarning>
        {!isAdminRoute && (
          <Script id="ga-consent-bootstrap" strategy="beforeInteractive">
            {consentBootstrapScript}
          </Script>
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <ChunkLoadRecovery />
        <Shell>
          {children}
        </Shell>
      </body>
      {!isAdminRoute && <GoogleAnalytics gaId="G-9X9LN9GQYD" />}
    </html>
  );
}
