-- ============================================================================
-- Migration: 20261105_fix_and_apply_missing_features.sql
-- Description: Consolidated, corrected migration for PasarSuara Pintar
-- Includes:
--   1. Fix transactions table (customer_name, customer_phone, payment_status)
--   2. Customer management (customers table, customer_transactions view, get_customer_list RPC)
--   3. Notification center & error logs (notifications, error_logs, safe RLS)
--   4. Marketplace sync logs & payment reconciliations (inventory_sync_logs, payment_reconciliations)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND TRANSACTIONS TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PAID';
CREATE INDEX IF NOT EXISTS idx_transactions_customer_phone ON transactions(customer_phone);

-- ----------------------------------------------------------------------------
-- 2. CUSTOMER MANAGEMENT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_tags ON customers USING GIN(tags);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can view their own customers') THEN
    CREATE POLICY "Users can view their own customers" ON customers FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can insert their own customers') THEN
    CREATE POLICY "Users can insert their own customers" ON customers FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can update their own customers') THEN
    CREATE POLICY "Users can update their own customers" ON customers FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can delete their own customers') THEN
    CREATE POLICY "Users can delete their own customers" ON customers FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- View for customer stats & analytics
CREATE OR REPLACE VIEW customer_transactions AS
SELECT 
  c.id as customer_id,
  c.user_id,
  c.name,
  c.phone,
  c.email,
  COUNT(t.id) as total_transactions,
  COALESCE(SUM(CASE WHEN t.type = 'SALE' THEN t.total_amount ELSE 0 END), 0) as total_spent,
  MAX(t.created_at) as last_transaction_date,
  c.created_at,
  c.tags
FROM customers c
LEFT JOIN transactions t ON t.customer_phone = c.phone AND t.user_id = c.user_id
GROUP BY c.id, c.user_id, c.name, c.phone, c.email, c.created_at, c.tags;

-- RPC: get_customer_list (required by /dashboard/customers)
CREATE OR REPLACE FUNCTION get_customer_list(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  total_transactions BIGINT,
  total_spent NUMERIC,
  last_transaction_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.customer_id,
    ct.name,
    ct.phone,
    ct.email,
    ct.total_transactions,
    ct.total_spent,
    ct.last_transaction_date,
    ct.created_at,
    ct.tags
  FROM customer_transactions ct
  WHERE ct.user_id = p_user_id
  ORDER BY ct.last_transaction_date DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: get_customer_details
CREATE OR REPLACE FUNCTION get_customer_details(p_customer_id UUID, p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  phone VARCHAR,
  email VARCHAR,
  address TEXT,
  notes TEXT,
  tags TEXT[],
  total_transactions BIGINT,
  total_spent NUMERIC,
  avg_transaction NUMERIC,
  last_transaction_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.email,
    c.address,
    c.notes,
    c.tags,
    COUNT(t.id) as total_transactions,
    COALESCE(SUM(CASE WHEN t.type = 'SALE' THEN t.total_amount ELSE 0 END), 0) as total_spent,
    COALESCE(AVG(CASE WHEN t.type = 'SALE' THEN t.total_amount ELSE NULL END), 0) as avg_transaction,
    MAX(t.created_at) as last_transaction_date,
    c.created_at
  FROM customers c
  LEFT JOIN transactions t ON t.customer_phone = c.phone AND t.user_id = c.user_id
  WHERE c.id = p_customer_id AND c.user_id = p_user_id
  GROUP BY c.id, c.name, c.phone, c.email, c.address, c.notes, c.tags, c.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: get_customer_purchase_history
CREATE OR REPLACE FUNCTION get_customer_purchase_history(
  p_customer_id UUID,
  p_user_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  type VARCHAR,
  product_name VARCHAR,
  qty DECIMAL,
  price_per_unit DECIMAL,
  total_amount DECIMAL,
  payment_status VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.type,
    t.product_name,
    t.qty,
    t.price_per_unit,
    t.total_amount,
    COALESCE(t.payment_status, 'PAID')::VARCHAR,
    t.created_at
  FROM transactions t
  JOIN customers c ON c.phone = t.customer_phone AND c.user_id = t.user_id
  WHERE c.id = p_customer_id AND c.user_id = p_user_id
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3. NOTIFICATIONS & ERROR LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  user_message TEXT,
  details JSONB,
  stack TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  url TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(type);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can view their own notifications') THEN
    CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Users can update their own notifications') THEN
    CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'System can insert notifications') THEN
    CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'error_logs' AND policyname = 'Anyone can insert error logs') THEN
    CREATE POLICY "Anyone can insert error logs" ON error_logs FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'error_logs' AND policyname = 'Admins can view error logs') THEN
    CREATE POLICY "Admins can view error logs" ON error_logs FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. INVENTORY MARKETPLACE SYNC & PAYMENT RECONCILIATIONS
-- ----------------------------------------------------------------------------
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS marketplace_synced BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS marketplace_product_id VARCHAR(255);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sync_error TEXT;

CREATE TABLE IF NOT EXISTS inventory_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  details JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  payment_provider VARCHAR(50) NOT NULL,
  payment_reference VARCHAR(255),
  expected_amount DECIMAL(15,2) NOT NULL,
  received_amount DECIMAL(15,2),
  status VARCHAR(50) NOT NULL,
  discrepancy_reason TEXT,
  reconciled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_sync_logs_inventory_id ON inventory_sync_logs(inventory_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliations_transaction_id ON payment_reconciliations(transaction_id);

ALTER TABLE inventory_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_sync_logs' AND policyname = 'Users can view sync logs for their inventory') THEN
    CREATE POLICY "Users can view sync logs for their inventory" ON inventory_sync_logs FOR SELECT USING (
      EXISTS (SELECT 1 FROM inventory WHERE inventory.id = inventory_sync_logs.inventory_id AND inventory.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_reconciliations' AND policyname = 'Users can view reconciliations for their transactions') THEN
    CREATE POLICY "Users can view reconciliations for their transactions" ON payment_reconciliations FOR SELECT USING (
      EXISTS (SELECT 1 FROM transactions WHERE transactions.id = payment_reconciliations.transaction_id AND transactions.user_id = auth.uid())
    );
  END IF;
END $$;

