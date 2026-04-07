import type { Metadata } from "next";
import { Playfair_Display, Lato, Pinyon_Script } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";
import "./globals.css";
import { Shell } from "@/components/layout/Shell";
import SmoothScroll from "@/components/SmoothScroll";
import ChunkLoadRecovery from "@/components/ChunkLoadRecovery";

const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-playfair', display: 'swap' });
const lato = Lato({ subsets: ["latin"], weight: ['100', '300', '400', '700', '900'], variable: '--font-lato', display: 'swap' });
const pinyon = Pinyon_Script({ weight: ['400'], subsets: ["latin"], variable: '--font-pinyon', display: 'swap' });

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
  alternates: {
    canonical: "/",
  },
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <GoogleTagManager gtmId="GTM-PQJ24P8L" />
      <body className={`${lato.variable} ${playfair.variable} ${pinyon.variable} font-sans antialiased`} suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <ChunkLoadRecovery />
        <SmoothScroll>
          <Shell>
            {children}
          </Shell>
        </SmoothScroll>
      </body>
    </html>
  );
}
