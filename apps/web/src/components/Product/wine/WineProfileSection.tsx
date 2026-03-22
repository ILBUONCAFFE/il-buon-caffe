"use client";

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Wine, Star } from 'lucide-react';
import { Section } from './Section';
import { CharacteristicBar } from './CharacteristicBar';
import type { PaletteType } from './palette';
import type { WineDetails } from '@/content/products/wineData';

interface WineProfileSectionProps {
  wineDetails: WineDetails;
  palette: PaletteType;
}

export const WineProfileSection = ({ wineDetails, palette }: WineProfileSectionProps) => {
  const [activeTab, setActiveTab] = useState<'eye' | 'nose' | 'palate'>('nose');

  const tabIcons = {
    eye: '👁️',
    nose: '👃',
    palate: '👅',
  };

  const tabLabels = {
    eye: 'Oko',
    nose: 'Nos',
    palate: 'Podniebienie',
  };

  return (
    <section className="py-24" style={{ backgroundColor: palette.bgWarm }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

          {/* Left: Characteristics */}
          <Section>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: palette.accentSoft }}>
                <Wine size={16} style={{ color: palette.accent }} />
              </div>
              <span className="uppercase tracking-[0.3em] text-[11px] font-semibold" style={{ color: palette.accent }}>
                Profil Wina
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif mb-10" style={{ color: palette.text }}>
              Charakterystyka
            </h2>

            <div className="space-y-5">
              <CharacteristicBar label="Ciało" value={wineDetails.bodyValue} delay={0} />
              <CharacteristicBar label="Taniny" value={wineDetails.tannins} delay={0.1} />
              <CharacteristicBar label="Kwasowość" value={wineDetails.acidity} delay={0.2} />
              <CharacteristicBar label="Słodycz" value={wineDetails.sweetness} delay={0.3} />
            </div>
          </Section>

          {/* Right: Tasting Notes */}
          <Section delay={0.15}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: palette.accentSoft }}>
                <Star size={16} style={{ color: palette.accent }} />
              </div>
              <span className="uppercase tracking-[0.3em] text-[11px] font-semibold" style={{ color: palette.accent }}>
                Degustacja
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-serif mb-8" style={{ color: palette.text }}>
              Nuty Smakowe
            </h2>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8">
              {(['eye', 'nose', 'palate'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="flex items-center gap-2 px-5 py-3 text-sm transition-all duration-300 rounded-xl font-medium"
                  style={{
                    backgroundColor: activeTab === tab ? palette.accent : palette.bgCard,
                    color: activeTab === tab ? '#fff' : palette.textMuted,
                    border: `1px solid ${activeTab === tab ? palette.accent : palette.border}`,
                  }}
                >
                  <span>{tabIcons[tab]}</span>
                  {tabLabels[tab]}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="p-6 rounded-2xl"
              style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.borderLight}`, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
            >
              <p
                className="text-lg leading-relaxed font-serif italic"
                style={{ color: palette.textSecondary }}
              >
                &ldquo;{wineDetails.tastingNotes[activeTab]}&rdquo;
              </p>
            </motion.div>
          </Section>
        </div>
      </div>
    </section>
  );
};
