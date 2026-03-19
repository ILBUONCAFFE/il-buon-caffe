"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, ChevronRight, Globe, Thermometer, Mountain, Wine } from "lucide-react";

import { RED_GRAPE_VARIETIES, WHITE_GRAPE_VARIETIES } from "@/content/wineEncyclopedia";
import type { GrapeVariety } from "@/types/wineEncyclopedia";

// ============================================
// GRAPE CARD COMPONENT
// ============================================

interface GrapeCardProps {
  grape: GrapeVariety;
  index: number;
}

const GrapeCard: React.FC<GrapeCardProps> = ({ grape, index }) => {
  // Flatten flavorProfile into a list of notes
  const allFlavorNotes = [
    ...(grape.flavorProfile?.primary || []),
    ...(grape.flavorProfile?.secondary || []),
    ...(grape.flavorProfile?.tertiary || []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
    >
      <Link
        href={`/encyklopedia/wino/szczepy/${grape.slug}`}
        className="group block bg-white rounded-2xl border border-brand-100 overflow-hidden hover:border-brand-300 hover:shadow-xl transition-all duration-500 h-full"
      >
        {/* Image */}
        <div 
          className="relative h-48 overflow-hidden isolate"
          style={{ WebkitMaskImage: "-webkit-radial-gradient(white, black)" }}
        >
          <Image
            src={grape.image?.url || "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800"}
            alt={grape.image?.alt || grape.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110 will-change-transform"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          {/* Type Badge */}
          <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
            grape.color === 'czerwony' 
              ? 'bg-red-100 text-red-700' 
              : 'bg-amber-100 text-amber-700'
          }`}>
            {grape.color === 'czerwony' ? 'Czerwony' : 'Biały'}
          </div>

          {/* Name overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-xl font-serif text-white mb-1">
              {grape.name}
            </h3>
            {grape.alternateNames && grape.alternateNames.length > 0 && (
              <p className="text-white/70 text-sm italic">
                {grape.alternateNames[0]}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Origin */}
          <div className="flex items-center gap-2 text-xs text-brand-700 mb-3">
            <Globe size={14} />
            <span>{grape.origin}</span>
          </div>

          {/* Short description */}
          <p className="text-sm text-brand-600 leading-relaxed line-clamp-3 mb-4">
            {grape.description}
          </p>

          {/* Flavor notes preview */}
          {allFlavorNotes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {allFlavorNotes.slice(0, 4).map((note: string) => (
                <span
                  key={note}
                  className="px-2 py-0.5 bg-brand-50 text-brand-600 text-xs rounded-full"
                >
                  {note}
                </span>
              ))}
              {allFlavorNotes.length > 4 && (
                <span className="px-2 py-0.5 bg-brand-50 text-brand-400 text-xs rounded-full">
                  +{allFlavorNotes.length - 4}
                </span>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center text-xs font-bold uppercase tracking-wider text-brand-700 group-hover:text-brand-700 transition-colors">
            <span>Poznaj szczep</span>
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

const GrapeVarietiesSection: React.FC = () => {
  const [filter, setFilter] = React.useState<'all' | 'czerwony' | 'biały'>('all');

  const filteredGrapes = React.useMemo(() => {
    const allGrapes = [...RED_GRAPE_VARIETIES, ...WHITE_GRAPE_VARIETIES];
    if (filter === 'all') return allGrapes;
    return allGrapes.filter((grape) => grape.color === filter);
  }, [filter]);

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Hero Section */}
      <section className="relative bg-brand-900 text-white pt-24 pb-16 md:pt-32 md:pb-20 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-red-900/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-amber-900/20 to-transparent rounded-full blur-3xl" />
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
              Szczepy winogron
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-white/70 text-lg md:text-xl leading-relaxed"
            >
              Poznaj charakterystyki najważniejszych odmian winogron - od klasycznego
              Cabernet Sauvignon po aromatyczny Gewürztraminer.
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
          {[
            { key: 'all', label: 'Wszystkie', count: RED_GRAPE_VARIETIES.length + WHITE_GRAPE_VARIETIES.length },
            { key: 'czerwony', label: 'Czerwone', count: RED_GRAPE_VARIETIES.length },
            { key: 'biały', label: 'Białe', count: WHITE_GRAPE_VARIETIES.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as 'all' | 'czerwony' | 'biały')}
              aria-pressed={filter === tab.key}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                filter === tab.key
                  ? 'bg-brand-900 text-white shadow-lg'
                  : 'bg-white text-brand-600 hover:bg-brand-100 border border-brand-200'
              }`}
            >
              {tab.label}
              <span className={`ml-2 ${filter === tab.key ? 'text-white/60' : 'text-brand-400'}`}>
                ({tab.count})
              </span>
            </button>
          ))}
        </motion.div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl border border-brand-100 p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
              <Wine size={24} />
            </div>
            <div>
              <h3 className="font-serif text-brand-900 mb-1">Taniny</h3>
              <p className="text-sm text-brand-700">
                Polifenole ze skórek nadające strukturę czerwonym winom
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-brand-100 p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Thermometer size={24} />
            </div>
            <div>
              <h3 className="font-serif text-brand-900 mb-1">Kwasowość</h3>
              <p className="text-sm text-brand-700">
                Świeżość i żywotność - kluczowa cecha białych win
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-brand-100 p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
              <Mountain size={24} />
            </div>
            <div>
              <h3 className="font-serif text-brand-900 mb-1">Terroir</h3>
              <p className="text-sm text-brand-700">
                Gleba, klimat i położenie kształtujące charakter szczepu
              </p>
            </div>
          </div>
        </div>

        {/* Grapes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGrapes.map((grape, index) => (
            <GrapeCard key={grape.id} grape={grape} index={index} />
          ))}
        </div>

        {/* Empty State */}
        {filteredGrapes.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-brand-100">
            <Wine size={48} className="mx-auto text-brand-300 mb-4" />
            <h3 className="text-xl font-serif text-brand-900 mb-2">
              Brak wyników
            </h3>
            <p className="text-brand-700">
              Nie znaleziono szczepów pasujących do wybranych filtrów.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GrapeVarietiesSection;
