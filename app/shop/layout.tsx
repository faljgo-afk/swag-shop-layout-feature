'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ShopProvider, useShop } from '@/lib/shop-context'

const FONT_FAMILIES: Record<string, string> = {
  Inter: 'Inter, sans-serif',
  Montserrat: 'Montserrat, sans-serif',
  Georgia: 'Georgia, serif',
  Mono: 'Courier New, monospace',
  Trebuchet: 'Trebuchet MS, sans-serif',
  Palatino: 'Palatino Linotype, serif',
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShopProvider>
      <ShopShell>{children}</ShopShell>
    </ShopProvider>
  )
}

function ShopShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { config, totalItems, isPreview } = useShop()
  const [isScrolledPast, setIsScrolledPast] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!config?.header_transparent_scroll) return
    const handler = () => {
      const h = headerRef.current?.offsetHeight ?? 64
      setIsScrolledPast(window.scrollY > h)
    }
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [config?.header_transparent_scroll])

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">Loading shop…</div>
    )
  }

  const fontFamily = FONT_FAMILIES[config.font] ?? 'Inter, sans-serif'

  const headerBg = (() => {
    if (!config.header_transparent_scroll) return config.header_color
    if (!isScrolledPast) return config.header_color
    const hex = config.header_color.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, 0.65)`
  })()

  return (
    <>
      <header
        ref={headerRef}
        style={{
          ...(config.header_sticky ? { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40 } : {}),
          backgroundColor: headerBg,
          transition: 'background-color 0.3s',
          fontFamily,
          color: config.header_text_color ?? '#ffffff',
        }}
        className="px-6 md:px-12 py-6 flex items-center justify-between w-full"
      >
        <button
          onClick={() => {
            sessionStorage.removeItem('shopScrollY')
            pathname === '/shop' ? window.scrollTo({ top: 0, behavior: 'smooth' }) : router.push('/shop')
          }}
          className="flex items-center gap-3 transition-opacity hover:opacity-80 min-w-0"
        >
          {config.logo_url && <img src={config.logo_url} alt="Logo" className="h-10 md:h-12 w-auto max-w-[120px] md:max-w-[160px] object-contain flex-shrink-0" />}
          {config.header_show_store_name !== false && (
            <span className="font-semibold text-base md:text-lg hidden sm:block truncate" style={{ color: config.header_text_color ?? '#ffffff' }}>{config.store_name}</span>
          )}
        </button>
        <div className="flex items-center gap-3 md:gap-5 flex-shrink-0">
          {/* Balance */}
          <div className="h-9 md:h-10 px-3 md:px-4 rounded-full flex items-center gap-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <span className="text-xs opacity-70 hidden sm:block" style={{ color: config.header_text_color ?? '#ffffff' }}>Balance</span>
            <span className="font-bold text-sm" style={{ color: config.header_text_color ?? '#ffffff' }}>500 pts</span>
          </div>
          {/* Cart */}
          <button
            onClick={() => router.push('/shop/cart')}
            className="relative h-9 w-9 md:h-10 md:w-10 rounded-full border-2 flex items-center justify-center transition-opacity hover:opacity-80 flex-shrink-0"
            style={{ color: config.header_text_color ?? '#ffffff', borderColor: config.header_text_color ?? '#ffffff' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" style={{ transform: 'translateY(-0.5px)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
          {/* User */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: config.header_text_color ?? '#ffffff', color: config.header_text_color ?? '#ffffff' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <span className="text-sm font-medium hidden md:block" style={{ color: config.header_text_color ?? '#ffffff' }}>john.doe@company.com</span>
          </div>
        </div>
      </header>
      {config.header_sticky && <div className="h-[88px] md:h-[96px]" />}

      {isPreview && (
        <div className="bg-amber-400 px-4 py-2 flex items-center justify-between gap-4">
          <span className="text-amber-900 text-sm font-medium">Preview mode — changes not yet published to live shop</span>
          <button
            onClick={() => { sessionStorage.removeItem('shopConfigPreview'); window.close() }}
            className="text-amber-900 text-sm font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity whitespace-nowrap"
          >
            Exit Preview
          </button>
        </div>
      )}

      {children}
    </>
  )
}
