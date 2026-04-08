import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { InView } from "@/components/ui/InView";

export const AboutMini = () => {
  return (
    <section className="relative bg-brand-900 overflow-hidden py-28 md:py-40">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mx-auto">
          <InView className="animate-reveal-up">
            <span className="block text-[11px] uppercase tracking-[0.3em] text-white/25 font-medium mb-10 text-center">
              O nas
            </span>
          </InView>

          {/* Heading — clip reveal */}
          <div className="mb-10 text-center">
            <div className="overflow-hidden">
              <InView className="animate-clip-up-text">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-white leading-[1.05]">
                  Pasja do włoskiego
                </h2>
              </InView>
            </div>
            <div className="overflow-hidden">
              <InView className="animate-clip-up-text" style={{ animationDelay: "100ms" }}>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-handwriting text-brand-400 leading-[1.15]">
                  rzemiosła
                </h2>
              </InView>
            </div>
          </div>

          {/* Body text */}
          <div className="space-y-5 text-center mb-12">
            <InView className="animate-reveal-up" style={{ animationDelay: "200ms" }}>
              <p className="text-white/45 text-base md:text-lg leading-relaxed">
                Od 2003 roku z pasją przenosimy autentyczny smak Włoch prosto do
                Twojego domu, łącząc rzemieślniczą tradycję z najwyższą jakością.
              </p>
            </InView>

            <InView className="animate-reveal-up" style={{ animationDelay: "300ms" }}>
              <p className="text-white/35 text-base md:text-lg leading-relaxed">
                W naszej ofercie znajdziesz starannie wyselekcjonowane wina od
                małych winiarzy, doskonałe oliwy tłoczone na zimno, tradycyjne
                słodycze oraz świeżo paloną kawę.
              </p>
            </InView>

            <InView className="animate-reveal-up" style={{ animationDelay: "400ms" }}>
              <p className="text-white/30 text-base leading-relaxed">
                Każdy specjał, który trafia do naszego sklepu, musi najpierw
                zachwycić nasze własne podniebienia, ponieważ w kwestii kulinariów
                nie uznajemy żadnych kompromisów.
              </p>
            </InView>
          </div>

          {/* Divider + link */}
          <InView className="animate-scale-x-center" style={{ animationDelay: "400ms" }}>
            <div className="h-px bg-white/10 mb-8 max-w-xs mx-auto" />
          </InView>

          <InView className="animate-reveal-up" style={{ animationDelay: "500ms" }}>
            <div className="text-center">
              <Link
                href="/sklep"
                className="group inline-flex items-center gap-2.5 text-white/50 hover:text-white transition-colors duration-500"
              >
                <span className="relative text-sm font-bold uppercase tracking-[0.2em]">
                  Ponad 300 produktów
                  <span className="absolute -bottom-1 left-0 h-px bg-current w-0 group-hover:w-full transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
                </span>
                <ArrowUpRight
                  className="w-3.5 h-3.5 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  strokeWidth={2.5}
                />
              </Link>
            </div>
          </InView>
        </div>
      </div>
    </section>
  );
};
