'use client'

import { useState } from 'react'
import { Globe } from 'lucide-react'

export const CmsView = () => {
  const [activeTab, setActiveTab] = useState('hero')

  return (
    <div className="animate-in fade-in duration-300 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-h2 text-[#1A1A1A]">Zmiana CMS</h2>
          <p className="text-sm text-[#737373] mt-1">Zarządzaj wyglądem i treścią swojej strony internetowej w czasie rzeczywistym.</p>
        </div>
        <button className="btn-accent">
          Opublikuj zmiany
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left Panel: Editor */}
        <div className="lg:col-span-4 flex flex-col bg-white border border-[#E5E4E1] rounded-2xl overflow-hidden">
          <div className="flex border-b border-[#E5E4E1] bg-[#FAF9F7]">
            <button
              onClick={() => setActiveTab('hero')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all duration-300 hover:bg-gray-50/50 ${activeTab === 'hero' ? 'border-[#0066CC] text-[#0066CC]' : 'border-transparent text-[#525252] hover:text-[#1A1A1A]'}`}
            >
              Sekcja Główna
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all duration-300 hover:bg-gray-50/50 ${activeTab === 'products' ? 'border-[#0066CC] text-[#0066CC]' : 'border-transparent text-[#525252] hover:text-[#1A1A1A]'}`}
            >
              Produkty
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {activeTab === 'hero' && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Nagłówek główny (H1)</label>
                  <input type="text" defaultValue="Odkryj nową kolekcję" className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Tekst pomocniczy</label>
                  <textarea rows={3} defaultValue="Najwyższa jakość i nowoczesny design. Sprawdź nasze nowości i wybierz coś dla siebie." className="admin-textarea"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Tekst przycisku (CTA)</label>
                  <input type="text" defaultValue="Kup teraz" className="admin-input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Kolor motywu</label>
                  <div className="flex gap-2">
                    <button className="w-8 h-8 rounded-full bg-[#1A1A1A] ring-2 ring-offset-2 ring-[#1A1A1A] transition-all duration-300 hover:scale-110 active:scale-95"></button>
                    <button className="w-8 h-8 rounded-full bg-[#0066CC] transition-all duration-300 hover:scale-110 active:scale-95"></button>
                    <button className="w-8 h-8 rounded-full bg-[#059669] transition-all duration-300 hover:scale-110 active:scale-95"></button>
                    <button className="w-8 h-8 rounded-full bg-[#D97706] transition-all duration-300 hover:scale-110 active:scale-95"></button>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'products' && (
              <div className="space-y-4 animate-in fade-in">
                <p className="text-sm text-[#737373]">Wybierz produkty do sekcji polecanych na stronie głównej.</p>
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-[#E5E4E1] bg-[#FAF9F7]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#E5E4E1] rounded-lg"></div>
                        <span className="text-sm font-medium">Produkt polecany #{i}</span>
                      </div>
                      <button className="text-[#0066CC] text-sm font-medium transition-all duration-300 hover:scale-105 active:scale-95">Zmień</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Live Preview */}
        <div className="lg:col-span-8 bg-[#F5F4F1] border border-[#E5E4E1] rounded-2xl overflow-hidden flex flex-col relative">
          <div className="bg-white border-b border-[#E5E4E1] px-4 py-2 flex items-center justify-center gap-2">
            <div className="flex gap-1.5 absolute left-4">
              <div className="w-3 h-3 rounded-full bg-[#EF4444]"></div>
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]"></div>
              <div className="w-3 h-3 rounded-full bg-[#10B981]"></div>
            </div>
            <div className="bg-[#F5F4F1] px-4 py-1 rounded-md text-xs text-[#737373] font-mono flex items-center gap-2">
              <Globe size={12} />mojsklep.pl
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white">
            <div className="min-h-full">
              <header className="px-8 py-4 border-b border-gray-100 flex justify-between items-center">
                <div className="font-serif font-bold text-xl">Mój Sklep</div>
                <div className="flex gap-6 text-sm font-medium text-gray-600">
                  <span>Nowości</span>
                  <span>Katalog</span>
                  <span>O nas</span>
                </div>
              </header>
              <div className="px-8 py-20 flex flex-col items-center text-center max-w-2xl mx-auto">
                <span className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-4">Nowa kolekcja 2026</span>
                <h1 className="text-5xl font-serif font-bold text-gray-900 mb-6 leading-tight">Odkryj nową kolekcję</h1>
                <p className="text-lg text-gray-500 mb-8">Najwyższa jakość i nowoczesny design. Sprawdź nasze nowości i wybierz coś dla siebie.</p>
                <button className="px-8 py-4 bg-gray-900 text-white rounded-full font-medium transition-all duration-300 hover:bg-gray-800 hover:scale-105 hover:-translate-y-1 hover:shadow-lg active:scale-95 active:translate-y-0 active:shadow-none">
                  Kup teraz
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
