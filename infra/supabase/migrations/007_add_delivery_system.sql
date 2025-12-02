-- Migration: Add delivery and shipping system
-- Created: 2025-12-02
-- Description: Add tables for delivery management, shipping rates, and tracking

-- Delivery providers table
CREATE TABLE IF NOT EXISTS delivery_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE, -- gosend, grabexpress, jne, jnt, sicepat, self_pickup
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  base_rate NUMERIC DEFAULT 0,
  per_km_rate NUMERIC DEFAULT 0,
  min_weight NUMERIC DEFAULT 0, -- in kg
  max_weight NUMERIC DEFAULT 100, -- in kg
  estimated_hours INTEGER DEFAULT 24, -- estimated delivery time in hours
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shipping rates by area
CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES delivery_providers(id) ON DELETE CASCADE,
  origin_city TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  rate NUMERIC NOT NULL CHECK (rate >= 0),
  estimated_days INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery tracking
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES delivery_providers(id),
  tracking_number TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED')
  ),
  pickup_address TEXT,
  delivery_address TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  delivery_notes TEXT,
  delivery_fee NUMERIC NOT NULL DEFAULT 0,
  weight NUMERIC, -- in kg
  dimensions JSONB, -- {length, width, height} in cm
  pickup_time TIMESTAMPTZ,
  estimated_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  proof_of_delivery_url TEXT, -- photo URL
  driver_name TEXT,
  driver_phone TEXT,
  driver_photo_url TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery status history
CREATE TABLE IF NOT EXISTS delivery_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking_number ON deliveries(tracking_number);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_delivery_status_history_delivery_id ON delivery_status_history(delivery_id);
CREATE INDEX IF NOT EXISTS idx_shipping_rates_cities ON shipping_rates(origin_city, destination_city);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_delivery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delivery_providers_updated_at
  BEFORE UPDATE ON delivery_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_updated_at();

CREATE TRIGGER deliveries_updated_at
  BEFORE UPDATE ON deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_updated_at();

-- RLS Policies
ALTER TABLE delivery_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_status_history ENABLE ROW LEVEL SECURITY;

-- Public can view active delivery providers
CREATE POLICY "Public can view delivery providers"
ON delivery_providers FOR SELECT
TO public
USING (is_active = true);

-- Public can view shipping rates
CREATE POLICY "Public can view shipping rates"
ON shipping_rates FOR SELECT
TO public
USING (is_active = true);

-- Users can view their own deliveries
CREATE POLICY "Users can view own deliveries"
ON deliveries FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT id FROM orders WHERE 
    buyer_id = auth.uid() OR
    seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid())
  )
);

-- Users can view delivery history for their deliveries
CREATE POLICY "Users can view delivery history"
ON delivery_status_history FOR SELECT
TO authenticated
USING (
  delivery_id IN (
    SELECT d.id FROM deliveries d
    JOIN orders o ON d.order_id = o.id
    WHERE o.buyer_id = auth.uid() OR
    o.seller_id IN (SELECT id FROM seller_profiles WHERE user_id = auth.uid())
  )
);

-- Insert default delivery providers
INSERT INTO delivery_providers (name, code, base_rate, per_km_rate, estimated_hours, description) VALUES
  ('GoSend', 'gosend', 15000, 2000, 2, 'Pengiriman instant dengan GoSend'),
  ('GrabExpress', 'grabexpress', 15000, 2000, 2, 'Pengiriman instant dengan GrabExpress'),
  ('JNE Regular', 'jne', 10000, 1000, 48, 'Pengiriman reguler JNE'),
  ('JNT Express', 'jnt', 9000, 1000, 48, 'Pengiriman reguler J&T'),
  ('SiCepat', 'sicepat', 9000, 1000, 48, 'Pengiriman reguler SiCepat'),
  ('Self Pickup', 'self_pickup', 0, 0, 0, 'Ambil sendiri di toko')
ON CONFLICT (code) DO NOTHING;

-- Insert sample shipping rates (Jakarta area)
INSERT INTO shipping_rates (provider_id, origin_city, destination_city, rate, estimated_days) 
SELECT 
  dp.id,
  'Jakarta',
  city,
  CASE 
    WHEN dp.code = 'gosend' THEN 20000
    WHEN dp.code = 'grabexpress' THEN 20000
    WHEN dp.code = 'jne' THEN 15000
    WHEN dp.code = 'jnt' THEN 12000
    WHEN dp.code = 'sicepat' THEN 12000
    ELSE 0
  END as rate,
  CASE 
    WHEN dp.code IN ('gosend', 'grabexpress') THEN 1
    ELSE 2
  END as estimated_days
FROM delivery_providers dp
CROSS JOIN (
  VALUES ('Jakarta'), ('Bogor'), ('Depok'), ('Tangerang'), ('Bekasi'),
         ('Bandung'), ('Surabaya'), ('Semarang'), ('Yogyakarta'), ('Medan')
) AS cities(city)
WHERE dp.code != 'self_pickup'
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE delivery_providers IS 'Available delivery service providers';
COMMENT ON TABLE shipping_rates IS 'Shipping rates by origin and destination';
COMMENT ON TABLE deliveries IS 'Delivery tracking information';
COMMENT ON TABLE delivery_status_history IS 'History of delivery status changes';
