"use client";

import React from 'react';
import { Truck, ShieldCheck, RotateCcw } from 'lucide-react';
import { Section } from './Section';
import type { PaletteType } from './palette';

interface TrustStripSectionProps {
  palette: PaletteType;
}

export const TrustStripSection = ({ palette }: TrustStripSectionProps) => {
  const items = [
    {
      icon: Truck,
      title: 'Wysyłka 24h',
      desc: 'Zamówienia złożone do 14:00 wysyłamy tego samego dnia',
    },
    {
      icon: ShieldCheck,
      title: 'Bezpieczna płatność',
      desc: 'Płatności obsługuje Przelewy24 — karta, BLIK, przelew',
    },
    {
      icon: RotateCcw,
      title: 'Zwrot 14 dni',
      desc: 'Bez podawania przyczyny. Pełny zwrot środków',
    },
  ];

  return (
    <section className="py-16 md:py-20 border-y" style={{ backgroundColor: palette.bgCard, borderColor: palette.borderLight }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-5xl mx-auto">
          {items.map((item, idx) => (
            <Section key={item.title} delay={idx * 0.08}>
              <div className="flex items-start gap-4">
                <div
                  className="shrink-0 flex items-center justify-center h-11 w-11 rounded-full"
                  style={{ backgroundColor: palette.bgMuted, color: palette.gold }}
                >
                  <item.icon size={20} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-serif text-lg mb-1" style={{ color: palette.text }}>
                    {item.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: palette.textMuted }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            </Section>
          ))}
        </div>
      </div>
    </section>
  );
};
