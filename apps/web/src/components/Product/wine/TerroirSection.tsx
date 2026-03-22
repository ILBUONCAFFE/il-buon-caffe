"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Globe, Clock, Award, Leaf, MapPin, Mountain, ArrowRight } from 'lucide-react';
import { Section } from './Section';
import { CountryFlag } from './CountryFlag';
import type { PaletteType } from './palette';
import type { WineDetails } from '@/content/products/wineData';

interface TerroirSectionProps {
  wineDetails: WineDetails;
  palette: PaletteType;
  origin?: string;
}

export const TerroirSection = ({ wineDetails, palette, origin }: TerroirSectionProps) => {
  return (
    <section className="py-24" style={{ backgroundColor: palette.bg }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-16">

          {/* Main Content: 3 cols */}
          <Section className="lg:col-span-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: palette.accentSoft }}>
                <MapPin size={16} style={{ color: palette.accent }} />
              </div>
              <span className="uppercase tracking-[0.3em] text-[11px] font-semibold" style={{ color: palette.accent }}>
                Historia & Terroir
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif mb-6 flex items-center gap-3" style={{ color: palette.text }}>
              {wineDetails.countryCode && <CountryFlag countryCode={wineDetails.countryCode} size={28} />}
              {wineDetails.winery}
            </h2>
            {wineDetails.wineryDescription ? (
              <div className="mb-6 space-y-4">
                {wineDetails.wineryDescription.split('\n\n').map((paragraph, idx) => (
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

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Mountain, value: wineDetails.altitude, label: "Wysokość" },
                { icon: Clock, value: wineDetails.established, label: "Rok założenia" },
                { icon: Leaf, value: wineDetails.soil, label: "Gleba" },
                { icon: Globe, value: wineDetails.climate, label: "Klimat" },
              ].map((stat, idx) => (
                <motion.div
                  key={idx}
                  className="p-4 rounded-2xl text-center"
                  style={{ backgroundColor: palette.bgWarm, border: `1px solid ${palette.borderLight}` }}
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  <stat.icon size={20} className="mx-auto mb-2" style={{ color: palette.gold }} />
                  <p className="font-medium text-sm mb-1" style={{ color: palette.text }}>{stat.value}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: palette.textDim }}>{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </Section>

          {/* Awards Panel: 2 cols */}
          <Section className="lg:col-span-2" delay={0.2}>
            <div
              className="p-8 lg:p-10 rounded-3xl h-full"
              style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.border}`, boxShadow: palette.shadow }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(166, 139, 91, 0.1)' }}>
                  <Award size={20} style={{ color: palette.gold }} />
                </div>
                <h3 className="text-xl font-serif" style={{ color: palette.text }}>Nagrody</h3>
              </div>

              <div className="space-y-5">
                {wineDetails.awards.map((award, idx) => (
                  <motion.div
                    key={idx}
                    className="flex items-center gap-4 p-4 rounded-xl"
                    style={{ backgroundColor: palette.bgWarm }}
                    whileHover={{ backgroundColor: palette.bgMuted }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.border}` }}
                    >
                      <span className="font-serif text-base font-medium" style={{ color: palette.gold }}>{award.year}</span>
                    </div>
                    <div>
                      <p className="font-medium text-base" style={{ color: palette.text }}>{award.award}</p>
                      <p className="text-sm" style={{ color: palette.textMuted }}>{award.competition}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 pt-6" style={{ borderTop: `1px solid ${palette.borderLight}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(45, 106, 79, 0.08)' }}>
                    <Leaf size={16} style={{ color: '#2D6A4F' }} />
                  </div>
                  <span className="uppercase tracking-widest text-[11px] font-semibold" style={{ color: '#2D6A4F' }}>Organiczne</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: palette.textMuted }}>
                  Certyfikowane uprawy organiczne, bez syntetycznych pestycydów i herbicydów.
                </p>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </section>
  );
};
