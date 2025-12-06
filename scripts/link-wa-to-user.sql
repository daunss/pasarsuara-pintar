-- Link WhatsApp number to test user
-- Run this in Supabase SQL Editor

-- Update test user with WhatsApp number
UPDATE public.users
SET phone_number = '+6285119607506'
WHERE email = 'test@pasarsuara.com';

-- Verify the update
SELECT 
  id,
  email,
  name,
  phone_number,
  role
FROM public.users
WHERE email = 'test@pasarsuara.com';

-- Show message
DO $$
BEGIN
  RAISE NOTICE '✅ WhatsApp number +6285119607506 linked to test@pasarsuara.com';
  RAISE NOTICE '📱 Now you can:';
  RAISE NOTICE '1. Login to web dashboard with: test@pasarsuara.com / password123';
  RAISE NOTICE '2. Send WhatsApp messages from: 6285119607506';
  RAISE NOTICE '3. Transactions will appear in your dashboard!';
END $$;
