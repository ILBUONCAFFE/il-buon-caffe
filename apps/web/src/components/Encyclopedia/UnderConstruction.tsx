"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from "motion/react";
import Link from "next/link";
import {
  ArrowLeft,
  Database,
  ArrowUpRight,
  Terminal,
  Cpu,
} from "lucide-react";

// ============================================
// DATA SETS
// ============================================

const WINE_DATA = [
  { id: "W01", title: "Barolo DOCG", badge: "RED", origin: "Piemont", desc: "Król win i wino królów. Nebbiolo 100%." },
  { id: "W02", title: "Amarone della Valpolicella", badge: "RED", origin: "Veneto", desc: "Metoda appassimento. Suszone winogrona." },
  { id: "W03", title: "Chianti Classico", badge: "RED", origin: "Toskania", desc: "Serce Toskanii. Sangiovese min. 80%." },
  { id: "W04", title: "Brunello di Montalcino", badge: "RED", origin: "Toskania", desc: "Długie starzenie. Sangiovese Grosso." },
  { id: "W05", title: "Etna Bianco", badge: "WHITE", origin: "Sycylia", desc: "Wulkaniczne gleby. Carricante." },
  { id: "W06", title: "Franciacorta", badge: "SPARKLING", origin: "Lombardia", desc: "Metoda klasyczna. Włoski szampan." },
  { id: "W07", title: "Primitivo di Manduria", badge: "RED", origin: "Puglia", desc: "Pełne, dżemowe, wysoki alkohol." },
  { id: "W08", title: "Soave Classico", badge: "WHITE", origin: "Veneto", desc: "Garganega. Wulkaniczne i wapienne gleby." },
  { id: "W09", title: "Taurasi", badge: "RED", origin: "Kampania", desc: "Aglianico. Barolo południa." },
  { id: "W10", title: "Vermentino di Gallura", badge: "WHITE", origin: "Sardynia", desc: "Jedno z niewielu DOCG na Sardynii." },
];

const COFFEE_DATA = [
  { id: "C01", title: "Espresso", badge: "BREW", origin: "Italy", desc: "25-30ml ekstraktu, 9 barów, 25-30 sekund." },
  { id: "C02", title: "Ethiopia Yirgacheffe", badge: "BEAN", origin: "Africa", desc: "Nuty jaśminu, bergamotki i cytrusów." },
  { id: "C03", title: "Blue Mountain", badge: "BEAN", origin: "Jamaica", desc: "Jedna z najdroższych kaw świata. Łagodna." },
  { id: "C04", title: "Chemex", badge: "METHOD", origin: "USA", desc: "Gruby filtr papierowy. Czysty napar." },
  { id: "C05", title: "Robusta", badge: "SPECIES", origin: "Global", desc: "Więcej kofeiny, gorszy smak, lepsza crema." },
  { id: "C06", title: "Cappuccino", badge: "MILK", origin: "Italy", desc: "Espresso + spienione mleko (mikropianka)." },
  { id: "C07", title: "Geisha", badge: "BEAN", origin: "Panama", desc: "Rekordowe ceny aukcyjne. Nuty herbaciane." },
  { id: "C08", title: "AeroPress", badge: "METHOD", origin: "USA", desc: "Strzykawka do kawy. Wszechstronność." },
  { id: "C09", title: "Flat White", badge: "MILK", origin: "Australia", desc: "Podwójne espresso, mało piany, dużo mleka." },
  { id: "C10", title: "Kopi Luwak", badge: "BEAN", origin: "Indonesia", desc: "Kontrowersyjna metoda produkcji. Cyweta." },
];

