"use client";

import React from 'react';
import { Section } from './Section';
import type { PaletteType } from './palette';
import type { WineDetails } from '@/content/products/wineData';

interface TastingNotesSectionProps {
  wineDetails: WineDetails;
  palette: PaletteType;
}

const ROMAN = ['I', 'II', 'III'];

export const TastingNotesSection = ({ wineDetails, palette }: TastingNotesSectionProps) => {
  const notes = wineDetails.tastingNotes;
  const items = [
    { label: 'Oko', text: notes.eye },
    { label: 'Nos', text: notes.nose },
    { label: 'Podniebienie', text: notes.palate },
  ].filter((item) => item.text && item.text.trim() && item.text !== 'Brak opisu.');

  if (items.length === 0) return null;

  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: palette.bg }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        <Section className="max-w-3xl mx-auto mb-20">
          <span
            className="uppercase tracking-[0.24em] text-[11px] font-semibold block mb-4"
            style={{ color: palette.textDim }}
          >
            — Degustacja
          </span>
          <h2
            className="text-3xl md:text-5xl font-serif leading-[1.1]"
            style={{ color: palette.text }}
          >
            Wrażenia zmysłowe
          </h2>
        </Section>

        <div className="max-w-3xl mx-auto">
          {items.map((item, idx) => (
            <Section key={item.label} delay={idx * 0.1}>
              <article
                className="grid grid-cols-[auto_1fr] gap-6 md:gap-10 py-10 md:py-12"
                style={{
                  borderTop: idx === 0 ? `1px solid ${palette.borderLight}` : 'none',
                  borderBottom: `1px solid ${palette.borderLight}`,
                }}
              >
                <div className="pt-1">
                  <span
                    className="font-serif text-2xl md:text-3xl italic"
                    style={{ color: palette.gold }}
                  >
                    {ROMAN[idx]}
                  </span>
                </div>
                <div>
                  <h3
                    className="text-[11px] uppercase tracking-[0.22em] font-semibold mb-3"
                    style={{ color: palette.textMuted }}
                  >
                    {item.label}
                  </h3>
                  <p
                    className="font-serif text-lg md:text-2xl leading-[1.5]"
                    style={{ color: palette.text }}
                  >
                    {item.text}
                  </p>
                </div>
              </article>
            </Section>
          ))}
        </div>
      </div>
    </section>
  );
};
