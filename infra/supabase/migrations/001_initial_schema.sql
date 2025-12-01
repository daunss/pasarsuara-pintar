-- ===========================================
-- PasarSuara Pintar - Initial Schema
-- ===========================================

-- Enable PostGIS extension for location support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users & Profiles table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  phone_number VARCHAR(20) UNIQUE,
  name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'umkm',
  preferred_dialect VARCHAR(20) DEFAULT 'id',
  location GEOGRAPHY(POINT),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory & Products table
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_name VARCHAR(100) NOT NULL,
  stock_qty NUMERIC(10, 2) DEFAULT 0,
  unit VARCHAR(20) DEFAULT 'kg',
  min_sell_price NUMERIC(15, 2),
  max_buy_price NUMERIC(15, 2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (Ledger) table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('SALE', 'PURCHASE', 'EXPENSE')),
  product_name VARCHAR(100),
  qty NUMERIC(10, 2),
  price_per_unit NUMERIC(15, 2),
  total_amount NUMERIC(15, 2),
  raw_voice_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Negotiation Logs (Agent History) table
CREATE TABLE public.negotiation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  product_name VARCHAR(100),
  initial_offer NUMERIC(15, 2),
  final_price NUMERIC(15, 2),
  status VARCHAR(20) CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED')),
  transcript JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_users_phone ON public.users(phone_number);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_inventory_user ON public.inventory(user_id);
CREATE INDEX idx_inventory_product ON public.inventory(product_name);
CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);
CREATE INDEX idx_negotiation_buyer ON public.negotiation_logs(buyer_id);
CREATE INDEX idx_negotiation_seller ON public.negotiation_logs(seller_id);
CREATE INDEX idx_negotiation_status ON public.negotiation_logs(status);

-- Comments
COMMENT ON TABLE public.users IS 'UMKM users - warung, petani, pedagang pasar';
COMMENT ON TABLE public.inventory IS 'Product inventory for each UMKM user';
COMMENT ON TABLE public.transactions IS 'Financial ledger - sales, purchases, expenses';
COMMENT ON TABLE public.negotiation_logs IS 'AI agent negotiation history between buyers and sellers';
