'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/config/navigation'

type SidebarItemProps = {
  item: NavItem
  isActive: boolean
}

export function SidebarItem({ item, isActive }: SidebarItemProps) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
        isActive
          ? 'bg-blue-600/15 text-blue-400 font-medium'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      )}
    >
      <Icon
        className={cn(
          'w-4 h-4 flex-shrink-0',
          isActive ? 'text-blue-400' : 'text-slate-500'
        )}
      />
      <span>{item.label}</span>
      {isActive && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
      )}
    </Link>
  )
}
