# SaaS Portfolio Architecture
> **Date:** May 24, 2026  
> **Status:** Blueprint Phase  
> **North Star:** Deterministic Brain as operational heart + unified acquisition funnel

---

## 1. Core Vision: Private + Public Dual-Instance Model

```
┌─────────────────────────────────────────────────────────────┐
│                  DETERMINISTIC BRAIN                        │
│            (Operational Intelligence Engine)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ INTERNAL/PRIVATE INSTANCE (24/7 Business Operator)   │   │
│  │ - Orchestrates ALL portfolio operations              │   │
│  │ - Manages Aetherdesk customer routing                │   │
│  │ - Monitors OpenHub repos and issues                  │   │
│  │ - Coordinates BB-Tech research commercialization     │   │
│  │ - Tracks UL2 community impact metrics                │   │
│  │ - Executes Uplift Venture deal workflows             │   │
│  └──────────────────────────────────────────────────────┘   │
│                        ▲                                      │
│                        │ (Sync & Federation)                 │
│                        ▼                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ PUBLIC/SAAS INSTANCE (Customer-Facing)               │   │
│  │ - Sanitized, multi-tenant automation engine          │   │
│  │ - No access to proprietary business logic            │   │
│  │ - Customers rent compute + orchestration capability  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles
- **Single codebase**, dual deployment model
- **Private instance** runs on-prem or private cloud (your operational core)
- **Public instance** runs on isolated multi-tenant infrastructure
- Both share core orchestration engine; public version has feature gates and isolation
- Revenue from **public SaaS customers** funds development of **private ops**

---

## 2. Tier 1: Deterministic Brain SaaS

### 2.1 Architecture: Private + Public

#### **Private Instance (Internal)**
- **Purpose**: 24/7 autonomous operations across entire portfolio
- **Deployment**: Kubernetes on your private cloud or on-prem
- **Features**:
  - Full skill library (proprietary workflows)
  - Direct access to all portfolio APIs
  - No rate limiting or quotas
  - Real-time system orchestration
  - Decision-making authority across companies

#### **Public Instance (SaaS)**
- **Purpose**: Selling automation orchestration to customers
- **Deployment**: Multi-tenant Kubernetes cluster
- **Features**:
  - Limited skill library (safe, general-purpose workflows)
  - Tenant isolation via RBAC + data encryption
  - Rate limiting and quota enforcement
  - Async task execution with webhooks
  - No access to proprietary company logic

#### **Shared Infrastructure**
```
deterministic-brain/
├── brain/                         # Core logic (shared)
│   ├── router.py                  # MoE router
│   ├── memory.py
│   ├── soul.py
│   └── ...
├── orchestration/                 # Execution engine (shared)
│   ├── dca_engine.py
│   ├── skill_executor.py
│   └── ...
├── api/                           # API layer (feature-gated)
│   ├── routes/                    # Endpoint definitions
│   │   ├── orchestration.py       # (Public)
│   │   ├── skills.py              # (Public)
│   │   ├── tasks.py               # (Public)
│   │   ├── internal.py            # (Private only)
│   │   └── admin.py               # (Private only)
│   └── middleware/
│       ├── auth.py                # Multi-tenant auth
│       ├── isolation.py           # Tenant data isolation
│       └── feature_gates.py       # Private vs Public features
├── skills/                        # Skill library
│   ├── public/                    # General-purpose (safe)
│   │   ├── workflow_orchestration.md
│   │   ├── task_scheduling.md
│   │   ├── notification_routing.md
│   │   └── ...
│   └── private/                   # Proprietary (internal only)
│       ├── portfolio_sync.md      # Sync all companies
│       ├── acquisition_routing.md # Lead routing logic
│       ├── revenue_automation.md  # Revenue ops
│       └── ...
└── deployment/
    ├── private/
    │   ├── docker-compose.private.yml
    │   ├── kubernetes/private/
    │   └── .env.private.example
    └── public/
        ├── docker-compose.public.yml
        ├── kubernetes/public/
        ├── .env.public.example
        └── multi-tenant-config.yaml
