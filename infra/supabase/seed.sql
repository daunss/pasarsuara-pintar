-- ===========================================
-- PasarSuara Pintar - Seed Data
-- ===========================================

-- Seed Users (UMKM demo)
INSERT INTO public.users (id, email, phone_number, name, role, preferred_dialect) VALUES
  ('11111111-1111-1111-1111-111111111111', 'bu.siti@demo.com', '628123456001', 'Bu Siti', 'umkm', 'jv'),
  ('22222222-2222-2222-2222-222222222222', 'pak.joyo@demo.com', '628123456002', 'Pak Joyo', 'umkm', 'jv'),
  ('33333333-3333-3333-3333-333333333333', 'mang.ujang@demo.com', '628123456003', 'Mang Ujang', 'umkm', 'su'),
  ('44444444-4444-4444-4444-444444444444', 'bu.ani@demo.com', '628123456004', 'Bu Ani', 'umkm', 'id'),
  ('55555555-5555-5555-5555-555555555555', 'pak.budi@demo.com', '628123456005', 'Pak Budi', 'supplier', 'id');

-- Seed Inventory untuk Bu Siti (Warung Nasi)
INSERT INTO public.inventory (user_id, product_name, stock_qty, unit, min_sell_price, max_buy_price, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Beras Premium', 25, 'kg', 13000, 12000, 'Beras putih kualitas premium'),
  ('11111111-1111-1111-1111-111111111111', 'Minyak Goreng', 10, 'liter', 18000, 16000, 'Minyak goreng sawit'),
  ('11111111-1111-1111-1111-111111111111', 'Telur Ayam', 50, 'butir', 2500, 2200, 'Telur ayam negeri segar'),
  ('11111111-1111-1111-1111-111111111111', 'Gula Pasir', 5, 'kg', 16000, 14000, 'Gula pasir putih');

-- Seed Inventory untuk Pak Joyo (Petani/Supplier Beras)
INSERT INTO public.inventory (user_id, product_name, stock_qty, unit, min_sell_price, max_buy_price, description) VALUES
  ('22222222-2222-2222-2222-222222222222', 'Beras Premium', 500, 'kg', 11500, NULL, 'Beras panen langsung dari sawah'),
  ('22222222-2222-2222-2222-222222222222', 'Beras Medium', 300, 'kg', 10000, NULL, 'Beras kualitas standar');

-- Seed Inventory untuk Mang Ujang (Pedagang Sayur)
INSERT INTO public.inventory (user_id, product_name, stock_qty, unit, min_sell_price, max_buy_price, description) VALUES
  ('33333333-3333-3333-3333-333333333333', 'Cabai Merah', 20, 'kg', 45000, 40000, 'Cabai merah keriting segar'),
  ('33333333-3333-3333-3333-333333333333', 'Bawang Merah', 15, 'kg', 35000, 30000, 'Bawang merah Brebes'),
  ('33333333-3333-3333-3333-333333333333', 'Tomat', 25, 'kg', 12000, 10000, 'Tomat merah segar');

-- Seed Transactions untuk Bu Siti
INSERT INTO public.transactions (user_id, type, product_name, qty, price_per_unit, total_amount, raw_voice_text) VALUES
  ('11111111-1111-1111-1111-111111111111', 'SALE', 'Nasi Rames', 15, 12000, 180000, 'Tadi laku nasi rames limolas porsi, rolas ewu siji'),
  ('11111111-1111-1111-1111-111111111111', 'SALE', 'Nasi Goreng', 8, 15000, 120000, 'Nasi goreng payu wolung porsi'),
  ('11111111-1111-1111-1111-111111111111', 'PURCHASE', 'Beras Premium', 25, 11800, 295000, 'Tuku beras 25 kilo neng Pak Joyo'),
  ('11111111-1111-1111-1111-111111111111', 'EXPENSE', 'Gas LPG', 2, 22000, 44000, 'Beli gas loro tabung');

-- Seed Negotiation Log (contoh negosiasi berhasil)
INSERT INTO public.negotiation_logs (buyer_id, seller_id, product_name, initial_offer, final_price, status, transcript, completed_at) VALUES
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Beras Premium', 12000, 11800, 'SUCCESS', 
   '{"messages": [
     {"role": "buyer_agent", "content": "Saya butuh beras 25 kg, budget maksimal 12.000/kg"},
     {"role": "seller_agent", "content": "Stok ada 500 kg. Harga normal 12.500/kg, tapi untuk 25 kg bisa 12.200/kg"},
     {"role": "buyer_agent", "content": "Bisa 11.800/kg? Saya langganan tetap"},
     {"role": "seller_agent", "content": "Deal 11.800/kg untuk langganan. Total 295.000 untuk 25 kg"},
     {"role": "system", "content": "Negosiasi berhasil. Deal: 11.800/kg"}
   ]}'::jsonb, NOW());
