---
Task ID: 1
Agent: Main Agent
Task: Investigate and fix backend shared dependency failures causing all 4 API modules to fail with "Error Type: unknown"

Work Log:
- Read all 4 API route files (/api/scan, /api/analyze, /api/opportunities, /api/trends) and all shared utilities (zai.ts, db.ts, error-handler.ts, json.ts, utils.ts)
- Identified 7 root causes for "Error Type: unknown" failures:
  1. **zai.ts** - No initialization guard on ZAI.create(), raw SDK errors not wrapped
  2. **zai.ts** - JSON extraction bug: Strategy 4 regex only handled `]` not `}`, and findBalancedJson fell back to extracting single `{...}` objects from inside arrays
  3. **zai.ts** - No logging around SDK calls, making debugging impossible
  4. **error-handler.ts** - Missing error patterns for rate_limit, auth, SDK-specific errors, empty responses, web search failures
  5. **db.ts** - No connection validation, no health check, no error wrapping
  6. **Route handlers** - No global error catch layer, so uncaught exceptions returned generic 500s
  7. **Frontend** - Missing error category configs for rate_limit and auth
- Fixed zai.ts:
  - Added initialization guard with cached error (getZAI won't retry failed init)
  - Added try/catch around all SDK calls (webSearch, readPage, chatCompletion) with proper error wrapping
  - Completely rewrote JSON extraction: added pre-processing to strip code fences, fixed findBalancedJson to never fall back from array to single object, improved repairTruncatedJson with safe-point tracking
  - Added comprehensive console logging before/after every SDK call
- Fixed error-handler.ts:
  - Added rate_limit and auth error categories
  - Added 15+ new error patterns for SDK-specific errors
  - Added withErrorHandler global route handler wrapper
  - Made classifyError check rate_limit FIRST (most common production issue)
  - Added isAuthError check to prevent retrying auth errors
  - Increased rate limit retry max delay to 120s
- Fixed db.ts:
  - Added checkDatabaseConnection() health check function
  - Added safeDbOp() wrapper for database operations
  - Added PrismaClient initialization error capture
  - Added better error messages for locked DB, missing schema
- Updated all 4 API routes:
  - Added withErrorHandler wrapper for global error catching
  - Added pre-flight database health checks
  - Added comprehensive console logging throughout
  - Added errorCategory to debug info in all error responses
- Updated frontend module-error-state.tsx:
  - Added rate_limit and auth to CATEGORY_CONFIG with proper colors/badges
- Reduced opportunity generation from 3-5 to 2-3 items to avoid response truncation

Stage Summary:
- **CRITICAL BUG FIXED**: JSON extraction was returning single objects instead of arrays because findBalancedJson fell back from `[]` to `{}` extraction. This was the primary cause of "0 products extracted" and "0 opportunities generated" errors.
- **CRITICAL BUG FIXED**: Code fence stripping was not happening before JSON parsing, causing `\`\`\`json` prefixed responses to fail all parsing strategies.
- All 4 endpoints now properly classify errors: rate_limit, auth, ai_response, database, timeout, etc. (not "unknown")
- Tested /api/scan: returned 20 products successfully (was returning 0 before)
- Tested /api/trends: returned 5 trends successfully
- Tested /api/analyze: returns gaps, saturation, and complaints (partial errors handled gracefully)
- Rate limit errors are properly caught, wrapped, and classified with retryable:true
- Server logs now show detailed diagnostic info for every operation
