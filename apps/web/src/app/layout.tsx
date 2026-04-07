import type { Metadata } from "next";
import { Playfair_Display, Lato, Pinyon_Script } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Shell } from "@/components/layout/Shell";
import SmoothScroll from "@/components/SmoothScroll";
import ChunkLoadRecovery from "@/components/ChunkLoadRecovery";

const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-playfair', display: 'swap' });
const lato = Lato({ subsets: ["latin"], weight: ['100', '300', '400', '700', '900'], variable: '--font-lato', display: 'swap' });
const pinyon = Pinyon_Script({ weight: ['400'], subsets: ["latin"], variable: '--font-pinyon', display: 'swap' });

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Il Buon Caffe",
  url: "https://ilbuoncaffe.pl",
  logo: {
    "@type": "ImageObject",
    url: "https://ilbuoncaffe.pl/assets/logo.png",
  },
};

export const metadata: Metadata = {
  title: "Il Buon Caffe | Luksusowe Delikatesy Online",
  description: "Luksusowe delikatesy online: wyselekcjonowana kawa, wina z najlepszych winnic i tradycyjne włoskie słodycze. Poczuj smak prawdziwego dolce vita.",
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
    title: "Il Buon Caffe | Luksusowe Delikatesy Online",
    description: "Luksusowe delikatesy online: wyselekcjonowana kawa, wina i włoskie słodycze.",
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
    title: "Il Buon Caffe | Luksusowe Delikatesy Online",
    description: "Luksusowe delikatesy online: wyselekcjonowana kawa, wina i włoskie słodycze.",
    images: ["/assets/logo.png"],
  },
  keywords: [
    "kawa ziarnista", "wino włoskie", "wino hiszpańskie", "delikatesy",
    "słodycze włoskie", "oliwa z oliwek", "sklep z kawą", "Il Buon Caffe",
    "kawa specialty", "espresso", "cappuccino", "kawiarnia"
  ],
  authors: [{ name: "Il Buon Caffe" }],
  creator: "Il Buon Caffe",
  publisher: "Il Buon Caffe",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <Script id="gtm" strategy="beforeInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PQJ24P8L');`}</Script>
      </head>
      <body className={`${lato.variable} ${playfair.variable} ${pinyon.variable} font-sans antialiased`} suppressHydrationWarning>
        <noscript>
          <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PQJ24P8L" height="0" width="0" style={{ display: "none", visibility: "hidden" }} />
        </noscript>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
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
