import { Bell, Search, Settings, Menu } from 'lucide-react'

type HeaderProps = {
  onMenuToggle?: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
  return (
    <header className="h-14 sm:h-16 flex-shrink-0 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sm:px-6 gap-3">
      {/* Left: hamburger (mobile) + search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Hamburger — only on mobile */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search — hidden on small mobile, visible from sm */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-md px-3 py-1.5 w-64 lg:w-72 focus-within:border-slate-600 transition-colors">
          <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <input
            type="text"
            placeholder="Buscar..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none w-full"
          />
          <kbd className="text-xs text-slate-600 font-mono hidden lg:inline">⌘K</kbd>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button className="relative p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
        </button>
        <button className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors hidden sm:block">
          <Settings className="w-4 h-4" />
        </button>
        <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block" />
        <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-xs text-blue-300 font-medium cursor-pointer">
          A
        </div>
      </div>
    </header>
  )
}
