-- Grader SaaS Schema (PostgreSQL)

-- Auth & Multi-Tenancy
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  github_id TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  plan_tier TEXT DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE org_members (
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- admin, member, viewer
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT UNIQUE NOT NULL, -- Hashed key
  prefix TEXT NOT NULL,          -- Plaintext prefix for display
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scans & Persistence
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  repo_url TEXT NOT NULL,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  grade_category TEXT NOT NULL,
  report JSONB NOT NULL, -- Full HealthReport JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE scan_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  repo_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT
);

-- Usage Tracking
CREATE TABLE usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE rate_limits (
  org_id UUID REFERENCES orgs(id) PRIMARY KEY,
  period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scan_count INTEGER DEFAULT 0,
  api_call_count INTEGER DEFAULT 0
);

-- ============================================================================
-- Phase 2: Notifications & Billing
-- ============================================================================

CREATE TABLE notifications_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'email', 'slack', 'webhook'
  config JSONB NOT NULL, -- {webhookUrl, emailList, etc.}
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_tier TEXT NOT NULL, -- 'starter', 'professional', 'enterprise'
  status TEXT DEFAULT 'active', -- 'active', 'past_due', 'canceled', 'ended'
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  amount_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'draft', -- 'draft', 'open', 'paid', 'uncollectible', 'void'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_scans_org_created ON scans(org_id, created_at DESC);
CREATE INDEX idx_scans_repo ON scans(owner, name);
CREATE INDEX idx_scans_user ON scans(user_id);

CREATE INDEX idx_api_keys_org ON api_keys(org_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

CREATE INDEX idx_org_members_user ON org_members(user_id);
CREATE INDEX idx_org_members_org ON org_members(org_id);

CREATE INDEX idx_usage_log_org_created ON usage_log(org_id, created_at DESC);
CREATE INDEX idx_usage_log_user ON usage_log(user_id);

CREATE INDEX idx_scan_queue_status ON scan_queue(status);
CREATE INDEX idx_scan_queue_created ON scan_queue(created_at DESC);

-- Phase 3: ISO 5055 Compliance
ALTER TABLE scans ADD COLUMN IF NOT EXISTS compliance_report JSONB;

CREATE INDEX idx_notifications_org ON notifications_config(org_id);
CREATE INDEX idx_subscriptions_org ON subscriptions(org_id);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- ============================================================================
-- CONSTRAINTS & VALIDATIONS
-- ============================================================================

ALTER TABLE org_members ADD CONSTRAINT role_valid CHECK (role IN ('owner', 'admin', 'member', 'viewer'));
ALTER TABLE subscriptions ADD CONSTRAINT plan_tier_valid CHECK (plan_tier IN ('starter', 'professional', 'enterprise'));
ALTER TABLE notifications_config ADD CONSTRAINT type_valid CHECK (type IN ('email', 'slack', 'webhook'));
