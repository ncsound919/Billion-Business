# Implementation Roadmap: SaaS Portfolio Integration
> **Owner:** Portfolio Operations  
> **Status:** Active  
> **Last Updated:** May 24, 2026

---

## Priority 1: Deterministic Brain SaaS (Weeks 1-8)

### Week 1-2: Foundation & Architecture

#### Task 1.1: Multi-Tenant Isolation Layer
**Goal:** Enable single codebase to run private + public instances with complete data isolation

**Subtasks:**
- [ ] Design tenant schema in database
  - [ ] Add `tenant_id` field to all models
  - [ ] Create row-level security (RLS) policies
  - [ ] Implement encryption key per tenant
- [ ] Create TenantContext middleware
  - [ ] Extract tenant from JWT token
  - [ ] Validate tenant access rights
  - [ ] Inject tenant_id into all queries
- [ ] Implement data isolation tests
  - [ ] Verify Tenant A can't see Tenant B data
  - [ ] Test cross-tenant query injection attacks
- [ ] Document isolation architecture

**Files to Create:**
- `deterministic-brain/api/middleware/tenant_isolation.py`
- `deterministic-brain/api/middleware/tenant_auth.py`
- `deterministic-brain/schemas/tenant_models.py`
- `tests/integration/test_tenant_isolation.py`

**Success Criteria:**
- All queries automatically scoped to current tenant
- No data leakage in tests
- <5ms overhead per request

---

#### Task 1.2: Feature Gate System (Public vs Private)
**Goal:** Single skill library with feature gates to expose only safe skills to public SaaS

**Subtasks:**
- [ ] Create skill metadata schema
  ```yaml
  skill_name: "portfolio_sync"
  visibility: "private"  # private | public
  tier: "enterprise"     # free | pro | enterprise
  risk_level: "high"     # low | medium | high
  depends_on: []
  ```
- [ ] Build skill registry loader with feature gates
  - [ ] Only load public skills for SaaS customers
  - [ ] Load all skills for private instance
- [ ] Create skill permission decorator
  ```python
  @skill_requires_permission("portfolio_management")
  @skill_min_tier("enterprise")
  def portfolio_sync_skill():
      ...
  ```
- [ ] Implement admin API to toggle feature flags

**Files to Create:**
- `deterministic-brain/brain/skill_visibility.py`
- `deterministic-brain/brain/feature_gates.py`
- `deterministic-brain/config/visibility_config.yaml`

**Success Criteria:**
- 100+ proprietary skills locked from public
- Feature gates testable in unit tests
- Admin can enable/disable skills per tenant

---

#### Task 1.3: API Authentication & RBAC
**Goal:** Secure multi-tenant API with JWT + tenant scoping

**Subtasks:**
- [ ] Design JWT structure with tenant scope
  ```json
  {
    "sub": "user@customer.com",
    "tenant_id": "tenant_abc123",
    "tier": "pro",
    "permissions": ["workflow:create", "workflow:read"],
    "expires": "2026-05-31"
  }
  ```
- [ ] Create auth endpoints
  - [ ] POST `/api/v1/auth/signup` → Tenant creation + first user
  - [ ] POST `/api/v1/auth/login` → JWT generation
  - [ ] POST `/api/v1/auth/refresh` → Token refresh
  - [ ] GET `/api/v1/auth/me` → Current tenant/user info
- [ ] Implement permission middleware
  - [ ] Check JWT signature
  - [ ] Validate tenant existence
  - [ ] Check resource permissions
- [ ] Create admin auth for private instance
  - [ ] Separate auth endpoint for internal admins
  - [ ] No rate limiting for private

**Files to Create:**
- `deterministic-brain/api/auth/jwt_handler.py`
- `deterministic-brain/api/auth/rbac.py`
- `deterministic-brain/api/routes/auth.py`
- `tests/auth/test_jwt_flow.py`

**Success Criteria:**
- All API endpoints require valid JWT
- Tenant isolation enforced at auth layer
- Private and public auth paths separate

---

