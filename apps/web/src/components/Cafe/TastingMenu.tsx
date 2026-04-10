"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Coffee, Wine, CakeSlice } from "lucide-react";
import { CAFE_MENU } from "@/lib/constants";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const TABS = [
  { label: "Klasyki", icon: Coffee, variant: "light" as const },
  { label: "Specjały", icon: Wine, variant: "dark" as const },
  { label: "Desery", icon: CakeSlice, variant: "light" as const },
];

const ItemCard = ({
  name,
  price,
  description,
  index,
  variant,
}: {
  name: string;
  price: string;
  description?: string;
  index: number;
  variant: "light" | "dark";
}) => {
  const isDark = variant === "dark";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
      transition={{ duration: 0.5, delay: index * 0.04, ease: EASE }}
      className={`group relative rounded-2xl border p-6 transition-all duration-500 cursor-default ${
        isDark
          ? "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20"
          : "bg-white border-brand-100 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-900/5"
      }`}
    >
      {/* Price badge */}
      <div
        className={`absolute top-5 right-5 font-mono text-sm font-bold px-3 py-1 rounded-full transition-colors duration-300 ${
          isDark
            ? "bg-white/[0.06] text-brand-300 group-hover:bg-brand-400/20"
            : "bg-brand-50 text-brand-900 group-hover:bg-brand-100"
        }`}
      >
        {price}
      </div>

      {/* Name */}
      <h4
        className={`font-serif text-xl md:text-2xl pr-20 transition-colors duration-300 ${
          isDark
            ? "text-white group-hover:text-brand-300"
            : "text-brand-900 group-hover:text-brand-700"
        }`}
      >
        {name}
      </h4>

      {/* Description */}
      {description && (
        <p
          className={`mt-2 text-sm leading-relaxed ${
            isDark ? "text-white/40" : "text-brand-500"
          }`}
        >
          {description}
        </p>
      )}

      {/* Subtle hover line */}
      <div
        className={`absolute bottom-0 left-6 right-6 h-px origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isDark ? "bg-brand-400/30" : "bg-brand-300"
        }`}
      />
    </motion.div>
  );
};

export const TastingMenu: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const tabId = customEvent.detail;
      if (tabId === 'klasyki') setActiveTab(0);
      else if (tabId === 'specjaly') setActiveTab(1);
      else if (tabId === 'desery') setActiveTab(2);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('changeMenuTab', handleTabChange);
      return () => window.removeEventListener('changeMenuTab', handleTabChange);
    }
  }, []);

  const currentMenu = CAFE_MENU[activeTab];
  const variant = TABS[activeTab].variant;
  const isDark = variant === "dark";

  return (
    <section
      id="menu"
      className={`relative py-24 md:py-32 transition-colors duration-700 scroll-mt-20 ${
        isDark ? "bg-brand-900" : "bg-brand-beige"
      }`}
    >
      <div className="container mx-auto px-6 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: EASE }}
          className="mb-16 md:mb-20"
        >
          <span
            className={`block text-[11px] uppercase tracking-[0.3em] font-medium mb-5 ${
              isDark ? "text-white/25" : "text-brand-400"
            }`}
          >
            Nasza karta
          </span>
          <h2
            className={`text-4xl md:text-5xl lg:text-6xl font-serif ${
              isDark ? "text-white" : "text-brand-900"
            }`}
          >
            Menu
          </h2>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-12 md:mb-16">
          {TABS.map((tab, i) => {
            const isActive = activeTab === i;
            const TabIcon = tab.icon;

            return (
              <button
                key={tab.label}
                onClick={() => {
                  setActiveTab(i);
                  scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
                }}
                className={`relative flex items-center gap-2.5 px-5 py-3 rounded-full text-sm font-medium tracking-wide transition-all duration-500 cursor-pointer ${
                  isActive
                    ? isDark
                      ? "bg-white text-brand-900"
                      : "bg-brand-900 text-white"
                    : isDark
                      ? "bg-white/[0.06] text-white/50 hover:text-white hover:bg-white/10"
                      : "bg-brand-100 text-brand-600 hover:text-brand-900 hover:bg-brand-200"
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="menu-tab-count"
                    className={`ml-1 text-xs font-mono ${
                      isDark ? "text-brand-500" : "text-white/60"
                    }`}
                  >
                    {CAFE_MENU[i].items.length}
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>

        {/* Cards grid */}
        <div ref={scrollRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {currentMenu.items.map((item, idx) => (
                <ItemCard
                  key={`${activeTab}-${item.name}`}
                  name={item.name}
                  price={item.price}
                  description={item.description}
                  index={idx}
                  variant={variant}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};
