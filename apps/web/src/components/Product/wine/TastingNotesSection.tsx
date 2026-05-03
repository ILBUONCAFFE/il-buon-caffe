"use client";

import React from 'react';
import { Eye, Wind, Sparkles } from 'lucide-react';
import { Section } from './Section';
import type { PaletteType } from './palette';
import type { WineDetails } from '@/content/products/wineData';

interface TastingNotesSectionProps {
  wineDetails: WineDetails;
  palette: PaletteType;
}

export const TastingNotesSection = ({ wineDetails, palette }: TastingNotesSectionProps) => {
  const notes = wineDetails.tastingNotes;
  const items = [
    { icon: Eye, label: 'Oko', text: notes.eye },
    { icon: Wind, label: 'Nos', text: notes.nose },
    { icon: Sparkles, label: 'Podniebienie', text: notes.palate },
  ].filter((item) => item.text && item.text.trim() && item.text !== 'Brak opisu.');

  if (items.length === 0) return null;

  return (
    <section className="py-24 md:py-32" style={{ backgroundColor: palette.bg }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        <Section className="text-center max-w-3xl mx-auto mb-16">
          <span
            className="uppercase tracking-[0.2em] text-[11px] font-semibold block mb-3"
            style={{ color: palette.textDim }}
          >
            Degustacja
          </span>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-serif leading-[1.1]"
            style={{ color: palette.text }}
          >
            Doznania zmysłowe
          </h2>
          <div
            className="h-px w-12 mx-auto mt-8"
            style={{ backgroundColor: palette.gold }}
          />
        </Section>

        <div className={`grid gap-8 md:gap-10 max-w-6xl mx-auto ${items.length === 3 ? 'md:grid-cols-3' : items.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
          {items.map((item, idx) => (
            <Section key={item.label} delay={idx * 0.1}>
              <article
                className="h-full p-8 md:p-10 rounded-2xl border"
                style={{
                  backgroundColor: palette.bgCard,
                  borderColor: palette.borderLight,
                  boxShadow: palette.shadow,
                }}
              >
                <div
                  className="inline-flex items-center justify-center h-12 w-12 rounded-full mb-6"
                  style={{ backgroundColor: palette.accentSoft, color: palette.accent }}
                >
                  <item.icon size={20} strokeWidth={1.6} />
                </div>
                <h3
                  className="text-[11px] uppercase tracking-[0.22em] font-semibold mb-3"
                  style={{ color: palette.gold }}
                >
                  {item.label}
                </h3>
                <p
                  className="font-serif italic text-lg md:text-xl leading-relaxed"
                  style={{ color: palette.textSecondary }}
                >
                  {item.text}
                </p>
              </article>
            </Section>
          ))}
        </div>
      </div>
    </section>
  );
};
