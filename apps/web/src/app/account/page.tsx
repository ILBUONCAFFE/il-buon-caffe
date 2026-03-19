import type { Metadata } from "next";
import AccountClient from "@/components/Account/AccountClient";

export const metadata: Metadata = {
  title: "Moje Konto | Il Buon Caffe",
  description: "Zarządzaj swoim kontem w Il Buon Caffe. Przeglądaj zamówienia, dane osobowe oraz preferencje.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountPage() {
  return <AccountClient />;
}
