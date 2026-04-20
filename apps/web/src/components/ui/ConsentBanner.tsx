"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

type ConsentValue = "granted" | "denied";

type ConsentPayload = {
  ad_storage: ConsentValue;
  ad_user_data: ConsentValue;
  ad_personalization: ConsentValue;
  analytics_storage: ConsentValue;
  functionality_storage: ConsentValue;
  personalization_storage: ConsentValue;
  security_storage: ConsentValue;
};

type ConsentSettings = {
  analytics: boolean;
  marketing: boolean;
};

type StoredConsent = {
  version: 2;
  analytics: boolean;
  marketing: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const CONSENT_STORAGE_KEY = "ibc-consent-v2";
const CONSENT_COOKIE_KEY = "ibc_consent";
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

// ─── Consent logic ───────────────────────────────────────────────────────────

function buildPayload(settings: ConsentSettings): ConsentPayload {
  return {
    ad_storage: settings.marketing ? "granted" : "denied",
    ad_user_data: settings.marketing ? "granted" : "denied",
    ad_personalization: settings.marketing ? "granted" : "denied",
    analytics_storage: settings.analytics ? "granted" : "denied",
    functionality_storage: "granted",
    personalization_storage: settings.marketing ? "granted" : "denied",
    security_storage: "granted",
  };
}

function applyConsent(settings: ConsentSettings) {
  const globalWindow = window as Window & {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  };

  globalWindow.dataLayer = globalWindow.dataLayer || [];
  globalWindow.gtag =
    globalWindow.gtag ||
    function gtag() {
      globalWindow.dataLayer?.push(arguments);
    };

  globalWindow.gtag("consent", "update", buildPayload(settings));
}

function broadcastConsent(settings: ConsentSettings) {
  try {
    window.dispatchEvent(
      new CustomEvent("ibc:consent-updated", {
        detail: settings,
      })
    );
  } catch {
    // ignore event dispatch errors in restricted environments
  }
}

function readStoredConsent(): StoredConsent | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return readCookieConsent();
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "version" in parsed &&
      (parsed as StoredConsent).version === 2
    ) {
      return parsed as StoredConsent;
    }
  } catch {
    // ignore
  }
  return readCookieConsent();
}

function readCookieConsent(): StoredConsent | null {
  const prefix = `${CONSENT_COOKIE_KEY}=`;
  const raw = document.cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(prefix));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(
      decodeURIComponent(raw.slice(prefix.length))
    ) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "version" in parsed &&
      (parsed as StoredConsent).version === 2
    ) {
      return parsed as StoredConsent;
    }
  } catch {
    // ignore legacy v1 cookie
  }
  return null;
}

