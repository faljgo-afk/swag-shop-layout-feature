import { createClient } from '@supabase/supabase-js'

export const SINGLETON_CONFIG_ID = '00000000-0000-0000-0000-000000000001'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type InventoryItem = {
  id: string
  name: string
  description: string | null
  mockup_url: string | null
  images: string[] | null
  sizes: string[] | null
  stock: number | null
  stock_by_size: Record<string, number> | null
  created_at: string
}

export type ShopConfig = {
  id: string
  store_name: string
  logo_url: string | null
  header_sticky: boolean
  header_transparent_scroll: boolean
  header_show_store_name: boolean
  footer_show_store_name: boolean
  header_color: string
  header_text_color: string
  hero_type: 'none' | 'gradient' | 'image'
  hero_image_url: string | null
  hero_image_url_mobile: string | null
  hero_gradient_from: string
  hero_gradient_to: string
  hero_title: string | null
  hero_subtitle: string | null
  hero_align: 'left' | 'center' | 'right'
  hero_height: 'S' | 'M' | 'L' | 'full'
  hero_height_mobile: 'S' | 'M' | 'L' | 'full' | null
  hero_button_enabled: boolean
  hero_button_label: string
  primary_color: string
  background_color: string
  text_color: string
  font: string
  button_radius: 'sharp' | 'soft' | 'round'
  card_radius: 'sharp' | 'soft' | 'round'
  categories_enabled: boolean
  categories_align: 'left' | 'center' | 'right'
  listing_columns: number
  listing_columns_mobile: number | null
  footer_tagline: string | null
  footer_email: string | null
  footer_color: string
  footer_text_color: string
  product_card_show_description: boolean
  product_card_show_mockup: boolean
  created_at: string
  updated_at: string
}

export type ProductSet = {
  id: string
  name: string
  description: string | null
  created_at: string
  set_items?: SetItem[]
}

export type SetItem = {
  id: string
  set_id: string
  inventory_id: string
  sort_order: number
  inventory?: InventoryItem
}

export type ShopProduct = {
  id: string
  inventory_id: string | null
  set_id: string | null
  points_price: number
  published: boolean
  category: string | null
  category_ids: string[]
  sort_order: number
  created_at: string
  inventory?: InventoryItem
  set?: ProductSet
}

export type Category = {
  id: string
  name: string
  sort_order: number
  created_at: string
}
