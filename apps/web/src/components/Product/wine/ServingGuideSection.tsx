"use client";

import React from 'react';
import { motion } from 'motion/react';
import { Wine, Thermometer, Clock, Award } from 'lucide-react';
import { Section } from './Section';
import type { PaletteType } from './palette';
import type { WineDetails } from '@/content/products/wineData';

interface ServingGuideSectionProps {
  wineDetails: WineDetails;
  palette: PaletteType;
}

export const ServingGuideSection = ({ wineDetails, palette }: ServingGuideSectionProps) => {
  return (
    <section className="py-24" style={{ backgroundColor: palette.bg }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">

        <Section className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: palette.accentSoft }}>
              <Wine size={16} style={{ color: palette.accent }} />
            </div>
            <span className="uppercase tracking-[0.3em] text-[11px] font-semibold" style={{ color: palette.accent }}>
              Serwowanie
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif" style={{ color: palette.text }}>
            Rytuał Podania
          </h2>
        </Section>

        {/* Horizontal timeline steps */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Thermometer,
                step: "01",
                label: "Temperatura",
                value: wineDetails.servingTemp,
                desc: "Schłodź wino do odpowiedniej temperatury przed podaniem"
              },
              {
                icon: Clock,
                step: "02",
                label: "Dekantacja",
                value: wineDetails.decanting,
                desc: "Przelej do karafki dla pełnego uwolnienia aromatów"
              },
              {
                icon: Award,
                step: "03",
                label: "Potencjał",
                value: wineDetails.agingPotential,
                desc: "Optymalne okno do konsumpcji przy odpowiednim przechowywaniu"
              },
            ].map((item, idx) => (
              <Section key={idx} delay={idx * 0.1}>
                <motion.div
                  className="relative px-8 py-10 text-center flex flex-col items-center justify-center overflow-hidden h-full group"
                >
                  {/* Large backplate number */}
                  <motion.span
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-serif font-medium leading-none select-none z-0"
                    style={{
                      fontSize: '9rem',
                      color: palette.textDim,
                      opacity: 0.04,
                    }}
                    initial={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    {item.step}
                  </motion.span>

                  <div className="relative z-10 flex flex-col items-center w-full">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center mb-6 transition-transform duration-500 group-hover:-translate-y-1"
                    >
                      <item.icon size={26} strokeWidth={1.5} style={{ color: palette.accent }} />
                    </div>

                    <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold mb-3" style={{ color: palette.textMuted }}>
                      {item.label}
                    </h4>

                    <p className="text-3xl font-serif mb-4 transition-transform duration-500 group-hover:-translate-y-0.5" style={{ color: palette.text }}>
                      {item.value}
                    </p>

                    <div className="w-8 h-px mb-4 opacity-30 transition-all duration-500 group-hover:w-12 group-hover:opacity-100" style={{ backgroundColor: palette.accent }} />

                    <p className="text-sm leading-relaxed max-w-[200px]" style={{ color: palette.textSecondary }}>
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              </Section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
