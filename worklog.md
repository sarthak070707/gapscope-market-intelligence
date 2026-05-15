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
