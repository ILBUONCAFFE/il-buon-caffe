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

const cafeJsonLd = {
  "@context": "https://schema.org",
  "@type": "CafeOrCoffeeShop",
  name: "Il Buon Caffe",
  url: "https://ilbuoncaffe.pl",
  logo: {
    "@type": "ImageObject",
    url: "https://ilbuoncaffe.pl/assets/logo.png",
  },
  image: "https://ilbuoncaffe.pl/assets/logo.png",
  description: "Prawdziwa włoska kawiarnia w Koszalinie. Doskonałe espresso, świeżo palona kawa specialty, włoskie wypieki i delikatesy premium.",
  servesCuisine: ["Kawa", "Włoskie desery", "Wypieki", "Włoska kuchnia"],
  priceRange: "$$",
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
      name: "Gdzie wypić najlepszą kawę w Koszalinie?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Il Buon Caffe to prawdziwa włoska kawiarnia w Koszalinie przy ul. Biskupa Czesława Domina 3/6. Serwujemy doskonałe espresso i kawy specialty z wyselekcjonowanych ziaren, parzone przez doświadczonych baristów. Działamy od 2003 roku.",
      },
    },
    {
      "@type": "Question",
      name: "Jakie godziny otwarcia ma Il Buon Caffe w Koszalinie?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Il Buon Caffe jest otwarta od poniedziałku do piątku w godzinach 09:00–16:00 oraz w sobotę od 11:00 do 14:00.",
      },
    },
    {
      "@type": "Question",
      name: "Co znajdę w kawiarni Il Buon Caffe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "W Il Buon Caffe znajdziesz doskonałe espresso i kawy specialty, domowe wypieki, włoskie desery oraz sklep z delikatesami premium: kawa ziarnista, wina, oliwy i tradycyjne włoskie produkty.",
      },
    },
    {
      "@type": "Question",
      name: "Gdzie znajduje się kawiarnia Il Buon Caffe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kawiarnia Il Buon Caffe mieści się w Koszalinie przy ul. Biskupa Czesława Domina 3/6 (75-065 Koszalin). Zapraszamy!",
      },
    },
  ],
};

export const metadata: Metadata = {
  title: "Il Buon Caffe – Włoska Kawiarnia w Koszalinie",
  description: "Prawdziwa włoska kawiarnia w Koszalinie. Zapraszamy na doskonałe espresso, świeżo palone kawy specialty i włoskie wypieki. Il Buon Caffe – ul. Biskupa Czesława Domina 3/6.",
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
    title: "Il Buon Caffe – Włoska Kawiarnia w Koszalinie",
    description: "Prawdziwa włoska kawiarnia w Koszalinie. Doskonałe espresso, kawy specialty i włoskie wypieki.",
    images: [
      {
        url: "/assets/logo.png",
        width: 512,
        height: 512,
        alt: "Logo Il Buon Caffe",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Il Buon Caffe – Włoska Kawiarnia w Koszalinie",
    description: "Prawdziwa włoska kawiarnia w Koszalinie. Doskonałe espresso, kawy specialty i włoskie wypieki.",
    images: ["/assets/logo.png"],
  },
  keywords: [
    "kawiarnia Koszalin", "kawa Koszalin", "włoska kawiarnia", "espresso Koszalin",
    "kawa specialty", "cappuccino", "Il Buon Caffe", "kawiarnia włoska",
    "kawa ziarnista", "wypieki włoskie", "delikatesy włoskie", "wino włoskie",
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(cafeJsonLd) }}
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
