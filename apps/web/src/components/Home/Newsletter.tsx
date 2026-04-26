"use client";

import React, { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { Mail, Send, CheckCircle2, AlertCircle, Coffee } from "lucide-react";

type FormState = "idle" | "loading" | "success" | "error";

export const Newsletter = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

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
        setErrorMsg(data.error ?? "Coś poszło nie tak. Spróbuj ponownie.");
        setFormState("error");
      }
    } catch {
      setErrorMsg("Błąd połączenia. Sprawdź internet i spróbuj ponownie.");
      setFormState("error");
    }
  };

  const perks = [
    "Exkluzywne przepisy i tajniki włoskiej kuchni",
    "Pierwsze informacje o nowych produktach i promocjach",
    "Zaproszenia na degustacje i wydarzenia specjalne",
  ];

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden bg-[#faf7f4] dark:bg-brand-950"
    >
      {/* Decorative background blobs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-brand-200/30 dark:bg-brand-800/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-brand-300/20 dark:bg-brand-700/10 blur-3xl" />
      </div>

      {/* Decorative coffee beans pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06]" aria-hidden>
        {Array.from({ length: 12 }).map((_, i) => (
          <Coffee
            key={i}
            className="absolute text-brand-900 dark:text-brand-300"
            style={{
              width: `${20 + (i % 4) * 10}px`,
              left: `${(i * 8.3) % 100}%`,
              top: `${(i * 13 + 5) % 100}%`,
              transform: `rotate(${i * 37}deg)`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left – Copy */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-800/50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-brand-600 dark:text-brand-300" />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600 dark:text-brand-400">
                  Newsletter
                </span>
              </div>

              <h2 className="text-4xl md:text-5xl font-serif text-brand-900 dark:text-white leading-tight mb-5">
                Smakuj{" "}
                <span className="italic text-brand-600 dark:text-brand-300">
                  Włochy
                </span>{" "}
                <br />
                prosto na skrzynce
              </h2>

              <p className="text-brand-700/80 dark:text-white/60 text-lg leading-relaxed mb-8 max-w-md">
                Dołącz do społeczności miłośników włoskiej kultury stołu.
                Wysyłamy tylko to, co warto przeczytać — bez spamu.
              </p>

              {/* Perks list */}
              <ul className="space-y-3">
                {perks.map((perk, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{
                      duration: 0.5,
                      delay: 0.2 + i * 0.1,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex items-start gap-3 text-brand-700 dark:text-white/70 text-sm"
                  >
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-brand-500/15 dark:bg-brand-400/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                    </span>
                    {perk}
                  </motion.li>
                ))}
              </ul>

              <p className="mt-8 text-xs text-brand-500 dark:text-white/30">
                Zapisując się, akceptujesz{" "}
                <a
                  href="/polityka-prywatnosci"
                  className="underline underline-offset-2 hover:text-brand-700 dark:hover:text-white/60 transition-colors"
                >
                  politykę prywatności
                </a>
                . Wypis w każdej chwili.
              </p>
            </motion.div>

            {/* Right – Form card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="relative rounded-3xl bg-white dark:bg-brand-900/50 border border-brand-100 dark:border-white/8 shadow-xl shadow-brand-900/5 dark:shadow-black/30 p-8 md:p-10 overflow-hidden">

                {/* Card top accent line */}
                <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-brand-400/40 to-transparent" />

                {/* Success state */}
                {formState === "success" ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center text-center py-6"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-6">
                      <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-serif text-brand-900 dark:text-white mb-3">
                      Benvenuto!
                    </h3>
                    <p className="text-brand-600 dark:text-white/60 text-sm leading-relaxed max-w-xs">
                      Świetnie, że dołączasz! Sprawdź swoją skrzynkę —
                      wyślemy Ci wiadomość powitalną z niespodzianką. ☕
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    <div>
                      <label
                        htmlFor="newsletter-name"
                        className="block text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-white/50 mb-2"
                      >
                        Imię <span className="font-normal normal-case tracking-normal text-brand-400 dark:text-white/30">(opcjonalnie)</span>
                      </label>
                      <input
                        id="newsletter-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="np. Maria"
                        autoComplete="given-name"
                        disabled={formState === "loading"}
                        className="w-full px-4 py-3.5 rounded-xl bg-brand-50 dark:bg-brand-800/50 border border-brand-100 dark:border-white/10 text-brand-900 dark:text-white placeholder-brand-400 dark:placeholder-white/25 text-sm outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-300 dark:focus:border-brand-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="newsletter-email"
                        className="block text-xs font-semibold uppercase tracking-wider text-brand-700 dark:text-white/50 mb-2"
                      >
                        Adres e-mail <span className="text-brand-500">*</span>
                      </label>
                      <input
                        id="newsletter-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (formState === "error") setFormState("idle");
                        }}
                        placeholder="twoj@email.pl"
                        autoComplete="email"
                        required
                        disabled={formState === "loading"}
                        className="w-full px-4 py-3.5 rounded-xl bg-brand-50 dark:bg-brand-800/50 border border-brand-100 dark:border-white/10 text-brand-900 dark:text-white placeholder-brand-400 dark:placeholder-white/25 text-sm outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-300 dark:focus:border-brand-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Error message */}
                    {formState === "error" && errorMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-500/20"
                      >
                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={formState === "loading" || !email.trim()}
                      id="newsletter-submit-btn"
                      className="group relative w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-brand-900 dark:bg-brand-100 text-white dark:text-brand-900 font-bold text-sm uppercase tracking-widest overflow-hidden transition-all hover:bg-brand-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {/* Shimmer on hover */}
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                      {formState === "loading" ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          <span>Zapisuję…</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                          <span>Zapisz się</span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Card bottom accent */}
                <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-brand-200/30 dark:via-white/5 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
