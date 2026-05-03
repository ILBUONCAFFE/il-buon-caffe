"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Section } from './Section';
import { getFilteredProducts } from '@/actions/products';
import type { PaletteType } from './palette';
import type { Product } from '@/types';

interface RelatedWinesSectionProps {
  palette: PaletteType;
  currentSku: string;
}

export const RelatedWinesSection = ({ palette, currentSku }: RelatedWinesSectionProps) => {
  const [items, setItems] = useState<Product[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await getFilteredProducts({ category: 'wino' });
        if (cancelled) return;
        const filtered = (result.products || [])
          .filter((p) => p.sku !== currentSku)
          .slice(0, 4);
        setItems(filtered);
      } catch (err) {
        console.error('Failed to load related wines', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentSku]);

  if (loaded && items.length === 0) return null;

  return (
    <section className="py-16 md:py-28" style={{ backgroundColor: palette.bgWarm }}>
      <div className="container mx-auto px-5 md:px-12 lg:px-20">
        <Section className="flex items-end justify-between mb-9 md:mb-12 gap-4 md:gap-6 flex-wrap">
          <div>
            <span
              className="uppercase tracking-[0.2em] text-[11px] font-semibold block mb-3"
              style={{ color: palette.textDim }}
            >
              Polecane
            </span>
            <h2 className="text-[1.75rem] md:text-4xl lg:text-5xl font-serif leading-[1.1]" style={{ color: palette.text }}>
              Podobne wina
            </h2>
          </div>
          <Link
            href="/sklep/wino"
            className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] hover:gap-3 transition-all"
            style={{ color: palette.accent }}
          >
            Zobacz wszystkie
            <ArrowRight size={16} strokeWidth={1.8} />
          </Link>
        </Section>

        {!loaded ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-2xl animate-pulse"
                style={{ backgroundColor: palette.bgMuted }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((wine, idx) => {
              const imgSrc = wine.imageUrl || (wine as Product & { image?: string }).image;
              return (
                <Section key={wine.sku} delay={idx * 0.06}>
                  <Link
                    href={`/sklep/${wine.slug}`}
                    className="group block rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1"
                    style={{
                      backgroundColor: palette.bgCard,
                      borderColor: palette.borderLight,
                      boxShadow: palette.shadow,
                    }}
                  >
                    <div
                      className="relative aspect-[3/4] flex items-center justify-center"
                      style={{ backgroundColor: palette.bgWarm }}
                    >
                      {imgSrc ? (
                        <Image
                          src={imgSrc}
                          alt={wine.name}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-contain p-6 transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      ) : null}
                    </div>
                    <div className="p-4 md:p-5">
                      {wine.origin && (
                        <span
                          className="text-[10px] uppercase tracking-[0.18em] font-semibold block mb-1.5 md:mb-2"
                          style={{ color: palette.textDim }}
                        >
                          {wine.origin}
                        </span>
                      )}
                      <h3
                        className="font-serif text-[15px] md:text-lg leading-snug mb-2 md:mb-3 line-clamp-2 min-h-[2.6em] md:min-h-[3em]"
                        style={{ color: palette.text }}
                      >
                        {wine.name}
                      </h3>
                      <p className="font-serif text-base md:text-lg" style={{ color: palette.accent }}>
                        {wine.price.toFixed(2).replace('.', ',')} zł
                      </p>
                    </div>
                  </Link>
                </Section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
