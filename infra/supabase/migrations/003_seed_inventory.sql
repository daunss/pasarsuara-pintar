-- Seed inventory data for testing
-- User: Ibu Siti (demo user)

INSERT INTO inventory (user_id, product_name, stock_qty, unit, min_sell_price, max_buy_price, description)
VALUES
  -- Bahan Baku
  ('11111111-1111-1111-1111-111111111111', 'Beras Premium', 50, 'kg', 13000, 12000, 'Beras premium kualitas terbaik'),
  ('11111111-1111-1111-1111-111111111111', 'Minyak Goreng', 20, 'liter', 17000, 15000, 'Minyak goreng curah'),
  ('11111111-1111-1111-1111-111111111111', 'Telur Ayam', 100, 'butir', 2500, 2200, 'Telur ayam negeri segar'),
  ('11111111-1111-1111-1111-111111111111', 'Cabai Merah', 5, 'kg', 50000, 45000, 'Cabai merah keriting'),
  ('11111111-1111-1111-1111-111111111111', 'Bawang Merah', 10, 'kg', 35000, 32000, 'Bawang merah lokal'),
  ('11111111-1111-1111-1111-111111111111', 'Gula Pasir', 25, 'kg', 14000, 13000, 'Gula pasir premium'),
  ('11111111-1111-1111-1111-111111111111', 'Tepung Terigu', 30, 'kg', 11000, 10000, 'Tepung terigu protein sedang'),
  
  -- Produk Jadi (untuk warung makan)
  ('11111111-1111-1111-1111-111111111111', 'Nasi Goreng', 15, 'porsi', 15000, 0, 'Nasi goreng spesial siap jual'),
  ('11111111-1111-1111-1111-111111111111', 'Ayam Geprek', 8, 'porsi', 20000, 0, 'Ayam geprek pedas siap jual'),
  ('11111111-1111-1111-1111-111111111111', 'Es Teh Manis', 30, 'gelas', 3000, 0, 'Es teh manis siap jual')
ON CONFLICT (user_id, product_name) DO UPDATE
SET 
  stock_qty = EXCLUDED.stock_qty,
  min_sell_price = EXCLUDED.min_sell_price,
  max_buy_price = EXCLUDED.max_buy_price,
  description = EXCLUDED.description;