const FOOD_DATA = [
  { id: "F01", title: "Parmigiano Reggiano", badge: "DOP", origin: "Emilia", desc: "Król serów. Dojrzewanie min. 12 m-cy." },
  { id: "F02", title: "Prosciutto di Parma", badge: "DOP", origin: "Parma", desc: "Szynka parmeńska. Tylko sól i czas." },
  { id: "F03", title: "Aceto Balsamico Trad.", badge: "DOP", origin: "Modena", desc: "Tradycyjny ocet balsamiczny. Min. 12 lat." },
  { id: "F04", title: "Oliwa Extra Virgin", badge: "OIL", origin: "Tuscany", desc: "Pierwsze tłoczenie na zimno. Kwasowość <0.8%." },
  { id: "F05", title: "Trufle Białe", badge: "FUNGI", origin: "Alba", desc: "Tuber magnatum. Najdroższe grzyby świata." },
  { id: "F06", title: "Mozzarella di Bufala", badge: "DOP", origin: "Campania", desc: "Z mleka bawolic. Porcelanowa biel." },
  { id: "F07", title: "Pesto Genovese", badge: "SAUCE", origin: "Liguria", desc: "Bazylia, pinie, czosnek, oliwa, parmezan." },
  { id: "F08", title: "San Marzano", badge: "TOMATO", origin: "Campania", desc: "Najlepsze pomidory do pizzy. Wulkaniczne." },
  { id: "F09", title: "Gorgonzola", badge: "CHEESE", origin: "Lombardia", desc: "Ser pleśniowy. Dolce (słodka) lub Piccante." },
  { id: "F10", title: "Szafran", badge: "SPICE", origin: "Abruzzo", desc: "Czerwone złoto. L'Aquila produkuje najlepszy." },
];

const SYSTEM_LOGS = [
  "Loading vintage charts 1990-2024...",
  "Compiling terroir maps...",
  "Indexing grape DNA profiles...",
  "Optimizing image assets...",
  "Fetching sommelier notes...",
  "Calibrating taste algorithms...",
  "Updating region statistics...",
  "Verifying DOCG certifications...",
];

// ============================================
// COMPONENTS
// ============================================

const GrainOverlay = () => (
  <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 mix-blend-overlay">
    <div className="w-full h-full bg-repeat animate-grain" style={{ backgroundImage: 'url("https://framerusercontent.com/images/rR6HYXBrMmX4cRpXfXUOvpvpB0.png")' }} />
    <style jsx>{`
      @keyframes grain {
        0%, 100% { transform: translate(0, 0); }
        10% { transform: translate(-5%, -10%); }
        20% { transform: translate(-15%, 5%); }
        30% { transform: translate(7%, -25%); }
        40% { transform: translate(-5%, 25%); }
        50% { transform: translate(-15%, 10%); }
        60% { transform: translate(15%, 0%); }
        70% { transform: translate(0%, 15%); }
        80% { transform: translate(3%, 35%); }
        90% { transform: translate(-10%, 10%); }
      }
      .animate-grain {
        animation: grain 8s steps(10) infinite;
      }
    `}</style>
  </div>
);

