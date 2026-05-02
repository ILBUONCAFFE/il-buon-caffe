import React, { Suspense } from "react";
import { Hero } from "./Hero";
import { WhyUs } from "./WhyUs";
import { CategoriesGrid } from "./CategoriesGrid";
import { Newsletter } from "./Newsletter";
import { CTA } from "./CTA";
import { FeaturedProducts } from "./FeaturedProducts";
import type { Product } from "@/types";

const HomeClient = ({ featuredProducts }: { featuredProducts: Product[] }) => (
  <div className="w-full overflow-x-hidden">
    <Hero />
    <CategoriesGrid />
    <Suspense>
      <FeaturedProducts initialProducts={featuredProducts} />
    </Suspense>
    <WhyUs />
    <Newsletter />
    <CTA />
  </div>
);

export default HomeClient;
