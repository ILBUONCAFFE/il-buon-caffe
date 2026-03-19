"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, User, Loader2, Eye, EyeOff, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ApiError, fetchApi } from "@/lib/api";
import { checkEmailAvailability } from "@/actions/auth";
import Image from "next/image";
import Link from "next/link";

// ─── Animation Constants ───
const EASE = [0.22, 1, 0.36, 1] as const;
const CONTENT_TRANSITION = { duration: 0.7, ease: EASE };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.3, staggerChildren: 0.04, staggerDirection: -1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: CONTENT_TRANSITION,
  },
  exit: { opacity: 0, y: -10, filter: "blur(4px)", transition: { duration: 0.2 } },
};

// ─── Decorative Separator ───
const Divider = ({ text }: { text: string }) => (
  <motion.div variants={itemVariants} className="flex items-center gap-4 w-full my-3">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    <span className="text-[10px] text-white/40 uppercase tracking-[0.25em] font-medium whitespace-nowrap">
      {text}
    </span>
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
  </motion.div>
);

// ─── Input Component ───
const InputField = ({
  id,
  type,
  placeholder,
  icon: Icon,
  name,
  value,
  onChange,
  autoComplete,
  required,
  disabled,
  error,
  maxLength,
}: {
  id: string;
  type: string;
  placeholder: string;
  icon: any;
  name?: string;
  value?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  maxLength?: number;
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="w-full mb-3 last:mb-0">
      <motion.div variants={itemVariants} className="relative w-full group">
        <div
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 z-10",
            error ? "text-red-400" : "text-white/30 group-focus-within:text-brand-400"
          )}
        >
          <Icon className="w-[17px] h-[17px]" strokeWidth={1.5} />
        </div>
        <input
          id={id}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          maxLength={maxLength}
          aria-label={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          style={{
            WebkitBoxShadow: '0 0 0 1000px rgba(12,10,9,0.92) inset',
            WebkitTextFillColor: '#ffffff',
          }}
          className={cn(
            "auth-input",
            "w-full rounded-xl py-3.5 pl-12 pr-12 text-[15px] outline-none transition-all duration-300 text-white disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm placeholder:text-white/30",
            error
              ? "bg-red-500/[0.05] border border-red-500/30 focus:border-red-500/50 focus:bg-red-500/[0.08]"
              : "bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.08] border border-white/[0.1] focus:border-brand-400/50 focus:shadow-[0_0_20px_-5px_rgba(184,156,125,0.15)]"
          )}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors duration-200 z-10"
            aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
          >
            {showPassword ? (
              <EyeOff className="w-[17px] h-[17px]" strokeWidth={1.5} />
            ) : (
              <Eye className="w-[17px] h-[17px]" strokeWidth={1.5} />
            )}
          </button>
        )}
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.div
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 4 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="flex items-center gap-1.5 px-1 truncate"
          >
            <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" aria-hidden="true" />
            <span className="text-[12px] text-red-400 truncate">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Checkbox ───
