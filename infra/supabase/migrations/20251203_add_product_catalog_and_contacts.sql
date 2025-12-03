-- Migration: Add Product Catalog and Contacts Tables
-- Date: 2025-12-03
-- Description: Add tables for product catalog management and supplier/customer contacts

-- ============================================================================
-- 1. PRODUCT CATALOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Product Information
    product_name TEXT NOT NULL,
    sku TEXT,
    category TEXT,
    description TEXT,
    
    -- Pricing
    default_price DECIMAL(15, 2),
    cost_price DECIMAL(15, 2),
    unit TEXT DEFAULT 'unit',
    
    -- Inventory
    track_inventory BOOLEAN DEFAULT true,
    current_stock INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 10,
    max_stock_level INTEGER,
    
    -- Media
    image_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT product_catalog_user_sku_unique UNIQUE(user_id, sku)
);

-- Indexes for product_catalog
CREATE INDEX idx_product_catalog_user_id ON product_catalog(user_id);
CREATE INDEX idx_product_catalog_category ON product_catalog(category);
CREATE INDEX idx_product_catalog_is_active ON product_catalog(is_active);
CREATE INDEX idx_product_catalog_name_search ON product_catalog USING gin(to_tsvector('indonesian', product_name));

-- RLS Policies for product_catalog
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own products"
    ON product_catalog FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own products"
    ON product_catalog FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own products"
    ON product_catalog FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own products"
    ON product_catalog FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 2. CONTACTS TABLE (Suppliers & Customers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Contact Type
    type TEXT NOT NULL CHECK (type IN ('SUPPLIER', 'CUSTOMER', 'BOTH')),
    
    -- Basic Information
    name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT,
    email TEXT,
    
    -- Address
    address TEXT,
    city TEXT,
    province TEXT,
    postal_code TEXT,
    
    -- Business Details
    tax_id TEXT,
    payment_terms TEXT, -- e.g., "NET 30", "COD", "NET 15"
    credit_limit DECIMAL(15, 2),
    
    -- Preferences
    preferred_payment_method TEXT,
    notes TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_transaction_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for contacts
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_type ON contacts(type);
CREATE INDEX idx_contacts_is_active ON contacts(is_active);
CREATE INDEX idx_contacts_name_search ON contacts USING gin(to_tsvector('indonesian', name));

-- RLS Policies for contacts
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contacts"
    ON contacts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts"
    ON contacts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
    ON contacts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
    ON contacts FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 3. PAYMENT RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    
    -- Payment Details
    amount DECIMAL(15, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'TRANSFER', 'CREDIT', 'DEBIT', 'EWALLET', 'OTHER')),
    payment_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'PARTIAL', 'FAILED', 'REFUNDED')),
    
    -- Payment Information
    reference_number TEXT,
    bank_name TEXT,
    account_number TEXT,
    
    -- Dates
    payment_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for payment_records
CREATE INDEX idx_payment_records_user_id ON payment_records(user_id);
CREATE INDEX idx_payment_records_transaction_id ON payment_records(transaction_id);
CREATE INDEX idx_payment_records_status ON payment_records(payment_status);
CREATE INDEX idx_payment_records_date ON payment_records(payment_date);

-- RLS Policies for payment_records
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment records"
    ON payment_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment records"
    ON payment_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment records"
    ON payment_records FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment records"
    ON payment_records FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 4. AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Action Details
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', etc.
    entity_type TEXT NOT NULL, -- 'transaction', 'product', 'contact', etc.
    entity_id UUID,
    
    -- Data Changes
    old_data JSONB,
    new_data JSONB,
    
    -- Request Details
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS Policies for audit_logs (read-only for users)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
    ON audit_logs FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================================================
-- 5. UPDATE EXISTING TRANSACTIONS TABLE
-- ============================================================================
-- Add contact_id to transactions for supplier/customer tracking
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_contact_id ON transactions(contact_id);

-- Add category to transactions for auto-categorization
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- ============================================================================
-- 6. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_product_catalog_updated_at
    BEFORE UPDATE ON product_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_records_updated_at
    BEFORE UPDATE ON payment_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to log audit trail
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data)
        VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_data, new_data)
        VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_data)
        VALUES (auth.uid(), 'CREATE', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Audit triggers for important tables
CREATE TRIGGER audit_transactions
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_product_catalog
    AFTER INSERT OR UPDATE OR DELETE ON product_catalog
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_contacts
    AFTER INSERT OR UPDATE OR DELETE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

-- ============================================================================
-- 7. SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample categories
COMMENT ON COLUMN transactions.category IS 'Auto-categorized expense category: BAHAN_BAKU, OPERASIONAL, GAJI, TRANSPORTASI, LAINNYA';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
