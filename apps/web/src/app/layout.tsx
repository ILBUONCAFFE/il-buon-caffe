import type { Metadata } from "next";
import { Playfair_Display, Lato, Pinyon_Script } from "next/font/google";
import "./globals.css";
import { Shell } from "@/components/layout/Shell";
import SmoothScroll from "@/components/SmoothScroll";

const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-playfair', display: 'swap' });
const lato = Lato({ subsets: ["latin"], weight: ['100', '300', '400', '700', '900'], variable: '--font-lato', display: 'swap' });
const pinyon = Pinyon_Script({ weight: ['400'], subsets: ["latin"], variable: '--font-pinyon', display: 'swap' });

export const metadata: Metadata = {
  title: {
    template: "%s | Il Buon Caffe",
    default: "Il Buon Caffe | Luksusowe Delikatesy Online",
  },
  description: "Luksusowe delikatesy online: wyselekcjonowana kawa, wina z najlepszych winnic i tradycyjne włoskie słodycze. Poczuj smak prawdziwego dolce vita.",
  metadataBase: new URL("https://ilbuoncaffe.pl"),
  alternates: {
    canonical: "/",
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
    title: "Il Buon Caffe | Luksusowe Delikatesy Online",
    description: "Luksusowe delikatesy online: wyselekcjonowana kawa, wina i włoskie słodycze.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Il Buon Caffe | Luksusowe Delikatesy Online",
    description: "Luksusowe delikatesy online: wyselekcjonowana kawa, wina i włoskie słodycze.",
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
      <body className={`${lato.variable} ${playfair.variable} ${pinyon.variable} font-sans antialiased`} suppressHydrationWarning>
        <SmoothScroll>
          <Shell>
            {children}
          </Shell>
        </SmoothScroll>
      </body>
    </html>
  );
}
