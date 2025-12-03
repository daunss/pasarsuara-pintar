-- Migration: Add missing tables for production readiness
-- Date: 2024-12-03
-- Description: Creates product_catalog, contacts, payment_records, and audit_logs tables

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: product_catalog
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  default_price DECIMAL(15,2),
  default_unit TEXT,
  image_url TEXT,
  sku TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for product_catalog
CREATE INDEX IF NOT EXISTS idx_product_catalog_user_id ON product_catalog(user_id);
CREATE INDEX IF NOT EXISTS idx_product_catalog_sku ON product_catalog(sku);
CREATE INDEX IF NOT EXISTS idx_product_catalog_is_active ON product_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_product_catalog_category ON product_catalog(category);

-- ============================================================================
-- TABLE: contacts
-- ============================================================================
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('SUPPLIER', 'CUSTOMER')),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  total_transactions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_is_active ON contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- ============================================================================
-- TABLE: payment_records
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('CASH', 'TRANSFER', 'CREDIT', 'DEBIT', 'EWALLET')),
  status TEXT NOT NULL CHECK (status IN ('PAID', 'PENDING', 'PARTIAL', 'FAILED', 'REFUNDED')),
  reference_number TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for payment_records
CREATE INDEX IF NOT EXISTS idx_payment_records_transaction_id ON payment_records(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_status ON payment_records(status);
CREATE INDEX IF NOT EXISTS idx_payment_records_reference_number ON payment_records(reference_number);
CREATE INDEX IF NOT EXISTS idx_payment_records_paid_at ON payment_records(paid_at);

-- ============================================================================
-- TABLE: audit_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: product_catalog
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own products" ON product_catalog;
DROP POLICY IF EXISTS "Users can insert own products" ON product_catalog;
DROP POLICY IF EXISTS "Users can update own products" ON product_catalog;
DROP POLICY IF EXISTS "Users can delete own products" ON product_catalog;

-- Create policies
CREATE POLICY "Users can view own products" ON product_catalog
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products" ON product_catalog
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products" ON product_catalog
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" ON product_catalog
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: contacts
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;

-- Create policies
CREATE POLICY "Users can view own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: payment_records
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own payment records" ON payment_records;
DROP POLICY IF EXISTS "Users can insert own payment records" ON payment_records;
DROP POLICY IF EXISTS "Users can update own payment records" ON payment_records;
DROP POLICY IF EXISTS "Users can delete own payment records" ON payment_records;

-- Create policies
CREATE POLICY "Users can view own payment records" ON payment_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = payment_records.transaction_id 
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own payment records" ON payment_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = payment_records.transaction_id 
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own payment records" ON payment_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = payment_records.transaction_id 
      AND transactions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own payment records" ON payment_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM transactions 
      WHERE transactions.id = payment_records.transaction_id 
      AND transactions.user_id = auth.uid()
    )
  );

-- ============================================================================
-- RLS POLICIES: audit_logs
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;

-- Create policies (read-only for users)
CREATE POLICY "Users can view own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert audit logs (no RLS policy needed, service role bypasses RLS)

-- ============================================================================
-- TRIGGERS: Updated_at timestamps
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for product_catalog
DROP TRIGGER IF EXISTS update_product_catalog_updated_at ON product_catalog;
CREATE TRIGGER update_product_catalog_updated_at
  BEFORE UPDATE ON product_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for contacts
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for payment_records
DROP TRIGGER IF EXISTS update_payment_records_updated_at ON payment_records;
CREATE TRIGGER update_payment_records_updated_at
  BEFORE UPDATE ON payment_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE product_catalog IS 'Stores product catalog for users';
COMMENT ON TABLE contacts IS 'Stores supplier and customer contacts';
COMMENT ON TABLE payment_records IS 'Stores payment information for transactions';
COMMENT ON TABLE audit_logs IS 'Stores audit trail of all system actions';

-- ============================================================================
-- GRANTS (if needed for specific roles)
-- ============================================================================

-- Grant usage on tables to authenticated users (handled by RLS policies)
-- Service role has full access by default
