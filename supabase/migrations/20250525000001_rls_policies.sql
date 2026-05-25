-- Migration: RLS Policies + Tenant Isolation for Compliance Tables
-- BB-Tech ↔ Northside Smoke compliance data flow
-- Tenant isolation: users can only see their tenant's data
-- Service role can read/write all (for cross-system workflows)

-- =============================================================================
-- 1. Helper function: get current user's tenant_id from their profile
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- =============================================================================
-- 2. Tenants table
-- Each tenant maps to a subscription tier (Boutique, Enterprise, Autonomous)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('Boutique', 'Enterprise', 'Autonomous')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Everyone can read tenants (needed for profile lookups)
CREATE POLICY "Tenants are readable by authenticated users" ON public.tenants
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role can manage tenants
CREATE POLICY "Service role manages tenants" ON public.tenants
    USING ((SELECT auth.role() = 'service_role'));

-- =============================================================================
-- 3. Add tenant_id to existing profiles table
-- Each user belongs to a tenant for multi-tenant isolation
-- =============================================================================
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Update RLS on profiles to be tenant-aware
-- Drop existing user-only policy to add tenant-aware version
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;

CREATE POLICY "Users read own profile" ON public.profiles
    FOR SELECT USING (
        (SELECT auth.role() = 'service_role') OR auth.uid() = id
    );

CREATE POLICY "Users update own profile" ON public.profiles
    FOR UPDATE USING (
        (SELECT auth.role() = 'service_role') OR auth.uid() = id
    );

-- =============================================================================
-- 4. Compliance Reviews table
-- Stores compliance review results from BB-Tech research pipeline
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.compliance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    target TEXT NOT NULL,
    review_type TEXT NOT NULL CHECK (review_type IN ('regulatory_compliance', 'label_review', 'coa_validation')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    result JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.compliance_reviews ENABLE ROW LEVEL SECURITY;

-- Service role can read/write all (for BB-Tech ↔ Northside Smoke workflows)
CREATE POLICY "Service role full access on compliance_reviews" ON public.compliance_reviews
    USING ((SELECT auth.role() = 'service_role'))
    WITH CHECK ((SELECT auth.role() = 'service_role'));

-- Tenant isolation: users see rows from their own tenant
CREATE POLICY "Users view own tenant compliance_reviews" ON public.compliance_reviews
    FOR SELECT USING (
        tenant_id = public.get_user_tenant_id()
    );

CREATE POLICY "Users insert own tenant compliance_reviews" ON public.compliance_reviews
    FOR INSERT WITH CHECK (
        tenant_id = public.get_user_tenant_id()
    );

CREATE POLICY "Users update own tenant compliance_reviews" ON public.compliance_reviews
    FOR UPDATE USING (
        tenant_id = public.get_user_tenant_id()
    );

CREATE POLICY "Users delete own tenant compliance_reviews" ON public.compliance_reviews
    FOR DELETE USING (
        tenant_id = public.get_user_tenant_id()
    );

-- =============================================================================
-- 5. Research Results table
-- Stores research pipeline results from BB-Tech
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.research_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    run_id TEXT NOT NULL,
    experiment_id TEXT,
    sku_id TEXT,
    archetype TEXT,
    quality_tier TEXT,
    compliance_score NUMERIC,
    risk_score NUMERIC,
    result_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_research_results_tenant_id ON public.research_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_research_results_run_id ON public.research_results(run_id);

ALTER TABLE public.research_results ENABLE ROW LEVEL SECURITY;

-- Service role can read/write all
CREATE POLICY "Service role full access on research_results" ON public.research_results
    USING ((SELECT auth.role() = 'service_role'))
    WITH CHECK ((SELECT auth.role() = 'service_role'));

-- Tenant isolation for research results
CREATE POLICY "Users view own tenant research_results" ON public.research_results
    FOR SELECT USING (
        tenant_id = public.get_user_tenant_id()
    );

CREATE POLICY "Users insert own tenant research_results" ON public.research_results
    FOR INSERT WITH CHECK (
        tenant_id = public.get_user_tenant_id()
    );

CREATE POLICY "Users update own tenant research_results" ON public.research_results
    FOR UPDATE USING (
        tenant_id = public.get_user_tenant_id()
    );

CREATE POLICY "Users delete own tenant research_results" ON public.research_results
    FOR DELETE USING (
        tenant_id = public.get_user_tenant_id()
    );

-- =============================================================================
-- 6. Add tenant_id to existing audit_logs table
-- Enables tenant-scoped audit trail alongside existing user-level tracking
-- =============================================================================
ALTER TABLE public.audit_logs
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Update RLS on audit_logs to support both service role and tenant isolation
DROP POLICY IF EXISTS "Audit logs access control" ON public.audit_logs;

-- Service role can read all audit logs
CREATE POLICY "Service role full access on audit_logs" ON public.audit_logs
    USING ((SELECT auth.role() = 'service_role'))
    WITH CHECK ((SELECT auth.role() = 'service_role'));

-- Tenant isolation: users can view audit logs for their tenant
CREATE POLICY "Users view own tenant audit_logs" ON public.audit_logs
    FOR SELECT USING (
        tenant_id = public.get_user_tenant_id() OR user_id = auth.uid()
    );

-- Users can create audit log entries (for self-service actions)
CREATE POLICY "Users insert own tenant audit_logs" ON public.audit_logs
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND (tenant_id IS NULL OR tenant_id = public.get_user_tenant_id())
    );

