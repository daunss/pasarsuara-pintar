-- Property Test: Index Existence
-- Feature: production-readiness, Property 5: Index existence
-- Validates: Requirements 2.6
-- For any newly created table, all required indexes for foreign keys and frequently queried columns should exist

-- Test setup
DO $$
DECLARE
  test_passed BOOLEAN := TRUE;
  test_results TEXT := '';
  index_exists BOOLEAN;
BEGIN
  -- ============================================================================
  -- Test product_catalog indexes
  -- ============================================================================
  
  -- Check idx_product_catalog_user_id
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'product_catalog' AND indexname = 'idx_product_catalog_user_id'
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    test_passed := FALSE;
    test_results := test_results || 'FAIL: idx_product_catalog_user_id not found\n';
  ELSE
    test_results := test_results || 'PASS: idx_product_catalog_user_id exists\n';
  END IF;
  
  -- Check idx_product_catalog_sku
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'product_catalog' AND indexname = 'idx_product_catalog_sku'
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    test_passed := FALSE;
    test_results := test_results || 'FAIL: idx_product_catalog_sku not found\n';
  ELSE
    test_results := test_results || 'PASS: idx_product_catalog_sku exists\n';
  END IF;
  
  -- Check idx_product_catalog_is_active
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'product_catalog' AND indexname = 'idx_product_catalog_is_active'
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    test_passed := FALSE;
    test_results := test_results || 'FAIL: idx_product_catalog_is_active not found\n';
  ELSE
    test_results := test_results || 'PASS: idx_product_catalog_is_active exists\n';
  END IF;
  
  -- Check idx_product_catalog_category
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'product_catalog' AND indexname = 'idx_product_catalog_category'
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    test_passed := FALSE;
    test_results := test_results || 'FAIL: idx_product_catalog_category not found\n';
  ELSE
    test_results := test_results || 'PASS: idx_product_catalog_category exists\n';
  END IF;
  
  -- ============================================================================
  -- Test contacts indexes
  -- ============================================================================
  
  -- Check idx_contacts_user_id
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'contacts' AND indexname = 'idx_contacts_user_id'
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    test_passed := FALSE;
    test_results := test_results || 'FAIL: idx_contacts_user_id not found\n';
  ELSE
    test_results := test_results || 'PASS: idx_contacts_user_id exists\n';
  END IF;
  
  -- Check idx_contacts_type
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'contacts' AND indexname = 'idx_contacts_type'
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    test_passed := FALSE;
    test_results := test_results || 'FAIL: idx_contacts_type not found\n';
  ELSE
    test_results := test_results || 'PASS: idx_contacts_type exists\n';
  END IF;
  
  -- Check idx_contacts_is_active
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'contacts' AND indexname = 'idx_contacts_is_active'
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    test_passed := FALSE;
    test_results := test_results || 'FAIL: idx_contacts_is_active not found\n';
  ELSE
    test_results := test_results || 'PASS: idx_contacts_is_active exists\n';
  END IF;
  
  -- ============================================================================
  -- Test payment_records indexes
  -- ============================================================================
  
  -- Check idx_payment_records_transaction_id
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'payment_records' AND indexname = 'idx_payment_records_transaction_id'
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    test_passed := FALSE;
    test_results := test_results || 'FAIL: idx_payment_records_transaction_id not found\n';
  ELSE
    test_results := test_results || 'PASS: idx_payment_records_transaction_id exists\n';
  END IF;
  
  -- Check idx_payment_records_status
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'payment_records' AND indexname = 'idx_payment_records_status'
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    test_passed := FALSE;
    test_results := test_results || 'FAIL: idx_payment_records_status not found\n';
  ELSE
    test_results := test_results || 'PASS: idx_payment_records_status exists\n';
  END IF;
  
  -- ============================================================================
  -- Test audit_logs indexes
  -- ============================================================================
  
  -- Check idx_audit_logs_user_id
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'audit_logs' AND indexname = 'idx_audit_logs_user_id'
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    test_passed := FALSE;
    test_results := test_results || 'FAIL: idx_audit_logs_user_id not found\n';
  ELSE
    test_results := test_results || 'PASS: idx_audit_logs_user_id exists\n';
  END IF;
  
  -- Check idx_audit_logs_entity (composite index)
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'audit_logs' AND indexname = 'idx_audit_logs_entity'
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    test_passed := FALSE;
    test_results := test_results || 'FAIL: idx_audit_logs_entity not found\n';
  ELSE
    test_results := test_results || 'PASS: idx_audit_logs_entity exists\n';
  END IF;
  
  -- Check idx_audit_logs_created_at
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'audit_logs' AND indexname = 'idx_audit_logs_created_at'
  ) INTO index_exists;
  
  IF NOT index_exists THEN
    test_passed := FALSE;
    test_results := test_results || 'FAIL: idx_audit_logs_created_at not found\n';
  ELSE
    test_results := test_results || 'PASS: idx_audit_logs_created_at exists\n';
  END IF;
  
  -- ============================================================================
  -- Output results
  -- ============================================================================
  
  RAISE NOTICE '%', test_results;
  
  IF test_passed THEN
    RAISE NOTICE 'Property 5: Index Existence - ALL TESTS PASSED ✓';
  ELSE
    RAISE EXCEPTION 'Property 5: Index Existence - TESTS FAILED ✗';
  END IF;
END $$;
