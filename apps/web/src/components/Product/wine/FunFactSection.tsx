"use client";

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Section } from './Section';
import type { PaletteType } from './palette';
import type { WineDetails } from '@/content/products/wineData';

interface FunFactSectionProps {
  wineDetails: WineDetails;
  palette: PaletteType;
}

export const FunFactSection = ({ wineDetails, palette }: FunFactSectionProps) => {
  const fact = wineDetails.funFact?.trim();
  if (!fact) return null;

  return (
    <section
      className="py-20 md:py-28 relative overflow-hidden"
      style={{ backgroundColor: palette.bgWarm }}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, ${palette.accent} 0%, transparent 60%), radial-gradient(circle at 80% 70%, ${palette.gold} 0%, transparent 60%)`,
        }}
      />

      <div className="container mx-auto px-6 md:px-12 lg:px-20 relative z-10">
        <Section className="max-w-3xl mx-auto text-center">
          <div
            className="inline-flex items-center justify-center h-14 w-14 rounded-full mb-8"
            style={{
              backgroundColor: palette.bgCard,
              border: `1px solid ${palette.gold}`,
              boxShadow: palette.shadow,
            }}
          >
            <Sparkles size={22} strokeWidth={1.5} style={{ color: palette.gold }} />
          </div>

          <span
            className="uppercase tracking-[0.24em] text-[10px] font-semibold block mb-4"
            style={{ color: palette.gold }}
          >
            Czy wiesz, że…
          </span>

          <blockquote
            className="font-serif text-2xl md:text-3xl lg:text-[2.25rem] leading-[1.35] italic"
            style={{ color: palette.text }}
          >
            „{fact}”
          </blockquote>
        </Section>
      </div>
    </section>
  );
};
