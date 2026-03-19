"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ENCYCLOPEDIA_ENTRIES, ENCYCLOPEDIA_CATEGORIES } from "@/lib/constants";
import { Article } from "@/types";
import {
  BookOpen,
  ArrowRight,
  X,
  Clock,
  Share2,
  Search,
  ChevronLeft,
  Heart,
  Bookmark,
  ArrowUpRight,
  Coffee,
  Wine,
  Utensils,
  Leaf,
} from "lucide-react";

// ============================================
// ARTICLE CARD COMPONENT
// ============================================

const ArticleCard: React.FC<{
  article: Article;
  index: number;
  onClick: () => void;
  featured?: boolean;
}> = ({ article, index, onClick, featured = false }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  if (featured) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1, duration: 0.5 }}
        className="group cursor-pointer col-span-full lg:col-span-2 row-span-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 rounded-3xl"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      >
        <div className="relative h-full min-h-[500px] rounded-3xl overflow-hidden bg-brand-100">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          {/* Category Badge */}
          <div className="absolute top-6 left-6 flex items-center gap-3">
            <span className="px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider text-brand-900 shadow-lg">
              {article.category}
            </span>
            <span className="px-4 py-2 bg-brand-700 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
              Wyróżniony
            </span>
          </div>

          {/* Actions */}
          <div className="absolute top-6 right-6 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLiked(!isLiked);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isLiked ? "bg-red-500 text-white" : "bg-white/90 backdrop-blur-sm text-brand-700"
              }`}
            >
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsBookmarked(!isBookmarked);
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isBookmarked ? "bg-brand-700 text-white" : "bg-white/90 backdrop-blur-sm text-brand-700"
              }`}
            >
              <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12 text-white">
            <div className="flex items-center gap-3 mb-4 text-white/70 text-sm">
              <Clock size={16} />
              <span>{article.readTime}</span>
            </div>
            <h2 className="text-3xl lg:text-5xl font-serif mb-4 leading-tight group-hover:text-brand-300 transition-colors">
              {article.title}
            </h2>
            <p className="text-white/70 text-lg leading-relaxed max-w-2xl mb-6 line-clamp-2">
              {article.subtitle}
            </p>
            <div className="flex items-center gap-2 text-white font-medium group/btn">
              <span className="text-sm uppercase tracking-wider">Czytaj artykuł</span>
              <ArrowRight size={18} className="group-hover/btn:translate-x-2 transition-transform" />
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.1, 0.5), duration: 0.5 }}
      className="group cursor-pointer flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 rounded-2xl"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl mb-5 bg-brand-100">
        <Image
          src={article.image}
          alt={article.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Category Badge */}
        <div className="absolute top-4 left-4 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full text-[10px] font-bold uppercase tracking-wider text-brand-900 shadow-sm">
          {article.category}
        </div>

        {/* Quick Actions */}
        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsBookmarked(!isBookmarked);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isBookmarked ? "bg-brand-700 text-white" : "bg-white/90 backdrop-blur-sm text-brand-700"
            }`}
          >
            <Bookmark size={14} fill={isBookmarked ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-grow px-1">
        <div className="flex items-center gap-2 text-[10px] text-brand-400 font-bold uppercase tracking-wider mb-3">
          <Clock size={12} />
          {article.readTime}
        </div>
        <h2 className="text-xl font-serif text-brand-900 mb-3 leading-tight group-hover:text-brand-600 transition-colors">
          {article.title}
        </h2>
        <p className="text-brand-700 text-sm leading-relaxed line-clamp-2 mb-4 flex-grow">
          {article.subtitle}
        </p>

        <div className="mt-auto pt-4 border-t border-brand-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-700 group-hover:text-brand-700 transition-colors">
            Czytaj więcej
          </span>
          <ArrowUpRight
            size={16}
            className="text-brand-400 group-hover:text-brand-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all"
          />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// ARTICLE DETAIL OVERLAY
// ============================================

const ArticleDetail: React.FC<{
  article: Article | null;
  onClose: () => void;
}> = ({ article, onClose }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (article) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [article]);

  return (
    <AnimatePresence>
      {article && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-white overflow-y-auto"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative min-h-screen"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="fixed top-6 right-6 z-50 w-12 h-12 bg-white/90 backdrop-blur-md border border-brand-200 text-brand-700 rounded-full flex items-center justify-center hover:bg-brand-900 hover:text-white hover:border-brand-900 transition-all shadow-lg group"
            >
              <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Back Button */}
            <button
              onClick={onClose}
              className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md border border-brand-200 text-brand-700 rounded-full hover:bg-brand-900 hover:text-white hover:border-brand-900 transition-all shadow-lg text-sm font-medium"
            >
              <ChevronLeft size={18} />
              Powrót
            </button>

            {/* Article Hero */}
            <div className="relative h-[60vh] md:h-[70vh] w-full overflow-hidden">
              <Image
                src={article.image}
                alt={article.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

              <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 lg:p-24 text-white">
                <div className="max-w-4xl">
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-block px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-xs uppercase tracking-wider mb-6"
                  >
                    {article.category}
                  </motion.span>
                  <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-4xl md:text-6xl lg:text-7xl font-serif mb-6 leading-[1.1]"
                  >
                    {article.title}
                  </motion.h1>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap items-center gap-6 text-sm text-white/70"
                  >
                    <span className="flex items-center gap-2">
                      <Clock size={16} /> {article.readTime}
                    </span>
                    <button className="flex items-center gap-2 hover:text-white transition-colors">
                      <Share2 size={16} /> Udostępnij
                    </button>
                    <button className="flex items-center gap-2 hover:text-white transition-colors">
                      <Bookmark size={16} /> Zapisz
                    </button>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Article Content */}
            <div ref={contentRef} className="bg-white">
              <div className="max-w-3xl mx-auto px-6 md:px-8 py-16 md:py-24">
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-xl md:text-2xl font-serif text-brand-600 italic mb-12 leading-relaxed border-l-4 border-brand-300 pl-6"
                >
                  {article.subtitle}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="prose prose-lg prose-stone max-w-none
                    prose-headings:font-serif prose-headings:text-brand-900 prose-headings:font-medium
                    prose-p:text-brand-700 prose-p:leading-relaxed
                    prose-li:text-brand-700
                    prose-a:text-brand-600 prose-a:no-underline hover:prose-a:underline
                    prose-img:rounded-2xl prose-img:shadow-lg
                    prose-blockquote:border-l-brand-400 prose-blockquote:text-brand-600 prose-blockquote:italic
                    first-letter:text-6xl first-letter:font-serif first-letter:float-left first-letter:mr-4 first-letter:mt-1 first-letter:text-brand-900"
                  // SECURITY: article.content is sourced exclusively from the
                  // hardcoded ENCYCLOPEDIA_ENTRIES constant (src/lib/constants.ts).
                  // If this ever switches to DB-sourced / user-submitted HTML, add
                  // DOMPurify sanitisation before rendering: DOMPurify.sanitize(article.content)
                  dangerouslySetInnerHTML={{ __html: article.content }}
                />

                {/* Footer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-20 pt-10 border-t border-brand-200"
                >
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                      <p className="text-brand-400 text-sm mb-2">Podobał Ci się ten artykuł?</p>
                      <p className="text-brand-600 font-medium">Podziel się nim ze znajomymi!</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 hover:bg-brand-200 transition-colors">
                        <Share2 size={20} />
                      </button>
                      <button className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 hover:bg-brand-200 transition-colors">
                        <Heart size={20} />
                      </button>
                      <button className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 hover:bg-brand-200 transition-colors">
                        <Bookmark size={20} />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={onClose}
                    className="w-full mt-10 py-4 bg-brand-900 text-white font-bold uppercase tracking-wider rounded-full hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <ChevronLeft size={18} />
                    Wróć do encyklopedii
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const EncyclopediaClient: React.FC = () => {
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const categoryIconMap = {
    pasta: Utensils,
    wine: Wine,
    coffee: Coffee,
    olive: Leaf,
  } as const;

  // Map category IDs to URL paths
  const getCategoryPath = (categoryId: string) => {
    if (categoryId === 'wine') return 'wino';
    return categoryId;
  };

  const filteredArticles = useMemo(() => {
    return ENCYCLOPEDIA_ENTRIES.filter((article) => {
      const matchesSearch =
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.subtitle.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [searchQuery]);

  const featuredArticle = filteredArticles[0];
  const regularArticles = filteredArticles.slice(1);

  return (
    <div className="min-h-screen bg-brand-50">
      {/* Article Detail Overlay */}
      <ArticleDetail article={activeArticle} onClose={() => setActiveArticle(null)} />

      {/* Hero Header */}
      <div className="bg-brand-900 text-white pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <BookOpen size={20} className="text-white/70" />
              </div>
              <span className="text-white/60 text-sm font-medium uppercase tracking-wider">
                Baza Wiedzy
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif mb-4">
              Encyklopedia Smaku
            </h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-xl">
              Odkryj tajniki parzenia kawy, historię winnic i sekrety kuchni świata.
            </p>
          </div>

          <div className="mt-10" />
        </div>
      </div>

      {/* Content Grid - Two Equal Columns */}
      <div className="container mx-auto px-6 lg:px-12 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Categories Column */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-serif text-brand-900">Kategorie</h2>
              <span className="text-xs uppercase tracking-[0.15em] text-brand-400 font-medium">
                Wiedza produktowa
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ENCYCLOPEDIA_CATEGORIES.map((cat) => {
                const Icon = categoryIconMap[cat.id];
                return (
                  <Link
                    key={cat.id}
                    href={`/encyklopedia/${getCategoryPath(cat.id)}`}
                    className="group relative bg-white rounded-2xl border border-brand-100 p-6 hover:border-brand-300 hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-100 transition-colors" />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center mb-4 group-hover:bg-brand-200 transition-colors">
                        <Icon size={22} className="text-brand-600" />
                      </div>
                      <h3 className="text-lg font-serif text-brand-900 mb-1 group-hover:text-brand-700 transition-colors">
                        {cat.label}
                      </h3>
                      <p className="text-sm text-brand-700 leading-relaxed">
                        {cat.description}
                      </p>
                      <div className="flex items-center gap-1 mt-4 text-xs font-medium text-brand-400 group-hover:text-brand-600 transition-colors">
                        <span>Czytaj więcej</span>
                        <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Articles Column */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-serif text-brand-900">Artykuły</h2>
              <div className="flex items-center gap-3">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-brand-700 hover:text-brand-700 flex items-center gap-1 transition-colors"
                  >
                    <X size={12} />
                    Wyczyść
                  </button>
                )}
                <span className="text-xs uppercase tracking-[0.15em] text-brand-400 font-medium">
                  {filteredArticles.length} pozycji
                </span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Szukaj artykułów..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-brand-200 rounded-full py-3 pl-11 pr-10 text-brand-900 placeholder:text-brand-400 focus:outline-none focus:border-brand-700 transition-colors"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400" size={18} />
              </div>
            </div>

            {filteredArticles.length > 0 ? (
              <div className="space-y-4">
                {filteredArticles.map((article, idx) => (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.4 }}
                    onClick={() => setActiveArticle(article)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveArticle(article); } }}
                    className="group cursor-pointer bg-white rounded-2xl border border-brand-100 p-5 hover:border-brand-300 hover:shadow-lg transition-all duration-300 flex gap-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                  >
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-brand-100">
                      <Image
                        src={article.image}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] text-brand-400 font-bold uppercase tracking-wider mb-2">
                        <span className="px-2 py-0.5 bg-brand-50 rounded-full">{article.category}</span>
                        <span>•</span>
                        <Clock size={10} />
                        <span>{article.readTime}</span>
                      </div>
                      <h3 className="font-serif text-brand-900 group-hover:text-brand-600 transition-colors line-clamp-1 mb-1">
                        {article.title}
                      </h3>
                      <p className="text-sm text-brand-700 line-clamp-2 leading-relaxed">
                        {article.subtitle}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-brand-100"
              >
                <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center mb-4">
                  <Search size={24} className="text-brand-400" />
                </div>
                <h3 className="text-xl font-serif text-brand-900 mb-2">Brak wyników</h3>
                <p className="text-brand-700 mb-6 text-center text-sm max-w-xs">
                  Nie znaleźliśmy artykułów pasujących do wyszukiwania.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                  }}
                  className="px-6 py-2.5 bg-brand-900 text-white font-bold uppercase tracking-wider text-xs rounded-full hover:bg-brand-700 transition-colors flex items-center gap-2"
                >
                  Pokaż wszystkie
                  <ArrowRight size={14} />
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Newsletter CTA */}
      <div className="bg-brand-100 py-20">
        <div className="container mx-auto px-6 lg:px-12">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-3xl md:text-4xl font-serif text-brand-900 mb-4">
              Chcesz więcej wiedzy?
            </h3>
            <p className="text-brand-600 mb-8">
              Zapisz się do newslettera i otrzymuj nowe artykuły bezpośrednio na swoją skrzynkę.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <input
                type="email"
                placeholder="Twój adres email"
                className="flex-1 max-w-sm px-6 py-4 rounded-full border border-brand-200 focus:outline-none focus:border-brand-700 transition-colors"
              />
              <button className="px-8 py-4 bg-brand-900 text-white font-bold uppercase tracking-wider rounded-full hover:bg-brand-700 transition-colors">
                Zapisz się
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EncyclopediaClient;
