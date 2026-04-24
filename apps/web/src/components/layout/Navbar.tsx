"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { ShoppingBag, User, Menu, X, Search, ChevronRight, Store, Coffee, MapPin, BookOpenText, ArrowUpRight, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { SHOP_ENABLED, ACCOUNTS_ENABLED } from "@/config/launch";
import { searchProducts } from "@/actions/products";
import type { Product } from "@/types";

const navLinks = [
  { name: "Start", href: "/" },
  { name: "Sklep", href: "/sklep" },
  { name: "Kawiarnia", href: "/kawiarnia" },
  { name: "Encyklopedia", href: "/encyklopedia" },
];

type SearchShortcut = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  icon: React.ElementType;
  tags: string[];
};

const SEARCH_SHORTCUTS: SearchShortcut[] = [
  {
    id: "shop",
    title: "Sklep",
    subtitle: "Przeglądaj wszystkie produkty premium",
    href: "/sklep",
    icon: Store,
    tags: ["sklep", "produkty", "kawa", "wino", "delikatesy"],
  },
  {
    id: "coffee",
    title: "Kawy specialty",
    subtitle: "Ziarna, blendy i akcesoria baristy",
    href: "/sklep/kawa",
    icon: Coffee,
    tags: ["kawa", "espresso", "specialty"],
  },
  {
    id: "cafe",
    title: "Kawiarnia stacjonarna",
    subtitle: "Adres, menu i godziny otwarcia",
    href: "/kawiarnia",
    icon: MapPin,
    tags: ["kawiarnia", "menu", "koszalin"],
  },
  {
    id: "encyklopedia",
    title: "Encyklopedia smaku",
    subtitle: "Poradniki o winie, kawie i delikatesach",
    href: "/encyklopedia",
    icon: BookOpenText,
    tags: ["encyklopedia", "poradnik", "wiedza"],
  },
];

const SEARCH_CATEGORY_SLUG_MAP: Record<string, string> = {
  coffee: "kawa",
  alcohol: "wino",
  wino: "wino",
  kawa: "kawa",
  sweets: "slodycze",
  slodycze: "slodycze",
  pantry: "spizarnia",
  spizarnia: "spizarnia",
  all: "wszystko",
};

const resolveSearchCategorySlug = (category?: string) => {
  if (!category) return "wszystko";
  const normalized = category.toLowerCase();
  return SEARCH_CATEGORY_SLUG_MAP[normalized] || normalized;
};

const resolveSearchProductHref = (product: Product) => {
  const categorySlug = resolveSearchCategorySlug(typeof product.category === "string" ? product.category : undefined);

  if (!product.slug) {
    return `/sklep/${categorySlug}`;
  }

  return `/sklep/${product.slug}`;
};

const formatSearchPrice = (price: number) => `${price.toFixed(2).replace(".", ",")} zł`;

// Magnetic Link Component - links follow cursor within bounds
const MagneticLink = ({
  href,
  children,
  className,
  onMouseEnter,
  onMouseLeave,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 400 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    // Disabled magnetic effect to prevent pill from going outside navbar
    // const rect = ref.current.getBoundingClientRect();
    // const centerX = rect.left + rect.width / 2;
    // const centerY = rect.top + rect.height / 2;
    // const distX = (e.clientX - centerX) * 0.15;
    // const distY = (e.clientY - centerY) * 0.15;
    // x.set(distX);
    // y.set(distY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    onMouseLeave?.();
  };

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={onMouseEnter}
      className={cn("relative", className)}
    >
      <Link href={href} className="block">
        {children}
      </Link>
    </motion.div>
  );
};

