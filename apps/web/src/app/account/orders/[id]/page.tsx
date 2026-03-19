"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Package, Calendar, MapPin, CreditCard, 
  ShoppingBag, Check, Printer, Truck 
} from 'lucide-react';

const MOCK_ORDERS: Record<string, any> = {
  "ORD-2024-001": { 
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
  "ORD-2024-023": { 
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
  "default": {
      id: "ORD-XXXX-XXX", 
      date: "Brak danych", 
      total: "0.00 zł", 
      status: "Nieznany",
      paymentMethod: "-",
      address: "-",
      items: [],
      timeline: []
  }
};

export default function OrderDetailsPage() {
    const params = useParams();
    // Safely handle params.id whether it's string, string[], or undefined
    const id = Array.isArray(params?.id) ? params.id[0] : (params?.id || 'ORD-2024-001');
    
    const order = MOCK_ORDERS[id] || { ...MOCK_ORDERS["ORD-2024-001"], id: id }; // Fallback to mock data if ID not found, but keep ID

    return (
        <div className="min-h-screen bg-brand-50 pt-28 pb-12 font-sans">
            <div className="container mx-auto px-4 max-w-4xl">
                
                <Link href="/account" className="inline-flex items-center text-brand-600 hover:text-brand-900 text-sm font-medium mb-8 transition-colors group">
                     <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
                     Wróć do konta
                </Link>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                     <div>
                         <div className="flex items-center gap-3 mb-2">
                             <h1 className="text-3xl font-serif font-bold text-brand-900">Zamówienie {order.id}</h1>
                             <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${order.status === 'W realizacji' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                 {order.status}
                             </span>
                         </div>
                         <p className="text-brand-700 text-sm flex items-center gap-2">
                             <Calendar size={14} /> 
                             Data złożenia: {order.date}
                         </p>
                     </div>
                     <button 
                        onClick={() => window.print()}
                        className="text-brand-900 border border-brand-200 bg-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-brand-50 transition-colors flex items-center gap-2"
                     >
                        <Printer size={14} />
                        Drukuj
                     </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     {/* Main Content */}
                     <div className="lg:col-span-2 space-y-8">
                         
                         {/* Products */}
                         <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden">
                             <div className="p-6 border-b border-brand-50 flex items-center gap-2 bg-brand-50/30">
                                 <Package size={18} className="text-brand-400" />
                                 <span className="text-xs font-bold uppercase tracking-widest text-brand-900">Produkty</span>
                             </div>
                             <div className="p-6 space-y-6">
                                 {order.items.map((item: any, idx: number) => (
                                     <div key={idx} className="flex gap-4">
                                         <div className="w-16 h-16 bg-brand-50 rounded border border-brand-100 p-1 shrink-0">
                                             <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-sm" />
                                         </div>
                                         <div className="flex-1 min-w-0">
                                             <h4 className="font-bold text-brand-900 text-sm">{item.name}</h4>
                                             <div className="flex items-center gap-4 mt-2">
                                                 <span className="text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded">x{item.qty}</span>
                                                 <span className="text-xs text-brand-400">|</span>
                                                 <span className="text-xs font-mono font-bold text-brand-900">{item.price}</span>
                                             </div>
                                         </div>
                                         <div className="text-right">
                                             <span className="font-bold text-brand-900 text-sm">
                                                {(parseFloat(item.price.replace(',', '.').replace(' zł', '')) * item.qty).toFixed(2)} zł
                                             </span>
                                         </div>
                                     </div>
                                 ))}
                                 
                                 <div className="pt-6 mt-6 border-t border-brand-50 space-y-2">
                                     <div className="flex justify-between text-sm">
                                         <span className="text-brand-700">Wartość produktów</span>
                                         <span className="font-bold text-brand-900">{order.total}</span>
                                     </div>
                                     <div className="flex justify-between text-sm">
                                         <span className="text-brand-700">Dostawa</span>
                                         <span className="font-bold text-brand-900">0.00 zł</span>
                                     </div>
                                     <div className="flex justify-between text-lg pt-4 border-t border-brand-100 mt-4">
                                         <span className="font-serif font-bold text-brand-900">Suma</span>
                                         <span className="font-serif font-bold text-brand-900">{order.total}</span>
                                     </div>
                                 </div>
                             </div>
                         </div>
                         
                         {/* Timeline */}
                         <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden">
                             <div className="p-6 border-b border-brand-50 flex items-center gap-2 bg-brand-50/30">
                                 <Truck size={18} className="text-brand-400" />
                                 <span className="text-xs font-bold uppercase tracking-widest text-brand-900">Status przesyłki</span>
                             </div>
                             <div className="p-6">
                                 <div className="relative pl-4 border-l-2 border-brand-100 space-y-8 ml-2">
                                    {order.timeline.map((event: any, i: number) => (
                                        <div key={i} className="relative">
                                            <div className={`absolute -left-[23px] top-1 w-4 h-4 rounded-full border-4 bg-white ${event.completed ? 'border-brand-900' : 'border-brand-200'}`}></div>
                                            <p className={`text-sm ${event.completed ? 'text-brand-900 font-bold' : 'text-brand-300'}`}>{event.status}</p>
                                            <p className="text-xs font-mono text-brand-400 mt-1">{event.date}</p>
                                        </div>
                                    ))}
                                </div>
                             </div>
                         </div>

                     </div>

                     {/* Sidebar Info */}
                     <div className="space-y-8">
                         
                         <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden">
                             <div className="p-6 border-b border-brand-50 flex items-center gap-2 bg-brand-50/30">
                                 <MapPin size={18} className="text-brand-400" />
                                 <span className="text-xs font-bold uppercase tracking-widest text-brand-900">Adres dostawy</span>
                             </div>
                             <div className="p-6">
                                 <p className="font-bold text-brand-900 text-sm mb-1">Anna Nowak</p>
                                 <p className="text-sm text-brand-600 leading-relaxed mb-4">{order.address}</p>
                                 <div className="text-[10px] uppercase tracking-widest text-brand-400 font-bold mb-1">Telefon</div>
                                 <p className="text-sm text-brand-900 font-mono">+48 500 600 700</p>
                             </div>
                         </div>

                         <div className="bg-white rounded-xl shadow-sm border border-brand-100 overflow-hidden">
                             <div className="p-6 border-b border-brand-50 flex items-center gap-2 bg-brand-50/30">
                                 <CreditCard size={18} className="text-brand-400" />
                                 <span className="text-xs font-bold uppercase tracking-widest text-brand-900">Płatność</span>
                             </div>
                             <div className="p-6">
                                 <div className="flex items-center gap-3">
                                     <div className="w-10 h-6 bg-brand-100 rounded border border-brand-200 flex items-center justify-center">
                                         <div className="w-6 h-3 bg-brand-400 rounded-sm opacity-50"></div>
                                     </div>
                                     <div>
                                         <p className="font-bold text-brand-900 text-sm">{order.paymentMethod}</p>
                                         <p className="text-xs text-green-600 font-bold mt-0.5">Opłacone</p>
                                     </div>
                                 </div>
                             </div>
                         </div>

                         <div className="bg-brand-50 rounded-xl border border-brand-100 p-6 space-y-4">
                             <p className="text-xs text-brand-700 leading-relaxed">
                                 Potrzebujesz pomocy z tym zamówieniem? Skontaktuj się z naszą obsługą klienta.
                             </p>
                             <button className="w-full border border-brand-300 bg-white text-brand-900 py-3 rounded-lg text-xs font-bold uppercase tracking-widest hover:border-brand-900 transition-colors">
                                 Zgłoś problem
                             </button>
                         </div>

                     </div>
                </div>

            </div>
        </div>
    );
}