### Week 2-3: Data & Deployment Infrastructure

#### Task 1.4: Usage Billing Engine
**Goal:** Track customer usage and enforce quotas

**Subtasks:**
- [ ] Create usage event schema
  - [ ] Log: execution_started, execution_completed, api_call, storage_used
  - [ ] Timestamp, tenant_id, resource_type, quantity
- [ ] Build billing aggregator
  - [ ] Hourly rollup of usage events
  - [ ] Monthly invoice generation
  - [ ] Quota enforcement before execution
- [ ] Implement quota middleware
  - [ ] Check remaining budget before task execution
  - [ ] Return 429 if quota exceeded
  - [ ] Show usage in response headers
- [ ] Create billing dashboard
  - [ ] Current month usage
  - [ ] Cost projection
  - [ ] Usage by skill/resource

**Files to Create:**
- `deterministic-brain/billing/usage_tracker.py`
- `deterministic-brain/billing/quota_enforcer.py`
- `deterministic-brain/billing/invoice_generator.py`
- `deterministic-brain/api/routes/billing.py`
- `tests/billing/test_quota_enforcement.py`

**Success Criteria:**
- Usage tracked in real-time
- Quotas enforced across all endpoints
- Monthly invoices generated automatically

---

#### Task 1.5: Multi-Tenant Kubernetes Deployment
**Goal:** Production-ready K8s manifest for multi-tenant SaaS

**Subtasks:**
- [ ] Create Kubernetes namespace structure
  - [ ] `deterministic-brain-prod` namespace
  - [ ] Separate RBAC for each component
- [ ] Build Helm chart for deployment
  ```yaml
  # values.yaml
  replicas: 3
  resources:
    requests: {cpu: 500m, memory: 1Gi}
    limits: {cpu: 2, memory: 4Gi}
  tenants:
    maxConcurrent: 1000
    isolation: "strict"
  ```
- [ ] Create PersistentVolume for shared data
  - [ ] Encrypted at rest
  - [ ] Replicated across zones
- [ ] Configure auto-scaling
  - [ ] Scale by CPU utilization (50-80% target)
  - [ ] Min replicas: 3, Max: 20
- [ ] Set up monitoring & logging
  - [ ] Prometheus metrics export
  - [ ] ELK stack integration for logs
  - [ ] Alerting on errors/performance

**Files to Create:**
- `deterministic-brain/k8s/helm/Chart.yaml`
- `deterministic-brain/k8s/helm/values.yaml`
- `deterministic-brain/k8s/helm/templates/*.yaml`
- `deterministic-brain/k8s/monitoring/prometheus.yaml`

**Success Criteria:**
- Deploy 5 tenants on 3 K8s nodes
- Sub-second latency per request
- 99.9% uptime SLA

---

#### Task 1.6: Private Instance Deployment (On-Prem/Private Cloud)
**Goal:** Single-tenant private deployment for portfolio operations

**Subtasks:**
- [ ] Create private deployment manifest
  - [ ] Single-instance docker-compose
  - [ ] All skills loaded (no feature gates)
  - [ ] Direct access to portfolio APIs
- [ ] Set up private database with full access
  - [ ] No row-level security (single tenant)
  - [ ] All audit logs written
- [ ] Configure health monitoring
  - [ ] 24/7 uptime monitoring
  - [ ] Auto-restart on crash
  - [ ] Daily health reports to ops team
- [ ] Create backup/restore procedures
  - [ ] Daily encrypted backups
  - [ ] 7-day retention
  - [ ] RTO < 1 hour

**Files to Create:**
- `deterministic-brain/deployment/private/docker-compose.yml`
- `deterministic-brain/deployment/private/.env.example`
- `deterministic-brain/ops/health_monitor.py`
- `deterministic-brain/ops/backup_scheduler.py`

**Success Criteria:**
- Private instance running 24/7 with <0.1% downtime
- Auto-recovery from crashes
- Full operational audit trail

---

### Week 3-4: API & Skills

#### Task 1.7: Public SaaS API (v1)
**Goal:** Complete RESTful API for public customers

