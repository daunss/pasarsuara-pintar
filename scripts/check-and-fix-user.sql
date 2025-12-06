-- Check and fix user mapping for WhatsApp integration

-- 1. Check if user with this phone exists
SELECT 'Checking for user with phone +6285179720499...' as status;
SELECT id, email, name, phone_number, role
FROM public.users
WHERE phone_number = '+6285179720499' OR phone_number = '6285179720499';

-- 2. Check your user account
SELECT 'Checking user daunsnime...' as status;
SELECT id, email, name, phone_number, role
FROM public.users
WHERE email LIKE '%daunsnime%' OR email LIKE '%daun%';

-- 3. Update your user with WhatsApp number
-- Replace 'your-email@example.com' with your actual email
UPDATE public.users
SET phone_number = '+6285179720499'
WHERE email = 'daunsnime@gmail.com' -- Adjust if different
   OR email LIKE '%daunsnime%';

-- 4. Verify the update
SELECT '✅ Updated! Verifying...' as status;
SELECT id, email, name, phone_number, role
FROM public.users
WHERE phone_number = '+6285179720499';

-- 5. Move old transactions to your account
UPDATE transactions
SET user_id = (
  SELECT id FROM users 
  WHERE phone_number = '+6285179720499'
  LIMIT 1
)
WHERE user_id = '11111111-1111-1111-1111-111111111111';

-- 6. Check recent transactions for your user
SELECT 'Recent transactions for your account:' as status;
SELECT 
  t.id,
  t.type,
  t.product_name,
  t.qty,
  t.price_per_unit,
  t.total_amount,
  t.created_at
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE u.phone_number = '+6285179720499'
ORDER BY t.created_at DESC
LIMIT 10;
