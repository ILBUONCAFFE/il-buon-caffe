'use client'

import { useState } from 'react'
import { Plus, Filter, Percent, Tag, X, PlusCircle, Zap } from 'lucide-react'
import { Dropdown } from '../../components/ui/Dropdown'

export const PromotionsView = () => {
  const [cond1Target, setCond1Target] = useState('basket')
  const [cond1Op, setCond1Op] = useState('greater')
  const [cond2Target, setCond2Target] = useState('tag')
  const [cond2Op, setCond2Op] = useState('contains')
  const [actionType, setActionType] = useState('free_shipping')
  const [actionTarget, setActionTarget] = useState('entire_order')
  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-h2 text-[#1A1A1A]">Kreator Promocji</h2>
          <p className="text-sm text-[#737373] mt-1">Twórz zaawansowane reguły rabatowe w prosty sposób.</p>
        </div>
        <button className="btn-accent">
          <Plus size={16} />Nowa reguła
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Promotions List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E4E1] p-4 shadow-sm relative overflow-hidden group cursor-pointer hover:border-[#0066CC] transition-colors">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#059669]"></div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] flex items-center justify-center text-[#059669]"><Percent size={16} /></div>
                <h3 className="font-semibold text-[#1A1A1A]">Darmowa dostawa VIP</h3>
              </div>
              <span className="badge-success">Aktywna</span>
            </div>
            <p className="text-sm text-[#737373] mb-3">Dla zamówień pow. 200 PLN i klientów VIP.</p>
            <div className="text-xs text-[#A3A3A3]">Utworzono: 12.05.2026</div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E4E1] p-4 shadow-sm opacity-60 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#A3A3A3]"></div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#F5F4F1] flex items-center justify-center text-[#525252]"><Tag size={16} /></div>
                <h3 className="font-semibold text-[#1A1A1A]">Black Friday -20%</h3>
              </div>
              <span className="badge-neutral">Nieaktywna</span>
            </div>
            <p className="text-sm text-[#737373] mb-3">Rabat na całą kategorię &quot;Kawa&quot;.</p>
            <div className="text-xs text-[#A3A3A3]">Wygasła: 30.11.2025</div>
          </div>
        </div>

        {/* Visual Builder */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E4E1] shadow-sm flex flex-col">
          <div className="p-5 border-b border-[#E5E4E1]">
            <input
              type="text"
              defaultValue="Darmowa dostawa VIP"
              className="text-xl font-semibold text-[#1A1A1A] bg-transparent border-none outline-none w-full placeholder:text-[#A3A3A3]"
              placeholder="Nazwa promocji..."
            />
          </div>

          <div className="p-6 flex-1 bg-[#FAF9F7] space-y-8">
            {/* Condition Block */}
            <div className="relative">
              <div className="absolute left-6 top-10 bottom-[-40px] w-0.5 bg-[#E5E4E1] z-0"></div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E4E1] flex items-center justify-center shadow-sm shrink-0">
                  <Filter size={20} className="text-[#0066CC]" />
                </div>
                <div className="flex-1 bg-white rounded-xl border border-[#E5E4E1] p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wider">Warunki (JEŚLI)</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Dropdown
                        label="Wybierz"
                        value={cond1Target}
                        onChange={setCond1Target}
                        options={[
                          { value: 'basket', label: 'Wartość koszyka' },
                          { value: 'category', label: 'Kategoria produktu' },
                          { value: 'tag', label: 'Tag klienta' },
                        ]}
                      />
                      <Dropdown
                        label="Warunek"
                        value={cond1Op}
                        onChange={setCond1Op}
                        options={[
                          { value: 'greater', label: 'jest większa niż' },
                          { value: 'lesser', label: 'jest mniejsza niż' },
                          { value: 'equal', label: 'równa się' },
                        ]}
                      />
                      <div className="relative">
                        <input type="text" defaultValue="200" className="admin-input w-24 !pr-10" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#737373]">PLN</span>
                      </div>
                      <button className="p-2 text-[#A3A3A3] hover:text-[#DC2626] transition-all duration-300 hover:scale-110 active:scale-95"><X size={16} /></button>
                    </div>
                    <div className="flex items-center gap-3 pl-2">
                      <span className="text-xs font-bold text-[#0066CC] uppercase bg-[#EFF6FF] px-2 py-1 rounded">ORAZ</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dropdown
                        label="Wybierz"
                        value={cond2Target}
                        onChange={setCond2Target}
                        options={[
                          { value: 'tag', label: 'Tag klienta' },
                          { value: 'basket', label: 'Wartość koszyka' },
                          { value: 'category', label: 'Kategoria produktu' },
                        ]}
                      />
                      <Dropdown
                        label="Warunek"
                        value={cond2Op}
                        onChange={setCond2Op}
                        options={[
                          { value: 'contains', label: 'zawiera' },
                          { value: 'not_contains', label: 'nie zawiera' },
                        ]}
                      />
                      <input type="text" defaultValue="VIP" className="admin-input w-32" />
                      <button className="p-2 text-[#A3A3A3] hover:text-[#DC2626] transition-all duration-300 hover:scale-110 active:scale-95"><X size={16} /></button>
                    </div>
                    <button className="mt-2 flex items-center gap-2 text-sm font-medium text-[#0066CC] transition-all duration-300 hover:scale-[1.02] active:scale-95">
                      <PlusCircle size={16} /> Dodaj warunek
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Block */}
            <div className="relative">
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white border border-[#E5E4E1] flex items-center justify-center shadow-sm shrink-0">
                  <Zap size={20} className="text-[#D97706]" />
                </div>
                <div className="flex-1 bg-white rounded-xl border border-[#E5E4E1] p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3 uppercase tracking-wider">Akcja (TO)</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Dropdown
                        label="Akcja"
                        value={actionType}
                        onChange={setActionType}
                        options={[
                          { value: 'free_shipping', label: 'Darmowa dostawa' },
                          { value: 'percent_discount', label: 'Rabat procentowy' },
                          { value: 'amount_discount', label: 'Rabat kwotowy' },
                          { value: 'free_product', label: 'Darmowy produkt' },
                        ]}
                      />
                      <span className="text-sm text-[#737373]">na</span>
                      <Dropdown
                        label="Cel"
                        value={actionTarget}
                        onChange={setActionTarget}
                        options={[
                          { value: 'entire_order', label: 'Całe zamówienie' },
                          { value: 'cheapest_product', label: 'Najtańszy produkt' },
                          { value: 'selected_category', label: 'Wybraną kategorię' },
                        ]}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-[#E5E4E1] bg-white rounded-b-2xl flex justify-end gap-3">
            <button className="btn-secondary">Anuluj</button>
            <button className="btn-primary">Zapisz i aktywuj</button>
          </div>
        </div>
      </div>
    </div>
  )
}
