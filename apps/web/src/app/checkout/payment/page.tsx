"use client";
import React, { useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';

export default function PaymentPage() {
  const { clearCart, items } = useCart();
  const router = useRouter();

  useEffect(() => {
    // If empty cart, redirect back to shop (unless we just finished success)
    if (items.length === 0) {
       // In a real scenario we might redirect, but for this mock flow we tolerate it 
       // as user might arrive here from a different state.
    }

    // Simulate Przelewy24 interaction
    const timer = setTimeout(() => {
      // Create a mock order ID
      const mockOrderId = `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      clearCart();
      router.replace(`/order/confirmation?orderId=${mockOrderId}`);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-6 animate-fade-in">
           <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl mx-auto relative">
              <img src="https://cdn.worldvectorlogo.com/logos/przelewy24-1.svg" alt="Logo Przelewy24 – operator płatności online" className="w-12 opacity-80" />
              <div className="absolute inset-0 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
           </div>
           <div>
               <h1 className="text-2xl font-serif font-bold text-brand-900 mb-2">Przekierowywanie do płatności...</h1>
               <p className="text-brand-700">Proszę czekać, łączymy się z operatorem płatności.</p>
           </div>
        </div>
    </div>
  );
}
