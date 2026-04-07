import type { Metadata } from "next";
import CafeClient from "@/components/Cafe/CafeClient";

export const metadata: Metadata = {
  title: "Włoska Kawiarnia w Koszalinie",
  description: "Prawdziwa włoska kawiarnia w Koszalinie przy ul. Biskupa Czesława Domina 3/6. Doskonałe espresso, kawy specialty, domowe wypieki i włoskie desery. Zapraszamy!",
  openGraph: {
    title: "Włoska Kawiarnia w Koszalinie | Il Buon Caffe",
    description: "Doskonałe espresso, kawy specialty i domowe wypieki w Il Buon Caffe — Koszalin, ul. Biskupa Czesława Domina 3/6.",
    type: "website",
    locale: "pl_PL",
    siteName: "Il Buon Caffe",
    url: "https://ilbuoncaffe.pl/kawiarnia",
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
    title: "Włoska Kawiarnia w Koszalinie | Il Buon Caffe",
    description: "Doskonałe espresso, kawy specialty i domowe wypieki w Il Buon Caffe — Koszalin.",
    images: ["https://ilbuoncaffe.pl/assets/kawiarnia.jpg"],
  },
  alternates: {
    canonical: "/kawiarnia",
  },
};

const cafeJsonLd = {
  "@context": "https://schema.org",
  "@type": "CafeOrCoffeeShop",
  name: "Il Buon Caffe",
  url: "https://ilbuoncaffe.pl/kawiarnia",
  logo: {
    "@type": "ImageObject",
    url: "https://ilbuoncaffe.pl/assets/logo.png",
  },
  image: "https://ilbuoncaffe.pl/assets/logo.png",
  description: "Prawdziwa włoska kawiarnia w Koszalinie. Doskonałe espresso, świeżo palona kawa specialty, włoskie wypieki i delikatesy premium.",
  servesCuisine: ["Kawa", "Włoskie desery", "Wypieki", "Włoska kuchnia"],
  priceRange: "$$",
  telephone: "+48664937937",
  email: "kontakt@ilbuoncaffe.pl",
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

const localFaqJsonLd = {
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
      name: "Jakie godziny otwarcia ma kawiarnia Il Buon Caffe w Koszalinie?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kawiarnia Il Buon Caffe jest otwarta od poniedziałku do piątku w godzinach 09:00–16:00 oraz w sobotę od 11:00 do 14:00.",
      },
    },
    {
      "@type": "Question",
      name: "Co serwuje kawiarnia Il Buon Caffe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "W Il Buon Caffe znajdziesz doskonałe espresso, kawy specialty, cappuccino, domowe wypieki i włoskie desery. Do dyspozycji gości jest też sklep z włoskimi delikatesami premium.",
      },
    },
    {
      "@type": "Question",
      name: "Gdzie mieści się kawiarnia Il Buon Caffe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Kawiarnia Il Buon Caffe mieści się w Koszalinie przy ul. Biskupa Czesława Domina 3/6 (75-065 Koszalin). Zapraszamy!",
      },
    },
  ],
};

export default function CafePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cafeJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localFaqJsonLd) }}
      />
      <CafeClient />
    </>
  );
}
