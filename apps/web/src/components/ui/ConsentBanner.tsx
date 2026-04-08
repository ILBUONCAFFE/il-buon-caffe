"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type ConsentChoice = "all" | "analytics" | "necessary";
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

const CONSENT_STORAGE_KEY = "ibc-consent-v1";
const CONSENT_COOKIE_KEY = "ibc_consent";
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const CONSENT_BY_CHOICE: Record<ConsentChoice, ConsentPayload> = {
  all: {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
    analytics_storage: "granted",
    functionality_storage: "granted",
    personalization_storage: "granted",
    security_storage: "granted",
  },
  analytics: {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
    functionality_storage: "granted",
    personalization_storage: "denied",
    security_storage: "granted",
  },
  necessary: {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    personalization_storage: "denied",
    security_storage: "granted",
  },
};

function isConsentChoice(value: string | null): value is ConsentChoice {
  return value === "all" || value === "analytics" || value === "necessary";
}

function applyConsent(choice: ConsentChoice) {
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

  globalWindow.gtag("consent", "update", CONSENT_BY_CHOICE[choice]);
}

function readCookieConsent(): ConsentChoice | null {
  const prefix = `${CONSENT_COOKIE_KEY}=`;
  const consentCookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!consentCookie) return null;

  const cookieValue = decodeURIComponent(consentCookie.slice(prefix.length));
  return isConsentChoice(cookieValue) ? cookieValue : null;
}

function readStoredConsent(): ConsentChoice | null {
  try {
    const rawValue = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (isConsentChoice(rawValue)) {
      return rawValue;
    }
  } catch (_err) {
    // Ignore storage read failures and fallback to cookie.
  }

  return readCookieConsent();
}

function persistConsent(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch (_err) {
    // Storage can fail in private mode; consent update still works for current session.
  }

  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE_KEY}=${encodeURIComponent(choice)}; Max-Age=${ONE_YEAR_IN_SECONDS}; Path=/; SameSite=Lax${secureFlag}`;
}

export function ConsentBanner() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (pathname.startsWith("/admin")) {
      setIsVisible(false);
      return;
    }

    const storedChoice = readStoredConsent();

    if (storedChoice) {
      applyConsent(storedChoice);
      setIsVisible(false);
      return;
    }

    setIsVisible(true);
  }, [isMounted, pathname]);

  const handleConsentChoice = (choice: ConsentChoice) => {
    persistConsent(choice);
    applyConsent(choice);
    setIsVisible(false);
  };

  if (!isMounted || !isVisible) return null;

  return (
    <aside
      role="dialog"
      aria-live="polite"
      aria-label="Zgoda na pliki cookies"
      className="fixed bottom-4 left-1/2 z-[90] w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 rounded-2xl border border-brand-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md md:p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
              Ustawienia prywatności
          </p>
          <p className="text-sm leading-relaxed text-brand-900 md:text-[15px]">
              Korzystamy z plików cookies do niezbędnego działania sklepu oraz analityki. Możesz
              zaakceptować wszystkie cele, włączyć tylko analitykę lub pozostać przy niezbędnych.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={() => handleConsentChoice("necessary")}
            className="rounded-xl border border-brand-300 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-500 hover:text-brand-900"
          >
              Tylko niezbędne
          </button>
          <button
            type="button"
            onClick={() => handleConsentChoice("analytics")}
            className="rounded-xl border border-brand-900/20 bg-brand-100 px-4 py-2 text-sm font-semibold text-brand-900 transition hover:bg-brand-200"
          >
            Tylko analityczne
          </button>
          <button
            type="button"
            onClick={() => handleConsentChoice("all")}
            className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
              Akceptuję wszystko
          </button>
        </div>
      </div>
    </aside>
  );
}
