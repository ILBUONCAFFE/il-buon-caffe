"use client";

import React from 'react';
import { Section } from './Section';
import type { PaletteType } from './palette';

interface TrustStripSectionProps {
  palette: PaletteType;
}

export const TrustStripSection = ({ palette }: TrustStripSectionProps) => {
  const items = [
    {
      title: 'Wysyłka 24h',
      desc: 'Zamówienia złożone do 14:00 wysyłamy tego samego dnia bezpiekiem kurierem.',
    },
    {
      title: 'Gwarancja Jakości',
      desc: 'Wina importowane bezpośrednio z wybranych europejskich winnic.',
    },
    {
      title: 'Bezpieczny Transport',
      desc: 'Każda butelka pakowana w specjalne kartony absorbujące wstrząsy.',
    },
  ];

  return (
    <section className="py-16 md:py-20 border-y" style={{ backgroundColor: palette.bgCard, borderColor: palette.borderLight }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-5xl mx-auto text-center md:text-left">
          {items.map((item, idx) => (
            <Section key={item.title} delay={idx * 0.08}>
              <div className="flex flex-col gap-3">
                <div>
                  <h3 className="font-serif text-lg md:text-xl relative inline-block pb-2 mb-2" style={{ color: palette.text }}>
                    {item.title}
                    <span className="absolute bottom-0 left-0 w-8 h-0.5" style={{ backgroundColor: palette.accent }}></span>
                  </h3>
                  <p className="text-[13px] md:text-sm leading-relaxed" style={{ color: palette.textMuted }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            </Section>
          ))}
        </div>
      </div>
    </section>
  );
};
