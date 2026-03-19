"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { X, Trash2, ShoppingBag, ArrowRight, Minus, Plus, Package, GripVertical } from 'lucide-react';
import { CATEGORY_NAMES } from '@/lib/constants';

const CartSidebar = () => {
  const { 
    isOpen, 
    setIsOpen, 
    items, 
    removeFromCart, 
    updateQuantity, 
    triggerPos 
  } = useCart();
  
  const onClose = () => setIsOpen(false);

  // State
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Animation & Rendering
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Position & Size
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ width: 380, height: 560 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const userMovedRef = useRef(false);
  
  const dragInfo = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });
  const resizeInfo = useRef({ startX: 0, startY: 0, startW: 0, startH: 0, startPosX: 0, startPosY: 0, edge: '' });
  
  const windowRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const DEFAULT_WIDTH = 380;
  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 360;

  // --- Handle Opening/Closing ---
  useEffect(() => {
    if (isOpen) {
      const isFreshOpen = !wasOpenRef.current;
       
      if (isFreshOpen) {
        setShouldRender(true);
        setIsMinimized(false);
        userMovedRef.current = false;

        if (typeof window !== 'undefined') {
          let x = window.innerWidth - DEFAULT_WIDTH - 16;
          let y = 64;
          
          if (triggerPos && triggerPos.x > 0 && triggerPos.y > 0) {
            x = Math.min(triggerPos.x - DEFAULT_WIDTH + 20, window.innerWidth - DEFAULT_WIDTH - 16);
            x = Math.max(16, x);
            y = triggerPos.y + 8;
            y = Math.min(y, window.innerHeight - 500);
            y = Math.max(8, y);
          }
          
          setPosition({ x, y });
          setSize({ width: DEFAULT_WIDTH, height: 560 });
        }

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsVisible(true);
          });
        });
      }
    } 
    else if (!isOpen && wasOpenRef.current) {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsMinimized(false);
        setPosition(null);
      }, 350);
      
      wasOpenRef.current = isOpen;
      return () => clearTimeout(timer);
    }

    wasOpenRef.current = isOpen;
  }, [isOpen, triggerPos]);

  // --- Dragging ---
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!position) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    e.preventDefault();
    userMovedRef.current = true;
    dragInfo.current = { startX: e.clientX, startY: e.clientY, initialX: position.x, initialY: position.y };
    setIsDragging(true);
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const dx = e.clientX - dragInfo.current.startX;
      const dy = e.clientY - dragInfo.current.startY;
      let newX = dragInfo.current.initialX + dx;
      let newY = dragInfo.current.initialY + dy;
      
      if (typeof window !== 'undefined') {
        newX = Math.max(0, Math.min(newX, window.innerWidth - size.width));
        newY = Math.max(0, Math.min(newY, window.innerHeight - 48));
      }
      setPosition({ x: newX, y: newY });
    };
    
    const onUp = () => setIsDragging(false);
    
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, size.width]);

  // --- Resizing ---
  const handleResizeStart = useCallback((edge: string) => (e: React.MouseEvent) => {
    if (!position) return;
    e.preventDefault();
    e.stopPropagation();
    resizeInfo.current = { startX: e.clientX, startY: e.clientY, startW: size.width, startH: size.height, startPosX: position.x, startPosY: position.y, edge };
    setIsResizing(true);
  }, [size, position]);

  useEffect(() => {
    if (!isResizing || !position) return;
    
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      const { startX, startY, startW, startH, startPosX, startPosY, edge } = resizeInfo.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      let newW = startW;
      let newH = startH;
      let newX = startPosX;
      let newY = startPosY;
      
      if (edge.includes('r')) newW = Math.max(MIN_WIDTH, startW + dx);
      if (edge.includes('l')) { newW = Math.max(MIN_WIDTH, startW - dx); newX = startPosX + (startW - newW); }
      if (edge.includes('b')) newH = Math.max(MIN_HEIGHT, startH + dy);
      if (edge.includes('t')) { newH = Math.max(MIN_HEIGHT, startH - dy); newY = startPosY + (startH - newH); }
      
      setSize({ width: newW, height: newH });
      setPosition({ x: newX, y: newY });
    };
    
    const onUp = () => setIsResizing(false);
    
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing, position]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // Focus trap — active when cart is open, fully visible, and not minimized
  useFocusTrap(windowRef as React.RefObject<HTMLElement>, isOpen && !isMinimized && isVisible);

  if (!shouldRender || typeof window === 'undefined') return null;

  const showContent = isVisible && position;
  const isInteracting = isDragging || isResizing;

  return (
    <>


      {/* Minimized bottom bar */}
      <div 
        onClick={() => setIsMinimized(false)}
        role="button"
        tabIndex={0}
        aria-label="Rozwiń koszyk"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsMinimized(false);
          }
        }}
        className={`
          fixed bottom-0 left-0 right-0 z-[100] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2
          transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isMinimized && shouldRender 
            ? 'translate-y-0 opacity-100' 
            : 'translate-y-full opacity-0 pointer-events-none'}
        `}
      >
        <div className="mx-auto max-w-lg">
          <div className="mx-4 mb-4 bg-brand-900 rounded-2xl shadow-[0_8px_40px_-8px_rgba(62,39,35,0.5)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5">
              {/* Left: icon + info */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <ShoppingBag size={18} className="text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-brand-900">{items.length}</span>
                  </div>
                </div>
                <div>
                  <span className="block text-white font-semibold text-sm">Koszyk</span>
                  <span className="block text-white/50 text-xs">
                    {items.length} {items.length === 1 ? 'produkt' : items.length < 5 ? 'produkty' : 'produktów'}
                  </span>
                </div>
              </div>

              {/* Right: price + arrow */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="block text-white/50 text-[10px] uppercase tracking-wider">Suma</span>
                  <span className="block text-white font-bold text-lg leading-tight">{total.toFixed(2)} zł</span>
                </div>
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <ArrowRight size={14} className="text-white/70 -rotate-90" />
                </div>
              </div>
            </div>
            
            {/* Progress line */}
            <div className="h-0.5 bg-white/5">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-amber-300 transition-all duration-500"
                style={{ width: `${Math.min((total / 200) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main cart panel */}
      <div 
        ref={windowRef}
        className={`
          fixed z-50 flex flex-col overflow-hidden
          bg-white rounded-2xl
          shadow-[0_20px_60px_-12px_rgba(62,39,35,0.25),0_0_0_1px_rgba(0,0,0,0.05)]
          origin-top-right
          ${isInteracting ? '' : 'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]'}
          ${showContent && !isMinimized 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-[0.95] -translate-y-2 pointer-events-none'}
        `}
        style={{ 
          left: position?.x ?? 0,
          top: position?.y ?? 0,
          width: `${size.width}px`,
          height: `${size.height}px`,
          maxHeight: 'calc(100vh - 16px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-dialog-title"
      >
        {/* Header — draggable */}
        <div 
          onMouseDown={handleDragStart}
          className={`px-4 py-3.5 border-b border-brand-100/60 flex items-center justify-between bg-gradient-to-r from-brand-50/80 to-white select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          <div className="flex items-center gap-3 pointer-events-none">
            <div className="w-9 h-9 bg-brand-900 rounded-xl flex items-center justify-center shadow-sm">
              <ShoppingBag size={16} className="text-white" />
            </div>
            <div>
              <h2 id="cart-dialog-title" className="text-sm font-bold text-brand-900 tracking-wide">Koszyk</h2>
              {items.length > 0 && (
                <span className="text-[11px] text-brand-400">
                  {items.length} {items.length === 1 ? 'produkt' : items.length < 5 ? 'produkty' : 'produktów'}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-0.5">
            {/* Drag grip indicator */}
            <div className="h-8 w-6 flex items-center justify-center text-brand-200 pointer-events-none">
              <GripVertical size={14} />
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-brand-100 text-brand-400 hover:text-brand-600 transition-colors"
              aria-label="Minimalizuj koszyk"
            >
              <Minus size={14} strokeWidth={2.5} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-brand-400 hover:text-red-500 transition-colors"
              aria-label="Zamknij koszyk"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-hide min-h-0">
          {items.length === 0 ? (
            <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
                <Package size={28} strokeWidth={1.5} className="text-brand-300" />
              </div>
              <p className="font-serif text-base text-brand-400 italic mb-1">Twój koszyk jest pusty</p>
              <p className="text-xs text-brand-300 mb-5">Dodaj coś wyjątkowego do swojego koszyka</p>
              <button 
                onClick={onClose}
                className="text-xs font-bold uppercase tracking-[0.15em] text-brand-900 border border-brand-200 px-5 py-2.5 rounded-lg hover:bg-brand-50 transition-colors"
              >
                Przeglądaj produkty
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-1.5">
              {items.map((item, index) => (
                <div 
                  key={item.sku} 
                  className="group relative flex items-center gap-3 p-3 rounded-xl hover:bg-brand-50/70 transition-all duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Product image */}
                  <div className="w-14 h-14 bg-brand-50 rounded-xl shrink-0 overflow-hidden ring-1 ring-brand-100/50">
                    <img 
                      src={item.imageUrl || item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-brand-900 text-[13px] leading-tight truncate">{item.name}</h4>
                    <span className="text-[11px] text-brand-400 block truncate mt-0.5">
                      {CATEGORY_NAMES[typeof item.category === 'object' ? (item.category as any).name : item.category] || item.category}
                    </span>
                    
                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button 
                        onClick={() => updateQuantity(item.sku, -1)}
                        disabled={item.quantity <= 1}
                        aria-label={`Zmniejsz ilość ${item.name}`}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-brand-100/60 hover:bg-brand-200 text-brand-600 disabled:opacity-25 disabled:hover:bg-brand-100/60 transition-colors"
                      >
                        <Minus size={10} strokeWidth={2.5} />
                      </button>
                      <span className="text-xs font-bold text-brand-900 w-5 text-center tabular-nums">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.sku, 1)}
                        aria-label={`Zwiększ ilość ${item.name}`}
                        className="w-6 h-6 flex items-center justify-center rounded-md bg-brand-100/60 hover:bg-brand-200 text-brand-600 transition-colors"
                      >
                        <Plus size={10} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  {/* Price + remove */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-bold text-brand-900 text-sm tabular-nums">{(item.price * item.quantity).toFixed(2)} zł</span>
                    {item.quantity > 1 && (
                      <span className="text-[10px] text-brand-400 tabular-nums">{item.price.toFixed(2)} × {item.quantity}</span>
                    )}
                    <button 
                      onClick={() => removeFromCart(item.sku)}
                      aria-label={`Usuń ${item.name} z koszyka`}
                      className="mt-auto p-1 rounded-md text-brand-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer / Checkout */}
        {items.length > 0 && (
          <div className="border-t border-brand-100/60 bg-gradient-to-t from-brand-50/50 to-white">
            {/* Summary row */}
            <div className="px-5 pt-4 pb-3 flex justify-between items-end">
              <div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-brand-400 font-semibold block mb-0.5">Razem</span>
                <span className="text-2xl font-bold text-brand-900 leading-none tabular-nums">{total.toFixed(2)} zł</span>
              </div>
              <span className="text-[11px] text-brand-400 pb-0.5">{items.reduce((s, i) => s + i.quantity, 0)} szt.</span>
            </div>
            
            {/* Checkout button */}
            <div className="px-5 pb-5">
              <Link 
                href="/checkout"
                onClick={onClose}
                className="w-full bg-brand-900 text-white py-3 rounded-xl shadow-lg shadow-brand-900/20 hover:bg-brand-800 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="text-[13px] font-semibold tracking-wide relative z-10">Przejdź do kasy</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform relative z-10" />
              </Link>
            </div>
          </div>
        )}

        {/* Resize handles */}
        <div aria-hidden="true" onMouseDown={handleResizeStart('r')} className="absolute top-0 right-0 w-1.5 h-full cursor-ew-resize z-50 hover:bg-brand-200/30 transition-colors" />
        <div aria-hidden="true" onMouseDown={handleResizeStart('b')} className="absolute bottom-0 left-0 w-full h-1.5 cursor-ns-resize z-50 hover:bg-brand-200/30 transition-colors" />
        <div aria-hidden="true" onMouseDown={handleResizeStart('l')} className="absolute top-0 left-0 w-1.5 h-full cursor-ew-resize z-50 hover:bg-brand-200/30 transition-colors" />
        <div aria-hidden="true" onMouseDown={handleResizeStart('t')} className="absolute top-0 left-0 w-full h-1.5 cursor-ns-resize z-50 hover:bg-brand-200/30 transition-colors" />
        <div aria-hidden="true" onMouseDown={handleResizeStart('br')} className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-50 group/resize flex items-end justify-end p-0.5">
          <div className="w-2.5 h-2.5 border-r-[2.5px] border-b-[2.5px] border-brand-200/60 rounded-br-sm group-hover/resize:border-brand-400 transition-colors" />
        </div>
        <div aria-hidden="true" onMouseDown={handleResizeStart('bl')} className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-50" />
        <div aria-hidden="true" onMouseDown={handleResizeStart('tr')} className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-50" />
        <div aria-hidden="true" onMouseDown={handleResizeStart('tl')} className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-50" />
      </div>
    </>
  );
};

export default CartSidebar;
