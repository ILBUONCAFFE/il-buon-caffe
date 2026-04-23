"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { Hero } from "./Hero";
import { WhyUs } from "./WhyUs";
import { CategoriesGrid } from "./CategoriesGrid";

const FeaturedProducts = dynamic(
  () => import("./FeaturedProducts").then(m => ({ default: m.FeaturedProducts })),
  {
    ssr: false,
    loading: () => (
      <section className="bg-white dark:bg-brand-950 py-20 md:py-28 border-b border-brand-100 dark:border-white/5">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="flex items-end justify-between mb-10 md:mb-14">
            <div className="h-7 w-52 bg-brand-100 dark:bg-white/5 rounded animate-pulse" />
            <div className="h-3 w-20 bg-brand-100 dark:bg-white/5 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
            {[...Array(8)].map((_, i) => (
              <div key={i}>
                <div className="aspect-square rounded-sm bg-brand-100 dark:bg-brand-900 animate-pulse mb-4" />
                <div className="h-2.5 w-1/4 bg-brand-100 dark:bg-white/5 rounded animate-pulse mb-2" />
                <div className="h-3.5 w-3/4 bg-brand-100 dark:bg-white/5 rounded animate-pulse mb-2" />
                <div className="h-3.5 w-1/3 bg-brand-100 dark:bg-white/5 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
  }
);

const HomeClient = () => (
  <main className="w-full overflow-x-hidden min-h-screen">
    <Hero />
    <CategoriesGrid />
    <Suspense>
      <FeaturedProducts />
    </Suspense>
    <WhyUs />
  </main>
);

export default HomeClient;
