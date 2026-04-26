"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { InView } from "@/components/ui/InView";

type FormState = "idle" | "loading" | "success" | "error";

export const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formState === "loading" || formState === "success") return;

    setFormState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFormState("success");
        setEmail("");
        setName("");
      } else {
        setErrorMsg(data.error ?? "Wystąpił błąd. Spróbuj ponownie.");
        setFormState("error");
      }
    } catch {
      setErrorMsg("Błąd połączenia. Spróbuj ponownie później.");
      setFormState("error");
    }
  };

  return (
    <section className="bg-[#f3eee8] dark:bg-brand-950 py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12">
        {/* Top divider */}
        <InView className="animate-scale-x-left">
          <div className="h-px bg-brand-200 dark:bg-white/8 mb-14 md:mb-20" />
        </InView>

        {formState === "success" ? (
          <InView className="animate-reveal-up">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-5" />
              <h2 className="text-2xl md:text-3xl font-serif text-brand-900 dark:text-white mb-3">
                Dziękujemy za zapis
              </h2>
              <p className="text-brand-500 dark:text-white/40 max-w-sm">
                Sprawdź swoją skrzynkę — wyślemy wiadomość powitalną.
              </p>
            </div>
          </InView>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-end">
            {/* Left — heading */}
            <div className="lg:col-span-5">
              <InView className="animate-reveal-up">
                <span className="block text-[11px] uppercase tracking-[0.2em] text-brand-400 dark:text-white/30 font-medium mb-4">
                  Newsletter
                </span>
                <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-serif text-brand-900 dark:text-white leading-[1.1] tracking-tight">
                  Bądź na bieżąco
                </h2>
              </InView>
            </div>

            {/* Right — form */}
            <div className="lg:col-span-7">
              <InView className="animate-reveal-up" style={{ animationDelay: "100ms" }}>
                <form onSubmit={handleSubmit} noValidate>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Imię"
                      disabled={formState === "loading"}
                      aria-label="Imię (opcjonalnie)"
                      className="sm:w-36 px-4 py-3.5 bg-transparent border-b border-brand-300 dark:border-white/15 text-brand-900 dark:text-white placeholder-brand-400 dark:placeholder-white/25 text-sm outline-none focus:border-brand-900 dark:focus:border-white/50 transition-colors"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (formState === "error") setFormState("idle");
                      }}
                      placeholder="Adres e-mail"
                      required
                      disabled={formState === "loading"}
                      aria-label="Adres e-mail"
                      className="flex-1 px-4 py-3.5 bg-transparent border-b border-brand-300 dark:border-white/15 text-brand-900 dark:text-white placeholder-brand-400 dark:placeholder-white/25 text-sm outline-none focus:border-brand-900 dark:focus:border-white/50 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={formState === "loading" || !email.trim()}
                      id="newsletter-submit-btn"
                      className="group inline-flex items-center justify-center gap-3 bg-brand-900 dark:bg-white text-white dark:text-brand-950 px-7 py-3.5 text-[12px] font-bold uppercase tracking-[0.18em] hover:bg-brand-700 dark:hover:bg-brand-100 transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {formState === "loading" ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          <span>Zapisuję</span>
                        </>
                      ) : (
                        <>
                          <span>Zapisz się</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
                        </>
                      )}
                    </button>
                  </div>

                  {/* Error */}
                  {formState === "error" && errorMsg && (
                    <div className="flex items-center gap-2 mt-4 text-red-600 dark:text-red-400 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Privacy note */}
                  <p className="mt-5 text-[11px] text-brand-400 dark:text-white/25">
                    Zapisując się, akceptujesz{" "}
                    <a
                      href="/polityka-prywatnosci"
                      className="underline underline-offset-2 hover:text-brand-700 dark:hover:text-white/50 transition-colors"
                    >
                      politykę prywatności
                    </a>
                    . Rezygnacja w każdej chwili.
                  </p>
                </form>
              </InView>
            </div>
          </div>
        )}

        {/* Bottom divider */}
        <InView className="animate-scale-x-right">
          <div className="h-px bg-brand-200 dark:bg-white/8 mt-14 md:mt-20" />
        </InView>
      </div>
    </section>
  );
};