**Endpoints:**
```
POST   /api/v1/workflows              # Create workflow
GET    /api/v1/workflows              # List workflows (paginated)
GET    /api/v1/workflows/{id}         # Get workflow details
PUT    /api/v1/workflows/{id}         # Update workflow
DELETE /api/v1/workflows/{id}         # Delete workflow

POST   /api/v1/workflows/{id}/run     # Execute workflow
GET    /api/v1/executions/{id}        # Get execution status
GET    /api/v1/executions/{id}/logs   # Get execution logs
POST   /api/v1/executions/{id}/cancel # Cancel running execution

GET    /api/v1/skills                 # List available skills
GET    /api/v1/skills/{name}          # Get skill definition
POST   /api/v1/skills/search          # Search skills by keyword

GET    /api/v1/webhooks               # List webhook subscriptions
POST   /api/v1/webhooks               # Subscribe to event
DELETE /api/v1/webhooks/{id}          # Unsubscribe from event

GET    /api/v1/usage                  # Current usage stats
GET    /api/v1/billing/invoices       # List invoices
POST   /api/v1/billing/payment        # Record payment
```

**Subtasks:**
- [ ] Implement all endpoints with pagination/filtering
- [ ] Add comprehensive OpenAPI/Swagger documentation
- [ ] Implement request validation and error handling
- [ ] Create webhook delivery system with retries
- [ ] Add rate limiting per tier
- [ ] Create API key management for service accounts

**Files to Create:**
- `deterministic-brain/api/routes/workflows.py`
- `deterministic-brain/api/routes/executions.py`
- `deterministic-brain/api/routes/skills.py`
- `deterministic-brain/api/routes/webhooks.py`
- `deterministic-brain/api/routes/billing.py`
- `tests/api/test_all_endpoints.py`

**Success Criteria:**
- 100% endpoint coverage
- All endpoints documented
- Zero API errors in 24h test run

---

#### Task 1.8: Safe Public Skill Library
**Goal:** Curate 50+ general-purpose skills safe for public use

**Skill Categories:**
- Workflow Orchestration (5 skills)
  - `parallel_execute` - Run multiple tasks concurrently
  - `conditional_branch` - If/else logic
  - `loop_iterate` - For loop over items
  - `wait_until` - Wait for condition
  - `retry_on_failure` - Auto-retry logic

- Task Management (5 skills)
  - `schedule_task` - Schedule for later
  - `create_reminder` - Set reminder
  - `track_progress` - Log progress
  - `escalate_task` - Mark as urgent
  - `assign_task` - Route to owner

- Notifications (5 skills)
  - `send_email` - Email notification
  - `send_slack` - Slack message
  - `send_webhook` - HTTP POST callback
  - `send_sms` - SMS notification
  - `create_alert` - Create system alert

- Data Processing (5 skills)
  - `transform_data` - Map/filter/reduce
  - `validate_json` - Schema validation
  - `aggregate_stats` - Group and sum
  - `format_output` - Convert format
  - `cache_result` - Store for reuse

- Integration (5 skills)
  - `call_rest_api` - HTTP request
  - `query_database` - SQL query (read-only)
  - `read_file` - Read from storage
  - `parse_csv` - Parse CSV data
  - `merge_results` - Combine outputs

**Subtasks:**
- [ ] Define skill specifications (inputs, outputs, config)
- [ ] Implement skill execution with sandboxing
- [ ] Create skill testing framework
- [ ] Write skill documentation + examples
- [ ] Add skill usage examples to API docs

**Files to Create:**
- `deterministic-brain/skills/public/` (50+ skill files)
- `deterministic-brain/skills/skill_definitions.json`
- `tests/skills/test_public_skills.py`
- `docs/skills/skill_library.md`

**Success Criteria:**
- All 50 skills functional and tested
- <100ms execution per skill
- Complete documentation for each skill

---

### Week 4-5: Integration with Portfolio

#### Task 1.9: Aetherdesk ↔ Deterministic Brain Integration
**Goal:** Seamless data flow from call center to orchestration engine

