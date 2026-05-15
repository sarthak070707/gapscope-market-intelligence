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
