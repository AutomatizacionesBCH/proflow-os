'use client'

import { usePathname } from 'next/navigation'
import { navItems } from '@/config/navigation'
import { SidebarItem } from './SidebarItem'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-screen">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            PF
          </div>
          <span className="font-semibold text-slate-100 tracking-tight">
            ProFlow{' '}
            <span className="text-slate-400 font-normal">OS</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        <p className="text-xs font-medium text-slate-600 uppercase tracking-wider px-3 mb-2">
          Principal
        </p>
        {navItems.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            isActive={
              pathname === item.href || pathname.startsWith(item.href + '/')
            }
          />
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-800 transition-colors cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs text-blue-300 font-medium flex-shrink-0">
            A
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-slate-300 truncate">
              Administrador
            </span>
            <span className="text-xs text-slate-500 truncate">
              alchavez90@gmail.com
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
