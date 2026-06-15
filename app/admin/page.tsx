'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, ShopConfig, ShopProduct, InventoryItem, Category, ProductSet, SINGLETON_CONFIG_ID } from '@/lib/supabase'

const NAV_SECTIONS = ['Brand', 'Header', 'Hero Banner', 'Visual', 'Catalog', 'Items', 'Product Card', 'Footer'] as const
type Section = (typeof NAV_SECTIONS)[number]

const FONTS = ['Inter', 'Montserrat', 'Georgia', 'Mono', 'Trebuchet', 'Palatino']
const FONT_FAMILIES: Record<string, string> = {
  Inter: 'Inter, sans-serif',
  Montserrat: 'Montserrat, sans-serif',
  Georgia: 'Georgia, serif',
  Mono: 'Courier New, monospace',
  Trebuchet: 'Trebuchet MS, sans-serif',
  Palatino: 'Palatino Linotype, serif',
}

const DEFAULT_CONFIG: Omit<ShopConfig, 'id' | 'created_at' | 'updated_at'> = {
  store_name: 'My Swag Shop',
  logo_url: null,
  header_sticky: true,
  header_transparent_scroll: false,
  header_color: '#1E1B4B',
  header_show_store_name: true,
  footer_show_store_name: true,
  header_text_color: '#ffffff',
  hero_type: 'none',
  hero_image_url: null,
  hero_image_url_mobile: null,
  hero_gradient_from: '#4F46E5',
  hero_gradient_to: '#7C3AED',
  hero_title: null,
  hero_subtitle: null,
  hero_align: 'center',
  hero_height: 'M',
  hero_height_mobile: null,
  hero_button_enabled: false,
  hero_button_label: 'Shop Now',
  primary_color: '#4F46E5',
  background_color: '#FFFFFF',
  text_color: '#1a1a1a',
  font: 'Inter',
  button_radius: 'soft',
  card_radius: 'soft',
  categories_enabled: false,
  categories_align: 'left',
  listing_columns: 3,
  listing_columns_mobile: null,
  product_card_show_description: true,
  product_card_show_mockup: true,
  footer_tagline: null,
  footer_email: null,
  footer_color: '#1E1B4B',
  footer_text_color: '#ffffff',
}

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<Section>('Brand')
  const [config, setConfig] = useState<ShopConfig | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [sets, setSets] = useState<ProductSet[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [heroUploading, setHeroUploading] = useState(false)
  const [heroMobileUploading, setHeroMobileUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const heroInputRef = useRef<HTMLInputElement>(null)
  const heroMobileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    // Step 1: try to fetch existing singleton row
    const { data: existing, error: fetchError } = await supabase
      .from('shop_config')
      .select('*')
      .eq('id', SINGLETON_CONFIG_ID)
      .maybeSingle()

    if (fetchError) {
      setLoadError(`Failed to load config: ${fetchError.message} (code: ${fetchError.code})`)
      return
    }

    if (existing) {
      setConfig(existing)
    } else {
      // Row doesn't exist yet — insert it
      const { data: inserted, error: insertError } = await supabase
        .from('shop_config')
        .insert({ id: SINGLETON_CONFIG_ID, ...DEFAULT_CONFIG })
        .select()
        .single()

      if (insertError) {
        setLoadError(`Failed to create config: ${insertError.message} (code: ${insertError.code})`)
        return
      }
      if (inserted) setConfig(inserted)
    }

    // Step 2: load the rest (non-blocking failures just leave state empty)
    const [inventoryRes, productsRes, categoriesRes, setsRes] = await Promise.all([
      supabase.from('inventory').select('*').order('created_at', { ascending: false }),
      supabase.from('shop_products').select('*').order('sort_order'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('sets').select('*, set_items(*, inventory(*))').order('created_at', { ascending: false }),
    ])
    if (inventoryRes.data) setInventory(inventoryRes.data)
    if (productsRes.data) setShopProducts(productsRes.data)
    if (categoriesRes.data) setCategories(categoriesRes.data)
    if (setsRes.data) setSets(setsRes.data as ProductSet[])
  }

  function updateConfig(patch: Partial<ShopConfig>) {
    setConfig(prev => {
      if (!prev) return prev
      return { ...prev, ...patch }
    })
    setIsDirty(true)
  }

  async function saveConfig() {
    if (!config) return
    setSaveStatus('saving')
    await supabase
      .from('shop_config')
      .update({ ...config, updated_at: new Date().toISOString() })
      .eq('id', SINGLETON_CONFIG_ID)
    setIsDirty(false)
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  function handlePreview() {
    if (!config) return
    sessionStorage.setItem('shopConfigPreview', JSON.stringify(config))
    window.open('/shop', '_blank')
  }

  async function uploadFile(file: File, bucket: string, path: string): Promise<string | null> {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) {
      setUploadError(`Upload failed: ${error.message}`)
      return null
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setLogoUploading(true)
    const url = await uploadFile(file, 'shop-assets', `logos/${SINGLETON_CONFIG_ID}-${Date.now()}`)
    if (url) {
      updateConfig({ logo_url: url })
      await supabase.from('shop_config').update({ logo_url: url }).eq('id', SINGLETON_CONFIG_ID)
      setIsDirty(false)
    }
    setLogoUploading(false)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  async function handleHeroImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setHeroUploading(true)
    const url = await uploadFile(file, 'shop-assets', `heroes/${SINGLETON_CONFIG_ID}-${Date.now()}`)
    if (url) {
      updateConfig({ hero_image_url: url })
      await supabase.from('shop_config').update({ hero_image_url: url }).eq('id', SINGLETON_CONFIG_ID)
      setIsDirty(false)
    }
    setHeroUploading(false)
    if (heroInputRef.current) heroInputRef.current.value = ''
  }

  async function handleHeroMobileImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setHeroMobileUploading(true)
    const url = await uploadFile(file, 'shop-assets', `heroes/${SINGLETON_CONFIG_ID}-mobile-${Date.now()}`)
    if (url) {
      updateConfig({ hero_image_url_mobile: url })
      await supabase.from('shop_config').update({ hero_image_url_mobile: url }).eq('id', SINGLETON_CONFIG_ID)
      setIsDirty(false)
    }
    setHeroMobileUploading(false)
    if (heroMobileInputRef.current) heroMobileInputRef.current.value = ''
  }

  async function saveProductChanges(product: ShopProduct, patch: Partial<ShopProduct>) {
    const updated = { ...product, ...patch }
    setShopProducts(prev => prev.map(p => p.id === product.id ? updated : p))
    await supabase.from('shop_products').update(patch).eq('id', product.id)
  }

  async function togglePublished(inventoryId: string, checked: boolean) {
    const existing = shopProducts.find(p => p.inventory_id === inventoryId)
    if (existing) {
      await saveProductChanges(existing, { published: checked })
    } else {
      const { data } = await supabase.from('shop_products').insert([{
        inventory_id: inventoryId,
        points_price: 100,
        published: checked,
        sort_order: shopProducts.length,
      }]).select().single()
      if (data) setShopProducts(prev => [...prev, data])
    }
  }

  async function updatePointsPrice(inventoryId: string, price: number) {
    const existing = shopProducts.find(p => p.inventory_id === inventoryId)
    if (existing) {
      await saveProductChanges(existing, { points_price: price })
    } else {
      const { data } = await supabase.from('shop_products').insert([{
        inventory_id: inventoryId,
        points_price: price,
        published: false,
        sort_order: shopProducts.length,
      }]).select().single()
      if (data) setShopProducts(prev => [...prev, data])
    }
  }

  async function toggleSetPublished(setId: string, checked: boolean) {
    const existing = shopProducts.find(p => p.set_id === setId)
    if (existing) {
      await saveProductChanges(existing, { published: checked })
    } else {
      const { data } = await supabase.from('shop_products').insert([{
        set_id: setId,
        points_price: 100,
        published: checked,
        sort_order: shopProducts.length,
      }]).select().single()
      if (data) setShopProducts(prev => [...prev, data])
    }
  }

  async function updateSetPrice(setId: string, price: number) {
    const existing = shopProducts.find(p => p.set_id === setId)
    if (existing) {
      await saveProductChanges(existing, { points_price: price })
    } else {
      const { data } = await supabase.from('shop_products').insert([{
        set_id: setId,
        points_price: price,
        published: false,
        sort_order: shopProducts.length,
      }]).select().single()
      if (data) setShopProducts(prev => [...prev, data])
    }
  }

  async function moveProduct(shopProductId: string, direction: 'up' | 'down') {
    const sorted = [...shopProducts].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const idx = sorted.findIndex(p => p.id === shopProductId)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = sorted[idx]
    const b = sorted[swapIdx]
    const aOrder = a.sort_order ?? idx
    const bOrder = b.sort_order ?? swapIdx

    setShopProducts(prev => prev.map(p => {
      if (p.id === a.id) return { ...p, sort_order: bOrder }
      if (p.id === b.id) return { ...p, sort_order: aOrder }
      return p
    }))
    await Promise.all([
      supabase.from('shop_products').update({ sort_order: bOrder }).eq('id', a.id),
      supabase.from('shop_products').update({ sort_order: aOrder }).eq('id', b.id),
    ])
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return
    const { data } = await supabase.from('categories').insert([{
      name: newCategoryName.trim(),
      sort_order: categories.length,
    }]).select().single()
    if (data) setCategories(prev => [...prev, data])
    setNewCategoryName('')
  }

  async function deleteCategory(id: string) {
    await supabase.from('categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
    setShopProducts(prev => prev.map(p => ({
      ...p,
      category_ids: (p.category_ids ?? []).filter(cid => cid !== id),
    })))
  }

  async function saveCategory(id: string, name: string) {
    await supabase.from('categories').update({ name }).eq('id', id)
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c))
    setEditingCategory(null)
  }

  async function moveCategoryUp(index: number) {
    if (index === 0) return
    const reordered = [...categories]
    ;[reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]]
    const updated = reordered.map((c, i) => ({ ...c, sort_order: i }))
    setCategories(updated)
    await Promise.all(updated.map(c => supabase.from('categories').update({ sort_order: c.sort_order }).eq('id', c.id)))
  }

  async function moveCategoryDown(index: number) {
    if (index === categories.length - 1) return
    const reordered = [...categories]
    ;[reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]]
    const updated = reordered.map((c, i) => ({ ...c, sort_order: i }))
    setCategories(updated)
    await Promise.all(updated.map(c => supabase.from('categories').update({ sort_order: c.sort_order }).eq('id', c.id)))
  }

  async function toggleProductCategory(inventoryId: string, categoryId: string, checked: boolean) {
    const existing = shopProducts.find(p => p.inventory_id === inventoryId)
    if (!existing) return
    const current = existing.category_ids ?? []
    const next = checked ? Array.from(new Set([...current, categoryId])) : current.filter(id => id !== categoryId)
    await saveProductChanges(existing, { category_ids: next })
  }

  async function updateInventoryDescription(inventoryId: string, description: string) {
    await supabase.from('inventory').update({ description }).eq('id', inventoryId)
    setInventory(prev => prev.map(item => item.id === inventoryId ? { ...item, description } : item))
  }

  async function toggleSetCategory(setId: string, categoryId: string, checked: boolean) {
    const existing = shopProducts.find(p => p.set_id === setId)
    if (!existing) return
    const current = existing.category_ids ?? []
    const next = checked ? Array.from(new Set([...current, categoryId])) : current.filter(id => id !== categoryId)
    await saveProductChanges(existing, { category_ids: next })
  }

  if (!config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 px-6">
        {loadError ? (
          <div className="max-w-lg w-full bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col gap-3">
            <h2 className="font-semibold text-red-800">Could not load admin panel</h2>
            <p className="text-sm text-red-700 font-mono break-all">{loadError}</p>
            <p className="text-sm text-red-600">
              Check that your <code className="bg-red-100 px-1 rounded">.env.local</code> has the correct{' '}
              <code className="bg-red-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
              <code className="bg-red-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and that the{' '}
              <code className="bg-red-100 px-1 rounded">shop_config</code> table exists in Supabase.
            </p>
            <button
              onClick={() => { setLoadError(null); loadData() }}
              className="self-start px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="text-gray-400 text-sm">Loading admin panel…</div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-[#1E1B4B] flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <span className="text-white font-bold text-lg">Swag Shop Admin</span>
        </div>
        <nav className="flex-1 py-4 flex flex-col">
          <div className="px-5 pt-1 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">Layout &amp; Design</span>
          </div>
          {NAV_SECTIONS.filter(s => s !== 'Items').map(s => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`w-full text-left px-5 py-2.5 text-sm transition-colors ${activeSection === s ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:bg-white/10'}`}
            >
              {s}
            </button>
          ))}
          <div className="mx-5 my-3 border-t border-white/10" />
          <div className="px-5 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">Inventory</span>
          </div>
          <button
            onClick={() => setActiveSection('Items')}
            className={`w-full text-left px-5 py-2.5 text-sm transition-colors ${activeSection === 'Items' ? 'bg-indigo-600 text-white' : 'text-indigo-200 hover:bg-white/10'}`}
          >
            Items
          </button>
        </nav>
        <div className="px-5 py-4 border-t border-white/10">
          <a href="/shop" target="_blank" className="block w-full text-center px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-sm rounded-lg transition-colors">
            Open Shop ↗
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8 pb-20">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">{activeSection}</h1>
          </div>

          {/* Section content */}
          {uploadError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {uploadError}
              <button onClick={() => setUploadError(null)} className="ml-3 underline">Dismiss</button>
            </div>
          )}
          {activeSection === 'Brand' && (
            <BrandSection config={config} onUpdate={updateConfig} onLogoUpload={handleLogoUpload} logoUploading={logoUploading} logoInputRef={logoInputRef} />
          )}
          {activeSection === 'Header' && (
            <HeaderSection config={config} onUpdate={updateConfig} />
          )}
          {activeSection === 'Hero Banner' && (
            <HeroSection config={config} onUpdate={updateConfig} onHeroUpload={handleHeroImageUpload} heroUploading={heroUploading} heroInputRef={heroInputRef} onHeroMobileUpload={handleHeroMobileImageUpload} heroMobileUploading={heroMobileUploading} heroMobileInputRef={heroMobileInputRef} />
          )}
          {activeSection === 'Visual' && (
            <VisualSection config={config} onUpdate={updateConfig} />
          )}
          {activeSection === 'Catalog' && (
            <CatalogSection
              config={config}
              onUpdate={updateConfig}
              categories={categories}
              shopProducts={shopProducts}
              inventory={inventory}
              newCategoryName={newCategoryName}
              setNewCategoryName={setNewCategoryName}
              editingCategory={editingCategory}
              setEditingCategory={setEditingCategory}
              editingCategoryName={editingCategoryName}
              setEditingCategoryName={setEditingCategoryName}
              onAddCategory={addCategory}
              onDeleteCategory={deleteCategory}
              onSaveCategory={saveCategory}
              onMoveCategoryUp={moveCategoryUp}
              onMoveCategoryDown={moveCategoryDown}
              onToggleProductCategory={toggleProductCategory}
              sets={sets}
              onToggleSetCategory={toggleSetCategory}
            />
          )}
          {activeSection === 'Items' && (
            <InventorySection
              inventory={inventory}
              sets={sets}
              shopProducts={shopProducts}
              onTogglePublished={togglePublished}
              onUpdatePrice={updatePointsPrice}
              onToggleSetPublished={toggleSetPublished}
              onUpdateSetPrice={updateSetPrice}
              onMoveProduct={moveProduct}
            />
          )}
          {activeSection === 'Product Card' && (
            <ProductCardSection
              config={config}
              onUpdate={updateConfig}
              inventory={inventory}
              onUpdateDescription={updateInventoryDescription}
            />
          )}
          {activeSection === 'Footer' && (
            <FooterSection config={config} onUpdate={updateConfig} />
          )}
        </div>
      </main>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-56 right-0 bg-white border-t border-gray-200 px-8 py-3 flex items-center justify-between z-20">
        <div className="text-sm">
          {isDirty && saveStatus === 'idle' && <span className="text-amber-600 font-medium">Unsaved changes</span>}
          {saveStatus === 'saving' && <span className="text-gray-400">Saving…</span>}
          {saveStatus === 'saved' && <span className="text-green-600 font-medium">Saved ✓</span>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePreview}
            className="px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            Preview ↗
          </button>
          <button
            onClick={saveConfig}
            disabled={saveStatus === 'saving' || !isDirty}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section components ────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-5">{children}</div>
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`} onClick={() => onChange(!checked)}>
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

function ColorPicker({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-gray-300 p-0.5" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
    </div>
  )
}

function SegmentedControl<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-lg border border-gray-300 overflow-hidden w-fit">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-4 py-2 text-sm font-medium transition-colors ${value === o.value ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// Brand
function BrandSection({ config, onUpdate, onLogoUpload, logoUploading, logoInputRef }: {
  config: ShopConfig; onUpdate: (p: Partial<ShopConfig>) => void
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  logoUploading: boolean
  logoInputRef: React.RefObject<HTMLInputElement>
}) {
  return (
    <Card>
      <Field label="Store Name *">
        <TextInput value={config.store_name} onChange={v => onUpdate({ store_name: v })} placeholder="My Swag Shop" />
      </Field>
      <Toggle checked={config.header_show_store_name !== false} onChange={v => onUpdate({ header_show_store_name: v })} label="Show store name in header (desktop only)" />
      <Toggle checked={config.footer_show_store_name !== false} onChange={v => onUpdate({ footer_show_store_name: v })} label="Show store name in footer" />
      <Field label="Logo">
        <div className="flex flex-col gap-3">
          {config.logo_url ? (
            <div
              className="w-full rounded-xl border border-gray-200 flex items-center justify-center p-4"
              style={{ minHeight: 100, backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, #f9fafb 0% 50%)', backgroundSize: '16px 16px' }}
            >
              <img src={config.logo_url} alt="Logo" className="max-h-16 max-w-full object-contain" />
            </div>
          ) : (
            <div className="w-full rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-sm" style={{ minHeight: 100 }}>
              No logo uploaded
            </div>
          )}
          <div className="flex items-center gap-3">
            <label className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors">
              {logoUploading ? 'Uploading…' : config.logo_url ? 'Replace Logo' : 'Upload Logo'}
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoUpload} />
            </label>
            {config.logo_url && (
              <button onClick={() => onUpdate({ logo_url: null })} className="text-sm text-red-500 hover:text-red-700">
                Remove
              </button>
            )}
          </div>
        </div>
      </Field>
    </Card>
  )
}

// Header
function HeaderSection({ config, onUpdate }: { config: ShopConfig; onUpdate: (p: Partial<ShopConfig>) => void }) {
  return (
    <Card>
      <Toggle checked={config.header_sticky} onChange={v => onUpdate({ header_sticky: v })} label="Sticky header" />
      <Toggle checked={config.header_transparent_scroll} onChange={v => onUpdate({ header_transparent_scroll: v })} label="Transparent on scroll" />
      <ColorPicker label="Background Color" value={config.header_color} onChange={v => onUpdate({ header_color: v })} />
      <ColorPicker label="Text Color" value={config.header_text_color ?? '#ffffff'} onChange={v => onUpdate({ header_text_color: v })} />
    </Card>
  )
}

// Hero
function HeroSection({ config, onUpdate, onHeroUpload, heroUploading, heroInputRef, onHeroMobileUpload, heroMobileUploading, heroMobileInputRef }: {
  config: ShopConfig; onUpdate: (p: Partial<ShopConfig>) => void
  onHeroUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  heroUploading: boolean
  heroInputRef: React.RefObject<HTMLInputElement>
  onHeroMobileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  heroMobileUploading: boolean
  heroMobileInputRef: React.RefObject<HTMLInputElement>
}) {
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <Field label="Hero Type">
          <SegmentedControl
            value={config.hero_type}
            options={[{ value: 'none', label: 'None' }, { value: 'gradient', label: 'Gradient' }, { value: 'image', label: 'Image' }]}
            onChange={v => onUpdate({ hero_type: v })}
          />
        </Field>
      </Card>

      {config.hero_type === 'gradient' && (
        <Card>
          <ColorPicker label="Gradient From" value={config.hero_gradient_from} onChange={v => onUpdate({ hero_gradient_from: v })} />
          <ColorPicker label="Gradient To" value={config.hero_gradient_to} onChange={v => onUpdate({ hero_gradient_to: v })} />
        </Card>
      )}

      {config.hero_type === 'image' && (
        <Card>
          <Field label="Hero Image — Desktop">
            <p className="text-xs text-gray-400 mb-2">Recommended: 1920×600 px (landscape, 16:5)</p>
            <div className="flex flex-col gap-2">
              {config.hero_image_url && (
                <img src={config.hero_image_url} alt="Hero" className="w-full h-24 object-cover rounded-lg border border-gray-200" />
              )}
              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors">
                  {heroUploading ? 'Uploading…' : config.hero_image_url ? 'Replace' : 'Upload Image'}
                  <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={onHeroUpload} />
                </label>
                {config.hero_image_url && (
                  <button onClick={() => onUpdate({ hero_image_url: null })} className="text-sm text-red-500 hover:text-red-700">Remove</button>
                )}
              </div>
            </div>
          </Field>
          <Field label="Hero Image — Mobile">
            <p className="text-xs text-gray-400 mb-2">Recommended: 750×900 px (portrait, 5:6). If not set, desktop image is used.</p>
            <div className="flex flex-col gap-2">
              {config.hero_image_url_mobile && (
                <img src={config.hero_image_url_mobile} alt="Hero Mobile" className="w-32 h-24 object-cover rounded-lg border border-gray-200" />
              )}
              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors">
                  {heroMobileUploading ? 'Uploading…' : config.hero_image_url_mobile ? 'Replace' : 'Upload Image'}
                  <input ref={heroMobileInputRef} type="file" accept="image/*" className="hidden" onChange={onHeroMobileUpload} />
                </label>
                {config.hero_image_url_mobile && (
                  <button onClick={() => onUpdate({ hero_image_url_mobile: null })} className="text-sm text-red-500 hover:text-red-700">Remove</button>
                )}
              </div>
            </div>
          </Field>
        </Card>
      )}

      {config.hero_type !== 'none' && (
        <Card>
          <Field label="Title">
            <TextInput value={config.hero_title ?? ''} onChange={v => onUpdate({ hero_title: v })} placeholder="Welcome to our shop" />
          </Field>
          <Field label="Subtitle">
            <textarea
              value={config.hero_subtitle ?? ''}
              onChange={e => onUpdate({ hero_subtitle: e.target.value })}
              placeholder={'Earn points,\nredeem swag'}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </Field>
          <Field label="Alignment">
            <SegmentedControl
              value={config.hero_align}
              options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
              onChange={v => onUpdate({ hero_align: v })}
            />
          </Field>
          <Field label="Height (desktop)">
            <SegmentedControl
              value={config.hero_height}
              options={[{ value: 'S', label: 'S' }, { value: 'M', label: 'M' }, { value: 'L', label: 'L' }, { value: 'full', label: 'Full' }]}
              onChange={v => onUpdate({ hero_height: v })}
            />
          </Field>
          <Field label="Height (mobile)">
            <SegmentedControl
              value={config.hero_height_mobile ?? ''}
              options={[{ value: '', label: 'Auto' }, { value: 'M', label: 'M' }, { value: 'L', label: 'L' }]}
              onChange={v => onUpdate({ hero_height_mobile: v === '' ? null : v as 'S' | 'M' | 'L' | 'full' })}
            />
          </Field>
        </Card>
      )}

      {config.hero_type !== 'none' && (
        <Card>
          <Toggle
            checked={config.hero_button_enabled ?? false}
            onChange={v => onUpdate({ hero_button_enabled: v })}
            label="Show scroll-to-catalog button"
          />
          {config.hero_button_enabled && (
            <Field label="Button label">
              <TextInput
                value={config.hero_button_label ?? ''}
                onChange={v => onUpdate({ hero_button_label: v })}
                placeholder="Shop Now"
              />
            </Field>
          )}
        </Card>
      )}
    </div>
  )
}

// Visual
function VisualSection({ config, onUpdate }: { config: ShopConfig; onUpdate: (p: Partial<ShopConfig>) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <ColorPicker label="Primary Color" hint="Buttons, price badges, active states" value={config.primary_color} onChange={v => onUpdate({ primary_color: v })} />
        <ColorPicker label="Background Color" hint="Page and catalog background" value={config.background_color} onChange={v => onUpdate({ background_color: v })} />
        <ColorPicker label="Text Color" hint="Main body text across the shop" value={config.text_color} onChange={v => onUpdate({ text_color: v })} />
      </Card>
      <Card>
        <Field label="Font">
          <div className="grid grid-cols-3 gap-2">
            {FONTS.map(f => (
              <button
                key={f}
                onClick={() => onUpdate({ font: f })}
                className={`px-3 py-2 rounded-lg border text-sm transition-colors ${config.font === f ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-300 hover:border-gray-400'}`}
                style={{ fontFamily: FONT_FAMILIES[f] }}
              >
                {f}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Button Style">
          <SegmentedControl
            value={config.button_radius}
            options={[{ value: 'sharp', label: 'Sharp' }, { value: 'soft', label: 'Soft' }, { value: 'round', label: 'Round' }]}
            onChange={v => onUpdate({ button_radius: v })}
          />
        </Field>
        <Field label="Product Card Style">
          <SegmentedControl
            value={config.card_radius}
            options={[{ value: 'sharp', label: 'Sharp' }, { value: 'soft', label: 'Soft' }, { value: 'round', label: 'Round' }]}
            onChange={v => onUpdate({ card_radius: v })}
          />
        </Field>
      </Card>
    </div>
  )
}

