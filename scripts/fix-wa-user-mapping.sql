-- Fix WhatsApp to User Mapping
-- Link nomor WA 6285179720499 ke akun daunsnime

-- Step 1: Cari user dengan email daunsnime
SELECT 'Step 1: Mencari user daunsnime...' as status;
SELECT id, email, name, phone_number, role
FROM public.users
WHERE email LIKE '%daunsnime%';

-- Step 2: Update nomor WA ke user daunsnime
-- Ganti email di bawah jika berbeda
UPDATE public.users
SET phone_number = '+6285179720499'
WHERE email LIKE '%daunsnime%';

-- Step 3: Verifikasi update
SELECT 'Step 2: Verifikasi update...' as status;
SELECT id, email, name, phone_number, role
FROM public.users
WHERE phone_number = '+6285179720499';

-- Step 4: Pindahkan semua transaksi lama ke akun Anda
SELECT 'Step 3: Memindahkan transaksi lama...' as status;
UPDATE transactions
SET user_id = (
  SELECT id FROM users 
  WHERE phone_number = '+6285179720499'
  LIMIT 1
)
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- Step 5: Tampilkan hasil
SELECT 'Step 4: Transaksi Anda sekarang:' as status;
SELECT 
  t.id,
  t.type,
  t.product_name,
  t.qty,
  t.price_per_unit,
  t.total_amount,
  to_char(t.created_at, 'DD/MM/YYYY HH24:MI') as waktu
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE u.phone_number = '+6285179720499'
ORDER BY t.created_at DESC;

-- Summary
SELECT 
  '✅ SELESAI!' as status,
  'Nomor WA +6285179720499 sudah di-link ke akun Anda' as message,
  'Refresh dashboard untuk melihat transaksi' as action;
