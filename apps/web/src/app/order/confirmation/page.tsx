"use client";
import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ArrowRight, Package, Calendar, Printer } from 'lucide-react';

const OrderConfirmationContent = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || 'ORD-2024-001';
  
  // Mock data for display based on the premium aesthetic
  const today = new Date().toLocaleDateString('pl-PL');
  const deliveryDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('pl-PL');

  return (
    <div className="container mx-auto px-4 max-w-3xl">
      
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-brand-100/50 animate-fade-in-up">
        {/* Header with Success Status */}
        <div className="bg-brand-900 text-white p-8 text-center relative overflow-hidden">
           <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
           
           <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm shadow-inner border border-white/20">
              <CheckCircle2 size={40} className="text-white" />
           </div>
           
           <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2 relative z-10">Dziękujemy za zamówienie!</h1>
           <p className="text-brand-200 text-sm md:text-base max-w-md mx-auto relative z-10">
             Twoje zamówienie zostało przyjęte i przekazane do realizacji.
             O wysyłce poinformujemy Cię w osobnej wiadomości.
           </p>
        </div>

        <div className="p-8">
           {/* Order Details Grid */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
               <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-400">Numer zamówienia</span>
                  <p className="text-xl font-bold text-brand-900 font-mono">{orderId}</p>
               </div>
               
               <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-400">Data zamówienia</span>
                  <p className="text-brand-900 font-medium">{today}</p>
               </div>

               <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-400">Przewidywana dostawa</span>
                  <p className="text-brand-900 font-medium flex items-center gap-2">
                      <Calendar size={16} className="text-brand-700" />
                      {deliveryDate}
                  </p>
               </div>

               <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-brand-400">Metoda płatności</span>
                  <p className="text-brand-900 font-medium flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-green-500"></span>
                       Opłacone (Przelewy24)
                  </p>
               </div>
           </div>

           {/* Divider */}
           <div className="border-t border-brand-100 my-8"></div>

           {/* What's Next Section */}
           <div className="bg-brand-50 rounded-xl p-6 border border-brand-100 mb-8">
              <h3 className="font-serif font-bold text-brand-900 mb-4 flex items-center gap-2">
                  <Package size={20} className="text-brand-700" />
                  Co dalej?
              </h3>
              <ul className="space-y-3">
                  <li className="flex gap-3 text-sm text-brand-700">
                      <div className="flex flex-col items-center">
                          <div className="w-2 h-2 bg-brand-400 rounded-full mt-1.5"></div>
                          <div className="w-px h-full bg-brand-200 my-1"></div>
                      </div>
                      <span>Otrzymasz e-mail z potwierdzeniem zamówienia (sprawdź też folder SPAM).</span>
                  </li>
                  <li className="flex gap-3 text-sm text-brand-700">
                       <div className="flex flex-col items-center">
                          <div className="w-2 h-2 bg-brand-300 rounded-full mt-1.5"></div>
                          <div className="w-px h-full bg-brand-200 my-1"></div>
                      </div>
                      <span>Skompletujemy Twoje produkty i przygotujemy paczkę.</span>
                  </li>
                  <li className="flex gap-3 text-sm text-brand-700">
                       <div className="flex flex-col items-center">
                          <div className="w-2 h-2 bg-brand-200 rounded-full mt-1.5"></div>
                      </div>
                      <span>Wyślemy numer listu przewozowego do śledzenia przesyłki.</span>
                  </li>
              </ul>
           </div>

           {/* Actions */}
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/sklep" 
                className="bg-brand-900 text-white px-8 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-brand-800 transition-all hover:shadow-lg flex items-center justify-center gap-2 group"
              >
                <span>Wróć do sklepu</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>

              <button 
                onClick={() => window.print()}
                className="bg-white text-brand-900 border border-brand-200 px-8 py-4 rounded-lg font-bold text-sm tracking-widest uppercase hover:bg-brand-50 transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                <span>Drukuj podsumowanie</span>
              </button>
           </div>

        </div>
      </div>

      {/* Support Contact */}
      <div className="text-center mt-8 text-brand-400 text-sm">
          <p>Masz pytania dotyczące zamówienia?</p>
          <a href="mailto:kontakt@ilbuoncaffe.pl" className="text-brand-600 font-bold hover:underline">kontakt@ilbuoncaffe.pl</a>
          <span className="mx-2">•</span>
          <a href="tel:+48664937937" className="text-brand-600 font-bold hover:underline">+48 664 937 937</a>
      </div>

    </div>
  );
};

export default function OrderConfirmationPage() {
  return (
    <div className="min-h-screen bg-brand-50 pt-28 pb-12 font-sans">
      <React.Suspense fallback={
        <div className="container mx-auto px-4 max-w-3xl flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-900"></div>
        </div>
      }>
        <OrderConfirmationContent />
      </React.Suspense>
    </div>
  );
}
