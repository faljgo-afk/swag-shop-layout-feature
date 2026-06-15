'use client'

import { useRouter } from 'next/navigation'
import { useShop } from '@/lib/shop-context'

const FONT_FAMILIES: Record<string, string> = {
  Inter: 'Inter, sans-serif', Montserrat: 'Montserrat, sans-serif',
  Georgia: 'Georgia, serif', Mono: 'Courier New, monospace',
  Trebuchet: 'Trebuchet MS, sans-serif', Palatino: 'Palatino Linotype, serif',
}
const RADIUS: Record<string, string> = { sharp: 'rounded-none', soft: 'rounded-lg', round: 'rounded-full' }

export default function CartPage() {
  const router = useRouter()
  const { config, cart, removeFromCart, updateCartQty, totalItems, totalPts } = useShop()

  if (!config) return null

  const fontFamily = FONT_FAMILIES[config.font] ?? 'Inter, sans-serif'
  const btnRadius = RADIUS[config.button_radius] ?? 'rounded-lg'
  const primaryColor = config.primary_color

  return (
    <div style={{ fontFamily, backgroundColor: config.background_color, color: config.text_color }} className="min-h-screen">
      <div className="max-w-2xl mx-auto w-full px-4 md:px-12 py-8">

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

        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Cart</h1>
          {totalItems > 0 && <span className="text-sm text-gray-400">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>}
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-20 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
            </svg>
            <p className="text-gray-400 text-sm">Your cart is empty</p>
            <button
              onClick={() => router.push('/shop')}
              className={`px-6 py-2.5 text-white text-sm font-semibold transition-opacity hover:opacity-90 ${btnRadius}`}
              style={{ backgroundColor: primaryColor }}
            >
              Browse products
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cart.map(item => (
              <div key={item.cartId} className="flex gap-4 items-start bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                {/* Image */}
                <div className="w-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100" style={{ height: 88 }}>
                  {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 leading-snug">{item.name}</div>
                  {item.size && <div className="text-xs text-gray-500 mt-0.5">Size: {item.size}</div>}
                  <div className="text-sm font-bold mt-1" style={{ color: primaryColor }}>{item.price * item.quantity} pts</div>
                  {/* Qty controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateCartQty(item.cartId, item.quantity - 1)}
                      className="w-7 h-7 border border-gray-300 rounded-lg text-gray-600 flex items-center justify-center hover:bg-gray-50 transition-colors text-base leading-none"
                    >−</button>
                    <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQty(item.cartId, item.quantity + 1)}
                      className="w-7 h-7 border border-gray-300 rounded-lg text-gray-600 flex items-center justify-center hover:bg-gray-50 transition-colors text-base leading-none"
                    >+</button>
                  </div>
                </div>
                {/* Remove */}
                <button onClick={() => removeFromCart(item.cartId)} className="text-gray-300 hover:text-gray-500 transition-colors mt-1 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Total + Checkout */}
            <div className="mt-4 bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="text-lg font-bold" style={{ color: primaryColor }}>{totalPts} pts</span>
              </div>
              <button
                className={`w-full py-3.5 text-white font-semibold transition-opacity hover:opacity-90 ${btnRadius}`}
                style={{ backgroundColor: primaryColor }}
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