**Data Flows:**
1. **Lead Capture Flow**
   ```
   Call ends in Aetherdesk
   → Extract lead metadata (name, phone, intent, sentiment)
   → POST to Deterministic Brain webhook
   → Brain evaluates opportunity value
   → Routes to appropriate portfolio company
   → Updates OpenHub with opportunity ticket
   ```

2. **Customer Support Flow**
   ```
   Support request in Aetherdesk
   → Extract support ticket details
   → Query Deterministic Brain for relevant knowledge
   → Return suggested response/automation
   → Execute support workflow
   ```

**Subtasks:**
- [ ] Create Aetherdesk webhook sender
  - [ ] POST to Brain API on call completion
  - [ ] Include full call metadata
  - [ ] Retry on failure
- [ ] Build Deterministic Brain lead router
  - [ ] Evaluate lead by value + fit
  - [ ] Route to sales/support/research based on rules
  - [ ] Log decision for audit
- [ ] Implement OpenHub ticket creation
  - [ ] Create issue in OpenHub for opportunities
  - [ ] Link to Aetherdesk call ID
  - [ ] Assign to appropriate portfolio company
- [ ] Create integration testing
  - [ ] Mock end-to-end flow
  - [ ] Verify data consistency

**Files to Create:**
- `deterministic-brain/api/webhooks/aetherdesk.py`
- `deterministic-brain/orchestration/lead_router.py`
- `deterministic-brain/integrations/openhub_adapter.py`
- `tests/integration/test_aetherdesk_flow.py`

**Success Criteria:**
- Leads flow from Aetherdesk to Brain in <1 second
- 100% of opportunities captured
- Zero data loss in integration

---

#### Task 1.10: OpenHub ↔ Deterministic Brain Integration
**Goal:** Central dashboard and issue tracking automation

**Data Flows:**
1. **Portfolio Status Dashboard**
   ```
   Deterministic Brain → Status API
   → OpenHub Dashboard polls every 60s
   → Displays: all portfolio KPIs, active workflows, alerts
   ```

2. **Issue Auto-Routing**
   ```
   Issue created in OpenHub
   → Brain evaluates if automation needed
   → Executes relevant workflow
   → Updates issue with results
   ```

**Subtasks:**
- [ ] Create OpenHub API client in Brain
  - [ ] Create/read/update issues
  - [ ] Add comments with results
  - [ ] Tag issues for routing
- [ ] Build Brain status endpoint
  - [ ] Real-time system health
  - [ ] Active workflow count
  - [ ] Recent execution logs
  - [ ] Performance metrics
- [ ] Design portfolio dashboard in OpenHub
  - [ ] Real-time stats from all companies
  - [ ] Execution history
  - [ ] Alert panel
  - [ ] Quick action buttons
- [ ] Implement issue automation
  - [ ] Trigger Brain on issue tags
  - [ ] Execute relevant skill
  - [ ] Report results back to issue

**Files to Create:**
- `deterministic-brain/integrations/openhub_client.py`
- `deterministic-brain/api/routes/status.py`
- `openhub/dashboard/portfolio_status.jsx`
- `tests/integration/test_openhub_integration.py`

**Success Criteria:**
- Portfolio dashboard updates in real-time
- Issue automation completes in <5 seconds
- 100% visible in dashboard

---

### Week 5-6: Testing & Documentation

#### Task 1.11: Comprehensive Test Suite
**Goal:** 90%+ code coverage with integration tests

**Test Areas:**
- [ ] Unit tests for all core modules
  - [ ] Task parser, router, memory, soul
  - [ ] Skill executor, resource allocator
  - [ ] Billing, quota enforcement
- [ ] Integration tests for workflows
  - [ ] Multi-step workflow execution
  - [ ] Error handling and retries
  - [ ] Data persistence
- [ ] Multi-tenant isolation tests
  - [ ] Data leakage scenarios
  - [ ] Permission enforcement
  - [ ] Encryption verification
