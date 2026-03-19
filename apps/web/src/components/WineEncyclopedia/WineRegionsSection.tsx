"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, ChevronRight, MapPin, Sun, Mountain, Grape } from "lucide-react";

import { ALL_WINE_REGIONS } from "@/content/wineEncyclopedia";
import type { WineRegion } from "@/types/wineEncyclopedia";

// ============================================
// REGION CARD COMPONENT
// ============================================

interface RegionCardProps {
  region: WineRegion;
  index: number;
}

const RegionCard: React.FC<RegionCardProps> = ({ region, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
    >
      <Link
        href={`/encyklopedia/wino/regiony/${region.slug}`}
        className="group block bg-white rounded-2xl border border-brand-100 overflow-hidden hover:border-brand-300 hover:shadow-xl transition-all duration-500"
      >
        {/* Image */}
        <div 
          className="relative h-56 overflow-hidden isolate"
          style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
        >
          <Image
            src={region.image?.url || "https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=800"}
            alt={region.image?.alt || (region.namePl || region.name)}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110 will-change-transform"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Country Badge */}
          <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-brand-700">
            {region.country}
          </div>

          {/* Name overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-2xl font-serif text-white mb-1">
              {region.namePl || region.name}
            </h3>
            <p className="text-white/70 text-sm flex items-center gap-1">
              <MapPin size={12} />
              {region.name}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Climate & Terrain */}
          <div className="flex flex-wrap gap-4 text-xs text-brand-700 mb-4">
            {region.climate?.type && (
              <span className="flex items-center gap-1">
                <Sun size={12} className="text-amber-500" />
                {region.climate.type}
              </span>
            )}
            {region.terroir && (
              <span className="flex items-center gap-1">
                <Mountain size={12} className="text-brand-400" />
                {region.terroir.substring(0, 30)}...
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-brand-600 leading-relaxed line-clamp-2 mb-4">
            {region.description}
          </p>

          {/* Key Grapes */}
          {region.keyGrapes && region.keyGrapes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              <Grape size={12} className="text-brand-400 mt-0.5" />
              {region.keyGrapes.slice(0, 3).map((grape: string) => (
                <span
                  key={grape}
                  className="px-2 py-0.5 bg-brand-50 text-brand-600 text-xs rounded-full"
                >
                  {grape}
                </span>
              ))}
              {region.keyGrapes.length > 3 && (
                <span className="text-xs text-brand-400">
                  +{region.keyGrapes.length - 3}
                </span>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center text-xs font-bold uppercase tracking-wider text-brand-700 group-hover:text-brand-700 transition-colors">
            <span>Odkryj region</span>
            <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const WineRegionsSection: React.FC = () => {
  const [countryFilter, setCountryFilter] = React.useState<string>('all');

  const countries = React.useMemo(() => {
    const unique = [...new Set(ALL_WINE_REGIONS.map((r) => r.country))];
    return unique.sort();
  }, []);

  const filteredRegions = React.useMemo(() => {
    if (countryFilter === 'all') return ALL_WINE_REGIONS;
    return ALL_WINE_REGIONS.filter((region) => region.country === countryFilter);
  }, [countryFilter]);

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Hero Section */}
      <section className="relative bg-brand-900 text-white pt-24 pb-16 md:pt-32 md:pb-20 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-blue-900/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-green-900/20 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link
              href="/encyklopedia/wino"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Encyklopedia Wina</span>
            </Link>
          </motion.div>

          <div className="max-w-3xl">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl font-serif mb-6"
            >
              Regiony winiarskie
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-white/70 text-lg md:text-xl leading-relaxed"
            >
              Od Bordeaux przez Toskanię po Napa Valley - odkryj najważniejsze terroir świata
              i dowiedz się, co czyni je wyjątkowymi.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-6 lg:px-12 py-12 md:py-16">
        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-wrap gap-3 mb-10"
        >
          <button
            onClick={() => setCountryFilter('all')}
            aria-pressed={countryFilter === 'all'}
            className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
              countryFilter === 'all'
                ? 'bg-brand-900 text-white shadow-lg'
                : 'bg-white text-brand-600 hover:bg-brand-100 border border-brand-200'
            }`}
          >
            Wszystkie
            <span className={`ml-2 ${countryFilter === 'all' ? 'text-white/60' : 'text-brand-400'}`}>
              ({ALL_WINE_REGIONS.length})
            </span>
          </button>
          {countries.map((country) => {
            const count = ALL_WINE_REGIONS.filter((r) => r.country === country).length;
            return (
              <button
                key={country}
                onClick={() => setCountryFilter(country)}
                aria-pressed={countryFilter === country}
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  countryFilter === country
                    ? 'bg-brand-900 text-white shadow-lg'
                    : 'bg-white text-brand-600 hover:bg-brand-100 border border-brand-200'
                }`}
              >
                {country}
                <span className={`ml-2 ${countryFilter === country ? 'text-white/60' : 'text-brand-400'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Regions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRegions.map((region, index) => (
            <RegionCard key={region.id} region={region} index={index} />
          ))}
        </div>

        {/* Empty State */}
        {filteredRegions.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-brand-100">
            <MapPin size={48} className="mx-auto text-brand-300 mb-4" />
            <h3 className="text-xl font-serif text-brand-900 mb-2">
              Brak wyników
            </h3>
            <p className="text-brand-700">
              Nie znaleziono regionów pasujących do wybranych filtrów.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WineRegionsSection;
