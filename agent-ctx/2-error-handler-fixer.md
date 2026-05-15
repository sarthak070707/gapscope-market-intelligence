# Task 2: Fix store.ts and error-handler.ts

## Summary
Fixed the "Category: unknown" bug root causes in store.ts and error-handler.ts.

## Files Modified
1. `/home/z/my-project/src/lib/store.ts` - Added `DEFAULT_CATEGORY` constant and `getEffectiveCategory` helper
2. `/home/z/my-project/src/lib/error-handler.ts` - Enhanced ModuleError type, added 7 new error patterns to classifyError, updated logError

## Key Changes

### store.ts
- `DEFAULT_CATEGORY: Category = 'AI Tools'` — safe default when selectedCategory is 'all'
- `getEffectiveCategory(category: Category | 'all'): Category` — resolves 'all' to 'AI Tools'

### error-handler.ts
- ModuleError: Added `requestCategory?`, `requestPayload?`, `backendMessage?` flat fields (replaced nested requestContext)
- classifyError: ctx now spreads individual fields; 7 new error patterns added before generic fallback
- logError: Added optional 4th `requestContext` parameter
- isRateLimitError: Added 'throttl' pattern

## Verification
- `bun run lint` passes with zero errors
