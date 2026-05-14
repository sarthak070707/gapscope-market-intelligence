/**
 * Safely parse a JSON string, returning a fallback value on failure.
 */
export function safeJsonParse<T>(jsonStr: string, fallback: T): T {
  try {
    return JSON.parse(jsonStr || '[]') as T;
  } catch {
    return fallback;
  }
}
