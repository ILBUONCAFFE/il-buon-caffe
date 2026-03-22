import React from "react";
import {
  Sparkles,
  Coffee,
  Wine,
  Cookie,
  ShoppingBag,
} from "lucide-react";
import type { Category } from "@/types";

// ============================================
// TYPES & CONSTANTS
// ============================================

export type SortOption = "featured" | "price-asc" | "price-desc" | "newest";
export type ViewMode = "grid" | "list";

export interface CategoryConfig {
  id: Category;
  name: string;
  slug: string;
  icon: React.ReactNode;
}

export const CATEGORIES: CategoryConfig[] = [
  { id: "all", name: "Wszystko", slug: "", icon: React.createElement(Sparkles, { size: 18 }) },
  { id: "kawa", name: "Kawa", slug: "kawa", icon: React.createElement(Coffee, { size: 18 }) },
  { id: "wino", name: "Wina", slug: "wino", icon: React.createElement(Wine, { size: 18 }) },
  { id: "slodycze", name: "S\u0142odycze", slug: "slodycze", icon: React.createElement(Cookie, { size: 18 }) },
  { id: "spizarnia", name: "Delikatesy", slug: "spizarnia", icon: React.createElement(ShoppingBag, { size: 18 }) },
];

export const PRICE_RANGES = [
  { id: "0-50", label: "Do 50 z\u0142", min: 0, max: 50 },
  { id: "50-100", label: "50 - 100 z\u0142", min: 50, max: 100 },
  { id: "100-200", label: "100 - 200 z\u0142", min: 100, max: 200 },
  { id: "200+", label: "Powy\u017Cej 200 z\u0142", min: 200, max: Infinity },
];

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Polecane" },
  { value: "newest", label: "Najnowsze" },
  { value: "price-asc", label: "Cena: rosn\u0105co" },
  { value: "price-desc", label: "Cena: malej\u0105co" },
];
