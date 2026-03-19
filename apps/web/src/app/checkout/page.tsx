"use client";
import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useNotification } from '@/components/Notification/NotificationProvider';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Lock, Truck, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();
  const { error: showError } = useNotification();

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    postalCode: '',
    country: 'Polska',
    phone: '',
    paymentMethod: 'card'
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const shippingCost = subtotal > 200 ? 0 : 15;
  const total = subtotal + shippingCost;

  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!formData.email.trim()) {
      errors.email = "Adres email jest wymagany";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      errors.email = "Podaj poprawny adres email (np. jan@example.com)";
    }
    if (!formData.firstName.trim() || formData.firstName.trim().length < 2) {
      errors.firstName = "Imię musi mieć co najmniej 2 znaki";
    }
    if (!formData.lastName.trim() || formData.lastName.trim().length < 2) {
      errors.lastName = "Nazwisko musi mieć co najmniej 2 znaki";
    }
    if (!formData.address.trim()) {
      errors.address = "Ulica i numer są wymagane";
    }
    if (!formData.postalCode.trim()) {
      errors.postalCode = "Kod pocztowy jest wymagany";
    } else if (!/^\d{2}-\d{3}$/.test(formData.postalCode.trim())) {
      errors.postalCode = "Podaj kod pocztowy w formacie XX-XXX (np. 00-100)";
    }
    if (!formData.city.trim()) {
      errors.city = "Miejscowość jest wymagana";
    }
    if (!formData.phone.trim()) {
      errors.phone = "Numer telefonu jest wymagany";
    } else if (!/^[+]?[\d\s()-]{9,15}$/.test(formData.phone.trim())) {
      errors.phone = "Podaj poprawny numer telefonu (np. +48 000 000 000)";
    }
    return errors;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePaymentMethodChange = (method: string) => {
    setFormData(prev => ({ ...prev, paymentMethod: method }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      showError('Twój koszyk jest pusty!');
      return;
    }

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const fieldOrder = ['email', 'firstName', 'lastName', 'address', 'postalCode', 'city', 'phone'];
      const firstError = fieldOrder.find(k => errors[k]);
      if (firstError) requestAnimationFrame(() => document.getElementById(`checkout-${firstError}`)?.focus());
      return;
    }

    setFormErrors({});
    setIsProcessing(true);

    // Simulate initializing payment
    await new Promise(resolve => setTimeout(resolve, 1000));

    router.push('/checkout/payment');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-brand-50 pt-28 pb-12 flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-6">
            <CreditCard size={32} className="text-brand-400" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-brand-900 mb-2">Twój koszyk jest pusty</h1>
        <p className="text-brand-600 mb-8 max-w-md">Wygląda na to, że nie dodałeś jeszcze żadnych produktów do koszyka. Zapraszamy do zapoznania się z naszą ofertą.</p>
        <Link 
          href="/sklep" 
          className="bg-brand-900 text-white px-8 py-3 rounded-lg font-bold text-sm tracking-wider hover:bg-brand-800 transition-colors"
        >
          Wróć do sklepu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-50 pt-28 pb-12 font-sans">
      <div className="container mx-auto px-4 max-w-6xl">
        <Link href="/sklep" className="inline-flex items-center text-brand-600 hover:text-brand-900 text-sm font-medium mb-8 transition-colors">
          <ArrowLeft size={16} className="mr-2" aria-hidden="true" />
          Kontynuuj zakupy
        </Link>
        
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-brand-900 mb-8">Zamówienie</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* LEWA KOLUMNA - FORMULARZ */}
          <div className="lg:col-span-7 space-y-8">
            <form id="checkout-form" onSubmit={handleSubmit}>
                
                {/* 1. Kontakt */}
                <div className="bg-white p-6 rounded-xl border border-brand-100 shadow-sm">
                    <h2 className="text-lg font-bold text-brand-900 mb-4 flex items-center">
                        <span className="w-6 h-6 rounded-full bg-brand-900 text-white flex items-center justify-center text-xs mr-3">1</span>
                        Dane kontaktowe
                    </h2>
                    <div className="space-y-4">
                        <div className="col-span-1">
                            <label htmlFor="checkout-email" className="block text-xs font-bold uppercase tracking-wider text-brand-700 mb-1.5">Email</label>
                            <input 
                                id="checkout-email"
                                type="email" 
                                name="email"
                                required
                                aria-invalid={!!formErrors.email}
                                aria-describedby={formErrors.email ? "checkout-email-error" : undefined}
                                value={formData.email} 
                                onChange={handleInputChange}
                                className={`w-full px-4 py-3 bg-brand-50/50 border rounded-lg focus:outline-none focus:ring-1 transition-all text-brand-900 placeholder:text-brand-300 ${formErrors.email ? 'border-red-400 focus:ring-red-400' : 'border-brand-200 focus:ring-brand-700'}`}
                                placeholder="jan.kowalski@example.com"
                            />
                            {formErrors.email && (
                                <p id="checkout-email-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5">
                                    <span aria-hidden="true">⚠</span> {formErrors.email}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Adres dostawy */}
                <div className="mt-6 bg-white p-6 rounded-xl border border-brand-100 shadow-sm">
                    <h2 className="text-lg font-bold text-brand-900 mb-4 flex items-center">
                        <span className="w-6 h-6 rounded-full bg-brand-900 text-white flex items-center justify-center text-xs mr-3">2</span>
                        Adres dostawy
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="checkout-firstName" className="block text-xs font-bold uppercase tracking-wider text-brand-700 mb-1.5">Imię</label>
                            <input 
                                id="checkout-firstName"
                                type="text" 
                                name="firstName"
                                required
                                aria-invalid={!!formErrors.firstName}
                                aria-describedby={formErrors.firstName ? "checkout-firstName-error" : undefined}
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-3 bg-brand-50/50 border rounded-lg focus:outline-none focus:ring-1 transition-all text-brand-900 ${formErrors.firstName ? 'border-red-400 focus:ring-red-400' : 'border-brand-200 focus:ring-brand-700'}`}
                            />
                            {formErrors.firstName && (
                                <p id="checkout-firstName-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5">
                                    <span aria-hidden="true">⚠</span> {formErrors.firstName}
                                </p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="checkout-lastName" className="block text-xs font-bold uppercase tracking-wider text-brand-700 mb-1.5">Nazwisko</label>
                            <input 
                                id="checkout-lastName"
                                type="text"
                                name="lastName"
                                required
                                aria-invalid={!!formErrors.lastName}
                                aria-describedby={formErrors.lastName ? "checkout-lastName-error" : undefined}
                                value={formData.lastName}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-3 bg-brand-50/50 border rounded-lg focus:outline-none focus:ring-1 transition-all text-brand-900 ${formErrors.lastName ? 'border-red-400 focus:ring-red-400' : 'border-brand-200 focus:ring-brand-700'}`}
                            />
                            {formErrors.lastName && (
                                <p id="checkout-lastName-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5">
                                    <span aria-hidden="true">⚠</span> {formErrors.lastName}
                                </p>
                            )}
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="checkout-address" className="block text-xs font-bold uppercase tracking-wider text-brand-700 mb-1.5">Ulica i numer</label>
                            <input 
                                id="checkout-address"
                                type="text"
                                name="address"
                                required
                                aria-invalid={!!formErrors.address}
                                aria-describedby={formErrors.address ? "checkout-address-error" : undefined}
                                value={formData.address}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-3 bg-brand-50/50 border rounded-lg focus:outline-none focus:ring-1 transition-all text-brand-900 ${formErrors.address ? 'border-red-400 focus:ring-red-400' : 'border-brand-200 focus:ring-brand-700'}`}
                                placeholder="ul. Sezamkowa 12"
                            />
                            {formErrors.address && (
                                <p id="checkout-address-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5">
                                    <span aria-hidden="true">⚠</span> {formErrors.address}
                                </p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="checkout-postalCode" className="block text-xs font-bold uppercase tracking-wider text-brand-700 mb-1.5">Kod pocztowy</label>
                            <input 
                                id="checkout-postalCode"
                                type="text"
                                name="postalCode"
                                required
                                aria-invalid={!!formErrors.postalCode}
                                aria-describedby={formErrors.postalCode ? "checkout-postalCode-error" : undefined}
                                value={formData.postalCode}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-3 bg-brand-50/50 border rounded-lg focus:outline-none focus:ring-1 transition-all text-brand-900 ${formErrors.postalCode ? 'border-red-400 focus:ring-red-400' : 'border-brand-200 focus:ring-brand-700'}`}
                                placeholder="00-000"
                            />
                            {formErrors.postalCode && (
                                <p id="checkout-postalCode-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5">
                                    <span aria-hidden="true">⚠</span> {formErrors.postalCode}
                                </p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="checkout-city" className="block text-xs font-bold uppercase tracking-wider text-brand-700 mb-1.5">Miejscowość</label>
                            <input 
                                id="checkout-city"
                                type="text"
                                name="city"
                                required
                                aria-invalid={!!formErrors.city}
                                aria-describedby={formErrors.city ? "checkout-city-error" : undefined}
                                value={formData.city}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-3 bg-brand-50/50 border rounded-lg focus:outline-none focus:ring-1 transition-all text-brand-900 ${formErrors.city ? 'border-red-400 focus:ring-red-400' : 'border-brand-200 focus:ring-brand-700'}`}
                            />
                            {formErrors.city && (
                                <p id="checkout-city-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5">
                                    <span aria-hidden="true">⚠</span> {formErrors.city}
                                </p>
                            )}
                        </div>
                        <div>
                             <label htmlFor="checkout-phone" className="block text-xs font-bold uppercase tracking-wider text-brand-700 mb-1.5">Telefon</label>
                             <input 
                                id="checkout-phone"
                                type="tel"
                                name="phone"
                                required
                                aria-invalid={!!formErrors.phone}
                                aria-describedby={formErrors.phone ? "checkout-phone-error" : undefined}
                                value={formData.phone}
                                onChange={handleInputChange}
                                className={`w-full px-4 py-3 bg-brand-50/50 border rounded-lg focus:outline-none focus:ring-1 transition-all text-brand-900 ${formErrors.phone ? 'border-red-400 focus:ring-red-400' : 'border-brand-200 focus:ring-brand-700'}`}
                                placeholder="+48 000 000 000"
                             />
                             {formErrors.phone && (
                                <p id="checkout-phone-error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1.5">
                                    <span aria-hidden="true">⚠</span> {formErrors.phone}
                                </p>
                             )}
                        </div>
                         <div>
                            <label htmlFor="checkout-country" className="block text-xs font-bold uppercase tracking-wider text-brand-700 mb-1.5">Kraj</label>
                            <select 
                                id="checkout-country"
                                name="country"
                                value={formData.country}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-brand-50/50 border border-brand-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-700 transition-all text-brand-900"
                            >
                                <option value="Polska">Polska</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 3. Płatność */}
                <div className="mt-6 bg-white p-6 rounded-xl border border-brand-100 shadow-sm">
                    <h2 className="text-lg font-bold text-brand-900 mb-4 flex items-center">
                        <span className="w-6 h-6 rounded-full bg-brand-900 text-white flex items-center justify-center text-xs mr-3">3</span>
                        Metoda płatności
                    </h2>
                    <div className="grid gap-3">
                        <label className={`relative flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.paymentMethod === 'card' ? 'border-brand-700 bg-brand-50/50 ring-1 ring-brand-700' : 'border-brand-200 hover:border-brand-300'}`}>
                            <input 
                                type="radio" 
                                name="paymentMethod" 
                                value="card" 
                                checked={formData.paymentMethod === 'card'}
                                onChange={() => handlePaymentMethodChange('card')}
                                className="w-4 h-4 text-brand-900 border-gray-300 focus:ring-brand-700"
                            />
                            <div className="ml-3 flex-1">
                                <span className="block text-sm font-bold text-brand-900">Karta płatnicza</span>
                                <span className="block text-xs text-brand-700">Visa, Mastercard, Maestro</span>
                            </div>
                            <CreditCard size={20} className="text-brand-400" />
                        </label>
                        
                         <label className={`relative flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.paymentMethod === 'blik' ? 'border-brand-700 bg-brand-50/50 ring-1 ring-brand-700' : 'border-brand-200 hover:border-brand-300'}`}>
                            <input 
                                type="radio" 
                                name="paymentMethod" 
                                value="blik" 
                                checked={formData.paymentMethod === 'blik'}
                                onChange={() => handlePaymentMethodChange('blik')}
                                className="w-4 h-4 text-brand-900 border-gray-300 focus:ring-brand-700"
                            />
                             <div className="ml-3 flex-1">
                                <span className="block text-sm font-bold text-brand-900">BLIK</span>
                                <span className="block text-xs text-brand-700">Szybka płatność kodem</span>
                            </div>
                             <div className="w-8 h-5 bg-brand-100 rounded text-[10px] font-bold flex items-center justify-center text-brand-600">BLIK</div>
                        </label>

                         <label className={`relative flex items-center p-4 border rounded-xl cursor-pointer transition-all ${formData.paymentMethod === 'transfer' ? 'border-brand-700 bg-brand-50/50 ring-1 ring-brand-700' : 'border-brand-200 hover:border-brand-300'}`}>
                            <input 
                                type="radio" 
                                name="paymentMethod" 
                                value="transfer" 
                                checked={formData.paymentMethod === 'transfer'}
                                onChange={() => handlePaymentMethodChange('transfer')}
                                className="w-4 h-4 text-brand-900 border-gray-300 focus:ring-brand-700"
                            />
                            <div className="ml-3 flex-1">
                                <span className="block text-sm font-bold text-brand-900">Przelew tradycyjny</span>
                                <span className="block text-xs text-brand-700">Księgowanie do 2 dni</span>
                            </div>
                             <Lock size={18} className="text-brand-400" />
                        </label>
                    </div>
                </div>

            </form>
          </div>
          
          {/* PRAWA KOLUMNA - PODSUMOWANIE */}
          <div className="lg:col-span-5">
             <div className="bg-white p-6 rounded-xl border border-brand-100 shadow-lg sticky top-28">
                <h2 className="text-lg font-bold text-brand-900 mb-6">Podsumowanie zamówienia</h2>
                
                <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto scrollbar-hide">
                    {items.map((item) => (
                        <div key={item.sku} className="flex gap-4 items-start">
                             <div className="w-16 h-16 bg-brand-50 rounded border border-brand-100 p-1 shrink-0">
                                <img src={item.imageUrl || item.image || ''} alt={item.name} className="w-full h-full object-cover rounded-sm" />
                             </div>
                             <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-brand-900 text-sm">{item.name}</h4>
                                <div className="text-xs text-brand-700 mt-1">
                                    Ilość: {item.quantity}
                                </div>
                             </div>
                             <div className="text-right">
                                <span className="block font-bold text-brand-900 text-sm">{(item.price * item.quantity).toFixed(2)} zł</span>
                             </div>
                        </div>
                    ))}
                </div>
                
                <div className="space-y-3 py-4 border-t border-brand-100">
                     <div className="flex justify-between text-sm">
                        <span className="text-brand-700">Wartość produktów</span>
                        <span className="font-bold text-brand-900">{subtotal.toFixed(2)} zł</span>
                    </div>
                     <div className="flex justify-between text-sm">
                        <span className="text-brand-700">Dostawa</span>
                        <span className="font-bold text-brand-900">{shippingCost === 0 ? 'Darmowa' : `${shippingCost.toFixed(2)} zł`}</span>
                    </div>
                </div>

                <div className="py-4 border-t border-brand-100">
                    <div className="flex justify-between items-end">
                        <span className="text-sm font-bold uppercase tracking-wider text-brand-900">Do zapłaty</span>
                        <span className="text-3xl font-serif font-bold text-brand-900">{total.toFixed(2)} zł</span>
                    </div>
                     <p className="text-[10px] text-brand-400 mt-2 text-right">Zawiera podatek VAT</p>
                </div>

                <button 
                    type="submit"
                    form="checkout-form"
                    disabled={isProcessing}
                    aria-busy={isProcessing}
                    className="w-full mt-4 bg-brand-900 text-white py-4 rounded-lg font-bold uppercase tracking-widest text-sm shadow-xl hover:bg-brand-800 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                    {isProcessing ? (
                        <>
                           <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true"></div>
                           <span>Przetwarzanie...</span>
                        </>
                    ) : (
                        <>
                            <span>Zamawiam i płacę</span>
                            <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform"/>
                        </>
                    )}
                </button>
                
                <div className="flex items-center justify-center gap-2 mt-6 text-brand-400 opacity-60">
                    <Truck size={14} />
                    <span className="text-[10px] font-medium uppercase tracking-wider">Bezpieczna dostawa & Płatność</span>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
