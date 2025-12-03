# Fix Login Issue - Quick Guide

## Problem: "Invalid login credentials"

Dashboard dan Settings tidak bisa diakses karena belum ada user di database.

## Solution: Create Test User

### Option 1: Via SQL (FASTEST) ⚡

```bash
# Run this command to create test user
psql $DATABASE_URL < infra/supabase/create-test-user.sql
```

**Credentials created:**
- Email: `test@pasarsuara.com`
- Password: `password123`

### Option 2: Via Supabase Dashboard 🖱️

1. Open Supabase Dashboard: https://app.supabase.com
2. Go to your project: `wckiorhuqvfsvborwhzn`
3. Navigate to: **Authentication** → **Users**
4. Click **Add User** → **Create new user**
5. Fill in:
   - Email: `test@pasarsuara.com`
   - Password: `password123`
   - ✅ Check "Auto Confirm User" (IMPORTANT!)
6. Click **Create User**

### Option 3: Disable Email Confirmation (For Dev) ⚙️

1. Open Supabase Dashboard
2. Go to: **Authentication** → **Settings**
3. Scroll to: **Email Auth**
4. Toggle OFF: **Enable email confirmations**
5. Save changes
6. Now you can signup normally via `/dev-login`

## After Creating User

1. Go to: http://localhost:3000/dev-login
2. Use credentials:
   - Email: `test@pasarsuara.com`
   - Password: `password123`
3. Click **"Login Only"**
4. ✅ Success! Redirect to dashboard

## Verify User Exists

```sql
-- Check if user exists
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE email = 'test@pasarsuara.com';

-- Check profile
SELECT * FROM public.users 
WHERE email = 'test@pasarsuara.com';
```

## Troubleshooting

### Still getting "Invalid credentials"?

**Check 1: Supabase URL**
```bash
# In apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://wckiorhuqvfsvborwhzn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**Check 2: User confirmed**
```sql
-- User must have email_confirmed_at set
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'test@pasarsuara.com';
```

**Check 3: Restart dev server**
```bash
# Stop and restart Next.js
cd apps/web
npm run dev
```

### "User already registered" but can't login?

User exists but password might be wrong. Reset it:

```sql
-- Reset password to 'password123'
UPDATE auth.users 
SET encrypted_password = crypt('password123', gen_salt('bf'))
WHERE email = 'test@pasarsuara.com';
```

### Want to create your own user?

```sql
-- Replace with your email/password
INSERT INTO auth.users (
  instance_id, id, aud, role, email, 
  encrypted_password, email_confirmed_at, 
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'your@email.com',
  crypt('your_password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Your Name","business_name":"Your Business"}'
);
```

## Quick Test Flow

1. ✅ Create user via SQL
2. ✅ Login via /dev-login
3. ✅ Access dashboard
4. ✅ Run seed script for data
5. ✅ Dashboard shows data!

## Production Note

For production:
- ✅ Enable email confirmation
- ✅ Remove /dev-login page
- ✅ Use proper registration flow
- ✅ Add password reset
- ✅ Add email verification

## Need Help?

Check these files:
- `infra/supabase/create-test-user.sql` - User creation script
- `apps/web/src/app/dev-login/page.tsx` - Dev login page
- `apps/web/src/lib/auth.tsx` - Auth implementation
