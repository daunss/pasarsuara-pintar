-- Property Test: RLS Policy Enforcement
-- Feature: production-readiness, Property 4: RLS policy enforcement
-- Validates: Requirements 2.5
-- For any newly created table, Row Level Security should be enabled and appropriate policies should exist

-- Test setup
DO $$
DECLARE
  table_name TEXT;
  rls_enabled BOOLEAN;
  policy_count INTEGER;
  test_passed BOOLEAN := TRUE;
  test_results TEXT := '';
BEGIN
  -- List of tables to test
  FOR table_name IN 
    SELECT unnest(ARRAY['product_catalog', 'contacts', 'payment_records', 'audit_logs'])
  LOOP
    -- Check if RLS is enabled
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = table_name;
    
    IF NOT rls_enabled THEN
      test_passed := FALSE;
      test_results := test_results || format('FAIL: RLS not enabled on %s\n', table_name);
    ELSE
      test_results := test_results || format('PASS: RLS enabled on %s\n', table_name);
    END IF;
    
    -- Check if policies exist
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = table_name;
    
    IF policy_count = 0 THEN
      test_passed := FALSE;
      test_results := test_results || format('FAIL: No policies found on %s\n', table_name);
    ELSE
      test_results := test_results || format('PASS: %s policies found on %s\n', policy_count, table_name);
    END IF;
    
    -- Check for SELECT policy
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = table_name AND cmd = 'SELECT'
    ) THEN
      test_passed := FALSE;
      test_results := test_results || format('FAIL: No SELECT policy on %s\n', table_name);
    ELSE
      test_results := test_results || format('PASS: SELECT policy exists on %s\n', table_name);
    END IF;
    
    -- Check for INSERT policy (except audit_logs which is read-only for users)
    IF table_name != 'audit_logs' THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = table_name AND cmd = 'INSERT'
      ) THEN
        test_passed := FALSE;
        test_results := test_results || format('FAIL: No INSERT policy on %s\n', table_name);
      ELSE
        test_results := test_results || format('PASS: INSERT policy exists on %s\n', table_name);
      END IF;
    END IF;
    
    -- Check for UPDATE policy (except audit_logs)
    IF table_name != 'audit_logs' THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = table_name AND cmd = 'UPDATE'
      ) THEN
        test_passed := FALSE;
        test_results := test_results || format('FAIL: No UPDATE policy on %s\n', table_name);
      ELSE
        test_results := test_results || format('PASS: UPDATE policy exists on %s\n', table_name);
      END IF;
    END IF;
    
    -- Check for DELETE policy (except audit_logs)
    IF table_name != 'audit_logs' THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = table_name AND cmd = 'DELETE'
      ) THEN
        test_passed := FALSE;
        test_results := test_results || format('FAIL: No DELETE policy on %s\n', table_name);
      ELSE
        test_results := test_results || format('PASS: DELETE policy exists on %s\n', table_name);
      END IF;
    END IF;
    
  END LOOP;
  
  -- Output results
  RAISE NOTICE '%', test_results;
  
  IF test_passed THEN
    RAISE NOTICE 'Property 4: RLS Policy Enforcement - ALL TESTS PASSED ✓';
  ELSE
    RAISE EXCEPTION 'Property 4: RLS Policy Enforcement - TESTS FAILED ✗';
  END IF;
END $$;
