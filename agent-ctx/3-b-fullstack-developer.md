# Task 3-b: Fix GapAnalysisPanel — Shared Category State & RequestContext

## Summary
Modified `/home/z/my-project/src/components/gap-analysis-panel.tsx` to replace local category state with the shared Zustand store's `selectedCategory`, and added `RequestContext` to all `classifyError` calls.

## Changes

### 1. Import Update (line 41)
- Changed `import { useAppStore } from '@/lib/store'` to `import { useAppStore, getEffectiveCategory } from '@/lib/store'`

### 2. Removed Local Category State (line 711)
- Removed: `const [category, setCategory] = useState<Category | 'all'>('all')`
- Added: `const selectedCategory = useAppStore((s) => s.selectedCategory)` and `const setSelectedCategory = useAppStore((s) => s.setSelectedCategory)`

### 3. API Body (line 731)
- Changed `JSON.stringify({ category, analysisType: 'full', timePeriod })` to `JSON.stringify({ category: selectedCategory, analysisType: 'full', timePeriod })`

### 4. classifyError — try block (lines 737-741)
- Added 4th argument: `{ category: selectedCategory, payload: 'category=${selectedCategory}, analysisType=full, timePeriod=${timePeriod}', backendMessage: errorBody.error }`

### 5. classifyError — catch block (lines 744-747)
- Added 4th argument: `{ category: selectedCategory, payload: 'category=${selectedCategory}, analysisType=full, timePeriod=${timePeriod}' }`

### 6. classifyError — onError handler (lines 763-766)
- Added 4th argument: `{ category: selectedCategory, payload: 'category=${selectedCategory}, analysisType=full, timePeriod=${timePeriod}' }`

### 7. Select Component (lines 798-800)
- Changed `value={category}` → `value={selectedCategory}`
- Changed `onValueChange={(v) => setCategory(v as Category | 'all')}` → `onValueChange={(v) => setSelectedCategory(v as Category | 'all')}`

## Verification
- `bun run lint` passes with zero errors
- Work record appended to `/home/z/my-project/worklog.md`
