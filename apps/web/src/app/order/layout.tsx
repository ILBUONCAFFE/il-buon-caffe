import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Potwierdzenie Zamówienia | Il Buon Caffe",
  description: "Dziękujemy za zamówienie w Il Buon Caffe. Szczegóły dostawy i podsumowanie zamówienia.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OrderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
