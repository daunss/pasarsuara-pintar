-- Add city column for matching supplier by buyer city
ALTER TABLE users
ADD COLUMN IF NOT EXISTS city TEXT;

-- Supplier offers table for manual supplier pricing
CREATE TABLE IF NOT EXISTS supplier_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  supplier_phone TEXT NOT NULL,
  city TEXT,
  product_name TEXT NOT NULL,
  unit TEXT,
  price NUMERIC NOT NULL,
  min_qty NUMERIC,
  max_qty NUMERIC,
  stock_qty NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_offers_owner ON supplier_offers(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_offers_product ON supplier_offers(product_name);
CREATE INDEX IF NOT EXISTS idx_supplier_offers_price ON supplier_offers(price);
CREATE INDEX IF NOT EXISTS idx_supplier_offers_city ON supplier_offers(city);
