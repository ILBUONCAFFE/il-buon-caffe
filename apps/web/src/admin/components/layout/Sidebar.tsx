'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, ShoppingCart, ClipboardList, RotateCcw, AlertTriangle,
  Package, Archive, Link2, Users, DollarSign, BarChart3, Tag, Gift,
  Globe, LineChart, Edit, Settings, ChevronDown, X, Search, LogOut
} from 'lucide-react'

type NavLeaf = { id: string; path: string; label: string; icon: typeof LayoutDashboard }
type NavParent = { id: string; label: string; icon: typeof LayoutDashboard; children: NavLeaf[] }
type NavItem = NavLeaf | NavParent
type NavSection = { id: string; label: string; items: NavItem[] }

const sections: NavSection[] = [
  {
    id: 'overview',
    label: 'Główne',
    items: [
      { id: 'dashboard', path: '/admin', icon: LayoutDashboard, label: 'Pulpit' },
    ],
  },
  {
    id: 'sales',
    label: 'Sprzedaż',
    items: [
      {
        id: 'orders', icon: ShoppingCart, label: 'Zamówienia',
        children: [
          { id: 'orders-all', path: '/admin/orders', label: 'Wszystkie', icon: ClipboardList },
          { id: 'orders-returns', path: '/admin/orders/returns', label: 'Zwroty', icon: RotateCcw },
          { id: 'orders-complaints', path: '/admin/orders/complaints', label: 'Reklamacje', icon: AlertTriangle },
        ],
      },
      { id: 'customers', path: '/admin/customers', icon: Users, label: 'Klienci' },
      { id: 'finance', path: '/admin/finance', icon: DollarSign, label: 'Finanse' },
    ],
  },
  {
    id: 'catalog',
    label: 'Katalog',
    items: [
      {
        id: 'inventory', icon: Package, label: 'Magazyn',
        children: [
          { id: 'inventory-products', path: '/admin/products', label: 'Produkty', icon: Archive },
          { id: 'inventory-connections', path: '/admin/inventory/connections', label: 'Allegro', icon: Link2 },
        ],
      },
      {
        id: 'marketing', icon: Tag, label: 'Marketing',
        children: [
          { id: 'marketing-promotions', path: '/admin/marketing/promotions', label: 'Promocje', icon: Gift },
        ],
      },
    ],
  },
  {
    id: 'content',
    label: 'Strona',
    items: [
      {
        id: 'website', icon: Globe, label: 'Witryna',
        children: [
          { id: 'website-stats', path: '/admin/website/stats', label: 'Ruch', icon: LineChart },
          { id: 'website-cms', path: '/admin/content', label: 'Treści', icon: Edit },
        ],
      },
      { id: 'statistics', path: '/admin/statistics', icon: BarChart3, label: 'Statystyki' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { id: 'settings', path: '/admin/settings', icon: Settings, label: 'Ustawienia' },
    ],
  },
]

const isParent = (i: NavItem): i is NavParent => 'children' in i

type SidebarProps = {
  expandedMenus: string[]
  setExpandedMenus: (v: string[]) => void
  isOpen?: boolean
  onClose?: () => void
}

export const Sidebar = ({ expandedMenus, setExpandedMenus, isOpen = false, onClose }: SidebarProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState('')

  const isActive = (path?: string) => {
    if (!path) return false
    if (path === '/admin') return pathname === '/admin'
    return pathname === path || pathname.startsWith(path + '/')
  }

  const toggle = (id: string) => {
    setExpandedMenus(
      expandedMenus.includes(id)
        ? expandedMenus.filter(x => x !== id)
        : [...expandedMenus, id]
    )
  }

  useEffect(() => {
    for (const sec of sections) {
      for (const item of sec.items) {
        if (isParent(item) && item.children.some(c => isActive(c.path)) && !expandedMenus.includes(item.id)) {
          setExpandedMenus([...expandedMenus, item.id])
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const navigate = (path: string) => {
    router.push(path)
    onClose?.()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sections
    return sections
      .map(sec => {
        const items = sec.items
          .map(it => {
            if (isParent(it)) {
              if (it.label.toLowerCase().includes(q)) return it
              const kids = it.children.filter(c => c.label.toLowerCase().includes(q))
              if (kids.length) return { ...it, children: kids }
              return null
            }
            return it.label.toLowerCase().includes(q) ? it : null
          })
          .filter(Boolean) as NavItem[]
        return items.length ? { ...sec, items } : null
      })
      .filter(Boolean) as NavSection[]
  }, [query])

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen w-72 bg-white border-r border-neutral-200 flex flex-col z-50
        transition-transform duration-300 ease-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      <div className="h-16 px-5 flex items-center justify-between border-b border-neutral-200 shrink-0">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 group"
          aria-label="Pulpit"
        >
          <Image
            src="/assets/logo.png"
            alt=""
            width={96}
            height={32}
            className="h-7 w-auto object-contain brightness-0 group-hover:opacity-80 transition-opacity"
            priority
          />
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-neutral-400 border-l border-neutral-200 pl-2 ml-1">
            Admin
          </span>
        </button>
        <button
          onClick={onClose}
          className="lg:hidden p-2 -mr-2 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          aria-label="Zamknij menu"
        >
          <X size={18} />
        </button>
      </div>

      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj w menu…"
            className="w-full h-9 pl-9 pr-3 text-sm bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:border-neutral-400 transition-colors"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {filtered.map((sec, idx) => (
          <div key={sec.id} className={idx === 0 ? 'mt-1' : 'mt-5'}>
            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase text-neutral-400">
              {sec.label}
            </div>
            <ul className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon
                if (!isParent(item)) {
                  const active = isActive(item.path)
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center gap-3 h-9 px-3 rounded-md text-[13.5px] transition-colors ${
                          active
                            ? 'bg-neutral-900 text-white'
                            : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                        }`}
                      >
                        <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    </li>
                  )
                }

                const expanded = expandedMenus.includes(item.id) || query.trim().length > 0
                const childActive = item.children.some(c => isActive(c.path))
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => toggle(item.id)}
                      className={`w-full flex items-center justify-between h-9 px-3 rounded-md text-[13.5px] transition-colors ${
                        childActive
                          ? 'text-neutral-900'
                          : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                      }`}
                      aria-expanded={expanded}
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={17} strokeWidth={1.8} />
                        <span className="font-medium">{item.label}</span>
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-neutral-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                      />
                    </button>

                    <div
                      className={`grid transition-all duration-200 ease-out ${
                        expanded ? 'grid-rows-[1fr] mt-0.5' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <ul className="relative ml-[19px] pl-3 border-l border-neutral-200 space-y-0.5 py-1">
                          {item.children.map((child) => {
                            const ChildIcon = child.icon
                            const active = isActive(child.path)
                            return (
                              <li key={child.id}>
                                <button
                                  onClick={() => navigate(child.path)}
                                  className={`relative w-full flex items-center gap-2.5 h-8 px-2.5 rounded-md text-[13px] transition-colors ${
                                    active
                                      ? 'bg-neutral-100 text-neutral-900 font-medium'
                                      : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                                  }`}
                                >
                                  {active && (
                                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-4 w-px bg-neutral-900" />
                                  )}
                                  <ChildIcon size={14} strokeWidth={1.8} />
                                  <span>{child.label}</span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-xs text-neutral-400">
            Brak wyników dla „{query}”
          </div>
        )}
      </nav>

      <div className="border-t border-neutral-200 p-3 shrink-0">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[11px] font-semibold shrink-0">
              IB
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-neutral-900 truncate">Il Buon Caffe</div>
              <div className="text-[11px] text-neutral-500 truncate">Panel admina</div>
            </div>
          </div>
          <form action="/api/admin/logout" method="post">
            <button
              type="submit"
              className="p-2 rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
              aria-label="Wyloguj"
              title="Wyloguj"
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
