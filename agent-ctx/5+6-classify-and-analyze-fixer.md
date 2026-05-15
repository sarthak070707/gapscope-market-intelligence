# Task 5+6: Fix classifyError and /api/analyze route

## Summary
- Fixed `classifyError` in error-handler.ts to never return 'unknown' category
- Fixed /api/analyze/route.ts to make sub-analyses soft-fail and reduce LLM calls

## Changes Made

### error-handler.ts
- Added 5 new error pattern blocks: constraint/foreign key, schema/migration, timeout-like, rate-limit-like, AI/LLM generation
- Changed final Error fallback from `category: 'unknown'` to `category: 'api'`
- Changed non-Error fallback from `category: 'unknown'` to `category: 'api'`

### /api/analyze/route.ts
- INTER_CALL_DELAY_MS: 2000 → 4000
- MAX_RETRIES: 2 → 1
- analyzeSaturation: wrapped entire body in try/catch, returns [] on any uncaught error
- analyzeComplaints: returns `{ complaints: [], clusters: [] }` instead of re-throwing on LLM failure
- Added rateLimitHit flag to skip clustering call when extraction already hit rate limit

## Lint: Passed