const MarqueeColumn: React.FC<{
  data: typeof WINE_DATA;
  direction: "up" | "down";
  speed: number;
  className?: string;
  isInteractive?: boolean;
}> = ({ data, direction, speed, className, isInteractive = false }) => {
  return (
    <div className={`flex flex-col gap-4 py-4 overflow-hidden h-full relative ${className}`}>
      {/* Gradients to fade content at edges */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0c0a09] to-transparent z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0c0a09] to-transparent z-10" />
      
      <motion.div
        initial={{ y: direction === "down" ? -1000 : 0 }}
        animate={{ y: direction === "down" ? 0 : -1000 }}
        transition={{
          repeat: Infinity,
          duration: speed,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-4"
      >
        {[...data, ...data, ...data, ...data].map((item, idx) => (
          <div
            key={`${item.id}-${idx}`}
            className={`p-6 border border-stone-800/60 bg-stone-900/40 backdrop-blur-sm rounded-none transition-colors group ${
              isInteractive ? "hover:bg-stone-800 hover:border-stone-600" : ""
            }`}
          >
            <div className="flex justify-between items-start mb-2 opacity-50 font-mono text-[10px] tracking-widest uppercase">
              <span>{item.id}</span>
              <span className="border border-stone-700 px-1 py-0.5 rounded-sm">{item.badge}</span>
            </div>
            <h3 className="font-serif text-xl text-stone-300 mb-1 group-hover:text-amber-400 transition-colors">
              {item.title}
            </h3>
            <p className="font-mono text-xs text-stone-500 uppercase tracking-wider mb-3">
              {item.origin}
            </p>
            <p className="font-sans text-sm text-stone-400 leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity">
              {item.desc}
            </p>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

const StatusRow: React.FC<{ label: string; percentage: number; status: string; delay: number }> = ({ label, percentage, status, delay }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.8 }}
    className="flex items-center justify-between text-sm py-3 border-b border-stone-800"
  >
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${status === 'Complete' ? 'bg-emerald-500' : status === 'Processing' ? 'bg-amber-500 animate-pulse' : 'bg-stone-700'}`} />
      <span className="font-mono text-stone-400 uppercase tracking-widest text-xs">{label}</span>
      <span className="font-mono text-stone-600 text-[10px] bg-stone-900 px-1.5 py-0.5 rounded border border-stone-800 transition-colors hover:border-stone-600">{status}</span>
    </div>
    <span className="font-mono text-amber-500/80">{percentage}%</span>
  </motion.div>
);

const LiveSystemLog: React.FC = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % SYSTEM_LOGS.length);
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-2 font-mono text-[10px] text-stone-600 uppercase tracking-widest min-w-[200px]">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="key={index} animate-fade-in">
                {SYSTEM_LOGS[index]}
            </span>
        </div>
    );
};

// ============================================
// MAIN PAGE
// ============================================

const UnderConstruction: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 3D Tilt Effect State
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-0.5, 0.5], [5, -5]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-5, 5]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;
      
      // For Flashlight
      setMousePosition({
        x: clientX - rect.left,
        y: clientY - rect.top,
      });

      // For Tilt
      const width = rect.width;
      const height = rect.height;
      const mouseX = (clientX - rect.left) / width - 0.5;
      const mouseY = (clientY - rect.top) / height - 0.5;
      x.set(mouseX);
      y.set(mouseY);
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen bg-[#0c0a09] overflow-hidden text-stone-200 cursor-crosshair selection:bg-amber-900/50 selection:text-white perspective-1000"
    >
      <GrainOverlay />

      {/* 
        BACKGROUND STREAMS 
        We use a mask to spotlight the content under the cursor
      */}
      <div className="absolute inset-0 z-0 opacity-30 grayscale-[80%] transition-all duration-300">
        <div className="grid grid-cols-1 md:grid-cols-3 h-full gap-px bg-stone-800/30">
          <MarqueeColumn data={WINE_DATA} direction="up" speed={60} className="border-r border-stone-800/30" />
          <MarqueeColumn data={COFFEE_DATA} direction="down" speed={50} className="hidden md:flex border-r border-stone-800/30" />
          <MarqueeColumn data={FOOD_DATA} direction="up" speed={70} className="hidden md:flex" />
        </div>
      </div>

      {/* FLASHLIGHT EFFECT LAYER - Revealing true colors but subtler */}
      <div 
        className="absolute inset-0 z-10 pointer-events-none opacity-0 md:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle 400px at ${mousePosition.x}px ${mousePosition.y}px, transparent 0%, #0c0a09 100%)`,
          boxShadow: `inset 0 0 100px 100px #0c0a09`,
        }}
      />

      {/* OVERLAY & CONTENT */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-gradient-to-t from-[#0c0a09] via-transparent to-[#0c0a09] pointer-events-none">
        
        {/* Navigation - Pointer events auto enabled */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center pointer-events-auto z-50">
          <Link
            href="/"
            className="group flex items-center gap-2 px-4 py-2 bg-stone-900/80 backdrop-blur-md border border-stone-800 rounded-full text-stone-400 hover:text-white hover:border-stone-600 transition-all shadow-lg"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono text-xs uppercase tracking-wider">Powrót</span>
          </Link>
          
          <div className="hidden md:block opacity-60">
             <LiveSystemLog />
          </div>
        </div>

        {/* Main Center Card with 3D Tilt */}
        <motion.div 
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
          }}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className="relative max-w-2xl w-full bg-[#0c0a09]/80 backdrop-blur-xl border border-stone-800 p-8 md:p-12 shadow-2xl pointer-events-auto rounded-xl"
        >
          {/* Decorative Corner Lines */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-amber-500/50 rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-amber-500/50 rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b border-l border-amber-500/50 rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-amber-500/50 rounded-br-xl" />

          {/* Header */}
          <div className="text-center mb-10 transform translate-z-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-3 mb-6"
            >
              <Database size={16} className="text-amber-500" />
              <span className="font-mono text-amber-500 text-xs uppercase tracking-[0.3em] font-medium">Baza Wiedzy v1.0</span>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-serif text-white mb-4 tracking-tight leading-none">
              <span className="block text-transparent bg-clip-text bg-gradient-to-br from-white via-stone-200 to-stone-600 drop-shadow-sm">Encyklopedia</span>
              <span className="block italic text-stone-600 text-4xl md:text-5xl mt-2 font-light tracking-wide">w budowie</span>
            </h1>
            
            <p className="font-mono text-xs text-stone-500 max-w-md mx-auto leading-relaxed mt-6">
              Agregujemy tysiące rekordów o winach, kawie i produktach delikatesowych. 
              Tworzymy najbardziej kompleksowe źródło wiedzy kulinarnej w polskim internecie.
            </p>
          </div>

          {/* Progress Section */}
          <div className="space-y-1 mb-10 border-t border-stone-800 pt-6 transform translate-z-5">
            <StatusRow label="Moduł Wina" percentage={85} status="Processing" delay={0.5} />
            <StatusRow label="Moduł Kawy" percentage={40} status="Compiling" delay={0.7} />
            <StatusRow label="Włoska Kuchnia" percentage={12} status="Queued" delay={0.9} />
            
            {/* Total Progress Bar */}
            <div className="pt-6 relative">
              <div className="flex justify-between font-mono text-[10px] text-stone-500 uppercase tracking-widest mb-2">
                <span>Całkowity postęp</span>
                <span className="flex items-center gap-2">
                    <Cpu size={12} className="text-stone-600" />
                    EST: Q2 2026
                </span>
              </div>
              <div className="h-1 w-full bg-stone-800 overflow-hidden rounded-full">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "65%" }}
                  transition={{ delay: 1, duration: 2, ease: "easeInOut" }}
                  className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]"
                />
              </div>
            </div>
          </div>

          {/* CTA: Newsletter */}
          <div className="flex flex-col md:flex-row gap-4 transform translate-z-20">
             <div className="flex-1 relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity blur-xl" />
                <input 
                  type="email" 
                  placeholder="Twój email..." 
                  className="w-full h-12 bg-stone-900 border border-stone-800 px-4 font-mono text-sm text-white placeholder:text-stone-700 outline-none focus:border-amber-500 transition-colors relative z-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity z-20">
                  <span className="animate-pulse w-1.5 h-1.5 bg-amber-500 block rounded-full"></span>
                </div>
             </div>
             <button className="h-12 px-8 bg-stone-100 text-stone-900 font-mono text-xs font-bold uppercase tracking-wider hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 relative z-10 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]">
               <span>Powiadom</span>
               <ArrowUpRight size={14} />
             </button>
          </div>
          
          <div className="mt-8 flex justify-center gap-8 border-t border-stone-900/50 pt-4">
            {['Sklep', 'Kawiarnia', 'Warsztaty'].map(link => (
              <Link href={link === 'Sklep' ? '/sklep' : link === 'Kawiarnia' ? '/kawiarnia' : '/'} key={link} className="font-mono text-[10px] text-stone-600 uppercase tracking-[0.2em] cursor-pointer hover:text-amber-500 transition-colors relative group">
                {link}
                <span className="absolute -bottom-2 left-0 w-full h-px bg-amber-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </Link>
            ))}
          </div>

        </motion.div>
      </div>

    </div>
  );
};

export default UnderConstruction;
