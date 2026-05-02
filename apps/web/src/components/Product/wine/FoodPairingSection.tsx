"use client";

import React from 'react';
import { UtensilsCrossed } from 'lucide-react';
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
    <section className="py-20" style={{ backgroundColor: palette.bgWarm }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        <div className="max-w-3xl mx-auto text-center">
          <Section>
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-6"
              style={{
                backgroundColor: palette.bg,
                border: `1px solid ${palette.borderLight}`,
                color: palette.accent,
              }}
              aria-hidden="true"
            >
              <UtensilsCrossed size={20} strokeWidth={1.6} />
            </div>

            <span
              className="uppercase tracking-[0.2em] text-[11px] font-semibold block mb-3"
              style={{ color: palette.textDim }}
            >
              Z czym podać
            </span>

            <h2
              className="text-2xl md:text-3xl font-serif leading-snug mb-5"
              style={{ color: palette.text }}
            >
              Sugerowane towarzystwo
            </h2>

            <p
              className="text-base md:text-lg leading-relaxed font-serif italic"
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