- [ ] API tests
  - [ ] All endpoints with valid/invalid inputs
  - [ ] Rate limiting
  - [ ] Error responses
- [ ] Load testing
  - [ ] 100 concurrent workflows
  - [ ] Measure latency/throughput
  - [ ] Memory usage under load

**Files to Create:**
- `tests/unit/` (expand existing)
- `tests/integration/` (expand existing)
- `tests/load/test_load.py`
- `tests/security/test_isolation.py`
- `tests/conftest.py` (test fixtures)

**Success Criteria:**
- 90%+ code coverage
- All tests pass in CI/CD
- Load test passes with <500ms p95 latency

---

#### Task 1.12: API Documentation & Developer Portal
**Goal:** Complete developer documentation for SaaS customers

**Contents:**
- [ ] OpenAPI/Swagger spec (auto-generated)
- [ ] Getting started guide
  - [ ] Signup and API key generation
  - [ ] First workflow example
  - [ ] Common use cases
- [ ] API reference
  - [ ] All endpoints documented
  - [ ] Request/response examples
  - [ ] Error codes and meanings
- [ ] Skill library documentation
  - [ ] Skill definitions and schemas
  - [ ] Usage examples for each skill
  - [ ] Common patterns and recipes
- [ ] SDK documentation
  - [ ] Python SDK
  - [ ] JavaScript SDK
  - [ ] cURL examples
- [ ] Troubleshooting guide
  - [ ] Common errors
  - [ ] Debugging workflows
  - [ ] Performance optimization

**Files to Create:**
- `docs/api/openapi.yaml`
- `docs/getting-started.md`
- `docs/api-reference/`
- `docs/skills/`
- `docs/troubleshooting.md`
- `sdk/python/` (start)
- `sdk/javascript/` (start)

**Success Criteria:**
- All endpoints documented
- 10+ example workflows
- SDKs functional and documented

---

### Week 6-7: Beta & Hardening

#### Task 1.13: Closed Beta Program
**Goal:** Onboard 5-10 customers to test SaaS

**Subtasks:**
- [ ] Select 5-10 beta customers
  - [ ] Dev teams, automation engineers, SMB ops
- [ ] Create onboarding flow
  - [ ] Automated account creation
  - [ ] Quick-start email series
  - [ ] Office hours for questions
- [ ] Monitor beta usage
  - [ ] Track adoption metrics
  - [ ] Collect feedback via surveys
  - [ ] Support Slack channel
- [ ] Gather feedback and iterate
  - [ ] Improve UX based on feedback
  - [ ] Fix bugs discovered in beta
  - [ ] Enhance documentation

**Files to Create:**
- `docs/beta/onboarding.md`
- `ops/beta_monitoring.py`
- `templates/beta_email_series.md`

**Success Criteria:**
- 5-10 customers actively using SaaS
- <1 week to first successful workflow
- 90%+ satisfaction score

---

#### Task 1.14: Security Audit & Compliance
**Goal:** Pass security review for production

**Checklist:**
- [ ] Security audit by external firm
  - [ ] Penetration testing
  - [ ] Code review for vulnerabilities
  - [ ] Architecture review
- [ ] Compliance certification
  - [ ] SOC 2 Type II readiness
  - [ ] GDPR compliance
  - [ ] Data residency controls
- [ ] Encryption verification
  - [ ] Data at rest encryption
  - [ ] Data in transit encryption (TLS)
  - [ ] Key management
- [ ] Access controls
  - [ ] RBAC implementation
  - [ ] Audit logging
  - [ ] Breach notification procedures

**Files to Create:**
- `docs/security/security-whitepaper.md`
- `docs/compliance/SOC2_checklist.md`
- `ops/security_monitoring.py`

**Success Criteria:**
- Security audit passed
- Zero critical vulnerabilities
- SOC 2 roadmap established

---

### Week 7-8: Launch Preparation

#### Task 1.15: Pricing & Billing Infrastructure
**Goal:** Full billing system for SaaS launch

