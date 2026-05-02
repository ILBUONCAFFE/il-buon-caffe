"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Search,
  BookOpen,
  Grape,
  Globe,
  Wine,
  GlassWater,
  Archive,
  Factory,
  Award,
  Calendar,
  BookA,
  Home,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from "lucide-react";

import { WINE_ENCYCLOPEDIA_CATEGORIES } from "@/content/wineEncyclopedia";

// ============================================
// ICON MAP
// ============================================

const iconMap: Record<string, React.ReactNode> = {
  BookOpen: <BookOpen size={24} />,
  Grape: <Grape size={24} />,
  Globe: <Globe size={24} />,
  Wine: <Wine size={24} />,
  GlassWater: <GlassWater size={24} />,
  Archive: <Archive size={24} />,
  Factory: <Factory size={24} />,
  Award: <Award size={24} />,
  Calendar: <Calendar size={24} />,
  BookA: <BookA size={24} />,
  Home: <Home size={24} />,
};

// ============================================
// CATEGORY CARD COMPONENT
// ============================================

interface CategoryCardProps {
  category: (typeof WINE_ENCYCLOPEDIA_CATEGORIES)[number];
  index: number;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
    >
      <Link
        href={`/encyklopedia/wino/${category.slug}`}
        className="group relative block bg-white rounded-2xl border border-brand-100 overflow-hidden hover:border-brand-300 hover:shadow-xl transition-all duration-500"
      >
        {/* Image */}
        <div className="relative h-40 overflow-hidden">
          <Image
            src={category.image.url}
            alt={category.image.alt}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          
          {/* Icon Badge */}
          <div className="absolute top-4 left-4 w-12 h-12 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center text-brand-600 group-hover:bg-brand-700 group-hover:text-white transition-all duration-300">
            {iconMap[category.icon] || <Sparkles size={24} />}
          </div>
          
          {/* Article Count */}
          {category.articleCount && (
            <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-bold text-brand-700">
              {category.articleCount} artykułów
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-lg font-serif text-brand-900 mb-2 group-hover:text-brand-600 transition-colors">
            {category.namePl}
          </h3>
          <p className="text-sm text-brand-700 leading-relaxed line-clamp-2 mb-4">
            {category.description}
          </p>
          <div className="flex items-center text-xs font-bold uppercase tracking-wider text-brand-400 group-hover:text-brand-600 transition-colors">
            <span>Odkryj</span>
            <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

// ============================================
// FEATURED SECTION
// ============================================

const FeaturedSection: React.FC = () => {
  const featuredItems = [
    {
      title: "Pinot Noir - Szczep dla koneserów",
      category: "Szczepy",
      image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800",
      href: "/encyklopedia/wino/szczepy/pinot-noir",
      readTime: "8 min",
    },
    {
      title: "Toskania - Kraina słońca i Sangiovese",
      category: "Regiony",
      image: "https://images.unsplash.com/photo-1523528283115-9bf9b1699245?w=800",
      href: "/encyklopedia/wino/regiony/toskania",
      readTime: "12 min",
    },
    {
      title: "Burgundia i jej climats",
      category: "Regiony",
      image: "https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=800",
      href: "/encyklopedia/wino/regiony/burgundia",
      readTime: "10 min",
    },
  ];

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif text-brand-900 mb-2">
            Polecane artykuły
          </h2>
          <p className="text-brand-700">
            Najpopularniejsze wpisy z naszej encyklopedii
          </p>
        </div>
        <Link
          href="/encyklopedia/wino/szczepy"
          className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-brand-100 text-brand-700 rounded-full text-sm font-medium hover:bg-brand-200 transition-colors"
        >
          Zobacz wszystkie
          <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {featuredItems.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + idx * 0.1, duration: 0.5 }}
          >
            <Link
              href={item.href}
              className="group block bg-white rounded-2xl border border-brand-100 overflow-hidden hover:border-brand-300 hover:shadow-lg transition-all duration-300"
            >
              <div className="relative h-48">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="inline-block px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider text-brand-700 mb-2">
                    {item.category}
                  </span>
                  <h3 className="text-lg font-serif text-white leading-tight">
                    {item.title}
                  </h3>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <span className="text-xs text-brand-400">
                  {item.readTime} czytania
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-700 group-hover:text-brand-700 transition-colors flex items-center gap-1">
                  Czytaj
                  <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

// ============================================
// STATS SECTION
// ============================================

const StatsSection: React.FC = () => {
  const stats = [
    { value: "14+", label: "Szczepów", icon: <Grape size={20} /> },
    { value: "12+", label: "Regionów", icon: <Globe size={20} /> },
    { value: "80+", label: "Terminów", icon: <BookA size={20} /> },
    { value: "6+", label: "Winnic", icon: <Home size={20} /> },
  ];

  return (
    <section className="bg-brand-900 rounded-3xl p-8 md:p-12 mb-16 text-white">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-serif mb-3">
          Twoja kompletna baza wiedzy
        </h2>
        <p className="text-white/60 max-w-xl mx-auto">
          Od podstaw winiarskiej wiedzy po zaawansowane techniki degustacji - 
          znajdziesz tu wszystko, czego potrzebujesz.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + idx * 0.1, duration: 0.4 }}
            className="text-center"
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center text-white/70">
              {stat.icon}
            </div>
            <div className="text-3xl md:text-4xl font-bold text-white mb-1">
              {stat.value}
            </div>
            <div className="text-sm text-white/60 uppercase tracking-wider">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const WineEncyclopediaClient: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return WINE_ENCYCLOPEDIA_CATEGORIES;
    }
    const query = searchQuery.toLowerCase();
    return WINE_ENCYCLOPEDIA_CATEGORIES.filter(
      (cat) =>
        cat.namePl.toLowerCase().includes(query) ||
        cat.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Hero Section */}
      <section className="relative bg-brand-900 text-white pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-brand-700/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-brand-800/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-6 lg:px-12 relative z-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Wine size={24} className="text-white/70" />
              </div>
              <span className="text-white/60 text-sm font-medium uppercase tracking-wider">
                Encyklopedia Wina
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl font-serif mb-6"
            >
              Odkryj świat wina
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-white/70 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl"
            >
              Kompletna baza wiedzy o winie - od podstaw po zaawansowane techniki.
              Poznaj szczepy, regiony, sztukę degustacji i serwowania wina.
            </motion.p>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="relative max-w-xl"
            >
              <input
                type="text"
                placeholder="Szukaj w encyklopedii..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-full py-4 pl-14 pr-6 text-white placeholder:text-white/40 focus:outline-none focus:bg-white/15 focus:border-white/30 transition-all"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" size={22} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-6 lg:px-12 py-12 md:py-16">
        {/* Categories Grid */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-serif text-brand-900 mb-2">
                Kategorie
              </h2>
              <p className="text-brand-700">
                Przeglądaj encyklopedię według tematów
              </p>
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-sm text-brand-700 hover:text-brand-700 underline"
              >
                Pokaż wszystkie
              </button>
            )}
          </div>

