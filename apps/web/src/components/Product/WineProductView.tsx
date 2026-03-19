"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  Minus, Plus, Heart, Share2, 
  Check, ChevronRight,
  Grape, Globe, Wine, Thermometer,
  Clock, Award, Leaf, MapPin, Mountain,
  Droplets, Star, ArrowRight, Info
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useNotification } from '@/components/Notification/NotificationProvider';
import { getProductBySku } from '@/actions/products';
import { Product } from '@/types';
import { getWineDetailsForProduct, getFlagPath } from '@/content/products/wineData';

interface WineProductViewProps {
  product: Product;
  categoryName: string;
}

// Design tokens — light only
const palette = {
  bg: '#FDFAF6',
  bgWarm: '#F7F2EB',
  bgCard: '#FFFFFF',
  bgMuted: '#F0EBE3',
  text: '#1C1714',
  textSecondary: '#52483D',
  textMuted: '#8A7E72',
  textDim: '#B5AA9E',
  accent: '#7B2D3B',      // deep wine red
  accentLight: '#9E4A58',
  accentSoft: 'rgba(123, 45, 59, 0.08)',
  accentSofter: 'rgba(123, 45, 59, 0.04)',
  gold: '#A68B5B',
  goldLight: '#C4A97D',
  border: '#E8E0D6',
  borderLight: '#F0EBE4',
  shadow: '0 1px 3px rgba(28, 23, 20, 0.04), 0 8px 24px rgba(28, 23, 20, 0.06)',
  shadowHover: '0 2px 8px rgba(28, 23, 20, 0.06), 0 16px 40px rgba(28, 23, 20, 0.1)',
};

// Country code → Polish genitive name (for "Flaga X" grammar)
const countryCodeToName: Record<string, string> = {
  es: 'Hiszpanii',
  it: 'Włoch',
  fr: 'Francji',
  pt: 'Portugalii',
  ar: 'Argentyny',
  cl: 'Chile',
  de: 'Niemiec',
  at: 'Austrii',
  au: 'Australii',
  nz: 'Nowej Zelandii',
  us: 'Stanów Zjednoczonych',
  za: 'Republiki Południowej Afryki',
  ge: 'Gruzji',
  gr: 'Grecji',
  hu: 'Węgier',
  ro: 'Rumunii',
  hr: 'Chorwacji',
  si: 'Słowenii',
  md: 'Mołdawii',
};

