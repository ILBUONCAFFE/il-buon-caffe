'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

type BreadcrumbSegment = {
  label: string
  path?: string
}

function getBreadcrumbSegments(pathname: string): BreadcrumbSegment[] {
  const root: BreadcrumbSegment = { label: 'Il Buon Caffe', path: '/admin' }

  // Exact /admin route
  if (pathname === '/admin' || pathname === '/admin/') {
    return [root, { label: 'Pulpit' }]
  }

  // Orders
  if (pathname.startsWith('/admin/orders')) {
    if (pathname === '/admin/orders/returns') {
      return [root, { label: 'Zamówienia', path: '/admin/orders' }, { label: 'Zwroty' }]
    }
    return [root, { label: 'Zamówienia', path: '/admin/orders' }, { label: 'Zarządzanie' }]
  }

  // Inventory
  if (pathname.startsWith('/admin/inventory')) {
    if (pathname === '/admin/inventory/products') {
      return [root, { label: 'Magazyn', path: '/admin/inventory' }, { label: 'Produkty' }]
    }
    return [root, { label: 'Magazyn' }]
  }

  // Products (legacy/direct route)
  if (pathname.startsWith('/admin/products')) {
    return [root, { label: 'Produkty' }]
  }

  // Customers
  if (pathname.startsWith('/admin/customers')) {
    return [root, { label: 'Klienci' }]
  }

  // Marketing
  if (pathname.startsWith('/admin/marketing')) {
    if (pathname === '/admin/marketing/promotions') {
      return [root, { label: 'Marketing', path: '/admin/marketing' }, { label: 'Kreator Promocji' }]
    }
    return [root, { label: 'Marketing' }]
  }

  // Promotions (top-level)
  if (pathname.startsWith('/admin/promotions')) {
    return [root, { label: 'Promocje' }]
  }

  // Website
  if (pathname.startsWith('/admin/website')) {
    if (pathname === '/admin/website/stats') {
      return [root, { label: 'Strona internetowa', path: '/admin/website' }, { label: 'Statystyki' }]
    }
    return [root, { label: 'Strona internetowa' }]
  }

  // Content / CMS
  if (pathname.startsWith('/admin/content') || pathname.startsWith('/admin/cms')) {
    return [root, { label: 'CMS' }]
  }

  // Allegro
  if (pathname.startsWith('/admin/allegro')) {
    return [root, { label: 'Allegro' }]
  }

  // Settings
  if (pathname.startsWith('/admin/settings')) {
    return [root, { label: 'Ustawienia' }]
  }

  // Shipping
  if (pathname.startsWith('/admin/shipping')) {
    return [root, { label: 'Centrum przesyłek' }]
  }

  // Finance
  if (pathname.startsWith('/admin/finance')) {
    return [root, { label: 'Finanse' }]
  }

  // Statistics
  if (pathname.startsWith('/admin/statistics')) {
    return [root, { label: 'Statystyka' }]
  }

  // Analytics
  if (pathname.startsWith('/admin/analytics')) {
    return [root, { label: 'Analityka API' }]
  }

  // Fallback
  return [root, { label: 'Pulpit' }]
}

export const Breadcrumb = () => {
  const pathname = usePathname()
  const segments = getBreadcrumbSegments(pathname || '/admin')

  // If deeper than 3 levels, collapse middle segments
  const displaySegments =
    segments.length > 3
      ? [
          segments[0],
          { label: '...' } as BreadcrumbSegment,
          segments[segments.length - 1],
        ]
      : segments

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
      {displaySegments.map((segment, index) => {
        const isLast = index === displaySegments.length - 1
        const isCollapsed = segment.label === '...'

        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight size={12} className="text-[#D4D3D0] flex-shrink-0" />
            )}
            {isLast ? (
              <span className="text-sm font-semibold text-[#1A1A1A]">
                {segment.label}
              </span>
            ) : isCollapsed ? (
              <span
                className="text-sm text-[#A3A3A3] cursor-default"
                title={segments
                  .slice(1, segments.length - 1)
                  .map((s) => s.label)
                  .join(' > ')}
              >
                ...
              </span>
            ) : segment.path ? (
              <Link
                href={segment.path}
                className="text-sm text-[#A3A3A3] hover:text-[#0066CC] hover:underline transition-colors duration-150"
              >
                {segment.label}
              </Link>
            ) : (
              <span className="text-sm text-[#525252]">{segment.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
