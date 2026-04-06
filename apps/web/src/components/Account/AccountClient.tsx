"use client";


import React, { useState, useRef, useEffect } from 'react';

import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, User, Lock, Mail, LogOut, Package, 
  CreditCard, MapPin, Gift, ChevronRight, Settings,
  Eye, EyeOff, Home, Plus, Trash2, Edit2, Bell, Shield,
  Check, X, Calendar, ShoppingBag, Minus, Square, Copy, QrCode, Coffee, Loader2
} from 'lucide-react';
import { getFeaturedProducts } from '@/actions/products';
import { Product } from '@/types';
import { useCart } from '@/context/CartContext';

// --- MOCK DATA ---
const USER_DATA = {
  name: "Anna Nowak",
  email: "kontakt@ilbuoncaffe.pl",
  memberSince: "2023",
  tier: "Gold Member",
  points: 840,
  nextReward: 1000,
  loyaltyHistory: [
    { id: 1, date: "14.05.2024", action: "Zakup: Etiopia Yirgacheffe", points: "+89" },
    { id: 2, date: "02.04.2024", action: "Zakup: Château Margaux", points: "+320" },
    { id: 3, date: "01.03.2024", action: "Nagroda: Darmowa Kawa", points: "-150" },
    { id: 4, date: "12.12.2023", action: "Bonus Świąteczny", points: "+50" },
  ],
  rewards: [
    { id: 1, name: "Darmowe Espresso", cost: 1000, image: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?q=80&w=200&auto=format&fit=crop" },
    { id: 2, name: "Croissant Maślany", cost: 1500, image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=200&auto=format&fit=crop" },
    { id: 3, name: "Paczka Kawy 250g", cost: 3500, image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=200&auto=format&fit=crop" },
  ],
  orders: [
    { 
      id: "ORD-2024-001", 
      date: "14.05.2024", 
      total: "89.00 zł", 
      status: "W realizacji",
      paymentMethod: "Visa •••• 4242",
      address: "ul. Słoneczna 15/4, Koszalin",
      items: [
        { name: "Etiopia Yirgacheffe", qty: 1, price: "65.00 zł", image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=200&auto=format&fit=crop" },
        { name: "Croissant z Masłem", qty: 2, price: "24.00 zł", image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=200&auto=format&fit=crop" }
      ],
      timeline: [
        { status: "Złożono zamówienie", date: "14.05, 09:30", completed: true },
        { status: "Płatność zaakceptowana", date: "14.05, 09:35", completed: true },
        { status: "Pakowanie", date: "14.05, 11:00", completed: true },
        { status: "Wysłano", date: "-", completed: false },
      ]
    },
    { 
      id: "ORD-2024-023", 
      date: "02.04.2024", 
      total: "320.00 zł", 
      status: "Dostarczono",
      paymentMethod: "Visa •••• 4242",
      address: "ul. Morska 100, Koszalin",
      items: [
        { name: "Château Margaux 2015", qty: 1, price: "320.00 zł", image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=200&auto=format&fit=crop" }
      ],
      timeline: [
        { status: "Złożono zamówienie", date: "02.04, 14:20", completed: true },
        { status: "Dostarczono", date: "04.04, 12:15", completed: true },
      ]
    },
    { 
        id: "ORD-2023-115", 
        date: "12.12.2023", 
        total: "150.00 zł", 
        status: "Dostarczono",
        paymentMethod: "Mastercard •••• 8899",
        address: "ul. Słoneczna 15/4, Koszalin",
        items: [
            { name: "Zestaw Świąteczny", qty: 1, price: "150.00 zł", image: "https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=200&auto=format&fit=crop" }
        ],
        timeline: [
            { status: "Dostarczono", date: "14.12, 16:00", completed: true }
        ]
    },
  ],
  addresses: [
    { id: 1, name: "Dom", street: "ul. Słoneczna 15/4", city: "75-001 Koszalin", isDefault: true },
    { id: 2, name: "Biuro", street: "ul. Morska 100 (Biurowiec Wave)", city: "75-200 Koszalin", isDefault: false },
  ],
  cards: [
    { id: 1, type: "Visa", last4: "4242", expiry: "12/25", isDefault: true },
    { id: 2, type: "Mastercard", last4: "8899", expiry: "09/24", isDefault: false },
  ]
};

type AccountSection = 'dashboard' | 'orders' | 'loyalty' | 'addresses' | 'payments' | 'settings';

interface AccountProps {}

// --- Helper Components ---

const Button = ({ children, variant = 'primary', onClick, className = "", type = "button", disabled }: any) => {
  const baseStyle = "px-6 py-3 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 group relative overflow-hidden";
  const variants: any = {
    primary: "bg-brand-900 text-white hover:bg-brand-800 shadow-md hover:shadow-lg hover:-translate-y-0.5",
    outline: "border border-brand-200 text-brand-900 hover:border-brand-900 bg-transparent",
    ghost: "text-brand-700 hover:text-brand-900 bg-transparent hover:bg-brand-50",
  };
  const disabledStyle = disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "";
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className} ${disabledStyle}`}>{children}</button>;
};

const InputField = ({ label, type, placeholder, icon: Icon, defaultValue }: any) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = type === 'password' ? (showPassword ? 'text' : 'password') : type;
  return (
    <div className="space-y-1.5 group">
      <label className="text-[10px] uppercase tracking-widest font-bold text-brand-400 group-focus-within:text-brand-900 transition-colors ml-1">{label}</label>
      <div className="relative flex items-center bg-white rounded-lg border border-brand-200 group-focus-within:border-brand-900 group-focus-within:ring-1 group-focus-within:ring-brand-900 transition-all shadow-sm">
        <div className="pl-4 pr-3 text-brand-300 group-focus-within:text-brand-900 transition-colors"><Icon size={18} /></div>
        <input type={inputType} placeholder={placeholder} defaultValue={defaultValue} className="w-full py-3.5 pr-4 outline-none bg-transparent font-sans text-brand-900 placeholder:text-brand-200 text-sm" />
        {type === 'password' && (
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="pr-4 text-brand-300 hover:text-brand-900 transition-colors">
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
};

// --- VIEWS ---

const DashboardView = ({ onChangeView }: { onChangeView: (v: AccountSection) => void }) => {
    const hours = new Date().getHours();
    const greeting = hours < 12 ? "Dzień dobry" : hours < 18 ? "Dzień dobry" : "Dobry wieczór";
    const [recommendations, setRecommendations] = useState<Product[]>([]);
    const [isLoadingRecs, setIsLoadingRecs] = useState(true);

    useEffect(() => {
        const loadRecommendations = async () => {
            try {
                const data = await getFeaturedProducts(4);
                setRecommendations(data);
            } catch (error) {
                console.error("Failed to load recommendations", error);
            } finally {
                setIsLoadingRecs(false);
            }
        };
        loadRecommendations();
    }, []);

    return (
        <div className="animate-fade-in space-y-12">
            {/* Hero Greeting */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-brand-100 pb-8">
                <div>
                    <span className="text-brand-400 font-serif italic text-xl mb-1 block">{greeting},</span>
                    <h2 className="text-5xl font-serif text-brand-900">{USER_DATA.name.split(' ')[0]}</h2>
                    <p className="text-sm text-brand-700 mt-2 font-light">
                        Miło Cię widzieć z powrotem. Masz <strong className="text-brand-900 font-bold">{USER_DATA.points} pkt</strong> w klubie.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => onChangeView('loyalty')}>Moja Karta</Button>
                    <Button variant="primary" onClick={() => onChangeView('orders')}>Moje Zamówienia</Button>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div 
                    className="bg-white p-6 rounded-xl border border-brand-100 shadow-sm hover:border-brand-300 hover:shadow-md transition-all group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700" 
                    onClick={() => onChangeView('orders')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onChangeView('orders');
                        }
                    }}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-brand-50 text-brand-900 rounded-lg group-hover:bg-brand-900 group-hover:text-white transition-colors">
                            <Package size={24} />
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-green-600 bg-green-50 px-2 py-1 rounded">W drodze</span>
                    </div>
                    <h3 className="font-serif text-xl text-brand-900 mb-1">Śledź paczkę</h3>
                    <p className="text-sm text-brand-700 mb-4">Zamówienie #ORD-2024-001</p>
                    <div className="h-1 w-full bg-brand-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-900 w-3/4"></div>
                    </div>
                </div>

                <div 
                    className="bg-brand-900 text-white p-6 rounded-xl shadow-lg cursor-pointer group relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2" 
                    onClick={() => onChangeView('loyalty')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onChangeView('loyalty');
                        }
                    }}
                >
                    <div className="absolute right-0 top-0 p-8 opacity-5"><Gift size={100} /></div>
                    <div className="relative z-10">
                        <h3 className="font-serif text-xl mb-1 text-brand-100">Odbierz nagrodę</h3>
                        <p className="text-sm text-white/60 mb-6">Brakuje 160 pkt do darmowej kawy.</p>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest border border-white/20 w-max px-4 py-2 rounded-full hover:bg-white hover:text-brand-900 transition-colors">
                            Sprawdź katalog <ArrowRight size={14} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-brand-100 shadow-sm hover:border-brand-300 hover:shadow-md transition-all group cursor-pointer flex flex-col justify-center items-center text-center">
                    <div className="mb-4 text-brand-300 group-hover:text-brand-700 transition-colors">
                        <Calendar size={40} strokeWidth={1} />
                    </div>
                    <h3 className="font-serif text-xl text-brand-900 mb-1">Zarezerwuj stolik</h3>
                    <p className="text-sm text-brand-700 mb-4">Zaplanuj wizytę w kawiarni</p>
                    <span className="text-xs font-bold uppercase tracking-widest text-brand-900 border-b border-brand-900 pb-0.5">Rezerwacja Online</span>
                </div>
            </div>

            {/* Recommendations */}
            <div>
                <h3 className="text-2xl font-serif text-brand-900 mb-6">Rekomendowane dla Ciebie</h3>
                {isLoadingRecs ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                    </div>
                ) : recommendations.length === 0 ? (
                    <p className="text-brand-700 text-center py-8">Brak rekomendacji</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {recommendations.map(product => (
                            <div key={product.sku} className="group cursor-pointer">
                                <div className="aspect-square bg-white rounded-lg border border-brand-100 overflow-hidden mb-3 relative">
                                    <img src={product.imageUrl || product.image || "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={product.name} />
                                    <button className="absolute bottom-3 right-3 bg-white text-brand-900 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all hover:bg-brand-900 hover:text-white">
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <h4 className="font-bold text-brand-900 text-sm truncate">{product.name}</h4>
                                <p className="text-xs text-brand-700 mt-0.5">{product.category}</p>
                                <p className="font-serif text-brand-900 mt-2">{product.price.toFixed(2)} zł</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const LoyaltyView = () => (
    <div className="animate-fade-in space-y-12">
        <div className="flex justify-between items-end border-b border-brand-100 pb-4">
             <div>
                <h2 className="text-4xl font-serif text-brand-900">Klub Lojalnościowy</h2>
                <p className="text-brand-700 font-light mt-2">Twoja karta członkowska i nagrody.</p>
             </div>
             <div className="text-right hidden md:block">
                 <span className="block text-[10px] uppercase tracking-widest text-brand-400 font-bold mb-1">Dostępne środki</span>
                 <span className="text-3xl font-serif text-brand-900">{USER_DATA.points} pkt</span>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Digital Card */}
            <div className="w-full aspect-[1.6/1] rounded-2xl relative overflow-hidden shadow-2xl group transition-transform hover:scale-[1.01]">
                {/* Backgrounds */}
                <div className="absolute inset-0 bg-[#1C1917]"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-[#C6A87C] rounded-full blur-[80px] opacity-20"></div>

                {/* Content */}
                <div className="absolute inset-0 p-8 flex flex-col justify-between text-white z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Coffee size={16} className="text-[#C6A87C]" />
                                <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#C6A87C]">Il Buon Club</span>
                            </div>
                            <h3 className="font-serif text-2xl">{USER_DATA.name}</h3>
                        </div>
                        <div className="text-right">
                            <span className="block text-[10px] uppercase tracking-widest text-white/50 mb-1">Status</span>
                            <span className="font-bold border border-[#C6A87C] text-[#C6A87C] px-3 py-1 rounded text-xs uppercase tracking-wider">{USER_DATA.tier}</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-end">
                        <div className="font-mono text-sm text-white/40 tracking-widest">
                            8492 1102 4921 0023
                        </div>
                        <div className="bg-white p-2 rounded-lg">
                            <QrCode size={48} className="text-black" />
                        </div>
                    </div>
                </div>

                {/* Gloss Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>
            </div>

            {/* Stats & Info */}
            <div className="space-y-8">
                <div className="bg-white p-6 rounded-xl border border-brand-100">
                    <h3 className="font-serif text-xl text-brand-900 mb-4">Postęp poziomu</h3>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-brand-400 mb-2">
                        <span>Gold</span>
                        <span>Platinum</span>
                    </div>
                    <div className="w-full h-2 bg-brand-50 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-brand-900 w-[84%]"></div>
                    </div>
                    <p className="text-xs text-brand-700">
                        Wydaj jeszcze <strong>1600 zł</strong>, aby osiągnąć poziom Platinum i zyskać stały rabat 15%.
                    </p>
                </div>

                <div className="bg-brand-50 p-6 rounded-xl border border-brand-100 flex items-start gap-4">
                    <div className="p-3 bg-white rounded-full text-brand-900 shadow-sm"><Gift size={20} /></div>
                    <div>
                        <h4 className="font-bold text-brand-900 mb-1">Urodzinowy prezent</h4>
                        <p className="text-sm text-brand-700">Jako klubowicz otrzymasz od nas darmowy deser w dniu swoich urodzin.</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Rewards Section */}
        <div>
            <h3 className="text-2xl font-serif text-brand-900 mb-6 flex items-center gap-3">
                <Gift size={24} className="text-brand-300" /> Katalog Nagród
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {USER_DATA.rewards.map(reward => (
                    <div key={reward.id} className={`bg-white rounded-xl overflow-hidden border transition-all ${USER_DATA.points >= reward.cost ? 'border-brand-200 hover:border-brand-400 hover:shadow-lg' : 'border-brand-50 opacity-60 grayscale'}`}>
                        <div className="h-40 overflow-hidden relative">
                             <img src={reward.image} alt={reward.name} className="w-full h-full object-cover" />
                             {USER_DATA.points >= reward.cost && (
                                 <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded">Dostępne</div>
                             )}
                        </div>
                        <div className="p-5">
                            <h4 className="font-bold text-brand-900 mb-1">{reward.name}</h4>
                            <div className="flex justify-between items-center mt-4">
                                <span className="font-serif text-lg text-brand-600">{reward.cost} pkt</span>
                                <button
                                    disabled={USER_DATA.points < reward.cost}
                                    className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors ${USER_DATA.points >= reward.cost ? 'bg-brand-900 text-white hover:bg-brand-700' : 'bg-brand-100 text-brand-300 cursor-not-allowed'}`}
                                >
                                    Odbierz
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* History */}
        <div className="border-t border-brand-100 pt-8">
            <h3 className="text-xl font-serif text-brand-900 mb-6">Historia Punktów</h3>
            <div className="space-y-0">
                {USER_DATA.loyaltyHistory.map((item, idx) => (
                    <div key={item.id} className={`flex items-center justify-between py-4 ${idx !== USER_DATA.loyaltyHistory.length - 1 ? 'border-b border-brand-50' : ''}`}>
                         <div className="flex items-center gap-4">
                             <div className={`w-2 h-2 rounded-full ${item.points.startsWith('+') ? 'bg-green-500' : 'bg-red-400'}`}></div>
                             <div>
                                 <p className="text-sm font-bold text-brand-900">{item.action}</p>
                                 <p className="text-xs text-brand-400 font-mono">{item.date}</p>
                             </div>
                         </div>
                         <span className={`font-mono font-bold ${item.points.startsWith('+') ? 'text-green-600' : 'text-brand-900'}`}>
                             {item.points}
                         </span>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const OrdersView = () => (
  <div className="animate-fade-in space-y-8">
    <div className="flex justify-between items-end border-b border-brand-100 pb-6">
      <div>
        <h2 className="text-3xl font-serif text-brand-900">Moje Zamówienia</h2>
        <p className="text-brand-700 font-light mt-2 text-sm">Historia Twoich zakupów i statusy realizacji.</p>
      </div>
    </div>
    <div className="space-y-6">
      {USER_DATA.orders.map((order) => (
        <div key={order.id} className="bg-white p-0 rounded-xl border border-brand-100 hover:border-brand-300 transition-all shadow-sm hover:shadow-md group overflow-hidden">
           <div className="flex flex-col md:flex-row">
               {/* Left Status Bar */}
               <div className={`h-2 md:h-auto md:w-2 ${order.status === 'W realizacji' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
               
               <div className="p-6 flex-1 flex flex-col md:flex-row justify-between gap-6">
                   <div className="flex items-start gap-4">
                      <div className="p-3 bg-brand-50 rounded-lg text-brand-900 group-hover:bg-brand-900 group-hover:text-white transition-colors shrink-0">
                          <Package size={24} strokeWidth={1.5} />
                      </div>
                      <div>
                          <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-bold text-brand-900 text-lg">{order.id}</h4>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${order.status === 'W realizacji' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                {order.status}
                              </span>
                          </div>
                          <p className="text-xs text-brand-700 mb-3 flex items-center gap-2">
                              <Calendar size={12} /> {order.date}
                              <span className="text-brand-300">|</span>
                              <ShoppingBag size={12} /> {order.items.length} produkty
                          </p>
                          <div className="flex -space-x-2 overflow-hidden py-1">
                              {order.items.map((item: any, i: number) => (
                                  <img key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover" src={item.image} alt={item.name} />
                              ))}
                          </div>
                      </div>
                   </div>
                   
                   <div className="flex flex-row md:flex-col justify-between items-center md:items-end gap-4 border-t md:border-t-0 border-brand-50 pt-4 md:pt-0">
                       <div className="text-right">
                           <span className="text-[10px] uppercase tracking-widest text-brand-400 block mb-1">Wartość</span>
                           <span className="font-serif text-xl text-brand-900 font-bold">{order.total}</span>
                       </div>
                       <Link href={`/account/orders/${order.id}`}>
                            <Button variant="outline" className="h-10 text-xs px-6">Szczegóły</Button>
                       </Link>
                   </div>
               </div>
           </div>
        </div>
      ))}
    </div>
  </div>
);

const AddressesView = () => (
    <div className="animate-fade-in space-y-8">
        <div className="flex justify-between items-end border-b border-brand-100 pb-6">
            <div>
                <h2 className="text-3xl font-serif text-brand-900">Adresy Dostawy</h2>
                <p className="text-brand-700 font-light mt-2 text-sm">Zarządzaj miejscami, do których dostarczamy kawę.</p>
            </div>
            <Button variant="primary" className="h-10 text-xs"><Plus size={16} /> Nowy Adres</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {USER_DATA.addresses.map((addr) => (
                <div key={addr.id} className="bg-white p-6 rounded-xl border border-brand-100 relative group hover:border-brand-300 hover:shadow-md transition-all flex flex-col justify-between min-h-[180px]">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-brand-50 text-brand-900 rounded-md">
                                <MapPin size={20} strokeWidth={1.5} />
                            </div>
                            {addr.isDefault && (
                                <span className="text-[10px] uppercase tracking-widest font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center gap-1">
                                    <Check size={10} /> Domyślny
                                </span>
                            )}
                        </div>
                        <h4 className="font-bold text-brand-900 mb-1">{addr.name}</h4>
                        <p className="text-sm text-brand-700 leading-relaxed">{addr.street}<br/>{addr.city}</p>
                    </div>
                    
                    <div className="flex gap-3 pt-4 border-t border-brand-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity mt-4 lg:translate-y-2 lg:group-hover:translate-y-0 duration-300">
                        <button className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand-900 hover:text-brand-600 transition-colors"><Edit2 size={12} /> Edytuj</button>
                        <div className="w-px h-3 bg-brand-200"></div>
                        <button className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-500 hover:text-red-700 transition-colors"><Trash2 size={12} /> Usuń</button>
                    </div>
                </div>
            ))}
            
            {/* Add New Placeholder */}
            <button className="border-2 border-dashed border-brand-200 rounded-xl p-6 flex flex-col items-center justify-center text-brand-400 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/50 transition-all min-h-[180px] group">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform text-brand-700 group-hover:bg-brand-200 group-hover:text-brand-900">
                    <Plus size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">Dodaj nowy adres</span>
            </button>
        </div>
    </div>
);

const PaymentsView = () => (
    <div className="animate-fade-in space-y-8">
        <div className="flex justify-between items-end border-b border-brand-100 pb-4">
            <div>
                <h2 className="text-4xl font-serif text-brand-900">Płatności</h2>
                <p className="text-brand-700 font-light mt-2">Twoje zapisane karty płatnicze.</p>
            </div>
            <Button variant="primary"><Plus size={16} /> Dodaj</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {USER_DATA.cards.map((card) => (
                <div key={card.id} className="bg-gradient-to-br from-brand-900 to-brand-800 p-6 rounded-xl text-white relative overflow-hidden shadow-lg group">
                    <div className="absolute top-0 right-0 p-8 opacity-10"><CreditCard size={120} /></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                            <span className="font-mono text-xs opacity-70">{card.type}</span>
                            {card.isDefault && <span className="text-[10px] uppercase tracking-widest font-bold border border-white/20 px-2 py-1 rounded">Domyślna</span>}
                        </div>
                        <p className="font-mono text-xl tracking-widest mb-2">•••• •••• •••• {card.last4}</p>
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="text-[10px] uppercase tracking-widest opacity-50 block">Wygasa</span>
                                <span className="font-mono text-sm">{card.expiry}</span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const SettingsView = () => (
    <div className="animate-fade-in space-y-8">
        <div className="border-b border-brand-100 pb-6">
            <h2 className="text-3xl font-serif text-brand-900">Ustawienia Konta</h2>
            <p className="text-brand-700 font-light mt-2 text-sm">Zarządzaj swoimi danymi i preferencjami.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                {/* Personal Data */}
                <div className="bg-white p-8 rounded-xl border border-brand-100 shadow-sm">
                    <h3 className="flex items-center gap-2 font-bold text-brand-900 uppercase tracking-widest text-xs border-b border-brand-50 pb-4 mb-6">
                        <User size={16} /> Dane Osobowe
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField label="Imię" type="text" defaultValue="Anna" icon={User} />
                        <InputField label="Nazwisko" type="text" defaultValue="Nowak" icon={User} />
                        <div className="md:col-span-2">
                             <InputField label="Email" type="email" defaultValue="kontakt@ilbuoncaffe.pl" icon={Mail} />
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                             <Button variant="primary">Zapisz Zmiany</Button>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="bg-white p-8 rounded-xl border border-brand-100 shadow-sm">
                    <h3 className="flex items-center gap-2 font-bold text-brand-900 uppercase tracking-widest text-xs border-b border-brand-50 pb-4 mb-6">
                        <Bell size={16} /> Powiadomienia
                    </h3>
                     <div className="space-y-4">
                        {['Newsletter (Nowości i Promocje)', 'Status zamówienia (SMS)', 'Przypomnienie o porzuconym koszyku', 'Nowe nagrody w klubie'].map((label, i) => (
                             <label key={i} className="flex items-center gap-4 cursor-pointer group p-3 rounded-lg hover:bg-brand-50 transition-colors">
                                <div className="relative flex items-center justify-center w-5 h-5 border border-brand-300 rounded bg-brand-900 border-brand-900 transition-colors">
                                    <Check size={12} className="text-white" />
                                </div>
                                <span className="text-sm text-brand-900 group-hover:font-medium transition-all">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                 {/* Security */}
                <div className="bg-white p-6 rounded-xl border border-brand-100 shadow-sm">
                    <h3 className="flex items-center gap-2 font-bold text-brand-900 uppercase tracking-widest text-xs border-b border-brand-50 pb-4 mb-6">
                        <Shield size={16} /> Bezpieczeństwo
                    </h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-brand-900 text-sm">Hasło</p>
                                <p className="text-[10px] text-brand-400">Ost. zmiana: 3 msc temu</p>
                            </div>
                            <Button variant="outline" className="h-8 text-[10px] px-3">Zmień</Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-brand-900 text-sm">2FA</p>
                                <p className="text-[10px] text-brand-400">Włączone</p>
                            </div>
                             <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-brand-900 cursor-pointer">
                                <span className="translate-x-4 inline-block h-3 w-3 transform rounded-full bg-white transition"/>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Export (GDPR) */}
                 <div className="bg-brand-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden group">
                     <div className="absolute right-0 top-0 p-6 opacity-10"><Lock size={80} /></div>
                     <h3 className="font-serif text-lg mb-2 relative z-10">Twoje Dane (RODO)</h3>
                     <p className="text-xs text-brand-100/70 mb-6 relative z-10 leading-relaxed">
                         Masz pełną kontrolę nad swoimi danymi. Możesz w każdej chwili pobrać historię swojej aktywności.
                     </p>
                     <Link href="/account/data-export" className="relative z-10">
                        <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white hover:text-brand-900">
                            Zarządzaj Danymi
                        </Button>
                     </Link>
                 </div>
            </div>
        </div>
    </div>
);

// --- MAIN COMPONENT ---

const AccountClient: React.FC = () => {
    // Local state for auth, since we don't have global auth yet
  const [isLoggedIn, setIsLoggedIn] = useState(false);
    const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [activeSection, setActiveSection] = useState<AccountSection>('dashboard');

  const { addToCart } = useCart();

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => setIsLoggedIn(false);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogoutClick = () => {
    handleLogout();
    setActiveSection('dashboard');
  };

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/auth?redirect=/account');
    }
  }, [isLoggedIn, router]);

  // --- Login / Register View ---
  if (!isLoggedIn) {
    return null;
  }

  // --- Authenticated View ---
  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-32 pb-20 font-sans">
      
      {/* Draggable Order Details Window */}

      
      <div className="container mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 border-b border-brand-900/10 pb-8 reveal-on-scroll">
          <div>
            <div className="flex items-center gap-2 mb-3">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               <span className="text-[10px] uppercase tracking-[0.2em] text-brand-700 font-bold">Strefa Klubowa</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-serif text-brand-900">Moje Konto</h1>
          </div>
          <Button variant="outline" onClick={handleLogoutClick} className="mt-6 md:mt-0"><LogOut size={14} /> Wyloguj się</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          {/* Navigation */}
          <div className="lg:col-span-3 space-y-8 reveal-on-scroll delay-100">
            <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden sticky top-28">
              <div className="p-6 border-b border-brand-50 bg-brand-50/30">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-brand-900 text-white flex items-center justify-center font-serif text-xl">{USER_DATA.name.charAt(0)}</div>
                      <div>
                          <p className="font-bold text-brand-900 text-sm">{USER_DATA.name}</p>
                          <p className="text-xs text-brand-400">{USER_DATA.tier}</p>
                      </div>
                  </div>
              </div>
              <nav className="flex flex-col py-2" aria-label="Nawigacja konta">
                {[
                  { id: 'dashboard', label: 'Pulpit', icon: Home },
                  { id: 'orders', label: 'Zamówienia', icon: Package },
                  { id: 'loyalty', label: 'Klub i Nagrody', icon: Gift },
                  { id: 'addresses', label: 'Adresy', icon: MapPin },
                  { id: 'payments', label: 'Płatności', icon: CreditCard },
                  { id: 'settings', label: 'Ustawienia', icon: Settings },
                ].map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    aria-current={activeSection === item.id ? 'page' : undefined}
                    className={`flex items-center gap-3 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all
                      ${activeSection === item.id 
                        ? 'bg-brand-900 text-white border-l-4 border-brand-400' 
                        : 'text-brand-700 hover:bg-brand-50 hover:text-brand-900'}
                    `}
                  >
                    <item.icon size={16} aria-hidden="true" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-9 reveal-on-scroll delay-200">
             {activeSection === 'dashboard' && <DashboardView onChangeView={setActiveSection} />}
             {activeSection === 'orders' && <OrdersView />}
             {activeSection === 'loyalty' && <LoyaltyView />}
             {activeSection === 'addresses' && <AddressesView />}
             {activeSection === 'payments' && <PaymentsView />}
             {activeSection === 'settings' && <SettingsView />}
          </div>
        </div>
      </div>
    </div>
  );
};
export default AccountClient;
