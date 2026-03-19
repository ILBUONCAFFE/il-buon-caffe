'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard, ShoppingCart, ClipboardList, RotateCcw, AlertTriangle,
  Package, Archive, Link, Users, DollarSign, BarChart3, Truck, Tag, Gift,
  Globe, LineChart, Edit, Settings, ChevronRight, Activity
} from 'lucide-react'

const navItems = [
  { id: 'dashboard', path: '/admin', icon: LayoutDashboard, label: 'Pulpit', destination: 'Przegląd główny' },
  {
    id: 'orders', icon: ShoppingCart, label: 'Zamówienia', destination: 'Zarządzanie zamówieniami',
    children: [
      { id: 'orders-all', path: '/admin/orders', label: 'Zamówienia', icon: ClipboardList },
      { id: 'orders-returns', path: '/admin/orders/returns', label: 'Zwroty', icon: RotateCcw },
      { id: 'orders-complaints', path: '/admin/orders/complaints', label: 'Reklamacje', icon: AlertTriangle }
    ]
  },
  {
    id: 'inventory', icon: Package, label: 'Magazyn', destination: 'Stan magazynowy',
    children: [
      { id: 'inventory-products', path: '/admin/inventory/products', label: 'Produkty', icon: Archive },
      { id: 'inventory-connections', path: '/admin/inventory/connections', label: 'Połączenia', icon: Link }
    ]
  },
  { id: 'customers', path: '/admin/customers', icon: Users, label: 'Klienci', destination: 'Baza klientów' },
  { id: 'finance', path: '/admin/finance', icon: DollarSign, label: 'Finanse', destination: 'Transakcje i raporty' },
  { id: 'statistics', path: '/admin/statistics', icon: BarChart3, label: 'Statystyka', destination: 'Analizy i statystyki' },
  { id: 'analytics', path: '/admin/analytics', icon: Activity, label: 'Analityka API', destination: 'Cloudflare Analytics Engine' },
  { id: 'shipping', path: '/admin/shipping', icon: Truck, label: 'Centrum przesyłek', destination: 'Zarządzanie wysyłkami' },
  {
    id: 'marketing', icon: Tag, label: 'Marketing', destination: 'Promocje i kampanie',
    children: [
      { id: 'marketing-promotions', path: '/admin/marketing/promotions', label: 'Kreator Promocji', icon: Gift }
    ]
  },
  {
    id: 'website', icon: Globe, label: 'Strona internetowa', destination: 'Zarządzanie stroną',
    children: [
      { id: 'website-stats', path: '/admin/website/stats', label: 'Statystyki', icon: LineChart },
      { id: 'website-cms', path: '/admin/content', label: 'Zmiana CMS', icon: Edit }
    ]
  },
  { id: 'settings', path: '/admin/settings', icon: Settings, label: 'Ustawienia', destination: 'Konfiguracja systemu' }
]

type SidebarProps = {
  expandedMenus: string[]
  setExpandedMenus: (v: string[]) => void
}

export const Sidebar = ({ expandedMenus, setExpandedMenus }: SidebarProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const activePath = pathname

  const toggleMenu = (id: string) => {
    if (expandedMenus.includes(id)) {
      setExpandedMenus(expandedMenus.filter(menuId => menuId !== id))
    } else {
      setExpandedMenus([...expandedMenus, id])
    }
  }

  const isExpanded = (id: string) => expandedMenus.includes(id)

  const isActiveItem = (path?: string) => path === activePath

  const isParentActive = (item: typeof navItems[number]) =>
    'children' in item && item.children
      ? item.children.some(c => c.path === activePath)
      : false

  useEffect(() => {
    for (const item of navItems) {
      if ('children' in item && item.children) {
        if (item.children.some(c => c.path === activePath) && !expandedMenus.includes(item.id)) {
          setExpandedMenus([...expandedMenus, item.id])
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath])

  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-white border-r border-[#E5E4E1] flex flex-col z-50">
      <div className="p-6 border-b border-[#E5E4E1]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066CC] flex items-center justify-center">
            <span className="text-white font-serif font-bold text-lg">C</span>
          </div>
          <div>
            <p className="font-semibold text-[#1A1A1A] text-sm">Il Buon Caffe</p>
            <p className="text-xs text-[#737373]">Panel administracyjny</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 relative">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const hasChildren = 'children' in item && item.children && item.children.length > 0
            const active = !hasChildren && isActiveItem('path' in item ? item.path : undefined)
            const parentActive = hasChildren && isParentActive(item)

            return (
              <div key={item.id}>
                <button
                  onClick={() => {
                    if (hasChildren) {
                      toggleMenu(item.id)
                    } else if ('path' in item && item.path) {
                      router.push(item.path)
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-[#EEF4FF] text-[#0066CC]'
                      : parentActive
                        ? 'text-[#0066CC]'
                        : 'text-[#525252] hover:bg-[#F5F4F1] hover:text-[#1A1A1A]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </div>
                  {hasChildren && (
                    <ChevronRight
                      size={16}
                      className={`text-[#737373] transition-transform duration-200 ${isExpanded(item.id) ? 'rotate-90' : ''}`}
                    />
                  )}
                </button>

                {hasChildren && (
                  <div
                    className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      isExpanded(item.id) ? 'grid-rows-[1fr] opacity-100 mt-1 ml-2' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="space-y-0.5 py-1">
                        {'children' in item && item.children?.map((child) => {
                          const ChildIcon = child.icon
                          const childActive = isActiveItem(child.path)
                          return (
                            <button
                              key={child.id}
                              onClick={() => child.path && router.push(child.path)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                                childActive
                                  ? 'bg-[#EEF4FF] text-[#0066CC] font-medium'
                                  : 'text-[#737373] hover:bg-[#F5F4F1] hover:text-[#1A1A1A]'
                              }`}
                            >
                              <ChildIcon size={16} />
                              <span>{child.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
