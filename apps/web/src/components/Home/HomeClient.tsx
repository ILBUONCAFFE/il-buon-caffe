"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { Hero } from "./Hero";
import { Marquee } from "./Marquee";
import { WhyUs } from "./WhyUs";
import { AboutMini } from "./AboutMini";
import { CafeBanner } from "./CafeBanner";

// Below-fold Client Components — code split to reduce initial bundle
const CategoriesGrid = dynamic(
  () => import("./CategoriesGrid").then(m => ({ default: m.CategoriesGrid })),
  {
    ssr: false,
    loading: () => (
      <section className="relative bg-brand-950 overflow-hidden">
        <div className="container mx-auto px-6 lg:px-12 py-24 md:py-32 lg:py-40">
          <div className="h-px bg-white/10 mb-12" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between py-8 md:py-10 border-b border-white/8">
              <div className="h-8 w-48 md:w-72 bg-white/5 rounded animate-pulse" />
              <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    ),
  }
);

const FeaturedProducts = dynamic(
  () => import("./FeaturedProducts").then(m => ({ default: m.FeaturedProducts })),
  {
    ssr: false,
    loading: () => (
      <section className="bg-brand-50 overflow-hidden py-24 md:py-32">
        <div className="container mx-auto px-6 lg:px-12 mb-12">
          <div className="h-3 w-20 bg-brand-200 rounded animate-pulse" />
        </div>
        <div className="pl-6 lg:pl-12 flex gap-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="w-[280px] md:w-[340px] flex-shrink-0">
              <div className="aspect-[3/4] rounded-xl bg-brand-100/50 animate-pulse mb-5" />
              <div className="h-4 w-2/3 bg-brand-100 rounded animate-pulse mb-2" />
              <div className="h-3 w-1/3 bg-brand-100/50 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    ),
  }
);

const HomeClient = () => {
  return (
    <main className="w-full overflow-x-hidden min-h-screen">
      <Hero />
      <Marquee />
      <Suspense>
        <CategoriesGrid />
      </Suspense>
      <Suspense>
        <FeaturedProducts />
      </Suspense>
      <AboutMini />
      <WhyUs />
      <CafeBanner />
    </main>
  );
};

export default HomeClient;