function persistConsent(settings: ConsentSettings) {
  const stored: StoredConsent = { version: 2, ...settings };
  const json = JSON.stringify(stored);

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, json);
  } catch {
    // private mode — session-only
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE_KEY}=${encodeURIComponent(json)}; Max-Age=${ONE_YEAR_IN_SECONDS}; Path=/; SameSite=Lax${secure}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({
  enabled,
  locked,
  onChange,
}: {
  enabled: boolean;
  locked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={locked}
      onClick={() => !locked && onChange?.(!enabled)}
      className={[
        "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2",
        locked
          ? "cursor-not-allowed bg-brand-300"
          : enabled
            ? "cursor-pointer bg-brand-900"
            : "cursor-pointer bg-brand-200",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200",
          enabled ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

type Category = {
  id: keyof ConsentSettings;
  label: string;
  description: string;
  examples: string;
};

const CATEGORIES: Category[] = [
  {
    id: "analytics",
    label: "Analityczne",
    description:
      "Pomagają nam zrozumieć, jak odwiedzasz nasz sklep — które strony są popularne i jak poruszasz się po witrynie.",
    examples: "Google Analytics 4",
  },
  {
    id: "marketing",
    label: "Marketingowe",
    description:
      "Umożliwiają wyświetlanie spersonalizowanych reklam dopasowanych do Twoich zainteresowań w serwisach zewnętrznych.",
    examples: "Google Ads, remarketing",
  },
];

// ─── Settings panel ───────────────────────────────────────────────────────────

function SettingsPanel({
  initial,
  onSave,
  onClose,
}: {
  initial: ConsentSettings;
  onSave: (s: ConsentSettings) => void;
  onClose: () => void;
}) {
  const [settings, setSettings] = useState<ConsentSettings>(initial);

  const toggle = (id: keyof ConsentSettings) =>
    setSettings((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <motion.div
      key="settings"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-brand-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Ustawienia prywatności"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-100 px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500">
              Il Buon Caffe
            </p>
            <h2 className="mt-0.5 text-base font-semibold text-brand-950">
              Ustawienia prywatności
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="rounded-lg p-1.5 text-brand-400 transition hover:bg-brand-50 hover:text-brand-700"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
          <p className="text-sm text-brand-600 mb-4">
            Zarządzaj swoimi preferencjami dotyczącymi plików cookies. Pamiętaj, że zablokowanie niektórych rodzajów cookies może wpłynąć na wygodę korzystania z naszej strony.
          </p>

          {/* Necessary — always on */}
          <div className="flex items-start justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-950">Niezbędne</p>
              <p className="mt-1 text-xs leading-relaxed text-brand-600">
                Wymagane do prawidłowego działania sklepu: sesja, koszyk,
                bezpieczeństwo. Nie można ich wyłączyć.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 pt-0.5">
              <Toggle enabled locked />
              <span className="text-[10px] font-medium uppercase tracking-wider text-brand-500">
                zawsze włączone
              </span>
            </div>
          </div>

          {/* Optional categories */}
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="flex items-start justify-between gap-4 rounded-xl border border-brand-200 p-4 transition-colors hover:border-brand-300"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-950">
                  {cat.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-brand-600">
                  {cat.description}
                </p>
                <p className="mt-2 text-[11px] text-brand-500 font-medium">
                  Przykłady: {cat.examples}
                </p>
              </div>
              <div className="flex-shrink-0 pt-0.5">
                <Toggle
                  enabled={settings[cat.id]}
                  onChange={() => toggle(cat.id)}
                />
              </div>
            </div>
          ))}

          {/* Legal links */}
          <div className="pt-2 px-1 text-xs text-brand-500">
            Więcej informacji znajdziesz w naszej{" "}
            <Link
              href="/polityka-prywatnosci"
              className="font-medium text-brand-700 underline underline-offset-2 transition hover:text-brand-950"
            >
              Polityce prywatności
            </Link>{" "}
            oraz{" "}
            <Link
              href="/polityka-cookies"
              className="font-medium text-brand-700 underline underline-offset-2 transition hover:text-brand-950"
            >
              Polityce cookies
            </Link>.
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-3 border-t border-brand-100 bg-brand-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => onSave({ analytics: false, marketing: false })}
            className="w-full sm:w-auto rounded-xl border border-brand-300 bg-white px-4 py-2.5 text-sm font-medium text-brand-700 shadow-sm transition hover:bg-brand-50 hover:text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Odrzuć opcjonalne
          </button>
          <button
            type="button"
            onClick={() => onSave(settings)}
            className="w-full sm:w-auto rounded-xl border border-brand-300 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 shadow-sm transition hover:bg-brand-50 hover:text-brand-950 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Zapisz wybrane
          </button>
          <button
            type="button"
            onClick={() => onSave({ analytics: true, marketing: true })}
            className="w-full sm:w-auto rounded-xl bg-brand-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:ring-offset-2"
          >
            Akceptuj wszystkie
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main banner ─────────────────────────────────────────────────────────────

export function ConsentBanner() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (pathname.startsWith("/admin")) {
      setIsVisible(false);
      return;
    }

    const stored = readStoredConsent();
    if (stored) {
      const settings = { analytics: stored.analytics, marketing: stored.marketing };
      applyConsent(settings);
      broadcastConsent(settings);
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
  }, [isMounted, pathname]);

  const handleAccept = (settings: ConsentSettings) => {
    persistConsent(settings);
    applyConsent(settings);
    broadcastConsent(settings);
    setIsVisible(false);
    setShowSettings(false);
  };

  if (!isMounted) return null;

  return (
    <AnimatePresence>
      {isVisible && !showSettings && (
        <motion.aside
          key="banner"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          role="dialog"
          aria-live="polite"
          aria-label="Zgoda na pliki cookies"
          className="fixed bottom-4 left-1/2 z-[90] w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border border-brand-200 bg-white/97 shadow-2xl backdrop-blur-md"
        >
          {/* Thin brand accent line */}
          <div className="h-0.5 w-full bg-gradient-to-r from-brand-300 via-brand-700 to-brand-300" />

          <div className="p-5">
            {/* Title + description */}
            <div className="mb-4">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-500">
                  Il Buon Caffe
                </span>
                <span className="text-brand-200">·</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-700">
                  Prywatność
                </span>
              </div>
              <p className="text-sm leading-relaxed text-brand-800">
                Używamy plików cookies do prawidłowego działania sklepu oraz
                analizy ruchu. Możesz zaakceptować wszystkie lub dostosować
                ustawienia.{" "}
                <Link
                  href="/polityka-prywatnosci"
                  className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-950"
                >
                  Polityka prywatności
                </Link>
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="rounded-xl bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-100 hover:text-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                Ustawienia
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() =>
                  handleAccept({ analytics: false, marketing: false })
                }
                className="rounded-xl border border-brand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 shadow-sm transition hover:bg-brand-50 hover:text-brand-950 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                Tylko niezbędne
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAccept({ analytics: true, marketing: true })
                }
                className="rounded-xl bg-brand-950 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-900 focus:ring-offset-2"
              >
                Akceptuj wszystko
              </button>
            </div>
          </div>
        </motion.aside>
      )}

      {isVisible && showSettings && (
        <SettingsPanel
          initial={{ analytics: false, marketing: false }}
          onSave={handleAccept}
          onClose={() => setShowSettings(false)}
        />
      )}
    </AnimatePresence>
  );
}
