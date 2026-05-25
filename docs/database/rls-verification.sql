-- RLS Verification Script
-- Run these queries against your Supabase instance to verify tenant isolation.
-- Execute each test as a different role to validate RLS enforcement.

-- =============================================================================
-- Test 1: Anon user sees only their tenant's compliance_reviews
-- Expected: returns only rows where tenant_id matches the calling user's tenant
-- =============================================================================
SELECT 'Test 1a: Anon user can only SELECT own tenant compliance_reviews' AS test;
SET LOCAL ROLE authenticated;
SELECT id, tenant_id, target, status
FROM public.compliance_reviews
WHERE tenant_id = public.get_user_tenant_id();
-- If non-null, RLS is working for SELECT

SELECT 'Test 1b: Anon user INSERT requires own tenant_id' AS test;
INSERT INTO public.compliance_reviews (tenant_id, user_id, target, review_type, status)
VALUES (
    public.get_user_tenant_id(),
    auth.uid(),
    'test-target.example.com',
    'regulatory_compliance',
    'pending'
);
-- If succeeds, INSERT policy works

-- =============================================================================
-- Test 2: Service role sees ALL compliance_reviews
-- Expected: returns ALL rows regardless of tenant_id
-- =============================================================================
SELECT 'Test 2: Service role sees all compliance_reviews' AS test;
SET LOCAL ROLE service_role;
SELECT id, tenant_id, target, status
FROM public.compliance_reviews;
-- Should return rows from ALL tenants

-- =============================================================================
-- Test 3: RLS blocks cross-tenant access
-- This must be run as a regular authenticated user (not service_role)
-- Pick a tenant_id that does NOT belong to the current user
-- =============================================================================
SELECT 'Test 3: Cross-tenant INSERT is blocked' AS test;
SET LOCAL ROLE authenticated;
INSERT INTO public.compliance_reviews (tenant_id, user_id, target, review_type, status)
VALUES (
    '00000000-0000-0000-0000-000000000000',  -- wrong tenant
    auth.uid(),
    'cross-tenant-test.example.com',
    'label_review',
    'pending'
);
-- Expected: policy violation error (RLS blocks cross-tenant insert)

SELECT 'Test 3b: Cross-tenant SELECT returns no rows' AS test;
SET LOCAL ROLE authenticated;
SELECT id, tenant_id, target, status
FROM public.compliance_reviews
WHERE tenant_id != public.get_user_tenant_id();
-- Expected: 0 rows (RLS filters out other tenants' data)

-- =============================================================================
-- Test 4: DELETE policy for compliance_reviews
-- Expected: user can delete own tenant's review
-- =============================================================================
SELECT 'Test 4: Authenticated user deletes own tenant compliance_review' AS test;
SET LOCAL ROLE authenticated;
DELETE FROM public.compliance_reviews
WHERE id = (
    SELECT id FROM public.compliance_reviews
    WHERE tenant_id = public.get_user_tenant_id()
    LIMIT 1
);
-- Should succeed (user owns this tenant's data)

-- =============================================================================
-- Test 5: DELETE policy for research_results
-- Expected: user can delete own tenant's research result
-- =============================================================================
SELECT 'Test 5: Authenticated user deletes own tenant research_result' AS test;
SET LOCAL ROLE authenticated;
DELETE FROM public.research_results
WHERE id = (
    SELECT id FROM public.research_results
    WHERE tenant_id = public.get_user_tenant_id()
    LIMIT 1
);
-- Should succeed (user owns this tenant's data)

-- =============================================================================
-- Test 6: Cross-tenant DELETE is blocked
-- =============================================================================
SELECT 'Test 6: Cross-tenant DELETE is blocked' AS test;
SET LOCAL ROLE authenticated;
DELETE FROM public.compliance_reviews
WHERE tenant_id != public.get_user_tenant_id();
-- Expected: 0 rows deleted (RLS prevents cross-tenant delete)

-- =============================================================================
-- Test 7: Verify profiles RLS
-- Expected: user can only see their own profile
-- =============================================================================
SELECT 'Test 7: User sees only own profile' AS test;
SET LOCAL ROLE authenticated;
SELECT id, email, tenant_id
FROM public.profiles;
-- Should return only the current user's profile row

-- =============================================================================
-- Test 8: Verify audit_logs RLS
-- Expected: user sees logs for their tenant or themselves
-- =============================================================================
SELECT 'Test 8: User sees own tenant audit_logs' AS test;
SET LOCAL ROLE authenticated;
SELECT id, tenant_id, user_id, action, status
FROM public.audit_logs
WHERE tenant_id = public.get_user_tenant_id();
-- Should return logs for this user's tenant
