-- Seed Data: Supabase Demo Tenant + Compliance Data
-- Run after migration to populate demo tenant with sample data

-- =============================================================================
-- 1. Create a demo tenant
-- =============================================================================
INSERT INTO public.tenants (id, name, tier)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Northside Smoke Demo',
    'Enterprise'
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. Create a demo profile (if no users exist yet via auth)
-- =============================================================================
-- Note: In production, profiles are auto-created via the on_auth_user_created trigger.
-- This seed provides initial data for local testing.
DO $$
DECLARE
    demo_user_id UUID := 'b0000000-0000-0000-0000-000000000001';
    tenant_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
    -- Only insert if the tenant exists and was just created
    INSERT INTO public.profiles (id, email, subscription_tier, tenant_id)
    VALUES (demo_user_id, 'demo@northsidesmoke.com', 'Enterprise', tenant_id)
    ON CONFLICT (id) DO NOTHING;

    -- Seed compliance reviews
    INSERT INTO public.compliance_reviews (tenant_id, user_id, target, review_type, status, result) VALUES
    (tenant_id, demo_user_id, 'hemp_batch_001', 'regulatory_compliance', 'completed',
        '{
            "can_sell": true,
            "state_code": "NC",
            "compliance_score": 85,
            "verdict": "approved",
            "red_flags": [],
            "quant_score": {
                "composite_score": 0.74,
                "legality_confidence": 0.91,
                "market_potential": 0.82
            }
        }'::jsonb),
    (tenant_id, demo_user_id, 'cbd_oil_500mg', 'label_review', 'completed',
        '{
            "can_sell": false,
            "state_code": "ALL",
            "compliance_score": 42,
            "verdict": "blocked",
            "red_flags": ["Disease claim detected: 'relieves pain' on label"],
            "quant_score": null
        }'::jsonb),
    (tenant_id, demo_user_id, 'delta9_gummies_10mg', 'coa_validation', 'in_progress',
        '{
            "status": "awaiting_lab_results",
            "coa_batch": "COA-2026-05-25-003"
        }'::jsonb),
    (tenant_id, demo_user_id, 'hemp_flower_oz', 'regulatory_compliance', 'pending',
        '{}'::jsonb)
    ON CONFLICT DO NOTHING;

    -- Seed research results
    INSERT INTO public.research_results (tenant_id, run_id, experiment_id, sku_id, archetype, quality_tier, compliance_score, risk_score, result_data) VALUES
    (tenant_id, 'run_20260525_001', 'exp_001', 'hemp_batch_001', 'point_guard', 'gold', 85.0, 12.5,
        '{
            "archetype": "Point Guard — High Compliance, Fast Market Entry",
            "recommendation": "Fast-track to market",
            "evidence_strength": 0.88,
            "reproducibility": 0.92,
            "market_potential": 0.78,
            "test_results": {
                "thc_d9": 0.24,
                "thc_d8": 0.0,
                "thca": 12.4,
                "cbd": 0.8,
                "moisture": 8.2
            }
        }'::jsonb),
    (tenant_id, 'run_20260525_001', 'exp_002', 'cbd_oil_500mg', 'small_forward', 'silver', 42.0, 68.3,
        '{
            "archetype": "Small Forward — Moderate Potential, Labeling Risk",
            "recommendation": "Requires label revision before market entry",
            "evidence_strength": 0.65,
            "reproducibility": 0.70,
            "market_potential": 0.55,
            "test_results": {
                "thc_d9": 0.01,
                "thc_d8": 0.0,
                "thca": 0.02,
                "cbd": 15.2,
                "moisture": 0.5
            }
        }'::jsonb),
    (tenant_id, 'run_20260525_001', 'exp_003', 'delta9_gummies_10mg', 'center', 'bronze', 55.0, 45.0,
        '{
            "archetype": "Center — High Risk, High Reward",
            "recommendation": "Pending COA verification",
            "evidence_strength": 0.45,
            "reproducibility": 0.50,
            "market_potential": 0.88,
            "test_results": {}
        }'::jsonb)
    ON CONFLICT DO NOTHING;

    -- Seed audit log entries
    INSERT INTO public.audit_logs (user_id, tenant_id, action, status, details) VALUES
    (demo_user_id, tenant_id, 'TENANT_PROVISION', 'Approved', 'Demo tenant provisioned with Enterprise tier.'),
    (demo_user_id, tenant_id, 'COMPLIANCE_REVIEW_REQUESTED', 'Completed', 'Review requested for hemp_batch_001 (regulatory_compliance)'),
    (demo_user_id, tenant_id, 'COMPLIANCE_REVIEW_COMPLETED', 'Approved', 'hemp_batch_001 approved for sale in NC.'),
    (demo_user_id, tenant_id, 'RESEARCH_PIPELINE_RUN', 'Completed', 'Research pipeline run_20260525_001 completed: 3 experiments, 1 passed, 1 failed, 1 pending.'),
    (demo_user_id, tenant_id, 'LABEL_REVIEW_FAILED', 'Blocked', 'cbd_oil_500mg blocked: disease claim detected on label.'),
    (demo_user_id, tenant_id, 'COA_VALIDATION_REQUESTED', 'In Progress', 'COA validation for delta9_gummies_10mg sent to lab.')
    ON CONFLICT DO NOTHING;
END $$;
