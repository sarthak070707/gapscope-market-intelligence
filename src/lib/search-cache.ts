/**
 * Search Result Cache
 *
 * Caches web search results in memory to avoid redundant API calls.
 * When the same query is searched again within the TTL, cached results
 * are returned instead of hitting the (rate-limited) search API.
 *
 * This is CRITICAL for GapScope because the web search API has aggressive
 * rate limits (429 on first query), so we MUST avoid re-searching for
 * data we already have.
 */

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 200; // Max number of cached queries

interface CacheEntry {
  results: Record<string, unknown>[];
  timestamp: number;
  query: string;
}

const searchCache = new Map<string, CacheEntry>();

/**
 * Normalize a search query for cache key purposes.
 * Strips extra whitespace, lowercases, and trims.
 */
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Get cached search results for a query, if available and not expired.
 * Returns null if no valid cache entry exists.
 */
export function getCachedSearchResults(query: string): Record<string, unknown>[] | null {
  const key = normalizeQuery(query);
  const entry = searchCache.get(key);
  if (!entry) return null;

  // Check TTL
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }

  console.log(`[SearchCache] CACHE HIT for "${query.substring(0, 60)}" (${entry.results.length} results, age: ${Math.round((Date.now() - entry.timestamp) / 1000)}s)`);
  return entry.results;
}

/**
 * Store search results in the cache.
 */
export function setCachedSearchResults(query: string, results: Record<string, unknown>[]): void {
  const key = normalizeQuery(query);

  // Prune old entries if cache is too large
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const now = Date.now();
    // Delete expired entries first
    for (const [k, entry] of searchCache.entries()) {
      if (now - entry.timestamp > CACHE_TTL_MS) {
        searchCache.delete(k);
      }
    }
    // If still too large, delete the oldest entries
    if (searchCache.size >= MAX_CACHE_SIZE) {
      const entries = [...searchCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < Math.ceil(MAX_CACHE_SIZE * 0.2); i++) {
        searchCache.delete(entries[i][0]);
      }
    }
  }

  searchCache.set(key, {
    results,
    timestamp: Date.now(),
    query,
  });
  console.log(`[SearchCache] CACHED ${results.length} results for "${query.substring(0, 60)}"`);
}

/**
 * Get cache statistics for debugging.
 */
export function getCacheStats(): { size: number; maxAge: number; entries: string[] } {
  const now = Date.now();
  let maxAge = 0;
  const entries: string[] = [];
  for (const [key, entry] of searchCache.entries()) {
    const age = now - entry.timestamp;
    if (age > maxAge) maxAge = age;
    entries.push(`${key} (${entry.results.length} results, ${Math.round(age / 1000)}s ago)`);
  }
  return { size: searchCache.size, maxAge: Math.round(maxAge / 1000), entries };
}

/**
 * Check if we have ANY cached results for a category (partial match).
 * This is useful for checking if we have results from similar queries.
 */
export function hasCachedResultsForCategory(category: string): Record<string, unknown>[] | null {
  const categoryLower = category.toLowerCase();
  const now = Date.now();
  let bestResults: Record<string, unknown>[] | null = null;
  let bestCount = 0;

  for (const [, entry] of searchCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) continue;
    if (entry.query.toLowerCase().includes(categoryLower)) {
      if (entry.results.length > bestCount) {
        bestCount = entry.results.length;
        bestResults = entry.results;
      }
    }
  }

  return bestResults;
}
