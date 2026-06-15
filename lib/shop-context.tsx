'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, ShopConfig, SINGLETON_CONFIG_ID } from './supabase'
import { getCart, cartAddItem, cartRemoveItem, cartUpdateQty, CartItem } from './cart'

type ShopContextType = {
  config: ShopConfig | null
  isPreview: boolean
  cart: CartItem[]
  cartOpen: boolean
  setCartOpen: (v: boolean) => void
  addToCart: (entry: Omit<CartItem, 'cartId' | 'quantity'>) => void
  removeFromCart: (cartId: string) => void
  updateCartQty: (cartId: string, qty: number) => void
  totalItems: number
  totalPts: number
}

const ShopContext = createContext<ShopContextType | null>(null)

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be used within ShopProvider')
  return ctx
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ShopConfig | null>(null)
  const [isPreview, setIsPreview] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    setCart(getCart())
    const draft = sessionStorage.getItem('shopConfigPreview')
    if (draft) {
      try {
        setConfig(JSON.parse(draft))
        setIsPreview(true)
        return
      } catch {}
    }
    supabase.from('shop_config').select('*').eq('id', SINGLETON_CONFIG_ID).single()
      .then(({ data }) => { if (data) setConfig(data) })
  }, [])

  function addToCart(entry: Omit<CartItem, 'cartId' | 'quantity'>) {
    setCart(cartAddItem(entry))
  }

  function removeFromCart(cartId: string) {
    setCart(cartRemoveItem(cartId))
  }

  function updateCartQty(cartId: string, qty: number) {
    setCart(cartUpdateQty(cartId, qty))
  }

  const totalItems = cart.reduce((s, c) => s + c.quantity, 0)
  const totalPts = cart.reduce((s, c) => s + c.price * c.quantity, 0)

  return (
    <ShopContext.Provider value={{ config, isPreview, cart, cartOpen, setCartOpen, addToCart, removeFromCart, updateCartQty, totalItems, totalPts }}>
      {children}
    </ShopContext.Provider>
  )
}
