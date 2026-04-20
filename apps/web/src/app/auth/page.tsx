import type { Metadata } from "next";
import React, { Suspense } from "react";
import { AuthForms } from "@/components/Auth/AuthForms";
import { ACCOUNTS_ENABLED } from "@/config/launch";
import { ComingSoonBanner } from "@/components/ui/ComingSoonBanner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Logowanie i Rejestracja | Il Buon Caffe",
  description: "Zaloguj się lub stwórz konto w Il Buon Caffe. Uzyskaj dostęp do historii zamówień, listy życzeń i ekskluzywnych ofert.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Logowanie | Il Buon Caffe",
    description: "Zaloguj się do swojego konta w Il Buon Caffe.",
    type: "website",
    locale: "pl_PL",
  },
};

export default function AuthPage() {
  if (!ACCOUNTS_ENABLED) {
    return (
      <div className="relative min-h-dvh flex items-center justify-center px-6 py-20 bg-brand-950 overflow-hidden">
        {/* Dekoracyjne okręgi w tle - styl premium dark */}
        <div className="absolute top-[-10%] sm:top-0 right-[-10%] md:right-[10%] w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full bg-brand-600/10 blur-[80px] sm:blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-amber-900/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-lg mb-10">
          <div className="mb-10 text-center">
            <h1 className="text-3xl sm:text-4xl font-serif text-white mb-2 tracking-tight">
              Il Buon Caffe
            </h1>
            <p className="text-brand-400/80 text-sm uppercase tracking-[0.2em] font-semibold">
              Konto Klienta
            </p>
          </div>

          <ComingSoonBanner variant="account" theme="dark" className="!bg-white/5 border-white/10 shadow-2xl backdrop-blur-md" />

          <div className="text-center mt-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-white/5 text-white/90 text-sm font-bold uppercase tracking-widest rounded-full hover:bg-white/10 hover:text-white transition-all backdrop-blur-md border border-white/10 shadow-[0_0_20px_-5px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.1)] group"
            >
              <ArrowLeft size={16} className="text-white/50 group-hover:text-white/80 transition-colors" />
              Wróć na stronę główną
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-dvh bg-brand-950" />}>
      <AuthForms />
    </Suspense>
  );
}
