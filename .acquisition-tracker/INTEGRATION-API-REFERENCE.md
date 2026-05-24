# Portfolio Integration API Reference
> **Purpose:** Define all APIs, webhooks, and data contracts between systems  
> **Status:** Active Design  
> **Last Updated:** May 24, 2026

---

## System Boundaries & Data Contracts

```
┌─────────────────────────────────────────────────────────────────┐
│ AETHERDESK (Acquisition)                                        │
│ - Manages calls, agents, customers                              │
│ - Webhook: call_ended → Deterministic Brain                     │
│ - REST: Get lead status from Brain                              │
└──────────────────┬──────────────────────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Webhook Contract   │
        │  call_ended         │
        └─────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ DETERMINISTIC BRAIN (Orchestration)                             │
│ - Receives signals from all companies                           │
│ - Routes to appropriate business logic                          │
│ - Webhooks to OpenHub, Uplift Venture, etc.                     │
└──────────────────┬──────────────────────────────────────────────┘
                   │
        ┌──────────┴─────────────┬─────────────┬──────────────┐
        │                        │             │              │
        ▼                        ▼             ▼              ▼
     OpenHub            Uplift Venture      BB-Tech        UL2
    (Portfolio)         (Sales)             (Research)   (Community)
```

---

## 1. Aetherdesk → Deterministic Brain

### 1.1 Webhook: `call_ended`

**Trigger:** After call completes in Aetherdesk

**URL:** `https://brain.yourcompany.com/webhooks/aetherdesk/call_ended`

**Method:** `POST`

**Headers:**
```
Authorization: Bearer {aetherdesk_webhook_token}
Content-Type: application/json
X-Aetherdesk-Signature: sha256={hmac_signature}
```

**Payload:**
```json
{
  "event": "call_ended",
  "event_id": "evt_abc123xyz",
  "timestamp": "2026-05-24T14:32:00Z",
  "tenant_id": "tenant_aetherdesk_001",
  
  "call": {
    "id": "call_abc123",
    "duration_seconds": 342,
    "started_at": "2026-05-24T14:27:18Z",
    "ended_at": "2026-05-24T14:32:00Z",
    
    "caller": {
      "number": "+1-555-0123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    
    "agent": {
      "id": "agent_xyz789",
      "name": "Support Team",
      "type": "human"  # or "ai"
    },
    
    "call_metadata": {
      "sentiment": "positive",  # positive | neutral | negative
      "intent": "product_inquiry",  # predefined intents
      "resolution": "resolved",  # resolved | escalated | partial
      "tags": ["sales", "product"]
    },
    
    "transcript": {
      "raw": "Customer asked about pricing...",
      "summary": "Customer interested in Pro plan",
      "sentiment_scores": {
        "positive": 0.78,
        "neutral": 0.15,
        "negative": 0.07
      }
    },
    
    "call_recording": {
      "url": "https://aetherdesk.yourcompany.com/recordings/call_abc123.wav",
      "duration_seconds": 342,
      "format": "wav"
    }
  },
  
  "lead": {
    "is_new": true,  # First time caller?
    "value_estimate": 500,  # Estimated deal value USD
    "urgency": "high",  # low | medium | high
    "required_action": "sales_followup"
  }
}
```

**Response:**
```json
{
  "success": true,
  "brain_request_id": "breq_xyz123",
  "routing_decision": {
    "route": "sales_team",
    "priority": "high",
    "assigned_to": "uplift_venture",
    "action_triggered": "create_opportunity"
  },
  "openhub_issue_id": "GH-1234"
}
```

**Retry Logic:**
- 3 retries with exponential backoff (5s, 25s, 125s)
- Retry on 5xx errors and timeouts
- Maximum delivery attempt time: 1 hour

