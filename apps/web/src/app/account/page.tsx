import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ACCOUNTS_ENABLED } from "@/config/launch";
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
  if (!ACCOUNTS_ENABLED) {
    redirect("/auth");
  }

  return <AccountClient />;
}
