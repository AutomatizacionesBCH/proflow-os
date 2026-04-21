'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function TableScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [canLeft,      setCanLeft]      = useState(false)
  const [canRight,     setCanRight]     = useState(false)
  const [needsScroll,  setNeedsScroll]  = useState(false)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setNeedsScroll(el.scrollWidth > el.clientWidth + 2)
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [update])

  const scroll = (dir: 'left' | 'right') =>
    ref.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' })

  return (
    <>
      <div
        ref={ref}
        className="overflow-x-scroll [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {needsScroll && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={() => scroll('left')}
            disabled={!canLeft}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            Anterior
          </button>
          <span className="text-xs text-slate-600 select-none">← deslizar →</span>
          <button
            onClick={() => scroll('right')}
            disabled={!canRight}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </>
  )
}
