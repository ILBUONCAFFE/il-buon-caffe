"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { ApiError, fetchApi } from "@/lib/api";
import { containerVariants, itemVariants } from "./animations";
import { InputField } from "./InputField";
import { Checkbox } from "./Checkbox";
import { PrimaryButton } from "./PrimaryButton";
import { FormAlert } from "./FormAlert";

export function LoginForm({ onToggleMode }: { onToggleMode: () => void }) {
  const router = useRouter();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRemember, setLoginRemember] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginFieldErrors, setLoginFieldErrors] = useState<Record<string, string>>({});

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginFieldErrors({});
    setLoginError("");

    let hasErrors = false;
    const errors: Record<string, string> = {};

    if (!loginEmail) {
      errors.email = "Adres email jest wymagany";
      hasErrors = true;
    } else if (!/^\S+@\S+\.\S+$/.test(loginEmail)) {
      errors.email = "Podaj poprawny adres email";
      hasErrors = true;
    }

    if (!loginPassword) {
      errors.password = "Hasło jest wymagane";
      hasErrors = true;
    }

    if (hasErrors) {
      setLoginFieldErrors(errors);
      const firstId = errors.email ? "email-signin" : "password-signin";
      requestAnimationFrame(() => document.getElementById(firstId)?.focus());
      return;
    }

    setLoginLoading(true);

    try {
      await fetchApi("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          rememberMe: loginRemember,
        }),
      });
      router.refresh();
      router.push("/account");
    } catch (err: any) {
      if (err instanceof ApiError) {
        setLoginError(err.message);
      } else {
        setLoginError("Błąd logowania. Spróbuj ponownie.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <motion.div
      key="login-form"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="w-full flex flex-col"
    >
      {/* Heading */}
      <motion.div variants={itemVariants} className="mb-5 text-center">
        <h2 className="text-3xl sm:text-4xl font-serif text-white mb-2 tracking-tight leading-[1.1]">
          Witaj{" "}
          <span className="text-brand-400 italic">Ponownie</span>
        </h2>
        <p className="text-white/50 text-[14px] leading-relaxed max-w-xs mx-auto">
          Zaloguj się, aby kontynuować podróż po świecie najlepszej kawy.
        </p>
      </motion.div>

      <form className="w-full flex flex-col" onSubmit={handleLoginSubmit} noValidate>
        <AnimatePresence>
          {loginError && <FormAlert message={loginError} key="login-error" />}
        </AnimatePresence>

        <InputField
          id="email-signin"
          name="email"
          type="email"
          placeholder="Adres email"
          icon={Mail}
          value={loginEmail}
          onChange={(e) => {
            setLoginEmail(e.target.value);
            if (loginFieldErrors.email) setLoginFieldErrors((prev) => ({ ...prev, email: "" }));
          }}
          autoComplete="email"
          required
          disabled={loginLoading}
          error={loginFieldErrors.email}
        />
        <InputField
          id="password-signin"
          name="password"
          type="password"
          placeholder="Hasło"
          icon={Lock}
          value={loginPassword}
          onChange={(e) => {
            setLoginPassword(e.target.value);
            if (loginFieldErrors.password) setLoginFieldErrors((prev) => ({ ...prev, password: "" }));
          }}
          autoComplete="current-password"
          required
          disabled={loginLoading}
          error={loginFieldErrors.password}
        />

        <motion.div
          variants={itemVariants}
          className="w-full mt-1 mb-4 flex items-center justify-between"
        >
          <Checkbox
            checked={loginRemember}
            onChange={setLoginRemember}
            disabled={loginLoading}
          >
            Zapamiętaj mnie
          </Checkbox>
          <a
            href="#"
            className="text-[13px] text-white/40 hover:text-brand-400 font-medium transition-colors duration-300"
          >
            Zapomniałeś hasła?
          </a>
        </motion.div>

        <motion.div variants={itemVariants} className="w-full mt-6">
          <PrimaryButton type="submit" isLoading={loginLoading} disabled={loginLoading}>
            Zaloguj Się
          </PrimaryButton>
        </motion.div>
      </form>
    </motion.div>
  );
}
