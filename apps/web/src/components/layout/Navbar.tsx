"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { ShoppingBag, User, Menu, X, Search, ChevronRight, ArrowUpRight, Store, Coffee, MapPin, BookOpenText, Wine, Cookie, Package, Mail, Instagram } from "lucide-react";
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
  const [searchSelectedIndex, setSearchSelectedIndex] = useState(0);
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
    if (isMobileMenuOpen || isSearchOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen, isSearchOpen]);

  // Escape closes, Ctrl/Cmd+K toggles
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((v) => {
          const next = !v;
          if (next) {
            setSearchQuery("");
            setSearchResults([]);
            setSearchError(null);
            setIsSearchLoading(false);
            setSearchSelectedIndex(0);
          }
          return next;
        });
        return;
      }
      if (e.key === 'Escape' && isSearchOpen) setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isSearchOpen]);

  // Reset selection index on query change
  useEffect(() => {
    setSearchSelectedIndex(0);
  }, [searchQuery]);

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
            "container mx-auto px-3 sm:px-4 lg:px-8 transition-all duration-500",
            isScrolled ? "py-2.5 lg:py-3" : "py-3 lg:py-6"
          )}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between gap-2 sm:gap-4">
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
                    "flex items-center gap-2 sm:gap-3 z-50 group rounded-full transition-all duration-500",
                    isScrolled
                      ? (isEffectiveDark
                          ? "bg-brand-950/80 backdrop-blur-xl shadow-lg shadow-black/[0.2] border border-white/[0.08] pl-1 pr-3 py-1 sm:pl-1.5 sm:pr-4 sm:py-1.5"
                          : "bg-white/95  backdrop-blur-xl shadow-lg shadow-black/[0.08] border border-black/[0.04] pl-1 pr-3 py-1 sm:pl-1.5 sm:pr-4 sm:py-1.5")
                      : "bg-transparent border border-transparent pl-1 pr-3 py-1 sm:pl-1.5 sm:pr-4 sm:py-1.5"
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
                    <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex items-center justify-center transition-all duration-500 bg-transparent">
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
                        "text-[13px] sm:text-sm font-serif font-bold tracking-tight leading-none mb-0 sm:mb-0.5 whitespace-nowrap transition-colors duration-500",
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
                      "hidden sm:inline text-[9px] uppercase tracking-[0.15em] whitespace-nowrap transition-colors duration-500",
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
                  "flex w-9 h-9 items-center justify-center rounded-full transition-colors",
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

      {/* Mobile Menu — full redesign */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 lg:hidden overflow-hidden"
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu nawigacyjne"
          >
            {/* Layered background: deep coffee → near-black gradient with grain */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(165deg, #2A1D17 0%, #1A1108 55%, #0F0907 100%)",
              }}
            />
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full blur-[120px]"
              style={{ background: "radial-gradient(circle, rgba(166,139,91,0.35) 0%, transparent 70%)" }}
            />
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ duration: 0.7, delay: 0.15 }}
              className="absolute -bottom-32 -left-24 w-[380px] h-[380px] rounded-full blur-[120px]"
              style={{ background: "radial-gradient(circle, rgba(123,45,59,0.4) 0%, transparent 70%)" }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
              }}
            />

            {/* Content */}
            <div className="relative h-full flex flex-col pt-24 pb-[max(1.5rem,env(safe-area-inset-bottom))] px-6 overflow-y-auto">

              {/* Eyebrow label */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center justify-between mb-6"
              >
                <span className="text-[10px] uppercase tracking-[0.32em] text-amber-200/55 font-semibold">
                  — Menu
                </span>
                <span className="text-[10px] uppercase tracking-[0.24em] text-white/35 font-medium">
                  Est. 2003
                </span>
              </motion.div>

              {/* Search pill */}
              <motion.button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsSearchOpen(true);
                  setSearchQuery("");
                  setSearchResults([]);
                  setSearchError(null);
                  setIsSearchLoading(false);
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
                className="w-full flex items-center gap-3 px-4 h-12 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-sm text-left mb-7 active:scale-[0.99] transition-transform"
              >
                <Search className="w-4 h-4 text-white/55" strokeWidth={1.75} />
                <span className="flex-1 text-[13px] text-white/45 font-medium">
                  Szukaj kawy, wina, regionu…
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-amber-200/55 font-semibold">
                  Szukaj
                </span>
              </motion.button>

              {/* Primary nav — numbered */}
              <nav className="mb-8">
                <ul className="divide-y divide-white/[0.07] border-y border-white/[0.07]">
                  {navLinks.map((link, index) => {
                    const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href));
                    return (
                      <motion.li
                        key={link.href}
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.08 + index * 0.06,
                          duration: 0.45,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "group flex items-center gap-4 py-4 transition-colors",
                            isActive ? "text-white" : "text-white/85 hover:text-white"
                          )}
                        >
                          <span
                            className={cn(
                              "font-serif text-[10px] tracking-[0.2em] tabular-nums shrink-0 w-7",
                              isActive ? "text-amber-200/80" : "text-white/35"
                            )}
                          >
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="font-serif text-[2rem] leading-[1.1] tracking-tight flex-1">
                            {link.name}
                          </span>
                          {isActive ? (
                            <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-amber-200/75">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-200/80 animate-pulse" />
                              Tu jesteś
                            </span>
                          ) : (
                            <ArrowUpRight
                              className="w-5 h-5 text-white/30 transition-all duration-300 group-hover:text-white group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                              strokeWidth={1.5}
                            />
                          )}
                        </Link>
                      </motion.li>
                    );
                  })}
                </ul>
              </nav>

              {/* Quick categories grid */}
              {SHOP_ENABLED && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.32 }}
                  className="mb-8"
                >
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/40 font-semibold mb-3">
                    — Kategorie
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Coffee, label: "Kawa", href: "/sklep/kawa" },
                      { icon: Wine, label: "Wino", href: "/sklep/wino" },
                      { icon: Cookie, label: "Słodycze", href: "/sklep/slodycze" },
                      { icon: Package, label: "Spiżarnia", href: "/sklep/spizarnia" },
                    ].map((cat, idx) => (
                      <motion.div
                        key={cat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.36 + idx * 0.05 }}
                      >
                        <Link
                          href={cat.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="group flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/15 transition-all active:scale-[0.98]"
                        >
                          <span className="w-9 h-9 rounded-full flex items-center justify-center bg-amber-200/10 text-amber-100/85 group-hover:bg-amber-200/20 transition-colors shrink-0">
                            <cat.icon className="w-4 h-4" strokeWidth={1.75} />
                          </span>
                          <span className="text-sm font-medium text-white/85 flex-1">{cat.label}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-white/35 group-hover:text-white/70 transition-colors" strokeWidth={2} />
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Spacer */}
              <div className="flex-1 min-h-4" />

              {/* Footer: account + cart */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.45 }}
                className="grid grid-cols-2 gap-2 mb-5"
              >
                <Link
                  href={accountHref}
                  onClick={() => setIsMobileMenuOpen(false)}
                  title={accountLabel}
                  className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] transition-colors active:scale-[0.99]"
                >
                  <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-white/85" strokeWidth={1.75} />
                  </span>
                  <span className="flex flex-col leading-tight min-w-0">
                    <span className="text-[10px] uppercase tracking-[0.22em] text-white/40 font-semibold">
                      Konto
                    </span>
                    <span className="text-[13px] text-white/85 font-medium truncate">
                      {ACCOUNTS_ENABLED ? "Moje konto" : "Wkrótce"}
                    </span>
                  </span>
                </Link>

                {SHOP_ENABLED && (
                  <button
                    type="button"
                    onClick={(e) => {
                      handleOpenCart(e);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 px-4 h-14 rounded-2xl bg-amber-100 text-brand-950 hover:bg-white transition-colors active:scale-[0.99] shadow-[0_10px_24px_-12px_rgba(166,139,91,0.55)]"
                  >
                    <span className="w-9 h-9 rounded-full bg-brand-950/10 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-4 h-4" strokeWidth={1.75} />
                    </span>
                    <span className="flex flex-col leading-tight min-w-0 text-left">
                      <span className="text-[10px] uppercase tracking-[0.22em] text-brand-950/55 font-semibold">
                        Koszyk
                      </span>
                      <span className="text-[13px] font-semibold truncate">
                        {totalItems > 0 ? `${totalItems} ${totalItems === 1 ? "pozycja" : totalItems < 5 ? "pozycje" : "pozycji"}` : "Pusty"}
                      </span>
                    </span>
                  </button>
                )}
              </motion.div>

              {/* Contact strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55, duration: 0.4 }}
                className="flex items-center justify-between gap-3 pt-4 border-t border-white/[0.07] text-white/55"
              >
                <a
                  href="https://www.instagram.com/ilbuoncaffe19"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[12px] hover:text-white transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>@ilbuoncaffe19</span>
                </a>
                <a
                  href="mailto:ilbuoncaffe19@gmail.com"
                  className="flex items-center gap-2 text-[12px] hover:text-white transition-colors"
                  aria-label="Email"
                >
                  <Mail className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Napisz</span>
                </a>
                <Link
                  href="/kawiarnia"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-[12px] hover:text-white transition-colors"
                  aria-label="Kawiarnia"
                >
                  <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Koszalin</span>
                </Link>
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
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-[#1a1410]/75 backdrop-blur-md flex items-stretch md:items-start justify-center md:pt-24 md:px-4"
            onClick={closeSearch}
            role="dialog"
            aria-modal="true"
            aria-label="Wyszukiwarka"
          >
            {(() => {
              const q = searchQuery.trim();
              const navTargets = hasTypedQuery ? searchResults.map(resolveSearchProductHref) : filteredShortcuts.map((s) => s.href);
              const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  if (navTargets.length) setSearchSelectedIndex((i) => (i + 1) % navTargets.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (navTargets.length) setSearchSelectedIndex((i) => (i - 1 + navTargets.length) % navTargets.length);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const target = navTargets[searchSelectedIndex] || navTargets[0];
                  if (target) navigateFromSearch(target);
                }
              };
              return (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="w-full max-w-2xl flex md:block"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative overflow-hidden md:rounded-2xl border-0 md:border md:border-brand-900/10 bg-[#f8f3ec] shadow-none md:shadow-[0_40px_90px_-20px_rgba(26,20,16,0.55)] flex flex-col w-full h-[100dvh] md:h-auto">
                {/* Mobile drag handle */}
                <div className="md:hidden pt-[max(0.75rem,env(safe-area-inset-top))] flex justify-center">
                  <div className="w-10 h-1 rounded-full bg-brand-900/15" />
                </div>

                {/* Header / Input */}
                <div className="relative flex items-center gap-3 md:gap-4 px-4 md:px-6 border-b border-brand-900/10">
                  <Search className="w-4 h-4 text-brand-900/50 flex-shrink-0" strokeWidth={1.75} />
                  <input
                    type="text"
                    id="search-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={onInputKeyDown}
                    placeholder="Kawa, wino, region…"
                    autoFocus
                    enterKeyHint="search"
                    inputMode="search"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    className="flex-1 min-w-0 bg-transparent py-4 md:py-6 text-base md:text-lg font-serif text-brand-950 placeholder-brand-900/35 focus:outline-none tracking-[0.005em]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="hidden md:inline-flex text-[10px] uppercase tracking-[0.2em] text-brand-900/50 hover:text-brand-900 transition-colors"
                      aria-label="Wyczyść"
                    >
                      Wyczyść
                    </button>
                  )}
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-brand-900/8 text-brand-900/60 hover:bg-brand-900/15 transition-colors"
                      aria-label="Wyczyść"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  )}
                  <button
                    onClick={closeSearch}
                    className="hidden md:flex w-8 h-8 items-center justify-center rounded-full text-brand-900/60 hover:bg-brand-900/5 hover:text-brand-900 transition-colors"
                    aria-label="Zamknij"
                  >
                    <X className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={closeSearch}
                    className="md:hidden text-[11px] uppercase tracking-[0.18em] font-semibold text-brand-900/70 hover:text-brand-900 transition-colors px-1"
                    aria-label="Anuluj"
                  >
                    Anuluj
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 md:flex-none md:max-h-[60vh] overflow-y-auto overscroll-contain">
                  {/* Idle state — shortcuts + popular categories */}
                  {!hasTypedQuery && (
                    <div className="px-4 md:px-6 py-5 space-y-6">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-brand-900/45 mb-3">Przejdź do</p>
                        <div className="space-y-1">
                          {filteredShortcuts.map((shortcut, idx) => (
                            <button
                              key={shortcut.id}
                              type="button"
                              onMouseEnter={() => setSearchSelectedIndex(idx)}
                              onClick={() => navigateFromSearch(shortcut.href)}
                              className={cn(
                                "w-full text-left flex items-center gap-3 md:gap-4 px-3 py-3.5 md:py-3 rounded-xl md:rounded-lg transition-colors group active:bg-brand-900/10",
                                searchSelectedIndex === idx ? "bg-brand-900/5" : "hover:bg-brand-900/5"
                              )}
                            >
                              <span className="w-9 h-9 md:w-auto md:h-auto rounded-full md:rounded-none bg-brand-900/[0.06] md:bg-transparent flex items-center justify-center flex-shrink-0">
                                <shortcut.icon className="w-4 h-4 text-brand-900/65" strokeWidth={1.5} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[14px] md:text-sm font-medium text-brand-950">{shortcut.title}</p>
                                <p className="text-[12px] md:text-xs text-brand-900/55 mt-0.5 truncate">{shortcut.subtitle}</p>
                              </div>
                              <ChevronRight className={cn(
                                "w-4 h-4 flex-shrink-0 transition-opacity text-brand-900/40 md:text-brand-900",
                                searchSelectedIndex === idx ? "md:opacity-100" : "md:opacity-0 md:group-hover:opacity-60"
                              )} strokeWidth={1.5} />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Popular search chips — mobile + desktop */}
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-brand-900/45 mb-3">Popularne</p>
                        <div className="flex flex-wrap gap-2">
                          {["espresso", "wino czerwone", "cantucci", "Toskania", "biodynamiczne", "pojedyncze pochodzenie"].map((term) => (
                            <button
                              key={term}
                              type="button"
                              onClick={() => setSearchQuery(term)}
                              className="text-[12px] px-3 py-1.5 rounded-full border border-brand-900/12 bg-white/60 text-brand-900/75 hover:bg-brand-900 hover:text-white hover:border-brand-900 transition-colors"
                            >
                              {term}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Typed — loading */}
                  {hasTypedQuery && isSearchLoading && (
                    <div className="px-4 md:px-6 py-5 space-y-1.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-3 py-3">
                          <div className="w-14 h-14 md:w-12 md:h-12 rounded-lg md:rounded-md bg-brand-900/5 animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3.5 w-2/3 rounded bg-brand-900/5 animate-pulse" />
                            <div className="h-2.5 w-1/3 rounded bg-brand-900/5 animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Typed — error */}
                  {hasTypedQuery && !isSearchLoading && searchError && (
                    <div className="px-4 md:px-6 py-6">
                      <p className="text-sm text-red-800/90">{searchError}</p>
                    </div>
                  )}

                  {/* Typed — empty */}
                  {hasTypedQuery && !isSearchLoading && !searchError && searchResults.length === 0 && (
                    <div className="px-4 md:px-6 py-12 md:py-10 text-center">
                      <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-900/5 flex items-center justify-center">
                        <Search className="w-5 h-5 text-brand-900/40" strokeWidth={1.5} />
                      </div>
                      <p className="font-serif text-lg md:text-xl text-brand-950 mb-1.5">Nic nie znaleziono</p>
                      <p className="text-sm text-brand-900/55 mb-6 max-w-xs mx-auto">
                        Żadnych produktów dla <span className="italic">„{q}"</span>. Spróbuj innego zapytania.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigateFromSearch("/sklep")}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-brand-900/20 text-brand-950 text-xs uppercase tracking-[0.2em] hover:bg-brand-900 hover:text-white hover:border-brand-900 transition-colors"
                      >
                        Zobacz cały sklep
                        <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  )}

                  {/* Typed — results */}
                  {hasTypedQuery && !isSearchLoading && !searchError && searchResults.length > 0 && (
                    <div className="px-4 md:px-6 py-4">
                      <p className="text-[10px] uppercase tracking-[0.28em] text-brand-900/45 mb-3">
                        Produkty · {searchResults.length}
                      </p>
                      <div className="space-y-0.5">
                        {searchResults.map((product, idx) => {
                          const href = resolveSearchProductHref(product);
                          const active = searchSelectedIndex === idx;
                          const catLabel = (typeof product.category === "string" && product.category) || "Premium";
                          return (
                            <button
                              key={product.sku}
                              type="button"
                              onMouseEnter={() => setSearchSelectedIndex(idx)}
                              onClick={() => navigateFromSearch(href)}
                              className={cn(
                                "w-full text-left flex items-center gap-3 md:gap-4 px-2.5 md:px-3 py-3 md:py-2.5 rounded-xl md:rounded-lg transition-colors active:bg-brand-900/10",
                                active ? "bg-brand-900/5" : "hover:bg-brand-900/5"
                              )}
                            >
                              <div className="relative w-14 h-14 md:w-12 md:h-12 rounded-lg md:rounded-md overflow-hidden bg-brand-900/5 flex-shrink-0 ring-1 ring-brand-900/5">
                                <Image
                                  src={product.imageUrl || product.image || "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&q=80"}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  sizes="56px"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[14px] md:text-sm font-medium text-brand-950 truncate">{product.name}</p>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-brand-900/55">
                                  <span className="uppercase tracking-[0.14em]">{catLabel}</span>
                                  {product.origin && (
                                    <>
                                      <span className="w-0.5 h-0.5 rounded-full bg-brand-900/30" />
                                      <span className="truncate">{product.origin}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <p className="text-[14px] md:text-sm font-serif text-brand-950 whitespace-nowrap tabular-nums">
                                {formatSearchPrice(product.price)}
                              </p>
                              <ChevronRight className={cn(
                                "hidden md:block w-4 h-4 flex-shrink-0 transition-opacity",
                                active ? "opacity-100 text-brand-900" : "opacity-0"
                              )} strokeWidth={1.5} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer — desktop only kbd hints, mobile shows nothing (Anuluj button in header) */}
                <div className="hidden md:flex items-center justify-between gap-4 px-5 md:px-6 py-3 border-t border-brand-900/10 bg-[#f1eadf]/60 text-[11px] text-brand-900/55">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded border border-brand-900/15 bg-white font-sans text-[10px] text-brand-900/70">↑</kbd>
                      <kbd className="px-1.5 py-0.5 rounded border border-brand-900/15 bg-white font-sans text-[10px] text-brand-900/70">↓</kbd>
                      <span>nawigacja</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="px-1.5 py-0.5 rounded border border-brand-900/15 bg-white font-sans text-[10px] text-brand-900/70">↵</kbd>
                      <span>otwórz</span>
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 rounded border border-brand-900/15 bg-white font-sans text-[10px] text-brand-900/70">esc</kbd>
                    <span>zamknij</span>
                  </span>
                </div>
              </div>
            </motion.div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
