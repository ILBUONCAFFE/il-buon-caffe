import React from "react";
import Link from "next/link";
import { MapPin, Clock, ArrowUpRight } from "lucide-react";
import { InView } from "@/components/ui/InView";

export const CafeBanner = () => (
  <section className="bg-brand-900 border-t border-white/[0.06]">
    <div className="container mx-auto px-6 lg:px-12 py-8 md:py-10">
      <InView className="animate-reveal-up">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Left */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
            <span className="text-[11px] uppercase tracking-[0.25em] text-white/25 font-medium flex-shrink-0">
              Kawiarnia
            </span>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm text-white/40">
              <span className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-brand-400/60 flex-shrink-0" />
                ul. Biskupa Czesława Domina 3/6, Koszalin
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-brand-400/60 flex-shrink-0" />
                Pn–Pt 9–16 · Sob 11–14
              </span>
            </div>
          </div>

          {/* Right */}
          <Link
            href="/kawiarnia"
            className="group inline-flex items-center gap-2 text-white/35 hover:text-white/70 transition-colors duration-500 flex-shrink-0"
          >
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium">
              Kawiarnia
            </span>
            <ArrowUpRight
              className="w-3.5 h-3.5 transition-transform duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={2}
            />
          </Link>
        </div>
      </InView>
    </div>
  </section>
);
