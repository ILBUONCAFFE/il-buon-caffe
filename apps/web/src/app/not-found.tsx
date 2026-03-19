"use client";

import Link from 'next/link';
import { motion, useMotionValue, useTransform, useSpring } from 'motion/react';
import { ArrowLeft, Coffee } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function NotFound() {
  const [mounted, setMounted] = useState(false);
  
  // Mouse position for parallax
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth mouse movement with spring physics
  const springConfig = { damping: 25, stiffness: 100 };
  const mouseX = useSpring(x, springConfig);
  const mouseY = useSpring(y, springConfig);

  // Transform values for the 404 text (must be called before any early return)
  const textLeftX = useTransform(mouseX, [-0.5, 0.5], [-20, 20]);
  const textLeftY = useTransform(mouseY, [-0.5, 0.5], [-20, 20]);
  const textRightX = useTransform(mouseX, [-0.5, 0.5], [20, -20]);
  const textRightY = useTransform(mouseY, [-0.5, 0.5], [20, -20]);

  useEffect(() => {
    setMounted(true);

    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      // Calculate normalized position from center (-0.5 to 0.5)
      x.set((e.clientX - innerWidth / 2) / innerWidth);
      y.set((e.clientY - innerHeight / 2) / innerHeight);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [x, y]);

  // Generate random coffee beans with different depths
  const beans = useMemo(() => (
    Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // % position
      y: Math.random() * 100, // % position
      rotation: Math.random() * 360,
      scale: 0.4 + Math.random() * 0.6,
      depth: (Math.random() - 0.5) * 2, // -1 to 1 parallax depth
      blur: Math.random() > 0.5
    }))
  ), []);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen w-full bg-[#FDFBF7] overflow-hidden flex flex-col items-center justify-center p-4 selection:bg-brand-700/30">
      
      {/* Background Pattern / Texture */}
      <div className="absolute inset-0 opacity-[0.4] pointer-events-none mix-blend-multiply bg-[url('/assets/noise.png')]"></div>
      
      {/* Parallax Coffee Beans Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {beans.map((bean) => (
          <ParallaxBean 
            key={bean.id} 
            bean={bean} 
            mouseX={mouseX} 
            mouseY={mouseY} 
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto backdrop-blur-[0px]">
        
        {/* Animated 404 Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative flex items-center justify-center font-serif text-[clamp(6rem,18vw,16rem)] leading-none text-brand-900/10 font-bold select-none"
        >
           <motion.span 
             style={{ x: textLeftX, y: textLeftY }}
           >4</motion.span>
          
          {/* Central Coffee Cup as '0' */}
          <div className="relative w-[0.6em] h-[0.6em] mx-2 perspective-1000 flex items-center justify-center">
             <motion.div
               animate={{ 
                 rotateX: [0, 10, 0],
                 rotateY: [0, 5, 0, -5, 0],
                 y: [0, -5, 0]
               }}
               transition={{ 
                 duration: 6,
                 repeat: Infinity,
                 ease: "easeInOut"
               }}
               className="w-full h-full relative flex items-center justify-center"
             >
                {/* Steam Effect */}
                <div className="absolute -top-[40%] left-1/2 -translate-x-1/2 flex gap-2 md:gap-4 opacity-0 animate-fade-in-up md:opacity-100">
                   {[1, 2, 3].map((s) => (
                     <motion.div
                       key={s}
                       animate={{ 
                         y: [-10, -50],
                         opacity: [0, 0.5, 0],
                         scaleY: [0.8, 1.2, 1.5],
                         x: [0, (s % 2 === 0 ? 10 : -10)]
                       }}
                       transition={{
                         duration: 2.5 + s * 0.5,
                         repeat: Infinity,
                         delay: s * 0.8,
                         ease: "easeOut"
                       }}
                       className="w-1.5 md:w-3 h-12 md:h-20 bg-gradient-to-t from-brand-300 to-transparent rounded-full blur-sm"
                     />
                   ))}
                </div>

                {/* The Cup (Icon) */}
                <div className="relative z-10 p-4 md:p-8 rounded-full bg-gradient-to-br from-[#FFFBF5] to-[#f3eee8] shadow-[0_20px_40px_-5px_damping(163,127,91,0.4)] border border-brand-100/50">
                  <Coffee className="w-16 h-16 md:w-40 md:h-40 text-brand-800 drop-shadow-sm" strokeWidth={1} />
                </div>
                
                {/* Ripple Effect base */}
                <motion.div 
                    animate={{ scale: [1, 1.2], opacity: [0.3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-brand-700/10 rounded-full z-0"
                />
             </motion.div>
          </div>

           <motion.span
             style={{ x: textRightX, y: textRightY }}
           >4</motion.span>
        </motion.div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="relative -mt-4 md:-mt-16 space-y-6 px-4"
        >
          <h2 className="text-3xl md:text-5xl font-serif text-brand-900 tracking-tight">
            Wygląda na to, że kawa się skończyła.
          </h2>
          <p className="text-base md:text-lg text-brand-600 font-light max-w-xl mx-auto leading-relaxed">
            Strona, której szukasz, wyparowała. <br className="hidden md:block"/>
            Wróć do nas, zanim aromat zniknie całkowicie.
          </p>

          {/* Interactive Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link href="/" passHref>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="group w-full sm:w-auto relative px-8 py-4 bg-brand-900 text-brand-50 rounded-lg overflow-hidden flex items-center justify-center gap-3 shadow-xl shadow-brand-900/10 hover:shadow-brand-900/20 transition-all cursor-pointer"
              >
                <div className="absolute inset-0 bg-brand-800 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-in-out"></div>
                <div className="relative flex items-center gap-2 font-medium tracking-wide uppercase text-xs md:text-sm">
                  <ArrowLeft size={16} />
                  <span>Strona Główna</span>
                </div>
              </motion.button>
            </Link>

            <Link href="/sklep" passHref>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="group w-full sm:w-auto relative px-8 py-4 bg-white text-brand-900 border border-brand-200 rounded-lg hover:border-brand-300 flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="relative flex items-center gap-2 font-medium tracking-wide uppercase text-xs md:text-sm">
                  <Coffee size={16} />
                  <span>Przejdź do Sklepu</span>
                </div>
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Footer Element */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-6 left-0 right-0 text-center pointer-events-none"
      >
        <div className="inline-block px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full border border-brand-100">
            <p className="text-brand-400 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] relative top-[1px]">Błąd 404 • Strona nie istnieje</p>
        </div>
      </motion.div>
    </div>
  );
}

// Parallax Bean Component
function ParallaxBean({ 
  bean, 
  mouseX, 
  mouseY 
}: { 
  bean: any, 
  mouseX: any, 
  mouseY: any 
}) {
  // Movement range multiplier based on depth (closer items move more)
  const movementRange = 50 * bean.depth; 
  
  const x = useTransform(mouseX, [-0.5, 0.5], [movementRange, -movementRange]);
  const y = useTransform(mouseY, [-0.5, 0.5], [movementRange, -movementRange]);

  return (
    <motion.div
      style={{
        left: `${bean.x}%`,
        top: `${bean.y}%`,
        x,
        y,
        rotate: bean.rotation,
        scale: bean.scale,
        opacity: bean.blur ? 0.2 : 0.6
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: bean.blur ? 0.2 : 0.6, scale: bean.scale }}
      transition={{ duration: 1, delay: Math.random() * 0.5 }}
      className={`absolute ${bean.blur ? 'blur-[3px]' : 'blur-[0.5px]'} pointer-events-none`}
    >
        {/* Simple Coffee Bean Shape constructed with CSS/SVG */}
      <CoffeeBeanIcon className="w-8 h-8 md:w-16 md:h-16 text-brand-200" />
    </motion.div>
  );
}

const CoffeeBeanIcon = ({ className, color }: { className?: string, color?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className}
    fill="currentColor"
  >
     <path d="M50 5 C20 5 10 30 15 50 C20 70 40 95 50 95 C60 95 80 70 85 50 C90 30 80 5 50 5 Z M50 85 C45 85 30 65 25 50 C22 35 30 20 45 20 C60 20 55 35 50 50 C45 65 55 75 60 75 C65 75 70 65 72 50 C75 35 70 15 50 15 C35 15 35 35 40 50 C45 65 55 85 50 85 Z" fillRule="evenodd"/>
  </svg>
);
