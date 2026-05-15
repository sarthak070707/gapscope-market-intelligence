---
Task ID: 1
Agent: Main Agent
Task: Fix rate limiting in /api/scan and /api/trends — increase delays, add pre-search cooldown, avoid retrying 429s

Work Log:
- Added `RATE_LIMIT_COOLDOWN_MS = 12_000` (12s) and `PRE_SEARCH_DELAY_MS = 1_500` (1.5s) constants to /api/scan/route.ts
- Changed web search retry logic: `maxRetries: 0` for 429s (don't waste retries on rate limits — they need cooldown time, not immediate retries)
- Added `shouldRetry` filter that only retries non-rate-limit errors (timeouts, network glitches)
- Added pre-search cooldown delay before first query to let rate limits from previous requests cool down
- After a 429, the code now waits 12 seconds before the next query (instead of 5s)
- After a non-429 failure, waits 4s before next query (instead of 3s)
- Applied the same fix to /api/trends/route.ts handleDetectTrends function
- Verified lint passes with no errors
- Verified all API endpoints return 200
- Verified /api/analyze already never returns 'unknown' error category (classifyError handles it)

Stage Summary:
- Rate limit cooldown between sequential web search queries increased from 5s → 12s
- Pre-search delay of 1.5s added before first query
- 429 errors no longer retried immediately — they fail fast and trigger longer cooldown before next query
- This prevents the pattern where all 4 queries get 429'd because they're sent too quickly
- Both /api/scan and /api/trends now have consistent rate limit handling

---
Task ID: 2
Agent: Main Agent
Task: Implement strict rate-limit lockout for Product Hunt Scanner

Work Log:
- Added `retryAfterSeconds` and `providerMessage` fields to ModuleError interface in error-handler.ts
- Created in-memory cooldown store in /api/scan/route.ts with CooldownEntry interface tracking: cooldownUntil, durationMs, stage, endpoint, category, period, providerMessage, escalationCount
- Cooldown is keyed by `${category}:${period}:/api/scan` — scoped to specific scan configurations
- Initial cooldown: 120 seconds; escalated cooldown: 300 seconds (after repeated 429)
- Backend POST handler now checks cooldown BEFORE creating scan job — returns 429 with full ModuleError + retryAfterSeconds
- Web search loop now stops on FIRST 429 — does NOT try remaining queries
- On first 429: enters cooldown, throws error with __cooldownMeta attached
- Catch block in executeScanBackground preserves __cooldownMeta on the ModuleError (retryAfterSeconds, providerMessage, stage, statusCode)
- Created `/src/hooks/use-rate-limit-cooldown.ts` hook with: isCooldownActive, remainingSeconds, cooldownState, enterCooldown, clearCooldown
- Hook uses shared global Map with 1-second interval for countdown updates
- Updated ScannerPanel to use the cooldown hook — blocks scan during cooldown, disables Scan button, shows cooldown time
- Added dedicated cooldown banner UI between progress and error states with: shield icon, countdown timer, progress bar, provider message, escalation badge
- Updated ModuleErrorState to accept isRateLimitCooldown and cooldownRemainingSeconds props
- ModuleErrorState replaces Retry button with "Cooldown" button + countdown when rate-limited
- ModuleErrorState debug info now shows retryAfterSeconds and providerMessage fields
- Updated handleFetchError in fetch-error.ts to preserve retryAfterSeconds and providerMessage from backend 429 responses
- Scan button shows "Cooldown (2m 30s)" when active; Enter key also blocked during cooldown
- Cooldown is cleared on successful scan completion
- Lint passes cleanly with no errors

Stage Summary:
- Complete rate-limit lockout system implemented end-to-end
- Backend: rejects requests during cooldown (429), stops on first 429, enters 120s/300s cooldown
- Frontend: disables Retry + Scan buttons, shows countdown timer, cooldown banner with escalation info
- Debug info preserved: stage, endpoint, category, retryAfterSeconds, providerMessage, escalationCount
- Cooldown scoped by category + period + endpoint to prevent cross-configuration blocking

---
Task ID: 3
Agent: Main Agent
Task: Fix Debug Info missing fields + onError overwriting scanError + possibleReason truncation

Work Log:
- Fixed critical bug: `onError` callback was overwriting `scanError` with a re-classified error that loses `retryAfterSeconds`, `providerMessage`, `backendMessage`, and `statusCode` fields. Root cause: `scanError` closure value is stale when `onError` runs (React state updates are async), so `if (!scanError)` was always true even after mutationFn set it.
- Fix: Added `scanErrorSetRef` ref to track whether scanError was already set in mutationFn. All `setScanError()` calls in mutationFn now also set `scanErrorSetRef.current = true`. The `onError` callback checks the ref instead of the stale closure.
- Fixed "Possible reason" truncation: increased `substring(0, 150)` → `substring(0, 300)` in the `alreadyClassified` branch, and `substring(0, 100)` → `substring(0, 200)` in all other branches of classifyError.
- Fixed `statusCode` missing from `alreadyClassified` branch of classifyError: now includes `statusCode` for rate_limit (429), auth (401/403), not_found (404), bad_gateway (502), server_error (500), service_unavailable (503) prefixes.
- Cleaned up rate-limit error message: removed inline provider message from the thrown error (it's already available as `providerMessage` on the ModuleError). Message now reads: "Search API rate limit reached. The first web search query returned HTTP 429 — remaining queries were NOT executed..."
- Lint passes cleanly.

Stage Summary:
- Debug Info now correctly shows: Status, Backend Message, Provider Message, Retry After fields
- onError no longer overwrites the carefully-constructed ModuleError from mutationFn
- possibleReason no longer truncated at 150 chars
- Error message less verbose — provider message shown separately, not embedded inline