-- =============================================================================
-- 7. Update RLS on existing compliance-related tables
-- Add tenant awareness alongside existing user-level policies
-- =============================================================================

-- policies table: add service role bypass
DROP POLICY IF EXISTS "Policies access control" ON public.policies;
CREATE POLICY "Service role full access on policies" ON public.policies
    USING ((SELECT auth.role() = 'service_role'))
    WITH CHECK ((SELECT auth.role() = 'service_role'));
CREATE POLICY "Users access own policies" ON public.policies
    USING (auth.uid() = user_id);

-- =============================================================================
-- 8. Create a default tenant for auto-provisioning
-- =============================================================================
INSERT INTO public.tenants (id, name, tier)
VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Default Auto-Provisioned Tenant', 'Boutique')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 9. Auto-assign tenant_id on profile creation trigger update
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, subscription_tier, tenant_id)
    VALUES (new.id, new.email, 'Boutique', 'ffffffff-ffff-ffff-ffff-ffffffffffff');

    INSERT INTO public.policies (user_id, rule_code, name, description, status) VALUES
    (new.id, 'RULE-001', 'THC-A Age Gate Validation', 'Enforce third-party verification for customer registration.', 'active'),
    (new.id, 'RULE-002', 'Lab COA Verification Gate', 'Block Shopify SKU publishing if THC Delta-9 exceeds 0.3%.', 'active'),
    (new.id, 'RULE-003', 'State Compliance Registry Check', 'Allow delivery orders only in approved reciprocal states.', 'active'),
    (new.id, 'RULE-004', 'Lead Assignment Route Cap', 'Restrict outbound queuing to max 12 concurrent warm leads.', 'active');

    INSERT INTO public.leads (user_id, name, source, phone, wait, priority) VALUES
    (new.id, 'Marcus T. (Charlotte)', 'Website Inquiry', '704-555-0198', '2h 14m', 'Hot'),
    (new.id, 'Danielle R. (Raleigh)', 'Instagram DM', '919-555-0143', '1h 42m', 'Medium'),
    (new.id, 'Jerome K. (Greensboro)', 'Affiliate Link', '336-555-0122', '2h 51m', 'Hot'),
    (new.id, 'Aisha M. (Wilmington)', 'Referral Code', '910-555-0177', '0h 18m', 'Warm');

    INSERT INTO public.audit_logs (user_id, tenant_id, action, status, details) VALUES
    (new.id, 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Workspace Provision', 'Approved', 'SaaS platform initialized. Default compliance policies and lead queues created.');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger (in case it already exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
