"use client";

import React from 'react';
import { Section } from './Section';
import type { PaletteType } from './palette';

interface ReviewsSectionProps {
  palette: PaletteType;
  productName: string;
}

export const ReviewsSection = ({ palette, productName }: ReviewsSectionProps) => {
  return (
    <section className="py-16 md:py-28" style={{ backgroundColor: palette.bg }}>
      <div className="container mx-auto px-5 md:px-12 lg:px-20">
        <Section className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <span
            className="uppercase tracking-[0.24em] text-[11px] font-semibold block mb-4"
            style={{ color: palette.textDim }}
          >
            — Społeczność
          </span>
          <h2
            className="text-[1.75rem] md:text-5xl font-serif leading-[1.1]"
            style={{ color: palette.text }}
          >
            Co mówią koneserzy
          </h2>
        </Section>

        <Section delay={0.1}>
          <div
            className="max-w-2xl mx-auto rounded-2xl border px-6 md:px-8 py-12 md:py-16 text-center"
            style={{
              backgroundColor: palette.bgCard,
              borderColor: palette.borderLight,
            }}
          >
            <h3 className="font-serif text-xl md:text-2xl mb-4 italic" style={{ color: palette.text }}>
              Czekamy na pierwszą degustację z Twoim udziałem.
            </h3>
            <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: palette.textMuted }}>
              Bądź pierwszą osobą, która podzieli się wrażeniami o {productName}. Twoja opinia pomoże innym w wyborze idealnego wina.
            </p>
          </div>
        </Section>
      </div>
    </section>
  );
};
