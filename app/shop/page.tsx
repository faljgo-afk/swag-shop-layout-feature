'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, ShopProduct, InventoryItem, Category, ProductSet, SetItem } from '@/lib/supabase'
import { useShop } from '@/lib/shop-context'

const HERO_HEIGHT_PX: Record<string, string> = {
  S: '8rem', M: '16rem', L: '35rem', full: '100vh',
}
const HERO_HEIGHT_MOBILE_PX: Record<string, string> = {
  S: '6rem', M: '10rem', L: '18rem', full: '100vh',
}
const FONT_FAMILIES: Record<string, string> = {
  Inter: 'Inter, sans-serif', Montserrat: 'Montserrat, sans-serif',
  Georgia: 'Georgia, serif', Mono: 'Courier New, monospace',
  Trebuchet: 'Trebuchet MS, sans-serif', Palatino: 'Palatino Linotype, serif',
}
const RADIUS: Record<string, string> = { sharp: 'rounded-none', soft: 'rounded-lg', round: 'rounded-full' }
const CARD_RADIUS: Record<string, string> = { sharp: 'rounded-none', soft: 'rounded-xl', round: 'rounded-2xl' }

type ProductWithInventory = ShopProduct & { inventory: InventoryItem }
type ProductWithSet = ShopProduct & { set: ProductSet & { set_items: (SetItem & { inventory: InventoryItem })[] } }
type AnyProduct = ProductWithInventory | ProductWithSet

function isSet(p: AnyProduct): p is ProductWithSet { return !!p.set_id }

