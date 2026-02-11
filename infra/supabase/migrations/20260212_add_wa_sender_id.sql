-- Migration: Add wa_sender_id column to public.users
-- This stores the raw WhatsApp sender identifier (phone or LID)
-- so the backend can match users even when WhatsApp uses LID format
-- instead of phone numbers.

-- Add wa_sender_id column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wa_sender_id TEXT;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_wa_sender_id ON public.users(wa_sender_id);

-- Set known LID mapping for tegaru89
UPDATE public.users
SET wa_sender_id = '103929669005392'
WHERE email = 'tegaru89@gmail.com';

-- Backfill: for users that already have phone_number, set wa_sender_id to
-- the phone number without '+' prefix (matching WA JID format)
UPDATE public.users
SET wa_sender_id = REPLACE(phone_number, '+', '')
WHERE wa_sender_id IS NULL
  AND phone_number IS NOT NULL
  AND phone_number != '';
