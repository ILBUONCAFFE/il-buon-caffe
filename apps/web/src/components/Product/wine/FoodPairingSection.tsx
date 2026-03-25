"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { Section } from './Section';
import type { PaletteType } from './palette';
import type { WineFoodPairing } from '@/content/products/wineData';

/* ═══════════════════════════════════════════════════════════
   CATEGORY CONFIG
   ═══════════════════════════════════════════════════════════ */

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  'mięso':       { label: 'Mięso',          icon: '🥩' },
  'ryba':        { label: 'Ryby',           icon: '🐟' },
  'makaron':     { label: 'Makarony',       icon: '🍝' },
  'sery':        { label: 'Sery',           icon: '🧀' },
  'warzywa':     { label: 'Warzywa',        icon: '🥬' },
  'owoce morza': { label: 'Owoce morza',    icon: '🦐' },
  'drób':        { label: 'Drób',           icon: '🍗' },
  'deser':       { label: 'Desery',         icon: '🍰' },
  'wędliny':     { label: 'Wędliny',        icon: '🥓' },
  'dziczyzna':   { label: 'Dziczyzna',      icon: '🦌' },
};

const FEATURED_COUNT = 3;
const INITIAL_LIST_COUNT = 6;

/* ═══════════════════════════════════════════════════════════
   SUBCOMPONENTS
   ═══════════════════════════════════════════════════════════ */

/** Featured card — large layout, image + description visible */
const FeaturedCard = ({
  item,
  index,
  palette,
}: {
  item: WineFoodPairing;
  index: number;
  palette: PaletteType;
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl"
      style={{
        backgroundColor: palette.bgCard,
        border: `1px solid ${palette.borderLight}`,
      }}
    >
      {/* Image area */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: '4 / 5',
          backgroundColor: palette.bgMuted,
        }}
      >
        {item.imageUrl && !imgError ? (
          <img
            src={encodeURI(item.imageUrl)}
            alt={item.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: `linear-gradient(145deg, ${palette.bgMuted} 0%, ${palette.bgWarm} 100%)`,
            }}
          >
            <span className="text-5xl opacity-25 transition-transform duration-500 group-hover:scale-110">
              {CATEGORY_META[item.category ?? '']?.icon ?? '🍷'}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 40%, transparent 70%)',
          }}
        />

        {/* Category tag */}
        {item.category && CATEGORY_META[item.category] && (
          <div
            className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] backdrop-blur-md"
            style={{
              backgroundColor: 'rgba(255,255,255,0.85)',
              color: palette.textSecondary,
            }}
          >
            {CATEGORY_META[item.category].label}
          </div>
        )}

        {/* Title on image */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-8">
          <h3
            className="font-serif text-lg md:text-xl leading-snug"
            style={{ color: '#fff' }}
          >
            {item.name}
          </h3>
        </div>
      </div>

      {/* Description */}
      <div className="px-5 py-4">
        <p
          className="text-[13px] leading-relaxed"
          style={{ color: palette.textMuted }}
        >
          {item.description}
        </p>
      </div>
    </motion.div>
  );
};


