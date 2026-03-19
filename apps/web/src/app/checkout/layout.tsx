import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zamówienie | Il Buon Caffe",
  description: "Dokończ zamówienie w Il Buon Caffe. Bezpieczna płatność, szybka dostawa w całej Polsce.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
