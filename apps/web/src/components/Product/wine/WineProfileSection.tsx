"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Section } from './Section';
import { CharacteristicBar } from './CharacteristicBar';
import type { PaletteType } from './palette';
import type { WineDetails } from '@/content/products/wineData';

interface WineProfileSectionProps {
  wineDetails: WineDetails;
  palette: PaletteType;
}

const TABS = [
  { key: 'eye' as const, label: 'Oko' },
  { key: 'nose' as const, label: 'Nos' },
  { key: 'palate' as const, label: 'Podniebienie' },
];

export const WineProfileSection = ({ wineDetails, palette }: WineProfileSectionProps) => {
  const [activeTab, setActiveTab] = useState<'eye' | 'nose' | 'palate'>('nose');

  return (
    <section className="py-24" style={{ backgroundColor: palette.bgWarm }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

          {/* Left: Characteristics */}
          <Section>
            <span
              className="uppercase tracking-[0.2em] text-[11px] font-semibold block mb-2"
              style={{ color: palette.textDim }}
            >
              Profil Wina
            </span>
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
            <span
              className="uppercase tracking-[0.2em] text-[11px] font-semibold block mb-2"
              style={{ color: palette.textDim }}
            >
              Degustacja
            </span>
            <h2 className="text-3xl md:text-4xl font-serif mb-8" style={{ color: palette.text }}>
              Nuty Smakowe
            </h2>

            {/* Tab Navigation — text-only, no emojis */}
            <div
              className="inline-flex rounded-lg p-1 mb-8"
              style={{ backgroundColor: palette.bgMuted }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="relative px-5 py-2 text-[13px] font-medium transition-colors duration-200 rounded-md"
                  style={{
                    color: activeTab === tab.key ? palette.text : palette.textMuted,
                  }}
                >
                  {activeTab === tab.key && (
                    <motion.div
                      layoutId="tasting-tab-indicator"
                      className="absolute inset-0 rounded-md"
                      style={{
                        backgroundColor: palette.bgCard,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <blockquote
                  className="text-lg leading-relaxed font-serif italic pl-5"
                  style={{
                    color: palette.textSecondary,
                    borderLeft: `2px solid ${palette.accent}`,
                  }}
                >
                  {wineDetails.tastingNotes[activeTab]}
                </blockquote>
              </motion.div>
            </AnimatePresence>
          </Section>
        </div>
      </div>
    </section>
  );
};