```

### 2.2 SaaS Features (Public Tier)

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| **Simultaneous Workflows** | 3 | 20 | Unlimited |
| **Execution Time/month** | 100 hrs | 500 hrs | Custom |
| **Skill Library Size** | 10 | 50 | 200+ |
| **Data Storage** | 1 GB | 50 GB | Custom |
| **API Rate Limit** | 100/min | 1000/min | Custom |
| **Webhook Callbacks** | 10/day | 1000/day | Unlimited |
| **Audit Logging** | 30 days | 1 year | Custom |
| **Support** | Community | Email | Dedicated |

### 2.3 Public SaaS API (Example endpoints)
```
POST /api/v1/workflows/create        # Define automation workflow
POST /api/v1/workflows/{id}/run      # Execute workflow
GET  /api/v1/workflows/{id}/status   # Check execution status
POST /api/v1/skills/search           # Find available skills
GET  /api/v1/executions/{id}/logs    # Get execution logs
POST /api/v1/tasks/schedule          # Schedule recurring task
DELETE /api/v1/workflows/{id}        # Delete workflow
```

### 2.4 Revenue Model for Public SaaS
- **Tier Pricing**: $99/mo (Pro), $499/mo (Enterprise)
- **Usage-Based Add-ons**: Extra execution hours, storage, API calls
- **Enterprise Contracts**: Custom workflows, dedicated support
- **Target Market**: Dev teams, automation engineers, SMB ops teams

---

## 3. Tier 1: Aetherdesk SaaS (Customer Acquisition Layer)

### 3.1 Dual Role
- **Internal**: Customer support, lead capture, sales funnel
- **Public**: Agent rental and call center SaaS platform

### 3.2 Deterministic Brain Integration

**For Internal Operations:**
```yaml
# Private workflow: Lead Routing
lead_received:
  - trigger: call_ended
  - evaluate_sentiment
  - route_to_sales_team:
      by_industry: ${lead.industry}
      by_value: ${lead_value}
  - log_to_openhub_crm
  - notify_deterministic_brain  # Feed back to ops engine
```

**For Public Customers:**
```
Customer → Aetherdesk Call Center → Stores call metadata
                                  ↓
                          Deterministic Brain SaaS
                          (Orchestrate customer workflows)
                                  ↓
                          Send insights back to Aetherdesk dashboard
```

### 3.3 Aetherdesk SaaS Tiers

| Tier | Monthly | Agents | Concurrent Calls | AI Features |
|------|---------|--------|------------------|-------------|
| **Starter** | $299 | 2 | 5 | Basic IVR |
| **Professional** | $999 | 10 | 25 | Smart routing, sentiment |
| **Enterprise** | Custom | 50+ | 100+ | AI agents, forecasting |

---

## 4. Tier 1: OpenHub (Centralized Coordination Layer)

### 4.1 Role: Multi-Repo Orchestration

```
OpenHub (Central Hub)
├── Portfolio Dashboard
│   ├── Aetherdesk stats (calls, revenue)
│   ├── Deterministic Brain status (24/7 monitor)
│   ├── UL2 community metrics
│   ├── BB-Tech research progress
│   └── Uplift Venture pipeline
│
├── Cross-Repo Issue Tracker
│   ├── Link Aetherdesk leads → Uplift Venture deals
│   ├── Link BB-Tech research → Northside Smoke products
│   ├── Link UL2 contributors → Skill developers
│   └── Sync all issues to Deterministic Brain
│
├── Unified API Gateway
│   ├── Aetherdesk → OpenHub → Deterministic Brain
│   ├── BB-Tech findings → Uplift Venture → Aetherdesk
│   ├── UL2 community → Deterministic Brain → All systems
│   └── All incoming signals normalized
│
└── Access Control
    ├── Portfolio-level RBAC
    ├── Cross-company permission model
    └── Audit log for all integrations
```

### 4.2 OpenHub as Public SaaS
- **For Internal**: Portfolio operations dashboard
- **For Public**: Developer collaboration platform (like GitHub/Linear)
  - Repo management across multiple projects
  - Issue tracking and AI-assisted workflows
  - Team collaboration and knowledge sharing
  - Integrations with CI/CD and deployment tools

---

## 5. Tier 2: Secondary Verticals (Revenue + Innovation)

### 5.1 BB-Tech + Northside Smoke

**Private Use:**
- Research pipeline feeds into Deterministic Brain
- Automated research-to-product pipeline
- Discovery signals drive Uplift Venture commercialization

**Public SaaS (R&D-as-a-Service):**
- Sell biotech research platform
- Cannabis/THC compliance and regulatory tools
- Custom research orchestration workflows

### 5.2 UL2 (Nonprofit + Community)

**Private Use:**
- Talent pipeline for all portfolio companies
- Community signal monitoring
- Impact storytelling for investor relations

**Public SaaS:**
- AI education platform
- Community management tools
- Impact measurement dashboards

### 5.3 Uplift Venture (B2B SaaS Sales)

**Private Use:**
- Package and sell cross-portfolio solutions
- Handle enterprise contracts
- Route complex deals

**Public SaaS:**
- Business OS for solo operators
- Workflow templates and integrations
- No-code automation builder

---

## 6. Integration Architecture

### 6.1 The Central Nervous System

```
                    DETERMINISTIC BRAIN (Private)
                    (24/7 Operational Intelligence)
                            ▲  ▼
        ┌───────────────────┼──┼───────────────────┐
        │                   │  │                   │
        ▼                   ▼  ▼                   ▼
    AETHERDESK          OPENHUB              BB-TECH
    (Acquisition)    (Coordination)      (Research)
        │                 │                  │
        │                 │                  │
        └─────────────────┼──────────────────┘
                          ▼
                    UPLIFT VENTURE
                    (Monetization)
                          │
                          ▼
                    PUBLIC MARKET
                    (SaaS Customers)
