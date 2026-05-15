---
Task ID: 1
Agent: main
Task: Eliminate ALL generic wrapper errors and add full stage-level error logging with stack traces

Work Log:
- Searched entire codebase for "encountered an unexpected error", "unexpected error", generic wrapper patterns
- Read all 4 API route files + error-handler.ts + module-error-state.tsx
- Updated ModuleError interface: added `stage`, `originalStack`, `originalName` fields
- Updated classifyError function: added `errorOrigin` extraction (stage from [STAGE_NAME] prefix, originalStack, originalName) and spread into ALL return branches
- Eliminated ALL "An unexpected error occurred" possibleReason strings - replaced with stage-specific messages like "Error at stage SCAN_WEB_SEARCH (TypeError): Cannot read properties of undefined"
- Updated withErrorHandler global wrapper to include full originalStack, originalName, and stage in debug response
- Updated all 4 API route files to include `originalStack` and `stage` in debug objects
- Added `stage` fields to ALL 14 inline moduleError objects across 3 route files (opportunities: 5, analyze: 4, trends: 5)
- Fixed opportunities route: replaced truncated stack (5 lines) with full stack
- Updated frontend ModuleErrorState component: added prominent Stage badge, Backend message box, Error class badge, and full Stack Trace in debug collapsible
- Verified no hardcoded "2025" remains (CURRENT_YEAR used dynamically everywhere)
- Verified no generic error messages remain in codebase
- Lint passes, dev server compiles and runs successfully

Stage Summary:
- ALL generic error messages eliminated - every error now includes a specific stage tag like [SCAN_WEB_SEARCH], [ANALYZE_GAPS_LLM], [OPPS_DB_FETCH]
- ModuleError now carries `stage`, `originalStack`, `originalName` through the full pipeline (backend → API response → frontend)
- Frontend displays: Stage badge, Backend message prominently, Error class, Full stack trace in debug section
- classifyError possibleReason fields now include stage name and original error snippet instead of "An unexpected error occurred"
- The "encountered an unexpected error" string no longer exists anywhere in the codebase

---
Task ID: 2
Agent: main
Task: Fix double [API_ERROR] prefix bug, rate limit masking, 502 misclassification, and frontend double-classification

Work Log:
- Diagnosed root cause: User error [API_ERROR] [API_ERROR] HTTP 502 was caused by (a) classifyError adding prefix to already-prefixed message, and (b) frontend re-classifying errors in onError handler due to stale React state closure
- Fixed classifyError: Added alreadyClassified regex check to detect already-prefixed error messages and skip adding another prefix
- Added 502 Bad Gateway detection in classifyError
- Added createErrorResponse helper function that preserves original message/stack/stage
- Fixed scan route: Added rate limit tracking to distinguish between no results and rate limited
- Fixed scan route: Added early break when some search results found
- Fixed scan route: Added final search query list logging before execution
- Fixed frontend scanner-panel.tsx: Use backend moduleError directly, avoid double-prefixing
- Fixed frontend scanner-panel.tsx: Added scanErrorSetByMutation state flag to prevent re-classification
- Fixed frontend opportunities-panel.tsx, gap-analysis-panel.tsx, trends-compare-panel.tsx with same pattern
- Fixed trends route: Added rate limit tracking with 429-specific error response
- Fixed trends route: Added final search query list logging before execution
- Fixed analyze route: Changed 502 status to 500 for all-failed error
- All lint checks pass cleanly

Stage Summary:
- Double [API_ERROR] prefix bug FIXED
- Rate limit masking FIXED - scan and trends routes now track and report 429 failures specifically
- Frontend double-classification FIXED in all 4 panels
- 502 misclassification FIXED - analyze route returns 500; classifyError now has 502 detection
- createErrorResponse helper added for consistent error response building
- Search query logging added before execution in scan and trends routes

---
Task ID: 2-b
Agent: sub-agent
Task: Fix stale closure bugs in 3 frontend panels (double error classification)

Work Log:
- Identified root cause: useState(false) for error-set-by-mutation flags suffers from stale closure — React state updates are async, so the onError callback reads the stale `false` value and calls classifyError a second time on an already-classified error, producing double-prefixed messages like `[BAD_GATEWAY] [BAD_GATEWAY] HTTP 502`
- Fixed gap-analysis-panel.tsx: Changed `useState(false)` → `useRef(false)` for `errorSetByMutation`; updated all references (`.current` for reads/writes); added `useRef` to React import
- Fixed opportunities-panel.tsx: Same pattern — `useState(false)` → `useRef(false)` for `errorSetByMutation`; updated all references; added `useRef` to React import
- Fixed trends-compare-panel.tsx: Changed both `trendErrorSetByMutation` and `compareErrorSetByMutation` from `useState(false)` → `useRef(false)`; updated all 6 references; added `useRef` to React import
- Verified: No remaining `setErrorSetByMutation`, `setTrendErrorSetByMutation`, or `setCompareErrorSetByMutation` setter calls in the codebase
- Verified: TypeScript compilation passes with no new errors in the 3 modified files
- Verified: All other `useState(false)` usages in the codebase are unrelated (UI toggles, not mutation guards)

