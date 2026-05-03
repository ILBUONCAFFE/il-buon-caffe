"use client";

import React from 'react';
import { Star, MessageSquarePlus } from 'lucide-react';
import { Section } from './Section';
import type { PaletteType } from './palette';

interface ReviewsSectionProps {
  palette: PaletteType;
  productName: string;
}

export const ReviewsSection = ({ palette, productName }: ReviewsSectionProps) => {
  return (
    <section className="py-24 md:py-28" style={{ backgroundColor: palette.bg }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        <Section className="text-center max-w-3xl mx-auto mb-12">
          <span
            className="uppercase tracking-[0.2em] text-[11px] font-semibold block mb-3"
            style={{ color: palette.textDim }}
          >
            Opinie
          </span>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-serif"
            style={{ color: palette.text }}
          >
            Co mówią klienci
          </h2>
        </Section>

        <Section delay={0.1}>
          <div
            className="max-w-2xl mx-auto rounded-2xl border px-8 py-14 md:py-16 text-center"
            style={{
              backgroundColor: palette.bgCard,
              borderColor: palette.borderLight,
              boxShadow: palette.shadow,
            }}
          >
            <div
              className="inline-flex items-center justify-center h-14 w-14 rounded-full mb-6"
              style={{ backgroundColor: palette.bgMuted, color: palette.gold }}
            >
              <Star size={22} strokeWidth={1.5} />
            </div>

            <div className="flex items-center justify-center gap-1 mb-5" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={18} strokeWidth={1.4} style={{ color: palette.borderLight }} />
              ))}
            </div>

            <h3 className="font-serif text-xl md:text-2xl mb-3" style={{ color: palette.text }}>
              Jeszcze brak opinii
            </h3>
            <p className="text-[14px] leading-relaxed mb-8 max-w-md mx-auto" style={{ color: palette.textMuted }}>
              Bądź pierwszą osobą, która podzieli się wrażeniami o {productName}. Twoja opinia pomoże innym koneserom.
            </p>

            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[12px] uppercase tracking-[0.14em] opacity-60 cursor-not-allowed"
              style={{
                backgroundColor: palette.text,
                color: palette.bg,
              }}
              aria-label="Funkcja wystawiania opinii już wkrótce"
            >
              <MessageSquarePlus size={16} strokeWidth={1.8} />
              Napisz opinię
              <span className="text-[10px] font-normal ml-1 opacity-80">(już wkrótce)</span>
            </button>
          </div>
        </Section>
      </div>
    </section>
  );
};