const Checkbox = ({
  id,
  checked,
  onChange,
  disabled,
  error,
  errorMessage,
  required,
  children,
}: {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <>
    <motion.label
      variants={itemVariants}
      className="flex items-start gap-3 group cursor-pointer select-none mb-1"
    >
      <div className="relative mt-0.5 flex-shrink-0">
        <input
          id={id}
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={error}
          aria-describedby={errorMessage && id ? `${id}-error` : undefined}
        />
        <div
          className={cn(
            "w-4 h-4 rounded border transition-all duration-300 flex items-center justify-center",
            error && !checked && "border-red-400/60 bg-red-400/10",
            !error && checked && "bg-brand-400 border-brand-400",
            !error && !checked && "border-white/20 bg-white/[0.05] group-hover:border-white/40"
          )}
        >
          {checked && <CheckCircle2 className="w-3 h-3 text-brand-900" strokeWidth={3} />}
        </div>
      </div>
      <span className="text-[13px] leading-relaxed text-white/50 group-hover:text-white/70 transition-colors">
        {children}
      </span>
    </motion.label>
    {errorMessage && id && (
      <p
        id={`${id}-error`}
        role="alert"
        className="flex items-center gap-1.5 px-1 mb-3 -mt-0.5"
      >
        <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" aria-hidden="true" />
        <span className="text-[12px] text-red-400">{errorMessage}</span>
      </p>
    )}
  </>
);

// ─── Button ───
const PrimaryButton = ({
  children,
  onClick,
  type = "button",
  disabled,
  isLoading,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  isLoading?: boolean;
}) => (
  <motion.button
    variants={itemVariants}
    type={type}
    onClick={onClick}
    disabled={disabled || isLoading}
    aria-busy={isLoading}
    whileHover={{ y: -2, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={cn(
      "relative w-full overflow-hidden rounded-full bg-white px-8 py-4 text-[13px] font-bold tracking-[0.15em] text-brand-900 uppercase transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2.5 shadow-lg shadow-black/25 hover:shadow-black/35 group"
    )}
  >
    {/* Shimmer sweep on hover */}
    <span
      aria-hidden
      className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 group-hover:opacity-80 group-hover:translate-x-[300%] transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
    />
    {isLoading ? (
      <>
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        <span className="sr-only">Ładowanie...</span>
      </>
    ) : (
      <>
        <span className="relative z-10">{children}</span>
        <ArrowRight className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1.5" />
      </>
    )}
  </motion.button>
);

// ─── Form Alert ───
const FormAlert = ({ message, tone = "error" }: { message: string; tone?: "error" | "success" }) => (
  <motion.div
    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
    animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
    role={tone === "error" ? "alert" : "status"}
    aria-live={tone === "error" ? "assertive" : "polite"}
    className={cn(
      "w-full px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 overflow-hidden backdrop-blur-md border",
      tone === "error"
        ? "bg-red-500/10 text-red-300 border-red-500/20"
        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
    )}
  >
    {tone === "error" ? (
      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" aria-hidden="true" />
    ) : (
      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
    )}
    {message}
  </motion.div>
);

// ─── Email Status ───
const EmailStatus = ({ status }: { status: "loading" | "available" | "taken" | "invalid" | null }) => {
  if (!status) return null;
  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="w-full flex items-center justify-end px-2 mt-[-4px] mb-2"
    >
      {status === "loading" && (
        <span className="text-[12px] text-white/40 flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Sprawdzanie...
        </span>
      )}
      {status === "available" && (
        <span className="text-[12px] text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3" /> Email dostępny
        </span>
      )}
      {status === "taken" && (
        <span className="text-[12px] text-red-400 flex items-center gap-1.5">
          <XCircle className="w-3 h-3" /> Email zajęty
        </span>
      )}
      {status === "invalid" && (
        <span className="text-[12px] text-red-400 flex items-center gap-1.5">
          <XCircle className="w-3 h-3" /> Niepoprawny email
        </span>
      )}
    </motion.div>
  );
};

// ─── Main Component ───
export function AuthForms() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [isSignUp, setIsSignUp] = useState(false);

  // Login State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRemember, setLoginRemember] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginFieldErrors, setLoginFieldErrors] = useState<Record<string, string>>({});

  // Register State
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

  // Height animation for form transitions
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (!contentRef.current) return;

    const measure = () => {
      if (contentRef.current) {
        setContentHeight(contentRef.current.scrollHeight);
      }
    };

    // Measure immediately
    measure();

    // Watch for content changes
    const observer = new ResizeObserver(measure);
    observer.observe(contentRef.current);

    return () => observer.disconnect();
  }, [isSignUp]);

  // Effects
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "register") setIsSignUp(true);
  }, [searchParams]);

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setLoginError("");
    setRegisterError("");
    setLoginFieldErrors({});
    setRegisterFieldErrors({});
    setRegisterSuccess("");
  };

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
          remember: loginRemember,
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
      setTimeout(() => setIsSignUp(false), 2000);
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

  // ─── Login Form ───
  const LoginFormContent = (
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

  // ─── Register Form ───
  const RegisterFormContent = (
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

  return (
    <main className="w-full min-h-dvh grid place-items-center relative px-4 py-12 sm:py-16 overflow-x-hidden">
      {/* ── FULL-SCREEN BACKGROUND ── */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 20, ease: "easeOut" }}
        >
          <Image
            src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2670&auto=format&fit=crop"
            alt="Ziarna palonej kawy"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </motion.div>

        {/* Gradient overlays — matching Hero.tsx */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/50 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(12,10,9,0.6)_100%)]" />

        {/* Grain texture */}
        <div
          className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* ── GLASSMORPHISM CARD ── */}
      {/* Outer shell: animates position/scale but NEVER opacity — keeps backdrop-blur working from frame 1 */}
      <motion.div
        initial={{ y: 30, scale: 0.97 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative z-10 w-full max-w-[460px] mx-4 sm:mx-6 bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-2xl shadow-black/40"
      >
        {/* Inner content: fades in independently — opacity here doesn't break parent's backdrop-blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="relative p-6 sm:p-8"
        >
          {/* Subtle glow behind card */}
          <div className="absolute -inset-1 bg-gradient-to-b from-brand-400/[0.05] via-transparent to-brand-400/[0.03] rounded-3xl blur-xl pointer-events-none" />

          {/* Logo + Brand */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="flex flex-col items-center mb-5 relative"
          >
            <Link href="/" className="flex flex-col items-center group">
              <motion.div
                whileHover={{ scale: 1.08, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="relative"
              >
                <div className="absolute inset-0 rounded-full bg-white/10 blur-lg group-hover:bg-white/20 transition-all duration-500" />
                <Image
                  src="/assets/logo.png"
                  alt="Il Buon Caffe"
                  width={56}
                  height={56}
                  className="relative object-contain drop-shadow-xl brightness-0 invert"
                />
              </motion.div>
              <span className="mt-3 text-sm font-serif font-bold text-white tracking-tight">
                Il Buon Caffe
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">
                Est. 2003
              </span>
            </Link>
          </motion.div>

          {/* Form Content — height-animated wrapper */}
          {/* We use negative margins + padding to expand the bounds of overflow:hidden, 
              so button hover scales and focus rings don't get clipped. */}
          <motion.div
            animate={{ height: typeof contentHeight === "number" ? contentHeight + 6 : "auto" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
            className="w-full"
          >
            <div ref={contentRef}>
              <AnimatePresence mode="wait" initial={false}>
                {isSignUp ? RegisterFormContent : LoginFormContent}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Bottom toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-3 text-center relative"
          >
            <Divider text="lub" />

            <p className="text-white/40 text-[13px]">
              {isSignUp ? "Masz już konto?" : "Nie masz jeszcze konta?"}
              <button
                onClick={toggleMode}
                className="ml-2 text-brand-400 hover:text-brand-300 font-bold transition-colors"
                type="button"
              >
                {isSignUp ? "Zaloguj się" : "Stwórz konto"}
              </button>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </main>
  );
}
