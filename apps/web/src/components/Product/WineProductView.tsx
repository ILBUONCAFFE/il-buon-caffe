"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  Minus, Plus, Heart, Share2,
  Check, ChevronRight,
  ArrowRight, Info
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useNotification } from '@/components/Notification/NotificationProvider';
import { getProductBySku } from '@/actions/products';
import { Product } from '@/types';
import { getWineDetailsForProduct } from '@/content/products/wineData';
import type { ProducerContent, ProductRichContent } from '@repo/types';
import { SHOP_ENABLED } from '@/config/launch';
import { ComingSoonBanner } from '@/components/ui/ComingSoonBanner';

import { palette } from './wine/palette';
import { WineProfileSection } from './wine/WineProfileSection';
import { TerroirSection } from './wine/TerroirSection';
import { ServingGuideSection } from './wine/ServingGuideSection';
import { FoodPairingSection } from './wine/FoodPairingSection';
import { AtGlanceBar, AtGlanceGrid } from './wine/AtGlanceBar';
import { FunFactSection } from './wine/FunFactSection';
import { TrustStripSection } from './wine/TrustStripSection';
import { ReviewsSection } from './wine/ReviewsSection';
import { RelatedWinesSection } from './wine/RelatedWinesSection';

interface WineProductViewProps {
  product: Product;
  categoryName: string;
  wineContent?: ProductRichContent | null;
  producerContent?: ProducerContent | null;
}