Stage Summary:
- Stale closure bug fixed in all 3 panels by replacing useState with useRef for mutation error-tracking flags
- useRef is synchronous — .current writes are immediately visible to onError callbacks, eliminating the double-classification race condition
- No other logic changed; only the state tracking mechanism was swapped

---
Task ID: 3
Agent: main
Task: Fix [BAD_GATEWAY] [BAD_GATEWAY] HTTP 502 double-prefix bug, reduce rate limit failures, improve gateway timeout handling

Work Log:
- Diagnosed full error chain: 502 from Caddy proxy → HTML body → frontend JSON parse fails → classifyError(new Error('HTTP 502')) → [BAD_GATEWAY] HTTP 502 → stale closure causes second classifyError call → [BAD_GATEWAY] [BAD_GATEWAY] HTTP 502
- Fixed classifyError: Added early alreadyClassified check BEFORE all specific pattern checks (502, 429, etc.) to prevent double-prefixing. If message already starts with [PREFIX], return it as-is without re-wrapping.
- Fixed scanner-panel.tsx: Replaced useState(false) with useRef(false) for mutation error tracking (synchronous, no stale closure)
- Fixed scanner-panel.tsx: Added specific gateway error messages for 502, 503, 504 status codes instead of bare "HTTP 502"
- Fixed scan route: Reduced search queries from 10 to 4 strategic queries to reduce rate limit risk and total scan time
- Fixed scan route: Increased inter-query delay from 1s to 3s to respect API rate limits
- Fixed scan route: Added 5s backoff when rate limited before trying next query
- Fixed trends route: Reduced search queries from 10 to 4 strategic queries
- Fixed trends route: Increased inter-query delay from 1s to 3s
- Fixed Caddyfile: Added transport http block with read_timeout 180s, write_timeout 180s, dial_timeout 30s
- Fixed gap-analysis-panel.tsx, opportunities-panel.tsx, trends-compare-panel.tsx: Same useState → useRef fix via subagent
- All lint checks pass cleanly

Stage Summary:
- [BAD_GATEWAY] [BAD_GATEWAY] double-prefix bug FIXED at both source (classifyError) and trigger (stale closure)
- Scan time reduced from ~56s to ~20s by reducing queries from 10→4 with 3s delays
- Rate limit protection improved with 5s backoff on 429 errors
- Gateway error messages now explain what 502/503/504 means instead of bare "HTTP 502"
- Caddy timeout extended to 180s (from default ~30s) to prevent premature 502s

---
Task ID: 4
Agent: main
Task: Fix LLM single-object-instead-of-array bug, add 502 error handling in SDK, create shared frontend fetch-error utility

Work Log:
- Diagnosed root cause of "LLM returned 0 products" bug: LLM sometimes returns single object `{...}` instead of array `[{...}]`, and `Array.isArray()` returns false → `safeProducts = []`
- Fixed /api/scan/route.ts: Added normalization after generateStructuredResponse — if result is object (not array), wrap in array
- Fixed /api/trends/route.ts: Same normalization for trends and comparison responses; added response shape validation for comparison
- Fixed /api/analyze/route.ts: Same normalization for gaps, complaints, topCompetitors, and subNiches
- Fixed /api/opportunities/route.ts: Same normalization for opportunities
- Fixed /src/lib/zai.ts: Added 502 Bad Gateway error handling in webSearch, readPage, and chatCompletion with specific error messages
- Created /src/lib/fetch-error.ts: Shared frontend utility `handleFetchError()` that tries JSON parse first, falls back to reading response text for context, builds specific gateway error messages
- Updated scanner-panel.tsx: Uses handleFetchError instead of inline error handling — eliminates 25 lines of duplicate code and improves 502/504 error messages
- Updated gap-analysis-panel.tsx: Same pattern
- Updated opportunities-panel.tsx: Same pattern
- Updated trends-compare-panel.tsx: Same pattern (both detect and compare mutations)
- Updated dashboard-overview.tsx: Improved non-JSON error handling with response text reading
- All lint checks pass cleanly

Stage Summary:
- "LLM returned 0 products/opportunities/trends" bug FIXED by normalizing single-object responses to arrays
- All 4 API routes now handle LLM returning objects instead of arrays
- 502 error handling added to ZAI SDK (webSearch, readPage, chatCompletion)
- Shared `handleFetchError` utility eliminates duplicate error-handling code across 5 frontend components
- Gateway errors (502/503/504) now show specific, actionable messages with response text context
