"use client";

/**
 * Product Page - Individual Product View
 * Clean, premium design with category-aware elements
 */

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Minus, Plus, Heart, Share2, Truck, Shield, RotateCcw, Check, ChevronRight } from 'lucide-react';
import { Product } from '@/types';
import { getProductBySku, getProductBySlug } from '@/actions/products';

import { WineProductView } from './WineProductView';

// ... (previous imports)

// Category display names
const CATEGORY_NAMES: Record<string, string> = {
  coffee: 'Kawa',
  alcohol: 'Wina',
  wino: 'Wina', // Add support for 'wino' key
  sweets: 'Słodycze',
  pantry: 'Delikatesy',
};

export interface ProductClientProps {
  initialProduct?: Product | null;
}

export const ProductClient = ({ initialProduct }: ProductClientProps) => {
  const params = useParams();
  const slug = params.slug as string;
  // const category = params.category as string; // We use product.category instead for reliability
  const router = useRouter();
  
  const [product, setProduct] = useState<Product | null>(initialProduct ?? null);
  const [isLoading, setIsLoading] = useState(!initialProduct);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  
  useEffect(() => {
    // Skip fetch if product was provided by the server
    if (initialProduct !== undefined) return;

    const loadProduct = async () => {
      setIsLoading(true);
      try {
        const data = await getProductBySlug(slug);
        setProduct(data || null);
      } catch (error) {
        console.error('Failed to load product', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (slug) loadProduct();
  }, [slug, initialProduct]);

  const handleAddToCart = () => {
    if (!product) return;
    // TODO: Add to cart context
    console.log('Adding to cart', product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-beige flex items-center justify-center">
        <div role="status" aria-label="\u0141adowanie produktu" className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-900" />
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="min-h-screen bg-brand-beige flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="text-6xl">😕</div>
        <h1 className="text-2xl font-serif text-brand-900">Produkt nie znaleziony</h1>
        <p className="text-brand-700">Nie udało się znaleźć tego produktu.</p>
        <button 
          onClick={() => router.push('/sklep')}
          className="px-6 py-3 bg-brand-900 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-brand-700 transition-colors"
        >
          Wróć do sklepu
        </button>
      </div>
    );
  }

  // Check if product is wine
  const isWine = product.category === 'wino' || product.category === 'alcohol' || product.sku.startsWith('WIN');

  const categoryName = product.category ? (CATEGORY_NAMES[product.category] || product.category) : '';

  if (isWine) {
    return <WineProductView product={product} categoryName={categoryName} />;
  }
  
  return (
    <div className="min-h-screen bg-brand-beige pt-24 pb-20">
      <div className="container mx-auto px-6 md:px-12">
        
        {/* Breadcrumbs */}
        <nav aria-label="Nawigacja okruszkowa" className="text-sm text-brand-600 mb-8">
          <ol className="flex items-center gap-2 list-none">
            <li><Link href="/sklep" className="hover:text-brand-900 transition-colors">Sklep</Link></li>
            <li aria-hidden="true"><ChevronRight size={14} /></li>
            <li><Link href={`/sklep/${product.category || 'all'}`} className="hover:text-brand-900 transition-colors">{categoryName}</Link></li>
            <li aria-hidden="true"><ChevronRight size={14} /></li>
            <li aria-current="page" className="text-brand-900 font-medium truncate max-w-[200px]">{product.name}</li>
          </ol>
        </nav>
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          
          {/* ====== LEFT: Image ====== */}
          <div className="relative">
            <div className="sticky top-28">
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-white shadow-sm">
                <Image
                  src={product.image ?? '/assets/placeholder.webp'}
                  alt={product.name}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              </div>
              
              {product.isNew && (
                <span className="absolute top-6 left-6 px-4 py-2 bg-brand-900 text-white text-xs font-bold uppercase tracking-widest rounded-full">
                  Nowość
                </span>
              )}
            </div>
          </div>
          
          {/* ====== RIGHT: Details ====== */}
          <div className="flex flex-col">
            
            <Link 
              href={`/sklep/${product.category}`}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-700 hover:text-brand-900 transition-colors mb-4 self-start"
            >
              {categoryName}
            </Link>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif text-brand-900 mb-4 leading-tight">
              {product.name}
            </h1>
            
            {product.origin && (
              <p className="text-lg text-brand-700 mb-6">
                {product.origin}
              </p>
            )}
            
            <div className="text-3xl font-bold text-brand-900 mb-8">
              {product.price.toFixed(2)} <span className="text-lg font-normal text-brand-600">zł</span>
            </div>
            
            <p className="text-brand-600 leading-relaxed mb-10 text-lg">
              {product.description || 'Wysokiej jakości produkt z naszej ekskluzywnej kolekcji.'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              
              <div className="flex items-center bg-white rounded-xl border border-brand-200 h-14 w-36">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Zmniejsz ilo\u015b\u0107"
                  className="w-12 h-full flex items-center justify-center text-brand-700 hover:text-brand-900 transition-colors"
                >
                  <Minus size={18} aria-hidden="true" />
                </button>
                <span aria-live="polite" aria-atomic="true" className="flex-1 text-center font-bold text-lg text-brand-900">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Zwi\u0119ksz ilo\u015b\u0107"
                  className="w-12 h-full flex items-center justify-center text-brand-700 hover:text-brand-900 transition-colors"
                >
                  <Plus size={18} aria-hidden="true" />
                </button>
              </div>
              
              <button
                onClick={handleAddToCart}
                disabled={isAdded}
                className={`
                  flex-1 h-14 rounded-xl font-bold uppercase tracking-[0.1em] text-sm transition-all duration-300
                  flex items-center justify-center gap-3
                  ${isAdded 
                    ? 'bg-green-600 text-white' 
                    : 'bg-brand-900 text-white hover:bg-brand-700 hover:shadow-lg'
                  }
                `}
              >
                {isAdded ? (
                  <>
                    <Check size={18} />
                    Dodano!
                  </>
                ) : (
                  <>
                    Dodaj do koszyka
                  </>
                )}
              </button>
            </div>
            
            <div className="flex gap-4 mb-10">
              <button aria-label="Dodaj do ulubionych" className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-900 transition-colors">
                <Heart size={18} aria-hidden="true" />
                Ulubione
              </button>
              <button aria-label="Udost\u0119pnij produkt" className="flex items-center gap-2 text-sm text-brand-700 hover:text-brand-900 transition-colors">
                <Share2 size={18} aria-hidden="true" />
                Udostępnij
              </button>
            </div>
            
            <div className="border-t border-brand-200 pt-8 space-y-4">
              <div className="flex items-center gap-4 text-brand-600">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                  <Truck size={18} className="text-brand-900" />
                </div>
                <div>
                  <p className="font-medium text-brand-900">Darmowa dostawa od 150 zł</p>
                  <p className="text-sm text-brand-600">Wysyłka w ciągu 24h</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-brand-600">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                  <Shield size={18} className="text-brand-900" />
                </div>
                <div>
                  <p className="font-medium text-brand-900">Gwarancja jakości</p>
                  <p className="text-sm text-brand-600">Produkty premium</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-brand-600">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                  <RotateCcw size={18} className="text-brand-900" />
                </div>
                <div>
                  <p className="font-medium text-brand-900">14 dni na zwrot</p>
                  <p className="text-sm text-brand-600">Bez podawania przyczyny</p>
                </div>
              </div>
            </div>
            
          </div>
        </div>
        
        <section className="mt-20 pt-12 border-t border-brand-200">
          <h2 className="text-2xl font-serif text-brand-900 mb-8">Szczegóły produktu</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {product.origin && (
              <div className="bg-white rounded-2xl p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Pochodzenie</p>
                <p className="text-lg text-brand-900">{product.origin}</p>
              </div>
            )}
            
            {product.year && (
              <div className="bg-white rounded-2xl p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Rocznik</p>
                <p className="text-lg text-brand-900">{product.year}</p>
              </div>
            )}
            
            <div className="bg-white rounded-2xl p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Kategoria</p>
              <p className="text-lg text-brand-900">{categoryName}</p>
            </div>
          </div>
        </section>
        
        <div className="mt-16 text-center">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-brand-700 hover:text-brand-900 transition-colors"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Wróć do poprzedniej strony
          </button>
        </div>
        
      </div>
    </div>
  );
};
