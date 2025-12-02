-- Migration: Add payment fields to orders table
-- Created: 2025-12-02
-- Description: Add payment_status, payment_method, and paid_at fields to orders table

-- Add payment fields to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Create index for payment status queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_paid_at ON orders(paid_at);

-- Update existing orders to have payment_status
UPDATE orders 
SET payment_status = 'PENDING' 
WHERE payment_status IS NULL;

-- Add comment
COMMENT ON COLUMN orders.payment_status IS 'Payment status: PENDING, PAID, FAILED, REFUNDED';
COMMENT ON COLUMN orders.payment_method IS 'Payment method used (e.g., bank_transfer, gopay, credit_card)';
COMMENT ON COLUMN orders.paid_at IS 'Timestamp when payment was completed';
