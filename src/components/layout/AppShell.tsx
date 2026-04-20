'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out',
          'md:relative md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <Sidebar onNavClick={() => setMobileOpen(false)} />
      </div>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onMenuToggle={() => setMobileOpen(v => !v)} />
        <main className="flex-1 overflow-y-auto bg-slate-950">
          <div className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
