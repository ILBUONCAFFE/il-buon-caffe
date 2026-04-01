'use client'

import { useState } from 'react'
import {
  Search, UserPlus, Mail, Phone, Edit, MessageSquare,
  Activity, ShoppingCart, User, Tag, Star, Award, Plus, Calendar
} from 'lucide-react'

type Customer = {
  id: string
  name: string
  email: string
  phone: string
  ltv: number
  orders: number
  status: string
  lastOrder: string
}

const customers: Customer[] = [
  { id: 'CUST-001', name: 'Jan Kowalski', email: 'jan.kowalski@example.com', phone: '+48 123 456 789', ltv: 4500, orders: 12, status: 'VIP', lastOrder: '2 dni temu' },
  { id: 'CUST-002', name: 'Anna Nowak', email: 'anna.n@example.com', phone: '+48 987 654 321', ltv: 1200, orders: 3, status: 'Lojalny', lastOrder: '1 tydzień temu' },
  { id: 'CUST-003', name: 'Piotr Wiśniewski', email: 'piotr.w@example.com', phone: '+48 555 666 777', ltv: 150, orders: 1, status: 'Nowy', lastOrder: '1 miesiąc temu' }
]

export const CustomersView = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-h2 text-[#1A1A1A]">Klienci (Profil 360°)</h2>
          <p className="text-sm text-[#737373] mt-1">Zarządzaj bazą klientów i analizuj ich historię zakupową.</p>
        </div>
        <button className="btn-accent">
          <UserPlus size={16} />Dodaj klienta
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-[#E5E4E1] shadow-sm overflow-hidden flex flex-col h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-[#E5E4E1]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
              <input
                type="text"
                placeholder="Szukaj klienta..."
                className="admin-input w-full pl-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {customers.map(customer => (
              <div
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className={`p-4 border-b border-[#E5E4E1] cursor-pointer transition-colors hover:bg-[#F5F4F1] ${selectedCustomer?.id === customer.id ? 'bg-[#EFF6FF] border-l-4 border-l-[#0066CC]' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-[#1A1A1A]">{customer.name}</h3>
                  {customer.status === 'VIP' && <span className="bg-[#FEF3C7] text-[#D97706] text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">VIP</span>}
                  {customer.status === 'Lojalny' && <span className="bg-[#ECFDF5] text-[#059669] text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Lojalny</span>}
                  {customer.status === 'Nowy' && <span className="bg-[#F0F9FF] text-[#0284C7] text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Nowy</span>}
                </div>
                <p className="text-sm text-[#737373] mb-2">{customer.email}</p>
                <div className="flex justify-between items-center text-xs text-[#A3A3A3]">
                  <span>{customer.orders} zamówień</span>
                  <span>Ostatnio: {customer.lastOrder}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer 360 Profile */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E4E1] shadow-sm flex flex-col h-[calc(100vh-200px)] overflow-hidden">
          {selectedCustomer ? (
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 border-b border-[#E5E4E1] bg-[#FAF9F7] flex items-start gap-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0066CC] to-[#0088FF] flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                  {selectedCustomer.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">{selectedCustomer.name}</h2>
                      <div className="flex items-center gap-4 text-sm text-[#525252]">
                        <span className="flex items-center gap-1"><Mail size={14} className="text-[#A3A3A3]" /> {selectedCustomer.email}</span>
                        <span className="flex items-center gap-1"><Phone size={14} className="text-[#A3A3A3]" /> {selectedCustomer.phone}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-icon" title="Wyślij wiadomość"><MessageSquare size={16} /></button>
                      <button className="btn-icon" title="Edytuj profil"><Edit size={16} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="bg-white p-3 rounded-xl border border-[#E5E4E1] shadow-sm">
                      <p className="text-xs text-[#737373] uppercase tracking-wider font-semibold mb-1">Wartość życiowa (LTV)</p>
                      <p className="text-xl font-mono font-bold text-[#1A1A1A]">{selectedCustomer.ltv.toLocaleString()} PLN</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E5E4E1] shadow-sm">
                      <p className="text-xs text-[#737373] uppercase tracking-wider font-semibold mb-1">Zamówienia</p>
                      <p className="text-xl font-mono font-bold text-[#1A1A1A]">{selectedCustomer.orders}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-[#E5E4E1] shadow-sm">
                      <p className="text-xs text-[#737373] uppercase tracking-wider font-semibold mb-1">Średnia wartość (AOV)</p>
                      <p className="text-xl font-mono font-bold text-[#1A1A1A]">{(selectedCustomer.ltv / selectedCustomer.orders).toFixed(0)} PLN</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Timeline */}
                <div>
                  <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-[#0066CC]" /> Historia interakcji
                  </h3>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#E5E4E1] before:to-transparent">
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-[#EFF6FF] text-[#0066CC] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <ShoppingCart size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-[#E5E4E1] bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[#1A1A1A] text-sm">Nowe zamówienie</span>
                          <span className="text-xs text-[#A3A3A3]">2 dni temu</span>
                        </div>
                        <p className="text-sm text-[#737373]">Zamówienie #ORD-2026-089 na kwotę 450 PLN.</p>
                      </div>
                    </div>
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-[#FFFBEB] text-[#D97706] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <MessageSquare size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-[#E5E4E1] bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[#1A1A1A] text-sm">Kontakt z supportem</span>
                          <span className="text-xs text-[#A3A3A3]">1 tydzień temu</span>
                        </div>
                        <p className="text-sm text-[#737373]">Pytanie o dostępność produktu. Rozwiązane.</p>
                      </div>
                    </div>
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-[#F0F9FF] text-[#0284C7] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <User size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-[#E5E4E1] bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[#1A1A1A] text-sm">Utworzenie konta</span>
                          <span className="text-xs text-[#A3A3A3]">1 rok temu</span>
                        </div>
                        <p className="text-sm text-[#737373]">Rejestracja z kampanii &quot;Black Friday&quot;.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Segmentation & Tags */}
                <div>
                  <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
                    <Tag size={18} className="text-[#0066CC]" /> Segmentacja i Tagi
                  </h3>
                  <div className="bg-[#FAF9F7] p-4 rounded-xl border border-[#E5E4E1] mb-6">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-white border border-[#E5E4E1] rounded-full text-sm text-[#525252] flex items-center gap-1"><Star size={12} className="text-[#D97706]"/> VIP</span>
                      <span className="px-3 py-1 bg-white border border-[#E5E4E1] rounded-full text-sm text-[#525252] flex items-center gap-1"><Award size={12} className="text-[#059669]"/> Lojalny</span>
                      <span className="px-3 py-1 bg-white border border-[#E5E4E1] rounded-full text-sm text-[#525252]">Kawa ziarnista</span>
                      <span className="px-3 py-1 bg-white border border-[#E5E4E1] rounded-full text-sm text-[#525252]">Akcesoria</span>
                      <button className="px-3 py-1 bg-white border border-dashed border-[#A3A3A3] rounded-full text-sm text-[#0066CC] hover:bg-[#F5F4F1] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1">
                        <Plus size={12} /> Dodaj tag
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-[#0066CC]" /> Przewidywania AI
                  </h3>
                  <div className="bg-white p-4 rounded-xl border border-[#E5E4E1] shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#525252]">Prawdopodobieństwo zakupu w tym tyg.</span>
                      <span className="font-semibold text-[#059669]">Wysokie (85%)</span>
                    </div>
                    <div className="w-full bg-[#F5F4F1] rounded-full h-2">
                      <div className="bg-[#059669] h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    <p className="text-xs text-[#737373] mt-2">Klient zazwyczaj kupuje co 3-4 tygodnie. Zbliża się termin kolejnego zamówienia.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-[#F5F4F1] rounded-full flex items-center justify-center mb-4">
                <User size={32} className="text-[#A3A3A3]" />
              </div>
              <h3 className="text-xl font-semibold text-[#1A1A1A] mb-2">Wybierz klienta</h3>
              <p className="text-[#737373] max-w-md">Wybierz klienta z listy po lewej stronie, aby zobaczyć jego pełny profil 360°, historię zamówień i statystyki.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