**Subtasks:**
- [ ] Finalize pricing tiers
- [ ] Set up Stripe integration
  - [ ] Customer creation
  - [ ] Subscription management
  - [ ] Invoice generation
  - [ ] Webhook handling
- [ ] Build billing dashboard
  - [ ] Current usage
  - [ ] Cost projection
  - [ ] Invoice history
  - [ ] Payment methods
- [ ] Create dunning flow
  - [ ] Failed payment retry
  - [ ] Account suspension
  - [ ] Reactivation process

**Files to Create:**
- `deterministic-brain/billing/stripe_adapter.py`
- `deterministic-brain/api/routes/billing_stripe.py`
- `deterministic-brain/ui/billing/` (React components)

**Success Criteria:**
- Stripe integration fully functional
- Zero billing errors in test
- All flows documented

---

#### Task 1.16: Marketing & Sales Materials
**Goal:** Launch-ready marketing

**Deliverables:**
- [ ] SaaS landing page
- [ ] Feature comparison matrix
- [ ] Customer case studies
- [ ] Sales deck (PDF)
- [ ] Email campaigns
- [ ] Social media content
- [ ] Press release

**Success Criteria:**
- Website ready for launch
- Sales team trained
- Marketing collateral complete

---

## Priority 2: Aetherdesk SaaS (Weeks 6-10)

### Core Tasks
- [ ] Production scaling & hardening
- [ ] Customer onboarding automation
- [ ] Multi-tenant isolation audit
- [ ] SIP/RTP optimization for scale
- [ ] Integration with Deterministic Brain lead router

---

## Priority 3: OpenHub SaaS (Weeks 8-12)

### Core Tasks
- [ ] Production deployment
- [ ] Portfolio dashboard finalization
- [ ] API documentation
- [ ] Team collaboration features
- [ ] Integration with all portfolio companies

---

## Success Metrics Dashboard

| Metric | Target | Owner | Status |
|--------|--------|-------|--------|
| Deterministic Brain SaaS Revenue | $50k/mo (Year 1) | Ops | 🟡 In Progress |
| Public Customers | 100+ | Sales | 🟡 Beta Phase |
| API Uptime | 99.9% | Ops | 🟡 Testing |
| Avg Response Time | <200ms p95 | Eng | 🟡 Optimizing |
| Documentation Quality | 100% endpoint coverage | Eng | 🟡 In Progress |
| Security Audit | SOC 2 Ready | Security | 🟡 Scheduled |

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| Multi-tenant data leak | Critical | Low | Isolation testing, regular audits |
| Scale performance issues | High | Medium | Load testing, caching, optimization |
| Customer churn if public < internal quality | High | Medium | Feature parity, SLA guarantees |
| Key person dependency | Medium | High | Documentation, cross-training |
| Competitive pressure | Medium | High | First-mover advantage, integration moat |

---

## Timeline Visualization

```
Week 1-2: Foundation & Architecture
  ├── Multi-tenant isolation
  ├── Feature gates
  └── API authentication

Week 2-3: Deployment Infrastructure
  ├── Kubernetes setup
  ├── Private deployment
  └── Billing engine

Week 3-4: API & Skills
  ├── Public SaaS API (v1)
  └── Safe skill library

Week 4-5: Integration
  ├── Aetherdesk ↔ Brain
  └── OpenHub ↔ Brain

Week 5-6: Testing & Documentation
  ├── Comprehensive tests
  └── Developer portal

Week 6-7: Beta & Hardening
  ├── Closed beta program
  └── Security audit

Week 7-8: Launch Preparation
  ├── Billing infrastructure
  └── Marketing materials

LAUNCH → Public SaaS Live
```

---

## Next Immediate Actions (This Week)

1. [ ] **Code Audit**: Review Deterministic Brain API for multi-tenant readiness
2. [ ] **Architecture Review**: Design tenant isolation schema with security team
3. [ ] **Spike Task**: Build proof-of-concept for multi-tenant middleware
4. [ ] **Planning**: Detailed breakdown of Week 1-2 tasks with team
5. [ ] **Stakeholder Alignment**: Present roadmap to leadership for feedback

