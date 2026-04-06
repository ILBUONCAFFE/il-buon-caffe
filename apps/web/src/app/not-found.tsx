"use client";

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="fixed inset-0 z-[100] min-h-screen w-full overflow-y-auto bg-brand-50 text-brand-950 flex flex-col md:flex-row selection:bg-brand-400/30">
      
      {/* Subtle Noise Texture */}
      <div className="absolute inset-0 opacity-[0.25] mix-blend-multiply pointer-events-none bg-[url('/assets/noise.png')] z-10"></div>

      {/* LEFT COLUMN: Content */}
      <div className="w-full md:w-[45%] flex flex-col justify-between p-6 sm:p-10 lg:p-16 xl:p-24 z-20 border-r border-brand-200/50 bg-brand-50">
        
        {/* Header Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-16 md:mb-0"
        >
          <Link href="/" className="inline-block group">
            <span className="font-serif text-xl sm:text-2xl tracking-[0.2em] uppercase font-medium group-hover:text-brand-500 transition-colors">
              Il Buon Caffè
            </span>
          </Link>
        </motion.div>

        {/* Main Text */}
        <div className="space-y-10 my-16 md:my-0 max-w-md">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-100 rounded-sm border border-brand-200/50"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></div>
            <span className="text-[10px] sm:text-xs uppercase tracking-[0.2em] font-semibold text-brand-800">
              Błąd 404
            </span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="space-y-6"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-medium leading-[1.05] tracking-tight">
              Pusta <br/>
              <span className="text-brand-400 italic font-light">filiżanka.</span>
            </h1>
            
            <div className="w-12 h-[1px] bg-brand-300"></div>

            <p className="text-base sm:text-lg text-brand-700/80 leading-relaxed font-light">
              Niewłaściwy adres URL, wprowadzona zła ścieżka lub strona po prostu przestała istnieć. Cokolwiek to jest, na pewno pomyłki nie usuniemy kawą.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4"
          >
            <Link 
              href="/"
              className="flex items-center justify-between px-6 py-4 bg-brand-950 text-white hover:bg-brand-800 transition-all duration-300 group"
            >
              <span className="text-[11px] font-sans uppercase tracking-[0.15em] font-medium">Menu Główne</span>
              <ArrowUpRight size={16} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            
            <Link 
              href="/sklep"
              className="flex items-center justify-between px-6 py-4 border border-brand-300 text-brand-900 hover:bg-brand-100 transition-all duration-300 group"
            >
              <span className="text-[11px] font-sans uppercase tracking-[0.15em] font-medium">Nasz Sklep</span>
              <ArrowUpRight size={16} className="text-brand-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Footer info */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-16 md:mt-0"
        >
          <p className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-brand-500/60">
            SYSTEM // NAWIGACJA_PRZERWANA
          </p>
        </motion.div>
      </div>

      {/* RIGHT COLUMN: Abstract Art */}
      <div className="relative w-full md:w-[55%] min-h-[50vh] md:min-h-screen bg-brand-100/30 flex items-center justify-center overflow-hidden z-0">
        
        {/* Animated Background Elements */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 w-[120%] aspect-square -translate-x-1/2 -translate-y-1/2 border-[1px] border-brand-200/40 rounded-full border-dashed opacity-50 pointer-events-none"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 w-[80%] aspect-square -translate-x-1/2 -translate-y-1/2 border border-brand-300/30 rounded-full opacity-50 pointer-events-none"
        />
        
        {/* Massive 404 */}
        <div className="relative flex items-center justify-center pointer-events-none w-full h-full">
          <motion.div
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 1.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
             className="font-serif font-black text-[45vw] md:text-[32vw] leading-none text-brand-200/40 tracking-tighter select-none mix-blend-color-burn text-center"
          >
            404
          </motion.div>
          
          <motion.span 
             initial={{ opacity: 0, rotate: 10 }}
             animate={{ opacity: 1, rotate: -15 }}
             transition={{ duration: 1, delay: 1.2, ease: "easeOut" }}
             className="absolute top-1/2 right-[15%] -translate-y-1/2 font-handwriting text-7xl md:text-9xl text-brand-500/80 drop-shadow-sm select-none"
          >
            Ups..
          </motion.span>
        </div>
        
      </div>
      
    </div>
  );
}
