# Implementation Roadmap: Phase 1 (Compliance Workflow)

## Goal
Establish a single, high-value integration loop:
Authenticated Compliance Request -> Node Orchestration -> BB-Tech Analysis -> Supabase Persistence -> Audit-Backed UI.

## Scope
1. **Orchestration Layer**: Express server handles auth, rate-limiting, and tenant-scoped audit logging for BB-Tech requests.
2. **Contract Layer**: Define the JSON-RPC-like schema for compliance payloads.
3. **Execution Layer**: BB-Tech Python engine processes compliance logic as an async job.
4. **Persistence Layer**: Result stored in Supabase with RLS-protected audit metadata.
5. **UI**: Compliance workflow dashboard in React, visualizing status and final result.
6. **Verification**: Playwright API/E2E tests covering the happy-path compliance loop.

## Exit-Readiness Targets
- [ ] Tenant-aware audit logs
- [ ] RLS-enforced database access
- [ ] Explicit test coverage for bridge workflows
