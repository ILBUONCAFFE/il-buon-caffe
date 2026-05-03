"use client";

import React from 'react';
import { Section } from './Section';
import { getGlassLabel } from './GlassIcon';
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
    });
  }

  items.push({
    label: "Potencjał",
    value: wineDetails.agingPotential,
    desc: "Optymalne okno do konsumpcji przy odpowiednim przechowywaniu",
  });

  const colsClass = items.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3';
  const total = items.length;
  const isOddLastMobile = total % 2 === 1;

  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: palette.bg }}>
      <div className="container mx-auto px-5 md:px-12 lg:px-20">

        <Section className="mb-10 md:mb-14">
          <span
            className="uppercase tracking-[0.24em] text-[11px] font-semibold block mb-3 md:mb-4 text-center"
            style={{ color: palette.textDim }}
          >
            — Serwowanie
          </span>
          <h2
            className="text-[1.75rem] md:text-5xl font-serif text-center leading-[1.1]"
            style={{ color: palette.text }}
          >
            Rekomendacje podania
          </h2>
        </Section>

        <div className="max-w-5xl mx-auto">
          <div
            className={`grid grid-cols-2 ${colsClass} rounded-2xl overflow-hidden`}
            style={{
              backgroundColor: palette.bgWarm,
              border: `1px solid ${palette.borderLight}`,
            }}
          >
            {items.map((item, idx) => {
              const isLastOddMobile = isOddLastMobile && idx === total - 1;
              const onLeftMobile = idx % 2 === 0;
              const onTopRowMobile = idx < 2;
              const mobileLeft = !isLastOddMobile && !onLeftMobile ? 'border-l' : '';
              const mobileTop = !onTopRowMobile ? 'border-t' : '';
              const desktopLeft = idx > 0 ? 'md:border-l' : 'md:border-l-0';
              const desktopTop = 'md:border-t-0';
              return (
                <Section key={idx} delay={idx * 0.08} className={isLastOddMobile ? 'col-span-2 md:col-span-1' : ''}>
                  <div
                    className={`px-4 md:px-6 py-7 md:py-10 text-center h-full flex flex-col items-center ${mobileLeft} ${mobileTop} ${desktopLeft} ${desktopTop}`}
                    style={{ borderColor: palette.borderLight }}
                  >
                    <span
                      className="text-[10px] uppercase tracking-[0.2em] font-semibold block mb-2.5 md:mb-3"
                      style={{ color: palette.textDim }}
                    >
                      {item.label}
                    </span>

                    <p
                      className="text-lg md:text-2xl font-serif mb-2.5 md:mb-3 leading-snug"
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
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
