"use client";

import React from "react";
import { Hero } from "./Hero";
import { FeaturedProducts } from "./FeaturedProducts";
import { WhyUs } from "./WhyUs";
import { CTA } from "./CTA";
import { Marquee } from "./Marquee";
import { CategoriesGrid } from "./CategoriesGrid";
import { Philosophy } from "./Philosophy";

const HomeClient = () => {
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
