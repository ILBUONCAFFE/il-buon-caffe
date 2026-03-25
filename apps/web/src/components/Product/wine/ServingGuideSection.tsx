"use client";

import React from 'react';
import { Section } from './Section';
import type { PaletteType } from './palette';
import type { WineDetails } from '@/content/products/wineData';

interface ServingGuideSectionProps {
  wineDetails: WineDetails;
  palette: PaletteType;
}

export const ServingGuideSection = ({ wineDetails, palette }: ServingGuideSectionProps) => {
  const items = [
    {
      label: "Temperatura",
      value: wineDetails.servingTemp,
      desc: "Schłodź wino do odpowiedniej temperatury przed podaniem",
    },
    {
      label: "Dekantacja",
      value: wineDetails.decanting,
      desc: "Przelej do karafki dla pełnego uwolnienia aromatów",
    },
    {
      label: "Potencjał",
      value: wineDetails.agingPotential,
      desc: "Optymalne okno do konsumpcji przy odpowiednim przechowywaniu",
    },
  ];

  return (
    <section className="py-24" style={{ backgroundColor: palette.bg }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">

        <Section className="mb-14">
          <span
            className="uppercase tracking-[0.2em] text-[11px] font-semibold block mb-2 text-center"
            style={{ color: palette.textDim }}
          >
            Serwowanie
          </span>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-serif text-center"
            style={{ color: palette.text }}
          >
            Rytuał Podania
          </h2>
        </Section>

        {/* Horizontal layout — simple data display, no giant background numbers  */}
        <div className="max-w-4xl mx-auto">
          <div
            className="grid grid-cols-1 md:grid-cols-3 rounded-2xl overflow-hidden"
            style={{
              backgroundColor: palette.bgWarm,
              border: `1px solid ${palette.borderLight}`,
            }}
          >
            {items.map((item, idx) => (
              <Section key={idx} delay={idx * 0.08}>
                <div
                  className="px-8 py-10 text-center"
                  style={{
                    borderRight: idx < items.length - 1 ? `1px solid ${palette.borderLight}` : 'none',
                  }}
                >
                  <span
                    className="text-[10px] uppercase tracking-[0.2em] font-semibold block mb-4"
                    style={{ color: palette.textDim }}
                  >
                    {item.label}
                  </span>

                  <p
                    className="text-2xl md:text-3xl font-serif mb-4 leading-snug"
                    style={{ color: palette.text }}
                  >
                    {item.value}
                  </p>

                  <p
                    className="text-[13px] leading-relaxed max-w-[220px] mx-auto"
                    style={{ color: palette.textMuted }}
                  >
                    {item.desc}
                  </p>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
