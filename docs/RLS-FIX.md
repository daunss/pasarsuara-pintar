# RLS Policy Fix for Demo Mode

## Problem

Dashboard pages showing empty data even though data exists in database.

**Root Cause:** Row Level Security (RLS) policies using `auth.uid()` which returns NULL for anonymous users.

## Solution Applied

Updated RLS policies to allow access for demo user ID without authentication:

```sql
-- Enable RLS
ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for demo user (no auth required)
CREATE POLICY product_catalog_anon_policy ON product_catalog
    FOR ALL 
    USING (user_id = '11111111-1111-1111-1111-111111111111');

CREATE POLICY contacts_anon_policy ON contacts
    FOR ALL 
    USING (user_id = '11111111-1111-1111-1111-111111111111');

CREATE POLICY payments_anon_policy ON payments
    FOR ALL 
    USING (
        transaction_id IN (
            SELECT id FROM transactions 
            WHERE user_id = '11111111-1111-1111-1111-111111111111'
        )
    );

CREATE POLICY audit_logs_anon_policy ON audit_logs
    FOR SELECT 
    USING (user_id = '11111111-1111-1111-1111-111111111111');
```

## For Production

When implementing authentication (Phase 4.1), replace with proper policies:

```sql
-- Drop demo policies
DROP POLICY IF EXISTS product_catalog_anon_policy ON product_catalog;
DROP POLICY IF EXISTS contacts_anon_policy ON contacts;
DROP POLICY IF EXISTS payments_anon_policy ON payments;
DROP POLICY IF EXISTS audit_logs_anon_policy ON audit_logs;

-- Create production policies
CREATE POLICY product_catalog_auth_policy ON product_catalog
    FOR ALL 
    USING (user_id = auth.uid());

CREATE POLICY contacts_auth_policy ON contacts
    FOR ALL 
    USING (user_id = auth.uid());

CREATE POLICY payments_auth_policy ON payments
    FOR ALL 
    USING (
        transaction_id IN (
            SELECT id FROM transactions WHERE user_id = auth.uid()
        )
    );

CREATE POLICY audit_logs_auth_policy ON audit_logs
    FOR SELECT 
    USING (user_id = auth.uid());
```

## Verification

Test that data is now accessible:

```sql
SELECT COUNT(*) FROM product_catalog 
WHERE user_id = '11111111-1111-1111-1111-111111111111';
-- Should return: 3

SELECT COUNT(*) FROM contacts 
WHERE user_id = '11111111-1111-1111-1111-111111111111';
-- Should return: 4

SELECT COUNT(*) FROM payments p
JOIN transactions t ON p.transaction_id = t.id
WHERE t.user_id = '11111111-1111-1111-1111-111111111111';
-- Should return: 5
```

## Status

✅ **FIXED** - Dashboard now shows data correctly for demo user without authentication.

**Next:** Implement proper authentication in Phase 4.1 and switch to auth-based policies.
