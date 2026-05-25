# Daily Log

## 2026-05-24
- **Phase 3 Complete: Deterministic Brain ↔ BB-Tech ↔ Northside Smoke Integration**

### Built
1. **`workflows/research_experiment.py`** — Shared workflow contract
   - `ResearchExperiment` dataclass with: experiment_id, entry_mode (SCHEDULED/ADHOC), status lifecycle (PENDING→RUNNING→COMPLETED/FAILED→APPROVED/REJECTED)
   - `ResearchInput` payload schema: target_type, target_ids, state_codes, days_back, criteria_version, tenant
   - `ProvenanceEntry` immutable lineage tracking (hop, action, timestamp, checksum)
   - `ArtifactRef` for output references
   - `to_dict()`/`from_dict()` serialization across system boundaries

2. **`adapters/bbtech.py`** — BB-Tech Adapter for Deterministic Brain
   - Follows existing `BaseAdapter` pattern (idempotency, retry, caching)
   - `run_pipeline()` — trigger BB-Tech daily research cycle
   - `get_pipeline_status()` — check latest run
   - `get_archetypes()` — fetch archetype catalog
   - `run_experiment()` — full lifecycle through ResearchExperiment contract
   - `to_pipeline_summary()` — typed summary from API response

3. **`agi/daily_orchestrator.py`** — DEEP_RESEARCH phase (Phase 7)
   - New `run_deep_research()` method called after RECONCILE
   - Creates daily research experiment with provenance
   - Calls BB-Tech pipeline via adapter
   - Logs results to event ledger

4. **`api/server.py`** — Governor routing + workflow endpoints
   - Governor now actually executes bb-tech action: `POST /governor/route` with `research_experiment` triggers BB-Tech pipeline
   - `POST /workflows/research/run` — Trigger ad-hoc research experiment
   - `GET /workflows/research/{id}/status` — Poll experiment status
   - `GET /workflows/research/{id}/results` — Get experiment results
   - `GET /workflows/research/latest` — Latest pipeline summary
   - `GET /workflows/research/criteria` — Quality criteria overview

### Architecture
```
DBrain (port 8000)
  ├── Governor ── research_experiment ──→ BBTechAdapter ──→ BB-Tech (port 8005)
  ├── Workflow API ── POST /workflows/research/run ──→ BBTechAdapter
  └── DailyOrchestrator ── run_deep_research() ──→ BBTechAdapter
                                                  │
                                                  ▼
                                          Northside Smoke (port 3005)
                                          Compliance Review UI
```

### Tests
- DBrain: 116/123 passing (7 pre-existing ExecutiveKernel isolation failures)
- BB-Tech: 39/39 passing
- Node build: passes (4.25s)

## 2026-05-25
- **Gemma Integration Audit Fixes — All 14 issues resolved**

### Fixed
1. **BB-Tech-main `Tiz554/tools/local_gemma.py`** — File doesn't exist (already resolved)
2. **ai-core `gemma.ts`** — Both `generate()` and `chat()` now catch fetch failures gracefully (return empty result instead of throwing). `AICore.checkLocalModel()` now also checks Gemma provider availability.
3. **UL2-main `local.ts`** — Removed dead `const prompt` variable in llama.cpp chat branch
4. **Uplift-Venture `local.ts`** — Fixed Ollama chat to use `options.num_predict` not top-level `max_tokens`; llama.cpp chat no longer sends invalid `model` field; `chat()` now returns `tokensUsed`; `generate()` uses correct Ollama key (`eval_count`)
5. **ai-core example file** — Updated all `gemma:4b` references to correct `hf.co/unsloth/gemma-4-E2B-it-GGUF:UD-IQ2_M`
6. **OpenHub `providers.py`** — `GemmaProvider.call()` and `LocalProvider.call()` now delegate to base class `_api_call()` instead of duplicating retry logic
7. **UL2 `.env` and Uplift-Venture `.env.local`** — Added `GEMMA_BASE_URL`, `GEMMA_MODEL`, `LOCAL_MODEL_URL`, `LOCAL_MODEL_NAME` (UL2) and `VITE_LOCAL_MODEL_URL`, `VITE_LOCAL_MODEL_NAME`, `VITE_OLLAMA_BASE_URL`, `VITE_OLLAMA_MODEL` (UV)
8. **Northside Smoke `local_gemma.py`** — `is_available()` now references `PROBE_ENDPOINTS` constant instead of duplicating the list
9. **Northside Smoke `local_gemma.py`** — Removed redundant `requests` re-import inside `_probe_local_url`
10. **UL2 `AICore.ts`** — Now imports and uses `GemmaProvider` properly instead of routing `"gemma"` to `LocalProvider`
11. **Uplift-Venture `local.ts`** — `chat()` now includes `tokensUsed` in return
12. **OpenHub `LLMRouter._init_providers()`** — Local/Gemma providers only registered when env vars suggest configuration exists
13. **ai-core `AICore.ts`** — `providers.local` now handles both array and single-object configs
14. **Model references** — Standardized across all projects to `hf.co/unsloth/gemma-4-E2B-it-GGUF:UD-IQ2_M`

## 2026-05-25 (Session 2)
- **Phase 4: Supabase RLS + Production DB — Foundation Task 1 complete**

### Built
1. **`supabase/migrations/20250525000001_rls_policies.sql`** — RLS migration
   - Created `tenants` table for multi-tenant isolation (Boutique/Enterprise/Autonomous tiers)
   - Added `tenant_id` to `profiles` and `audit_logs` tables
   - Created `compliance_reviews` and `research_results` tables with tenant_id FK
   - Helper function `get_user_tenant_id()` for reusable tenant lookup
   - Service role bypass policies for BB-Tech ↔ Northside Smoke workflows
   - Tenant-isolated SELECT/INSERT/UPDATE policies for all compliance tables
   - Updated `handle_new_user()` trigger function to assign default tenant
   - Preserved backward compatibility with existing user-level policies

2. **`supabase/seed.sql`** — Demo data for local testing
   - Default Enterprise tenant (Northside Smoke Demo)
   - 4 sample compliance reviews (completed/blocked/in_progress/pending)
   - 3 research results with archetype classification
   - 6 audit log entries covering full compliance workflow

3. **`docs/database/rls-policies.sql`** — Reference architecture documentation

### RLS Strategy
- **Tenant isolation**: `tenant_id = get_user_tenant_id()` (derived from auth.uid() → profiles)
- **Service role bypass**: `(SELECT auth.role() = 'service_role')` for cross-system workflows
- **Fallback for audit_logs**: `user_id = auth.uid()` OR `tenant_id = get_user_tenant_id()`

### Next
- Phase 5: E2E Playwright tests for full compliance flow


