-- Create Test User for Development
-- This bypasses email confirmation for quick testing

-- Step 1: Create user in auth.users (if not exists)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_sent_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  last_sign_in_at
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test@pasarsuara.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Test User","business_name":"Warung Test","business_type":"Warung Makan"}',
  FALSE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'test@pasarsuara.com'
);

-- Step 2: Get the user ID
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@pasarsuara.com';
  
  -- Step 3: Create profile in public.users (if not exists)
  INSERT INTO public.users (id, email, name, phone_number, role, created_at)
  VALUES (
    test_user_id,
    'test@pasarsuara.com',
    'Test User',
    '+6281234567890',
    'user',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Test user created/verified: %', test_user_id;
  RAISE NOTICE 'Email: test@pasarsuara.com';
  RAISE NOTICE 'Password: password123';
END $$;

-- Verify user was created
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'business_name' as business_name
FROM auth.users 
WHERE email = 'test@pasarsuara.com';
