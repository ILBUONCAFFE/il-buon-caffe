"use client";

import React from 'react';
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
      className="py-16 md:py-32 relative overflow-hidden"
      style={{ backgroundColor: palette.bgWarm }}
    >
      <div className="container mx-auto px-5 md:px-12 lg:px-20 relative z-10">
        <Section className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-7 md:mb-10">
            <span
              className="uppercase tracking-[0.24em] text-[11px] font-semibold block"
              style={{ color: palette.textDim }}
            >
              — Ciekawostka
            </span>
          </div>

          <blockquote
            className="font-serif text-xl md:text-4xl leading-[1.35] md:leading-[1.3]"
            style={{ color: palette.text }}
          >
            <span
              aria-hidden="true"
              className="font-serif mr-4 align-top"
              style={{ color: palette.gold, fontSize: '1.2em', lineHeight: 0.8 }}
            >
              *
            </span>
            {fact}
          </blockquote>
        </Section>
      </div>
    </section>
  );
};
