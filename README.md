# Swag42

A Swag Shop platform built with Next.js 14, Supabase, and Tailwind CSS.

- `/admin` — admin panel to configure the shop and manage inventory
- `/shop` — public-facing shop page

## Setup

### 1. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Supabase tables

Run the following SQL in your Supabase SQL editor:

```sql
-- Enable UUID extension
create extension if not exists "pgcrypto";

-- inventory
create table inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  mockup_url text,
  images text[],
  created_at timestamptz default now()
);

-- shop_config
create table shop_config (
  id uuid primary key default gen_random_uuid(),
  store_name text not null default 'My Swag Shop',
  logo_url text,
  header_sticky boolean default true,
  header_transparent_scroll boolean default false,
  header_color text default '#1E1B4B',
  hero_type text default 'none',
  hero_image_url text,
  hero_gradient_from text default '#4F46E5',
  hero_gradient_to text default '#7C3AED',
  hero_title text,
  hero_subtitle text,
  hero_align text default 'center',
  hero_height text default 'M',
  primary_color text default '#4F46E5',
  background_color text default '#FFFFFF',
  text_color text default '#1a1a1a',
  font text default 'Inter',
  button_radius text default 'soft',
  categories_enabled boolean default false,
  categories_align text default 'left',
  listing_columns integer default 3,
  footer_tagline text,
  footer_email text,
  footer_color text default '#1E1B4B',
  footer_text_color text default '#ffffff',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- categories
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- shop_products
create table shop_products (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid references inventory(id) on delete cascade,
  points_price integer not null default 100,
  published boolean default false,
  category uuid references categories(id) on delete set null,
  sort_order integer default 0,
  created_at timestamptz default now()
);
```

> Note: `shop_products.category` stores a UUID referencing `categories.id`. The schema above adjusts the column type from `text` to `uuid` to enforce the FK constraint.

### 3. Supabase Storage

Create a public storage bucket named **`shop-assets`** in your Supabase dashboard (Storage → New bucket → name: `shop-assets`, Public: on).

### 4. Row Level Security (RLS)

For development you can disable RLS on all four tables, or add policies allowing anon reads and writes. In production, scope write access to authenticated admins.

### 5. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

