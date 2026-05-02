"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Leaf, Sparkles, Sprout } from 'lucide-react';
import { Section } from './Section';
import { CountryFlag } from './CountryFlag';
import type { PaletteType } from './palette';
import type { WineDetails } from '@/content/products/wineData';
import type { ProducerContent } from '@repo/types';

interface TerroirSectionProps {
  wineDetails: WineDetails;
  palette: PaletteType;
  origin?: string;
  producer?: ProducerContent | null;
}

export const TerroirSection = ({ wineDetails, palette, origin, producer }: TerroirSectionProps) => {
  const wineryName = producer?.name || wineDetails.winery;
  const countryCode = producer?.countryCode || wineDetails.countryCode;
  const description = producer?.story || wineDetails.wineryDescription;
  const stats = [
    { value: producer?.altitude || wineDetails.altitude, label: "Wysokość" },
    { value: producer?.established || wineDetails.established, label: "Rok założenia" },
    { value: producer?.soil || wineDetails.soil, label: "Gleba" },
    { value: producer?.climate || wineDetails.climate, label: "Klimat" },
  ].filter((stat) => Boolean(stat.value));

  const certifications = [
    {
      enabled: wineDetails.isOrganic,
      label: "Organiczne",
      description: "Certyfikowane uprawy organiczne, bez syntetycznych pestycydów i herbicydów.",
      icon: Leaf,
    },
    {
      enabled: wineDetails.isBiodynamic,
      label: "Biodynamiczne",
      description: "Uprawa prowadzona zgodnie z rytmem natury i zasadami rolnictwa biodynamicznego.",
      icon: Sprout,
    },
    {
      enabled: wineDetails.isNatural,
      label: "Naturalne",
      description: "Minimalna interwencja w piwnicy, z naciskiem na autentyczny charakter owocu i terroir.",
      icon: Sparkles,
    },
  ].filter((certification) => certification.enabled);

  return (
    <section className="py-24" style={{ backgroundColor: palette.bg }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

          {/* Main Content: 3 cols */}
          <Section className="lg:col-span-3">
            <span
              className="uppercase tracking-[0.2em] text-[11px] font-semibold block mb-2"
              style={{ color: palette.textDim }}
            >
              Historia & Terroir
            </span>
            <h2 className="text-3xl md:text-4xl font-serif mb-6 flex items-center gap-3" style={{ color: palette.text }}>
              {countryCode && <CountryFlag countryCode={countryCode} size={28} />}
              {wineryName}
            </h2>
            {description ? (
              <div className="mb-6 space-y-4">
                {description.split('\n\n').map((paragraph, idx) => (
                  <p
                    key={idx}
                    className="text-base leading-[1.8]"
                    style={{ color: idx === 0 ? palette.textSecondary : palette.textMuted }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <>
                <p className="text-base leading-[1.8] mb-6" style={{ color: palette.textSecondary }}>
                  Założona w {wineDetails.established} roku, winnica {wineDetails.winery} od pokoleń kultywuje tradycję
                  wytwarzania wyjątkowych win w regionie {origin || 'Hiszpanii'}. Położona na wysokości {wineDetails.altitude},
                  korzysta z unikalnego klimatu śródziemnomorskiego.
                </p>
                <p className="leading-[1.8] mb-6" style={{ color: palette.textMuted }}>
                  {wineDetails.vinification}
                </p>
              </>
            )}

            {/* Encyclopedia CTA */}
            <Link
              href="/encyklopedia"
              className="inline-flex items-center gap-2 mb-10 text-sm font-medium transition-all duration-300 group"
              style={{ color: palette.accent }}
            >
              <span className="border-b border-transparent group-hover:border-current transition-all duration-300">
                Poznaj więcej o regionie i szczepach
              </span>
              <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            {/* Stats — simple inline data, no hover-lift cards */}
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl overflow-hidden"
              style={{ backgroundColor: palette.borderLight }}
            >
              {stats.map((stat, idx) => (
                <div
                  key={idx}
                  className="px-4 py-5 text-center"
                  style={{ backgroundColor: palette.bgWarm }}
                >
                  <p className="font-medium text-sm mb-1" style={{ color: palette.text }}>{stat.value}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: palette.textDim }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Awards Panel: 2 cols */}
          <Section className="lg:col-span-2" delay={0.2}>
            <div
              className="p-8 lg:p-10 rounded-3xl h-full"
              style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <h3 className="text-xl font-serif mb-8" style={{ color: palette.text }}>Nagrody</h3>

              <div className="space-y-4">
                {wineDetails.awards.map((award, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-xl"
                    style={{ backgroundColor: palette.bgWarm }}
                  >
                    <span
                      className="font-serif text-sm font-medium shrink-0 pt-0.5"
                      style={{ color: palette.gold }}
                    >
                      {award.year}
                    </span>
                    <div>
                      <p className="font-medium text-sm" style={{ color: palette.text }}>{award.award}</p>
                      <p className="text-[13px]" style={{ color: palette.textMuted }}>{award.competition}</p>
                    </div>
                  </div>
                ))}
              </div>

              {certifications.length > 0 && (
                <div className="mt-8 pt-6 space-y-5" style={{ borderTop: `1px solid ${palette.borderLight}` }}>
                  {certifications.map((certification) => {
                    const Icon = certification.icon;

                    return (
                      <div key={certification.label}>
                        <div className="flex items-center gap-2.5 mb-3">
                          <Icon size={14} style={{ color: '#2D6A4F' }} />
                          <span className="uppercase tracking-widest text-[11px] font-semibold" style={{ color: '#2D6A4F' }}>
                            {certification.label}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: palette.textMuted }}>
                          {certification.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </section>
  );
};
