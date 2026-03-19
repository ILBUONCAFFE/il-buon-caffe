import type { Metadata } from "next";
import React, { Suspense } from "react";
import { AuthForms } from "@/components/Auth/AuthForms";

export const metadata: Metadata = {
  title: "Logowanie i Rejestracja | Il Buon Caffe",
  description: "Zaloguj się lub stwórz konto w Il Buon Caffe. Uzyskaj dostęp do historii zamówień, listy życzeń i ekskluzywnych ofert.",
  robots: {
    index: false,
    follow: true,
  },
  openGraph: {
    title: "Logowanie | Il Buon Caffe",
    description: "Zaloguj się do swojego konta w Il Buon Caffe.",
    type: "website",
    locale: "pl_PL",
  },
};

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-brand-950" />}>
      <AuthForms />
    </Suspense>
  );
}

