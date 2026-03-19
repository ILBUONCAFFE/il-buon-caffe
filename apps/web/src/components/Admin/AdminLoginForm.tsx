'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminLoginAction, type LoginResult } from '@/actions/admin-auth';
import { Lock, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export function AdminLoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Entrance animation
  useEffect(() => {
    setMounted(true);
    emailRef.current?.focus();
  }, []);

  // Countdown timer for rate limiting
  useEffect(() => {
    if (!retryAfter || retryAfter <= 0) return;
    const interval = setInterval(() => {
      setRetryAfter((prev) => {
        if (!prev || prev <= 1) {
          setError(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [retryAfter]);

  const isLocked = retryAfter !== null && retryAfter > 0;

  function handleSubmit(formData: FormData) {
    setError(null);

    // Client-side quick validation
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email?.trim() || !password) {
      setError('Podaj email i hasło');
      return;
    }

    startTransition(async () => {
      try {
        const result: LoginResult = await adminLoginAction(formData);

        if (result.success) {
          router.push('/admin');
          router.refresh();
        } else {
          setError(result.error || 'Wystąpił błąd');
          if (result.retryAfter) {
            setRetryAfter(result.retryAfter);
          }
        }
      } catch {
        setError('Błąd połączenia. Spróbuj ponownie.');
      }
    });
  }

  return (
    <div
      className={`w-full max-w-[20rem] xs:max-w-[22rem] sm:max-w-md transition-all duration-700 ease-out ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Logo / Header */}
      <div className="text-center mb-6 sm:mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 mb-4 sm:mb-6">
          <Lock className="w-8 h-8 text-brand-400" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl sm:text-2xl font-serif text-white tracking-tight">
          Il Buon Caffe
        </h1>
        <p className="text-sm text-brand-400 mt-1">
          Panel administracyjny
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-brand-900/60 backdrop-blur-lg border border-white/5 rounded-2xl p-5 sm:p-8 shadow-2xl">
        <form ref={formRef} action={handleSubmit} noValidate>
          {/* Error Alert */}
          {error && (
            <div
              className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-3"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>
                {error}
                {isLocked && (
                  <span className="block text-red-400/70 text-xs mt-1">
                    Odblokowanie za {formatTime(retryAfter!)}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Email */}
          <div className="mb-4 sm:mb-5">
            <label
              htmlFor="admin-email"
              className="block text-sm font-medium text-brand-300 mb-1.5"
            >
              Email
            </label>
            <input
              ref={emailRef}
              id="admin-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={255}
              disabled={isPending || isLocked}
              placeholder="admin@ilbuoncaffe.pl"
              style={{
                WebkitBoxShadow: '0 0 0 1000px rgba(8,6,6,0.95) inset',
                WebkitTextFillColor: '#ffffff',
              }}
              className="admin-auth-input w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-brand-950/80 border border-white/10
                text-white placeholder-white/30 text-sm sm:text-base
                focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200"
            />
          </div>

          {/* Password */}
          <div className="mb-6 sm:mb-8">
            <label
              htmlFor="admin-password"
              className="block text-sm font-medium text-brand-300 mb-2"
            >
              Hasło
            </label>
            <div className="relative">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                maxLength={50}
                disabled={isPending || isLocked}
                placeholder="••••••••••"
                style={{
                  WebkitBoxShadow: '0 0 0 1000px rgba(8,6,6,0.95) inset',
                  WebkitTextFillColor: '#ffffff',
                }}
                className="admin-auth-input w-full px-3.5 py-2.5 sm:px-4 sm:py-3 pr-11 rounded-xl bg-brand-950/80 border border-white/10
                  text-white placeholder-white/30 text-sm sm:text-base
                  focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/40
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-brand-500 hover:text-brand-300 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" strokeWidth={1.5} />
                ) : (
                  <Eye className="w-5 h-5" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending || isLocked}
            className="w-full py-3.5 rounded-xl font-medium text-sm tracking-wide
              bg-brand-500 text-white
              hover:bg-brand-400 active:bg-brand-600
              focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 focus:ring-offset-brand-950
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} />
                Logowanie...
              </>
            ) : isLocked ? (
              `Zablokowane (${formatTime(retryAfter!)})`
            ) : (
              'Zaloguj się'
            )}
          </button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-brand-700 mt-5 sm:mt-8">
        Dostęp tylko dla autoryzowanego personelu.
        <br />
        Wszystkie próby logowania są rejestrowane.
      </p>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`;
  return `${s}s`;
}
