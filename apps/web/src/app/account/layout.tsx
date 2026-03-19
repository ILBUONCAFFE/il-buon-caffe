import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moje Konto | Il Buon Caffe",
  description: "Zarządzaj kontem, przeglądaj zamówienia i eksportuj dane w Il Buon Caffe.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
