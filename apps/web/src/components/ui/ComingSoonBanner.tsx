'use client';

import React from 'react';
import { Clock, ShoppingBag, UserCircle } from 'lucide-react';
import { SHOP_LAUNCH_DATE, ACCOUNTS_LAUNCH_DATE } from '@/config/launch';

interface ComingSoonBannerProps {
  /** 'shop' for store-related features, 'account' for login/registration */
  variant: 'shop' | 'account';
  /** Optional override for the launch date text */
  launchDate?: string;
  /** Optional extra CSS classes */
  className?: string;
  /** Compact mode — smaller banner for inline use (e.g. inside product page) */
  compact?: boolean;
  /** Contrast mode for dark sections */
  theme?: 'light' | 'dark';
}

const config = {
  shop: {
    icon: ShoppingBag,
    title: 'Sklep online w przygotowaniu',
    description: 'Sklep online zostanie uruchomiony latem 2026. Produkty możesz już przeglądać i poznawać ich historię.',
    defaultDate: SHOP_LAUNCH_DATE,
    accentColor: 'from-amber-600/20 to-amber-800/10',
    iconBg: 'bg-amber-900/10',
    iconColor: 'text-amber-800',
    borderColor: 'border-amber-200/60',
  },
  account: {
    icon: UserCircle,
    title: 'Rejestracja kont w przygotowaniu',
    description: 'Rejestracja kont planowana jest na zimę 2026. Po starcie konta odblokują historię zamówień i spersonalizowane oferty.',
    defaultDate: ACCOUNTS_LAUNCH_DATE,
    accentColor: 'from-brand-600/15 to-brand-800/10',
    iconBg: 'bg-brand-900/10',
    iconColor: 'text-brand-800',
    borderColor: 'border-brand-200/60',
  },
};

export const ComingSoonBanner = ({
  variant,
  launchDate,
  className = '',
  compact = false,
  theme = 'light',
}: ComingSoonBannerProps) => {
  const c = config[variant];
  const Icon = c.icon;
  const date = launchDate || c.defaultDate;

  if (compact) {
    return (
      <div
        className={`
          relative overflow-hidden rounded-2xl border ${c.borderColor}
          bg-gradient-to-br ${c.accentColor} backdrop-blur-sm
          p-5 ${className}
        `}
      >
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center shrink-0`}>
            <Icon size={20} className={c.iconColor} />
          </div>
          <div className="min-w-0">
            <p className={`font-bold text-sm mb-1 ${theme === 'dark' ? 'text-white' : 'text-brand-900'}`}>{c.title}</p>
            <div className={`flex items-center gap-2 text-xs ${theme === 'dark' ? 'text-white/60' : 'text-brand-600'}`}>
              <Clock size={12} className="shrink-0" />
              <span>Przewidywane uruchomienie: <strong className={theme === 'dark' ? 'text-white/90' : 'text-brand-800'}>{date}</strong></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        relative overflow-hidden rounded-3xl border ${c.borderColor}
        bg-gradient-to-br ${c.accentColor} backdrop-blur-sm
        px-8 py-10 md:px-12 md:py-14 text-center ${className}
      `}
    >
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto">
        <div className={`w-16 h-16 rounded-2xl ${theme === 'dark' ? 'bg-white/10 shadow-lg border border-white/5' : c.iconBg} flex items-center justify-center mx-auto mb-6 shadow-sm`}>
          <Icon size={28} className={theme === 'dark' ? 'text-white' : c.iconColor} strokeWidth={1.5} />
        </div>

        <h2 className={`text-2xl md:text-3xl font-serif font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-brand-900'}`}>
          {c.title}
        </h2>

        <p className={`leading-relaxed text-sm md:text-base mb-6 ${theme === 'dark' ? 'text-white/60' : 'text-brand-600'}`}>
          {c.description}
        </p>

        <div className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border shadow-sm ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white/80 border-brand-200/50'}`}>
          <Clock size={16} className={theme === 'dark' ? 'text-white/50' : 'text-brand-500'} />
          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-brand-700'}`}>
            Przewidywane uruchomienie:{' '}
            <strong className={theme === 'dark' ? 'text-white' : 'text-brand-900'}>{date}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
