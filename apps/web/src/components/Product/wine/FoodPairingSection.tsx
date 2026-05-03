"use client";

import React from 'react';
import { Section } from './Section';
import type { PaletteType } from './palette';
import type { WineDetails } from '@/content/products/wineData';

interface FoodPairingSectionProps {
  wineDetails: WineDetails;
  palette: PaletteType;
}

export const FoodPairingSection = ({ wineDetails, palette }: FoodPairingSectionProps) => {
  const pairing = wineDetails.foodPairing?.trim();
  if (!pairing) return null;

  return (
    <section className="py-24" style={{ backgroundColor: palette.bgWarm }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        <div className="max-w-4xl mx-auto text-center">
          <Section>
            <span
              className="uppercase tracking-[0.24em] text-[11px] font-semibold block mb-4"
              style={{ color: palette.textDim }}
            >
              — Z czym podać
            </span>

            <h2
              className="text-3xl md:text-5xl font-serif leading-[1.2] mb-10"
              style={{ color: palette.text }}
            >
              Sugerowane towarzystwo
            </h2>

            <p
              className="text-xl md:text-2xl leading-relaxed font-serif italic"
              style={{ color: palette.textSecondary }}
            >
              {pairing}
            </p>
          </Section>
        </div>
      </div>
    </section>
  );
};
