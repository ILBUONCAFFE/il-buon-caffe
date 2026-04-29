'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard, ShoppingCart, ClipboardList, RotateCcw, AlertTriangle,
  Package, Archive, Link, Users, DollarSign, BarChart3, Truck, Tag, Gift,
  Globe, LineChart, Edit, Settings, ChevronRight, Activity, X
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
  { id: 'shipping', path: '/admin/shipping', icon: Truck, label: 'Centrum przesyłek', destination: 'Zarządzanie wysyłkami' },
  {
    id: 'inventory', icon: Package, label: 'Magazyn', destination: 'Stan magazynowy',
    children: [
      { id: 'inventory-products', path: '/admin/products', label: 'Produkty', icon: Archive },
      { id: 'inventory-connections', path: '/admin/inventory/connections', label: 'Połączenia Allegro', icon: Link }
    ]
  },
  { id: 'customers', path: '/admin/customers', icon: Users, label: 'Klienci', destination: 'Baza klientów' },
  { id: 'finance', path: '/admin/finance', icon: DollarSign, label: 'Finanse', destination: 'Transakcje i raporty' },
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
      { id: 'website-cms', path: '/admin/content', label: 'Treści i gotowce', icon: Edit }
    ]
  },
  { id: 'statistics', path: '/admin/statistics', icon: BarChart3, label: 'Statystyka', destination: 'Analizy i statystyki' },
  { id: 'analytics', path: '/admin/analytics', icon: Activity, label: 'Analityka API', destination: 'Cloudflare Analytics Engine' },
  { id: 'settings', path: '/admin/settings', icon: Settings, label: 'Ustawienia', destination: 'Konfiguracja systemu' }
]

type SidebarProps = {
  expandedMenus: string[]
  setExpandedMenus: (v: string[]) => void
  isOpen?: boolean
  onClose?: () => void
}

export const Sidebar = ({ expandedMenus, setExpandedMenus, isOpen = false, onClose }: SidebarProps) => {
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

  const handleNavigate = (path: string) => {
    router.push(path)
    onClose?.()
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen w-72 bg-white border-r border-[#E5E4E1] flex flex-col z-50
        transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      <div className="p-6 border-b border-[#E5E4E1] flex items-center justify-between">
        <div className="flex items-center justify-center flex-1 -ml-2">
          <Image
            src="/assets/logo.png"
            alt="Il Buon Caffe Logo"
            width={120}
            height={48}
            className="h-12 w-auto object-contain brightness-0"
            priority
          />
        </div>
        {/* Close button — visible only on mobile */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg text-[#A3A3A3] hover:bg-[#F5F4F1] hover:text-[#1A1A1A] transition-colors duration-150"
          aria-label="Zamknij menu"
        >
          <X size={20} />
        </button>
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
                      handleNavigate(item.path)
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
                              onClick={() => child.path && handleNavigate(child.path)}
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
