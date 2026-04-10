---
name: admin-panel
description: >
  Build and extend the Il Buon Caffe web-based admin panel (dashboard, CRUD views, tables, forms, analytics).
  Use this skill whenever the user wants to add admin features, management pages, dashboard widgets,
  data tables, forms, or modify the admin UI. Triggers on: "admin", "dashboard", "panel admina",
  "zarządzanie", "CRUD", "tabela", "formularz", "command palette", "admin page", "management view",
  or any work involving the apps/web/app/admin/ directory. Also use for admin-specific patterns like
  bulk operations, data export, search, and filtering in the admin context.
---

# Admin Panel Skill — Il Buon Caffe

Build the web-based admin panel for product, order, customer, and analytics management.

## Project Context

- Admin panel lives in `apps/web/app/admin/`
- Shares the Next.js app with the storefront but has its own layout
- Protected by auth middleware (admin role required)
- Uses the same Hono API backend as the storefront
- Command palette for quick navigation (Cmd+K / Ctrl+K)

## Directory Structure

```
apps/web/app/admin/
├── layout.tsx          # Admin layout (sidebar, topbar, command palette)
├── page.tsx            # Dashboard overview
├── products/
│   ├── page.tsx        # Product list with search/filter
│   ├── new/page.tsx    # Create product form
│   └── [id]/
│       └── page.tsx    # Edit product
├── orders/
│   ├── page.tsx        # Order list
│   └── [id]/page.tsx   # Order detail + status management
├── customers/
│   ├── page.tsx        # Customer list
│   └── [id]/page.tsx   # Customer detail + order history
├── allegro/
│   └── page.tsx        # Allegro sync status, credential management
├── analytics/
│   └── page.tsx        # Sales charts, top products, revenue
└── settings/
    └── page.tsx        # Store config, GDPR tools
```

## Admin Layout

The admin layout includes:
- **Sidebar**: navigation links with icons, collapsible
- **Top bar**: search, notifications, user menu
- **Command palette**: Cmd+K for quick actions (go to product, create order, etc.)
- **Breadcrumbs**: auto-generated from route segments

```tsx
// app/admin/layout.tsx
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminTopbar } from '@/components/admin/topbar';
import { CommandPalette } from '@/components/admin/command-palette';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-stone-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
```

## Data Table Pattern

Admin tables follow a consistent pattern with sorting, filtering, pagination, and bulk actions:

```tsx
'use client';

import { useState } from 'react';
import { DataTable } from '@/components/admin/data-table';
import type { ColumnDef } from '@/components/admin/data-table';

const columns: ColumnDef<Product>[] = [
  { key: 'name', header: 'Nazwa', sortable: true },
  { key: 'sku', header: 'SKU' },
  { key: 'price', header: 'Cena', sortable: true,
    render: (value) => `${value} zł` },
  { key: 'stock', header: 'Stan', sortable: true,
    render: (value) => (
      <span className={value < 5 ? 'text-red-600 font-medium' : ''}>
        {value}
      </span>
    )},
  { key: 'isActive', header: 'Status',
    render: (value) => (
      <span className={`px-2 py-1 rounded-full text-xs ${
        value ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
      }`}>
        {value ? 'Aktywny' : 'Nieaktywny'}
      </span>
    )},
  { key: 'actions', header: '',
    render: (_, row) => <RowActions productId={row.id} /> },
];

export default function ProductsAdminPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Produkty</h1>
        <Link href="/admin/products/new"
              className="bg-amber-800 text-white px-4 py-2 rounded-lg">
          + Dodaj produkt
        </Link>
      </div>
      <DataTable
        columns={columns}
        endpoint="/api/admin/products"
        searchPlaceholder="Szukaj produktów..."
        bulkActions={['activate', 'deactivate', 'delete']}
      />
    </div>
  );
}
```

## Form Pattern

Admin forms for creating/editing entities:

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana'),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Tylko małe litery, cyfry i myślniki'),
  description: z.string().optional(),
  price: z.number().positive('Cena musi być większa od 0'),
  stock: z.number().int().min(0),
  categoryId: z.string().uuid(),
  isActive: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productSchema>;

export function ProductForm({ product, onSubmit }: Props) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <FormField label="Nazwa" error={errors.name?.message}>
        <input {...register('name')} className="admin-input" />
      </FormField>

      <FormField label="Cena (PLN)" error={errors.price?.message}>
        <input type="number" step="0.01" {...register('price', { valueAsNumber: true })}
               className="admin-input" />
      </FormField>

      {/* ... more fields */}

      <button type="submit" disabled={isSubmitting}
              className="bg-amber-800 text-white px-6 py-2 rounded-lg">
        {isSubmitting ? 'Zapisywanie...' : 'Zapisz'}
      </button>
    </form>
  );
}
```

## Dashboard Widgets

Dashboard shows key metrics using cards and charts:

```tsx
// Key metric card
<div className="bg-white rounded-xl border border-stone-200 p-6">
  <p className="text-sm text-stone-500">Przychód (dziś)</p>
  <p className="text-3xl font-semibold mt-1">2 450 zł</p>
  <p className="text-sm text-emerald-600 mt-2">↑ 12% vs wczoraj</p>
</div>
```

Dashboard sections: revenue (daily/weekly/monthly chart), recent orders, low stock alerts, top products, Allegro sync status.

## Key Conventions

### Polish UI Text
All admin UI is in Polish:
- "Zapisz" (Save), "Anuluj" (Cancel), "Usuń" (Delete)
- "Szukaj..." (Search...), "Filtruj" (Filter), "Eksportuj" (Export)
- "Zamówienia" (Orders), "Produkty" (Products), "Klienci" (Customers)
- "Szczegóły" (Details), "Edytuj" (Edit), "Archiwizuj" (Archive)

### Status Colors
- Success/active: `emerald-100/800`
- Warning/pending: `amber-100/800`
- Error/cancelled: `red-100/700`
- Neutral/inactive: `stone-100/600`

### Admin Authentication
All admin pages are protected. The layout checks for admin role:
```tsx
const user = await getServerSession();
if (!user || user.role !== 'admin') redirect('/login');
```

### Soft Deletes in UI
Never hard-delete. Use "Archiwizuj" (Archive) instead of "Usuń" (Delete) for products and customers. Show archived items with a toggle filter.

### GDPR/RODO Tools
The settings page includes:
- User data export (JSON download)
- User anonymization (replace PII, keep order stats)
- Consent history viewer
- Audit log browser with filters