/** Compact list item — for the remaining items */
const ListItem = ({
  item,
  index,
  palette,
}: {
  item: WineFoodPairing;
  index: number;
  palette: PaletteType;
}) => {
  const [imgError, setImgError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full text-left group"
      >
        <div
          className="flex items-center gap-4 py-3.5 px-4 rounded-xl transition-colors duration-200"
          style={{
            backgroundColor: isOpen ? palette.bgCard : 'transparent',
            boxShadow: isOpen ? '0 2px 12px rgba(0,0,0,0.04)' : 'none',
          }}
        >
          {/* Thumbnail */}
          <div
            className="w-12 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
            style={{ backgroundColor: palette.bgMuted }}
          >
            {item.imageUrl && !imgError ? (
              <img
                src={encodeURI(item.imageUrl)}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <span className="text-lg opacity-40">
                {CATEGORY_META[item.category ?? '']?.icon ?? '🍷'}
              </span>
            )}
          </div>

          {/* Name + category */}
          <div className="flex-1 min-w-0">
            <span
              className="font-serif text-[15px] leading-tight block truncate transition-colors duration-200"
              style={{ color: isOpen ? palette.text : palette.textSecondary }}
            >
              {item.name}
            </span>
            {item.category && CATEGORY_META[item.category] && (
              <span
                className="text-[11px] tracking-wide uppercase mt-0.5 block"
                style={{ color: palette.textDim }}
              >
                {CATEGORY_META[item.category].label}
              </span>
            )}
          </div>

          {/* Chevron */}
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            className="shrink-0"
          >
            <ChevronDown size={16} style={{ color: palette.textDim }} />
          </motion.div>
        </div>
      </button>

      {/* Expandable description */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p
              className="text-[13px] leading-relaxed pl-20 pr-4 pb-3"
              style={{ color: palette.textMuted }}
            >
              {item.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


/* ═══════════════════════════════════════════════════════════
   MAIN SECTION
   ═══════════════════════════════════════════════════════════ */

interface FoodPairingSectionProps {
  items: WineFoodPairing[];
  palette: PaletteType;
}

export const FoodPairingSection = ({ items, palette }: FoodPairingSectionProps) => {
  const [showAll, setShowAll] = useState(false);

  // Split into featured (first 3) and remaining
  const featured = useMemo(() => items.slice(0, FEATURED_COUNT), [items]);
  const remaining = useMemo(() => items.slice(FEATURED_COUNT), [items]);
  const visibleRemaining = showAll ? remaining : remaining.slice(0, INITIAL_LIST_COUNT);
  const hiddenCount = remaining.length - INITIAL_LIST_COUNT;

  // Group remaining by category for section dividers
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    remaining.forEach(item => {
      const cat = item.category ?? 'inne';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [remaining]);

  const categoryChips = useMemo(() => {
    return Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, count]) => ({
        key: cat,
        label: CATEGORY_META[cat]?.label ?? cat,
        icon: CATEGORY_META[cat]?.icon ?? '🍽️',
        count,
      }));
  }, [categoryCounts]);

  return (
    <section className="py-20 md:py-28" style={{ backgroundColor: palette.bgWarm }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">

        {/* ── Header ── */}
        <Section className="mb-14">
          <span
            className="uppercase tracking-[0.2em] text-[11px] font-semibold block mb-2 text-center"
            style={{ color: palette.textDim }}
          >
            Idealne Połączenia
          </span>
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-serif text-center"
            style={{ color: palette.text }}
          >
            Z Czym Podawać
          </h2>
          <p
            className="text-center mt-4 text-[15px] leading-relaxed max-w-xl mx-auto"
            style={{ color: palette.textMuted }}
          >
            Starannie dobrane dania, które wydobywają pełnię aromatu
            i&nbsp;idealnie&nbsp;harmonizują z&nbsp;charakterem tego wina.
          </p>
        </Section>

        {/* ── Featured cards (masonry-style top row) ── */}
        {featured.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-12">
            {featured.map((item, idx) => (
              <FeaturedCard
                key={item.name}
                item={item}
                index={idx}
                palette={palette}
              />
            ))}
          </div>
        )}

        {/* ── Remaining list ── */}
        {remaining.length > 0 && (
          <Section delay={0.1}>
            {/* Category summary chips */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span
                className="text-[12px] font-medium mr-1"
                style={{ color: palette.textDim }}
              >
                Kategorie:
              </span>
              {categoryChips.map(chip => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium"
                  style={{
                    backgroundColor: palette.bgCard,
                    color: palette.textSecondary,
                    border: `1px solid ${palette.borderLight}`,
                  }}
                >
                  <span className="text-xs">{chip.icon}</span>
                  {chip.label}
                  <span
                    className="text-[10px] ml-0.5 font-normal"
                    style={{ color: palette.textDim }}
                  >
                    ({chip.count})
                  </span>
                </span>
              ))}
            </div>

            {/* Accordion list */}
            <div
              className="rounded-2xl overflow-hidden divide-y"
              style={{
                backgroundColor: palette.bgWarm,
                borderColor: palette.borderLight,
                border: `1px solid ${palette.borderLight}`,
              }}
            >
              {visibleRemaining.map((item, i) => (
                <div
                  key={item.name}
                  style={{ borderColor: palette.borderLight }}
                >
                  <ListItem
                    item={item}
                    index={i}
                    palette={palette}
                  />
                </div>
              ))}
            </div>

            {/* Show more */}
            {hiddenCount > 0 && (
              <motion.button
                className="mt-6 mx-auto flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200"
                style={{
                  color: palette.textMuted,
                  backgroundColor: palette.bgCard,
                  border: `1px solid ${palette.borderLight}`,
                }}
                onClick={() => setShowAll(s => !s)}
                whileHover={{
                  borderColor: palette.accent + '60',
                  color: palette.accent,
                }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div
                  animate={{ rotate: showAll ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown size={14} />
                </motion.div>
                {showAll
                  ? 'Pokaż mniej'
                  : `Pokaż pozostałe ${hiddenCount} ${hiddenCount === 1 ? 'danie' : hiddenCount < 5 ? 'dania' : 'dań'}`}
              </motion.button>
            )}
          </Section>
        )}
      </div>
    </section>
  );
};