export const WineProductView = ({ product, categoryName, wineContent, producerContent }: WineProductViewProps) => {
  const { addToCart, items } = useCart();
  const { notify } = useNotification();

  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [cloudStock, setCloudStock] = useState<number | null>(null);
  const [cloudReserved, setCloudReserved] = useState<number>(0);
  const [isMobile, setIsMobile] = useState(false);
  const prefersReducedMotion = useReducedMotion();

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
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(fetchStock, { timeout: 2500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(fetchStock, 800);
    return () => globalThis.clearTimeout(timeoutId);
  }, [product.sku]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

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
  const decorBgY1 = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const decorBgY2 = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const useStaticHero = isMobile || prefersReducedMotion;

  const wineDetails = getWineDetailsForProduct(product, wineContent ?? null);
  const wineClassificationTags = [
    wineDetails.wineColor,
    wineDetails.wineType,
    wineDetails.wineSweetness,
  ].filter((value): value is NonNullable<typeof value> => typeof value === 'string' && value.trim().length > 0);

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

  return (
    <div className="overflow-hidden" style={{ backgroundColor: palette.bg, color: palette.text }}>

      {/* ═══════════════════════════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-[88vh] lg:min-h-[85vh] flex items-center justify-center pt-20 md:pt-24 pb-10 md:pb-12 overflow-hidden">

        {/* Subtle decorative elements */}
        <motion.div
          className="absolute top-0 right-[-10%] hidden md:block w-[800px] h-[800px] rounded-full blur-[160px] pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${palette.accentSoft} 0%, transparent 60%)`,
            opacity: bgOpacity,
            y: decorBgY1
          }}
        />
        <motion.div
          className="absolute bottom-[-10%] left-[-5%] hidden md:block w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(166, 139, 91, 0.08) 0%, transparent 60%)`,
            opacity: bgOpacity,
            y: decorBgY2
          }}
        />

        {/* Optional noise overlay for texture */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-5 md:px-12 lg:px-16 2xl:px-20 h-full flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 lg:gap-20 items-center">

            {/* LEFT: Bottle & Visuals */}
            <motion.div
              className="lg:col-span-5 relative flex justify-center items-center order-2 lg:order-1 h-[50vh] sm:h-[55vh] lg:h-[65vh]"
              style={useStaticHero ? undefined : { y: bottleY, scale: bottleScale }}
            >
              <div className="relative z-10 flex items-center justify-center w-full h-full pb-8 lg:pb-0">
                <motion.div
                  initial={useStaticHero ? false : { opacity: 0, y: 80 }}
                  animate={useStaticHero ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="relative flex justify-center h-full w-full"
                >
                  <Image
                    src={product.image || product.imageUrl || '/assets/placeholder.webp'}
                    alt={product.name}
                    fill
                    priority
                    quality={92}
                    sizes="(max-width: 640px) 70vw, (max-width: 1024px) 45vw, 34vw"
                    className="h-full w-auto object-contain wine-hero-bottle"
                    style={{
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </motion.div>


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
                className="text-[12px] md:text-[13px] mb-6 lg:mb-12 font-medium"
                style={{ color: palette.textDim }}
              >
                <ol className="flex items-center gap-1.5 md:gap-2.5 list-none flex-wrap">
                  <li><Link href="/sklep" className="hover:text-amber-900 transition-colors">Sklep</Link></li>
                  <li aria-hidden="true" className="opacity-50"><ChevronRight size={14} /></li>
                  <li><Link href="/sklep/wino" className="hover:text-amber-900 transition-colors">Wina</Link></li>
                  <li aria-hidden="true" className="opacity-50"><ChevronRight size={14} /></li>
                  <li aria-current="page" style={{ color: palette.textSecondary }}>{product.name}</li>
                </ol>
              </motion.nav>

              {/* Title & Vintage */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mb-6 md:mb-8"
              >
                <h1
                  className="text-[2.25rem] sm:text-5xl lg:text-5xl xl:text-6xl 2xl:text-[4.5rem] font-serif font-normal leading-[1.05] tracking-[-0.01em]"
                  style={{ color: palette.text, wordSpacing: '-0.1em' }}
                >
                  {product.name}
                </h1>
                {product.year && (
                  <p
                    className="text-xl md:text-3xl font-serif italic mt-2 md:mt-3"
                    style={{ color: palette.textMuted }}
                  >
                    Rocznik {product.year}
                  </p>
                )}
              </motion.div>

              {wineClassificationTags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.55 }}
                  className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-5 md:mb-6"
                >
                  {wineClassificationTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border px-3 md:px-3.5 py-1 md:py-1.5 text-[10px] md:text-[11px] font-semibold uppercase tracking-[0.16em] md:tracking-[0.18em] backdrop-blur-sm"
                      style={{
                        borderColor: `${palette.gold}55`,
                        backgroundColor: 'rgba(255,255,255,0.54)',
                        color: palette.textSecondary,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </motion.div>
              )}

              {/* Price */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="flex items-baseline gap-1.5 mb-8 md:mb-10"
              >
                <span className="text-[2.5rem] lg:text-5xl xl:text-6xl font-serif font-medium" style={{ color: palette.text }}>
                  {product.price.toFixed(0)}
                </span>
                <span className="text-lg lg:text-2xl font-light tracking-tight" style={{ color: palette.textMuted }}>
                  ,{(product.price % 1).toFixed(2).slice(2)} zł
                </span>
              </motion.div>

              {SHOP_ENABLED ? (
                <>
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
                    className="flex flex-row gap-3 mb-7 md:mb-8"
                  >
                    {/* Quantity Control */}
                    <div
                      className="flex items-center h-14 rounded-xl overflow-hidden backdrop-blur-md shrink-0 w-32 sm:w-36"
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
                      className="relative overflow-hidden flex-1 h-14 px-5 sm:px-8 font-bold uppercase tracking-[0.12em] text-[11px] flex items-center justify-center gap-2 sm:gap-3 rounded-xl transition-all duration-300"
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
                    className="flex flex-wrap gap-x-6 gap-y-3 sm:gap-8 text-[12px] md:text-[13px] font-medium"
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
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                >
                  <ComingSoonBanner variant="shop" compact />
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>


      </section>

      {/* AT-A-GLANCE BAR — sticky desktop, grid mobile */}
      <AtGlanceBar wineDetails={wineDetails} palette={palette} origin={product.origin} />
      <AtGlanceGrid wineDetails={wineDetails} palette={palette} origin={product.origin} />

      {/* WINE PROFILE — characteristic bars */}
      <WineProfileSection wineDetails={wineDetails} palette={palette} />

      {/* TERROIR & WINERY */}
      <TerroirSection wineDetails={wineDetails} palette={palette} origin={product.origin} producer={producerContent ?? null} />

      {/* FUN FACT — narrative break */}
      <FunFactSection wineDetails={wineDetails} palette={palette} />

      {/* SERVING GUIDE — 4 tiles incl. glass */}
      <ServingGuideSection wineDetails={wineDetails} palette={palette} />

      {/* FOOD PAIRING */}
      <FoodPairingSection wineDetails={wineDetails} palette={palette} />

      {/* TRUST STRIP */}
      <TrustStripSection palette={palette} />

      {/* REVIEWS — UI only, empty state */}
      <ReviewsSection palette={palette} productName={product.name} />

      {/* RELATED WINES */}
      <RelatedWinesSection palette={palette} currentSku={product.sku} />

    </div>
  );
};
