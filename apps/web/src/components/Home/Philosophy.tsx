"use client";

import React, { useRef, useEffect, useCallback } from "react";
import NextImage from "next/image";
import { motion, useScroll, useTransform } from "motion/react";

const FRAME_COUNT = 192;

export const Philosophy = () => {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const isLoadedRef = useRef(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  // Map scroll progress (0 to 1) to frame index (0 to 191)
  const frameIndex = useTransform(scrollYProgress, [0, 1], [0, FRAME_COUNT - 1]);

  // Render frame function
  const renderFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    const images = imagesRef.current;
    if (!canvas || !images.length) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frameIdx = Math.max(0, Math.min(Math.round(index), FRAME_COUNT - 1));
    const img = images[frameIdx];
    
    if (!img || !img.complete || !img.naturalWidth) return;

    // Maintain aspect ratio and cover
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;
    
    let drawWidth, drawHeight, offsetX, offsetY;

    if (canvasRatio > imgRatio) {
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgRatio;
      offsetX = 0;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      drawWidth = canvas.height * imgRatio;
      drawHeight = canvas.height;
      offsetX = (canvas.width - drawWidth) / 2;
      offsetY = 0;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  }, []);

  // Preload all images
  useEffect(() => {
    let loadedCount = 0;
    const imgs: HTMLImageElement[] = new Array(FRAME_COUNT);

    const handleLoad = () => {
      loadedCount++;
      
      if (loadedCount === FRAME_COUNT) {
        imagesRef.current = imgs;
        isLoadedRef.current = true;
        // Render first frame
        renderFrame(frameIndex.get());
      }
    };

    for (let i = 1; i <= FRAME_COUNT; i++) {
      const img = new window.Image();
      const paddedIndex = i.toString().padStart(5, "0");
      img.src = `/coffee-sequence/${paddedIndex}.png`;
      img.onload = handleLoad;
      img.onerror = handleLoad;
      imgs[i - 1] = img;
    }

    // Cleanup
    return () => {
      imgs.forEach(img => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [frameIndex, renderFrame]);

  // Initialize canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  // Handle scroll-based frame updates
  useEffect(() => {
    const unsubscribe = frameIndex.on("change", (latest) => {
      if (isLoadedRef.current) {
        renderFrame(latest);
      }
    });

    return () => unsubscribe();
  }, [frameIndex, renderFrame]);
  
  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Re-render current frame
      if (isLoadedRef.current) {
        renderFrame(frameIndex.get());
      }
    };
     
    window.addEventListener('resize', handleResize);
     
    return () => window.removeEventListener('resize', handleResize);
  }, [frameIndex, renderFrame]);

  // Text transforms based on scroll progress
  // 0.0-0.3: Text visible, dark color (light background)
  // 0.3-0.5: Text transitions to light color (dark background)
  // 0.5-0.7: Text stays light, then fades out
  // 0.7-1.0: Text invisible
  
  const textOpacity = useTransform(scrollYProgress, [0, 0.5, 0.7], [1, 1, 0]);
  
  // Color interpolation: dark -> light as animation progresses
  const textColorMain = useTransform(
    scrollYProgress, 
    [0, 0.25, 0.5], 
    ["rgb(41, 37, 36)", "rgb(41, 37, 36)", "rgb(250, 250, 249)"] // stone-800 -> stone-50
  );
  
  const textColorAccent = useTransform(
    scrollYProgress, 
    [0, 0.25, 0.5], 
    ["rgb(101, 67, 33)", "rgb(101, 67, 33)", "rgb(217, 180, 150)"] // brand-600 -> brand-300
  );
  
  const textShadow = useTransform(
    scrollYProgress, 
    [0, 0.25, 0.5], 
    ["0 2px 20px rgba(255,255,255,0.5)", "0 2px 20px rgba(255,255,255,0.3)", "0 2px 30px rgba(0,0,0,0.5)"]
  );

  return (
    <section ref={containerRef} className="relative h-screen">
      <div className="h-full w-full overflow-hidden">
        {/* Static first frame as background (visible until canvas loads) */}
        <NextImage
          src="/coffee-sequence/00001.png"
          alt="Animacja sekwencyjna – parzenie kawy, scena otwierająca sekcję Nasza Filozofia"
          fill
          className="object-cover scale-110"
          priority
        />

        {/* Canvas for animation (overlays image once loaded) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover scale-110" 
        />
        
        {/* Overlay Content */}
        <motion.div 
          className="relative z-10 h-full flex flex-col items-center justify-center text-center p-6"
          style={{ opacity: textOpacity }}
        >
          <motion.span 
            className="block text-sm md:text-base font-bold uppercase tracking-[0.3em] mb-6"
            style={{ color: textColorAccent }}
          >
            Nasza Filozofia
          </motion.span>
          <motion.h2 
            className="text-4xl md:text-6xl lg:text-7xl font-serif leading-tight max-w-4xl mx-auto mb-8"
            style={{ 
              color: textColorMain,
              textShadow: textShadow 
            }}
          >
            "Kawa to nie tylko napój.<br />
            To <motion.span style={{ color: textColorAccent }} className="italic">rytuał</motion.span>."
          </motion.h2>
        </motion.div>
      </div>
    </section>
  );
};
