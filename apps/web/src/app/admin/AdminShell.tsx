'use client'

import { usePathname } from 'next/navigation'
import { AdminLayoutClient } from '@/admin/components/layout/AdminLayoutClient'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === '/admin/login'

  if (isLogin) {
    return <div className="min-h-screen bg-neutral-50">{children}</div>
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
