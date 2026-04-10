"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ProductError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="text-6xl">😕</div>
      <h1 className="text-2xl md:text-3xl font-serif text-brand-900">
        Nie udało się załadować strony
      </h1>
      <p className="text-brand-700 max-w-md leading-relaxed">
        Wystąpił problem podczas ładowania. Spróbuj ponownie lub przejdź do
        listy produktów.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 bg-brand-900 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-brand-700 transition-colors"
        >
          Spróbuj ponownie
        </button>
        <Link
          href="/sklep"
          className="px-6 py-3 border border-brand-300 text-brand-900 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-brand-100 transition-colors"
        >
          Wróć do sklepu
        </Link>
      </div>
    </div>
  );
}
