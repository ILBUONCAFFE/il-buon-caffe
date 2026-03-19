"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView } from "motion/react";
import { 
  Clock, 
  MapPin, 
  Phone, 
  ArrowDown, 
  Coffee, 
  Wine, 
  CakeSlice,
  Star,
  ChevronRight,
  Instagram,
  Facebook
} from "lucide-react";
import { CAFE_MENU } from "@/lib/constants";

// Types
interface MenuItem {
  name: string;
  price: string;
  description?: string;
  isSpecial?: boolean;
}

interface MenuCategory {
  category: string;
  items: MenuItem[];
}

// Menu Item Component
const MenuItemCard = ({ 
  item, 
  index, 
  variant = "light" 
}: { 
  item: MenuItem; 
  index: number;
  variant?: "light" | "dark";
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.05 }}
    className={`group py-5 border-b transition-colors duration-300 ${
      variant === "dark" 
        ? "border-white/10 hover:border-white/30" 
        : "border-brand-200/50 hover:border-brand-300"
    } ${item.isSpecial ? "pl-4 border-l-2 border-l-brand-500" : ""}`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h4 className={`font-serif text-lg md:text-xl transition-colors duration-300 ${
          variant === "dark"
            ? "text-white group-hover:text-brand-300"
            : "text-brand-900 group-hover:text-brand-600"
        }`}>
          {item.name}
        </h4>
        {item.description && (
          <p className={`text-sm mt-1 leading-relaxed ${
            variant === "dark" ? "text-white/50" : "text-brand-700"
          }`}>
            {item.description}
          </p>
        )}
      </div>
      <span className={`font-mono text-lg font-bold whitespace-nowrap ${
        variant === "dark" ? "text-brand-300" : "text-brand-900"
      }`}>
        {item.price}
      </span>
    </div>
  </motion.div>
);

