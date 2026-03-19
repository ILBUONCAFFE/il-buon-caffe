import type { Metadata } from "next";
import CafeClient from "@/components/Cafe/CafeClient";

export const metadata: Metadata = {
  title: "Kawiarnia | Il Buon Caffe",
  description: "Zapraszamy do naszej kawiarni. Serwujemy mistrzowskie espresso, cappuccino i domowe wypieki w atmosferze włoskiego dolce far niente.",
  openGraph: {
    title: "Kawiarnia | Il Buon Caffe",
    description: "Mistrzowskie espresso, cappuccino i domowe wypieki we włoskiej atmosferze.",
    type: "website",
    locale: "pl_PL",
  },
  alternates: {
    canonical: "/kawiarnia",
  },
};

export default function CafePage() {
  return <CafeClient />;
}
