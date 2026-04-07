"use client";

import React from "react";
import { Hero } from "./Hero";
import { FeaturedProducts } from "./FeaturedProducts";
import { WhyUs } from "./WhyUs";
import { Marquee } from "./Marquee";
import { CategoriesGrid } from "./CategoriesGrid";
import { AboutMini } from "./AboutMini";
import { InstagramFeed } from "./InstagramFeed";
import { CafeBanner } from "./CafeBanner";

const HomeClient = () => {
  return (
    <main className="w-full overflow-x-hidden min-h-screen">
      <Hero />
      <Marquee />
      <CategoriesGrid />
      <FeaturedProducts />
      <AboutMini />
      <InstagramFeed />
      <WhyUs />
      <CafeBanner />
    </main>
  );
};

export default HomeClient;