**Example cURL:**
```bash
curl -X POST https://brain.yourcompany.com/webhooks/aetherdesk/call_ended \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

---

### 1.2 REST API: Aetherdesk checks lead status

**Endpoint:** `GET /api/v1/aetherdesk/leads/{lead_id}/status`

**Authentication:** Bearer token (Aetherdesk service account)

**Query Parameters:**
```
include_history=true     # Include previous routing decisions
include_opportunities=true  # Include linked opportunities
```

**Response:**
```json
{
  "lead_id": "lead_abc123",
  "status": "routed",  # pending | routed | assigned | closed
  "routed_at": "2026-05-24T14:32:05Z",
  "routed_to": "uplift_venture",
  "priority": "high",
  
  "opportunities": [
    {
      "id": "opp_xyz789",
      "title": "Pro Plan + Support",
      "value": 500,
      "status": "open",
      "assigned_to": "sales_team",
      "openhub_issue": "GH-1234"
    }
  ],
  
  "recommended_actions": [
    "schedule_demo",
    "send_pricing_sheet",
    "assign_account_manager"
  ]
}
```

---

## 2. Deterministic Brain → OpenHub

### 2.1 REST API: Brain creates/updates issues

**Endpoint:** `POST /api/v1/brain/issues/create`

**Authentication:** Bearer token (Brain service account)

**Payload:**
```json
{
  "repository": "portfolio",  # or specific repo (e.g., "uplift-venture")
  "title": "New Sales Opportunity: John Doe - Pro Plan",
  "description": "Qualified lead from call center. High-value prospect.\n\nCall Details:\n- Duration: 5m 42s\n- Sentiment: Positive\n- Intent: Product inquiry (Pro plan)\n\nLead Details:\n- Name: John Doe\n- Email: john@example.com\n- Phone: +1-555-0123\n- Estimated Value: $500/month\n\n[Full Call Transcript](aetherdesk://calls/call_abc123)",
  
  "labels": ["opportunity", "sales", "high-priority"],
  "assignees": ["sales-team"],
  "milestone": "Q2-2026",
  
  "custom_fields": {
    "lead_source": "aetherdesk_call_center",
    "estimated_value": 500,
    "currency": "USD",
    "probability": 75,
    "call_id": "call_abc123",
    "aetherdesk_link": "https://aetherdesk.yourcompany.com/calls/call_abc123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "issue_id": "GH-1234",
  "issue_url": "https://openhub.yourcompany.com/portfolio/issues/1234",
  "created_at": "2026-05-24T14:32:10Z"
}
```

---

### 2.2 Webhook: OpenHub issue status changed

**Trigger:** When issue state changes (assigned, closed, etc.)

**Payload:**
```json
{
  "event": "issue_updated",
  "event_id": "evt_def456",
  "timestamp": "2026-05-24T15:00:00Z",
  
  "issue": {
    "id": "GH-1234",
    "repository": "portfolio",
    "title": "New Sales Opportunity: John Doe",
    "state": "closed",  # open | closed
    "state_reason": "completed",  # not_planned | completed
    
    "custom_fields": {
      "lead_source": "aetherdesk_call_center",
      "estimated_value": 500,
      "call_id": "call_abc123"
    }
  },
  
  "changes": {
    "state": { "from": "open", "to": "closed" },
    "assignee": { "from": "sales-team", "to": null },
    "labels": { "added": ["won"], "removed": ["open"] }
  },
  
  "closed_reason": "Opportunity won. Customer signed Pro plan + support.",
  "revenue_realized": 500
}
```

---

## 3. Deterministic Brain → Uplift Venture

### 3.1 REST API: Brain creates opportunity

**Endpoint:** `POST /api/v1/brain/opportunities/create`

**Payload:**
```json
{
  "source": "aetherdesk_call_center",
  "source_id": "call_abc123",
  
  "prospect": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "company": "Acme Corp"
  },
  
  "opportunity": {
    "title": "Pro Plan + Support Bundle",
    "description": "High-intent prospect from call center.",
    "estimated_value": 500,
    "currency": "USD",
    "probability": 75,
    "sales_stage": "qualification",
    
    "products": [
      {
        "product_id": "product_pro_plan",
        "quantity": 1,
        "unit_price": 499
      },
      {
        "product_id": "product_support",
        "quantity": 1,
        "unit_price": 1
      }
    ]
  },
  
  "recommended_next_steps": [
    "Schedule demo",
    "Send pricing sheet",
    "Assign account manager"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "opportunity_id": "opp_xyz789",
  "created_at": "2026-05-24T14:32:15Z",
  "assigned_to": "sales_rep_001"
}
```

---

## 4. Deterministic Brain → BB-Tech

### 4.1 Webhook: New research opportunity

**Trigger:** When a customer inquiry could benefit from BB-Tech research

**Payload:**
```json
{
  "event": "research_opportunity",
  "source": "customer_inquiry",
  "inquiry": {
    "customer": "John Doe",
    "question": "Do you have studies on THC effectiveness for chronic pain?",
    "call_id": "call_abc123",
    "sentiment": "serious"
  },
  "research_areas": ["THC_clinical_studies", "chronic_pain_research"],
  "urgency": "high"
}
```

---

## 5. Deterministic Brain → UL2

### 5.1 Webhook: Community impact event

**Trigger:** When actions have community impact potential

**Payload:**
```json
{
  "event": "community_opportunity",
  "event_type": "education",  # education | funding | partnership
  "description": "New research findings on cannabis accessibility",
  "impact_potential": "high",
  "linked_research": "res_123",
  "action_suggested": "create_educational_post"
}
```

---

## 6. System Health & Status APIs

### 6.1 Deterministic Brain: Portfolio Status

**Endpoint:** `GET /api/v1/status/portfolio`

**Response:**
```json
{
  "timestamp": "2026-05-24T16:00:00Z",
  "overall_health": "healthy",  # healthy | degraded | critical
  
  "systems": {
    "aetherdesk": {
      "status": "operational",
      "last_call_received": "2026-05-24T15:58:00Z",
      "active_calls": 12,
      "pending_leads": 5
    },
    "openhub": {
      "status": "operational",
      "issues_created_today": 24,
      "average_resolution_time": "2.5 hours"
    },
    "uplift_venture": {
      "status": "operational",
      "opportunities_open": 18,
      "opportunities_created_today": 3,
      "revenue_pipeline": 45000
    },
    "bbtech": {
      "status": "operational",
      "active_research_projects": 7,
      "new_findings": 2
    }
  },
  
  "metrics": {
    "lead_to_opportunity_rate": 0.68,  # 68% of leads become opportunities
    "average_routing_time_ms": 245,
    "webhook_success_rate": 0.994,
    "database_query_p95_ms": 150
  },
  
  "alerts": []
}
```

---

## 7. Data Flow Example: End-to-End

### Scenario: Customer calls Aetherdesk, becomes qualified lead

```
1. AETHERDESK: Customer calls
   ↓
2. AETHERDESK: Agent handles call
   ↓
3. AETHERDESK: Call ends, sends webhook
   ↓
4. DETERMINISTIC BRAIN: Receives webhook
   - Evaluates lead quality
   - Determines routing (sales, research, support, etc.)
   - Estimates opportunity value
   ↓
5. DETERMINISTIC BRAIN: Creates OpenHub issue
   - Links to original call
   - Assigns to sales team
   - Sets priority based on value
   ↓
6. DETERMINISTIC BRAIN: Creates Uplift Venture opportunity
   - Adds to sales pipeline
   - Suggests next steps
   ↓
7. OPENHUB: Issue notification sent to sales team
   ↓
8. UPLIFT VENTURE: Sales team receives opportunity
   - Sees recommended actions
   - Can view original call
   - Schedules follow-up
   ↓
9. SALES REP: Takes action, closes issue
   ↓
10. OPENHUB: Issue closed
    ↓
11. DETERMINISTIC BRAIN: Webhook received about closed issue
    - Records success
    - Updates metrics
    - Logs revenue
    ↓
12. DASHBOARD: Portfolio status updated
    - Lead conversion recorded
    - Revenue pipeline updated
```

**Total time: <5 seconds from call end to sales team notification**

---

## 8. Error Handling & Recovery

### Webhook Failure Recovery

**Scenario:** Brain doesn't receive Aetherdesk webhook

```
Attempt 1: Immediate (0s)
  ↓ (Failed)
Attempt 2: 5s later
  ↓ (Failed)
Attempt 3: 30s later
  ↓ (Failed)
Attempt 4: 5 minutes later
  ↓ (Failed - Max attempts reached)

Fallback:
  - Aetherdesk stores lead as "pending_sync"
  - Background job polls Brain API hourly
  - Admin alert triggered if >100 pending leads
  - Manual escalation process initiated
```

---

## 9. Authentication & Security

### Webhook Signature Verification (HMAC-SHA256)

**Aetherdesk sends:**
```
X-Aetherdesk-Signature: sha256=abcd1234...
```

**Brain verifies:**
```python
import hmac
import hashlib

webhook_secret = os.getenv("AETHERDESK_WEBHOOK_SECRET")
body = request.body
signature = request.headers.get("X-Aetherdesk-Signature")

expected_signature = "sha256=" + hmac.new(
    webhook_secret.encode(),
    body,
    hashlib.sha256
).hexdigest()

assert signature == expected_signature
```

### API Token Authentication

**All REST calls use Bearer token:**
```
Authorization: Bearer sk_live_abc123xyz_production
```

**Token scopes:**
```
aetherdesk:read       # Read call data
brain:write           # Create workflows
openhub:write         # Create issues
uplift_venture:write  # Create opportunities
```

---

## 10. Monitoring & Observability

### Key Metrics to Track

```
aetherdesk_webhook_latency       # Time from call end to webhook received
brain_routing_latency            # Time to make routing decision
openhub_issue_creation_latency   # Time from webhook to issue created
end_to_end_latency               # Total time call → sales notification

webhook_retry_count              # Number of retries needed
webhook_failure_rate             # % of webhooks that failed
data_loss_rate                   # % of leads that didn't sync

opportunity_creation_rate        # % of leads becoming opportunities
lead_value_distribution          # Distribution of lead estimated values
conversion_rate_by_source        # Conversion rate by lead source
```

### Alert Thresholds

```
Critical:
  - Webhook failure rate > 5%
  - End-to-end latency > 10 seconds
  - Aetherdesk → Brain webhook not received for >1 hour

Warning:
  - Webhook latency > 1 second (p95)
  - Routing decision latency > 500ms
  - Data loss rate > 0.1%
```

---

## Implementation Checklist

- [ ] Aetherdesk webhook sender implemented
- [ ] Brain webhook receiver with signature verification
- [ ] Brain routing logic implemented
- [ ] OpenHub issue creation API integrated
- [ ] Uplift Venture opportunity creation API integrated
- [ ] All error handling and retries implemented
- [ ] Monitoring and alerting configured
- [ ] End-to-end test suite passing
- [ ] Documentation complete
- [ ] Security audit passed

