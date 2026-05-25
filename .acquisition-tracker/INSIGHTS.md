# Market Insights

## 2026-05-25 — Gemma Integration Audit
- All 14 Gemma integration issues fixed across 6 projects. Wiring/plumbing issues, not architectural — pattern of local LLM integration (Ollama OpenAI-compatible API) is consistent.
- `checkLocalModel()` now checks both LocalProvider and GemmaProvider, enabling proper fallback detection.
- Standardized model references to `hf.co/unsloth/gemma-4-E2B-it-GGUF:UD-IQ2_M` across all projects.
- OpenHub providers now use base class delegation instead of duplicated retry logic — better DRY compliance for due diligence.

## 2026-05-25 (Session 2) — RLS Migration
- RLS infrastructure now supports both tenant-isolated access and service-role bypass, enabling the BB-Tech → Northside Smoke data flow while maintaining per-tenant data isolation.
- `compliance_reviews` and `research_results` tables are ready for the BB-Tech pipeline to write results that Northside Smoke UI can read with tenant-scoped security.
- Seed data provides realistic demo content (4 reviews, 3 research results, 6 audit entries) covering all status states for UI development and testing.
- The tenant model maps directly to existing subscription tiers (Boutique/Enterprise/Autonomous), creating a natural up-sell path: higher tiers get better compliance analytics.
