import React from "react";
import { InView } from "@/components/ui/InView";

const points = [
  { value: "300+", label: "Produktów w ofercie" },
  { value: "24h", label: "Czas realizacji" },
  { value: "150 zł", label: "Darmowa dostawa od" },
  { value: "2003", label: "Rok założenia" },
];

export const WhyUs = () => (
  <section className="bg-brand-50 dark:bg-brand-950 py-20 md:py-28 overflow-hidden">
    <div className="container mx-auto px-6 lg:px-12">
      <InView className="animate-scale-x-left">
        <div className="h-px bg-brand-200 dark:bg-white/8 mb-14 md:mb-20" />
      </InView>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-8">
        {points.map((point, i) => (
          <InView
            key={point.label}
            className="animate-reveal-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="text-center md:text-left">
              <span className="block text-4xl md:text-5xl lg:text-6xl font-serif text-brand-900 dark:text-white leading-none tracking-tight mb-3">
                {point.value}
              </span>
              <span className="text-[11px] md:text-xs uppercase tracking-[0.2em] text-brand-400 dark:text-white/30 font-medium">
                {point.label}
              </span>
            </div>
          </InView>
        ))}
      </div>

      <InView className="animate-scale-x-right">
        <div className="h-px bg-brand-200 dark:bg-white/8 mt-14 md:mt-20" />
      </InView>
    </div>
  </section>
);
