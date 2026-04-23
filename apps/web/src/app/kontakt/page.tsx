import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Clock, Phone, Mail, ExternalLink, Instagram, Facebook } from "lucide-react";

const BASE_URL = "https://ilbuoncaffe.pl";

export const metadata: Metadata = {
  title: "Kontakt | Il Buon Caffe – Kawiarnia i Sklep w Koszalinie",
  description:
    "Skontaktuj się z kawiarniią Il Buon Caffe w Koszalinie. Adres: ul. Biskupa Czesława Domina 3/6. Telefon: +48 664 937 937. Email: kontakt@ilbuoncaffe.pl. Godziny otwarcia: Pn–Pt 09:00–16:00, Sb 11:00–14:00.",
  keywords: [
    "Il Buon Caffe kontakt", "kawiarnia Koszalin adres", "Il Buon Caffe adres",
    "kawiarnia ul. Biskupa Domina Koszalin", "kontakt Il Buon Caffe telefon",
    "godziny otwarcia kawiarnia Koszalin", "kawiarnia 75-065 Koszalin",
    "sklep włoski Koszalin kontakt",
  ],
  alternates: { canonical: "/kontakt" },
  openGraph: {
    title: "Kontakt | Il Buon Caffe",
    description:
      "Kawiarnia i sklep premium w Koszalinie. Znajdź nas na ul. Biskupa Czesława Domina 3/6 lub napisz na kontakt@ilbuoncaffe.pl.",
    type: "website",
    locale: "pl_PL",
    siteName: "Il Buon Caffe",
    url: `${BASE_URL}/kontakt`,
    images: [
      {
        url: `${BASE_URL}/assets/kawiarnia.jpg`,
        width: 1920,
        height: 998,
        alt: "Il Buon Caffe — kontakt i lokalizacja",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kontakt | Il Buon Caffe",
    description:
      "Kawiarnia i sklep premium w Koszalinie — adres, telefon, godziny otwarcia.",
    images: [`${BASE_URL}/assets/kawiarnia.jpg`],
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "CafeOrCoffeeShop",
  name: "Il Buon Caffe",
  url: BASE_URL,
  logo: { "@type": "ImageObject", url: `${BASE_URL}/assets/logo.png` },
  image: `${BASE_URL}/assets/kawiarnia.jpg`,
  description:
    "Prawdziwa włoska kawiarnia i sklep z delikatesami premium w Koszalinie. Doskonałe espresso, świeżo palona kawa specialty i wyselekcjonowane produkty z Włoch i Hiszpanii.",
  telephone: "+48664937937",
  email: "kontakt@ilbuoncaffe.pl",
  priceRange: "$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: "ul. Biskupa Czesława Domina 3/6",
    addressLocality: "Koszalin",
    postalCode: "75-065",
    addressCountry: "PL",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: "54.1949",
    longitude: "16.1714",
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
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+48664937937",
    email: "kontakt@ilbuoncaffe.pl",
    contactType: "customer service",
    areaServed: "PL",
    availableLanguage: "Polish",
  },
};

const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Il+Buon+Caffe,+ul.+Biskupa+Czes%C5%82awa+Domina+3%2F6,+75-065+Koszalin";

const contactItems = [
  {
    icon: MapPin,
    label: "Adres",
    value: "ul. Biskupa Czesława Domina 3/6\n75-065 Koszalin",
    href: MAPS_URL,
    external: true,
    actionLabel: "Otwórz w Mapach",
  },
  {
    icon: Phone,
    label: "Telefon",
    value: "+48 664 937 937",
    href: "tel:+48664937937",
    external: false,
    actionLabel: null,
  },
  {
    icon: Mail,
    label: "Email",
    value: "kontakt@ilbuoncaffe.pl",
    href: "mailto:kontakt@ilbuoncaffe.pl",
    external: false,
    actionLabel: null,
  },
];

export default function KontaktPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />

      <main className="min-h-screen bg-brand-50">
        {/* Hero */}
        <section className="bg-brand-900 text-white py-24 md:py-32">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50 mb-4">
                Il Buon Caffe
              </p>
              <h1 className="text-4xl md:text-6xl font-serif mb-6 leading-tight">
                Kontakt
              </h1>
              <p className="text-white/70 text-lg leading-relaxed">
                Jesteśmy tu dla Ciebie — przyjedź do kawiarni, zadzwoń lub napisz.
                Chętnie odpowiemy na wszystkie pytania.
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="container mx-auto px-6 lg:px-12 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">

            {/* Contact Details */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-brand-700 mb-8">
                Dane kontaktowe
              </h2>
              <ul className="space-y-6">
                {contactItems.map(({ icon: Icon, label, value, href, external, actionLabel }) => (
                  <li key={label}>
                    <a
                      href={href}
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="group flex items-start gap-4 p-4 rounded-2xl border border-brand-100 bg-white hover:border-brand-300 hover:shadow-sm transition-all"
                    >
                      <span className="mt-0.5 flex-shrink-0 w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center group-hover:bg-brand-200 transition-colors">
                        <Icon className="w-5 h-5 text-brand-700" aria-hidden="true" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs uppercase tracking-wider text-brand-500 mb-1">{label}</p>
                        <p className="text-brand-900 font-medium whitespace-pre-line">{value}</p>
                        {actionLabel && (
                          <span className="inline-flex items-center gap-1 text-sm text-brand-600 group-hover:text-brand-800 mt-1 transition-colors">
                            {actionLabel}
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>

              {/* Social */}
              <div className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-wider text-brand-700 mb-4">
                  Media społecznościowe
                </h2>
                <div className="flex items-center gap-3">
                  <a
                    href="https://www.instagram.com/il_buoncaffe/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram Il Buon Caffe (otwiera nową kartę)"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-brand-200 bg-white text-brand-800 text-sm font-medium hover:bg-brand-900 hover:text-white hover:border-brand-900 transition-all"
                  >
                    <Instagram className="w-4 h-4" aria-hidden="true" />
                    Instagram
                  </a>
                  <a
                    href="https://www.facebook.com/IlBuonCaffeKoszalin"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook Il Buon Caffe (otwiera nową kartę)"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-brand-200 bg-white text-brand-800 text-sm font-medium hover:bg-brand-900 hover:text-white hover:border-brand-900 transition-all"
                  >
                    <Facebook className="w-4 h-4" aria-hidden="true" />
                    Facebook
                  </a>
                </div>
              </div>
            </div>

            {/* Opening Hours + Map cta */}
            <div className="space-y-8">
              {/* Hours */}
              <div className="bg-white rounded-3xl border border-brand-100 p-8">
                <h2 className="text-sm font-bold uppercase tracking-wider text-brand-700 mb-6 flex items-center gap-2">
                  <Clock className="w-4 h-4" aria-hidden="true" />
                  Godziny otwarcia
                </h2>
                <ul className="space-y-3">
                  <li className="flex items-center justify-between">
                    <span className="text-brand-700">Poniedziałek – Piątek</span>
                    <span className="font-semibold text-brand-900">09:00 – 16:00</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-brand-700">Sobota</span>
                    <span className="font-semibold text-brand-900">11:00 – 14:00</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-brand-700">Niedziela</span>
                    <span className="font-medium text-red-600">Nieczynne</span>
                  </li>
                </ul>
              </div>

              {/* Map CTA */}
              <div className="bg-brand-900 rounded-3xl p-8 text-white">
                <h2 className="text-xl font-serif mb-2">Znajdź nas w Koszalinie</h2>
                <p className="text-white/60 text-sm mb-6 leading-relaxed">
                  ul. Biskupa Czesława Domina 3/6<br />
                  75-065 Koszalin
                </p>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-900 rounded-full font-semibold text-sm hover:bg-brand-100 transition-colors"
                >
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  Otwórz w Google Maps
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                </a>
              </div>

              {/* Nav cta */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/kawiarnia"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-brand-900 text-white rounded-full text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  Zobacz kawiarniię
                </Link>
                <Link
                  href="/sklep"
                  className="inline-flex items-center gap-2 px-5 py-3 border border-brand-200 text-brand-800 rounded-full text-sm font-semibold hover:bg-brand-50 transition-colors"
                >
                  Przejdź do sklepu
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
