"use client";

import React, { useState, useEffect, useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { ShoppingBag, User, Menu, X, Search, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { SHOP_ENABLED, ACCOUNTS_ENABLED } from "@/config/launch";

const navLinks = [
  { name: "Start", href: "/" },
  { name: "Sklep", href: "/sklep" },
  { name: "Kawiarnia", href: "/kawiarnia" },
  { name: "Encyklopedia", href: "/encyklopedia" },
];

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const [isDarkTheme, setIsDarkTheme] = useState(false);
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
  const pathSegments = pathname?.split('/').filter(Boolean).length || 0;
  const isShopRootOrCategory = pathname?.startsWith("/sklep") && pathSegments <= 2;
  const isEncyclopedia = pathname?.startsWith("/encyklopedia");
  
  // Include isDarkTheme for pages that set data-theme="wine-dark" or "dark"
  const isDarkHeroPage = isDarkTheme || pathname === "/" || pathname === "/kawiarnia" || isShopRootOrCategory || isEncyclopedia || pathname === "/auth";
  const isDarkText = !isMobileMenuOpen && (isScrolled || !isDarkHeroPage);
  const accountHref = ACCOUNTS_ENABLED ? '/account' : '/auth';
  const accountLabel = ACCOUNTS_ENABLED ? 'Konto' : 'Konto (wkrótce)';

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
                      ? "bg-white/95 backdrop-blur-xl shadow-lg shadow-black/[0.08] border border-black/[0.04] pl-1.5 pr-4 py-1.5"
                      : isDarkHeroPage
                        ? "bg-white/[0.01] backdrop-blur-xl border border-white/[0.12] pl-1.5 pr-4 py-1.5 hover:bg-white/[0.12]"
                        : "bg-brand-900/[0.04] backdrop-blur-xl border border-brand-900/[0.08] pl-1.5 pr-4 py-1.5 hover:bg-brand-900/[0.06]"
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
                        ? "bg-brand-700/20" 
                        : isDarkHeroPage 
                          ? "bg-white/20 group-hover:bg-white/30" 
                          : "bg-brand-700/15 group-hover:bg-brand-700/25"
                    )} />
                    
                    {/* Logo container with subtle border */}
                    <div className={cn(
                      "relative w-12 h-12 rounded-full overflow-hidden flex items-center justify-center transition-all duration-500",
                      isScrolled 
                        ? "bg-gradient-to-br from-brand-50 to-brand-100 ring-1 ring-brand-200/50"
                        : isDarkHeroPage
                          ? "bg-white/10 ring-1 ring-white/20"
                          : "bg-brand-100/50 ring-1 ring-brand-200/30"
                    )}>
                      <Image
                        src="/assets/logo.png"
                        alt="Il Buon Caffe"
                        width={48}
                        height={48}
                        className={cn(
                          "w-full h-full object-contain p-1 transition-all duration-500 brightness-0",
                          !isScrolled && isDarkHeroPage && "invert"
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
                          ? "text-brand-900" 
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
                        ? "text-brand-700" 
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
                      ? "bg-white/95 backdrop-blur-xl shadow-lg shadow-black/[0.08] border border-black/[0.04]" 
                      : (isDarkHeroPage 
                          ? "bg-white/[0.08] backdrop-blur-xl border border-white/[0.12]" 
                          : "bg-brand-900/[0.04] backdrop-blur-xl border border-brand-900/[0.08]")
                  )}>
                  {/* Animated background pill */}
                  {highlightIndex !== -1 && pillStyle.width > 0 && (
                    <motion.div
                      className={cn(
                        "absolute top-1.5 bottom-1.5 rounded-full",
                        isScrolled 
                          ? "bg-brand-900/10" 
                          : (isDarkHeroPage ? "bg-white/15" : "bg-white shadow-sm")
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
                                ? (isScrolled ? "text-brand-950" : (isDarkHeroPage ? "text-white" : "text-brand-900"))
                                : (isScrolled 
                                    ? "text-brand-600 hover:text-brand-950" 
                                    : (isDarkHeroPage ? "text-white/70 hover:text-white" : "text-brand-600 hover:text-brand-900"))
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
                      ? "bg-white/95 backdrop-blur-xl shadow-lg shadow-black/[0.08] border border-black/[0.04] px-2 py-1.5" 
                      : (isDarkHeroPage 
                          ? "bg-white/[0.08] backdrop-blur-xl border border-white/[0.12] px-2 py-1.5" 
                          : "bg-brand-900/[0.04] backdrop-blur-xl border border-brand-900/[0.08] px-2 py-1.5")
                  )}
                >
              {/* Search */}
              <motion.button
                ref={searchBtnRef}
                onClick={() => setIsSearchOpen(true)}
                whileHover={{ scale: 1.15, rotate: 10 }}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "hidden sm:flex w-9 h-9 items-center justify-center rounded-full transition-colors",
                  isScrolled
                    ? "text-brand-700 hover:bg-brand-100"
                    : (isDarkHeroPage 
                        ? "text-white/80 hover:text-white hover:bg-white/10" 
                        : "text-brand-700 hover:bg-brand-100")
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
                      ? "text-brand-700 hover:bg-brand-100"
                      : (isDarkHeroPage 
                          ? "text-white/80 hover:text-white hover:bg-white/10" 
                          : "text-brand-700 hover:bg-brand-100")
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
                            ? "text-brand-700 hover:bg-brand-100"
                            : (isDarkHeroPage 
                                ? "text-white/80 hover:text-white hover:bg-white/10" 
                                : "text-brand-700 hover:bg-brand-100")
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
                    ? "text-brand-900 hover:bg-brand-100"
                    : (isDarkHeroPage 
                        ? "text-white hover:bg-white/10" 
                        : "text-brand-900 hover:bg-brand-100")
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
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-start justify-center pt-32"
            onClick={() => setIsSearchOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Wyszukiwarka"
          >
            <motion.div
              initial={{ opacity: 0, y: -30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-xl px-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />
                <input
                  type="text"
                  id="search-input"
                  placeholder="Czego szukasz?"
                  autoFocus
                  className="w-full py-5 pl-14 pr-14 text-lg text-brand-900 placeholder-brand-400 focus:outline-none"
                />
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-brand-400 hover:text-brand-600 rounded-full hover:bg-brand-50 transition-colors"
                  aria-label="Zamknij wyszukiwarkę"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-center text-white/50 text-sm mt-4">
                Naciśnij <kbd className="px-2 py-1 bg-white/10 rounded text-white/70">ESC</kbd> aby zamknąć
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
