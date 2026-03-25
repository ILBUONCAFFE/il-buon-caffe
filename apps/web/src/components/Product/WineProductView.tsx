"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'motion/react';
import {
  Minus, Plus, Heart, Share2,
  Check, ChevronRight,
  Grape, Globe, Wine, Thermometer,
  Clock, Droplets, ArrowRight, Info
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useNotification } from '@/components/Notification/NotificationProvider';
import { getProductBySku } from '@/actions/products';
import { Product } from '@/types';
import { getWineDetailsForProduct } from '@/content/products/wineData';

import { palette } from './wine/palette';
import { CountryFlag } from './wine/CountryFlag';
import { WineProfileSection } from './wine/WineProfileSection';
import { TerroirSection } from './wine/TerroirSection';
import { FoodPairingSection } from './wine/FoodPairingSection';
import { ServingGuideSection } from './wine/ServingGuideSection';

interface WineProductViewProps {
  product: Product;
  categoryName: string;
}

export const WineProductView = ({ product, categoryName }: WineProductViewProps) => {
  const { addToCart, items } = useCart();
  const { notify } = useNotification();

  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
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
                className="mb-4"
              >
                <span className="uppercase tracking-[0.2em] text-[11px] font-semibold" style={{ color: palette.textDim }}>
                  Wino czerwone
                </span>
              </motion.div>

              {/* Title & Vintage */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mb-8"
              >
                <h1
                  className="text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-[4.5rem] font-serif font-normal leading-[1.05] tracking-[-0.01em]"
                  style={{ color: palette.text, wordSpacing: '-0.1em' }}
                >
                  {product.name}
                </h1>
                {product.year && (
                  <p 
                    className="text-2xl md:text-3xl font-serif italic mt-3"
                    style={{ color: palette.textMuted }}
                  >
                    Rocznik {product.year}
                  </p>
                )}
              </motion.div>

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


      </section>

      {/* ═══════════════════════════════════════════════════════════
          WINE PROFILE SECTION
      ═══════════════════════════════════════════════════════════ */}
      <WineProfileSection wineDetails={wineDetails} palette={palette} />

      {/* ═══════════════════════════════════════════════════════════
          TERROIR & WINERY
      ═══════════════════════════════════════════════════════════ */}
      <TerroirSection wineDetails={wineDetails} palette={palette} origin={product.origin} />

      {/* ═══════════════════════════════════════════════════════════
          FOOD PAIRING
      ═══════════════════════════════════════════════════════════ */}
      {wineDetails.foodPairing.length > 0 && (
        <FoodPairingSection items={wineDetails.foodPairing} palette={palette} />
      )}

      {/* ═══════════════════════════════════════════════════════════
          SERVING GUIDE
      ═══════════════════════════════════════════════════════════ */}
      <ServingGuideSection wineDetails={wineDetails} palette={palette} />

    </div>
  );
};
