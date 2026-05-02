"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Globe, Thermometer, Wine, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";

import { RED_GRAPE_VARIETIES, WHITE_GRAPE_VARIETIES } from "@/content/wineEncyclopedia";
import type { GrapeVariety } from "@/types/wineEncyclopedia";

interface GrapeDetailClientProps {
  slug: string;
}

const GrapeDetailClient: React.FC<GrapeDetailClientProps> = ({ slug }) => {
  const allGrapes = [...RED_GRAPE_VARIETIES, ...WHITE_GRAPE_VARIETIES];
  const grape = allGrapes.find((g) => g.slug === slug);

  if (!grape) {
    notFound();
  }

  // Get related grapes (same color)
  const relatedGrapes = allGrapes
    .filter((g) => g.color === grape.color && g.id !== grape.id)
    .slice(0, 3);

  // Flatten flavor notes
  const allFlavorNotes = [
    ...(grape.flavorProfile?.primary || []),
    ...(grape.flavorProfile?.secondary || []),
    ...(grape.flavorProfile?.tertiary || []),
  ];

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Hero Section */}
      <section className="relative bg-brand-900 text-white pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src={grape.image?.url || "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1600"}
            alt={grape.image?.alt || grape.name}
            fill
            className="object-cover opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900/90 via-brand-900/70 to-brand-900/50" />
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
              href="/encyklopedia/wino/szczepy"
              className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Szczepy winogron</span>
            </Link>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              {/* Type Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="mb-4"
              >
                <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${
                  grape.color === 'czerwony'
                    ? 'bg-red-500/20 text-red-200'
                    : 'bg-amber-500/20 text-amber-200'
                }`}>
                  {grape.color === 'czerwony' ? 'Szczep czerwony' : 'Szczep biały'}
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.6 }}
                className="text-4xl md:text-5xl lg:text-6xl font-serif mb-4"
              >
                {grape.name}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-white/60 text-lg italic mb-6"
              >
                {grape.alternateNames && grape.alternateNames.length > 0 && (
                  <span>Znany także jako: {grape.alternateNames.join(', ')}</span>
                )}
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.6 }}
                className="text-white/80 text-lg leading-relaxed"
              >
                {grape.description}
              </motion.p>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="flex flex-wrap gap-6 mt-8"
              >
                <div className="flex items-center gap-2 text-white/60">
                  <Globe size={18} />
                  <span className="text-white">{grape.origin}</span>
                </div>
              </motion.div>
            </div>

            {/* Grape Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="relative hidden lg:block"
            >
              <div className="relative aspect-square rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl">
                <Image
                  src={grape.image?.url || "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800"}
                  alt={grape.name}
                  fill
                  className="object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-6 lg:px-12 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-12">
            {/* Flavor Profile */}
            {allFlavorNotes.length > 0 && (
              <section className="bg-white rounded-2xl border border-brand-100 p-8">
                <h2 className="text-2xl font-serif text-brand-900 mb-6 flex items-center gap-3">
                  <Wine className="text-brand-400" size={24} />
                  Profil smakowy
                </h2>
                <div className="space-y-4">
                  {grape.flavorProfile?.primary && grape.flavorProfile.primary.length > 0 && (
                    <div>
                      <h4 className="text-sm uppercase tracking-wider text-brand-700 mb-2">Aromaty pierwotne</h4>
                      <div className="flex flex-wrap gap-2">
                        {grape.flavorProfile.primary.map((note: string) => (
                          <span key={note} className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm">
                            {note}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {grape.flavorProfile?.secondary && grape.flavorProfile.secondary.length > 0 && (
                    <div>
                      <h4 className="text-sm uppercase tracking-wider text-brand-700 mb-2">Aromaty drugorzędne</h4>
                      <div className="flex flex-wrap gap-2">
                        {grape.flavorProfile.secondary.map((note: string) => (
                          <span key={note} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm">
                            {note}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {grape.flavorProfile?.tertiary && grape.flavorProfile.tertiary.length > 0 && (
                    <div>
                      <h4 className="text-sm uppercase tracking-wider text-brand-700 mb-2">Aromaty trzeciorzędne (dojrzewanie)</h4>
                      <div className="flex flex-wrap gap-2">
                        {grape.flavorProfile.tertiary.map((note: string) => (
                          <span key={note} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm">
                            {note}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Serving Temperature */}
            {grape.servingTemp && (
              <section className="bg-white rounded-2xl border border-brand-100 p-8">
                <h2 className="text-2xl font-serif text-brand-900 mb-6 flex items-center gap-3">
                  <Thermometer className="text-brand-400" size={24} />
                  Serwowanie
                </h2>
                <div className="p-6 bg-brand-50 rounded-xl">
                  <h4 className="text-sm uppercase tracking-wider text-brand-700 mb-2">Temperatura serwowania</h4>
                  <p className="text-2xl font-serif text-brand-900">{grape.servingTemp.min}-{grape.servingTemp.max}°C</p>
                </div>
              </section>
            )}

            {/* Notable Regions */}
            {grape.primaryRegions && grape.primaryRegions.length > 0 && (
              <section className="bg-white rounded-2xl border border-brand-100 p-8">
                <h2 className="text-2xl font-serif text-brand-900 mb-6 flex items-center gap-3">
                  <Globe className="text-brand-400" size={24} />
                  Główne regiony uprawy
                </h2>
                <div className="flex flex-wrap gap-3">
                  {grape.primaryRegions.map((region: string) => (
                    <span
                      key={region}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                    >
                      {region}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Info */}
            <div className="bg-white rounded-2xl border border-brand-100 p-6 sticky top-24">
              <h3 className="text-lg font-serif text-brand-900 mb-4">W skrócie</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-brand-400 mb-1">Pochodzenie</dt>
                  <dd className="text-brand-900 font-medium">{grape.origin}</dd>
                </div>
                {grape.alternateNames && grape.alternateNames.length > 0 && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-brand-400 mb-1">Inne nazwy</dt>
                    <dd className="text-brand-900">{grape.alternateNames.join(', ')}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs uppercase tracking-wider text-brand-400 mb-1">Typ</dt>
                  <dd className="text-brand-900 font-medium">
                    {grape.color === 'czerwony' ? 'Czerwony' : 'Biały'}
                  </dd>
                </div>
                {grape.agingPotential && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-brand-400 mb-1">Potencjał starzenia</dt>
                    <dd className="text-brand-900">{grape.agingPotential}</dd>
                  </div>
                )}
              </dl>

              {/* CTA */}
              <div className="mt-6 pt-6 border-t border-brand-100">
                <Link
                  href={`/sklep?grape=${grape.slug}`}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-900 text-white rounded-full font-medium hover:bg-brand-700 transition-colors"
                >
                  <Wine size={18} />
                  Zobacz wina {grape.name}
                </Link>
              </div>
            </div>

            {/* Famous Wines */}
            {grape.famousWines && grape.famousWines.length > 0 && (
              <div className="bg-white rounded-2xl border border-brand-100 p-6">
                <h3 className="text-lg font-serif text-brand-900 mb-4">Znane wina</h3>
                <ul className="space-y-2">
                  {grape.famousWines.map((wine: string) => (
                    <li key={wine} className="text-brand-600 text-sm flex items-center gap-2">
                      <Wine size={12} className="text-brand-300" />
                      {wine}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related Grapes */}
            {relatedGrapes.length > 0 && (
              <div className="bg-white rounded-2xl border border-brand-100 p-6">
                <h3 className="text-lg font-serif text-brand-900 mb-4">Podobne szczepy</h3>
                <div className="space-y-3">
                  {relatedGrapes.map((related) => (
                    <Link
                      key={related.id}
                      href={`/encyklopedia/wino/szczepy/${related.slug}`}
                      className="flex items-center justify-between p-3 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors group"
                    >
                      <div>
                        <span className="text-brand-900 font-medium">{related.name}</span>
                        <span className="text-brand-700 text-sm block">{related.origin}</span>
                      </div>
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

export default GrapeDetailClient;
