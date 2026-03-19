"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { 
  MapPin, 
  Clock, 
  Phone, 
  Mail,
  Instagram,
  Facebook,
  Send,
  ChevronRight
} from "lucide-react";

const footerLinks = {
  shop: [
    { label: "Kawa", href: "/sklep/kawa" },
    { label: "Wina", href: "/sklep/wino" },
    { label: "Delikatesy", href: "/sklep/spizarnia" },
    { label: "Słodycze", href: "/sklep/slodycze" },
  ],
  company: [
    { label: "O nas", href: "/about" },
    { label: "Kawiarnia", href: "/kawiarnia" },
    { label: "Encyklopedia", href: "/encyklopedia" },
    { label: "Kontakt", href: "/contact" },
  ],
  legal: [
    { label: "Regulamin", href: "/terms" },
    { label: "Polityka prywatności", href: "/privacy" },
    { label: "Pliki cookie", href: "/cookies" },
  ],
};

export const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    if (!email.trim()) {
      setEmailError("Adres email jest wymagany");
      document.getElementById("footer-newsletter-email")?.focus();
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError("Podaj poprawny adres email (np. jan@example.com)");
      document.getElementById("footer-newsletter-email")?.focus();
      return;
    }
    setIsSubscribed(true);
    setEmail("");
    setTimeout(() => setIsSubscribed(false), 3000);
  };

  return (
    <footer className="bg-brand-900 text-white">
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-6 lg:px-12 py-16 md:py-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
            <div className="max-w-lg">
              <h3 className="text-3xl md:text-4xl font-serif mb-4">
                Bądź na bieżąco
              </h3>
              <p className="text-white/60 leading-relaxed">
                Zapisz się do newslettera i otrzymuj informacje o nowościach, 
                promocjach oraz inspiracje ze świata kawy i delikatesów.
              </p>
            </div>

            <form onSubmit={handleSubscribe} className="flex-1 max-w-sm" noValidate>
              <div className="relative">
                <input
                  id="footer-newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  placeholder="Twój adres email"
                  aria-label="Adres email do newslettera"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "footer-email-error" : undefined}
                  className={`w-full bg-white/10 border rounded-full py-4 pl-6 pr-14 text-white placeholder:text-white/40 focus:outline-none focus:bg-white/15 transition-all ${
                    emailError ? "border-red-400 focus:border-red-400" : "border-white/20 focus:border-brand-400"
                  }`}
                />
                <button
                  type="submit"
                  aria-label="Zapisz się do newslettera"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand-700 hover:bg-brand-400 rounded-full flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              {emailError && (
                <p id="footer-email-error" role="alert" className="flex items-center gap-1.5 mt-2 px-1 text-red-400 text-sm">
                  <span aria-hidden="true">⚠</span> {emailError}
                </p>
              )}
              {isSubscribed && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="status"
                  aria-live="polite"
                  className="text-brand-400 text-sm mt-3"
                >
                  Dziękujemy za zapis!
                </motion.p>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div>
        <div className="container mx-auto px-6 lg:px-12 py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
            
            {/* Brand Column */}
            <div className="lg:col-span-4">
              <Link href="/" className="inline-flex items-center gap-3 mb-6">
                <Image
                  src="/assets/logo.png"
                  alt="Il Buon Caffe"
                  width={48}
                  height={48}
                  className="invert opacity-90"
                />
                <span className="text-xl font-serif font-semibold">Il Buon Caffe</span>
              </Link>
              
              <p className="text-white/60 leading-relaxed mb-8 max-w-sm">
                Kawiarnia i delikatesy premium w sercu Koszalina. 
                Od 2003 roku dostarczamy najwyższej jakości produkty z całego świata.
              </p>

              {/* Social Links */}
              <nav aria-label="Media społecznościowe" className="flex items-center gap-3">
                <a
                  href="https://www.instagram.com/il_buoncaffe/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Il Buon Caffe na Instagramie (otwiera nową kartę)"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <Instagram className="w-4 h-4" aria-hidden="true" />
                </a>
                <a
                  href="https://www.facebook.com/IlBuonCaffeKoszalin"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Il Buon Caffe na Facebooku (otwiera nową kartę)"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <Facebook className="w-4 h-4" aria-hidden="true" />
                </a>
              </nav>
            </div>

            {/* Links Columns */}
            <nav aria-label="Sklep" className="lg:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-6">
                Sklep
              </h4>
              <ul className="space-y-3">
                {footerLinks.shop.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center text-white/70 hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-3 h-3 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" aria-hidden="true" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Firma" className="lg:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-6">
                Firma
              </h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center text-white/70 hover:text-white transition-colors"
                    >
                      <ChevronRight className="w-3 h-3 mr-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" aria-hidden="true" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Contact Column */}
            <address className="lg:col-span-4 not-italic">
              <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-6">
                Kontakt
              </h4>
              <ul className="space-y-4">
                <li>
                  <a 
                    href="https://www.google.com/maps/search/?api=1&query=Il+Buon+Caffe,+ul.+Bpa+Czes%C5%82awa+Domina+3%2F6,+75-065+Koszalin" 
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Adres: ul. Bpa Czesława Domina 3/6, 75-065 Koszalin (otwiera mapę)"
                    className="flex items-start gap-3 text-white/70 hover:text-white transition-colors group"
                  >
                    <MapPin className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="block">ul. Bpa Czesława Domina 3/6</span>
                      <span className="text-white/50">75-065 Koszalin</span>
                    </div>
                  </a>
                </li>
                <li>
                  <div className="flex items-start gap-3 text-white/70">
                    <Clock className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                      <span className="block">Pn-Pt: 09:00 - 16:00</span>
                      <span className="text-white/50">Sob: 11:00 - 14:00</span>
                    </div>
                  </div>
                </li>
                <li>
                  <a 
                    href="tel:+48664937937"
                    className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
                  >
                    <Phone className="w-5 h-5 text-brand-400 flex-shrink-0" aria-hidden="true" />
                    <span>+48 664 937 937</span>
                  </a>
                </li>
                <li>
                  <a 
                    href="mailto:hello@ilbuoncaffe.pl"
                    className="flex items-center gap-3 text-white/70 hover:text-white transition-colors"
                  >
                    <Mail className="w-5 h-5 text-brand-400 flex-shrink-0" aria-hidden="true" />
                    <span>hello@ilbuoncaffe.pl</span>
                  </a>
                </li>
              </ul>
            </address>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative border-t border-white/10">
        <div className="container mx-auto px-6 lg:px-12 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
            <p>© 2003 - {new Date().getFullYear()} Il Buon Caffe. Wszelkie prawa zastrzeżone.</p>
            
            <nav aria-label="Linki prawne" className="flex items-center gap-6">
              {footerLinks.legal.map((link, index) => (
                <React.Fragment key={link.href}>
                  <Link 
                    href={link.href}
                    className="hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                  {index < footerLinks.legal.length - 1 && (
                    <span aria-hidden="true" className="text-white/20">·</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};
