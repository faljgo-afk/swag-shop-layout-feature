'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, ShopProduct, InventoryItem } from '@/lib/supabase'
import { useShop } from '@/lib/shop-context'

const FONT_FAMILIES: Record<string, string> = {
  Inter: 'Inter, sans-serif', Montserrat: 'Montserrat, sans-serif',
  Georgia: 'Georgia, serif', Mono: 'Courier New, monospace',
  Trebuchet: 'Trebuchet MS, sans-serif', Palatino: 'Palatino Linotype, serif',
}
const RADIUS: Record<string, string> = { sharp: 'rounded-none', soft: 'rounded-lg', round: 'rounded-full' }
const CARD_RADIUS: Record<string, string> = { sharp: 'rounded-none', soft: 'rounded-xl', round: 'rounded-2xl' }

type ProductWithInventory = ShopProduct & { inventory: InventoryItem }

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { config, addToCart } = useShop()
  const [product, setProduct] = useState<ProductWithInventory | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [imgIndex, setImgIndex] = useState(0)
  const [added, setAdded] = useState(false)
  const [mockupOpen, setMockupOpen] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  useEffect(() => {
    supabase.from('shop_products').select('*, inventory(*)').eq('id', params.id).single()
      .then(({ data }) => { if (data) setProduct(data as ProductWithInventory) })
  }, [params.id])

  if (!config || !product) return null

  const inv = product.inventory
  const images = (inv.images ?? []).filter(Boolean) as string[]
  const sizes = inv.sizes ?? []
  const canAdd = sizes.length === 0 || selectedSize !== null
  const showDescription = config.product_card_show_description !== false
  const showMockup = config.product_card_show_mockup !== false
  const primaryColor = config.primary_color
  const fontFamily = FONT_FAMILIES[config.font] ?? 'Inter, sans-serif'
  const btnRadius = RADIUS[config.button_radius] ?? 'rounded-lg'
  const cardRadius = CARD_RADIUS[config.card_radius] ?? 'rounded-xl'

  function handleAddToCart() {
    if (!canAdd || !product) return
    addToCart({
      shopProductId: product.id,
      name: inv.name,
      image: images[0] ?? null,
      price: product.points_price,
      size: selectedSize,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartX(e.touches[0].clientX)
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX === null || images.length < 2) return
    const dx = e.changedTouches[0].clientX - touchStartX
    if (Math.abs(dx) > 40) {
      if (dx < 0) setImgIndex(i => Math.min(i + 1, images.length - 1))
      else setImgIndex(i => Math.max(i - 1, 0))
    }
    setTouchStartX(null)
  }

  return (
    <div style={{ fontFamily, backgroundColor: config.background_color, color: config.text_color }} className="min-h-screen pb-24 md:pb-0">
      <div className="max-w-6xl mx-auto w-full px-4 md:px-12 py-6 md:py-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex flex-col md:flex-row gap-4 md:gap-10">
          {/* Images */}
          <div className="md:w-[45%] flex-shrink-0 flex flex-col gap-2">
            {/* Desktop: thumbnails left + main image right */}
            <div className="hidden md:flex gap-3">
              {images.length > 1 && (
                <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: '680px' }}>
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIndex(i)}
                      className={`flex-shrink-0 w-20 h-28 overflow-hidden border-2 transition-colors ${cardRadius} ${i === imgIndex ? 'border-gray-700' : 'border-transparent'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 flex flex-col gap-2">
                <div className={`aspect-[3/4] bg-gray-100 overflow-hidden ${cardRadius}`}>
                  {images.length > 0
                    ? <img src={images[imgIndex]} alt={inv.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                  }
                </div>
                {showMockup && inv.mockup_url && (
                  <button onClick={() => setMockupOpen(true)} className="text-sm font-bold underline underline-offset-2 text-left transition-opacity hover:opacity-70" style={{ color: primaryColor }}>
                    View Mockup
                  </button>
                )}
              </div>
            </div>

            {/* Mobile: swipeable image + dots */}
            <div className="flex flex-col gap-3 md:hidden">
              <div
                className={`relative aspect-[3/4] bg-gray-100 overflow-hidden ${cardRadius}`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {images.length > 0
                  ? <img src={images[imgIndex]} alt={inv.name} className="w-full h-full object-cover select-none" draggable={false} />
                  : <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                }
                {images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIndex(i)}
                        className={`h-1.5 rounded-full transition-all ${i === imgIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
              {showMockup && inv.mockup_url && (
                <button onClick={() => setMockupOpen(true)} className="text-sm font-bold underline underline-offset-2 text-left transition-opacity hover:opacity-70" style={{ color: primaryColor }}>
                  View Mockup
                </button>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="md:w-[55%] flex flex-col gap-5">
            <div>
              <div className="flex items-start justify-between gap-3 md:block">
                <h1 className="text-xl md:text-3xl font-bold text-gray-900">{inv.name}</h1>
                <div className="flex-shrink-0 md:mt-3">
                  <span className="text-sm font-bold px-3 py-1.5 rounded-full border-2 whitespace-nowrap" style={{ color: primaryColor, borderColor: primaryColor }}>
                    {product.points_price} pts
                  </span>
                </div>
              </div>
            </div>

            {showDescription && inv.description && (
              <p className="text-gray-600 leading-relaxed">{inv.description}</p>
            )}

            {sizes.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Size</div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size === selectedSize ? null : size)}
                      className={`px-3 py-1.5 text-sm border-2 transition-colors ${btnRadius}`}
                      style={selectedSize === size
                        ? { borderColor: primaryColor, backgroundColor: primaryColor + '18', color: primaryColor }
                        : { borderColor: '#d1d5db', color: '#374151' }
                      }
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Desktop button */}
            <div className="mt-2 hidden md:block">
              <button
                onClick={handleAddToCart}
                disabled={!canAdd}
                className={`w-1/2 py-3.5 text-white font-semibold transition-all disabled:opacity-40 ${btnRadius} ${added ? 'scale-95' : ''}`}
                style={{ backgroundColor: added ? '#22c55e' : primaryColor }}
              >
                {added ? '✓ Added to Cart' : canAdd ? 'Add to Cart' : 'Select a size'}
              </button>
            </div>
          </div>
        </div>

        {/* Mockup modal */}
        {mockupOpen && inv.mockup_url && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setMockupOpen(false)}>
            <div className="absolute inset-0 bg-black/70" />
            <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setMockupOpen(false)}
                className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors text-sm flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
              <img
                src={inv.mockup_url}
                alt={`${inv.name} mockup`}
                className={`w-full max-h-[85vh] object-contain shadow-2xl ${cardRadius}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile sticky Add to Cart */}
      <div
        className="fixed bottom-0 left-0 right-0 md:hidden z-30 px-4"
        style={{
          backgroundColor: config.background_color ?? '#ffffff',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '12px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        }}
      >
        <button
          onClick={handleAddToCart}
          disabled={!canAdd}
          className={`w-full py-3.5 text-white font-semibold transition-all disabled:opacity-40 ${btnRadius} ${added ? 'scale-95' : ''}`}
          style={{ backgroundColor: added ? '#22c55e' : primaryColor }}
        >
          {added ? '✓ Added to Cart' : canAdd ? 'Add to Cart' : 'Select a size'}
        </button>
      </div>
    </div>
  )
}
