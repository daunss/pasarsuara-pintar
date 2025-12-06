-- Seed 40 Demo Data untuk Akun daunsnime
-- Run di Supabase SQL Editor

-- Get user ID
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find user daunsnime
  SELECT id INTO v_user_id
  FROM users
  WHERE email ILIKE '%daunsnime%' OR phone_number = '+6285119607506'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User daunsnime tidak ditemukan!';
  END IF;

  RAISE NOTICE 'User ID: %', v_user_id;

  -- 1. INSERT INVENTORY (10 items)
  INSERT INTO inventory (user_id, product_name, quantity, unit, price, low_stock_threshold, category, created_at)
  VALUES
    (v_user_id, 'Nasi Goreng', 45, 'porsi', 15000, 5, 'Makanan', NOW() - INTERVAL '9 days'),
    (v_user_id, 'Mie Ayam', 38, 'porsi', 12000, 5, 'Makanan', NOW() - INTERVAL '8 days'),
    (v_user_id, 'Soto Ayam', 42, 'porsi', 13000, 5, 'Makanan', NOW() - INTERVAL '7 days'),
    (v_user_id, 'Bakso', 35, 'porsi', 10000, 5, 'Makanan', NOW() - INTERVAL '6 days'),
    (v_user_id, 'Es Teh Manis', 60, 'gelas', 3000, 5, 'Minuman', NOW() - INTERVAL '5 days'),
    (v_user_id, 'Es Jeruk', 48, 'gelas', 5000, 5, 'Minuman', NOW() - INTERVAL '4 days'),
    (v_user_id, 'Kopi', 52, 'gelas', 5000, 5, 'Minuman', NOW() - INTERVAL '3 days'),
    (v_user_id, 'Gorengan', 55, 'porsi', 1000, 5, 'Snack', NOW() - INTERVAL '2 days'),
    (v_user_id, 'Pisang Goreng', 40, 'porsi', 2000, 5, 'Snack', NOW() - INTERVAL '1 day'),
    (v_user_id, 'Tahu Isi', 33, 'porsi', 2500, 5, 'Snack', NOW());

  RAISE NOTICE '✓ 10 inventory items ditambahkan';

  -- 2. INSERT SALES TRANSACTIONS (15)
  INSERT INTO transactions (user_id, type, description, total_amount, payment_method, status, metadata, created_at)
  VALUES
    (v_user_id, 'SALE', 'Laku Nasi Goreng 3 porsi', 45000, 'CASH', 'COMPLETED', '{"product":"Nasi Goreng","quantity":3,"unit_price":15000,"source":"whatsapp_voice"}', NOW() - INTERVAL '1 day'),
    (v_user_id, 'SALE', 'Laku Mie Ayam 2 porsi', 24000, 'QRIS', 'COMPLETED', '{"product":"Mie Ayam","quantity":2,"unit_price":12000,"source":"whatsapp_voice"}', NOW() - INTERVAL '2 days'),
    (v_user_id, 'SALE', 'Laku Soto Ayam 4 porsi', 52000, 'CASH', 'COMPLETED', '{"product":"Soto Ayam","quantity":4,"unit_price":13000,"source":"whatsapp_voice"}', NOW() - INTERVAL '3 days'),
    (v_user_id, 'SALE', 'Laku Bakso 5 porsi', 50000, 'TRANSFER', 'COMPLETED', '{"product":"Bakso","quantity":5,"unit_price":10000,"source":"whatsapp_voice"}', NOW() - INTERVAL '4 days'),
    (v_user_id, 'SALE', 'Laku Es Teh Manis 10 gelas', 30000, 'CASH', 'COMPLETED', '{"product":"Es Teh Manis","quantity":10,"unit_price":3000,"source":"whatsapp_voice"}', NOW() - INTERVAL '5 days'),
    (v_user_id, 'SALE', 'Laku Es Jeruk 5 gelas', 25000, 'QRIS', 'COMPLETED', '{"product":"Es Jeruk","quantity":5,"unit_price":5000,"source":"whatsapp_voice"}', NOW() - INTERVAL '6 days'),
    (v_user_id, 'SALE', 'Laku Kopi 8 gelas', 40000, 'CASH', 'COMPLETED', '{"product":"Kopi","quantity":8,"unit_price":5000,"source":"whatsapp_voice"}', NOW() - INTERVAL '7 days'),
    (v_user_id, 'SALE', 'Laku Gorengan 20 porsi', 20000, 'CASH', 'COMPLETED', '{"product":"Gorengan","quantity":20,"unit_price":1000,"source":"whatsapp_voice"}', NOW() - INTERVAL '8 days'),
    (v_user_id, 'SALE', 'Laku Pisang Goreng 10 porsi', 20000, 'CASH', 'COMPLETED', '{"product":"Pisang Goreng","quantity":10,"unit_price":2000,"source":"whatsapp_voice"}', NOW() - INTERVAL '9 days'),
    (v_user_id, 'SALE', 'Laku Tahu Isi 8 porsi', 20000, 'QRIS', 'COMPLETED', '{"product":"Tahu Isi","quantity":8,"unit_price":2500,"source":"whatsapp_voice"}', NOW() - INTERVAL '10 days'),
    (v_user_id, 'SALE', 'Laku Nasi Goreng 5 porsi', 75000, 'TRANSFER', 'COMPLETED', '{"product":"Nasi Goreng","quantity":5,"unit_price":15000,"source":"whatsapp_voice"}', NOW() - INTERVAL '11 days'),
    (v_user_id, 'SALE', 'Laku Mie Ayam 4 porsi', 48000, 'CASH', 'COMPLETED', '{"product":"Mie Ayam","quantity":4,"unit_price":12000,"source":"whatsapp_voice"}', NOW() - INTERVAL '12 days'),
    (v_user_id, 'SALE', 'Laku Soto Ayam 3 porsi', 39000, 'QRIS', 'COMPLETED', '{"product":"Soto Ayam","quantity":3,"unit_price":13000,"source":"whatsapp_voice"}', NOW() - INTERVAL '13 days'),
    (v_user_id, 'SALE', 'Laku Bakso 6 porsi', 60000, 'CASH', 'COMPLETED', '{"product":"Bakso","quantity":6,"unit_price":10000,"source":"whatsapp_voice"}', NOW() - INTERVAL '14 days'),
    (v_user_id, 'SALE', 'Laku Es Teh Manis 15 gelas', 45000, 'CASH', 'COMPLETED', '{"product":"Es Teh Manis","quantity":15,"unit_price":3000,"source":"whatsapp_voice"}', NOW() - INTERVAL '15 days');

  RAISE NOTICE '✓ 15 sales transactions ditambahkan';

  -- 3. INSERT PURCHASE TRANSACTIONS (7)
  INSERT INTO transactions (user_id, type, description, total_amount, payment_method, status, metadata, created_at)
  VALUES
    (v_user_id, 'PURCHASE', 'Beli Beras 25kg', 350000, 'TRANSFER', 'COMPLETED', '{"supplier":"Toko Beras Makmur","source":"manual"}', NOW() - INTERVAL '5 days'),
    (v_user_id, 'PURCHASE', 'Beli Minyak Goreng 5L', 85000, 'TRANSFER', 'COMPLETED', '{"supplier":"Supplier Sayur Segar","source":"manual"}', NOW() - INTERVAL '6 days'),
    (v_user_id, 'PURCHASE', 'Beli Ayam 5kg', 175000, 'TRANSFER', 'COMPLETED', '{"supplier":"Distributor Minyak Goreng","source":"manual"}', NOW() - INTERVAL '7 days'),
    (v_user_id, 'PURCHASE', 'Beli Sayuran', 50000, 'TRANSFER', 'COMPLETED', '{"supplier":"Toko Bumbu Dapur","source":"manual"}', NOW() - INTERVAL '8 days'),
    (v_user_id, 'PURCHASE', 'Beli Bumbu Dapur', 75000, 'TRANSFER', 'COMPLETED', '{"supplier":"Toko Beras Makmur","source":"manual"}', NOW() - INTERVAL '9 days'),
    (v_user_id, 'PURCHASE', 'Beli Gas LPG', 25000, 'TRANSFER', 'COMPLETED', '{"supplier":"Supplier Sayur Segar","source":"manual"}', NOW() - INTERVAL '10 days'),
    (v_user_id, 'PURCHASE', 'Beli Kemasan', 30000, 'TRANSFER', 'COMPLETED', '{"supplier":"Distributor Minyak Goreng","source":"manual"}', NOW() - INTERVAL '11 days');

  RAISE NOTICE '✓ 7 purchase transactions ditambahkan';

  -- 4. INSERT EXPENSE TRANSACTIONS (3)
  INSERT INTO transactions (user_id, type, description, total_amount, payment_method, status, metadata, created_at)
  VALUES
    (v_user_id, 'EXPENSE', 'Bayar Listrik', 150000, 'TRANSFER', 'COMPLETED', '{"category":"operational","source":"manual"}', NOW() - INTERVAL '2 days'),
    (v_user_id, 'EXPENSE', 'Bayar Air', 50000, 'TRANSFER', 'COMPLETED', '{"category":"operational","source":"manual"}', NOW() - INTERVAL '3 days'),
    (v_user_id, 'EXPENSE', 'Bayar Internet', 300000, 'TRANSFER', 'COMPLETED', '{"category":"operational","source":"manual"}', NOW() - INTERVAL '4 days');

  RAISE NOTICE '✓ 3 expense transactions ditambahkan';

  -- 5. INSERT NEGOTIATION LOGS (5)
  INSERT INTO negotiation_logs (buyer_id, seller_id, product_name, initial_price, final_price, status, messages, created_at)
  VALUES
    (v_user_id, v_user_id, 'Beras Premium 25kg', 380000, 350000, 'ACCEPTED', 
     '[{"role":"buyer","content":"Harga beras 25kg berapa?","timestamp":"2025-12-02T10:00:00Z"},{"role":"seller","content":"Rp 380.000 pak","timestamp":"2025-12-02T10:01:00Z"},{"role":"buyer","content":"Bisa 350rb ga? Saya langganan","timestamp":"2025-12-02T10:02:00Z"},{"role":"seller","content":"Oke deal pak, 350rb","timestamp":"2025-12-02T10:03:00Z"}]'::jsonb,
     NOW() - INTERVAL '5 days'),
    
    (v_user_id, v_user_id, 'Minyak Goreng 5L', 95000, 85000, 'ACCEPTED',
     '[{"role":"buyer","content":"Minyak goreng 5L ready?","timestamp":"2025-11-27T10:00:00Z"},{"role":"seller","content":"Ready, 95rb","timestamp":"2025-11-27T10:01:00Z"},{"role":"buyer","content":"85rb bisa?","timestamp":"2025-11-27T10:02:00Z"},{"role":"seller","content":"Oke deh","timestamp":"2025-11-27T10:03:00Z"}]'::jsonb,
     NOW() - INTERVAL '10 days'),
    
    (v_user_id, v_user_id, 'Ayam Potong 10kg', 380000, 360000, 'ACCEPTED',
     '[{"role":"buyer","content":"Ayam 10kg harga berapa?","timestamp":"2025-11-22T10:00:00Z"},{"role":"seller","content":"380rb pak","timestamp":"2025-11-22T10:01:00Z"},{"role":"buyer","content":"Nego 360rb ya","timestamp":"2025-11-22T10:02:00Z"},{"role":"seller","content":"Boleh pak","timestamp":"2025-11-22T10:03:00Z"}]'::jsonb,
     NOW() - INTERVAL '15 days'),
    
    (v_user_id, v_user_id, 'Sayuran Paket', 60000, 50000, 'ACCEPTED',
     '[{"role":"buyer","content":"Paket sayuran harga?","timestamp":"2025-11-17T10:00:00Z"},{"role":"seller","content":"60rb lengkap","timestamp":"2025-11-17T10:01:00Z"},{"role":"buyer","content":"50rb aja ya","timestamp":"2025-11-17T10:02:00Z"},{"role":"seller","content":"Oke","timestamp":"2025-11-17T10:03:00Z"}]'::jsonb,
     NOW() - INTERVAL '20 days'),
    
    (v_user_id, v_user_id, 'Bumbu Dapur Lengkap', 85000, 75000, 'ACCEPTED',
     '[{"role":"buyer","content":"Bumbu lengkap ada?","timestamp":"2025-11-12T10:00:00Z"},{"role":"seller","content":"Ada, 85rb","timestamp":"2025-11-12T10:01:00Z"},{"role":"buyer","content":"75rb bisa ga?","timestamp":"2025-11-12T10:02:00Z"},{"role":"seller","content":"Bisa pak","timestamp":"2025-11-12T10:03:00Z"}]'::jsonb,
     NOW() - INTERVAL '25 days');

  RAISE NOTICE '✓ 5 negotiation logs ditambahkan';

  -- Summary
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ SEEDING SELESAI!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 RINGKASAN DATA:';
  RAISE NOTICE '   • Inventory: 10 items';
  RAISE NOTICE '   • Transaksi: 25 records (15 sales, 7 purchases, 3 expenses)';
  RAISE NOTICE '   • Negosiasi: 5 logs';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 SIAP UNTUK DEMO!';
  RAISE NOTICE '   Dashboard: http://localhost:3000/dashboard';
  RAISE NOTICE '';

END $$;
