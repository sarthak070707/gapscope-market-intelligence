---
Task ID: 1
Agent: main
Task: Fix GapScope 502 Bad Gateway error on Product Hunt Scanner + comprehensive error handling overhaul

Work Log:
- Analyzed entire error pipeline: frontend → gateway → backend → SDK
- Root cause: `/api/scan` ran synchronously for 60-120 seconds, causing Caddy gateway to return 502
- Converted `/api/scan` to job-based architecture: POST returns immediately with jobId, background processing, GET polls for results
- Updated ScanJob schema with `stage` and `productIds` fields
- Rewrote `/api/scan/route.ts` with fire-and-forget background processing
- Added GET endpoint for polling scan job status and results
- Updated `fetch-error.ts` with better 502/gateway error handling (preserves backend stage, infers likely stage)
- Updated `scanner-panel.tsx` with polling hook, progress bar, stage tracking
- All error messages now include stage prefixes and original error details
- Dynamic year `CURRENT_YEAR` used instead of hardcoded "2025"

Stage Summary:
- POST /api/scan now returns in ~81ms instead of 60-120 seconds — **502 gateway timeout eliminated**
- Frontend shows real-time progress bar with stage names (WEB_SEARCH, LLM_EXTRACT, etc.)
- All errors preserve original message, stack trace, and stage name
- Gateway errors now include inferred stage based on endpoint
- Polling endpoint handles interrupted jobs gracefully
