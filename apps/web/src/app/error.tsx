"use client";

import React, { useEffect } from "react";
import Link from "next/link";

/**
 * Global Error Boundary — catches unhandled errors during SSR and client rendering.
 * Prevents bare "Internal Server Error" from Cloudflare Workers by providing
 * a graceful fallback UI.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col items-center justify-center px-6 text-center gap-6">
      <div className="text-6xl">☕</div>
      <h1 className="text-2xl md:text-3xl font-serif text-brand-900">
        Coś poszło nie tak
      </h1>
      <p className="text-brand-700 max-w-md leading-relaxed">
        Przepraszamy za utrudnienia. Spróbuj odświeżyć stronę lub wróć do
        sklepu.
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
