"use client";

import { usePathname } from "next/navigation";

import { CartProvider } from "@/context/CartContext";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { PromoBanner } from "./PromoBanner";
import CartSidebar from "./CartSidebar";
import { NotificationProvider } from "../Notification/NotificationProvider";
import { AgeVerificationModal } from "../ui/AgeVerificationModal";

export const Shell = ({ children }: { children: React.ReactNode }) => {

  const pathname = usePathname();
  const isAdminPath = pathname?.startsWith('/admin');
  const isCatalogPath = pathname?.startsWith('/katalogi');

  return (
    <NotificationProvider>
      <CartProvider>
        <div className="min-h-screen flex flex-col font-sans bg-brand-beige text-brand-900 selection:bg-brand-900 selection:text-white">
          {/* Skip to main content link - visible on focus for keyboard users (WCAG 2.4.1) */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-brand-900 focus:text-white focus:rounded-lg focus:text-sm focus:font-bold focus:shadow-lg"
          >
            Przejdź do treści
          </a>
          {!isAdminPath && !isCatalogPath && <PromoBanner />}
          {!isAdminPath && !isCatalogPath && <Navbar />}
          <main id="main-content" className="flex-grow pt-0 min-h-screen">
            {children}
          </main>
          {!isAdminPath && !isCatalogPath && <Footer />}
          {!isCatalogPath && <CartSidebar />}
          {!isCatalogPath && <AgeVerificationModal />}
        </div>
      </CartProvider>
    </NotificationProvider>
  );
};
