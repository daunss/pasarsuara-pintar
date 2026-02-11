-- ===========================================
-- Auto-sync auth.users → public.users
-- ===========================================
-- When a new user signs up (via web, Google OAuth, or WhatsApp),
-- automatically create a corresponding row in public.users with
-- their phone_number so the WA bot can match incoming messages.

-- Function: handle_new_user
-- Triggered on INSERT into auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  raw_phone TEXT;
  formatted_phone TEXT;
BEGIN
  -- Extract phone from metadata (web/Google signup stores it here)
  raw_phone := COALESCE(
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.phone
  );

  -- Normalize phone: strip spaces/dashes, ensure starts with country code
  IF raw_phone IS NOT NULL AND raw_phone != '' THEN
    formatted_phone := regexp_replace(raw_phone, '[^0-9]', '', 'g');
    -- Convert 08xxx → 628xxx
    IF formatted_phone LIKE '0%' THEN
      formatted_phone := '62' || substring(formatted_phone from 2);
    END IF;
  END IF;

  -- Insert into public.users (ignore conflicts on id or phone)
  INSERT INTO public.users (id, email, phone_number, name, role, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    formatted_phone,
    COALESCE(
      NEW.raw_user_meta_data->>'business_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'umkm'),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    phone_number = COALESCE(EXCLUDED.phone_number, public.users.phone_number),
    email = COALESCE(EXCLUDED.email, public.users.email),
    name = COALESCE(EXCLUDED.name, public.users.name);

  RETURN NEW;
END;
$$;

-- Trigger: on_auth_user_created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also handle UPDATE (e.g., when user adds phone via /setup-whatsapp)
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  raw_phone TEXT;
  formatted_phone TEXT;
BEGIN
  -- Only act if metadata changed
  IF NEW.raw_user_meta_data IS DISTINCT FROM OLD.raw_user_meta_data THEN
    raw_phone := COALESCE(
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'phone_number',
      NEW.phone
    );

    IF raw_phone IS NOT NULL AND raw_phone != '' THEN
      formatted_phone := regexp_replace(raw_phone, '[^0-9]', '', 'g');
      IF formatted_phone LIKE '0%' THEN
        formatted_phone := '62' || substring(formatted_phone from 2);
      END IF;

      -- Update public.users phone
      UPDATE public.users
      SET phone_number = formatted_phone
      WHERE id = NEW.id;

      -- If no row exists yet, create one
      IF NOT FOUND THEN
        INSERT INTO public.users (id, email, phone_number, name, role, created_at)
        VALUES (
          NEW.id,
          NEW.email,
          formatted_phone,
          COALESCE(
            NEW.raw_user_meta_data->>'business_name',
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
          ),
          'umkm',
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          phone_number = EXCLUDED.phone_number;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_updated();

-- Backfill: sync existing auth.users that are missing from public.users
INSERT INTO public.users (id, email, phone_number, name, role, created_at)
SELECT
  au.id,
  au.email,
  CASE
    WHEN COALESCE(au.raw_user_meta_data->>'phone', au.raw_user_meta_data->>'phone_number', '') = '' THEN NULL
    WHEN regexp_replace(COALESCE(au.raw_user_meta_data->>'phone', au.raw_user_meta_data->>'phone_number'), '[^0-9]', '', 'g') LIKE '0%'
      THEN '62' || substring(regexp_replace(COALESCE(au.raw_user_meta_data->>'phone', au.raw_user_meta_data->>'phone_number'), '[^0-9]', '', 'g') from 2)
    ELSE regexp_replace(COALESCE(au.raw_user_meta_data->>'phone', au.raw_user_meta_data->>'phone_number'), '[^0-9]', '', 'g')
  END,
  COALESCE(
    au.raw_user_meta_data->>'business_name',
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ),
  COALESCE(au.raw_user_meta_data->>'role', 'umkm'),
  COALESCE(au.created_at, NOW())
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;
