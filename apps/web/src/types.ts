
export type ProductCategory = 'all' | 'kawa' | 'wino' | 'slodycze' | 'spizarnia';
// Legacy alias for compatibility
export type Category = ProductCategory;

export interface Product {
  sku: string;           // Primary Key
  id?: number;          // @deprecated legacy ID
  name: string;
  description?: string;
  price: number;
  category?: ProductCategory | string;
  imageUrl?: string;    // New standard
  image?: string;       // @deprecated legacy
  stock?: number;
  reserved?: number;
  isNew?: boolean;
  isArchived?: boolean;
  origin?: string;
  year?: string;
  slug?: string;
  // Wine cascading filter fields
  originCountry?: string;   // "Hiszpania", "Włochy"
  originRegion?: string;    // "Yecla", "Toskania"
  grapeVariety?: string;    // "Monastrell, Syrah"
  
  // Static content override from Electron admin (partial JSONB)
  // NULL = use static wineData.ts catalog. Contains only overridden fields.
  wineDetails?: Record<string, unknown> | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CartItem extends Product {
  quantity: number;
}


export interface CafeMenuItem {
  category: string;
  items: {
    name: string;
    price: string;
    description?: string;
  }[];
}

export interface Article {
  id: number;
  title: string;
  subtitle: string;
  category: 'Wiedza' | 'Regiony' | 'Proces';
  image: string;
  content: string; // HTML-like string or paragraphs
  readTime: string;
}