// Menu Section Component
const MenuSection = ({ 
  data, 
  number, 
  icon: Icon,
  variant = "light",
  description 
}: { 
  data: MenuCategory;
  number: string;
  icon: React.ElementType;
  variant?: "light" | "dark";
  description: string;
}) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <div ref={sectionRef} className={`py-16 md:py-24 ${variant === "dark" ? "bg-brand-900" : "bg-white"}`}>
      <div className="container mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Header */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-32">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    variant === "dark" ? "bg-white/10" : "bg-brand-100"
                  }`}>
                    <Icon className={`w-6 h-6 ${variant === "dark" ? "text-brand-300" : "text-brand-700"}`} />
                  </div>
                  <span className={`font-mono text-sm tracking-wider ${
                    variant === "dark" ? "text-white/30" : "text-brand-300"
                  }`}>
                    {number}
                  </span>
                </div>
                
                <h3 className={`text-4xl md:text-5xl font-serif mb-4 ${
                  variant === "dark" ? "text-white" : "text-brand-900"
                }`}>
                  {data.category}
                </h3>
                
                <p className={`text-lg leading-relaxed ${
                  variant === "dark" ? "text-white/60" : "text-brand-600"
                }`}>
                  {description}
                </p>
              </motion.div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="lg:col-span-8">
            <div className={`rounded-2xl p-6 md:p-10 ${
              variant === "dark" 
                ? "bg-white/5 border border-white/10" 
                : "bg-brand-50/50 border border-brand-100"
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                {data.items.map((item, idx) => (
                  <MenuItemCard 
                    key={item.name} 
                    item={item} 
                    index={idx} 
                    variant={variant}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CafeClient: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"menu" | "about">("menu");
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1]);

  const classicMenu = CAFE_MENU[0];
  const specialMenu = CAFE_MENU[1];
  const dessertMenu = CAFE_MENU[2];

  return (
    <div className="bg-brand-beige min-h-screen">
      
      {/* ===== HERO SECTION ===== */}
      <section 
        ref={containerRef} 
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* Background */}
        <motion.div 
          style={{ y: heroY, scale: heroScale }}
          className="absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/90 z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_20%,rgba(255,255,255,0.08),transparent_60%)] z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_120%,rgba(0,0,0,0.7),transparent_60%)] z-10" />
          <Image
            src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2694&auto=format&fit=crop"
            alt="Wnętrze kawiarni Il Buon Caffe"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </motion.div>

        {/* Content */}
        <motion.div 
          style={{ opacity: heroOpacity }}
          className="relative z-20 text-center px-6 max-w-5xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs font-medium tracking-[0.2em] uppercase text-white/90">
              <Star className="w-3.5 h-3.5 fill-brand-400 text-brand-400" />
              Od 2003 roku w Koszalinie
            </span>
          </motion.div>

          {/* Title */}
          <h1 className="mb-8">
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-medium text-white tracking-tight"
              >
                Kawiarnia
              </motion.span>
            </span>
            <span className="block overflow-hidden -mt-1 md:-mt-2">
              <motion.span
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-handwriting text-brand-300"
              >
                & Delikatesy
              </motion.span>
            </span>
          </h1>

          {/* Quote */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
            className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed mb-12"
          >
            "Kawa to język, w którym milczenie smakuje najlepiej."
          </motion.p>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex justify-center gap-4"
          >
            <motion.div
              whileHover={{ y: -3, scale: 1.03 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
            >
              <button
                onClick={() => {
                  setActiveTab("menu");
                  document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group relative inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-900 rounded-full font-bold text-sm uppercase tracking-widest transition-all duration-300 shadow-lg shadow-black/25 hover:shadow-black/35 overflow-hidden"
              >
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_20%_20%,rgba(255,255,255,0.85),transparent_60%)] opacity-0"
                  whileHover={{ opacity: 0.7 }}
                  transition={{ duration: 0.35 }}
                />
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0"
                  whileHover={{ x: "200%", opacity: 0.9 }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
                <Coffee className="relative z-10 w-4 h-4" />
                <span className="relative z-10">Zobacz menu</span>
              </button>
            </motion.div>
            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
            >
              <button
                onClick={() => {
                  setActiveTab("about");
                  document.getElementById("location")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group relative inline-flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/40 text-white rounded-full font-bold text-sm uppercase tracking-widest transition-all duration-300 hover:bg-white/10 hover:border-white/70 overflow-hidden"
              >
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_80%_20%,rgba(255,255,255,0.35),transparent_65%)] opacity-0"
                  whileHover={{ opacity: 0.6 }}
                  transition={{ duration: 0.35 }}
                />
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0"
                  whileHover={{ x: "200%", opacity: 0.7 }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
                <MapPin className="relative z-10 w-4 h-4" />
                <span className="relative z-10">Jak dojechać</span>
              </button>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Bottom fade to page background */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-brand-900 via-brand-900/70 to-transparent z-10" />

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-3"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">Scroll</span>
            <ArrowDown className="w-5 h-5 text-white/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ===== INTRO SECTION — Premium Redesign ===== */}
      <section className="relative bg-brand-900 overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-700/15 rounded-full blur-[120px] pointer-events-none -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-brand-600/10 rounded-full blur-[100px] pointer-events-none translate-y-1/3" />

        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          {/* Top part — Editorial headline + stats */}
          <div className="pt-20 md:pt-28 pb-16 md:pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-end">
              {/* Left — Big heading */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="lg:col-span-7"
              >
                <span className="inline-block text-xs font-bold uppercase tracking-[0.3em] text-brand-400 mb-8">
                  Nasza historia
                </span>
                <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.05] mb-0">
                  Więcej niż kawiarnia.{" "}
                  <br className="hidden md:block" />
                  <span className="text-brand-400 italic">Delikatesy z duszą.</span>
                </h2>
              </motion.div>

              {/* Right — Stats row */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="lg:col-span-5"
              >
                <div className="flex gap-6 lg:justify-end">
                  {[
                    { value: "20+", label: "lat tradycji" },
                    { value: "200+", label: "produktów premium" },
                    { value: "4.9", label: "ocena Google" },
                  ].map((stat, i) => (
                    <div key={stat.label} className="text-center lg:text-left">
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 + i * 0.1, type: "spring", stiffness: 200, damping: 15 }}
                        className="block text-3xl md:text-4xl font-serif text-white leading-none mb-1"
                      >
                        {stat.value}
                      </motion.span>
                      <span className="text-[11px] uppercase tracking-[0.15em] text-white/40 font-medium">
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Animated divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="origin-left h-[1px] bg-gradient-to-r from-white/20 via-white/10 to-transparent"
          />

          {/* Bottom part — Description + Images Grid */}
          <div className="py-16 md:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
              {/* Left — Description & CTA */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="lg:col-span-5 flex flex-col justify-center"
              >
                <div className="space-y-6 text-lg text-white/60 leading-relaxed">
                  <p>
                    Il Buon Caffe to miejsce w Koszalinie, które ewoluowało z tradycyjnej kawiarni
                    w unikalne delikatesy premium. Choć wciąż serwujemy doskonałą kawę i domowe
                    wypieki, nasze serce bije teraz także dla produktów do zabrania do domu.
                  </p>
                  <p>
                    Znajdziesz u nas wyselekcjonowane wina włoskie i hiszpańskie, oliwki, oliwy
                    extra virgin, wędliny dojrzewające oraz szlachetne przetwory. To przestrzeń
                    dla pasjonatów smaku.
                  </p>
                </div>

                <Link
                  href="/sklep"
                  className="inline-flex items-center gap-3 mt-10 group"
                >
                  <span className="text-brand-400 text-sm font-bold uppercase tracking-[0.15em] group-hover:text-white transition-colors duration-300">
                    Zobacz nasze produkty
                  </span>
                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-300">
                    <ChevronRight className="w-4 h-4 text-white/60 group-hover:text-brand-900 transition-colors duration-300" />
                  </div>
                </Link>
              </motion.div>

              {/* Right — Asymmetric Image Grid */}
              <div className="lg:col-span-7">
                <div className="grid grid-cols-12 gap-4">
                  {/* Large Image */}
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="col-span-7 relative aspect-[3/4] rounded-2xl overflow-hidden group"
                  >
                    <Image
                      src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=800&auto=format&fit=crop"
                      alt="Wino i ser"
                      fill
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.05]"
                      sizes="(max-width: 1024px) 60vw, 30vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {/* Label */}
                    <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                      <span className="text-[11px] text-white font-medium uppercase tracking-widest">Wina & Sery</span>
                    </div>
                  </motion.div>

                  {/* Right column — 2 stacked images */}
                  <div className="col-span-5 flex flex-col gap-4">
                    <motion.div
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                      className="relative aspect-square rounded-2xl overflow-hidden group"
                    >
                      <Image
                        src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=800&auto=format&fit=crop"
                        alt="Kawa i latte art"
                        fill
                        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.05]"
                        sizes="(max-width: 1024px) 40vw, 20vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                        <span className="text-[11px] text-white font-medium uppercase tracking-widest">Kawa</span>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 60 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="relative aspect-[4/3] rounded-2xl overflow-hidden group"
                    >
                      <Image
                        src="https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?q=80&w=800&auto=format&fit=crop"
                        alt="Włoskie delikatesy"
                        fill
                        className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.05]"
                        sizes="(max-width: 1024px) 40vw, 20vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 rounded-full opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                        <span className="text-[11px] text-white font-medium uppercase tracking-widest">Delikatesy</span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MENU SECTIONS ===== */}
      <div id="menu">
        <MenuSection 
          data={classicMenu} 
          number="01" 
          icon={Coffee}
          variant="light"
          description="Fundament naszej karty. Klasyczne, włoskie proporcje i perfekcyjna ekstrakcja z najlepszych ziaren."
        />
        
        <MenuSection 
          data={specialMenu} 
          number="02" 
          icon={Wine}
          variant="dark"
          description="Autorskie kompozycje naszych baristów. Odważne połączenia smakowe i orzeźwiające propozycje."
        />
        
        <MenuSection 
          data={dessertMenu} 
          number="03" 
          icon={CakeSlice}
          variant="light"
          description="Słodkie zakończenie wizyty. Domowe wypieki i desery przygotowywane z pasją."
        />
      </div>

      {/* ===== LOCATION SECTION ===== */}
      <section id="location" className="py-24 md:py-32 bg-brand-900 relative overflow-hidden">
        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-brand-400 mb-4">
              Lokalizacja
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white">
              Znajdź nas
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Info Cards */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              {/* Address */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-brand-700/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-white mb-2">Adres</h3>
                    <p className="text-white/70">ul. Bpa Czesława Domina 3/6</p>
                    <p className="text-white/50">75-065 Koszalin</p>
                  </div>
                </div>
              </div>

              {/* Hours */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-brand-700/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-white mb-2">Godziny otwarcia</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between gap-8">
                        <span className="text-white/70">Poniedziałek - Piątek</span>
                        <span className="text-white font-medium">09:00 - 16:00</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span className="text-white/70">Sobota</span>
                        <span className="text-white font-medium">11:00 - 14:00</span>
                      </div>
                      <div className="flex justify-between gap-8">
                        <span className="text-white/50">Niedziela</span>
                        <span className="text-white/50">Zamknięte</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-brand-700/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif text-white mb-2">Kontakt</h3>
                    <p className="text-white/70">+48 94 123 45 67</p>
                    <p className="text-white/50">kontakt@ilbuoncaffe.pl</p>
                  </div>
                </div>
              </div>

              {/* Social */}
              <div className="flex gap-4">
                <a 
                  href="https://www.instagram.com/il_buoncaffe/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                  <Instagram className="w-5 h-5 text-brand-300" />
                  <span className="text-white/70">Instagram</span>
                </a>
                <a 
                  href="https://www.facebook.com/IlBuonCaffeKoszalin" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                  <Facebook className="w-5 h-5 text-brand-300" />
                  <span className="text-white/70">Facebook</span>
                </a>
              </div>
            </motion.div>

            {/* Map */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative aspect-square lg:aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <iframe
                  src="https://maps.google.com/maps?q=Il+Buon+Caffe,+ul.+Bpa+Czes%C5%82awa+Domina+3%2F6,+75-065+Koszalin&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: 'grayscale(0.7) contrast(1.1)' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0"
                />
                
                {/* Map Card */}
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm px-5 py-3 rounded-xl shadow-lg">
                  <p className="font-serif font-bold text-brand-900">Il Buon Caffe</p>
                  <p className="text-xs text-brand-700">Koszalin, Polska</p>
                </div>
              </div>
              
              {/* Directions Button */}
              <a
                href="https://www.google.com/maps/search/?api=1&query=Il+Buon+Caffe,+ul.+Bpa+Czes%C5%82awa+Domina+3%2F6,+75-065+Koszalin"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute -bottom-6 right-6 inline-flex items-center gap-2 px-6 py-3 bg-brand-700 text-white rounded-full font-bold text-sm uppercase tracking-wider shadow-lg hover:bg-brand-400 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span>Nawiguj</span>
              </a>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CafeClient;