```

### 6.2 Data Flow: Private Portfolio Ops

```
1. Aetherdesk receives call → creates lead
2. Lead data → Deterministic Brain (private)
3. Brain routes based on portfolio opportunities
4. Updates OpenHub with opportunity ticket
5. Notifies Uplift Venture sales team
6. Tracks in OpenHub dashboard
7. Reports back to Aetherdesk for follow-up
```

### 6.3 Data Flow: Public SaaS

```
1. Public customer uses Aetherdesk or Deterministic Brain SaaS
2. Request isolated in multi-tenant context
3. Processed by sandboxed skill/workflow
4. Results returned to customer
5. Metrics tracked for usage-based billing
6. No access to portfolio ops or private skills
```

---

## 7. Deployment Roadmap

### Phase 1: Foundational (Weeks 1-4)
- [ ] Deterministic Brain: Feature gate public vs private skills
- [ ] Deterministic Brain: Multi-tenant isolation layer
- [ ] Deterministic Brain: API authentication/RBAC
- [ ] OpenHub: Cross-repo dashboard integration
- [ ] Aetherdesk: Webhook integration with Deterministic Brain

### Phase 2: Public SaaS Ready (Weeks 5-8)
- [ ] Deterministic Brain: Multi-tenant Kubernetes deployment
- [ ] Deterministic Brain: Usage billing engine
- [ ] Aetherdesk: Production scaling
- [ ] OpenHub: Public SaaS features (team workspace)
- [ ] All systems: Health monitoring and alerts

### Phase 3: Sales & Growth (Weeks 9+)
- [ ] Customer onboarding automation
- [ ] Marketing site and sales deck
- [ ] Sales team trained on SaaS pitch
- [ ] Enterprise contract templates
- [ ] Dedicated support for paying customers

---

## 8. Success Metrics

| Metric | Target (12 months) | Trigger |
|--------|-------------------|---------|
| **Deterministic Brain SaaS Revenue** | $50k/mo | 500+ customer workflows running |
| **Aetherdesk SaaS Revenue** | $100k/mo | 20+ paying customers |
| **Portfolio Automation Cost Savings** | 60% reduction | Ops team productivity 2x |
| **OpenHub Adoption** | 100% of portfolio | All repos migrated |
| **BB-Tech Research to Product** | 3+ commercialized | Revenue-generating pipeline |
| **UL2 Community Impact** | 1000+ beneficiaries | Market position as trusted nonprofit |

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Private ops leak into public | Feature gates + code audits + infra isolation |
| Data breach in multi-tenant | Encryption + RBAC + audit trails + compliance certs |
| Public SaaS cannibalizes internal | Usage tiers + feature differences + custom contracts |
| Integration complexity | Standard APIs + OpenHub as hub + monitoring |
| Team overload | Automate with Deterministic Brain itself |

---

## Next Steps

1. **Immediate** (This week):
   - [ ] Audit Deterministic Brain API for SaaS readiness
   - [ ] Design multi-tenant isolation schema
   - [ ] Create feature flag system (public/private)
   - [ ] Prototype OpenHub integration

2. **Short-term** (Next 2 weeks):
   - [ ] Build Kubernetes deployment for multi-tenant
   - [ ] Implement usage billing engine
   - [ ] Create SaaS pricing and feature matrix
   - [ ] Start customer beta outreach

3. **Medium-term** (Weeks 3-4):
   - [ ] Launch closed beta for Deterministic Brain SaaS
   - [ ] Productionize Aetherdesk SaaS
   - [ ] Onboard first 10 enterprise customers
   - [ ] Document all integration APIs
