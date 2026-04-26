"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, AlertCircle, Bell } from "lucide-react";

type FormState = "idle" | "loading" | "success" | "error";

/**
 * ShopNotifyBanner
 *
 * Wyświetla banner z formularzem zapisu na powiadomienie o nowościach w sklepie.
 * Zapisuje kontakt do listy Brevo #8 przez /api/notify.
 *
 * Użycie: wstaw gdziekolwiek w ShopClient, np. na dole strony sklepu.
 */
export const ShopNotifyBanner = () => {
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
      const res = await fetch("/api/notify", {
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
    <section className="mt-16 border-t border-brand-200/60">
      <div className="py-14 md:py-20">
        {formState === "success" ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-serif text-xl text-brand-900">Gotowe — powiadomimy Cię!</p>
              <p className="text-sm text-brand-500 mt-1">
                Sprawdź swoją skrzynkę. Wiadomość może trafić do folderu Oferty.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-end">
            {/* Left — label + heading */}
            <div className="lg:col-span-5">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="w-4 h-4 text-brand-400" strokeWidth={1.5} />
                <span className="text-[11px] uppercase tracking-[0.2em] text-brand-400 font-medium">
                  Powiadomienia
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-serif text-brand-900 leading-tight tracking-tight">
                Powiadom mnie<br />
                <span className="italic text-brand-600">o nowościach</span>
              </h2>
              <p className="mt-3 text-sm text-brand-500 max-w-xs leading-relaxed">
                Nowe produkty, dostawy i wyjątkowe rarytasy — jako pierwszy dowiesz się, gdy coś trafi do sklepu.
              </p>
            </div>

            {/* Right — inline form */}
            <div className="lg:col-span-7">
              <form onSubmit={handleSubmit} noValidate>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Imię"
                    disabled={formState === "loading"}
                    aria-label="Imię (opcjonalnie)"
                    className="sm:w-32 px-4 py-3.5 bg-transparent border-b border-brand-300 text-brand-900 placeholder-brand-400 text-sm outline-none focus:border-brand-900 transition-colors disabled:opacity-50"
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
                    className="flex-1 px-4 py-3.5 bg-transparent border-b border-brand-300 text-brand-900 placeholder-brand-400 text-sm outline-none focus:border-brand-900 transition-colors disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={formState === "loading" || !email.trim()}
                    id="shop-notify-submit-btn"
                    className="group inline-flex items-center justify-center gap-3 bg-brand-900 text-white px-7 py-3.5 text-[12px] font-bold uppercase tracking-[0.18em] hover:bg-brand-700 transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {formState === "loading" ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        <span>Zapisuję</span>
                      </>
                    ) : (
                      <>
                        <span>Zapisz mnie</span>
                        <ArrowRight
                          className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1"
                          strokeWidth={2}
                        />
                      </>
                    )}
                  </button>
                </div>

                {/* Error */}
                {formState === "error" && errorMsg && (
                  <div className="flex items-center gap-2 mt-3 text-red-600 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Privacy note */}
                <p className="mt-4 text-[11px] text-brand-400">
                  Zapisując się, akceptujesz{" "}
                  <a
                    href="/polityka-prywatnosci"
                    className="underline underline-offset-2 hover:text-brand-700 transition-colors"
                  >
                    politykę prywatności
                  </a>
                  . Rezygnacja w każdej chwili.
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
