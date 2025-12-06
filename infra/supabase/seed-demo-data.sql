-- Seed Demo Data for PasarSuara Dashboard
-- Run this to populate dashboard with sample transactions

-- Note: Replace 'YOUR_USER_ID' with actual user ID from auth.users table
-- You can get it by running: SELECT id FROM auth.users LIMIT 1;
-- Current test user ID: f67f0a01-2129-4466-afb1-13178c3a7a0d

-- Insert sample transactions
INSERT INTO transactions (user_id, type, product_name, qty, price_per_unit, total_amount, raw_voice_text, created_at)
VALUES
  -- Sales
  ('f67f0a01-2129-4466-afb1-13178c3a7a0d', 'SALE', 'Nasi Goreng', 10, 15000, 150000, 'Tadi laku nasi goreng 10 porsi harga 15 ribu', NOW() - INTERVAL '1 hour'),
  ('f67f0a01-2129-4466-afb1-13178c3a7a0d', 'SALE', 'Nasi Rames', 15, 12000, 180000, 'Nasi rames payu limolas porsi', NOW() - INTERVAL '2 hours'),
  ('f67f0a01-2129-4466-afb1-13178c3a7a0d', 'SALE', 'Es Teh', 20, 3000, 60000, 'Es teh laku 20 gelas', NOW() - INTERVAL '3 hours'),
  ('f67f0a01-2129-4466-afb1-13178c3a7a0d', 'SALE', 'Ayam Goreng', 8, 18000, 144000, 'Ayam goreng laku 8 porsi', NOW() - INTERVAL '4 hours'),
  
  -- Purchases
  ('f67f0a01-2129-4466-afb1-13178c3a7a0d', 'PURCHASE', 'Beras Premium', 25, 11800, 295000, 'Tuku beras 25 kilo neng Pak Joyo', NOW() - INTERVAL '5 hours'),
  ('f67f0a01-2129-4466-afb1-13178c3a7a0d', 'PURCHASE', 'Minyak Goreng', 10, 16000, 160000, 'Beli minyak goreng 10 liter', NOW() - INTERVAL '6 hours'),
  
  -- Expenses
  ('f67f0a01-2129-4466-afb1-13178c3a7a0d', 'EXPENSE', 'Gas LPG', 2, 22000, 44000, 'Beli gas loro tabung', NOW() - INTERVAL '7 hours'),
  ('f67f0a01-2129-4466-afb1-13178c3a7a0d', 'EXPENSE', 'Listrik', 1, 200000, 200000, 'Bayar listrik bulan ini', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Insert sample inventory
INSERT INTO inventory (user_id, product_name, stock_qty, unit, min_sell_price, max_buy_price, description, created_at)
VALUES
  ('f67f0a01-2129-4466-afb1-13178c3a7a0d', 'Beras Premium', 25, 'kg', 13000, 12000, 'Beras putih kualitas premium', NOW()),
  ('f67f0a01-2129-4466-afb1-13178c3a7a0d', 'Minyak Goreng', 10, 'liter', 18000, 16000, 'Minyak goreng sawit', NOW()),
  ('f67f0a01-2129-4466-afb1-13178c3a7a0d', 'Telur Ayam', 50, 'butir', 2500, 2200, 'Telur ayam negeri segar', NOW()),
  ('f67f0a01-2129-4466-afb1-13178c3a7a0d', 'Gula Pasir', 5, 'kg', 16000, 14000, 'Gula pasir putih', NOW())
ON CONFLICT DO NOTHING;

-- Insert sample negotiation
INSERT INTO negotiation_logs (buyer_id, seller_id, product_name, initial_offer, final_price, status, transcript, created_at, completed_at)
VALUES
  ('f67f0a01-2129-4466-afb1-13178c3a7a0d', 'f67f0a01-2129-4466-afb1-13178c3a7a0d', 'Beras Premium', 12000, 11800, 'SUCCESS', 
   '{"messages": [
     {"role": "buyer_agent", "content": "Saya butuh beras 25 kg, budget maksimal 12.000/kg"},
     {"role": "seller_agent", "content": "[Pak Joyo] Stok ada 500 kg. Harga normal 12.500/kg, tapi untuk 25 kg bisa 12.200/kg"},
     {"role": "buyer_agent", "content": "Bisa 11.800/kg? Saya langganan tetap"},
     {"role": "seller_agent", "content": "[Pak Joyo] Deal 11.800/kg untuk langganan. Total 295.000 untuk 25 kg"},
     {"role": "system", "content": "✅ Negosiasi berhasil. Deal: 11.800/kg"}
   ]}'::jsonb,
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Verify data inserted
SELECT 'Transactions inserted:' as info, COUNT(*) as count FROM transactions WHERE user_id = 'f67f0a01-2129-4466-afb1-13178c3a7a0d'
UNION ALL
SELECT 'Inventory items inserted:', COUNT(*) FROM inventory WHERE user_id = 'f67f0a01-2129-4466-afb1-13178c3a7a0d'
UNION ALL
SELECT 'Negotiations inserted:', COUNT(*) FROM negotiation_logs WHERE buyer_id = 'f67f0a01-2129-4466-afb1-13178c3a7a0d' OR seller_id = 'f67f0a01-2129-4466-afb1-13178c3a7a0d';