// Catalog
function CatalogSection({
  config, onUpdate, categories, shopProducts, inventory,
  newCategoryName, setNewCategoryName,
  editingCategory, setEditingCategory, editingCategoryName, setEditingCategoryName,
  onAddCategory, onDeleteCategory, onSaveCategory, onMoveCategoryUp, onMoveCategoryDown,
  onToggleProductCategory,
  sets,
  onToggleSetCategory,
}: {
  config: ShopConfig; onUpdate: (p: Partial<ShopConfig>) => void
  categories: Category[]; shopProducts: ShopProduct[]; inventory: InventoryItem[]
  sets: ProductSet[]
  newCategoryName: string; setNewCategoryName: (v: string) => void
  editingCategory: string | null; setEditingCategory: (v: string | null) => void
  editingCategoryName: string; setEditingCategoryName: (v: string) => void
  onAddCategory: () => void; onDeleteCategory: (id: string) => void
  onSaveCategory: (id: string, name: string) => void
  onMoveCategoryUp: (index: number) => void
  onMoveCategoryDown: (index: number) => void
  onToggleProductCategory: (inventoryId: string, categoryId: string, checked: boolean) => void
  onToggleSetCategory: (setId: string, categoryId: string, checked: boolean) => void
}) {
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <Field label="Listing columns (desktop)">
          <SegmentedControl
            value={String(config.listing_columns) as '3' | '4'}
            options={[{ value: '3', label: '3 columns' }, { value: '4', label: '4 columns' }]}
            onChange={v => onUpdate({ listing_columns: parseInt(v) })}
          />
        </Field>
        <Field label="Listing columns (mobile)">
          <SegmentedControl
            value={String(config.listing_columns_mobile ?? '')}
            options={[{ value: '', label: 'Auto' }, { value: '1', label: '1 column' }, { value: '2', label: '2 columns' }]}
            onChange={v => onUpdate({ listing_columns_mobile: v === '' ? null : parseInt(v) })}
          />
        </Field>
        <Toggle checked={config.categories_enabled} onChange={v => onUpdate({ categories_enabled: v })} label="Enable categories" />
        {config.categories_enabled && (
          <Field label="Category bar alignment">
            <SegmentedControl
              value={config.categories_align}
              options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }]}
              onChange={v => onUpdate({ categories_align: v })}
            />
          </Field>
        )}
      </Card>

      {config.categories_enabled && (
        <Card>
          <h3 className="font-medium text-gray-900">Categories</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              placeholder="New category name"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={e => e.key === 'Enter' && onAddCategory()}
            />
            <button onClick={onAddCategory} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              Add
            </button>
          </div>
          {categories.length === 0 && <p className="text-sm text-gray-400">No categories yet.</p>}
          {categories.map((cat, index) => (
            <div key={cat.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              {/* Sort buttons */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => onMoveCategoryUp(index)}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-20 leading-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => onMoveCategoryDown(index)}
                  disabled={index === categories.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-20 leading-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {editingCategory === cat.id ? (
                <>
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={e => setEditingCategoryName(e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') onSaveCategory(cat.id, editingCategoryName) }}
                  />
                  <button onClick={() => onSaveCategory(cat.id, editingCategoryName)} className="text-sm text-indigo-600 hover:underline">Save</button>
                  <button onClick={() => setEditingCategory(null)} className="text-sm text-gray-400 hover:underline">Cancel</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{cat.name}</span>
                  <button onClick={() => { setEditingCategory(cat.id); setEditingCategoryName(cat.name) }} className="text-sm text-gray-500 hover:text-indigo-600">Rename</button>
                  <button onClick={() => onDeleteCategory(cat.id)} className="text-sm text-red-500 hover:text-red-700">Delete</button>
                </>
              )}
            </div>
          ))}

          {/* Assign products to multiple categories */}
          {(inventory.length > 0 || sets.length > 0) && categories.length > 0 && (
            <>
              <h4 className="font-medium text-gray-700 text-sm pt-2">Assign products to categories</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200">
                      <th className="pb-2 font-medium text-gray-600">Product</th>
                      {categories.map(c => (
                        <th key={c.id} className="pb-2 font-medium text-gray-600 text-center px-2 whitespace-nowrap">{c.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventory.map(item => {
                      const sp = shopProducts.find(p => p.inventory_id === item.id)
                      const assigned = sp?.category_ids ?? []
                      return (
                        <tr key={item.id}>
                          <td className="py-2 pr-4 text-gray-700">{item.name}</td>
                          {categories.map(cat => (
                            <td key={cat.id} className="py-2 text-center px-2">
                              <input
                                type="checkbox"
                                checked={assigned.includes(cat.id)}
                                disabled={!sp}
                                onChange={e => onToggleProductCategory(item.id, cat.id, e.target.checked)}
                                className="w-4 h-4 accent-indigo-600 cursor-pointer disabled:opacity-30"
                              />
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                    {sets.map(set => {
                      const sp = shopProducts.find(p => p.set_id === set.id)
                      const assigned = sp?.category_ids ?? []
                      return (
                        <tr key={set.id} className="bg-indigo-50/40">
                          <td className="py-2 pr-4 text-gray-700 flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded">SET</span>
                            {set.name}
                          </td>
                          {categories.map(cat => (
                            <td key={cat.id} className="py-2 text-center px-2">
                              <input
                                type="checkbox"
                                checked={assigned.includes(cat.id)}
                                disabled={!sp}
                                onChange={e => onToggleSetCategory(set.id, cat.id, e.target.checked)}
                                className="w-4 h-4 accent-indigo-600 cursor-pointer disabled:opacity-30"
                              />
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  )
}

// Inventory
function InventorySection({ inventory, sets, shopProducts, onTogglePublished, onUpdatePrice, onToggleSetPublished, onUpdateSetPrice, onMoveProduct }: {
  inventory: InventoryItem[]
  sets: ProductSet[]
  shopProducts: ShopProduct[]
  onTogglePublished: (inventoryId: string, checked: boolean) => void
  onUpdatePrice: (inventoryId: string, price: number) => void
  onToggleSetPublished: (setId: string, checked: boolean) => void
  onUpdateSetPrice: (setId: string, price: number) => void
  onMoveProduct: (shopProductId: string, direction: 'up' | 'down') => void
}) {
  // Build unified sorted list: [{type, id, sp}]
  type Row = { type: 'item'; item: InventoryItem; sp: ShopProduct | undefined } | { type: 'set'; set: ProductSet; sp: ShopProduct | undefined }

  const rows: Row[] = [
    ...inventory.map(item => ({ type: 'item' as const, item, sp: shopProducts.find(p => p.inventory_id === item.id) })),
    ...sets.map(set => ({ type: 'set' as const, set, sp: shopProducts.find(p => p.set_id === set.id) })),
  ]
  const withSp = rows.filter(r => r.sp).sort((a, b) => (a.sp!.sort_order ?? 0) - (b.sp!.sort_order ?? 0))
  const withoutSp = rows.filter(r => !r.sp)
  const ordered = [...withSp, ...withoutSp]

  function SortButtons({ row, index }: { row: Row; index: number }) {
    const spId = row.sp?.id
    return (
      <div className="flex flex-col gap-0.5">
        <button onClick={() => spId && onMoveProduct(spId, 'up')} disabled={!spId || index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-20 leading-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        </button>
        <button onClick={() => spId && onMoveProduct(spId, 'down')} disabled={!spId || index === ordered.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-20 leading-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
    )
  }

  function Toggle({ checked, onClick }: { checked: boolean; onClick: () => void }) {
    return (
      <div onClick={onClick} className={`relative w-10 h-6 rounded-full cursor-pointer transition-colors mx-auto ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}>
        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
    )
  }

  return (
    <Card>
      {ordered.length === 0 && <p className="text-sm text-gray-400">No items found. Add inventory or sets directly in Supabase.</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200">
              <th className="pb-2 font-medium text-gray-600 w-8"></th>
              <th className="pb-2 font-medium text-gray-600">Item</th>
              <th className="pb-2 font-medium text-gray-600 w-32">Points Price</th>
              <th className="pb-2 font-medium text-gray-600 w-28 text-center">Stock</th>
              <th className="pb-2 font-medium text-gray-600 w-24 text-center">Published</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ordered.map((row, index) => {
              if (row.type === 'item') {
                const { item, sp } = row
                return (
                  <tr key={`item-${item.id}`}>
                    <td className="py-3 pr-2"><SortButtons row={row} index={index} /></td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        {item.images?.[0] && <img src={item.images[0]} alt={item.name} className="h-16 w-16 object-cover rounded-lg border border-gray-200 shrink-0" />}
                        <div className="font-medium text-gray-900">{item.name}</div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <input type="number" min={0} value={sp?.points_price ?? 100}
                        onChange={e => onUpdatePrice(item.id, parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3 text-center"><StockBadge item={item} /></td>
                    <td className="py-3 text-center">
                      <Toggle checked={sp?.published ?? false} onClick={() => onTogglePublished(item.id, !(sp?.published ?? false))} />
                    </td>
                  </tr>
                )
              } else {
                const { set, sp } = row
                const itemImages = (set.set_items ?? [])
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map(si => si.inventory?.images?.[0])
                  .filter(Boolean) as string[]
                const itemNames = (set.set_items ?? []).map(si => si.inventory?.name).filter(Boolean).join(', ')
                return (
                  <tr key={`set-${set.id}`} className="bg-indigo-50/40">
                    <td className="py-3 pr-2"><SortButtons row={row} index={index} /></td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        {/* Mini image collage */}
                        <div className="shrink-0 w-16 h-16 grid grid-cols-2 gap-0.5 rounded-lg overflow-hidden border border-indigo-200">
                          {[0,1,2,3].map(i => (
                            <div key={i} className="bg-indigo-100">
                              {itemImages[i] && <img src={itemImages[i]} className="w-full h-full object-cover" alt="" />}
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold px-1.5 py-0.5 bg-indigo-600 text-white rounded">SET</span>
                            <span className="font-medium text-gray-900">{set.name}</span>
                          </div>
                          {itemNames && <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{itemNames}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <input type="number" min={0} value={sp?.points_price ?? 100}
                        onChange={e => onUpdateSetPrice(set.id, parseInt(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="py-3 text-center"><span className="text-gray-300 text-xs">—</span></td>
                    <td className="py-3 text-center">
                      <Toggle checked={sp?.published ?? false} onClick={() => onToggleSetPublished(set.id, !(sp?.published ?? false))} />
                    </td>
                  </tr>
                )
              }
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function StockBadge({ item }: { item: InventoryItem }) {
  const isSized = item.sizes && item.sizes.length > 0

  if (isSized) {
    const bySize = item.stock_by_size ?? {}
    const total = Object.values(bySize).reduce((sum, n) => sum + n, 0)
    const tooltip = item.sizes!
      .map(s => `${s}: ${bySize[s] ?? 0}`)
      .join('\n')
    const color = total === 0 ? 'text-red-500 bg-red-50' : total <= 5 ? 'text-amber-600 bg-amber-50' : 'text-green-700 bg-green-50'
    return (
      <span title={tooltip} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium cursor-default ${color}`}>
        {total}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
        </svg>
      </span>
    )
  }

  if (item.stock !== null) {
    const color = item.stock === 0 ? 'text-red-500 bg-red-50' : item.stock <= 5 ? 'text-amber-600 bg-amber-50' : 'text-green-700 bg-green-50'
    return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>{item.stock}</span>
  }

  return <span className="text-gray-300 text-xs">—</span>
}

// Product Card
function ProductCardSection({ config, onUpdate, inventory, onUpdateDescription }: {
  config: ShopConfig
  onUpdate: (p: Partial<ShopConfig>) => void
  inventory: InventoryItem[]
  onUpdateDescription: (id: string, desc: string) => Promise<void>
}) {
  const [descriptions, setDescriptions] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const map: Record<string, string> = {}
    inventory.forEach(item => { map[item.id] = item.description ?? '' })
    setDescriptions(map)
  }, [inventory])

  async function saveDescription(id: string) {
    setSaving(prev => ({ ...prev, [id]: true }))
    await onUpdateDescription(id, descriptions[id] ?? '')
    setSaving(prev => ({ ...prev, [id]: false }))
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <Toggle
          checked={config.product_card_show_description !== false}
          onChange={v => onUpdate({ product_card_show_description: v })}
          label="Show description in product detail card"
        />
        <Toggle
          checked={config.product_card_show_mockup !== false}
          onChange={v => onUpdate({ product_card_show_mockup: v })}
          label="Show mockup button in product detail card"
        />
      </Card>
      <Card>
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-gray-800 text-sm">Product descriptions</h3>
          <p className="text-xs text-gray-500">Shown in the detail card when description is enabled.</p>
        </div>
        {inventory.length === 0 && (
          <p className="text-sm text-gray-400">No inventory items yet.</p>
        )}
        <div className="flex flex-col gap-5">
          {inventory.map(item => (
            <div key={item.id} className="flex flex-col gap-2">
              <div className="text-sm font-medium text-gray-700">{item.name}</div>
              <textarea
                value={descriptions[item.id] ?? ''}
                onChange={e => setDescriptions(prev => ({ ...prev, [item.id]: e.target.value }))}
                rows={2}
                placeholder="No description"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => saveDescription(item.id)}
                  disabled={saving[item.id]}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {saving[item.id] ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// Footer
function FooterSection({ config, onUpdate }: { config: ShopConfig; onUpdate: (p: Partial<ShopConfig>) => void }) {
  return (
    <Card>
      <ColorPicker label="Background Color" value={config.footer_color} onChange={v => onUpdate({ footer_color: v })} />
      <ColorPicker label="Text Color" value={config.footer_text_color} onChange={v => onUpdate({ footer_text_color: v })} />
      <Field label="Tagline">
        <TextInput value={config.footer_tagline ?? ''} onChange={v => onUpdate({ footer_tagline: v })} placeholder="Quality swag for your team" />
      </Field>
      <Field label="Support Email">
        <TextInput value={config.footer_email ?? ''} onChange={v => onUpdate({ footer_email: v })} placeholder="support@company.com" />
      </Field>
    </Card>
  )
}
