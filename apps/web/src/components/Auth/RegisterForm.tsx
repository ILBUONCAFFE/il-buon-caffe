"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, User, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError, fetchApi } from "@/lib/api";
import { checkEmailAvailability } from "@/actions/auth";
import Link from "next/link";
import { containerVariants, itemVariants } from "./animations";
import { InputField } from "./InputField";
import { Checkbox } from "./Checkbox";
import { PrimaryButton } from "./PrimaryButton";
import { FormAlert } from "./FormAlert";

export function RegisterForm({ onToggleMode }: { onToggleMode: () => void }) {
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirm, setRegisterConfirm] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [registerFieldErrors, setRegisterFieldErrors] = useState<Record<string, string>>({});
  const [registerConsents, setRegisterConsents] = useState({
    terms: false,
    privacy: false,
    marketing: false,
    analytics: false,
  });
  const [emailAvailability, setEmailAvailability] = useState<
    "loading" | "available" | "taken" | "invalid" | null
  >(null);

  // Debounced email check
  useEffect(() => {
    const checkEmail = async () => {
      if (!registerEmail || !registerEmail.includes("@")) {
        setEmailAvailability(null);
        return;
      }
      setEmailAvailability("loading");
      try {
        const { available } = await checkEmailAvailability(registerEmail);
        setEmailAvailability(available ? "available" : "taken");
      } catch {
        setEmailAvailability("invalid");
      }
    };

    const timeout = setTimeout(checkEmail, 500);
    return () => clearTimeout(timeout);
  }, [registerEmail]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterFieldErrors({});
    setRegisterError("");

    let hasErrors = false;
    const errors: Record<string, string> = {};

    if (!registerName || registerName.length < 2) {
      errors.name = "Imię musi mieć co najmniej 2 znaki";
      hasErrors = true;
    }

    if (!registerEmail) {
      errors.email = "Adres email jest wymagany";
      hasErrors = true;
    } else if (!/^\S+@\S+\.\S+$/.test(registerEmail)) {
      errors.email = "Podaj poprawny adres email";
      hasErrors = true;
    }

    const hasMinLen = registerPassword.length >= 12;
    const hasMaxLen = registerPassword.length <= 128;
    const hasUpper = /[A-Z]/.test(registerPassword);
    const hasLower = /[a-z]/.test(registerPassword);
    const hasNumber = /[0-9]/.test(registerPassword);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(registerPassword);

    if (!registerPassword) {
      errors.password = "Hasło jest wymagane";
      hasErrors = true;
    } else if (!hasMinLen) {
      errors.password = "Hasło musi mieć co najmniej 12 znaków";
      hasErrors = true;
    } else if (!hasMaxLen) {
      errors.password = "Hasło nie może przekraczać 128 znaków";
      hasErrors = true;
    } else if (!hasUpper) {
      errors.password = "Hasło musi zawierać co najmniej jedną wielką literę (A–Z)";
      hasErrors = true;
    } else if (!hasLower) {
      errors.password = "Hasło musi zawierać co najmniej jedną małą literę (a–z)";
      hasErrors = true;
    } else if (!hasNumber) {
      errors.password = "Hasło musi zawierać co najmniej jedną cyfrę (0–9)";
      hasErrors = true;
    } else if (!hasSpecial) {
      errors.password = "Hasło musi zawierać co najmniej jeden znak specjalny (!@#$%^&*...)";
      hasErrors = true;
    }

    if (!registerConfirm) {
      errors.confirm = "Potwierdzenie hasła jest wymagane";
      hasErrors = true;
    } else if (registerPassword !== registerConfirm) {
      errors.confirm = "Hasła nie są identyczne";
      hasErrors = true;
    }

    if (!registerConsents.terms) {
      errors.terms = "Zgoda na regulamin jest wymagana";
      hasErrors = true;
    }
    if (!registerConsents.privacy) {
      errors.privacy = "Zgoda na politykę prywatności jest wymagana";
      hasErrors = true;
    }

    if (hasErrors) {
      setRegisterFieldErrors(errors);
      const fieldOrder = [
        errors.name ? "name" : null,
        errors.email ? "email-signup" : null,
        errors.password ? "password-signup" : null,
        errors.confirm ? "password-confirm" : null,
        errors.terms ? "terms-checkbox" : null,
        errors.privacy ? "privacy-checkbox" : null,
      ];
      const firstId = fieldOrder.find(Boolean);
      if (firstId) requestAnimationFrame(() => document.getElementById(firstId)?.focus());
      return;
    }

    if (emailAvailability === "taken") {
      setRegisterError("Ten email jest już zarejestrowany. Przejdź do logowania.");
      return;
    }

    setRegisterLoading(true);
    setRegisterSuccess("");

    try {
      await fetchApi("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: registerName,
          email: registerEmail,
          password: registerPassword,
          consents: registerConsents,
        }),
      });
      setRegisterSuccess("Konto zostało utworzone! Możesz się teraz zalogować.");
      setTimeout(() => onToggleMode(), 2000);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setRegisterError(err.message);
      } else {
        setRegisterError("Błąd rejestracji. Spróbuj ponownie.");
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <motion.div
      key="register-form"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full flex flex-col"
    >
      {/* Heading */}
      <motion.div variants={itemVariants} className="mb-5 text-center">
        <h2 className="text-3xl sm:text-4xl font-serif text-white mb-2 tracking-tight leading-[1.1]">
          Cześć,{" "}
          <span className="text-brand-400 italic">Przyjacielu</span>
        </h2>
        <p className="text-white/50 text-[14px] leading-relaxed max-w-xs mx-auto">
          Stwórz konto, by odkrywać z nami ziarna z najdalszych zakątków świata.
        </p>
      </motion.div>

      <form className="w-full flex flex-col" onSubmit={handleRegisterSubmit} noValidate>
        <AnimatePresence>
          {registerError && <FormAlert message={registerError} key="register-error" />}
          {registerSuccess && (
            <FormAlert message={registerSuccess} tone="success" key="register-success" />
          )}
        </AnimatePresence>

        <InputField
          id="name"
          name="name"
          type="text"
          placeholder="Twoje imię"
          icon={User}
          value={registerName}
          onChange={(e) => {
            setRegisterName(e.target.value);
            if (registerFieldErrors.name) setRegisterFieldErrors((prev) => ({ ...prev, name: "" }));
          }}
          autoComplete="given-name"
          disabled={registerLoading}
          error={registerFieldErrors.name}
        />

        <div className="relative">
          <InputField
            id="email-signup"
            name="email"
            type="email"
            placeholder="Adres email"
            icon={Mail}
            value={registerEmail}
            onChange={(e) => {
              setRegisterEmail(e.target.value);
              if (registerFieldErrors.email) setRegisterFieldErrors((prev) => ({ ...prev, email: "" }));
            }}
            autoComplete="email"
            required
            disabled={registerLoading}
            error={registerFieldErrors.email}
          />
          <div className="absolute top-1/2 -translate-y-1/2 right-4 pointer-events-none">
            {emailAvailability === "loading" && <Loader2 className="w-4 h-4 text-white/40 animate-spin" />}
            {emailAvailability === "available" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {emailAvailability === "taken" && <XCircle className="w-4 h-4 text-red-500" />}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-1/2">
            <InputField
              id="password-signup"
              name="password"
              type="password"
              placeholder="Hasło"
              icon={Lock}
              value={registerPassword}
              onChange={(e) => {
                setRegisterPassword(e.target.value);
                if (registerFieldErrors.password) setRegisterFieldErrors((prev) => ({ ...prev, password: "" }));
              }}
              autoComplete="new-password"
              required
              disabled={registerLoading}
              error={registerFieldErrors.password}
              maxLength={128}
            />
          </div>
          <div className="w-full sm:w-1/2">
            <InputField
              id="password-confirm"
              name="confirm"
              type="password"
              placeholder="Powtórz hasło"
              icon={Lock}
              value={registerConfirm}
              onChange={(e) => {
                setRegisterConfirm(e.target.value);
                if (registerFieldErrors.confirm) setRegisterFieldErrors((prev) => ({ ...prev, confirm: "" }));
              }}
              autoComplete="new-password"
              required
              disabled={registerLoading}
              error={registerFieldErrors.confirm}
              maxLength={128}
            />
          </div>
        </div>

        {/* Password Strength Indicator */}
        <motion.div
          variants={itemVariants}
          className="mb-4 mt-1 px-1 flex flex-wrap gap-x-4 gap-y-1"
          role="list"
          aria-label="Wymagania hasła"
        >
          {[
            { met: registerPassword.length >= 12 && registerPassword.length <= 128, label: "12–128 znaków" },
            { met: /[A-Z]/.test(registerPassword), label: "Wielka litera" },
            { met: /[a-z]/.test(registerPassword), label: "Mała litera" },
            { met: /[0-9]/.test(registerPassword), label: "Cyfra" },
            { met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(registerPassword), label: "Znak specjalny" },
          ].map(({ met, label }) => (
            <div key={label} role="listitem" className="flex items-center gap-1.5">
              <div
                aria-hidden="true"
                className={cn("w-1.5 h-1.5 rounded-full transition-colors", met ? "bg-emerald-400" : "bg-white/20")}
              />
              <span className={cn("text-[11px] transition-colors", met ? "text-emerald-400" : "text-white/40")}>
                <span className="sr-only">{met ? "Spełnione: " : "Niespełnione: "}</span>
                {label}
              </span>
            </div>
          ))}
        </motion.div>

        <div className="mt-2 space-y-1">
          <Checkbox
            id="terms-checkbox"
            checked={registerConsents.terms}
            onChange={(c) => {
              setRegisterConsents({ ...registerConsents, terms: c });
              if (registerFieldErrors.terms) setRegisterFieldErrors((prev) => ({ ...prev, terms: "" }));
            }}
            disabled={registerLoading}
            error={!!registerFieldErrors.terms}
            errorMessage={registerFieldErrors.terms}
            required
          >
            Akceptuję <Link href="/regulamin" className="text-white hover:text-brand-400 underline decoration-white/30 underline-offset-2">regulamin sklepu</Link> *
          </Checkbox>
          <Checkbox
            id="privacy-checkbox"
            checked={registerConsents.privacy}
            onChange={(c) => {
              setRegisterConsents({ ...registerConsents, privacy: c });
              if (registerFieldErrors.privacy) setRegisterFieldErrors((prev) => ({ ...prev, privacy: "" }));
            }}
            disabled={registerLoading}
            error={!!registerFieldErrors.privacy}
            errorMessage={registerFieldErrors.privacy}
            required
          >
            Akceptuję <Link href="/polityka-prywatnosci" className="text-white hover:text-brand-400 underline decoration-white/30 underline-offset-2">politykę prywatności</Link> *
          </Checkbox>
        </div>

        <motion.div variants={itemVariants} className="w-full mt-6">
          <PrimaryButton type="submit" isLoading={registerLoading} disabled={registerLoading}>
            Dołącz Do Nas
          </PrimaryButton>
        </motion.div>
      </form>
    </motion.div>
  );
}
