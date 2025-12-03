-- Rollback Migration: Remove tables added in 20241203_add_missing_tables.sql
-- Date: 2024-12-03
-- Description: Drops product_catalog, contacts, payment_records, and audit_logs tables

-- ============================================================================
-- DROP TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_product_catalog_updated_at ON product_catalog;
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
DROP TRIGGER IF EXISTS update_payment_records_updated_at ON payment_records;

-- ============================================================================
-- DROP POLICIES
-- ============================================================================

-- product_catalog policies
DROP POLICY IF EXISTS "Users can view own products" ON product_catalog;
DROP POLICY IF EXISTS "Users can insert own products" ON product_catalog;
DROP POLICY IF EXISTS "Users can update own products" ON product_catalog;
DROP POLICY IF EXISTS "Users can delete own products" ON product_catalog;

-- contacts policies
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;

-- payment_records policies
DROP POLICY IF EXISTS "Users can view own payment records" ON payment_records;
DROP POLICY IF EXISTS "Users can insert own payment records" ON payment_records;
DROP POLICY IF EXISTS "Users can update own payment records" ON payment_records;
DROP POLICY IF EXISTS "Users can delete own payment records" ON payment_records;

-- audit_logs policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;

-- ============================================================================
-- DROP TABLES
-- ============================================================================

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS payment_records CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS product_catalog CASCADE;

-- ============================================================================
-- DROP FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Note: We don't drop the uuid-ossp extension as it might be used by other tables