          {filteredCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCategories.map((category, index) => (
                <CategoryCard key={category.id} category={category} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-brand-100">
              <Search size={48} className="mx-auto text-brand-300 mb-4" />
              <h3 className="text-xl font-serif text-brand-900 mb-2">
                Brak wyników
              </h3>
              <p className="text-brand-700 mb-6">
                Nie znaleziono kategorii pasujących do "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery("")}
                className="px-6 py-2.5 bg-brand-900 text-white rounded-full text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Pokaż wszystkie kategorie
              </button>
            </div>
          )}
        </section>

        {/* Featured Articles */}
        <FeaturedSection />

        {/* Stats */}
        <StatsSection />

        {/* Quick Links */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <Link
            href="/encyklopedia/wino/szczepy"
            className="group relative bg-white rounded-2xl border border-brand-100 p-8 hover:border-brand-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-100 transition-colors" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-5">
                <Grape size={28} />
              </div>
              <h3 className="text-xl font-serif text-brand-900 mb-2">
                Szczepy winogron
              </h3>
              <p className="text-brand-700 mb-4">
                Poznaj Cabernet Sauvignon, Pinot Noir, Chardonnay i dziesiątki innych odmian.
              </p>
              <span className="inline-flex items-center text-sm font-bold uppercase tracking-wider text-brand-600 group-hover:text-brand-800 transition-colors">
                Zobacz szczepy
                <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>

          <Link
            href="/encyklopedia/wino/regiony"
            className="group relative bg-white rounded-2xl border border-brand-100 p-8 hover:border-brand-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-100 transition-colors" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5">
                <Globe size={28} />
              </div>
              <h3 className="text-xl font-serif text-brand-900 mb-2">
                Regiony winiarskie
              </h3>
              <p className="text-brand-700 mb-4">
                Od Bordeaux po Napa Valley - odkryj najważniejsze terroir świata.
              </p>
              <span className="inline-flex items-center text-sm font-bold uppercase tracking-wider text-brand-600 group-hover:text-brand-800 transition-colors">
                Przeglądaj regiony
                <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        </section>

        {/* Newsletter CTA */}
        <section className="bg-brand-100 rounded-3xl p-8 md:p-12">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-2xl md:text-3xl font-serif text-brand-900 mb-4">
              Poszerz swoją wiedzę o winie
            </h3>
            <p className="text-brand-600 mb-8">
              Zapisz się do newslettera i otrzymuj nowe artykuły, wskazówki
              degustacyjne oraz oferty specjalne.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <input
                type="email"
                aria-label="Adres email do newslettera"
                placeholder="Twój adres email"
                className="flex-1 max-w-sm px-6 py-4 rounded-full border border-brand-200 bg-white focus:outline-none focus:border-brand-700 transition-colors"
              />
              <button className="px-8 py-4 bg-brand-900 text-white font-bold uppercase tracking-wider rounded-full hover:bg-brand-700 transition-colors">
                Zapisz się
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default WineEncyclopediaClient;