// Flag component — renders country flag from /assets/flags/
const CountryFlag = ({ countryCode, size = 20, className = '' }: { countryCode: string; size?: number; className?: string }) => {
  const flagPath = getFlagPath(countryCode);
  if (!flagPath) return null;
  
  return (
    <Image
      src={flagPath}
      alt={`Flaga ${countryCodeToName[countryCode.toLowerCase()] ?? countryCode.toUpperCase()}`}
      width={size}
      height={Math.round(size * 0.67)}
      className={`inline-block rounded-sm object-cover ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
      unoptimized
    />
  );
};

// Animated section wrapper
const Section = ({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

// ─────────────────────────────────────────────────────────
// FOOD PAIRING — minimalistyczna lista z hover tooltip
// ─────────────────────────────────────────────────────────

const INITIAL_VISIBLE = 4;

interface PaletteType {
  bg: string; bgWarm: string; bgCard: string; bgMuted: string;
  text: string; textSecondary: string; textMuted: string; textDim: string;
  accent: string; accentLight: string; accentSoft: string; accentSofter: string;
  gold: string; goldLight: string; border: string; borderLight: string;
  shadow: string; shadowHover: string;
}

interface FoodPairingSectionProps {
  items: import('@/content/products/wineData').WineFoodPairing[];
  palette: PaletteType;
}

const FoodPairingSection = ({ items, palette }: FoodPairingSectionProps) => {
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

// CharacteristicBar component
const CharacteristicBar = ({ label, value, delay = 0 }: { label: string; value: number; delay?: number }) => (
  <motion.div 
    className="flex items-center gap-4"
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
  >
    <span className="text-sm w-24 shrink-0" style={{ color: palette.textMuted }}>{label}</span>
    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: palette.bgMuted }}>
      <motion.div
        className="h-full rounded-full"
        style={{ 
          background: `linear-gradient(90deg, ${palette.accent}, ${palette.accentLight})`,
        }}
        initial={{ width: 0 }}
        whileInView={{ width: `${value}%` }}
        viewport={{ once: true }}
        transition={{ delay: delay + 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
    <span className="text-sm font-medium w-10 text-right" style={{ color: palette.textSecondary }}>{value}%</span>
  </motion.div>
);

export const WineProductView = ({ product, categoryName }: WineProductViewProps) => {
  const router = useRouter();
  const { addToCart, items } = useCart();
  const { notify } = useNotification();
  
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<'eye' | 'nose' | 'palate'>('nose');
  const [isFavorite, setIsFavorite] = useState(false);
  const [cloudStock, setCloudStock] = useState<number | null>(null);
  const [cloudReserved, setCloudReserved] = useState<number>(0);

  useEffect(() => {
    const fetchStock = async () => {
      if (!product.sku) return;
      try {
        const freshProduct = await getProductBySku(product.sku);
        if (freshProduct && typeof freshProduct.stock === 'number') {
          setCloudStock(freshProduct.stock);
          setCloudReserved(freshProduct.reserved || 0);
        }
      } catch (err) {
        console.error("Failed to fetch stock", err);
      }
    };
    fetchStock();
  }, [product.sku]);

  const cartItem = items.find(item => item.sku === product.sku);
  const inCartQuantity = cartItem?.quantity || 0;
  const realStock = cloudStock !== null ? Math.max(0, cloudStock - cloudReserved) : null;
  const availableToBuy = realStock !== null ? Math.max(0, realStock - inCartQuantity) : null;

  const handleIncreaseQuantity = () => {
    if (availableToBuy !== null && quantity >= availableToBuy) {
      notify({
        message: `W magazynie zostało tylko ${realStock} szt. (w koszyku masz: ${inCartQuantity} szt.)`,
        tone: "error",
        icon: <Info size={20} strokeWidth={2.2} />,
        duration: 4000,
      });
      return;
    }
    setQuantity(q => q + 1);
  };
  
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const bottleY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const bottleScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  
  const wineDetails = getWineDetailsForProduct(product);
  const flagPath = getFlagPath(wineDetails.countryCode);

  const handleAddToCart = () => {
    if (availableToBuy !== null && quantity > availableToBuy) {
      notify({
        message: `Nie możemy dodać tylu sztuk. Zostało: ${realStock} szt.`,
        tone: "error",
        icon: <Info size={20} strokeWidth={2.2} />,
        duration: 3500,
      });
      return;
    }
    
    addToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      setQuantity(1);
    }, 2000);
  };

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
    <div className="overflow-hidden" style={{ backgroundColor: palette.bg, color: palette.text }}>

      {/* ═══════════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-24 pb-12 overflow-hidden">
        
        {/* Subtle decorative elements */}
        <motion.div 
          className="absolute top-0 right-[-10%] w-[800px] h-[800px] rounded-full blur-[160px] pointer-events-none"
          style={{ 
            background: `radial-gradient(circle, ${palette.accentSoft} 0%, transparent 60%)`,
            opacity: bgOpacity,
            y: useTransform(scrollYProgress, [0, 1], [0, -100])
          }}
        />
        <motion.div 
          className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
          style={{ 
            background: `radial-gradient(circle, rgba(166, 139, 91, 0.08) 0%, transparent 60%)`,
            opacity: bgOpacity,
            y: useTransform(scrollYProgress, [0, 1], [0, 100])
          }}
        />
        
        {/* Optional noise overlay for texture */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 lg:px-16 2xl:px-20 h-full flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            
            {/* LEFT: Bottle & Visuals */}
            <motion.div 
              className="lg:col-span-5 relative flex justify-center items-center order-2 lg:order-1 h-[60vh] lg:h-[75vh]"
              style={{ y: bottleY, scale: bottleScale }}
            >
              <div className="relative z-10 flex items-center justify-center w-full h-full pb-8 lg:pb-0">
                <motion.div
                  initial={{ opacity: 0, y: 80 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex justify-center h-full w-full"
                >
                  <img 
                    src={product.image || product.imageUrl} 
                    alt={product.name}
                    className="h-full w-auto object-contain"
                    style={{ 
                      filter: 'drop-shadow(0 40px 80px rgba(28, 23, 20, 0.15)) drop-shadow(0 10px 20px rgba(28, 23, 20, 0.1))',
                      maxHeight: '100%'
                    }}
                  />
                </motion.div>

                {/* Vintage Badge */}
                {product.year && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotate: -15, x: 20 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0, x: 0 }}
                    transition={{ delay: 0.9, duration: 0.8, ease: "easeOut" }}
                    className="absolute top-[15%] -left-4 lg:-left-12 z-20"
                  >
                    <div 
                      className="w-20 h-20 lg:w-24 lg:h-24 rounded-full flex flex-col items-center justify-center backdrop-blur-md"
                      style={{ 
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.8) 100%)',
                        border: '1px solid rgba(255, 255, 255, 1)',
                        boxShadow: '0 10px 30px rgba(28, 23, 20, 0.08)',
                      }}
                    >
                      <span className="text-2xl lg:text-3xl font-serif font-medium bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(135deg, ${palette.accent}, #60212E)` }}>
                        {product.year}
                      </span>
                      <span className="text-[8px] lg:text-[9px] uppercase tracking-[0.25em] font-bold mt-0.5" style={{ color: palette.textDim }}>Rocznik</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* RIGHT: Details */}
            <motion.div 
              className="lg:col-span-7 order-1 lg:order-2 flex flex-col justify-center"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Breadcrumb */}
              <motion.nav 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                aria-label="Nawigacja okruszkowa" 
                className="text-[13px] mb-8 lg:mb-12 font-medium" 
                style={{ color: palette.textDim }}
              >
                <ol className="flex items-center gap-2.5 list-none">
                  <li><Link href="/sklep" className="hover:text-amber-900 transition-colors">Sklep</Link></li>
                  <li aria-hidden="true" className="opacity-50"><ChevronRight size={14} /></li>
                  <li><Link href="/sklep/wino" className="hover:text-amber-900 transition-colors">Wina</Link></li>
                  <li aria-hidden="true" className="opacity-50"><ChevronRight size={14} /></li>
                  <li aria-current="page" style={{ color: palette.textSecondary }}>{product.name}</li>
                </ol>
              </motion.nav>

              {/* Category Tag */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex items-center gap-4 mb-4"
              >
                <div className="h-px w-8" style={{ backgroundColor: palette.accent }} />
                <span className="uppercase tracking-[0.3em] text-[10px] font-bold" style={{ color: palette.accent }}>
                  Selekcja Premium
                </span>
              </motion.div>

              {/* Title */}
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-[4.5rem] font-serif font-normal mb-8 leading-[1.05] tracking-[-0.01em]"
                style={{ color: palette.text, wordSpacing: '-0.1em' }}
              >
                {product.name}
              </motion.h1>

              {/* Minimalist Properties: Origin, Grape, Alcohol */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="flex flex-wrap items-center gap-4 mb-10 text-[13px] font-medium tracking-wide uppercase"
                style={{ color: palette.textSecondary }}
              >
                {product.origin && (
                  <div className="flex items-center gap-2">
                    {wineDetails.countryCode ? (
                      <CountryFlag countryCode={wineDetails.countryCode} size={16} className="rounded-sm opacity-90 grayscale-[20%]" />
                    ) : (
                      <Globe size={14} style={{ color: palette.gold }} />
                    )}
                    <span className="pt-[1px]">{product.origin}</span>
                  </div>
                )}
                
                {product.origin && <div className="w-1 h-1 rounded-full opacity-30" style={{ backgroundColor: palette.textMuted }} />}
                
                <div className="flex items-center gap-2">
                  <Grape size={14} style={{ color: palette.gold }} />
                  <span className="pt-[1px]">{wineDetails.grape}</span>
                </div>
                
                <div className="w-1 h-1 rounded-full opacity-30" style={{ backgroundColor: palette.textMuted }} />
                
                <div className="flex items-center gap-2">
                  <Wine size={14} style={{ color: palette.gold }} />
                  <span className="pt-[1px]">{wineDetails.alcohol}</span>
                </div>
              </motion.div>

              {/* Price */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex items-baseline gap-1.5 mb-10"
              >
                <span className="text-4xl lg:text-5xl xl:text-6xl font-serif font-medium" style={{ color: palette.text }}>
                  {product.price.toFixed(0)}
                </span>
                <span className="text-xl lg:text-2xl font-light tracking-tight" style={{ color: palette.textMuted }}>
                  ,{(product.price % 1).toFixed(2).slice(2)} zł
                </span>
              </motion.div>

              {/* Minimalist Quick Specs */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="flex items-center gap-10 mb-10"
              >
                {[
                  { icon: Droplets, label: "Ciało", value: wineDetails.body },
                  { icon: Thermometer, label: "Temp.", value: wineDetails.servingTemp },
                  { icon: Clock, label: "Dojrz.", value: wineDetails.aging },
                ].map((spec, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2" style={{ color: palette.textMuted }}>
                      <spec.icon size={16} strokeWidth={2} style={{ color: palette.accent }} />
                      <p className="text-[10px] uppercase tracking-[0.2em] font-semibold">{spec.label}</p>
                    </div>
                    <p className="font-serif font-medium text-[15px] leading-none text-left" style={{ color: palette.text }}>{spec.value}</p>
                  </div>
                ))}
              </motion.div>

              {/* Stock display */}
              {availableToBuy !== null && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                  className="mb-5 text-[13px] font-medium"
                >
                  {availableToBuy > 0 ? (
                    <div className="flex items-center gap-2" style={{ color: '#2D6A4F' }}>
                      <div className="w-2 h-2 rounded-full bg-[#2D6A4F] animate-pulse" />
                      Dostępne: {availableToBuy} szt. {inCartQuantity > 0 ? <span className="text-[#52483D] opacity-70 ml-1">(+{inCartQuantity} w koszyku)</span> : ''}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2" style={{ color: palette.accent }}>
                      <div className="w-2 h-2 rounded-full bg-[#7B2D3B]" />
                      Brak na stanie {inCartQuantity > 0 ? <span className="text-[#52483D] opacity-70 ml-1">(dodano {inCartQuantity} szt. do koszyka)</span> : ''}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.95 }}
                className="flex flex-col sm:flex-row gap-3 mb-8"
              >
                {/* Quantity Control */}
                <div 
                  className="flex items-center h-[3.5rem] rounded-xl overflow-hidden backdrop-blur-md shrink-0 sm:w-36 w-full"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 1)', 
                    boxShadow: '0 2px 8px rgba(28, 23, 20, 0.04)'
                  }}
                >
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex-1 h-full flex items-center justify-center hover:bg-black/5 transition-colors active:bg-black/10"
                    style={{ color: palette.textMuted }}
                  >
                    <Minus size={16} strokeWidth={1.5} />
                  </button>
                  <span className="w-12 text-center font-serif text-xl select-none" style={{ color: palette.text }}>{quantity}</span>
                  <button 
                    onClick={handleIncreaseQuantity}
                    className="flex-1 h-full flex items-center justify-center hover:bg-black/5 transition-colors active:bg-black/10"
                    style={{ color: palette.textMuted }}
                  >
                    <Plus size={16} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Add to Cart Button */}
                <motion.button
                  onClick={handleAddToCart}
                  disabled={isAdded || (availableToBuy !== null && availableToBuy === 0)}
                  className="relative overflow-hidden flex-1 h-[3.5rem] px-8 font-bold uppercase tracking-[0.12em] text-[11px] flex items-center justify-center gap-3 rounded-xl transition-all duration-300"
                  style={{ 
                    background: isAdded ? '#2D6A4F' : (availableToBuy === 0 ? palette.textMuted : `linear-gradient(135deg, ${palette.accent} 0%, #60212E 100%)`),
                    color: '#fff',
                    cursor: availableToBuy === 0 ? 'not-allowed' : 'pointer',
                    boxShadow: isAdded ? '0 10px 20px rgba(45,106,79,0.2)' : (availableToBuy === 0 ? 'none' : `0 10px 25px ${palette.accent}40`)
                  }}
                  whileHover={{ 
                    scale: availableToBuy === 0 ? 1 : 1.01, 
                    boxShadow: availableToBuy === 0 ? 'none' : `0 15px 35px ${palette.accent}50` 
                  }}
                  whileTap={{ scale: availableToBuy === 0 ? 1 : 0.98 }}
                >
                  {/* Shimmer effect for premium feel */}
                  {!isAdded && availableToBuy !== 0 && (
                    <motion.div 
                      className="absolute inset-0 w-[50%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      initial={{ x: '-200%' }}
                      animate={{ x: '300%' }}
                      transition={{ 
                        repeat: Infinity, 
                        repeatType: 'loop', 
                        duration: 3, 
                        repeatDelay: 5,
                        ease: "easeInOut" 
                      }}
                    />
                  )}
                  
                  {isAdded ? (
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-2"
                    >
                      <Check size={18} strokeWidth={2.5} /> Dodano do koszyka
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-2 relative z-10">
                      Dodaj do koszyka 
                      <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
                    </div>
                  )}
                </motion.button>
              </motion.div>

              {/* Secondary Actions */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="flex gap-8 text-[13px] font-medium" 
                style={{ color: palette.textMuted }}
              >
                <button 
                  className="flex items-center gap-2.5 hover:text-[#7B2D3B] transition-colors group"
                  onClick={() => setIsFavorite(!isFavorite)}
                >
                  <Heart 
                    size={16} 
                    strokeWidth={1.5}
                    fill={isFavorite ? palette.accent : 'transparent'} 
                    color={isFavorite ? palette.accent : "currentColor"} 
                    className="transition-transform duration-300 group-hover:scale-110"
                  />
                  <span>{isFavorite ? 'Ulubione' : 'Dodaj do ulubionych'}</span>
                </button>
                <button 
                  className="flex items-center gap-2.5 hover:text-[#7B2D3B] transition-colors group"
                  onClick={async () => {
                    const url = window.location.href;
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: product.name,
                          text: `Sprawdź to wspaniałe wino: ${product.name}`,
                          url: url,
                        });
                      } catch (error) {
                        // User canceled or share failed
                        console.log('Error sharing', error);
                      }
                    } else {
                      try {
                        await navigator.clipboard.writeText(url);
                        notify({ message: "Pomyślnie skopiowano link do schowka!", tone: "success", duration: 3000 });
                      } catch (err) {
                        notify({ message: "Nie udało się skopiować linku.", tone: "error", duration: 3000 });
                      }
                    }
                  }}
                >
                  <Share2 size={16} strokeWidth={1.5} className="transition-transform duration-300 group-hover:scale-110" />
                  <span>Udostępnij</span>
                </button>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.35em]" style={{ color: palette.textDim }}>Przewiń</span>
          <div className="w-px h-16 overflow-hidden relative">
            <motion.div 
              className="absolute inset-0 w-full"
              style={{ background: `linear-gradient(to bottom, transparent, ${palette.accent}, transparent)` }}
              animate={{ y: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          WINE PROFILE SECTION
      ═══════════════════════════════════════════════════════════ */}
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

      {/* ═══════════════════════════════════════════════════════════
          TERROIR & WINERY
      ═══════════════════════════════════════════════════════════ */}
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
                    wytwarzania wyjątkowych win w regionie {product.origin || 'Hiszpanii'}. Położona na wysokości {wineDetails.altitude},
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

      {/* ═══════════════════════════════════════════════════════════
          FOOD PAIRING — minimalistyczna lista z hover tooltip
      ═══════════════════════════════════════════════════════════ */}
      {wineDetails.foodPairing.length > 0 && (
        <FoodPairingSection items={wineDetails.foodPairing} palette={palette} />
      )}

      {/* ═══════════════════════════════════════════════════════════
          SERVING GUIDE
      ═══════════════════════════════════════════════════════════ */}
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

    </div>
  );
};
