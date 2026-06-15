export type CartItem = {
  cartId: string
  shopProductId: string
  name: string
  image: string | null
  price: number
  size: string | null
  setItemSizes?: Record<string, string>
  quantity: number
}

const KEY = 'swag42_cart'

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

function saveCart(cart: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(cart))
}

export function cartAddItem(entry: Omit<CartItem, 'cartId' | 'quantity'>): CartItem[] {
  const cart = getCart()
  const existing = cart.find(c => c.shopProductId === entry.shopProductId && c.size === entry.size)
  let next: CartItem[]
  if (existing) {
    next = cart.map(c => c.cartId === existing.cartId ? { ...c, quantity: c.quantity + 1 } : c)
  } else {
    next = [...cart, { ...entry, cartId: Math.random().toString(36).slice(2), quantity: 1 }]
  }
  saveCart(next)
  return next
}

export function cartRemoveItem(cartId: string): CartItem[] {
  const next = getCart().filter(c => c.cartId !== cartId)
  saveCart(next)
  return next
}

export function cartUpdateQty(cartId: string, qty: number): CartItem[] {
  const next = qty <= 0
    ? getCart().filter(c => c.cartId !== cartId)
    : getCart().map(c => c.cartId === cartId ? { ...c, quantity: qty } : c)
  saveCart(next)
  return next
}

export function cartTotal(cart: CartItem[]) {
  return {
    items: cart.reduce((s, c) => s + c.quantity, 0),
    pts: cart.reduce((s, c) => s + c.price * c.quantity, 0),
  }
}
