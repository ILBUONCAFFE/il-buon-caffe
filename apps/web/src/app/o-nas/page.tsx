import type { Metadata } from "next";
import AboutClient from "@/components/About/AboutClient";

export const metadata: Metadata = {
  title: "O Nas",
  description:
    "Poznaj historię Il Buon Caffe — kawiarni i delikatesów premium w Koszalinie. Od 2003 roku z pasją przenosimy autentyczny smak Włoch do Polski. Kawa specialty, wina, oliwy i rzemieślnicze wypieki.",
  openGraph: {
    title: "O Nas | Il Buon Caffe",
    description:
      "Historia Il Buon Caffe — ponad 20 lat pasji do włoskiego smaku. Kawiarnia i delikatesy premium w Koszalinie.",
    type: "website",
    locale: "pl_PL",
    siteName: "Il Buon Caffe",
    url: "https://ilbuoncaffe.pl/o-nas",
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
    title: "O Nas | Il Buon Caffe",
    description:
      "Historia Il Buon Caffe — ponad 20 lat pasji do włoskiego smaku w Koszalinie.",
    images: ["https://ilbuoncaffe.pl/assets/kawiarnia.jpg"],
  },
  alternates: {
    canonical: "/o-nas",
  },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "O Nas — Il Buon Caffe",
  url: "https://ilbuoncaffe.pl/o-nas",
  description:
    "Historia Il Buon Caffe — kawiarni i delikatesów premium w Koszalinie, działającej od 2003 roku.",
  mainEntity: {
    "@type": "LocalBusiness",
    name: "Il Buon Caffe",
    foundingDate: "2003",
    url: "https://ilbuoncaffe.pl",
    description:
      "Kawiarnia i delikatesy premium w Koszalinie. Kawa specialty, wina, oliwy, rzemieślnicze wypieki i włoskie produkty od 2003 roku.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "ul. Biskupa Czesława Domina 3/6",
      addressLocality: "Koszalin",
      postalCode: "75-065",
      addressCountry: "PL",
    },
    sameAs: [
      "https://www.instagram.com/il_buoncaffe/",
      "https://www.facebook.com/IlBuonCaffeKoszalin",
    ],
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <AboutClient />
    </>
  );
}
