---
name: nextjs-storefront
description: >
  Build pages, components, and layouts for the Il Buon Caffè Next.js 14 storefront.
  Use this skill whenever the user wants to create a new page, component, layout, or modify the public-facing shop.
  Triggers on: "new page", "component", "layout", "storefront", "shop page", "product page", "landing page",
  "navigation", "footer", "hero section", "Tailwind", "Framer Motion", "animation",
  or any work involving the apps/web/ directory for the public shop (not admin panel).
  Also use for data fetching patterns, Server Components vs Client Components decisions, and styling questions.
---

# Next.js Storefront Skill — Il Buon Caffè

Build the public-facing luxury e-commerce storefront with Next.js 14, React 19, Tailwind CSS 4, and Framer Motion.

## Project Context

- Storefront lives in `apps/web/`
- Next.js 14 with App Router
- React 19 with Server Components by default
- Tailwind CSS 4 for styling
- Framer Motion for animations
- Shared UI components from `@packages/ui`
- Fetches data from the Hono API (`apps/api`)

## Directory Structure

```
apps/web/
├── app/
│   ├── (shop)/           # Public shop layout group
│   │   ├── layout.tsx    # Shop layout (nav, footer)
│   │   ├── page.tsx      # Homepage
│   │   ├── products/
│   │   │   ├── page.tsx  # Product listing with filters
│   │   │   └── [slug]/
│   │   │       └── page.tsx  # Product detail
│   │   ├── cart/
│   │   ├── checkout/
│   │   └── encyclopedia/  # Coffee & wine knowledge base
│   ├── (auth)/           # Auth pages (login, register)
│   ├── admin/            # Admin panel (separate layout)
│   └── layout.tsx        # Root layout
├── components/
│   ├── shop/             # Shop-specific components
│   ├── ui/               # Local UI primitives
│   └── shared/           # Header, Footer, etc.
├── lib/
│   ├── api.ts            # API client (fetch wrapper)
│   ├── utils.ts
│   └── constants.ts
└── styles/
    └── globals.css
```

## Page Pattern (Server Component — default)

```tsx
// app/(shop)/products/page.tsx
import { ProductGrid } from '@/components/shop/product-grid';
import { FilterSidebar } from '@/components/shop/filter-sidebar';
import { api } from '@/lib/api';

interface SearchParams {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  origin?: string;
  page?: string;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { data, meta } = await api.products.list(params);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        <FilterSidebar currentFilters={params} />
        <ProductGrid products={data} pagination={meta} />
      </div>
    </div>
  );
}
```

## Client Component Pattern

Use `'use client'` only when needed — for interactivity, browser APIs, or state:

```tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function AddToCartButton({ productId, stock }: Props) {
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    setIsAdding(true);
    await api.cart.add(productId, 1);
    setIsAdding(false);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleAdd}
      disabled={isAdding || stock === 0}
      className="bg-amber-800 text-white px-6 py-3 rounded-lg
                 hover:bg-amber-900 transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {stock === 0 ? 'Niedostępny' : isAdding ? 'Dodawanie...' : 'Dodaj do koszyka'}
    </motion.button>
  );
}
```

## Key Conventions

### Server vs Client Components
- **Server (default)**: data fetching, SEO content, static layouts, anything that doesn't need interactivity
- **Client**: forms, buttons with handlers, animations triggered by user interaction, cart state, modals

Push `'use client'` as deep as possible — wrap only the interactive leaf, not the whole page.

### Data Fetching

Use the API client in Server Components:

```typescript
// lib/api.ts
const API_BASE = process.env.API_URL || 'http://localhost:8787';

export const api = {
  products: {
    list: (params?: Record<string, string>) =>
      fetch(`${API_BASE}/api/products?${new URLSearchParams(params)}`)
        .then(r => r.json()),
    get: (slug: string) =>
      fetch(`${API_BASE}/api/products/${slug}`)
        .then(r => r.json()),
  },
  // ... other domains
};
```

### Design Language

Il Buon Caffè is a **luxury Italian brand**. The design should feel:

- **Warm & earthy**: amber, espresso brown, cream, olive tones
- **Elegant typography**: serif headings (e.g., Playfair Display), clean sans body
- **Generous whitespace**: let products breathe
- **Subtle animations**: Framer Motion for page transitions, hover effects, scroll reveals — never flashy

Key Tailwind color palette:
```
amber-800    — primary CTA, buttons
stone-900    — text
stone-100    — backgrounds
amber-50     — subtle highlights
emerald-800  — success states
red-700      — error states
```

### Framer Motion Patterns

Page transition wrapper (use in layouts):
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: 'easeOut' }}
>
  {children}
</motion.div>
```

Staggered grid items:
```tsx
const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

<motion.div variants={container} initial="hidden" animate="show">
  {products.map(p => (
    <motion.div key={p.id} variants={item}>
      <ProductCard product={p} />
    </motion.div>
  ))}
</motion.div>
```

### Polish Language

The storefront is in Polish. Use Polish for all user-facing text:
- "Dodaj do koszyka" (Add to cart)
- "Koszyk" (Cart)
- "Zamówienie" (Order)
- "Szukaj produktów..." (Search products...)
- "Kategorie" (Categories)
- "Cena" (Price)
- "Pochodzenie" (Origin)

### Images

Product images stored in Cloudflare R2. Use Next.js `<Image>` with the R2 domain:

```tsx
import Image from 'next/image';

<Image
  src={product.imageUrl}
  alt={product.name}
  width={400}
  height={400}
  className="object-cover rounded-lg"
/>
```

Configure the R2 domain in `next.config.js` under `images.remotePatterns`.

### Metadata & SEO

Every page should export metadata for SEO:

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kawa | Il Buon Caffè',
  description: 'Najlepsza włoska kawa — espresso, arabica, specialty coffee.',
};
```

For dynamic pages, use `generateMetadata`:

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await api.products.get(params.slug);
  return {
    title: `${product.name} | Il Buon Caffè`,
    description: product.description?.slice(0, 160),
  };
}
```