export const Navbar = () => {
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isBgDark, setIsBgDark] = useState(false);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pathname = usePathname();
  const { totalItems, setIsOpen: setIsCartOpen, setTriggerPos } = useCart();
  const cartBtnRef = useRef<HTMLButtonElement>(null);
  const mobileMenuBtnRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const searchModalRef = useRef<HTMLDivElement>(null);

  const handleOpenCart = (e?: React.MouseEvent) => {
    if (cartBtnRef.current) {
      const rect = cartBtnRef.current.getBoundingClientRect();
      setTriggerPos({ x: rect.right, y: rect.bottom });
    } else if (e) {
      setTriggerPos({ x: e.clientX, y: e.clientY });
    }
    setIsCartOpen(true);
  };

  // Detect dark theme from body attribute (set by pages like WineProductView)
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.body.getAttribute('data-theme');
      setIsDarkTheme(theme === 'wine-dark' || theme === 'dark');
    };
    
    checkTheme();
    
    // Use MutationObserver to detect changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] });
    
    return () => observer.disconnect();
  }, [pathname]);

  // Sample actual background color under the navbar to decide light/dark treatment.
  // Works regardless of OS preference — reflects what the user actually sees.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const parseRgb = (value: string): [number, number, number, number] | null => {
      const m = value.match(/rgba?\(([^)]+)\)/i);
      if (!m) return null;
      const parts = m[1].split(',').map((p) => parseFloat(p.trim()));
      if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
      return [parts[0], parts[1], parts[2], parts[3] ?? 1];
    };

    const luminance = (r: number, g: number, b: number) => {
      const a = [r, g, b].map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    };

    const sampleBackground = () => {
      const navHeight = 80;
      const points: Array<[number, number]> = [
        [window.innerWidth * 0.15, navHeight + 20],
        [window.innerWidth * 0.5, navHeight + 20],
        [window.innerWidth * 0.85, navHeight + 20],
      ];

      let totalLum = 0;
      let counted = 0;

      for (const [x, y] of points) {
        const stack = document.elementsFromPoint(x, y);
        for (const el of stack) {
          if (!(el instanceof HTMLElement)) continue;
          if (el.closest('header')) continue; // skip the navbar itself
          const bg = getComputedStyle(el).backgroundColor;
          const rgba = parseRgb(bg);
          if (!rgba) continue;
          const [r, g, b, a] = rgba;
          if (a < 0.5) continue; // transparent — keep walking
          totalLum += luminance(r, g, b);
          counted += 1;
          break;
        }
      }

      if (counted === 0) {
        // Fallback to body background
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        const rgba = parseRgb(bodyBg);
        if (rgba) {
          const [r, g, b] = rgba;
          setIsBgDark(luminance(r, g, b) < 0.4);
        } else {
          setIsBgDark(false);
        }
        return;
      }

      setIsBgDark(totalLum / counted < 0.4);
    };

    // Initial + retries to catch late-mounting hero images/gradients
    sampleBackground();
    const t1 = window.setTimeout(sampleBackground, 150);
    const t2 = window.setTimeout(sampleBackground, 500);

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        sampleBackground();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', sampleBackground);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', sampleBackground);
    };
  }, [pathname]);

  // Track scroll position and progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 20);

      // Calculate scroll progress
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
    setIsSearchLoading(false);
  }, [pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Close search on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSearchOpen) setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearchLoading(false);
      return;
    }

    let cancelled = false;
    setIsSearchLoading(true);
    setSearchError(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await searchProducts(query);
        if (!cancelled) {
          setSearchResults(results.slice(0, 8));
        }
      } catch {
        if (!cancelled) {
          setSearchResults([]);
          setSearchError("Nie udało się pobrać wyników. Spróbuj ponownie.");
        }
      } finally {
        if (!cancelled) {
          setIsSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isSearchOpen, searchQuery]);

  // Focus traps for mobile menu and search modal
  useFocusTrap(mobileMenuRef as React.RefObject<HTMLElement>, isMobileMenuOpen, {
    returnFocusRef: mobileMenuBtnRef as React.RefObject<HTMLElement>,
  });
  useFocusTrap(searchModalRef as React.RefObject<HTMLElement>, isSearchOpen, {
    returnFocusRef: searchBtnRef as React.RefObject<HTMLElement>,
  });

  // Find current active link index
  const activeIndex = navLinks.findIndex(
    (link) => pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
  );

  // Determine which index to highlight (hovered or active)
  const highlightIndex = hoveredIndex !== null ? hoveredIndex : activeIndex;

  // Calculate pill position using offset properties to avoid transform scaling issues
  useEffect(() => {
    const updatePillPosition = () => {
      if (highlightIndex === -1 || !navContainerRef.current) return;
      
      const linkEl = linkRefs.current[highlightIndex];
      if (!linkEl) return;
      
      setPillStyle({
        left: linkEl.offsetLeft,
        width: linkEl.offsetWidth,
      });
    };

    updatePillPosition();
    window.addEventListener('resize', updatePillPosition);
    return () => window.removeEventListener('resize', updatePillPosition);
  }, [highlightIndex]);

  // Determine navbar appearance based on page and scroll
  const pathSegmentsArray = pathname?.split('/').filter(Boolean) || [];
  const pathSegments = pathSegmentsArray.length;
  const isShopRootOrCategory = pathSegmentsArray[0] === 'sklep';
  const isEncyclopedia = pathname?.startsWith("/encyklopedia");
  
  // Effective dark theme: explicit data-theme override wins, otherwise sample the real background.
  // System preference is intentionally ignored — what matters is the actual page we render.
  const isEffectiveDark = isDarkTheme || (isBgDark && !isShopRootOrCategory);

  const isDarkHeroPage = isEffectiveDark || isEncyclopedia || pathname === "/auth";
  const isDarkText = !isMobileMenuOpen && (isScrolled || !isDarkHeroPage);
  const accountHref = ACCOUNTS_ENABLED ? '/account' : '/auth';
  const accountLabel = ACCOUNTS_ENABLED ? 'Konto' : 'Konto (wkrótce)';

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const hasTypedQuery = normalizedSearchQuery.length >= 2;

  const filteredShortcuts = SEARCH_SHORTCUTS.filter((shortcut) => {
    if (!normalizedSearchQuery) return true;

    const searchable = `${shortcut.title} ${shortcut.subtitle} ${shortcut.tags.join(" ")}`.toLowerCase();
    return searchable.includes(normalizedSearchQuery);
  }).slice(0, 4);

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
    setIsSearchLoading(false);
  };

  const navigateFromSearch = (href: string) => {
    closeSearch();
    router.push(href);
  };

  // Stagger animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <>
      {/* Main Navigation - Floating Islands Style */}
      <header className="fixed left-0 right-0 z-50 pointer-events-none transition-[top] duration-500" style={{ top: "var(--promo-banner-h, 0px)" }}>
        {/* Scroll Progress Bar */}
        <motion.div
          className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-brand-700 via-brand-400 to-brand-600 origin-left z-10"
          style={{ scaleX: scrollProgress }}
        />

        <motion.nav 
          className={cn(
            "container mx-auto px-4 lg:px-8 transition-all duration-500",
            isScrolled ? "py-3" : "py-4 lg:py-6"
          )}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between gap-4">
            {/* Logo Island - Premium floating pill */}
            <motion.div
              variants={itemVariants}
              className="pointer-events-auto"
            >
              {/* Page transition sync animation */}
              <motion.div
                key={pathname}
                initial={{ opacity: 0.8, scale: 0.95, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.05 
                }}
              >
                <Link 
                  href="/" 
                  className={cn(
                    "flex items-center gap-3 z-50 group rounded-full transition-all duration-500",
                    // Island styling - always visible but adapts to context
                    isScrolled 
                      ? (isEffectiveDark
                          ? "bg-brand-950/80 backdrop-blur-xl shadow-lg shadow-black/[0.2] border border-white/[0.08] pl-1.5 pr-4 py-1.5"
                          : "bg-white/95  backdrop-blur-xl shadow-lg shadow-black/[0.08] border border-black/[0.04]  pl-1.5 pr-4 py-1.5")
                      : "bg-transparent border border-transparent pl-1.5 pr-4 py-1.5"
                  )}
                >
                  {/* Logo with glow */}
                  <motion.div 
                    className="relative"
                    whileHover={{ scale: 1.08, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    {/* Subtle glow behind logo */}
                    <div className={cn(
                      "absolute inset-0 rounded-full blur-md transition-all duration-500",
                      isScrolled 
                        ? (isEffectiveDark ? "bg-white/5" : "bg-brand-700/10 ") 
                        : isDarkHeroPage 
                          ? "bg-white/10 group-hover:bg-white/20" 
                          : "bg-brand-700/5 group-hover:bg-brand-700/10"
                    )} />
                    
                    {/* Logo container without border */}
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex items-center justify-center transition-all duration-500 bg-transparent">
                      <Image
                        src="/assets/logo.png"
                        alt="Il Buon Caffe"
                        width={48}
                        height={48}
                        className={cn(
                          "w-full h-full object-contain p-1 transition-all duration-500 brightness-0",
                          ((!isScrolled && isDarkHeroPage) || (isScrolled && isEffectiveDark)) && "invert"
                        )}
                      />
                    </div>
                  </motion.div>

                  {/* Brand text */}
                  <div className="flex flex-col">
                    <motion.span 
                      className={cn(
                        "text-sm font-serif font-bold tracking-tight leading-none mb-0.5 whitespace-nowrap transition-colors duration-500",
                        isScrolled 
                          ? (isEffectiveDark ? "text-white" : "text-brand-900 ") 
                          : isDarkHeroPage 
                            ? "text-white" 
                            : "text-brand-900"
                      )}
                    >
                      Il Buon Caffe
                    </motion.span>
                    <span className={cn(
                      "text-[9px] uppercase tracking-[0.15em] whitespace-nowrap transition-colors duration-500",
                      isScrolled 
                        ? (isEffectiveDark ? "text-white/70" : "text-brand-700 ") 
                        : isDarkHeroPage 
                          ? "text-white/50" 
                          : "text-brand-700"
                    )}>
                      Est. 2003
                    </span>
                  </div>
                </Link>
              </motion.div>
            </motion.div>

            {/* Center Navigation Island */}
            <motion.div 
              variants={itemVariants}
              className="hidden lg:block pointer-events-auto"
              role="navigation"
              aria-label="Nawigacja główna"
            >
              {/* Page transition sync animation */}
              <motion.div
                key={pathname}
                initial={{ opacity: 0.8, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.1 
                }}
              >
                <motion.div 
                  initial={false}
                  animate={{ 
                    scale: isScrolled ? 0.98 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.02 }}
              >
                <div 
                  ref={navContainerRef}
                  className={cn(
                    "relative flex items-center rounded-full px-1.5 py-1.5 transition-all duration-500",
                    isScrolled 
                      ? (isEffectiveDark
                          ? "bg-brand-950/80 backdrop-blur-xl shadow-lg shadow-black/[0.2] border border-white/[0.08]"
                          : "bg-white/95  backdrop-blur-xl shadow-lg shadow-black/[0.08] border border-black/[0.04] ") 
                      : "bg-transparent border border-transparent"
                  )}>
                  {/* Animated background pill */}
                  {highlightIndex !== -1 && pillStyle.width > 0 && (
                    <motion.div
                      className={cn(
                        "absolute top-1.5 bottom-1.5 rounded-full",
                        isScrolled 
                          ? (isEffectiveDark ? "bg-white/10" : "bg-brand-900/10 ") 
                          : (isDarkHeroPage ? "bg-white/15" : "bg-brand-900/5")
                      )}
                      initial={false}
                      animate={{
                        left: pillStyle.left,
                        width: pillStyle.width,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}

                  {navLinks.map((link, index) => {
                    const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                    const isHovered = hoveredIndex === index;
                    
                    return (
                      <div
                        key={link.href}
                        className="relative z-10"
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        ref={(el) => { linkRefs.current[index] = el; }}
                      >
                        <Link href={link.href} aria-current={isActive ? 'page' : undefined}>
                          <span
                            className={cn(
                              "block px-5 py-2 text-sm font-medium transition-colors duration-200 rounded-full whitespace-nowrap",
                              (isActive || isHovered)
                                ? (isScrolled ? (isEffectiveDark ? "text-white" : "text-brand-950 ") : (isDarkHeroPage ? "text-white" : "text-brand-950"))
                                : (isScrolled 
                                    ? (isEffectiveDark ? "text-white/70 hover:text-white" : "text-brand-600  hover:text-brand-950 :text-white") 
                                    : (isDarkHeroPage ? "text-white/70 hover:text-white" : "text-brand-700 hover:text-brand-950"))
                            )}
                          >
                            {link.name}
                          </span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
              </motion.div>
            </motion.div>

            {/* Right Actions Island */}
            <motion.div 
              variants={itemVariants}
              className="pointer-events-auto"
            >
              {/* Page transition sync animation */}
              <motion.div
                key={pathname}
                initial={{ opacity: 0.8, scale: 0.95, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.22, 1, 0.36, 1],
                  delay: 0.15 
                }}
              >
                <motion.div
                  initial={false}
                  animate={{ 
                    scale: isScrolled ? 0.95 : 1,
                  }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "flex items-center gap-1 rounded-full transition-all duration-500",
                    isScrolled 
                      ? (isEffectiveDark
                          ? "bg-brand-950/80 backdrop-blur-xl shadow-lg shadow-black/[0.2] border border-white/[0.08] px-2 py-1.5"
                          : "bg-white/95  backdrop-blur-xl shadow-lg shadow-black/[0.08] border border-black/[0.04]  px-2 py-1.5") 
                      : "bg-transparent border border-transparent px-2 py-1.5"
                  )}
                >
              {/* Search */}
              <motion.button
                ref={searchBtnRef}
                onClick={() => {
                  setIsSearchOpen(true);
                  setSearchQuery("");
                  setSearchResults([]);
                  setSearchError(null);
                  setIsSearchLoading(false);
                }}
                whileHover={{ scale: 1.15, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "hidden sm:flex w-9 h-9 items-center justify-center rounded-full transition-colors",
                  isScrolled
                    ? (isEffectiveDark ? "text-white/80 hover:text-white hover:bg-white/10" : "text-brand-700  hover:bg-brand-100 :bg-white/10 :text-white")
                    : (isDarkHeroPage 
                        ? "text-white/80 hover:text-white hover:bg-white/10" 
                        : "text-brand-700  hover:bg-brand-100 :bg-white/10 :text-white")
                )}
                aria-label="Szukaj"
              >
                <Search className="w-4 h-4" />
              </motion.button>

              {/* Account */}
              <motion.div 
                whileHover={{ scale: 1.15 }} 
                whileTap={{ scale: 0.9 }}
              >
                <Link
                  href={accountHref}
                  title={accountLabel}
                  className={cn(
                    "hidden sm:flex w-9 h-9 items-center justify-center rounded-full transition-colors",
                    isScrolled
                      ? (isEffectiveDark ? "text-white/80 hover:text-white hover:bg-white/10" : "text-brand-700  hover:bg-brand-100 :bg-white/10 :text-white")
                      : (isDarkHeroPage 
                          ? "text-white/80 hover:text-white hover:bg-white/10" 
                          : "text-brand-700  hover:bg-brand-100 :bg-white/10 :text-white")
                  )}
                  aria-label={accountLabel}
                >
                  <User className="w-4 h-4" />
                </Link>
              </motion.div>

              {/* Cart - hidden when shop is disabled */}
              {SHOP_ENABLED && (
                <motion.button
                  ref={cartBtnRef}
                  onClick={(e) => handleOpenCart(e)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  animate={totalItems > 0 ? { 
                    boxShadow: [
                      "0 0 0 0 rgba(79, 55, 48, 0)",
                      "0 0 0 8px rgba(79, 55, 48, 0.1)",
                      "0 0 0 0 rgba(79, 55, 48, 0)"
                    ]
                  } : {}}
                  transition={{ 
                    boxShadow: { duration: 1.5, repeat: Infinity, repeatDelay: 3 }
                  }}
                  className={cn(
                    "relative flex items-center gap-1.5 h-9 rounded-full transition-all duration-300",
                    totalItems > 0
                      ? "bg-brand-900 text-white px-3 hover:bg-brand-800"
                      : cn(
                          "w-9 justify-center",
                          isScrolled
                            ? (isEffectiveDark ? "text-white/80 hover:text-white hover:bg-white/10" : "text-brand-700  hover:bg-brand-100 :bg-white/10 :text-white")
                            : (isDarkHeroPage 
                                ? "text-white/80 hover:text-white hover:bg-white/10" 
                                : "text-brand-700  hover:bg-brand-100 :bg-white/10 :text-white")
                        )
                  )}
                  aria-label={`Koszyk (${totalItems})`}
                >
                  <motion.div
                    animate={totalItems > 0 ? { rotate: [0, -10, 10, -10, 0] } : {}}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    key={totalItems}
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </motion.div>
                  {totalItems > 0 && (
                    <motion.span
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="text-sm font-medium"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </motion.button>
              )}

              {/* Mobile Menu Toggle */}
              <motion.button
                ref={mobileMenuBtnRef}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  "lg:hidden flex w-9 h-9 items-center justify-center rounded-full transition-colors z-50",
                  isScrolled
                    ? (isEffectiveDark ? "text-white hover:bg-white/10" : "text-brand-900  hover:bg-brand-100 :bg-white/10")
                    : (isDarkHeroPage 
                        ? "text-white hover:bg-white/10" 
                        : "text-brand-900  hover:bg-brand-100 :bg-white/10")
                )}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "Zamknij menu" : "Otwórz menu"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                <AnimatePresence mode="wait">
                  {isMobileMenuOpen ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
              </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </motion.nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-brand-900 lg:hidden overflow-hidden"
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu nawigacyjne"
          >
            {/* Decorative elements */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-brand-800 rounded-full blur-3xl opacity-50"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
              />
              <motion.div
                className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-brand-700 rounded-full blur-3xl opacity-30"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              />
            </div>

            <div className="relative h-full flex flex-col pt-24 pb-8 px-6">
              {/* Links */}
              <nav className="flex-1">
                <ul className="space-y-1">
                  {navLinks.map((link, index) => {
                    const isActive = pathname === link.href;
                    return (
                      <motion.li
                        key={link.href}
                        initial={{ opacity: 0, x: -40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: index * 0.08,
                          duration: 0.4,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center justify-between py-4 border-b border-white/10 transition-colors group",
                            isActive
                              ? "text-white border-brand-700"
                              : "text-white/70 hover:text-white"
                          )}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <span className="text-3xl font-serif">{link.name}</span>
                          <div className="flex items-center gap-2">
                            {isActive && (
                              <span className="text-xs uppercase tracking-widest text-brand-400">
                                Tu jesteś
                              </span>
                            )}
                            <ChevronRight
                              className={cn(
                                "w-5 h-5 transition-transform group-hover:translate-x-1",
                                isActive ? "text-brand-700" : "text-white/30"
                              )}
                            />
                          </div>
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              </nav>

              {/* Bottom */}
              <motion.div
                className="pt-6 border-t border-white/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-between">
                  <Link
                    href={accountHref}
                    onClick={() => setIsMobileMenuOpen(false)}
                    title={accountLabel}
                    className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="text-sm">{ACCOUNTS_ENABLED ? 'Moje konto' : 'Konto wkrótce'}</span>
                  </Link>

                  {SHOP_ENABLED && (
                    <motion.button
                      onClick={(e) => {
                        handleOpenCart(e);
                        setIsMobileMenuOpen(false);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 bg-white text-brand-900 px-5 py-2.5 rounded-full font-medium text-sm"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Koszyk ({totalItems})
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Modal */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            ref={searchModalRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-xl flex items-start justify-center pt-24 md:pt-28 px-4"
            onClick={closeSearch}
            role="dialog"
            aria-modal="true"
            aria-label="Wyszukiwarka"
          >
            <motion.div
              initial={{ opacity: 0, y: -30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-[#fbf8f4]/95 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/80 to-transparent" />

                <div className="relative border-b border-brand-200/70 px-4 md:px-6 py-4 md:py-5">
                  <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-500" />
                  <input
                    type="text"
                    id="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();

                      if (hasTypedQuery && searchResults.length > 0) {
                        navigateFromSearch(resolveSearchProductHref(searchResults[0]));
                        return;
                      }

                      if (filteredShortcuts.length > 0) {
                        navigateFromSearch(filteredShortcuts[0].href);
                      }
                    }}
                    placeholder="Szukaj produktu, kategorii lub strony..."
                    autoFocus
                    className="w-full rounded-2xl border border-brand-200/80 bg-white py-4 pl-14 pr-24 text-base md:text-lg text-brand-900 placeholder-brand-500/70 focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                  />

                  <div className="absolute right-7 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="p-2 text-brand-500 hover:text-brand-700 rounded-full hover:bg-brand-50 transition-colors"
                        aria-label="Wyczyść wyszukiwanie"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={closeSearch}
                      className="p-2 text-brand-500 hover:text-brand-700 rounded-full hover:bg-brand-50 transition-colors"
                      aria-label="Zamknij wyszukiwarkę"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr]">
                  <aside className="border-b md:border-b-0 md:border-r border-brand-200/70 bg-brand-50/40 px-4 md:px-5 py-5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-brand-600 mb-3">Skróty</p>
                    <div className="space-y-2">
                      {filteredShortcuts.map((shortcut) => (
                        <button
                          key={shortcut.id}
                          type="button"
                          onClick={() => navigateFromSearch(shortcut.href)}
                          className="w-full text-left rounded-2xl border border-transparent hover:border-brand-200 hover:bg-white px-3 py-3 transition-all group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-9 h-9 rounded-xl bg-brand-900 text-white flex items-center justify-center">
                              <shortcut.icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-brand-900">{shortcut.title}</p>
                              <p className="text-xs text-brand-600 mt-0.5 line-clamp-2">{shortcut.subtitle}</p>
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-brand-400 group-hover:text-brand-700 transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </aside>

                  <section className="px-4 md:px-6 py-5 min-h-[320px]">
                    {!hasTypedQuery && (
                      <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <div className="w-14 h-14 rounded-2xl bg-brand-900 text-white flex items-center justify-center mb-4">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-serif text-brand-900 mb-2">Inteligentne wyszukiwanie</h3>
                        <p className="text-brand-600 max-w-md">
                          Wpisz minimum 2 znaki, aby przeszukać produkty i szybko przejść do najważniejszych sekcji strony.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-5 justify-center">
                          {["barahonda", "kawa", "oliwa", "koszalin"].map((hint) => (
                            <button
                              key={hint}
                              type="button"
                              onClick={() => setSearchQuery(hint)}
                              className="px-3 py-1.5 rounded-full border border-brand-200 bg-white text-xs text-brand-700 hover:border-brand-400 hover:text-brand-900 transition-colors"
                            >
                              {hint}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {hasTypedQuery && isSearchLoading && (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="h-20 rounded-2xl border border-brand-100 bg-brand-50/60 animate-pulse" />
                        ))}
                      </div>
                    )}

                    {hasTypedQuery && !isSearchLoading && searchError && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-red-700 text-sm">
                        {searchError}
                      </div>
                    )}

                    {hasTypedQuery && !isSearchLoading && !searchError && searchResults.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center px-4">
                        <p className="text-lg font-medium text-brand-900 mb-2">Brak wyników dla "{searchQuery.trim()}"</p>
                        <p className="text-brand-600 mb-5">Spróbuj innej frazy albo przejdź do pełnej oferty sklepu.</p>
                        <button
                          type="button"
                          onClick={() => navigateFromSearch("/sklep")}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-900 text-white text-sm hover:bg-brand-700 transition-colors"
                        >
                          Przejdź do sklepu
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {hasTypedQuery && !isSearchLoading && !searchError && searchResults.length > 0 && (
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-brand-600 mb-3">
                          Wyniki ({searchResults.length})
                        </p>
                        <div className="space-y-2">
                          {searchResults.map((product) => (
                            <button
                              key={product.sku}
                              type="button"
                              onClick={() => navigateFromSearch(resolveSearchProductHref(product))}
                              className="w-full text-left rounded-2xl border border-brand-100 bg-white hover:border-brand-300 hover:shadow-sm px-3 py-3 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-brand-100 flex-shrink-0">
                                  <Image
                                    src={product.imageUrl || product.image || "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80"}
                                    alt={product.name}
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm md:text-base font-semibold text-brand-900 truncate">{product.name}</p>
                                  <p className="text-xs text-brand-600 mt-1 truncate">
                                    {(typeof product.category === "string" && product.category) || "Produkt premium"}
                                    {product.origin ? ` • ${product.origin}` : ""}
                                  </p>
                                </div>
                                <div className="text-right ml-2">
                                  <p className="text-sm font-bold text-brand-900 whitespace-nowrap">{formatSearchPrice(product.price)}</p>
                                  <p className="text-[11px] text-brand-500">Produkt</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </div>

              <p className="text-center text-white/60 text-xs md:text-sm mt-4">
                Naciśnij <kbd className="px-2 py-1 bg-white/10 rounded text-white/80">ESC</kbd> aby zamknąć,
                <span className="mx-2">•</span>
                <kbd className="px-2 py-1 bg-white/10 rounded text-white/80">ENTER</kbd> aby otworzyć pierwszy wynik
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
