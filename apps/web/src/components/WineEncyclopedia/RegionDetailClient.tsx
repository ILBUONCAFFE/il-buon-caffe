"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Sun, Mountain, Grape, Wine, ChevronRight, Map } from "lucide-react";
import { notFound } from "next/navigation";

import { ALL_WINE_REGIONS } from "@/content/wineEncyclopedia";

interface RegionDetailClientProps {
  slug: string;
}

const RegionDetailClient: React.FC<RegionDetailClientProps> = ({ slug }) => {
  const region = ALL_WINE_REGIONS.find((r) => r.slug === slug);
  if (!region) notFound();

  const relatedRegions = ALL_WINE_REGIONS
    .filter((r) => r.country === region.country && r.id !== region.id)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-brand-50">
      <section className="relative bg-brand-900 text-white pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={region.image?.url || "https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=1600"}
            alt={region.image?.alt || (region.namePl || region.name)}
            fill
            className="object-cover opacity-40"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900/90 via-brand-900/70 to-brand-900/50" />
        </div>

        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
            <Link href="/encyklopedia/wino/regiony" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm">
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Regiony winiarskie</span>
            </Link>
          </motion.div>

          <div className="max-w-3xl">
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-block px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider bg-white/10 text-white/80 mb-4">
              {region.country}
            </motion.span>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl lg:text-6xl font-serif mb-4">
              {region.namePl || region.name}
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-white/80 text-lg leading-relaxed">
              {region.description}
            </motion.p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 lg:px-12 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {region.keyGrapes?.length > 0 && (
              <section className="bg-white rounded-2xl border border-brand-100 p-8">
                <h2 className="text-2xl font-serif text-brand-900 mb-6 flex items-center gap-3"><Grape className="text-brand-400" size={24} />Główne szczepy</h2>
                <div className="flex flex-wrap gap-3">
                  {region.keyGrapes.map((grape: string) => (
                    <span key={grape} className="px-4 py-2 bg-brand-50 text-brand-700 rounded-full text-sm font-medium">{grape}</span>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-white rounded-2xl border border-brand-100 p-8">
              <h2 className="text-2xl font-serif text-brand-900 mb-6 flex items-center gap-3"><Mountain className="text-brand-400" size={24} />Terroir</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {region.climate?.type && <div className="p-6 bg-brand-50 rounded-xl"><h4 className="text-sm uppercase tracking-wider text-brand-700 mb-2 flex items-center gap-2"><Sun size={14} />Klimat</h4><p className="text-brand-900">{region.climate.type}</p></div>}
                {region.terroir && <div className="p-6 bg-brand-50 rounded-xl"><h4 className="text-sm uppercase tracking-wider text-brand-700 mb-2">Gleby</h4><p className="text-brand-900">{region.terroir}</p></div>}
              </div>
            </section>

            {region.notableWines && region.notableWines.length > 0 && (
              <section className="bg-white rounded-2xl border border-brand-100 p-8">
                <h2 className="text-2xl font-serif text-brand-900 mb-6 flex items-center gap-3"><Wine className="text-brand-400" size={24} />Znane wina</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {region.notableWines.map((wine: string) => (<div key={wine} className="flex items-center gap-3 p-4 bg-brand-50 rounded-xl"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-brand-700">{wine}</span></div>))}
                </div>
              </section>
            )}

            {region.appellations && region.appellations.length > 0 && (
              <section className="bg-white rounded-2xl border border-brand-100 p-8">
                <h2 className="text-2xl font-serif text-brand-900 mb-6 flex items-center gap-3"><Map className="text-brand-400" size={24} />Apelacje</h2>
                <div className="flex flex-wrap gap-3">
                  {region.appellations.map((a: string) => (<span key={a} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">{a}</span>))}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-brand-100 p-6 sticky top-24">
              <h3 className="text-lg font-serif text-brand-900 mb-4">W skrócie</h3>
              <dl className="space-y-4">
                <div><dt className="text-xs uppercase tracking-wider text-brand-400 mb-1">Kraj</dt><dd className="text-brand-900 font-medium">{region.country}</dd></div>
                {region.climate?.type && <div><dt className="text-xs uppercase tracking-wider text-brand-400 mb-1">Klimat</dt><dd className="text-brand-900">{region.climate.type}</dd></div>}
                {region.classification && <div><dt className="text-xs uppercase tracking-wider text-brand-400 mb-1">Klasyfikacja</dt><dd className="text-brand-900">{region.classification}</dd></div>}
              </dl>
              <div className="mt-6 pt-6 border-t border-brand-100">
                <Link href={`/sklep?region=${region.slug}`} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-900 text-white rounded-full font-medium hover:bg-brand-700 transition-colors">
                  <Wine size={18} />Wina z {region.namePl || region.name}
                </Link>
              </div>
            </div>

            {relatedRegions.length > 0 && (
              <div className="bg-white rounded-2xl border border-brand-100 p-6">
                <h3 className="text-lg font-serif text-brand-900 mb-4">Inne regiony {region.country}</h3>
                <div className="space-y-3">
                  {relatedRegions.map((r) => (
                    <Link key={r.id} href={`/wino/regiony/${r.slug}`} className="flex items-center justify-between p-3 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors group">
                      <div><span className="text-brand-900 font-medium">{r.namePl || r.name}</span></div>
                      <ChevronRight size={16} className="text-brand-400 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegionDetailClient;
