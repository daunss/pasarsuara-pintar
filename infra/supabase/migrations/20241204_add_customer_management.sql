-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  tags TEXT[], -- Array of tags like ['VIP', 'Regular', 'Wholesale']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, phone)
);

-- Create customer_transactions view for analytics
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

-- Create indexes
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_tags ON customers USING GIN(tags);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own customers"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
  ON customers FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-create customer from transaction
CREATE OR REPLACE FUNCTION auto_create_customer_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_customer_name VARCHAR;
BEGIN
  -- Only process if customer_phone is provided
  IF NEW.customer_phone IS NOT NULL AND NEW.customer_phone != '' THEN
    -- Extract customer name from raw_voice_text or use phone as name
    v_customer_name := COALESCE(NEW.customer_name, NEW.customer_phone);
    
    -- Try to insert customer (will fail silently if already exists due to UNIQUE constraint)
    INSERT INTO customers (user_id, name, phone)
    VALUES (NEW.user_id, v_customer_name, NEW.customer_phone)
    ON CONFLICT (user_id, phone) DO UPDATE
    SET updated_at = NOW()
    RETURNING id INTO v_customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_customer
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_customer_from_transaction();

-- Function to get customer list with stats
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

-- Function to get customer details
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

-- Function to get customer purchase history
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
    t.payment_status,
    t.created_at
  FROM transactions t
  JOIN customers c ON c.phone = t.customer_phone AND c.user_id = t.user_id
  WHERE c.id = p_customer_id AND c.user_id = p_user_id
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add customer tag
CREATE OR REPLACE FUNCTION add_customer_tag(p_customer_id UUID, p_tag VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET tags = array_append(COALESCE(tags, ARRAY[]::TEXT[]), p_tag),
      updated_at = NOW()
  WHERE id = p_customer_id
  AND NOT (p_tag = ANY(COALESCE(tags, ARRAY[]::TEXT[])));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove customer tag
CREATE OR REPLACE FUNCTION remove_customer_tag(p_customer_id UUID, p_tag VARCHAR)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET tags = array_remove(tags, p_tag),
      updated_at = NOW()
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add customer_name and customer_phone to transactions if not exists
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);

-- Create index for customer lookup
CREATE INDEX IF NOT EXISTS idx_transactions_customer_phone ON transactions(customer_phone);
