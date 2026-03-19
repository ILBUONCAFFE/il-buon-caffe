"use client";

import React, { useEffect } from "react";
import Lenis from "lenis";
import { Hero } from "./Hero";

import { FeaturedProducts } from "./FeaturedProducts";
import { WhyUs } from "./WhyUs";
import { CTA } from "./CTA";
import { Marquee } from "./Marquee";
import { CategoriesGrid } from "./CategoriesGrid";
import { Philosophy } from "./Philosophy";

const HomeClient = () => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <main className="w-full overflow-x-hidden min-h-screen">
      <Hero />
      <Marquee />
      <CategoriesGrid />
      <Philosophy />
      <FeaturedProducts />
      <WhyUs />
      <CTA />
    </main>
  );
};

export default HomeClient;
