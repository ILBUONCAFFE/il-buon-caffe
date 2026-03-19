"use client";
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Product, CartItem } from '@/types';
import { useNotification } from '@/components/Notification/NotificationProvider';
import { Coffee } from 'lucide-react';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (sku: string) => void;
  updateQuantity: (sku: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerPos: { x: number; y: number } | null;
  setTriggerPos: (pos: { x: number; y: number } | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [triggerPos, setTriggerPos] = useState<{ x: number; y: number } | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const { notify } = useNotification();

  // Load cart from LocalStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('ilbuoncaffe_cart');
      if (savedCart) {
        try {
          setItems(JSON.parse(savedCart));
        } catch (e) {
          console.error("Failed to parse cart from local storage", e);
        }
      }
      setIsInitialized(true);
    }
  }, []);

  // Save cart to LocalStorage on change
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      localStorage.setItem('ilbuoncaffe_cart', JSON.stringify(items));
    }
  }, [items, isInitialized]);

  const addToCart = (product: Product, quantityToAdd: number = 1) => {
    // Fallback for logic if sku is missing (legacy products)
    const safeSku = product.sku || (product.id ? `legacy-${product.id}` : `temp-${Date.now()}`);

    setItems(prev => {
      const existing = prev.find(item => item.sku === safeSku);
      if (existing) {
        return prev.map(item => 
          item.sku === safeSku ? { ...item, quantity: item.quantity + quantityToAdd } : item
        );
      }
      // Ensure the new item has the calculated SKU
      return [...prev, { ...product, sku: safeSku, quantity: quantityToAdd }];
    });
    
    setIsOpen(true);
    
    notify({
      message: `Dodano ${product.name} do koszyka`,
      tone: "success",
      icon: <Coffee size={20} strokeWidth={2.2} />,
      duration: 3500,
    });
  };

  const removeFromCart = (sku: string) => {
    setItems(prev => prev.filter(item => item.sku !== sku));
  };

  const updateQuantity = (sku: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.sku === sku) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider value={{ 
      items, 
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart,
      totalItems, 
      subtotal, 
      isOpen, 
      setIsOpen, 
      triggerPos, 
      setTriggerPos 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
