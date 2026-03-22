"use client";

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { Section } from './Section';
import type { PaletteType } from './palette';

const INITIAL_VISIBLE = 4;

interface FoodPairingSectionProps {
  items: import('@/content/products/wineData').WineFoodPairing[];
  palette: PaletteType;
}

export const FoodPairingSection = ({ items, palette }: FoodPairingSectionProps) => {
  const [expanded, setExpanded] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; side: 'top' | 'bottom' }>({ x: 0, y: 0, side: 'top' });
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const baseItems = items.slice(0, INITIAL_VISIBLE);
  const extraItems = items.slice(INITIAL_VISIBLE);
  const hasMore = extraItems.length > 0;

  const handleMouseEnter = useCallback((idx: number) => {
    const el = cardRefs.current.get(idx);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const side = spaceBelow < 160 ? 'bottom' : 'top';
    setTooltipPos({ x: rect.left + rect.width / 2, y: side === 'top' ? rect.bottom : rect.top, side });
    setHoveredIdx(idx);
  }, []);

  const handleMouseLeave = useCallback(() => setHoveredIdx(null), []);
  const hovered = hoveredIdx !== null ? items[hoveredIdx] : null;

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.88, y: 12 },
    visible: (i: number) => ({
      opacity: 1, scale: 1, y: 0,
      transition: { duration: 0.32, delay: i * 0.055, ease: [0.22, 1, 0.36, 1] as const },
    }),
    exit: { opacity: 0, scale: 0.88, y: 10, transition: { duration: 0.2, ease: [0.55, 0, 1, 0.45] as const } },
  };

  return (
    <section className="py-24" style={{ backgroundColor: palette.bgWarm }}>
      <div className="container mx-auto px-6 md:px-12 lg:px-20">

        {/* Header */}
        <Section className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: palette.accentSoft }}>
              <span className="text-sm">🍽️</span>
            </div>
            <span className="uppercase tracking-[0.3em] text-[11px] font-semibold" style={{ color: palette.accent }}>
              Parowanie
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif" style={{ color: palette.text }}>
            Idealne Połączenia
          </h2>
        </Section>

        {/* Siatka */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">

          {/* Zawsze widoczne 4 karty */}
          {baseItems.map((item, idx) => (
            <motion.div
              key={item.name}
              ref={el => { if (el) cardRefs.current.set(idx, el); else cardRefs.current.delete(idx); }}
              custom={idx}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              onMouseEnter={() => handleMouseEnter(idx)}
              onMouseLeave={handleMouseLeave}
              className="rounded-2xl overflow-hidden cursor-default flex flex-col"
              style={{
                backgroundColor: palette.bgCard,
                border: `1px solid ${hoveredIdx === idx ? palette.accent + '40' : palette.borderLight}`,
                boxShadow: hoveredIdx === idx ? `0 8px 32px ${palette.accent}18` : '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
                transform: hoveredIdx === idx ? 'translateY(-4px)' : 'translateY(0)',
              }}
            >
              <div className="w-full overflow-hidden flex items-center justify-center" style={{ aspectRatio: '1 / 1', backgroundColor: palette.bgMuted }}>
                <img
                  src={encodeURI(item.imageUrl ?? '')}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain"
                  style={{ transition: 'transform 0.4s ease', transform: hoveredIdx === idx ? 'scale(1.07)' : 'scale(1)' }}
                  loading="lazy"
                />
              </div>
              <div className="px-3 py-2.5">
                <span
                  className="font-serif text-sm leading-snug transition-colors duration-200 block"
                  style={{ color: hoveredIdx === idx ? palette.text : palette.textSecondary }}
                >
                  {item.name}
                </span>
              </div>
            </motion.div>
          ))}

          {/* Wysuwane karty z AnimatePresence */}
          <AnimatePresence>
            {expanded && extraItems.map((item, i) => {
              const idx = INITIAL_VISIBLE + i;
              return (
                <motion.div
                  key={item.name}
                  ref={el => { if (el) cardRefs.current.set(idx, el); else cardRefs.current.delete(idx); }}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  onMouseEnter={() => handleMouseEnter(idx)}
                  onMouseLeave={handleMouseLeave}
                  className="rounded-2xl overflow-hidden cursor-default flex flex-col"
                  style={{
                    backgroundColor: palette.bgCard,
                    border: `1px solid ${hoveredIdx === idx ? palette.accent + '40' : palette.borderLight}`,
                    boxShadow: hoveredIdx === idx ? `0 8px 32px ${palette.accent}18` : '0 1px 4px rgba(0,0,0,0.04)',
                    transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.25s',
                    transform: hoveredIdx === idx ? 'translateY(-4px)' : 'translateY(0)',
                  }}
                >
                  <div className="w-full overflow-hidden flex items-center justify-center" style={{ aspectRatio: '1 / 1', backgroundColor: palette.bgMuted }}>
                    <img
                      src={encodeURI(item.imageUrl ?? '')}
                      alt={item.name}
                      className="max-w-full max-h-full object-contain"
                      style={{ transition: 'transform 0.4s ease', transform: hoveredIdx === idx ? 'scale(1.07)' : 'scale(1)' }}
                      loading="lazy"
                    />
                  </div>
                  <div className="px-3 py-2.5">
                    <span
                      className="font-serif text-sm leading-snug transition-colors duration-200 block"
                      style={{ color: hoveredIdx === idx ? palette.text : palette.textSecondary }}
                    >
                      {item.name}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

        </div>

        {/* Rozwiń */}
        {hasMore && (
          <motion.button
            layout
            className="mt-8 flex items-center gap-2 text-sm font-medium transition-colors duration-200"
            style={{ color: palette.textMuted }}
            onClick={() => setExpanded(e => !e)}
            whileHover={{ color: palette.accent }}
          >
            <motion.div
              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{ border: '1.5px solid currentColor' }}
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronRight size={11} className="-rotate-90" style={{ display: 'block' }} />
            </motion.div>
            {expanded ? 'Zwiń' : `Pokaż wszystkie ${items.length} połączeń`}
          </motion.button>
        )}
      </div>

      {/* Floating tooltip */}
      {hovered && (
        <motion.div
          key={hoveredIdx}
          initial={{ opacity: 0, y: tooltipPos.side === 'top' ? 6 : -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltipPos.x,
            ...(tooltipPos.side === 'top'
              ? { top: tooltipPos.y + 8 }
              : { bottom: window.innerHeight - tooltipPos.y + 8 }),
            transform: 'translateX(-50%)',
            width: 220,
          }}
        >
          <div
            className="rounded-xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: palette.bgCard, border: `1px solid ${palette.border}` }}
          >
            <div className="px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: palette.accent }}>
                {hovered.name}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: palette.textMuted }}>
                {hovered.description}
              </p>
            </div>
          </div>
          {/* Strzałka */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              ...(tooltipPos.side === 'top' ? { top: -6 } : { bottom: -6 }),
              width: 0, height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              ...(tooltipPos.side === 'top'
                ? { borderBottom: `6px solid ${palette.border}` }
                : { borderTop: `6px solid ${palette.border}` }),
            }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              ...(tooltipPos.side === 'top' ? { top: -5 } : { bottom: -5 }),
              width: 0, height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              ...(tooltipPos.side === 'top'
                ? { borderBottom: `5px solid ${palette.bgCard}` }
                : { borderTop: `5px solid ${palette.bgCard}` }),
            }}
          />
        </motion.div>
      )}
    </section>
  );
};