export default function ShopPage() {
  const router = useRouter()
  const { config } = useShop()
  const [products, setProducts] = useState<AnyProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const catalogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('shop_products').select('*, inventory(*), set:sets(*, set_items(*, inventory(*)))').eq('published', true).order('sort_order')
      .then(({ data }) => {
        if (data) {
          setProducts(data as AnyProduct[])
          // restore scroll after products render
          const savedY = sessionStorage.getItem('shopScrollY')
          if (savedY) {
            sessionStorage.removeItem('shopScrollY')
            requestAnimationFrame(() => window.scrollTo({ top: parseInt(savedY) }))
          }
        }
      })
    supabase.from('categories').select('*').order('sort_order')
      .then(({ data }) => { if (data) setCategories(data) })
  }, [])

  if (!config) return null

  const fontFamily = FONT_FAMILIES[config.font] ?? 'Inter, sans-serif'
  const btnRadius = RADIUS[config.button_radius] ?? 'rounded-lg'
  const cardRadius = CARD_RADIUS[config.card_radius] ?? 'rounded-xl'
  const primaryColor = config.primary_color

  const filteredProducts = activeCategory === 'all'
    ? products
    : products.filter(p => (p.category_ids ?? []).includes(activeCategory))

  const mobileCols = config.listing_columns_mobile ?? (config.listing_columns === 4 ? 2 : 2)
  const mobileColsClass = mobileCols === 1 ? 'grid-cols-1' : 'grid-cols-2'
  const desktopColsClass = config.listing_columns === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'
  const colsClass = `${mobileColsClass} ${desktopColsClass}`
  const alignClass: Record<string, string> = { left: 'text-left items-start', center: 'text-center items-center', right: 'text-right items-end' }
  const catAlignClass: Record<string, string> = { left: 'justify-start', center: 'justify-center', right: 'justify-end' }

  return (
    <div style={{ fontFamily, backgroundColor: config.background_color, color: config.text_color }} className="flex flex-col">
      {/* Hero */}
      {config.hero_type !== 'none' && (() => {
        const mobileH = HERO_HEIGHT_MOBILE_PX[config.hero_height_mobile ?? config.hero_height] ?? '10rem'
        const desktopH = HERO_HEIGHT_PX[config.hero_height] ?? '16rem'
        const mobileBgImage = config.hero_type === 'image'
          ? (config.hero_image_url_mobile ?? config.hero_image_url)
          : null
        const desktopBgImage = config.hero_type === 'image' ? config.hero_image_url : null
        const gradientBg = config.hero_type === 'gradient'
          ? `linear-gradient(135deg, ${config.hero_gradient_from}, ${config.hero_gradient_to})`
          : null
        const mobileBgCss = gradientBg
          ? `background:${gradientBg}`
          : mobileBgImage
          ? `background-image:url(${mobileBgImage});background-size:cover;background-position:center`
          : ''
        const desktopBgCss = gradientBg
          ? `background:${gradientBg}`
          : desktopBgImage
          ? `background-image:url(${desktopBgImage});background-size:cover;background-position:center`
          : ''
        return (
        <>
          <style>{`.hero-banner{height:${mobileH};${mobileBgCss}}@media(min-width:768px){.hero-banner{height:${desktopH};${desktopBgCss}}}`}</style>
          <div
            className={`hero-banner flex flex-col ${alignClass[config.hero_align] ?? 'items-center'} justify-center px-6 md:px-12`}
          >
          {config.hero_title && (
            <h1 className={`text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-md ${config.hero_align === 'center' ? 'text-center' : config.hero_align === 'right' ? 'text-right' : 'text-left'}`}>
              {config.hero_title}
            </h1>
          )}
          {config.hero_subtitle && (
            <p className={`mt-3 text-base md:text-lg text-white/80 whitespace-pre-line ${config.hero_align === 'center' ? 'text-center' : config.hero_align === 'right' ? 'text-right' : 'text-left'}`}>
              {config.hero_subtitle}
            </p>
          )}
          {config.hero_button_enabled && (
            <button
              onClick={() => {
                if (!catalogRef.current) return
                const headerHeight = document.querySelector('header')?.offsetHeight ?? 0
                const top = catalogRef.current.getBoundingClientRect().top + window.scrollY - headerHeight
                window.scrollTo({ top, behavior: 'smooth' })
              }}
              className={`mt-6 px-7 py-3 font-semibold text-sm transition-opacity hover:opacity-90 ${btnRadius}`}
              style={{ backgroundColor: primaryColor, color: '#ffffff' }}
            >
              {config.hero_button_label || 'Shop Now'}
            </button>
          )}
          </div>
        </>
        )
      })()}

      {/* Main */}
      <div ref={catalogRef} className="flex-1 max-w-7xl mx-auto w-full px-6 md:px-12 py-10">
        {config.categories_enabled && categories.length > 0 && (
          <div className={`flex gap-2 mb-8 flex-wrap ${catAlignClass[config.categories_align] ?? 'justify-start'}`}>
            {[{ id: 'all', name: 'All' }, ...categories].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={activeCategory === cat.id ? { backgroundColor: primaryColor, color: '#fff' } : {}}
                className={`px-4 py-1.5 text-sm font-medium border transition-colors ${btnRadius} ${activeCategory === cat.id ? '' : 'border-gray-300 hover:border-gray-400'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No products available.</div>
        ) : (
          <div className={`grid gap-6 ${colsClass}`}>
            {filteredProducts.map(product =>
              isSet(product)
                ? <SetCard key={product.id} product={product} primaryColor={primaryColor} cardRadius={cardRadius} onOpen={() => { sessionStorage.setItem('shopScrollY', String(window.scrollY)); router.push(`/shop/set/${product.id}`) }} />
                : <ProductCard key={product.id} product={product as ProductWithInventory} primaryColor={primaryColor} cardRadius={cardRadius} onOpen={() => { sessionStorage.setItem('shopScrollY', String(window.scrollY)); router.push(`/shop/product/${product.id}`) }} />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ backgroundColor: config.footer_color, color: config.footer_text_color }} className="px-6 md:px-12 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          {/* Left: brand info */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {config.logo_url && <img src={config.logo_url} alt="Logo" className="h-5 md:h-7 w-auto object-contain opacity-80" />}
              {config.footer_show_store_name !== false && <span className="font-semibold">{config.store_name}</span>}
            </div>
            {config.footer_tagline && <p className="text-sm opacity-70 whitespace-pre-line">{config.footer_tagline}</p>}
            {config.footer_email && (
              <div className="flex items-center gap-1.5 text-sm mt-6">
                <span className="opacity-50">Admin:</span>
                <a href={`mailto:${config.footer_email}`} className="opacity-70 hover:opacity-100 underline">
                  {config.footer_email}
                </a>
              </div>
            )}
          </div>
          {/* Right: powered by — aligned to bottom of row */}
          <div className="text-xs font-bold opacity-70 shrink-0">Powered by Swag42 Platform</div>
        </div>
      </footer>
    </div>
  )
}

// ─── Listing cards ──────────────────────────────────────────────────────────

const MAX_VISIBLE = 5

function SetCard({ product, primaryColor, cardRadius, onOpen }: {
  product: ProductWithSet; primaryColor: string; cardRadius: string; onOpen: () => void
}) {
  const items = (product.set.set_items ?? []).sort((a, b) => a.sort_order - b.sort_order)
  const images = items.map(si => si.inventory?.images?.[0]).filter(Boolean) as string[]
  const overflow = images.length > MAX_VISIBLE + 1 ? images.length - MAX_VISIBLE : 0
  const visible = overflow > 0 ? images.slice(0, MAX_VISIBLE) : images

  return (
    <div onClick={onOpen} className={`bg-white shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer ${cardRadius}`}>
      <div className="relative aspect-[3/4] bg-gray-50 p-3">
        {images.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        ) : (
          <div className="h-full flex flex-col justify-center gap-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              {visible.map((img, i) => (
                <div key={i} className={`aspect-[2/3] overflow-hidden bg-gray-100 ${cardRadius}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
              {overflow > 0 && (
                <div className={`aspect-[2/3] overflow-hidden bg-gray-100 flex items-center justify-center ${cardRadius}`}>
                  <span className="text-sm font-semibold text-gray-500">+{overflow + 1}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <h3 className="font-semibold text-gray-900">{product.set.name}</h3>
        <div className="mt-auto">
          <span className="text-sm font-bold px-2.5 py-1 rounded-full border-2" style={{ color: primaryColor, borderColor: primaryColor }}>
            {product.points_price} pts
          </span>
        </div>
      </div>
    </div>
  )
}

function ProductCard({ product, primaryColor, cardRadius, onOpen }: {
  product: ProductWithInventory; primaryColor: string; cardRadius: string; onOpen: () => void
}) {
  const allImages = (product.inventory.images ?? []).filter(Boolean) as string[]
  const [imgIndex, setImgIndex] = useState(0)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={`bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow cursor-pointer ${cardRadius}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      <div className="relative bg-gray-50 aspect-[3/4] overflow-hidden">
        {allImages.length > 0 ? (
          <>
            <img src={allImages[imgIndex]} alt={product.inventory.name} className="w-full h-full object-cover" />
            {allImages.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setImgIndex(i => (i - 1 + allImages.length) % allImages.length) }}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hover:bg-white transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setImgIndex(i => (i + 1) % allImages.length) }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow hover:bg-white transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {allImages.map((_, i) => (
                    <button key={i} onClick={e => { e.stopPropagation(); setImgIndex(i) }} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === imgIndex ? 'bg-white' : 'bg-white/50'}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-3 flex-1">
        <h3 className="font-semibold text-gray-900">{product.inventory.name}</h3>
        <div className="mt-auto">
          <span className="text-sm font-bold px-2.5 py-1 rounded-full border-2" style={{ color: primaryColor, borderColor: primaryColor }}>
            {product.points_price} pts
          </span>
        </div>
      </div>
    </div>
  )
}
