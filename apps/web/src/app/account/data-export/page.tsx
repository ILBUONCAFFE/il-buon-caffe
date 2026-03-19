"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, FileJson, FileText, Lock, ShieldCheck, Database, Trash2, AlertTriangle, Check } from 'lucide-react';

export default function DataExportPage() {
    const [isExporting, setIsExporting] = useState(false);
    const [downloadReady, setDownloadReady] = useState<string | null>(null);

    const handleExport = (format: 'json' | 'xml') => {
        setIsExporting(true);
        // Simulate processing time
        setTimeout(() => {
            setIsExporting(false);
            setDownloadReady(format);
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-brand-50 pt-28 pb-12 font-sans">
            <div className="container mx-auto px-4 max-w-3xl">
                
                <Link href="/account" className="inline-flex items-center text-brand-600 hover:text-brand-900 text-sm font-medium mb-8 transition-colors group">
                     <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
                     Wróć do konta
                </Link>

                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                         <div className="p-3 bg-brand-900 text-white rounded-xl">
                             <Database size={24} />
                         </div>
                         <h1 className="text-3xl md:text-4xl font-serif text-brand-900">Eksport Danych Osobowych</h1>
                    </div>
                    <p className="text-brand-700 text-lg leading-relaxed">
                        Zgodnie z artykułem 20 RODO (Prawo do przenoszenia danych), masz prawo otrzymać swoje dane osobowe w ustrukturyzowanym, powszechnie używanym formacie nadającym się do odczytu maszynowego.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                     <div className="bg-white p-8 rounded-2xl border border-brand-100 shadow-sm hover:shadow-md transition-shadow">
                         <h3 className="text-xl font-serif text-brand-900 mb-4 flex items-center gap-2">
                             <FileJson className="text-brand-400" /> Format JSON
                         </h3>
                         <p className="text-sm text-brand-700 mb-8 leading-relaxed">
                             Pobierz wszystkie swoje dane (historię zamówień, adresy, dane o koncie) w formacie JSON. Jest to najlepszy format dla programistów i importu do innych systemów.
                         </p>
                         <button 
                            onClick={() => handleExport('json')}
                            disabled={isExporting || downloadReady === 'json'}
                            className={`w-full py-4 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all
                                ${downloadReady === 'json' ? 'bg-green-600 text-white' : 'bg-brand-900 text-white hover:bg-brand-800'}
                                ${isExporting ? 'opacity-70 cursor-wait' : ''}
                            `}
                         >
                             {isExporting ? 'Przygotowywanie...' : downloadReady === 'json' ? <><Check size={16} /> Gotowe do pobrania</> : <><Download size={16} /> Pobierz JSON</>}
                         </button>
                     </div>

                     <div className="bg-white p-8 rounded-2xl border border-brand-100 shadow-sm hover:shadow-md transition-shadow">
                         <h3 className="text-xl font-serif text-brand-900 mb-4 flex items-center gap-2">
                             <FileText className="text-brand-400" /> Format XML
                         </h3>
                         <p className="text-sm text-brand-700 mb-8 leading-relaxed">
                             Pobierz swoje dane w formacie XML. Ten format jest często używany przez systemy księgowe i starsze aplikacje do przetwarzania danych.
                         </p>
                         <button 
                            onClick={() => handleExport('xml')}
                            disabled={isExporting}
                            className="w-full py-4 rounded-lg font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 bg-white border border-brand-200 text-brand-900 hover:bg-brand-50 transition-colors"
                         >
                             <Download size={16} /> Pobierz XML
                         </button>
                     </div>
                </div>

                <div className="bg-brand-50 rounded-2xl border border-brand-200 p-8 space-y-6">
                    <h3 className="text-xl font-serif text-brand-900 flex items-center gap-2">
                        <ShieldCheck className="text-green-600" /> Bezpieczeństwo Twoich Danych
                    </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="flex gap-4">
                             <Lock size={20} className="text-brand-300 shrink-0 mt-1" />
                             <div>
                                 <h4 className="font-bold text-brand-900 text-sm mb-1">Szyfrowanie</h4>
                                 <p className="text-xs text-brand-700">Wszystkie wyeksportowane archiwa są szyfrowane w transporcie. Upewnij się, że pobierasz je na bezpieczne urządzenie.</p>
                             </div>
                         </div>
                         <div className="flex gap-4">
                             <AlertTriangle size={20} className="text-brand-300 shrink-0 mt-1" />
                             <div>
                                 <h4 className="font-bold text-brand-900 text-sm mb-1">Wrażliwe informacje</h4>
                                 <p className="text-xs text-brand-700">Plik zawiera historię adresów i płatności. Nie udostępniaj go osobom trzecim.</p>
                             </div>
                         </div>
                     </div>
                </div>

                <div className="mt-12 pt-12 border-t border-brand-200">
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-red-100 bg-red-50/50">
                        <Trash2 className="text-red-500 shrink-0 mt-1" />
                        <div>
                             <h3 className="font-bold text-red-700 text-sm mb-2">Usunięcie konta (Prawo do bycia zapomnianym)</h3>
                             <p className="text-xs text-red-600/80 mb-4 leading-relaxed">
                                 Jeśli chcesz trwale usunąć swoje konto i wszystkie powiązane dane z naszego systemu, możesz skorzystać z prawa do bycia zapomnianym (Art. 17 RODO).
                             </p>
                             <button className="text-xs font-bold text-red-600 border-b border-red-200 hover:border-red-600 transition-colors">
                                 Rozpocznij procedurę usuwania konta
                             </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
