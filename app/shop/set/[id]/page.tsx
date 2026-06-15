'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, ShopProduct, ProductSet, SetItem, InventoryItem } from '@/lib/supabase'
import { useShop } from '@/lib/shop-context'

const FONT_FAMILIES: Record<string, string> = {
  Inter: 'Inter, sans-serif', Montserrat: 'Montserrat, sans-serif',
  Georgia: 'Georgia, serif', Mono: 'Courier New, monospace',
  Trebuchet: 'Trebuchet MS, sans-serif', Palatino: 'Palatino Linotype, serif',
}
const RADIUS: Record<string, string> = { sharp: 'rounded-none', soft: 'rounded-lg', round: 'rounded-full' }
const CARD_RADIUS: Record<string, string> = { sharp: 'rounded-none', soft: 'rounded-xl', round: 'rounded-2xl' }

type ProductWithSet = ShopProduct & { set: ProductSet & { set_items: (SetItem & { inventory: InventoryItem })[] } }

export default function SetDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { config, addToCart } = useShop()
  const [product, setProduct] = useState<ProductWithSet | null>(null)
  const [itemSizes, setItemSizes] = useState<Record<string, string>>({})
  const [added, setAdded] = useState(false)
  const [mockupUrl, setMockupUrl] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [imgIndex, setImgIndex] = useState(0)
  // Mobile image modal
  const [modalImages, setModalImages] = useState<string[]>([])
  const [modalImgIndex, setModalImgIndex] = useState(0)
  const [modalTouchStartX, setModalTouchStartX] = useState<number | null>(null)

  useEffect(() => {
    supabase.from('shop_products').select('*, set:sets(*, set_items(*, inventory(*)))').eq('id', params.id).single()
      .then(({ data }) => {
        if (data) {
          const p = data as ProductWithSet
          setProduct(p)
          const items = (p.set.set_items ?? []).sort((a, b) => a.sort_order - b.sort_order)
          if (items.length > 0) setSelectedItemId(items[0].id)
        }
      })
  }, [params.id])

  if (!config || !product) return null

  const primaryColor = config.primary_color
  const fontFamily = FONT_FAMILIES[config.font] ?? 'Inter, sans-serif'
  const btnRadius = RADIUS[config.button_radius] ?? 'rounded-lg'
  const cardRadius = CARD_RADIUS[config.card_radius] ?? 'rounded-xl'
  const showMockup = config.product_card_show_mockup !== false

  const setData = product.set
  const items = (setData.set_items ?? []).sort((a, b) => a.sort_order - b.sort_order)
  const selectedItem = items.find(si => si.id === selectedItemId) ?? items[0] ?? null
  const selectedImages = (selectedItem?.inventory?.images ?? []).filter(Boolean) as string[]

  const allSized = items.every(si => {
    const sizes = si.inventory?.sizes ?? []
    return sizes.length === 0 || itemSizes[si.inventory_id]
  })

  function handleSelectItem(id: string) {
    setSelectedItemId(id)
    setImgIndex(0)
  }

  function handleAddToCart() {
    if (!allSized || !product) return
    addToCart({
      shopProductId: product.id,
      name: setData.name,
      image: items[0]?.inventory?.images?.[0] ?? null,
      price: product.points_price,
      size: null,
      setItemSizes: itemSizes,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  function openModal(images: string[], startIndex = 0) {
    setModalImages(images)
    setModalImgIndex(startIndex)
  }

  function handleModalTouchStart(e: React.TouchEvent) {
    setModalTouchStartX(e.touches[0].clientX)
  }

  function handleModalTouchEnd(e: React.TouchEvent) {
    if (modalTouchStartX === null || modalImages.length < 2) return
    const dx = e.changedTouches[0].clientX - modalTouchStartX
    if (Math.abs(dx) > 40) {
      if (dx < 0) setModalImgIndex(i => Math.min(i + 1, modalImages.length - 1))
      else setModalImgIndex(i => Math.max(i - 1, 0))
    }
    setModalTouchStartX(null)
  }

  return (
    <div style={{ fontFamily, backgroundColor: config.background_color, color: config.text_color }} className="min-h-screen pb-24 md:pb-0">
      <div className="max-w-5xl mx-auto w-full px-4 md:px-12 py-8">

        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-8"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Set header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{setData.name}</h1>
          <div className="mt-3">
            <span className="text-sm font-bold px-3 py-1.5 rounded-full border-2" style={{ color: primaryColor, borderColor: primaryColor }}>
              {product.points_price} pts
            </span>
          </div>
          {setData.description && (
            <p className="mt-4 text-gray-600 leading-relaxed">{setData.description}</p>
          )}
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row gap-6">

          {/* Left: items list */}
          <div className="md:w-[45%] flex flex-col gap-3">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Includes {items.length} item{items.length !== 1 ? 's' : ''}
            </div>

            {items.map(si => {
              const inv = si.inventory!
              const sizes = inv.sizes ?? []
              const firstImg = inv.images?.[0]
              const allImgs = (inv.images ?? []).filter(Boolean) as string[]
              const isSelected = si.id === selectedItemId

              return (
                <div
                  key={si.id}
                  onClick={() => handleSelectItem(si.id)}
                  className={`flex gap-3 items-start bg-white p-3 shadow-sm cursor-pointer transition-colors ${cardRadius} md:border-2 ${isSelected ? 'md:border-gray-800' : 'md:border-transparent md:hover:border-gray-200'}`}
                >
                  {/* Thumbnail — clickable on mobile to open image modal */}
                  <button
                    className={`w-14 flex-shrink-0 overflow-hidden bg-gray-100 ${cardRadius} md:cursor-default`}
                    style={{ height: 72 }}
                    onClick={e => {
                      e.stopPropagation()
                      if (allImgs.length > 0) openModal(allImgs, 0)
                    }}
                  >
                    {firstImg && <img src={firstImg} alt={inv.name} className="w-full h-full object-cover" />}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-gray-900 text-sm leading-snug">{inv.name}</div>
                      {showMockup && inv.mockup_url && (
                        <button
                          onClick={e => { e.stopPropagation(); setMockupUrl(inv.mockup_url!) }}
                          className="text-xs font-bold underline underline-offset-2 flex-shrink-0 transition-opacity hover:opacity-70"
                          style={{ color: primaryColor }}
                        >
                          View Mockup
                        </button>
                      )}
                    </div>
                    {sizes.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-400 mb-1.5">Select size</div>
                        <div className="flex flex-wrap gap-1.5">
                          {sizes.map(size => (
                            <button
                              key={size}
                              onClick={e => { e.stopPropagation(); setItemSizes(prev => ({ ...prev, [si.inventory_id]: size })) }}
                              className={`px-2.5 py-0.5 text-xs border-2 transition-colors ${btnRadius}`}
                              style={itemSizes[si.inventory_id] === size
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
                  </div>
                </div>
              )
            })}

            {/* Add to cart — desktop only inline */}
            <div className="mt-4 hidden md:block">
              <button
                onClick={handleAddToCart}
                disabled={!allSized}
                className={`w-full py-3.5 text-white font-semibold transition-all disabled:opacity-40 ${btnRadius} ${added ? 'scale-95' : ''}`}
                style={{ backgroundColor: added ? '#22c55e' : primaryColor }}
              >
                {added ? '✓ Added to Cart' : allSized ? 'Add Set to Cart' : 'Select sizes for all items'}
              </button>
            </div>
          </div>

          {/* Right: selected item images — desktop only */}
          <div className="flex-1 hidden md:flex flex-col gap-3">
            {selectedItem && (
              <div className="flex gap-3">
                {selectedImages.length > 1 && (
                  <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 400 }}>
                    {selectedImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIndex(i)}
                        className={`flex-shrink-0 w-14 h-20 overflow-hidden border-2 transition-colors ${cardRadius} ${i === imgIndex ? 'border-gray-700' : 'border-transparent'}`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                <div className={`flex-1 aspect-[3/4] bg-gray-100 overflow-hidden ${cardRadius}`}>
                  {selectedImages.length > 0
                    ? <img src={selectedImages[imgIndex]} alt={selectedItem.inventory?.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                  }
                </div>
              </div>
            )}
          </div>
        </div>
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
          disabled={!allSized}
          className={`w-full py-3.5 text-white font-semibold transition-all disabled:opacity-40 ${btnRadius} ${added ? 'scale-95' : ''}`}
          style={{ backgroundColor: added ? '#22c55e' : primaryColor }}
        >
          {added ? '✓ Added to Cart' : allSized ? 'Add Set to Cart' : 'Select sizes for all items'}
        </button>
      </div>

      {/* Mockup modal */}
      {mockupUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setMockupUrl(null)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setMockupUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
            <img src={mockupUrl} alt="Mockup" className={`w-full max-h-[85vh] object-contain shadow-2xl ${cardRadius}`} />
          </div>
        </div>
      )}

      {/* Mobile image modal */}
      {modalImages.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setModalImages([])}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative max-w-3xl w-full"
            onClick={e => e.stopPropagation()}
            onTouchStart={handleModalTouchStart}
            onTouchEnd={handleModalTouchEnd}
          >
            <button
              onClick={() => setModalImages([])}
              className="absolute -top-10 right-0 text-white/80 hover:text-white transition-colors text-sm flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
            <img
              src={modalImages[modalImgIndex]}
              alt=""
              className={`w-full max-h-[85vh] object-contain shadow-2xl select-none ${cardRadius}`}
              draggable={false}
            />
            {modalImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {modalImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setModalImgIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === modalImgIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
