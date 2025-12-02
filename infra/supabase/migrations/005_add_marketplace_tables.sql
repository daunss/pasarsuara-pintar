-- Phase 5: Marketplace Features
-- Add tables for B2B marketplace functionality

-- 1. Seller Profiles Table
CREATE TABLE IF NOT EXISTS seller_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    business_name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    verification_status TEXT DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verification_date TIMESTAMP WITH TIME ZONE,
    business_hours JSONB DEFAULT '{}'::jsonb,
    delivery_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
    min_order_amount DECIMAL(15,2) DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
    total_sales INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Product Listings Table
CREATE TABLE IF NOT EXISTS product_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
    product_catalog_id UUID REFERENCES product_catalog(id),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price DECIMAL(15,2) NOT NULL CHECK (price >= 0),
    unit TEXT NOT NULL,
    min_order_qty INTEGER DEFAULT 1 CHECK (min_order_qty > 0),
    stock_qty INTEGER NOT NULL CHECK (stock_qty >= 0),
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    bulk_pricing JSONB DEFAULT '[]'::jsonb,
    listing_status TEXT DEFAULT 'ACTIVE' CHECK (listing_status IN ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'INACTIVE')),
    views_count INTEGER DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
    order_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')),
    subtotal DECIMAL(15,2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee DECIMAL(15,2) DEFAULT 0 CHECK (delivery_fee >= 0),
    total_amount DECIMAL(15,2) NOT NULL CHECK (total_amount >= 0),
    delivery_address TEXT,
    delivery_notes TEXT,
    estimated_delivery DATE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES product_listings(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(15,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(15,2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES seller_profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    seller_response TEXT,
    response_date TIMESTAMP WITH TIME ZONE,
    is_verified_purchase BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_id, buyer_id)
);

-- 6. Order Status History Table (for tracking)
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seller_profiles_user ON seller_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_active ON seller_profiles(is_active, verification_status);
CREATE INDEX IF NOT EXISTS idx_product_listings_seller ON product_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_product_listings_status ON product_listings(listing_status);
CREATE INDEX IF NOT EXISTS idx_product_listings_category ON product_listings(category);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_listing ON order_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_seller ON reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_buyer ON reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id, created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Sellers can manage their own data, buyers can view
CREATE POLICY seller_profiles_policy ON seller_profiles
    FOR ALL 
    USING (user_id = auth.uid() OR user_id = '11111111-1111-1111-1111-111111111111');

CREATE POLICY product_listings_seller_policy ON product_listings
    FOR ALL 
    USING (
        seller_id IN (
            SELECT id FROM seller_profiles WHERE user_id = auth.uid() OR user_id = '11111111-1111-1111-1111-111111111111'
        )
    );

CREATE POLICY product_listings_public_read ON product_listings
    FOR SELECT
    USING (listing_status = 'ACTIVE');

CREATE POLICY orders_buyer_policy ON orders
    FOR ALL 
    USING (buyer_id = auth.uid() OR buyer_id = '11111111-1111-1111-1111-111111111111');

CREATE POLICY orders_seller_policy ON orders
    FOR SELECT
    USING (
        seller_id IN (
            SELECT id FROM seller_profiles WHERE user_id = auth.uid() OR user_id = '11111111-1111-1111-1111-111111111111'
        )
    );

CREATE POLICY order_items_policy ON order_items
    FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders 
            WHERE buyer_id = auth.uid() 
               OR buyer_id = '11111111-1111-1111-1111-111111111111'
               OR seller_id IN (
                   SELECT id FROM seller_profiles WHERE user_id = auth.uid() OR user_id = '11111111-1111-1111-1111-111111111111'
               )
        )
    );

CREATE POLICY reviews_policy ON reviews
    FOR ALL
    USING (
        buyer_id = auth.uid() 
        OR buyer_id = '11111111-1111-1111-1111-111111111111'
        OR seller_id IN (
            SELECT id FROM seller_profiles WHERE user_id = auth.uid() OR user_id = '11111111-1111-1111-1111-111111111111'
        )
    );

CREATE POLICY reviews_public_read ON reviews
    FOR SELECT
    USING (is_visible = true);

CREATE POLICY order_status_history_policy ON order_status_history
    FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders 
            WHERE buyer_id = auth.uid() 
               OR buyer_id = '11111111-1111-1111-1111-111111111111'
               OR seller_id IN (
                   SELECT id FROM seller_profiles WHERE user_id = auth.uid() OR user_id = '11111111-1111-1111-1111-111111111111'
               )
        )
    );

-- Add updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_seller_profiles_updated_at BEFORE UPDATE ON seller_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_listings_updated_at BEFORE UPDATE ON product_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
BEGIN
    new_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update seller rating
CREATE OR REPLACE FUNCTION update_seller_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE seller_profiles
    SET 
        avg_rating = (
            SELECT AVG(rating)::DECIMAL(3,2)
            FROM reviews
            WHERE seller_id = NEW.seller_id AND is_visible = true
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE seller_id = NEW.seller_id AND is_visible = true
        )
    WHERE id = NEW.seller_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update seller rating
CREATE TRIGGER update_seller_rating_trigger
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_seller_rating();

-- Function to update listing stock after order
CREATE OR REPLACE FUNCTION update_listing_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE product_listings
    SET 
        stock_qty = stock_qty - NEW.quantity,
        orders_count = orders_count + 1
    WHERE id = NEW.listing_id;
    
    -- Update status if sold out
    UPDATE product_listings
    SET listing_status = 'SOLD_OUT'
    WHERE id = NEW.listing_id AND stock_qty <= 0;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update stock
CREATE TRIGGER update_listing_stock_trigger
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_stock();
