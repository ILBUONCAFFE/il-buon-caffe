"use client";

import React from 'react';
import { Section } from './Section';
import { GlassIcon, getGlassLabel } from './GlassIcon';
import type { PaletteType } from './palette';
import type { WineDetails } from '@/content/products/wineData';

interface ServingGuideSectionProps {
  wineDetails: WineDetails;
  palette: PaletteType;
}

interface GuideItem {
  label: string;
  value: string;
  desc: string;
  icon?: React.ReactNode;
}

export const ServingGuideSection = ({ wineDetails, palette }: ServingGuideSectionProps) => {
  const items: GuideItem[] = [
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
  ];

  if (wineDetails.glassType) {
    items.push({
      label: "Kieliszek",
      value: getGlassLabel(wineDetails.glassType),
      desc: "Kształt kieliszka kierunkuje aromaty na właściwe receptory",
      icon: <GlassIcon type={wineDetails.glassType} size={56} color={palette.gold} strokeWidth={1.3} />,
    });
  }

  items.push({
    label: "Potencjał",
    value: wineDetails.agingPotential,
    desc: "Optymalne okno do konsumpcji przy odpowiednim przechowywaniu",
  });

  const colsClass = items.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3';

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
        <div className="max-w-5xl mx-auto">
          <div
            className={`grid grid-cols-1 ${colsClass} rounded-2xl overflow-hidden`}
            style={{
              backgroundColor: palette.bgWarm,
              border: `1px solid ${palette.borderLight}`,
            }}
          >
            {items.map((item, idx) => (
              <Section key={idx} delay={idx * 0.08}>
                <div
                  className="px-6 py-10 text-center h-full flex flex-col items-center"
                  style={{
                    borderRight: idx < items.length - 1 ? `1px solid ${palette.borderLight}` : 'none',
                  }}
                >
                  {item.icon && (
                    <div className="mb-4 flex items-center justify-center" style={{ color: palette.gold }}>
                      {item.icon}
                    </div>
                  )}

                  <span
                    className="text-[10px] uppercase tracking-[0.2em] font-semibold block mb-3"
                    style={{ color: palette.textDim }}
                  >
                    {item.label}
                  </span>

                  <p
                    className="text-xl md:text-2xl font-serif mb-3 leading-snug"
                    style={{ color: palette.text }}
                  >
                    {item.value}
                  </p>

                  <p
                    className="text-[12px] leading-relaxed max-w-[200px] mx-auto"
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
