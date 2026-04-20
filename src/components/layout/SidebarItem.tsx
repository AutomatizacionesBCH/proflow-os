'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/config/navigation'

type SidebarItemProps = {
  item: NavItem
  isActive: boolean
  onNavClick?: () => void
}

export function SidebarItem({ item, isActive, onNavClick }: SidebarItemProps) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onNavClick}
      className={cn(
        'relative flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-blue-600/10 text-blue-400 font-medium'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-blue-500" />
      )}
      <Icon
        className={cn(
          'w-4 h-4 flex-shrink-0',
          isActive ? 'text-blue-400' : 'text-slate-500'
        )}
      />
      <span>{item.label}</span>
    </Link>
  )
}
