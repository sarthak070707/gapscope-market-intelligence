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
